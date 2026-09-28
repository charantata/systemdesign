/* ============================================================
   Content — Data & Persistence group
   (loaded after architecture.js so it sits after that group)
   ============================================================ */
window.SECTIONS = window.SECTIONS || [];
var D = window.DETAILS;

/* extra shared detail objects */
D.managedIdentity = {
  kicker: "Security", title: "Managed Identity",
  sections: [
    { h: "What it is", p: "An Azure-managed identity for your compute (App Service / AKS / Function). It lets the app authenticate to SQL, Key Vault, Blob and Service Bus <b>without any secrets or connection passwords</b> — Entra ID issues short-lived tokens automatically." },
    { h: "Why it matters", list: ["No passwords/keys in config or Key Vault to leak or rotate", "Credentials never touch the codebase", "Access governed by Azure RBAC role assignments", "Tokens are short-lived and auto-refreshed"] },
    { h: "Acquire a token", lang: "csharp", label: "DefaultAzureCredential", code:
"var credential = new DefaultAzureCredential();\nvar token = await credential.GetTokenAsync(\n    new TokenRequestContext(new[] { \"https://database.windows.net/.default\" }));" },
  ],
};
D.redis2 = {
  kicker: "Infrastructure", title: "Redis (read model / cache)",
  sections: [
    { h: "Role in CQRS", p: "Redis serves the <b>read side</b>: it holds denormalised projections and cache-aside entries so queries never touch the write database. It is kept in sync by event-driven projections." },
    { h: "Patterns used", list: ["Cache-aside for reference data", "Event-driven projection of read models", "Idempotency-key store with TTL", "Distributed locks (RedLock) for the Outbox/projector"] },
  ],
};

