/* ============================================================
   Content — Architecture group
   ============================================================ */
window.SECTIONS = window.SECTIONS || [];
var D = window.DETAILS;

/* ---------- 05 N-Layer vs N-Tier ---------- */
window.SECTIONS.push({
  id: "layer-tier", num: "05", group: "Architecture", label: "N-Layer vs N-Tier",
  kicker: "Foundations", title: "N-Layer vs N-Tier — logical vs physical",
  sub: "A frequent source of confusion, and an important one for deployment and cost decisions. Layers are a logical separation of responsibilities; tiers are a physical separation of deployment boundaries.",
  blocks: [
    { type: "vs",
      left: { icon: "layers", title: "N-Layer (logical)", blocks: [
        { type: "para", body: "Separation of <b>concerns in code</b>. Layers can (and often should) run inside a single deployed process." },
        { type: "flow", diagramTitle: "Logical layers", steps: [
          { name: "Presentation", tech: "Controllers / UI", icon: "api", cat: "api" },
          { name: "Application", tech: "Use cases / CQRS", icon: "cog", cat: "app", edge: "" },
          { name: "Domain", tech: "Business rules", icon: "domain", cat: "domain", edge: "" },
          { name: "Infrastructure", tech: "EF / Bus / Clients", icon: "db", cat: "db", edge: "" },
        ]},
        { type: "featureList", variant: "pros", items: ["Fast in-process calls (no network hop)", "Simple to develop, test and debug", "Clear code ownership & boundaries"] },
      ]},
      right: { icon: "globe", title: "N-Tier (physical)", blocks: [
        { type: "para", body: "Separation of <b>deployment units</b> across machines/networks, communicating over the wire." },
        { type: "flow", diagramTitle: "Physical tiers", steps: [
          { name: "Browser", tech: "Client device", icon: "user", cat: "client" },
          { name: "Web / CDN", tech: "Front Door", icon: "cloud", cat: "client", edge: "HTTPS" },
          { name: "API Server", tech: "App Service / AKS", icon: "api", cat: "api", edge: "HTTPS" },
          { name: "App / Workers", tech: "Compute tier", icon: "worker", cat: "app", edge: "AMQP" },
          { name: "Database Server", tech: "Managed SQL/PG", icon: "db", cat: "db", edge: "TDS/PG" },
        ]},
        { type: "featureList", variant: "cons", items: ["Network latency between tiers", "More moving parts to operate & secure", "Independent scale & isolation (the upside)"] },
      ]},
    },
    { type: "callout", kind: "info", title: "How they combine here", body: "This platform uses <b>N-Layer inside each deployable</b> (Clean Architecture) and a small number of <b>physical tiers</b> (edge, API, workers, data). You get clean code boundaries <i>and</i> the ability to scale the API and workers independently — without prematurely splitting into distributed services." },
  ],
});

/* ---------- 06 Physical Deployment ---------- */
window.SECTIONS.push({
  id: "deployment", num: "06", group: "Architecture", label: "Physical Deployment",
  kicker: "Physical Architecture", title: "Azure deployment topology",
  sub: "The physical/network view: how traffic enters, where compute runs, and how supporting services and network boundaries are arranged for security and scale.",
  blocks: [
    { type: "flow", diagramTitle: "Ingress → compute → data",
      legend: [ {cat:"client",label:"Edge / DMZ"},{cat:"api",label:"App network"},{cat:"app",label:"Compute"},{cat:"db",label:"Data network"} ],
      steps: [
        { name: "Internet", tech: "Public clients", icon: "globe", cat: "client" },
        { name: "Azure Front Door", tech: "Global LB · CDN · TLS", icon: "cloud", cat: "client", edge: "HTTPS" },
        { name: "App Gateway / WAF", tech: "L7 firewall", icon: "shield", cat: "sec", edge: "filtered" },
        { name: "API Management", tech: "Policy · throttle · JWT", icon: "gateway", cat: "api", edge: "policy" },
        { name: "App Service / AKS", tech: "APIs + SignalR", icon: "api", cat: "api", edge: "private" },
        { name: "Azure Service Bus", tech: "Premium namespace", icon: "bus", cat: "msg", edge: "AMQP (private endpoint)", detail: D.servicebus },
        { edge: "processing", parallel: [
          { name: "Azure Functions", tech: "Elastic consumers", icon: "func", cat: "func", detail: D.func },
          { name: "Worker (AKS)", tech: "Sustained load", icon: "worker", cat: "app", detail: D.worker },
        ]},
        { name: "SQL / PostgreSQL", tech: "Zone-redundant · private endpoint", icon: "db", cat: "db", edge: "private link", detail: D.database },
      ]},
    { type: "caps", title: "Supporting services", cols: 4, items: [
      { icon: "key", cat: "sec", title: "Key Vault", desc: "Secrets, certs; Managed Identity access." },
      { icon: "cache", cat: "db", title: "Redis", desc: "Cache, locks, idempotency, backplane." },
      { icon: "grid", cat: "func", title: "Event Grid", desc: "Event routing & integration." },
      { icon: "monitor", cat: "mon", title: "App Insights", desc: "Traces, metrics, dashboards, alerts." },
      { icon: "inbox", cat: "db", title: "Storage", desc: "Documents, reports, GRS replication." },
      { icon: "signalr", cat: "mon", title: "Azure SignalR", desc: "Managed WebSocket backplane." },
      { icon: "monitor", cat: "mon", title: "Azure Monitor", desc: "Platform metrics & log analytics." },
      { icon: "cog", cat: "app", title: "IaC (Bicep)", desc: "Repeatable, reviewable provisioning." },
    ]},
    { type: "callout", kind: "ok", title: "Network boundaries", body: "Public surface is limited to Front Door + WAF. All backend services (Service Bus, DB, Key Vault, Storage) sit behind <b>Private Endpoints</b> inside a VNet, reached only from the app subnet. NSGs and a firewall enforce east-west rules; compute authenticates to data & secrets via <b>Managed Identity</b> — no connection strings in config." },
  ],
});

