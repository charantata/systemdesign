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
    { type: "callout", kind: "ok", title: "Where these live in the architecture", body: "Aggregates and window functions power the <b>Observability</b> and <b>NFR</b> dashboards; JSON functions read Outbox/Webhook payloads; inline TVFs back the CQRS <b>read side</b> via Dapper. Writes never use functions for logic — that stays in the domain model (see EF Core &amp; Dapper)." },
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