/* ---------- SQL Functions ---------- */
window.SECTIONS.push({
  id: "sql-functions", group: "Data & Persistence", label: "SQL Functions",
  kicker: "Query Toolkit", title: "SQL functions in practice",
  sub: "The SQL building blocks the platform uses for reporting, dashboards and hot read paths — from everyday aggregates to window functions, JSON extraction and user-defined functions. Examples are shown in the audit domain, with PostgreSQL notes where they differ.",
  blocks: [
    { type: "tabs", title: "Function families", tabs: [
      { label: "Aggregate", blocks: [
        { type: "para", body: "Summarise sets of rows — the backbone of dashboards and NFR metrics." },
        { type: "code", lang: "sql", label: "aggregates.sql", code:
"SELECT\n    COUNT(*)                         AS TotalTransactions,\n    COUNT(DISTINCT CustomerId)       AS UniqueCustomers,\n    SUM(Amount)                      AS TotalValue,\n    AVG(Amount)                      AS AvgValue,\n    MIN(CreatedDate)                 AS FirstSeen,\n    MAX(CreatedDate)                 AS LastSeen,\n    SUM(CASE WHEN Status = 'PAYMENT_FAILED' THEN 1 ELSE 0 END) AS Failures\nFROM AuditTransaction\nWHERE CreatedDate >= DATEADD(DAY, -30, SYSUTCDATETIME())\nGROUP BY CAST(CreatedDate AS DATE)\nHAVING SUM(Amount) > 0;" },
      ]},
      { label: "String", blocks: [
        { type: "code", lang: "sql", label: "strings.sql", code:
"SELECT\n    UPPER(TransactionId)                       AS Ref,\n    CONCAT('AUD-', RIGHT(TransactionId, 6))    AS ShortRef,\n    LEN(Notes)                                 AS NoteLength,\n    LEFT(Notes, 50)                            AS Preview,\n    REPLACE(Status, '_', ' ')                  AS StatusLabel,\n    TRIM(CustomerName)                         AS CustomerName,\n    SUBSTRING(CorrelationId, 1, 8)             AS TracePrefix\nFROM AuditTransaction;" },
        { type: "callout", kind: "info", title: "PostgreSQL", body: "Use <code>LENGTH()</code> instead of <code>LEN()</code>, <code>||</code> or <code>CONCAT()</code> for concatenation, and <code>SUBSTRING(x FROM 1 FOR 8)</code> syntax." },
      ]},
      { label: "Date / Time", blocks: [
        { type: "code", lang: "sql", label: "datetime.sql", code:
"SELECT\n    SYSUTCDATETIME()                                   AS NowUtc,\n    DATEADD(HOUR, 24, CreatedDate)                     AS SlaDeadline,\n    DATEDIFF(MINUTE, CreatedDate, UpdatedDate)         AS ProcessingMinutes,\n    DATEPART(WEEKDAY, CreatedDate)                     AS DayOfWeek,\n    FORMAT(CreatedDate, 'yyyy-MM-dd')                  AS DayBucket,\n    EOMONTH(CreatedDate)                               AS MonthEnd\nFROM AuditTransaction;" },
        { type: "callout", kind: "info", title: "PostgreSQL", body: "Use <code>now()</code>, <code>CreatedDate + INTERVAL '24 hours'</code>, and <code>EXTRACT(EPOCH FROM (UpdatedDate - CreatedDate))/60</code> for the minute diff." },
      ]},
      { label: "Window", blocks: [
        { type: "para", body: "Analytics <i>across</i> rows without collapsing them — running totals, rankings and latest-per-group. Heavily used in operational dashboards." },
        { type: "code", lang: "sql", label: "windows.sql", code:
"SELECT\n    TransactionId, Status, Amount, CreatedDate,\n    ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY CreatedDate DESC) AS RecencyRank,\n    RANK()       OVER (ORDER BY Amount DESC)                              AS ValueRank,\n    SUM(Amount)  OVER (PARTITION BY CustomerId ORDER BY CreatedDate\n                       ROWS UNBOUNDED PRECEDING)                         AS RunningTotal,\n    LAG(Status)  OVER (PARTITION BY TransactionId ORDER BY CreatedDate)  AS PrevStatus,\n    LEAD(CreatedDate) OVER (PARTITION BY CustomerId ORDER BY CreatedDate) AS NextTxnAt\nFROM AuditTransaction;\n\n-- Latest status row per transaction (very common pattern)\nWITH Ranked AS (\n    SELECT *, ROW_NUMBER() OVER (PARTITION BY TransactionId\n                                 ORDER BY CreatedDate DESC) AS rn\n    FROM AuditStatusHistory)\nSELECT * FROM Ranked WHERE rn = 1;" },
      ]},
      { label: "Conditional & Null", blocks: [
        { type: "code", lang: "sql", label: "conditional.sql", code:
"SELECT\n    TransactionId,\n    CASE\n        WHEN Amount IS NULL              THEN 'No payment'\n        WHEN Amount >= 10000             THEN 'High value'\n        WHEN Amount >= 1000              THEN 'Standard'\n        ELSE 'Low value'\n    END                                  AS ValueBand,\n    COALESCE(ReviewerId, ManagerId, 'unassigned') AS Owner,\n    ISNULL(RetryCount, 0)                AS Retries,\n    IIF(Status = 'PAYMENT_COMPLETED', 1, 0) AS IsPaid,\n    NULLIF(Amount, 0)                    AS AmountOrNull\nFROM AuditTransaction;" },
      ]},
      { label: "Conversion & JSON", blocks: [
        { type: "para", body: "Safe casting and extracting values from the JSON payloads stored in <code>OutboxMessage</code> / <code>WebhookEvent</code>." },
        { type: "code", lang: "sql", label: "convert_json.sql", code:
"SELECT\n    CAST(Amount AS VARCHAR(20))                 AS AmountText,\n    TRY_CONVERT(DATETIME2, RawTimestamp)       AS ParsedTime,   -- null if invalid\n    TRY_CAST(RetryHeader AS INT)               AS RetryNum,\n    -- Extract fields from a JSON payload column\n    JSON_VALUE(Payload, '$.amount')            AS PayloadAmount,\n    JSON_VALUE(Payload, '$.currency')          AS Currency,\n    JSON_QUERY(Payload, '$.metadata')          AS MetadataObject\nFROM OutboxMessages;\n\n-- Shred a JSON array into rows\nSELECT j.[key], j.[value]\nFROM WebhookEvent e\nCROSS APPLY OPENJSON(e.Payload, '$.lineItems') j;\n\n-- Project rows back to JSON for an API\nSELECT TransactionId, Status, Amount\nFROM AuditTransaction FOR JSON PATH;" },
        { type: "callout", kind: "info", title: "PostgreSQL", body: "PostgreSQL uses native <code>jsonb</code> operators instead: <code>payload->>'amount'</code> (text), <code>payload->'metadata'</code> (object), and <code>jsonb_array_elements()</code> to expand arrays." },
      ]},
    ]},
    { type: "vs", title: "User-defined functions vs stored procedures",
      left: { icon: "code", title: "Functions (UDF / TVF)", blocks: [
        { type: "featureList", variant: "pros", items: ["Return a value or a table — composable in queries", "Usable in SELECT / WHERE / JOIN", "<b>Inline TVF</b> is optimiser-friendly (like a view with params)"] },
        { type: "featureList", variant: "cons", items: ["Scalar UDFs can hurt performance (row-by-row)", "Cannot have side effects (no INSERT/UPDATE)"] },
      ]},
      right: { icon: "cog", title: "Stored procedures", blocks: [
        { type: "featureList", variant: "pros", items: ["Can modify data & run multi-statement logic", "Good for batch / transactional operations", "Output params, multiple result sets"] },
        { type: "featureList", variant: "cons", items: ["Not composable inside a query", "Business logic drifts into the database"] },
      ]},
    },
    { type: "code", title: "Inline table-valued function (preferred UDF form)", lang: "sql", label: "tvf.sql", code:
"CREATE FUNCTION dbo.GetTransactionsByStatus (@status NVARCHAR(30))\nRETURNS TABLE\nAS RETURN\n(\n    SELECT TransactionId, CustomerId, Amount, CreatedDate\n    FROM   AuditTransaction\n    WHERE  Status = @status\n);\nGO\n-- Composed like a table:\nSELECT t.*, c.Name\nFROM   dbo.GetTransactionsByStatus('APPROVAL_REQUIRED') t\nJOIN   Customer c ON c.Id = t.CustomerId;" },
    { type: "code", title: "Calling SQL functions from Dapper", lang: "csharp", label: "DapperReads.cs", code:
"// Inline TVF -> strongly-typed rows, no EF overhead\nconst string sql = @\"SELECT TransactionId, CustomerId, Amount, CreatedDate\n                     FROM dbo.GetTransactionsByStatus(@status)\";\nvar rows = await _conn.QueryAsync<TransactionRow>(sql, new { status });\n\n// Scalar aggregate\nvar total = await _conn.ExecuteScalarAsync<decimal>(\n    \"SELECT SUM(Amount) FROM AuditTransaction WHERE Status = @s\",\n    new { s = \"PAYMENT_COMPLETED\" });" },
    { type: "tabs", title: "Ranking, CTEs, temp tables & joins", tabs: [
      { label: "Ranking functions", blocks: [
        { type: "para", body: "<code>ROW_NUMBER</code>, <code>RANK</code> and <code>DENSE_RANK</code> look similar but differ in exactly one thing — <b>how they treat ties</b>. Getting this wrong is a classic bug (wrong \"top N\", duplicate winners, off-by-gaps)." },
        { type: "code", lang: "sql", label: "ranking.sql", code:
"-- The three ranking functions differ ONLY in how they treat ties\nSELECT\n    CustomerId, Amount,\n    ROW_NUMBER() OVER (ORDER BY Amount DESC) AS RowNum,   -- 1,2,3,4,5  always unique\n    RANK()       OVER (ORDER BY Amount DESC) AS Rnk,      -- 1,2,2,4,5  gaps after a tie\n    DENSE_RANK() OVER (ORDER BY Amount DESC) AS DenseRnk, -- 1,2,2,3,4  no gaps\n    NTILE(4)     OVER (ORDER BY Amount DESC) AS Quartile  -- split rows into 4 buckets\nFROM AuditTransaction;" },
        { type: "table", title: "How each treats ties", head: ["Function", "On a tie", "Sequence example", "Use it for"], rows: [
          ["<code>ROW_NUMBER()</code>", "Breaks ties arbitrarily — every row unique", "1, 2, 3, 4, 5", "Pagination, de-dup, exactly-one-per-group"],
          ["<code>RANK()</code>", "Ties share a rank, then <b>skips</b>", "1, 2, 2, 4, 5", "Leaderboards where gaps are meaningful"],
          ["<code>DENSE_RANK()</code>", "Ties share a rank, <b>no gap</b>", "1, 2, 2, 3, 4", "\"Top 3 distinct values\" style queries"],
          ["<code>NTILE(n)</code>", "Splits rows into n equal buckets", "quartiles / percentiles", "Bucketing, cohorts, percentiles"],
        ]},
        { type: "callout", kind: "warn", title: "Always give ranking a deterministic ORDER BY", body: "Ranking depends entirely on the <code>OVER (ORDER BY …)</code>. If the sort key has duplicates, add a tiebreaker (e.g. <code>ORDER BY Amount DESC, Id</code>) or <code>ROW_NUMBER</code> results are non-deterministic across runs." },
        { type: "code", lang: "sql", label: "rank-patterns.sql", code:
"-- Top 3 transactions PER customer (top-N-per-group)\nWITH Ranked AS (\n    SELECT *, ROW_NUMBER() OVER (PARTITION BY CustomerId\n                                 ORDER BY Amount DESC, Id) AS rn\n    FROM AuditTransaction)\nSELECT * FROM Ranked WHERE rn <= 3;\n\n-- Latest status row per transaction (rn = 1)\nWITH Latest AS (\n    SELECT *, ROW_NUMBER() OVER (PARTITION BY TransactionId\n                                 ORDER BY CreatedDate DESC) AS rn\n    FROM AuditStatusHistory)\nSELECT * FROM Latest WHERE rn = 1;\n\n-- De-duplicate: keep newest per key, delete the rest\nWITH Dupes AS (\n    SELECT *, ROW_NUMBER() OVER (PARTITION BY TransactionId\n                                 ORDER BY CreatedDate DESC) AS rn\n    FROM AuditStatusHistory)\nDELETE FROM Dupes WHERE rn > 1;" },
      ]},
      { label: "CTEs & recursion", blocks: [
        { type: "para", body: "A <b>Common Table Expression</b> is a named, readable subquery scoped to the next statement. Chain several to build a pipeline; use a <b>recursive CTE</b> to walk hierarchies (approval chains, org charts, category trees)." },
        { type: "code", lang: "sql", label: "cte.sql", code:
"-- Basic CTE — a named, readable, single-use subquery\nWITH RecentHighValue AS (\n    SELECT TransactionId, CustomerId, Amount\n    FROM   AuditTransaction\n    WHERE  CreatedDate >= DATEADD(DAY, -7, SYSUTCDATETIME())\n      AND  Amount > 10000)\nSELECT c.Name, r.TransactionId, r.Amount\nFROM   RecentHighValue r\nJOIN   Customer c ON c.Id = r.CustomerId;\n\n-- Chained CTEs — a step-by-step pipeline\nWITH Paid AS (\n        SELECT * FROM Payment WHERE Status = 'Completed'),\n     PerCustomer AS (\n        SELECT CustomerId, SUM(Amount) AS Total\n        FROM Paid GROUP BY CustomerId)\nSELECT * FROM PerCustomer WHERE Total > 50000;" },
        { type: "code", lang: "sql", label: "recursive-cte.sql", code:
"-- Recursive CTE — walk an approval / reporting hierarchy\nWITH ApprovalChain AS (\n    -- anchor member (the starting row)\n    SELECT UserId, ManagerId, 1 AS Level\n    FROM   Users WHERE UserId = @startUserId\n    UNION ALL\n    -- recursive member (joins back to the CTE)\n    SELECT u.UserId, u.ManagerId, c.Level + 1\n    FROM   Users u\n    JOIN   ApprovalChain c ON u.UserId = c.ManagerId)\nSELECT UserId, ManagerId, Level\nFROM   ApprovalChain\nOPTION (MAXRECURSION 100);   -- guard against runaway / cyclic data" },
        { type: "callout", kind: "warn", title: "A CTE is not a temp table", body: "In SQL Server a CTE is <b>inlined / expanded</b> into the query — referencing it multiple times <b>re-executes</b> it each time. If an expensive result is reused several times, materialise it into a <code>#temp</code> table instead. (PostgreSQL: CTEs were an optimisation fence before v12; from v12 they inline — control it with <code>MATERIALIZED</code> / <code>NOT MATERIALIZED</code>.)" },
      ]},
      { label: "Temp tables vs table vars", blocks: [
        { type: "table", title: "CTE vs table variable vs temp table", head: ["Aspect", "CTE", "Table variable <code>@t</code>", "Temp table <code>#t</code>"], rows: [
          ["Scope", "Next statement only", "Batch / procedure", "Whole session / connection"],
          ["Statistics", "None (inlined)", "None (est. 1 row)", "<b>Yes</b> — real cardinality"],
          ["Indexes", "No", "PK / UNIQUE only", "<b>Full</b> (create after load)"],
          ["Reuse", "Re-evaluated each reference", "Reusable", "Reusable"],
          ["Best for", "Readability, recursion", "Small sets (&lt; ~100 rows)", "Large / reused sets needing good plans"],
          ["Lives in", "—", "tempdb", "tempdb"],
        ]},
        { type: "code", lang: "sql", label: "temp.sql", code:
"-- Temp table — materialised, indexable, has statistics; ideal for large reused sets\nSELECT a.Id, a.CustomerId, a.Amount\nINTO   #HighValue\nFROM   AuditTransaction a\nWHERE  a.Amount > 10000;\n\nCREATE INDEX IX_tmp_Customer ON #HighValue(CustomerId);   -- index the temp set\n\nSELECT CustomerId, COUNT(*) AS Cnt, SUM(Amount) AS Total\nFROM   #HighValue\nGROUP BY CustomerId;\n\nDROP TABLE #HighValue;\n\n-- Table variable — small sets only; poor cardinality estimate at scale\nDECLARE @ids TABLE (Id UNIQUEIDENTIFIER PRIMARY KEY);" },
        { type: "callout", kind: "info", title: "Rule of thumb", body: "<b>CTE</b> for readability & recursion (single use). <b>Table variable</b> only for genuinely small sets. <b>Temp table</b> when the intermediate set is large, reused, or the optimiser needs statistics to pick a good plan." },
      ]},
      { label: "Joins", blocks: [
        { type: "para", body: "Know the join types and the semi/anti-join patterns — most \"slow query\" and \"wrong count\" bugs live here." },
        { type: "code", lang: "sql", label: "joins.sql", code:
"-- INNER: only matching rows\nSELECT a.TransactionId, p.Amount\nFROM AuditTransaction a\nJOIN Payment p ON p.AuditTransactionId = a.Id;\n\n-- LEFT: all transactions; payment columns NULL when none\nSELECT a.TransactionId, p.Status\nFROM AuditTransaction a\nLEFT JOIN Payment p ON p.AuditTransactionId = a.Id;\n\n-- SEMI-join: transactions that HAVE a completed payment (EXISTS short-circuits)\nSELECT a.TransactionId\nFROM AuditTransaction a\nWHERE EXISTS (SELECT 1 FROM Payment p\n              WHERE p.AuditTransactionId = a.Id AND p.Status = 'Completed');\n\n-- ANTI-join: transactions with NO payment (prefer NOT EXISTS over NOT IN)\nSELECT a.TransactionId\nFROM AuditTransaction a\nWHERE NOT EXISTS (SELECT 1 FROM Payment p WHERE p.AuditTransactionId = a.Id);\n\n-- APPLY: latest payment per transaction (correlated top-1)\nSELECT a.TransactionId, lp.Amount\nFROM AuditTransaction a\nCROSS APPLY (SELECT TOP 1 Amount FROM Payment p\n             WHERE p.AuditTransactionId = a.Id\n             ORDER BY p.CreatedDate DESC) lp;" },
        { type: "callout", kind: "warn", title: "NOT IN + NULL = silent wrong results", body: "If the subquery of a <code>NOT IN (…)</code> returns even one <code>NULL</code>, the whole predicate yields no rows. Always use <code>NOT EXISTS</code> for anti-joins. Also: filter an outer (LEFT) join's right table in the <code>ON</code> clause, not <code>WHERE</code> — a <code>WHERE</code> predicate on the right table quietly turns a LEFT join back into an INNER join." },
        { type: "callout", kind: "info", title: "Physical join operators", body: "The optimiser picks <b>nested loops</b> (small/indexed), <b>merge</b> (both sorted) or <b>hash</b> (large, unsorted) joins based on statistics. You don't choose them — but a nested loop over millions of rows in the plan is a red flag that an index or better estimate is missing." },
      ]},
    ]},

    { type: "accordion", title: "Query performance tuning", items: [
      { title: "Return only what you need — never SELECT *", badge: "I/O", open: true, blocks: [
        { type: "para", body: "Select only the columns and rows you use. Fewer columns enable <b>covering indexes</b> and cut I/O, memory and network. Filter early, and <b>paginate</b> large result sets rather than pulling everything to the app." } ]},
      { title: "Keep predicates SARGable", badge: "Indexes", blocks: [
        { type: "para", body: "A predicate is <b>SARGable</b> (index-seekable) only if the indexed column is left untouched. Wrapping it in a function, or an implicit type conversion, forces a scan." },
        { type: "code", lang: "sql", label: "sargable.sql", code:
"-- NOT SARGable: function on the column -> index scan\nWHERE YEAR(CreatedDate) = 2026\nWHERE CONVERT(date, CreatedDate) = '2026-09-27'\nWHERE Status LIKE '%FAILED'          -- leading wildcard\n\n-- SARGable: range on the raw column -> index seek\nWHERE CreatedDate >= '2026-01-01' AND CreatedDate < '2027-01-01'\nWHERE CreatedDate >= @day AND CreatedDate < DATEADD(DAY, 1, @day)\nWHERE Status LIKE 'PAYMENT%'         -- trailing wildcard is fine" } ]},
      { title: "Design the right indexes", badge: "Indexes", blocks: [
        { type: "para", body: "Composite index column order = <b>equality columns first, then the range/sort column</b>. Add <code>INCLUDE</code> columns to make an index <b>covering</b> (no key lookup). Use <b>filtered indexes</b> for hot subsets (e.g. <code>WHERE Status='Pending'</code>). Don't over-index — every index is write & storage cost." },
        { type: "code", lang: "sql", label: "index.sql", code:
"-- Covering index for a common worklist query\nCREATE NONCLUSTERED INDEX IX_Audit_Status_Created\n    ON AuditTransaction (Status, CreatedDate)   -- equality then range/sort\n    INCLUDE (TransactionId, CustomerId, Amount); -- covers the SELECT list" } ]},
      { title: "Read the plan; keep statistics fresh", badge: "Plans", blocks: [
        { type: "para", body: "Compare <b>estimated vs actual rows</b> in the execution plan. Watch for: table/index <b>scans</b> where a seek is expected, <b>key lookups</b> (add INCLUDE), <b>sort/hash spills</b> to tempdb, and fat arrows (bad estimates → stale stats). Refresh with <code>UPDATE STATISTICS</code>, and beware <b>parameter sniffing</b> (a plan cached for an atypical parameter) — mitigate with <code>OPTION (RECOMPILE)</code> or <code>OPTIMIZE FOR</code> where justified." } ]},
      { title: "Paginate with keyset, not deep OFFSET", badge: "Paging", blocks: [
        { type: "para", body: "<code>OFFSET 100000 ROWS</code> still scans and throws away those 100k rows. Use <b>keyset / seek pagination</b> — carry the last key forward." },
        { type: "code", lang: "sql", label: "paging.sql", code:
"-- Slow at depth: OFFSET scans & discards\nSELECT ... ORDER BY CreatedDate DESC\nOFFSET 100000 ROWS FETCH NEXT 20 ROWS ONLY;\n\n-- Fast: keyset / seek pagination (index on CreatedDate)\nSELECT TOP (20) ...\nFROM AuditTransaction\nWHERE CreatedDate < @lastSeenDate\nORDER BY CreatedDate DESC;" } ]},
      { title: "Think in sets; batch big DML", badge: "RBAR", blocks: [
        { type: "para", body: "Replace cursors / row-by-row loops (RBAR — \"row by agonizing row\") with a single set-based statement. For very large updates/deletes, <b>batch</b> to avoid long transactions and lock escalation." },
        { type: "code", lang: "sql", label: "batch.sql", code:
"-- Batched delete: short transactions, avoids lock escalation\nWHILE 1 = 1\nBEGIN\n    DELETE TOP (5000) FROM AuditLog WHERE CreatedAt < @cutoff;\n    IF @@ROWCOUNT = 0 BREAK;\nEND" } ]},
      { title: "Concurrency, isolation & deadlocks", badge: "Locking", blocks: [
        { type: "para", body: "Keep transactions <b>short</b> and touch objects in a <b>consistent order</b> to avoid deadlocks. Consider <b>Read Committed Snapshot Isolation (RCSI)</b> so readers don't block writers. Match isolation to the operation — strong for money movement, snapshot/relaxed for dashboards (ties back to primary-vs-replica reads)." } ]},
      { title: "Parameterize everything", badge: "Plan cache", blocks: [
        { type: "para", body: "Parameterized queries <b>reuse cached plans</b> and <b>prevent SQL injection</b>. Never concatenate user input into SQL. This is exactly how Dapper/EF Core send queries — keep it that way for dynamic SQL too." } ]},
      { title: "Avoid app-side N+1", badge: "App", blocks: [
        { type: "para", body: "One query per row (N+1) is death by round-trips. Join / batch at the database and return a shaped result set (an inline TVF or a single query), rather than looping calls from the service. See <b>EF Core &amp; Dapper</b>." } ]},
    ]},

    { type: "table", title: "SQL revision checklist", desc: "What to check when reviewing or revising a query — beyond \"does it return the right rows.\"", head: ["Check", "What to look for"], rows: [
      ["Correctness on NULLs", "<code>NOT IN</code> with NULLs, <code>= NULL</code> (use <code>IS NULL</code>), aggregates skipping NULLs, LEFT-join filters in WHERE vs ON"],
      ["SARGability", "No functions / implicit conversions on indexed columns; no leading <code>%</code> wildcards"],
      ["Indexes used", "Seeks not scans; covering indexes; correct composite column order"],
      ["Only needed data", "No <code>SELECT *</code>; filter early; paginate (keyset, not deep OFFSET)"],
      ["Set-based", "No cursors / RBAR; large DML batched"],
      ["Deterministic order", "Explicit <code>ORDER BY</code> for ranking & pagination — never rely on implicit order"],
      ["Transaction scope", "Short transactions; correct isolation; deadlock-safe object order"],
      ["Parameterized", "No string concatenation (injection + plan-cache bloat)"],
      ["Plan reviewed", "Estimated vs actual rows; key lookups; spills; fresh statistics"],
      ["Portability", "SQL Server vs PostgreSQL syntax differences noted where relevant"],
      ["Security", "Least-privilege; no dynamic SQL without parameters"],
    ]},

    { type: "callout", kind: "ok", title: "Where these live in the architecture", body: "Aggregates and window/ranking functions power the <b>Observability</b> and <b>NFR</b> dashboards; CTEs and joins shape the CQRS <b>read side</b>; performance tuning keeps reads off the primary and fast (with Redis in front — see <b>Redis &amp; CQRS Sync</b> and <b>Sharding · Replica · Partitioning</b>). JSON functions read Outbox/Webhook payloads; inline TVFs back Dapper reads. Writes never use functions for business logic — that stays in the domain model (see <b>EF Core &amp; Dapper</b>)." },
  ],
});