/* ---------- 07 Database Design ---------- */
window.SECTIONS.push({
  id: "database", num: "07", group: "Architecture", label: "Database Design",
  kicker: "Data", title: "Data model & persistence strategy",
  sub: "The system of record, designed for transactional integrity, traceability and read performance — portable across SQL Server and PostgreSQL.",
  blocks: [
    { type: "erd", title: "Entity–relationship diagram", desc: "The full data model with every relationship — 1:1, 1:N and the M:N RBAC relations resolved through association tables. Dashed links are logical (no enforced FK, e.g. the Outbox and the polymorphic AuditLog).",
      diagramTitle: "Assurance & Audit — ER model",
      entities: [
        { id: "AuditCase", label: "AuditCase", cat: "domain", x: 24, y: 44, fields: [ {name:"Id",key:"PK"}, {name:"AuditTransactionId",key:"FK"}, {name:"Scope"}, {name:"Status"} ] },
        { id: "SagaState", label: "SagaState", cat: "app", x: 24, y: 190, fields: [ {name:"Id",key:"PK"}, {name:"AuditTransactionId",key:"FK"}, {name:"CorrelationId",key:"UQ"}, {name:"CurrentStep"}, {name:"Status"} ] },
        { id: "OutboxMessage", label: "OutboxMessage", cat: "db", x: 24, y: 352, fields: [ {name:"Id",key:"PK"}, {name:"AggregateId"}, {name:"EventType"}, {name:"Status"}, {name:"ProcessedAt"} ] },
        { id: "AuditLog", label: "AuditLog", cat: "sec", x: 24, y: 514, fields: [ {name:"Id",key:"PK"}, {name:"EntityType"}, {name:"EntityId"}, {name:"Action"}, {name:"UserId",key:"FK"}, {name:"CreatedAt"} ] },
        { id: "AuditTransaction", label: "AuditTransaction", cat: "domain", badge: "root", x: 300, y: 252, fields: [ {name:"Id",key:"PK"}, {name:"TransactionId",key:"UQ"}, {name:"CustomerId",key:"FK"}, {name:"Status"}, {name:"Amount"}, {name:"CorrelationId"}, {name:"CreatedDate"} ] },
        { id: "Payment", label: "Payment", cat: "ext", x: 576, y: 80, fields: [ {name:"Id",key:"PK"}, {name:"AuditTransactionId",key:"FK"}, {name:"ApprovedByUserId",key:"FK"}, {name:"Status"}, {name:"Amount"}, {name:"IdempotencyKey",key:"UQ"} ] },
        { id: "PaymentTransaction", label: "PaymentTransaction", cat: "ext", x: 852, y: 36, fields: [ {name:"Id",key:"PK"}, {name:"PaymentId",key:"FK"}, {name:"Attempt"}, {name:"Status"}, {name:"Amount"}, {name:"ProcessedAt"} ] },
        { id: "WebhookEvent", label: "WebhookEvent", cat: "ext", x: 852, y: 224, fields: [ {name:"Id",key:"PK"}, {name:"PaymentId",key:"FK"}, {name:"EventId",key:"UQ"}, {name:"Status"}, {name:"ReceivedAt"} ] },
        { id: "User", label: "User", cat: "client", x: 300, y: 470, fields: [ {name:"Id",key:"PK"}, {name:"Name"}, {name:"Email",key:"UQ"}, {name:"TenantId"}, {name:"Status"} ] },
        { id: "UserRole", label: "UserRole", cat: "sec", x: 548, y: 506, fields: [ {name:"UserId",key:"FK"}, {name:"RoleId",key:"FK"} ] },
        { id: "Role", label: "Role", cat: "sec", x: 744, y: 470, fields: [ {name:"Id",key:"PK"}, {name:"Name",key:"UQ"}, {name:"Description"} ] },
        { id: "RolePermission", label: "RolePermission", cat: "sec", x: 968, y: 506, fields: [ {name:"RoleId",key:"FK"}, {name:"PermissionId",key:"FK"} ] },
        { id: "Permission", label: "Permission", cat: "sec", x: 1160, y: 470, fields: [ {name:"Id",key:"PK"}, {name:"Name",key:"UQ"}, {name:"Scope"} ] },
      ],
      rels: [
        { from:"AuditCase", to:"AuditTransaction", card:"1:1" },
        { from:"SagaState", to:"AuditTransaction", card:"1:1" },
        { from:"OutboxMessage", to:"AuditTransaction", card:"N:1", logical:true },
        { from:"AuditTransaction", to:"Payment", card:"1:N" },
        { from:"Payment", to:"PaymentTransaction", card:"1:N" },
        { from:"Payment", to:"WebhookEvent", card:"1:N" },
        { from:"User", to:"AuditTransaction", card:"1:N" },
        { from:"Payment", to:"User", card:"N:1", logical:true },
        { from:"AuditLog", to:"User", card:"N:1" },
        { from:"User", to:"UserRole", card:"1:N" },
        { from:"Role", to:"UserRole", card:"1:N" },
        { from:"Role", to:"RolePermission", card:"1:N" },
        { from:"Permission", to:"RolePermission", card:"1:N" },
        { from:"AuditTransaction", to:"AuditLog", card:"1:N", logical:true },
      ],
    },
    { type: "table", title: "Core tables & relationships", head: ["Table", "Purpose", "Key relationships"], rows: [
      ["<code>AuditTransaction</code>", "Root transaction & status", "1—1 AuditCase, 1—* Payment"],
      ["<code>AuditCase</code>", "Assurance case detail", "*—1 AuditTransaction"],
      ["<code>Payment</code>", "Payment intent & status", "*—1 AuditTransaction, 1—* PaymentTransaction"],
      ["<code>PaymentTransaction</code>", "Attempt / ledger entry", "*—1 Payment"],
      ["<code>WebhookEvent</code>", "Inbound callback ledger (idempotency)", "*—1 Payment"],
      ["<code>OutboxMessage</code>", "Transactional event publishing", "logical: aggregate id"],
      ["<code>SagaState</code>", "Long-running orchestration state", "1—1 AuditTransaction (correlation)"],
      ["<code>AuditLog</code>", "Immutable change history", "polymorphic by entity"],
      ["<code>User / Role / Permission</code>", "RBAC model", "User *—* Role *—* Permission"],
    ]},
    { type: "tabs", title: "Schema & indexing", tabs: [
      { label: "OutboxMessage (SQL Server)", blocks: [ { type: "code", lang: "sql", label: "outbox.sql", code:
"CREATE TABLE OutboxMessages (\n    Id            UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWSEQUENTIALID(),\n    AggregateId   UNIQUEIDENTIFIER NOT NULL,\n    EventType     NVARCHAR(200)    NOT NULL,\n    Payload       NVARCHAR(MAX)    NOT NULL,\n    CorrelationId NVARCHAR(100)    NOT NULL,\n    CreatedAt     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),\n    ProcessedAt   DATETIME2        NULL,\n    RetryCount    INT              NOT NULL DEFAULT 0,\n    Status        NVARCHAR(20)     NOT NULL DEFAULT 'Pending',\n    ErrorMessage  NVARCHAR(2000)   NULL\n);\n-- Only scan messages that still need publishing\nCREATE NONCLUSTERED INDEX IX_Outbox_Pending\n    ON OutboxMessages (CreatedAt)\n    WHERE Status = 'Pending';" } ]},
      { label: "AuditTransaction", blocks: [ { type: "code", lang: "sql", label: "audit.sql", code:
"CREATE TABLE AuditTransaction (\n    Id            UNIQUEIDENTIFIER PRIMARY KEY,\n    TransactionId NVARCHAR(40)  NOT NULL UNIQUE,\n    CustomerId    UNIQUEIDENTIFIER NOT NULL,\n    Status        NVARCHAR(30)  NOT NULL,\n    Amount        DECIMAL(18,2) NULL,\n    CorrelationId NVARCHAR(100) NOT NULL,\n    CreatedDate   DATETIME2     NOT NULL,\n    UpdatedDate   DATETIME2     NOT NULL\n);\nCREATE NONCLUSTERED INDEX IX_Audit_Status_Created\n    ON AuditTransaction (Status, CreatedDate)\n    INCLUDE (TransactionId, CustomerId, Amount);\nCREATE NONCLUSTERED INDEX IX_Audit_Correlation\n    ON AuditTransaction (CorrelationId);" } ]},
      { label: "PostgreSQL variant", blocks: [ { type: "code", lang: "sql", label: "outbox_pg.sql", code:
"CREATE TABLE outbox_messages (\n    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    aggregate_id   UUID NOT NULL,\n    event_type     VARCHAR(200) NOT NULL,\n    payload        JSONB NOT NULL,\n    correlation_id VARCHAR(100) NOT NULL,\n    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),\n    processed_at   TIMESTAMPTZ,\n    retry_count    INT NOT NULL DEFAULT 0,\n    status         VARCHAR(20) NOT NULL DEFAULT 'Pending',\n    error_message  TEXT\n);\nCREATE INDEX ix_outbox_pending\n    ON outbox_messages (created_at)\n    WHERE status = 'Pending';" } ]},
    ]},
    { type: "twoCol", cols: [
      { type: "featureList", title: "Indexing strategy", variant: "pros", items: [ "Clustered PK on sequential Id (write locality)", "Composite index on <code>(Status, CreatedDate)</code> for worklists", "Covering indexes to avoid key lookups on hot reads", "Filtered index on Outbox <code>Status='Pending'</code>", "Index on <code>CorrelationId</code> for trace queries" ]},
      { type: "featureList", title: "SQL Server vs PostgreSQL", items: [ "Both fully supported via EF Core provider swap", "SQL Server: enterprise tooling, Always On AG", "PostgreSQL: JSONB, lower licensing cost", "Dapper used for high-throughput read queries", "Migrations kept provider-neutral where possible" ]},
    ]},
  ],
});

/* ---------- 08 Design Patterns ---------- */
window.SECTIONS.push({
  id: "patterns", num: "08", group: "Architecture", label: "Design Patterns",
  kicker: "Engineering", title: "Design patterns catalogue",
  sub: "The patterns that give this architecture its properties. Each entry states the problem, why it is required, where it lives, and shows a concise C# implementation. Saga and Outbox have their own dedicated sections.",
  blocks: [
    { type: "accordion", title: "Structural & tactical patterns", items: [
      { title: "Clean Architecture + DDD", badge: "Architecture", open: true, blocks: [
        { type: "para", body: "<b>Problem:</b> business logic entangled with frameworks becomes untestable and rigid. <b>Solution:</b> concentric layers with the dependency rule; a rich domain model expresses the ubiquitous language. <b>Location:</b> whole solution." },
        { type: "featureList", variant: "pros", items: ["Framework-independent, fast-to-test domain", "Clear boundaries; easy to reason about"] },
        { type: "featureList", variant: "cons", items: ["More upfront structure/ceremony than CRUD", "Overkill for trivial apps"] },
      ]},
      { title: "CQRS (Command Query Responsibility Segregation)", badge: "Application", blocks: [
        { type: "para", body: "<b>Problem:</b> reads and writes have different shapes, scaling and consistency needs. <b>Solution:</b> separate command and query models via MediatR. <b>Location:</b> Application layer." },
        { type: "code", lang: "csharp", label: "Command + handler", code:
"public record CreateAuditCommand(Guid CustomerId, decimal? Amount, string IdempotencyKey)\n    : IRequest<Guid>;\n\npublic class CreateAuditHandler : IRequestHandler<CreateAuditCommand, Guid>\n{\n    private readonly IAuditRepository _repo;\n    public async Task<Guid> Handle(CreateAuditCommand c, CancellationToken ct)\n    {\n        var tx = AuditTransaction.Create(c.CustomerId, c.Amount); // raises AuditCreated\n        await _repo.AddAsync(tx, ct);                              // + outbox row\n        return tx.Id;\n    }\n}" },
      ]},
      { title: "Repository + Unit of Work", badge: "Infrastructure", blocks: [
        { type: "para", body: "<b>Problem:</b> leaking persistence details into use cases. <b>Solution:</b> repositories expose aggregate operations; the DbContext is the Unit of Work committing them atomically." },
        { type: "code", lang: "csharp", label: "Interfaces", code:
"public interface IAuditRepository\n{\n    Task AddAsync(AuditTransaction tx, CancellationToken ct);\n    Task<AuditTransaction?> GetAsync(Guid id, CancellationToken ct);\n}\n\npublic interface IUnitOfWork\n{\n    Task<int> SaveChangesAsync(CancellationToken ct);\n}" },
      ]},
      { title: "Mediator", badge: "Application", blocks: [ { type: "para", body: "<b>Problem:</b> controllers coupled to many services. <b>Solution:</b> MediatR routes requests to handlers and hosts pipeline behaviors (validation, logging, transaction) — one place to add cross-cutting concerns." } ]},
      { title: "Specification", badge: "Domain", blocks: [
        { type: "para", body: "<b>Problem:</b> business query rules duplicated across the codebase. <b>Solution:</b> encapsulate criteria as composable specification objects." },
        { type: "code", lang: "csharp", label: "Specification", code:
"public class PendingApprovalSpec : Specification<AuditTransaction>\n{\n    public PendingApprovalSpec() =>\n        Criteria = t => t.Status == AuditStatus.ApprovalRequired;\n}" },
      ]},
      { title: "Strategy / Factory / Adapter / Decorator", badge: "GoF", blocks: [
        { type: "featureList", items: [
          "<b>Strategy</b> — pluggable validation & pricing rules selected at runtime.",
          "<b>Factory</b> — build the correct payment provider client per region/config.",
          "<b>Adapter</b> — KyrePay client adapts a 3rd-party contract to our port.",
          "<b>Decorator</b> — wrap handlers/clients with caching, retry, logging without changing them." ] },
      ]},
    ]},
    { type: "accordion", title: "Resilience & messaging patterns", items: [
      { title: "Retry · Circuit Breaker · Timeout · Bulkhead", badge: "Resilience (Polly)", blocks: [
        { type: "para", body: "<b>Problem:</b> transient faults and slow dependencies cascade into outages. <b>Solution:</b> compose Polly policies around every external call." },
        { type: "code", lang: "csharp", label: "Policy composition", code:
"var resilience = Policy.WrapAsync(\n    Policy.TimeoutAsync(TimeSpan.FromSeconds(8)),\n    Policy.Handle<HttpRequestException>()\n          .WaitAndRetryAsync(3, a => TimeSpan.FromSeconds(Math.Pow(2, a))),\n    Policy.Handle<HttpRequestException>()\n          .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)),\n    Policy.BulkheadAsync(maxParallel: 20, maxQueue: 40));" },
      ]},
      { title: "Idempotency", badge: "Messaging", blocks: [
        { type: "para", body: "<b>Problem:</b> at-least-once delivery and client retries cause duplicate processing. <b>Solution:</b> record processed message/idempotency keys and no-op on repeats." },
        { type: "code", lang: "csharp", label: "Idempotent consume", code:
"public async Task Handle(PaymentInitiated evt, CancellationToken ct)\n{\n    if (await _processed.ExistsAsync(evt.MessageId, ct)) return; // already done\n    await _payments.ChargeAsync(evt, ct);\n    await _processed.MarkAsync(evt.MessageId, ct);\n}" },
      ]},
      { title: "Dependency Injection", badge: "Composition", blocks: [ { type: "code", lang: "csharp", label: "Program.cs", code:
"builder.Services\n    .AddMediatR(c => c.RegisterServicesFromAssembly(typeof(CreateAuditCommand).Assembly))\n    .AddScoped<IAuditRepository, AuditRepository>()\n    .AddScoped<IUnitOfWork, AppDbContext>()\n    .AddSingleton<IServiceBusPublisher, ServiceBusPublisher>()\n    .AddHostedService<OutboxPublisher>();" } ]},
      { title: "Outbox & Saga", badge: "See dedicated sections", blocks: [ { type: "callout", kind: "info", title: "Covered in depth", body: "The <b>Outbox Pattern</b> (transactional publishing) and the <b>Saga Pattern</b> (distributed transactions with compensation) each have a full section with diagrams, state and code." } ]},
    ]},
  ],
});