/* ---------- EF Core & Dapper + Managed Identity + RBAC ---------- */
window.SECTIONS.push({
  id: "ef-dapper", group: "Data & Persistence", label: "EF Core & Dapper",
  kicker: "Data Access", title: "EF Core + Dapper, secured by Managed Identity",
  sub: "Two complementary data-access tools sharing one secure, passwordless connection. EF Core owns the transactional write model; Dapper owns high-throughput reads. Both authenticate to Azure SQL / PostgreSQL with a Managed Identity — no connection passwords anywhere — governed by database RBAC.",
  blocks: [
    { type: "vs", title: "Why both — and when to use which",
      left: { icon: "layers", title: "EF Core (writes)", blocks: [
        { type: "featureList", variant: "pros", items: ["Change tracking, Unit of Work, transactions", "Rich domain mapping & migrations", "Owns the write model + Outbox in one commit", "LINQ, relationships, concurrency tokens"] },
        { type: "para", body: "Used for every command / state change." },
      ]},
      right: { icon: "bolt", title: "Dapper (reads)", blocks: [
        { type: "featureList", variant: "pros", items: ["Minimal overhead — near raw ADO.NET speed", "Full control of SQL (TVFs, window fns, hints)", "Ideal for dashboards & list/search queries", "Maps result sets to DTOs directly"] },
        { type: "para", body: "Used for hot read paths / the CQRS read side." },
      ]},
    },
    { type: "flow", title: "Passwordless connection flow",
      diagramTitle: "App → Entra ID → Azure SQL (RBAC)",
      steps: [
        { name: "App Service / AKS", tech: "Managed Identity", icon: "cog", cat: "app", detail: D.managedIdentity },
        { name: "Entra ID", tech: "issues short-lived token", icon: "key", cat: "sec", edge: "DefaultAzureCredential" },
        { name: "Access Token", tech: "scope: database.windows.net", icon: "lock", cat: "sec", edge: "token" },
        { name: "Azure SQL / PostgreSQL", tech: "token validated · RBAC roles", icon: "db", cat: "db", edge: "authenticated", detail: D.database },
      ]},
    { type: "code", title: "One secured connection, shared by both", lang: "csharp", label: "Program.cs", code:
"// No password in the connection string — Managed Identity supplies the token\nvar connString = \"Server=tcp:assurance.database.windows.net;\" +\n                 \"Database=Assurance;Authentication=Active Directory Default;\" +\n                 \"Encrypt=True;\";\n\n// EF Core (write model)\nbuilder.Services.AddDbContext<AppDbContext>(o =>\n    o.UseSqlServer(connString));\n\n// Dapper (read model) — shares the same auth\nbuilder.Services.AddScoped<IDbConnection>(_ =>\n{\n    var conn = new SqlConnection(connString);\n    // For fine control you can inject the token explicitly:\n    // conn.AccessToken = new DefaultAzureCredential()\n    //     .GetToken(new TokenRequestContext(new[]{\"https://database.windows.net/.default\"})).Token;\n    return conn;\n});" },
    { type: "code", title: "How they cooperate in one request", lang: "csharp", label: "usage.cs", code:
"// WRITE — EF Core, change-tracked, transactional, raises domain events + outbox\npublic async Task<Guid> Handle(ApproveAuditCommand c, CancellationToken ct)\n{\n    var tx = await _db.AuditTransactions.FindAsync(new object[]{ c.Id }, ct);\n    tx!.Approve(c.ApproverId);                 // domain invariant + AuditApproved event\n    await _db.SaveChangesAsync(ct);            // aggregate + OutboxMessage committed together\n    return tx.Id;\n}\n\n// READ — Dapper, fast, DTO-shaped, no tracking\npublic Task<IEnumerable<AuditListItem>> Handle(SearchAuditQuery q) =>\n    _conn.QueryAsync<AuditListItem>(\n        @\"SELECT TransactionId, Status, Amount, CreatedDate\n          FROM AuditTransaction\n          WHERE (@status IS NULL OR Status = @status)\n          ORDER BY CreatedDate DESC\n          OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY\",\n        new { q.Status, skip = q.Skip, take = q.Take });" },
    { type: "code", title: "Database RBAC — grant the Managed Identity least privilege", lang: "sql", label: "rbac.sql", code:
"-- Create a DB user mapped to the app's Managed Identity (Entra principal)\nCREATE USER [assurance-api] FROM EXTERNAL PROVIDER;\n\n-- Least-privilege role assignment\nALTER ROLE db_datareader  ADD MEMBER [assurance-api];\nALTER ROLE db_datawriter  ADD MEMBER [assurance-api];\nGRANT EXECUTE ON SCHEMA::dbo TO [assurance-api];   -- stored procs / TVFs\n\n-- A read-only reporting identity for the CQRS read replica\nCREATE USER [assurance-reporting] FROM EXTERNAL PROVIDER;\nALTER ROLE db_datareader ADD MEMBER [assurance-reporting];" },
    { type: "caps", title: "What this gives you", cols: 4, items: [
      { icon: "key", cat: "sec", title: "No secrets", desc: "No DB passwords in config, code or Key Vault." },
      { icon: "shield", cat: "sec", title: "RBAC", desc: "Per-identity least-privilege at the database." },
      { icon: "bolt", cat: "app", title: "Right tool", desc: "EF for writes, Dapper for reads." },
      { icon: "retry", cat: "ext", title: "Auto-rotation", desc: "Tokens short-lived & auto-refreshed." },
    ]},
    { type: "callout", kind: "info", title: "PostgreSQL equivalent", body: "The same pattern applies with Npgsql: <code>UseNpgsql()</code> for EF Core and an <code>NpgsqlConnection</code> for Dapper, authenticating to <b>Azure Database for PostgreSQL</b> via Entra ID + Managed Identity, with role grants (<code>GRANT SELECT/INSERT … TO \"assurance-api\"</code>)." },
  ],
});

/* ---------- Sharding, Replica & Partitioning ---------- */
window.SECTIONS.push({
  id: "sharding", group: "Data & Persistence", label: "Sharding · Replica · Partitioning",
  kicker: "Data at Scale", title: "Partitioning, replicas & sharding",
  sub: "Three distinct techniques for scaling data — often confused. Partitioning splits a table within one database; read replicas copy a database to offload reads; sharding spreads data across many databases. Each solves a different problem.",
  blocks: [
    { type: "caps", title: "Three techniques, three problems", cols: 3, items: [
      { icon: "layers", cat: "db", title: "Partitioning", desc: "One DB, one table split into segments (e.g. by month) for pruning & maintenance." },
      { icon: "cache", cat: "mon", title: "Read replicas", desc: "Copies of one DB that serve reads, offloading the primary." },
      { icon: "grid", cat: "func", title: "Sharding", desc: "Data spread across many DBs by a shard key for horizontal write scale." },
    ]},
    { type: "tabs", title: "Deep dive", tabs: [
      { label: "Partitioning", blocks: [
        { type: "para", body: "Table partitioning keeps one logical table but stores rows in separate physical segments by a key (usually a date range). Queries only scan relevant partitions (<b>partition elimination</b>), and old partitions can be archived or switched out instantly." },
        { type: "flow", diagramTitle: "Range partition by month", steps: [
          { name: "AuditTransaction (logical)", tech: "one table", icon: "db", cat: "db" },
          { edge: "partition function by CreatedDate", parallel: [
            { name: "2026-07", tech: "partition", icon: "inbox", cat: "db" },
            { name: "2026-08", tech: "partition", icon: "inbox", cat: "db" },
            { name: "2026-09", tech: "hot partition", icon: "inbox", cat: "db" },
          ]},
        ]},
        { type: "code", lang: "sql", label: "partition.sql", code:
"-- 1) Partition function (monthly ranges)\nCREATE PARTITION FUNCTION pfAuditByMonth (DATETIME2)\nAS RANGE RIGHT FOR VALUES\n  ('2026-08-01','2026-09-01','2026-10-01');\n\n-- 2) Scheme maps ranges to filegroups\nCREATE PARTITION SCHEME psAuditByMonth\nAS PARTITION pfAuditByMonth ALL TO ([PRIMARY]);\n\n-- 3) Create the table ON the scheme\nCREATE TABLE AuditTransaction ( /* cols */ CreatedDate DATETIME2 NOT NULL )\nON psAuditByMonth (CreatedDate);\n\n-- Archive last month instantly (metadata-only switch)\nALTER TABLE AuditTransaction SWITCH PARTITION 2 TO AuditArchive PARTITION 2;" },
        { type: "callout", kind: "info", title: "PostgreSQL", body: "Declarative partitioning: <code>CREATE TABLE audit (...) PARTITION BY RANGE (created_date);</code> then <code>CREATE TABLE audit_2026_09 PARTITION OF audit FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');</code>" },
      ]},
      { label: "Read replicas", blocks: [
        { type: "para", body: "A read replica is a continuously-replicated copy of the primary database. Writes go to the primary; reads (dashboards, search, reports) go to replicas. This is the natural home for the CQRS read side — but replication lag means reads are <b>eventually consistent</b>." },
        { type: "flow", diagramTitle: "Primary → replicas (read offload)", steps: [
          { name: "Write API", tech: "commands", icon: "api", cat: "api" },
          { name: "Primary DB", tech: "source of truth", icon: "db", cat: "db", edge: "writes" },
          { edge: "async replication (ms–s lag)", parallel: [
            { name: "Replica 1", tech: "read-only", icon: "cache", cat: "mon" },
            { name: "Replica 2", tech: "read-only", icon: "cache", cat: "mon" },
          ]},
          { name: "Query API / Dashboards", tech: "reads via Dapper", icon: "monitor", cat: "mon", edge: "read routing" },
        ]},
        { type: "code", lang: "csharp", label: "read-routing.cs", code:
"// Route reads to a replica, writes to the primary\npublic sealed class ConnectionFactory\n{\n    public IDbConnection Write() => new SqlConnection(_primary);\n    public IDbConnection Read()  => new SqlConnection(_readReplica); // ApplicationIntent=ReadOnly\n}\n// Azure SQL: append 'ApplicationIntent=ReadOnly' to send the session to a replica." },
        { type: "callout", kind: "warn", title: "Mind the lag", body: "Never read-your-own-write from a replica immediately after a command — the change may not have replicated yet. For 'confirm right after submit' flows, read from the primary or serve the value from the command result / cache." },
      ]},
      { label: "Sharding", blocks: [
        { type: "para", body: "Sharding partitions data <i>across separate databases</i> by a <b>shard key</b> (here, <code>TenantId</code> — a natural boundary for an assurance platform with many client organisations). Each shard is an independent database, so writes and storage scale horizontally beyond a single server." },
        { type: "flow", diagramTitle: "Shard router by TenantId", steps: [
          { name: "API", tech: "resolves shard key", icon: "api", cat: "api" },
          { name: "Shard Map Manager", tech: "TenantId → shard", icon: "grid", cat: "func", edge: "lookup" },
          { edge: "route to the owning shard", parallel: [
            { name: "Shard A", tech: "tenants 1–1000", icon: "db", cat: "db" },
            { name: "Shard B", tech: "tenants 1001–2000", icon: "db", cat: "db" },
            { name: "Shard C", tech: "tenants 2001+", icon: "db", cat: "db" },
          ]},
        ]},
        { type: "code", lang: "csharp", label: "shard-resolver.cs", code:
"public sealed class ShardResolver\n{\n    private readonly IReadOnlyDictionary<string,string> _map; // range/lookup map\n\n    public string ConnectionFor(string tenantId)\n    {\n        // Lookup strategy (explicit map) — robust to rebalancing.\n        // Alternative: hash strategy => shardIndex = Hash(tenantId) % shardCount\n        return _map.TryGetValue(tenantId, out var cs)\n            ? cs\n            : throw new ShardNotFoundException(tenantId);\n    }\n}\n\n// Every query/command carries the tenant so it lands on the right shard\nusing var conn = new SqlConnection(_resolver.ConnectionFor(ctx.TenantId));" },
        { type: "featureList", title: "Sharding trade-offs", variant: "cons", items: ["Cross-shard queries & joins are hard (fan-out + merge)", "Rebalancing shards is operationally complex", "Distributed transactions across shards — avoid; use sagas", "Choosing a poor shard key causes hot shards"] },
        { type: "callout", kind: "info", title: "Azure options", body: "<b>Azure SQL Elastic Database tools</b> provide a Shard Map Manager and data-dependent routing; <b>Elastic Query</b> enables cross-shard reads. Alternatively, <b>Cosmos DB</b> shards natively via a partition key. Shard only when a single database (with partitioning + replicas) is genuinely exhausted." },
      ]},
    ]},
    { type: "table", title: "Which technique for which problem", head: ["Symptom", "Reach for", "Why"], rows: [
      ["Big table, slow date-range scans & archiving", "Partitioning", "Partition elimination + instant switch-out"],
      ["Reads overwhelming the write DB", "Read replicas", "Offload queries; powers CQRS read side"],
      ["Writes/storage exceed one server", "Sharding", "Horizontal write scale by shard key"],
      ["Multi-tenant isolation at scale", "Sharding (by TenantId)", "Tenant data & load naturally separated"],
    ]},
    { type: "callout", kind: "ok", title: "Recommended progression", body: "Scale in this order: <b>indexing → partitioning → read replicas → sharding</b>. Most workloads never need sharding; a well-indexed, partitioned primary with read replicas handles very large volumes. Introduce sharding only when the evidence demands it — it is the most operationally expensive step." },
  ],
});