/* ---------- Domain-Driven Design (deep dive) ---------- */
window.SECTIONS.push({
  id: "ddd", group: "Architecture", label: "Domain-Driven Design",
  kicker: "Modelling the Business", title: "Domain-Driven Design (DDD)",
  sub: "DDD builds software for complex domains around a rich, behaviour-carrying model of the business itself — not the database schema or the UI. For an assurance & audit platform, where the rules (who can approve, when a case can be paid, what an auditor may change) are the product, DDD is what keeps those rules correct, findable and changeable. It has two halves: strategic design (how you carve the system into pieces) and tactical design (how you model each piece in code).",
  blocks: [
    { type: "callout", kind: "info", title: "The core idea", body: "Put each business rule <b>next to the business concept that owns it</b>, expressed in the same language the domain experts use. A change to a rule (\"an audit case can't be paid before it's approved\") then maps to one obvious place in the code — the aggregate that owns it — instead of being scattered across controllers, services and stored procedures." },
    { type: "caps", title: "Why DDD here", cols: 3, items: [
      { icon: "domain", cat: "domain", title: "Time complexity", desc: "Code structure mirrors business structure; rules live where they belong." },
      { icon: "grid", cat: "func", title: "Defines boundaries", desc: "Bounded contexts give objective service/module boundaries — not guesswork." },
      { icon: "book", cat: "sec", title: "Shared language", desc: "One vocabulary for experts, developers and code — fewer 'wrong thing built' errors." },
      { icon: "check", cat: "db", title: "Consistency boundaries", desc: "Aggregates say what must be transactional vs eventually consistent." },
      { icon: "bolt", cat: "msg", title: "Event source", desc: "Domain events become your Service Bus event catalogue." },
      { icon: "cog", cat: "app", title: "Change isolation", desc: "Rules change safely; infrastructure swaps without touching the domain." },
    ]},
    { type: "tabs", title: "The two halves of DDD", tabs: [
      { label: "Strategic (the big picture)", blocks: [
        { type: "para", title: "Ubiquitous Language", body: "One precise, shared vocabulary used by domain experts, developers <i>and</i> the code. If the business says \"assurance engagement\", the class is <code>AssuranceEngagement</code> — not <code>AuditJobManager</code>. Ambiguity in language becomes bugs in code." },
        { type: "callout", kind: "warn", title: "Name for the domain, not the tech", body: "Prefer <code>AuditCase</code>, <code>Finding</code>, <code>ApprovalRequest</code>, <code>Reconciliation</code> over generic <code>DataObject</code>, <code>Manager</code>, <code>Helper</code>, <code>Processor</code> that hide business meaning." },
        { type: "twoCol", cols: [
          { type: "featureList", title: "Subdomains — classify by value", items: [
            "<b>Core domain</b> — what differentiates you (the assurance / findings & risk-scoring engine). Invest your best people; full DDD rigour.",
            "<b>Supporting</b> — necessary, not differentiating (case management, document handling). Build pragmatically.",
            "<b>Generic</b> — solved problems (authentication, notifications). Buy/adopt off-the-shelf; don't reinvent." ]},
          { type: "featureList", title: "Bounded Context — where a model is consistent", items: [
            "An explicit boundary within which the model & language are unambiguous.",
            "The <b>same word differs by context</b>: a \"Customer\" in <i>Audit</i> (engagement, scope) ≠ a \"Customer\" in <i>Billing</i> (tax id, payment terms).",
            "Each context owns its own model.",
            "<b>A bounded context is the natural unit that maps to a microservice.</b>" ]},
        ]},
        { type: "flow", title: "Bounded contexts of the platform", desc: "Each context owns its model and language; they integrate via events and contracts — the seams along which services are (or will be) split.",
          diagramTitle: "Assurance & Audit — context map",
          legend: [ {cat:"domain",label:"Core"},{cat:"app",label:"Supporting"},{cat:"sec",label:"Generic"} ],
          steps: [
            { name: "Audit / Assurance", tech: "CORE — cases, findings, risk", icon: "domain", cat: "domain" },
            { edge: "integrate via domain/integration events", parallel: [
              { name: "Payment / Billing", tech: "supporting", icon: "card", cat: "app" },
              { name: "Compliance", tech: "supporting", icon: "shield", cat: "app" },
              { name: "Reporting", tech: "supporting", icon: "book", cat: "app" },
            ]},
            { edge: "generic — buy / adopt", parallel: [
              { name: "Identity & Access", tech: "generic", icon: "key", cat: "sec" },
              { name: "Notifications", tech: "generic", icon: "signalr", cat: "sec" },
            ]},
          ]},
        { type: "table", title: "Context mapping — how contexts relate", head: ["Relationship", "Meaning", "Example here"], rows: [
          ["<b>Partnership</b>", "Two contexts evolve together, coordinated", "Audit ↔ Compliance on shared regulatory changes"],
          ["<b>Customer–Supplier</b>", "Upstream serves a downstream, with negotiation", "Audit (supplier) → Reporting (customer)"],
          ["<b>Conformist</b>", "Downstream accepts the upstream model as-is", "Reporting conforms to Audit's event schema"],
          ["<b>Anti-Corruption Layer (ACL)</b>", "A translation layer protects a clean model from a messy/legacy one", "KyrePay client adapts the vendor contract to our domain"],
          ["<b>Open Host / Published Language</b>", "Upstream exposes a documented public contract", "Audit publishes a versioned <code>audit-events</code> schema"],
          ["<b>Shared Kernel</b>", "A small shared model between contexts (use sparingly — it couples them)", "Shared <code>Money</code> / <code>TenantId</code> value objects"],
        ]},
        { type: "callout", kind: "ok", title: "The Anti-Corruption Layer matters most in practice", body: "When integrating a third party (KyrePay) or a legacy system, an ACL stops their messy or foreign model leaking into your core. In this platform the KyrePay client <i>is</i> an ACL — it translates the vendor's payment contract into our domain terms and back (see <b>Payment Integration</b>)." },
      ]},
      { label: "Tactical (the building blocks)", blocks: [
        { type: "vs", title: "Entity vs Value Object",
          left: { icon: "domain", title: "Entity — has identity", blocks: [
            { type: "para", body: "Defined by a distinct <b>identity</b> that persists as attributes change. An <code>AuditTransaction</code> is the same transaction even as its status and amount change." },
            { type: "code", lang: "csharp", label: "Entity", code:
"public class AuditTransaction            // identity = Id\n{\n    public Guid Id { get; private set; }\n    public AuditStatus Status { get; private set; }\n    // private setters — state changes only via behaviour methods\n}" },
          ]},
          right: { icon: "layers", title: "Value Object — no identity", blocks: [
            { type: "para", body: "Defined entirely by its <b>attributes</b>, <b>immutable</b>, interchangeable. Two <code>Money(100,\"USD\")</code> are equal. Prefer value objects heavily — a typed <code>Money</code> beats a raw <code>decimal</code>." },
            { type: "code", lang: "csharp", label: "Value objects (records)", code:
"public record Money(decimal Amount, string Currency);\npublic record AuditReference(string Value);\npublic record DateRange(DateTime From, DateTime To);" },
          ]},
        },
        { type: "para", title: "Aggregate & Aggregate Root", body: "A cluster of entities and value objects treated as <b>one consistency / transaction unit</b>, accessed only through a single entry point — the <b>aggregate root</b>. Here, <code>AuditCase</code> (root) owns its <code>Finding</code> entities; you never mutate a finding directly, you go through the root, which enforces the invariants." },
        { type: "flow", diagramTitle: "AuditCase aggregate", steps: [
          { name: "AuditCase (root)", tech: "enforces all invariants", icon: "domain", cat: "domain" },
          { edge: "accessed only via the root", parallel: [
            { name: "Finding", tech: "entity", icon: "doc", cat: "domain" },
            { name: "ReviewNote", tech: "entity", icon: "book", cat: "domain" },
            { name: "Money / DateRange", tech: "value objects", icon: "layers", cat: "app" },
          ]},
        ]},
        { type: "code", title: "The aggregate root enforces invariants & raises events", lang: "csharp", label: "AuditCase.cs", code:
"public class AuditCase                         // Aggregate Root\n{\n    private readonly List<Finding> _findings = new();\n    public Guid Id { get; private set; }\n    public AuditStatus Status { get; private set; }\n    public IReadOnlyList<Finding> Findings => _findings.AsReadOnly();\n    private readonly List<IDomainEvent> _events = new();\n    public IReadOnlyList<IDomainEvent> Events => _events.AsReadOnly();\n\n    public void AddFinding(Finding f)\n    {\n        if (Status == AuditStatus.Approved)                 // invariant\n            throw new DomainException(\"Cannot add findings to an approved case.\");\n        _findings.Add(f);\n    }\n\n    public void Approve(Guid approverId)\n    {\n        if (Status != AuditStatus.InReview)                 // invariant\n            throw new DomainException(\"Only a case in review can be approved.\");\n        if (_findings.Any(x => x.IsUnresolved))             // invariant\n            throw new DomainException(\"Resolve all findings before approval.\");\n        Status = AuditStatus.Approved;\n        _events.Add(new AuditApproved(Id, approverId));     // domain event\n    }\n}" },
        { type: "featureList", title: "Aggregate rules", variant: "pros", items: [
          "Keep aggregates <b>small</b>; reference other aggregates by <b>id</b>, not by object.",
          "One transaction modifies <b>one aggregate</b>; cross-aggregate changes go via domain events / eventual consistency.",
          "<b>The aggregate is your unit of consistency</b> — and therefore a natural transaction boundary, shard key and event source." ]},
        { type: "code", title: "Domain event → integration event", lang: "csharp", label: "events.cs", code:
"// Domain event — internal, raised by the aggregate\npublic record AuditApproved(Guid AuditCaseId, Guid ApproverId) : IDomainEvent;\n\n// Integration event — the cross-service contract published to Service Bus\npublic record AuditApprovedIntegrationEvent(\n    Guid AuditCaseId, Guid TenantId, string CorrelationId, DateTime OccurredAt);" },
        { type: "callout", kind: "info", title: "Domain event vs integration event", body: "A <b>domain event</b> is an internal business fact raised inside an aggregate (<code>AuditApproved</code>). An <b>integration event</b> is the public, versioned contract published to other services via the <b>Outbox → Service Bus</b>. DDD is where your event catalogue <i>comes from</i>." },
        { type: "accordion", title: "The remaining building blocks", items: [
          { title: "Repository", badge: "Per aggregate root", blocks: [
            { type: "para", body: "Collection-like access to aggregates, hiding persistence. One repository <b>per aggregate root</b>, not per table." },
            { type: "code", lang: "csharp", label: "IAuditCaseRepository", code:
"public interface IAuditCaseRepository\n{\n    Task<AuditCase?> GetAsync(Guid id, CancellationToken ct);\n    Task AddAsync(AuditCase aggregate, CancellationToken ct);\n}" } ]},
          { title: "Domain Service", badge: "Cross-entity logic", blocks: [
            { type: "para", body: "Domain logic that doesn't naturally belong to one entity/value object — stateless, expresses a domain operation. E.g. a <code>RiskScoringService</code> combining a case, its findings and client history." } ]},
          { title: "Factory", badge: "Valid creation", blocks: [
            { type: "para", body: "Encapsulates complex creation so an aggregate is <b>always created in a valid state</b> (e.g. an <code>AuditCase.Open(...)</code> factory that seeds status, tenant and correlation id)." } ]},
          { title: "Application Service", badge: "Orchestration only", blocks: [
            { type: "para", body: "A thin orchestration layer: load an aggregate via a repository, invoke domain behaviour, save, publish events. It holds <b>no business rules</b> — it coordinates. This is where your CQRS command handlers live." },
            { type: "code", lang: "csharp", label: "ApproveAuditHandler.cs", code:
"public async Task Handle(ApproveAuditCommand c, CancellationToken ct)\n{\n    var aggregate = await _repo.GetAsync(c.AuditCaseId, ct)   // load\n                    ?? throw new NotFoundException();\n    aggregate.Approve(c.ApproverId);                          // domain behaviour\n    await _uow.SaveChangesAsync(ct);                          // persist + outbox\n}" } ]},
        ]},
      ]},
    ]},
    { type: "callout", kind: "ok", title: "The one idea that ties DDD to the whole platform", body: "<b>The aggregate is your unit of consistency.</b> That single boundary becomes: your <b>transaction boundary</b> (one aggregate per transaction), your <b>shard key</b> (see Sharding — shard by aggregate identity / TenantId), the source of your <b>domain events</b> (which become Service Bus integration events via the Outbox), and the write model in <b>CQRS</b>. Get this boundary right and the rest of the architecture falls into place." },
    { type: "table", title: "How DDD connects to the rest of this showcase", head: ["DDD concept", "Becomes", "See section"], rows: [
      ["Bounded Context", "A microservice / module boundary", "Microservices vs Monolith"],
      ["Aggregate", "Transaction boundary + shard key", "Sharding · Replica · Partitioning"],
      ["Aggregate (write model)", "The 'C' in CQRS; read model is a projection", "Redis & CQRS Sync"],
      ["Domain Event", "Integration event on Service Bus (via Outbox)", "Outbox · Service Bus"],
      ["Cross-aggregate workflow", "A Saga with compensation", "Saga Pattern"],
      ["Anti-Corruption Layer", "The KyrePay client", "Payment Integration"],
      ["Ubiquitous Language", "Names in API, events, DB and UI", "API Catalog"],
    ]},
    { type: "callout", kind: "warn", title: "The costs — when NOT to use full DDD", body: "DDD is investment-heavy and pays off for <b>complex core domains</b> — it is <b>overkill for simple CRUD</b> and generic subdomains (don't model authentication with full tactical DDD). It needs ongoing collaboration with domain experts, or you get 'DDD-shaped' code that misses the point. And the most common failure is <b>getting aggregate boundaries wrong</b>: too big → contention and large transactions; too small → broken invariants." },
    { type: "callout", kind: "info", title: "C# tooling", body: "Plain C# models the domain (rich entities with private setters + behaviour methods; immutable value objects via <code>record</code>). <b>MediatR</b> dispatches application-service commands/queries, <b>EF Core</b> sits behind repositories, and the messaging layer publishes domain/integration events through the <b>Outbox</b>." },
  ],
});