/* ---------- Redis with CQRS + read/write sync ---------- */
window.SECTIONS.push({
  id: "redis-cqrs", group: "Data & Persistence", label: "Redis & CQRS Sync",
  kicker: "Read / Write Separation", title: "Redis, CQRS & read/write synchronisation",
  sub: "In CQRS the write model and read model are separate — often in separate stores. This section shows exactly how a write becomes a fast, denormalised read: how Redis serves queries, how the read store is kept in sync via events, and how eventual consistency is handled honestly.",
  blocks: [
    { type: "flow", title: "The full CQRS + Redis pipeline",
      diagramTitle: "Command → write DB → event → projection → read store → query",
      legend: [ {cat:"api",label:"API"},{cat:"db",label:"Write DB"},{cat:"msg",label:"Sync (events)"},{cat:"app",label:"Projector"},{cat:"mon",label:"Read store / cache"} ],
      steps: [
        { name: "Command (write)", tech: "POST /api/audit", icon: "api", cat: "api" },
        { name: "Write DB", tech: "EF Core · normalised · source of truth", icon: "db", cat: "db", edge: "aggregate + Outbox (one tx)", detail: D.database },
        { name: "Outbox → Service Bus", tech: "AuditUpdated event", icon: "bus", cat: "msg", edge: "reliable publish", detail: D.servicebus },
        { name: "Projection Handler", tech: "builds read model", icon: "cog", cat: "app", edge: "consume event" },
        { edge: "update read side", parallel: [
          { name: "Read DB / Replica", tech: "denormalised views", icon: "cache", cat: "mon" },
          { name: "Redis", tech: "hot cache · projections", icon: "cache", cat: "mon", detail: D.redis2 },
        ]},
        { name: "Query (read)", tech: "GET /api/audit — from Redis/Read DB", icon: "monitor", cat: "mon", edge: "no write-DB hit" },
      ]},
    { type: "callout", kind: "info", title: "Why separate read and write at all?", body: "Reads and writes have opposite needs. Writes want a <b>normalised, consistent, transactional</b> model that protects invariants. Reads want a <b>denormalised, fast, query-shaped</b> model. CQRS lets each be optimised independently — and lets reads scale (replicas + Redis) without touching the write path." },
    { type: "tabs", title: "How Redis is used", tabs: [
      { label: "Cache-aside (reads)", blocks: [
        { type: "para", body: "The default read pattern. Check Redis first; on a miss, load from the read DB, populate Redis with a TTL, and return. Most reads never hit the database." },
        { type: "code", lang: "csharp", label: "cache-aside.cs", code:
"public async Task<AuditDto?> GetAsync(string id, CancellationToken ct)\n{\n    var key = $\"audit:{id}\";\n    var cached = await _redis.StringGetAsync(key);\n    if (cached.HasValue)\n        return JsonSerializer.Deserialize<AuditDto>(cached!);   // HIT\n\n    var dto = await _readDb.QuerySingleOrDefaultAsync<AuditDto>(  // MISS -> DB\n        \"SELECT ... FROM AuditReadModel WHERE Id = @id\", new { id });\n    if (dto is not null)\n        await _redis.StringSetAsync(key, JsonSerializer.Serialize(dto),\n            TimeSpan.FromMinutes(10));                            // populate + TTL\n    return dto;\n}" },
      ]},
      { label: "Event-driven projection (sync)", blocks: [
        { type: "para", body: "This is the heart of read/write synchronisation. When the write model changes, it emits an event (reliably, via the Outbox). A projection handler consumes it and updates the read DB <i>and</i> Redis — so the read side reflects the write, and stale cache is refreshed at the source." },
        { type: "code", lang: "csharp", label: "projection.cs", code:
"// Consumes events published from the write side (Service Bus)\npublic async Task Handle(AuditUpdated evt, CancellationToken ct)\n{\n    if (await _seen.ExistsAsync(evt.MessageId, ct)) return;      // idempotent\n\n    // 1) Update the denormalised read model (read DB / replica target)\n    await _readDb.ExecuteAsync(\n        @\"UPDATE AuditReadModel\n             SET Status=@Status, Amount=@Amount, UpdatedAt=@At\n           WHERE Id=@Id\", evt);\n\n    // 2) Refresh (or invalidate) the cache so the next read is correct\n    var dto = evt.ToReadDto();\n    await _redis.StringSetAsync($\"audit:{evt.Id}\",\n        JsonSerializer.Serialize(dto), TimeSpan.FromMinutes(10));\n\n    // 3) Bust any list/query caches this change affects\n    await _redis.KeyDeleteAsync($\"audit:list:{evt.CustomerId}\");\n\n    await _seen.MarkAsync(evt.MessageId, ct);\n}" },
      ]},
      { label: "Invalidation strategies", blocks: [
        { type: "table", head: ["Strategy", "How", "Best for"], rows: [
          ["<b>Event-driven</b>", "Projection refreshes/deletes keys on the change event", "Primary strategy — accurate & timely"],
          ["<b>TTL expiry</b>", "Every key has a max age", "Safety net for anything missed"],
          ["<b>Write-through</b>", "Command path writes cache + DB together", "Read-your-own-write on hot keys"],
          ["<b>Versioned keys</b>", "Include a version/etag in the key", "Avoids serving stale on races"],
        ]},
        { type: "callout", kind: "ok", title: "We combine them", body: "Event-driven invalidation keeps Redis correct; TTL is the backstop for anything a missed event would otherwise leave stale. Together they give freshness without unbounded staleness." },
      ]},
    ]},
    { type: "flow", title: "Read-your-own-write — handling the consistency gap",
      diagramTitle: "Making eventual consistency invisible to the user",
      steps: [
        { name: "User submits change", tech: "command returns new state", icon: "user", cat: "client" },
        { name: "Write-through hot key", tech: "command updates Redis directly", icon: "cache", cat: "mon", edge: "immediate" },
        { name: "UI shows result now", tech: "from command response + SignalR", icon: "signalr", cat: "mon", edge: "no read-DB wait" },
        { name: "Projection catches up", tech: "read DB/replica updated async", icon: "cog", cat: "app", edge: "ms–seconds later" },
      ]},
    { type: "callout", kind: "warn", title: "Be honest about eventual consistency", body: "The read model lags the write model by the projection + replication time (typically milliseconds to a couple of seconds). We hide this from users with three tactics: (1) the command returns the new state so the UI updates instantly; (2) <b>SignalR</b> pushes the confirmed state when the projection completes; (3) write-through updates Redis for hot keys so an immediate re-read is correct. Cross-user reads accept the small lag — which is fine for dashboards and lists." },
    { type: "caps", title: "What Redis + CQRS delivers", cols: 4, items: [
      { icon: "bolt", cat: "app", title: "Fast reads", desc: "Sub-millisecond cache hits; write DB unburdened." },
      { icon: "scale", cat: "app", title: "Independent scale", desc: "Scale reads (Redis/replicas) separately." },
      { icon: "check", cat: "db", title: "Reliable sync", desc: "Outbox + events keep read side correct." },
      { icon: "signalr", cat: "mon", title: "Fresh UX", desc: "SignalR closes the consistency gap for users." },
    ]},
  ],
});

/* ---------- Redis Caching Strategies & Patterns ---------- */
window.SECTIONS.push({
  id: "redis-caching", group: "Data & Persistence", label: "Redis Caching Patterns",
  kicker: "Caching Deep-Dive", title: "Redis caching strategies & patterns",
  sub: "Caching is easy to add and easy to get wrong. This page covers the five caching patterns and when to use each, the Redis data structures behind them, .NET integration (IDistributedCache, HybridCache), defending against cache stampedes, invalidation, eviction policies, and deployment topologies.",
  blocks: [
    { type: "callout", kind: "info", title: "Redis is a cache, not the system of record", body: "Everything here treats Redis as a <b>fast, rebuildable copy</b> of data whose source of truth is the database. Every cache entry needs a <b>TTL</b> and an <b>invalidation story</b>; a cache miss must always be safe to serve from the DB. (For how the read model stays in sync in CQRS, see <b>Redis &amp; CQRS Sync</b>.)" },
    { type: "caps", title: "The five caching patterns", cols: 5, items: [
      { icon: "cache", cat: "mon", title: "Cache-aside", desc: "App checks cache, loads DB on miss, populates. The default." },
      { icon: "flow", cat: "app", title: "Read-through", desc: "The cache layer loads from the DB on miss." },
      { icon: "check", cat: "db", title: "Write-through", desc: "Write cache + DB together, synchronously." },
      { icon: "retry", cat: "ext", title: "Write-behind", desc: "Write cache now, flush to DB asynchronously." },
      { icon: "bolt", cat: "app", title: "Refresh-ahead", desc: "Proactively refresh hot keys before they expire." },
    ]},

    { type: "tabs", title: "Patterns, structures & integration", tabs: [

      { label: "Caching patterns", blocks: [
        { type: "table", title: "Which pattern, when", head: ["Pattern", "Who loads the DB", "Write path", "Trade-off"], rows: [
          ["<b>Cache-aside</b>", "The application, on miss", "Write DB, then invalidate/refresh cache", "Simple, resilient; first read is a miss (default choice)"],
          ["<b>Read-through</b>", "The cache provider, on miss", "Via the provider", "Clean read code; needs a provider that supports it"],
          ["<b>Write-through</b>", "n/a (always warm)", "Write cache + DB synchronously", "Cache always fresh; slower writes"],
          ["<b>Write-behind</b>", "n/a", "Write cache, async batch to DB", "Fast writes; risk of loss if cache dies before flush"],
          ["<b>Refresh-ahead</b>", "Background, before expiry", "—", "Low read latency on hot keys; wasted work on cold ones"],
        ]},
        { type: "code", lang: "csharp", label: "Cache-aside (read)", code:
"public async Task<ProductDto?> GetAsync(string id, CancellationToken ct)\n{\n    var key = $\"product:{id}\";\n    var cached = await _redis.StringGetAsync(key);\n    if (cached.HasValue)                                   // HIT\n        return JsonSerializer.Deserialize<ProductDto>(cached!);\n\n    var dto = await _db.LoadAsync(id, ct);                 // MISS -> DB\n    if (dto is not null)\n        await _redis.StringSetAsync(key, JsonSerializer.Serialize(dto),\n            TimeSpan.FromMinutes(10));                     // populate + TTL\n    return dto;\n}" },
        { type: "code", lang: "csharp", label: "Write-through (keep cache fresh on write)", code:
"public async Task UpdateAsync(ProductDto p, CancellationToken ct)\n{\n    await _db.SaveAsync(p, ct);                            // 1) source of truth\n    await _redis.StringSetAsync($\"product:{p.Id}\",         // 2) cache in the same op\n        JsonSerializer.Serialize(p), TimeSpan.FromMinutes(10));\n}\n\n// Write-behind: enqueue and flush asynchronously (fast writes, eventual DB)\n//   await _redis.StringSetAsync(key, value);   // immediate\n//   _writeQueue.Enqueue(p);                     // background worker persists to DB" },
        { type: "callout", kind: "ok", title: "Default to cache-aside", body: "Cache-aside is the workhorse: the cache never sits in the write path, a broker/cache outage only slows reads (never loses writes), and it's trivial to reason about. Reach for write-through when a key must always be warm, and write-behind only when write latency truly dominates and you can tolerate a small loss window." },
      ]},

      { label: "Data structures", blocks: [
        { type: "para", body: "Redis is more than a string store — picking the right structure makes caches smaller and operations atomic." },
        { type: "table", head: ["Type", "Commands", "Caching use"], rows: [
          ["<b>String</b>", "<code>GET/SET/INCR</code>", "Serialized objects, counters, simple values"],
          ["<b>Hash</b>", "<code>HSET/HGET</code>", "Object with independently-updatable fields"],
          ["<b>Sorted Set</b>", "<code>ZADD/ZRANGE</code>", "Leaderboards, rankings, rate/time windows"],
          ["<b>Set</b>", "<code>SADD/SISMEMBER</code>", "Tags, membership, uniqueness"],
          ["<b>List</b>", "<code>LPUSH/LRANGE</code>", "Recent-items, simple queues"],
          ["<b>Bitmap</b>", "<code>SETBIT/BITCOUNT</code>", "Feature flags, daily-active presence"],
          ["<b>HyperLogLog</b>", "<code>PFADD/PFCOUNT</code>", "Approximate unique counts (tiny memory)"],
          ["<b>Stream</b>", "<code>XADD/XREAD</code>", "Append-only event log / lightweight queue"],
        ]},
        { type: "code", lang: "csharp", label: "hash + sorted set examples", code:
"// Hash: cache an object, update one field without rewriting the whole blob\nawait _redis.HashSetAsync(\"product:42\", new HashEntry[]{ new(\"price\", 19.99), new(\"stock\", 120) });\nvar price = await _redis.HashGetAsync(\"product:42\", \"price\");\n\n// Sorted set: a top-sellers leaderboard\nawait _redis.SortedSetIncrementAsync(\"sales:today\", \"product:42\", 1);\nvar top10 = await _redis.SortedSetRangeByRankWithScoresAsync(\n    \"sales:today\", 0, 9, Order.Descending);" },
      ]},

      { label: ".NET integration", blocks: [
        { type: "para", body: "In .NET, use the <b>connection multiplexer as a singleton</b>, then layer higher-level caching APIs on top." },
        { type: "code", lang: "csharp", label: "Program.cs — registration", code:
"// Low-level client (thread-safe, expensive to create) -> SINGLETON\nbuilder.Services.AddSingleton<IConnectionMultiplexer>(_ =>\n    ConnectionMultiplexer.Connect(cfg[\"Redis:ConnectionString\"]!));\n\n// IDistributedCache backed by Redis\nbuilder.Services.AddStackExchangeRedisCache(o => o.Configuration = cfg[\"Redis:ConnectionString\"]);\n\n// Output caching with Redis (cache whole responses)\nbuilder.Services.AddStackExchangeRedisOutputCache(o => o.Configuration = cfg[\"Redis:ConnectionString\"]);\n\n// HybridCache (.NET 9): L1 in-memory + L2 Redis, stampede-safe, tag invalidation\nbuilder.Services.AddHybridCache();" },
        { type: "code", lang: "csharp", label: "HybridCache — L1+L2, one call", code:
"public Task<ProductDto?> GetAsync(string id, CancellationToken ct) =>\n    _cache.GetOrCreateAsync(\n        $\"product:{id}\",\n        async token => await _db.LoadAsync(id, token),      // only runs on a miss\n        new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(10) },\n        tags: new[] { \"products\" },\n        cancellationToken: ct);\n\n// Invalidate everything tagged 'products' in one call\nawait _cache.RemoveByTagAsync(\"products\", ct);" },
        { type: "callout", kind: "ok", title: "Prefer HybridCache for new code", body: "<b>HybridCache</b> (.NET 9) combines a fast in-process L1 with a shared Redis L2, and gives you <b>built-in stampede protection</b> (request coalescing) and <b>tag-based invalidation</b> out of the box — removing most hand-rolled cache-aside boilerplate. Register a Redis <code>IDistributedCache</code> and it becomes the L2 automatically." },
      ]},

      { label: "Stampede & invalidation", blocks: [
        { type: "para", body: "A <b>cache stampede</b> (thundering herd): a hot key expires and thousands of concurrent misses hammer the database at once. Defend it:" },
        { type: "table", title: "Stampede defences", head: ["Technique", "How"], rows: [
          ["<b>Request coalescing</b>", "One caller rebuilds; others await the same task (HybridCache does this)"],
          ["<b>Distributed lock</b>", "<code>SET key val NX PX ttl</code> — only the lock holder rebuilds"],
          ["<b>Jittered TTL</b>", "Randomise expiry so keys don't all expire together"],
          ["<b>Stale-while-revalidate</b>", "Serve stale value while refreshing in the background"],
          ["<b>Cache warming</b>", "Pre-populate hot keys on deploy / on a schedule"],
        ]},
        { type: "table", title: "Invalidation strategies", head: ["Strategy", "How", "Best for"], rows: [
          ["<b>TTL expiry</b>", "Every key has a max age", "The safety-net baseline"],
          ["<b>Event-driven</b>", "Publish on write → evict/refresh the key", "Accurate, timely freshness"],
          ["<b>Versioned keys</b>", "Embed a version: <code>product:v3:42</code>", "Atomic bulk swap; avoids races"],
          ["<b>Tag-based</b>", "Group keys by tag, evict by tag", "Invalidate a whole category at once"],
        ]},
        { type: "code", lang: "csharp", label: "lock to prevent stampede", code:
"var key = $\"report:{id}\";\nvar cached = await _redis.StringGetAsync(key);\nif (cached.HasValue) return Deserialize(cached);\n\nvar lockKey = $\"{key}:lock\";\nif (await _redis.StringSetAsync(lockKey, \"1\", TimeSpan.FromSeconds(10), When.NotExists))\n{\n    try   { var v = await _db.BuildExpensiveReportAsync(id);\n            await _redis.StringSetAsync(key, Serialize(v), Jitter(TimeSpan.FromMinutes(10)));\n            return v; }\n    finally { await _redis.KeyDeleteAsync(lockKey); }\n}\nawait Task.Delay(100);                 // someone else is rebuilding; brief wait + retry\nreturn await GetAsync(id);" },
      ]},

      { label: "Eviction & topology", blocks: [
        { type: "table", title: "Eviction policies (maxmemory-policy)", head: ["Policy", "Behaviour"], rows: [
          ["<code>noeviction</code>", "Reject writes when memory is full (safe default for a store)"],
          ["<code>allkeys-lru</code>", "Evict least-recently-used across all keys — good general cache"],
          ["<code>allkeys-lfu</code>", "Evict least-frequently-used — better for skewed hot sets"],
          ["<code>volatile-lru / -lfu / -ttl</code>", "Evict only keys that have a TTL set"],
          ["<code>allkeys-random</code>", "Evict at random — rarely ideal"],
        ]},
        { type: "table", title: "Deployment topologies", head: ["Topology", "Gives you"], rows: [
          ["<b>Standalone</b>", "Single node — dev / simple use"],
          ["<b>Primary + replicas</b>", "Read scale-out + HA (replicas serve reads)"],
          ["<b>Sentinel</b>", "Automatic failover / monitoring for primary-replica"],
          ["<b>Cluster</b>", "Horizontal sharding across nodes via hash slots"],
          ["<b>Azure Cache for Redis</b>", "Managed: Standard (replica), Premium (cluster, persistence, VNet), Enterprise (active geo-replication)"],
        ]},
        { type: "callout", kind: "warn", title: "Operational gotchas", body: "Redis is <b>single-threaded per shard</b> — never run <code>KEYS *</code> in production (use <code>SCAN</code>), and keep values small (a giant value blocks everyone). Beware <b>hot keys</b> concentrating load on one shard; mitigate with client-side caching (HybridCache L1), key hashing, or replicas. Size <code>maxmemory</code> with headroom and pick an eviction policy deliberately." },
      ]},

      { label: "Failure & HA", blocks: [
        { type: "callout", kind: "ok", title: "Golden rule: a cache outage must never be an app outage", body: "Because caching is <b>cache-aside</b>, if Redis is unreachable the code simply <b>falls through to the database</b> — slower, but fully functional. The job is to (1) survive a Redis outage gracefully, (2) recover automatically via replicas/failover, and (3) not hammer a dead Redis while it heals." },
        { type: "flow", title: "What happens when the primary fails",
          diagramTitle: "Replication, automatic failover & DB fallback",
          legend: [ {cat:"app",label:"App"},{cat:"mon",label:"Primary"},{cat:"db",label:"Replica / DB"},{cat:"sec",label:"Failover"} ],
          steps: [
            { name: "Application", tech: "cache-aside client", icon: "cog", cat: "app" },
            { name: "Redis Primary", tech: "reads + writes", icon: "cache", cat: "mon", edge: "connect" },
            { edge: "continuous async replication", parallel: [
              { name: "Replica 1", tech: "read-only copy", icon: "cache", cat: "db" },
              { name: "Replica 2", tech: "read-only copy", icon: "cache", cat: "db" },
            ]},
            { name: "Sentinel / Cluster", tech: "health-check → promote a replica", icon: "shield", cat: "sec", edge: "on primary failure" },
            { name: "Database (fallback)", tech: "source of truth", icon: "db", cat: "db", edge: "if Redis unreachable → serve from DB" },
          ]},
        { type: "code", title: "1) Resilient connection (survive a down/rebooting Redis)", lang: "csharp", label: "Program.cs", code:
"var options = ConfigurationOptions.Parse(cfg[\"Redis:ConnectionString\"]!);\noptions.AbortOnConnectFail  = false;   // don't throw at startup if Redis is down\noptions.ConnectRetry        = 5;\noptions.ConnectTimeout      = 5000;\noptions.KeepAlive           = 60;\noptions.ReconnectRetryPolicy = new ExponentialRetry(5000); // auto-reconnect w/ backoff\n// HA endpoints: list every node / the Sentinel or cluster endpoint\n// options.EndPoints.Add(\"redis-1:6379\"); options.EndPoints.Add(\"redis-2:6379\");\n\nbuilder.Services.AddSingleton<IConnectionMultiplexer>(_ =>\n    ConnectionMultiplexer.Connect(options));   // multiplexer auto-reconnects on recovery" },
        { type: "code", title: "2) Graceful fallback — degrade to the database", lang: "csharp", label: "ResilientCache.cs", code:
"public async Task<ProductDto?> GetAsync(string id, CancellationToken ct)\n{\n    var key = $\"product:{id}\";\n    try\n    {\n        if (_breaker.IsOpen)                                   // Redis known-down: skip it\n            return await _db.LoadAsync(id, ct);\n\n        var db = _redis.GetDatabase();\n        var cached = await db.StringGetAsync(key);\n        if (cached.HasValue) return Deserialize(cached);       // HIT\n\n        var dto = await _db.LoadAsync(id, ct);                  // MISS\n        if (dto is not null)\n            await db.StringSetAsync(key, Serialize(dto), TtlWithJitter());\n        return dto;\n    }\n    catch (RedisConnectionException ex)                        // Redis unreachable\n    {\n        _breaker.Trip();                                       // stop calling Redis briefly\n        _logger.LogWarning(ex, \"Redis down — serving {Key} from database\", key);\n        return await _db.LoadAsync(id, ct);                    // FALLBACK, no outage\n    }\n}" },
        { type: "callout", kind: "info", title: "Let the framework help", body: "<b>HybridCache</b>'s in-process L1 keeps serving even when the L2 (Redis) is unreachable, and coalesces the rebuilds. Wrap Redis calls in a <b>Polly</b> circuit breaker + timeout so a dead Redis fails fast to the DB instead of piling up connections." },
        { type: "table", title: "How replicas & automatic failover work", head: ["Approach", "Failover", "How replicas are added"], rows: [
          ["<b>Primary + replica(s)</b>", "Manual promote unless paired with Sentinel", "Start a node with <code>replicaof &lt;primary&gt; 6379</code>; it syncs then serves reads"],
          ["<b>Sentinel</b>", "<b>Automatic</b> — detects a dead primary, elects & promotes a replica; clients ask Sentinel for the current primary", "Add a replica node + register it with Sentinel (<code>sentinel monitor</code>)"],
          ["<b>Cluster</b>", "<b>Automatic per shard</b> — each shard's replica is promoted", "Add shards (rebalance hash slots) and/or replicas per shard"],
          ["<b>Azure Cache for Redis</b>", "<b>Automatic & managed</b>", "Set replica/shard count in the portal or Bicep — Azure provisions them"],
        ]},
        { type: "code", title: "3a) Add a replica (VM / manual)", lang: "bash", label: "add-replica", code:
"# On the new node — make it a replica of the primary; it back-fills automatically\nredis-server --replicaof redis-primary 6379 --appendonly yes\n\n# Or promote/redirect at runtime\nredis-cli -h new-node REPLICAOF redis-primary 6379\nredis-cli -h primary INFO replication      # verify: connected_slaves:N" },
        { type: "code", title: "3b) Primary + replica + Sentinel (Docker Compose)", lang: "yaml", label: "docker-compose.redis-ha.yml", code:
"services:\n  redis-primary:\n    image: redis:7\n    command: [\"redis-server\", \"--appendonly\", \"yes\"]\n  redis-replica:\n    image: redis:7\n    command: [\"redis-server\", \"--replicaof\", \"redis-primary\", \"6379\"]\n    depends_on: [redis-primary]\n  redis-sentinel:\n    image: redis:7\n    # sentinel.conf: sentinel monitor mymaster redis-primary 6379 2\n    #               sentinel down-after-milliseconds mymaster 5000\n    command: [\"redis-sentinel\", \"/etc/redis/sentinel.conf\"]\n    depends_on: [redis-primary, redis-replica]\n    deploy: { replicas: 3 }        # quorum of 3 sentinels" },
        { type: "table", title: "Where Redis can run", head: ["Environment", "Setup", "Best for"], rows: [
          ["<b>Docker (single)</b>", "<code>docker run redis:7</code>", "Local dev / a simple single node"],
          ["<b>Docker Compose (HA)</b>", "primary + replica + 3× Sentinel (above)", "Local HA / failover testing"],
          ["<b>Kubernetes</b>", "StatefulSet via <b>Redis Operator</b> or the <b>Bitnami Helm</b> chart (Sentinel or Cluster mode)", "Self-managed HA/cluster in the cloud — scale replicas by scaling the set"],
          ["<b>VM(s)</b>", "Install redis-server; <code>replicaof</code> + Sentinel", "On-prem / lift-and-shift"],
          ["<b>Managed</b>", "<b>Azure Cache for Redis</b> (Standard = auto-failover replica; Premium = cluster + zones + persistence; Enterprise = active geo-replication), AWS ElastiCache, Redis Enterprise Cloud", "Production with zero ops — failover & replicas are managed for you"],
        ]},
        { type: "callout", kind: "ok", title: "Recommended", body: "In Azure, use a <b>managed Azure Cache for Redis (Premium)</b> — replicas, zone redundancy and automatic failover are handled for you, and you scale replicas/shards from config (IaC). Self-host on <b>Kubernetes</b> (Operator/Helm with Sentinel or Cluster) only when you need full control or portability. Either way, keep the <b>DB-fallback + circuit breaker</b> in the app so a rare total outage degrades gracefully instead of failing." },
      ]},

    ]},
    { type: "caps", title: "Caching best practices", cols: 4, items: [
      { icon: "cog", cat: "app", title: "Multiplexer = singleton", desc: "Thread-safe & costly to create; never per-request." },
      { icon: "book", cat: "domain", title: "Key conventions", desc: "Namespaced, versioned keys: entity:vN:id." },
      { icon: "retry", cat: "ext", title: "Right-size TTLs", desc: "Per data volatility; add jitter to avoid mass expiry." },
      { icon: "shield", cat: "sec", title: "Cache the right data", desc: "Hot reads & reference data — not volatile or sensitive data." },
      { icon: "cache", cat: "mon", title: "Two-tier (L1+L2)", desc: "In-process + Redis via HybridCache for the hottest keys." },
      { icon: "check", cat: "db", title: "Always safe on miss", desc: "A cache outage degrades to DB reads, never errors." },
      { icon: "monitor", cat: "mon", title: "Measure hit ratio", desc: "Track hits/misses, latency, evictions, memory." },
      { icon: "bolt", cat: "app", title: "SCAN, not KEYS", desc: "Never block the server enumerating keys." },
    ]},
    { type: "callout", kind: "ok", title: "Where caching fits the platform", body: "Redis caching keeps hot reads off the primary database and powers the CQRS read side (see <b>Redis &amp; CQRS Sync</b>), which is central to hitting the latency and scale NFRs (see <b>Scaling for Max Load</b>). Cache-aside is the default; HybridCache is the modern, stampede-safe way to do it in .NET; and every entry has a TTL and an invalidation plan." },
  ],
});
