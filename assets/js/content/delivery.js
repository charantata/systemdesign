/* ============================================================
   Content — Delivery group (catalog, flow, ADRs, samples, roadmap)
   ============================================================ */
window.SECTIONS = window.SECTIONS || [];
var D = window.DETAILS;

/* ---------- 24 API Catalog ---------- */
window.SECTIONS.push({
  id: "api-catalog", num: "24", group: "Delivery", label: "API Catalog",
  kicker: "Contracts", title: "API catalogue",
  sub: "An API-first platform: every capability is a documented, versioned, secured endpoint. Below is the core surface with security, idempotency and correlation conventions.",
  blocks: [
    { type: "table", title: "Endpoints", head: ["Method", "Route", "Purpose", "AuthZ"], rows: [
      ["<span class='tag post'>POST</span>", "<code>/api/audit</code>", "Create an audit transaction", "audit:create"],
      ["<span class='tag get'>GET</span>", "<code>/api/audit/{id}</code>", "Get a transaction", "audit:read"],
      ["<span class='tag get'>GET</span>", "<code>/api/audit</code>", "List / search transactions", "audit:read"],
      ["<span class='tag put'>PUT</span>", "<code>/api/audit/{id}</code>", "Update a transaction", "audit:write"],
      ["<span class='tag put'>PUT</span>", "<code>/api/audit/{id}/approve</code>", "Approve (manager)", "payment:approve"],
      ["<span class='tag get'>GET</span>", "<code>/api/audit/{id}/history</code>", "Audit trail / history", "audit:read"],
      ["<span class='tag post'>POST</span>", "<code>/api/payment</code>", "Initiate a payment", "payment:write"],
      ["<span class='tag get'>GET</span>", "<code>/api/payment/{id}</code>", "Get payment status", "payment:read"],
      ["<span class='tag post'>POST</span>", "<code>/api/webhooks/payment</code>", "KyrePay callback", "HMAC signature"],
    ]},
    { type: "accordion", title: "Endpoint contract detail", items: [
      { title: "POST /api/audit", badge: "Create", open: true, blocks: [
        { type: "table", head: ["Aspect", "Value"], rows: [
          ["Auth", "JWT bearer + policy <code>CanCreateAudit</code>"],
          ["Idempotency", "<code>Idempotency-Key</code> header required"],
          ["Correlation", "<code>X-Correlation-Id</code> echoed on response"],
          ["Success", "<code>201 Created</code> + Location header"],
          ["Errors", "<code>400</code> validation · <code>401/403</code> authz · <code>409</code> duplicate key"],
        ]},
        { type: "code", lang: "http", label: "request", code:
"POST /api/audit HTTP/1.1\nAuthorization: Bearer eyJ...\nIdempotency-Key: 6f1a-...\nX-Correlation-Id: c-8842\nContent-Type: application/json\n\n{ \"customerId\": \"cust-01\", \"amount\": 4200.00 }" },
        { type: "code", lang: "json", label: "201 response", code:
"{\n  \"id\": \"AUD-10293\",\n  \"status\": \"NEW\",\n  \"correlationId\": \"c-8842\"\n}" },
      ]},
      { title: "POST /api/webhooks/payment", badge: "Webhook", blocks: [
        { type: "table", head: ["Aspect", "Value"], rows: [
          ["Auth", "HMAC signature in <code>X-Kyre-Signature</code>"],
          ["Idempotency", "By <code>eventId</code> (WebhookEvent ledger)"],
          ["Behaviour", "Validate → persist → publish → <code>200</code>"],
          ["Errors", "<code>401</code> bad signature · <code>404</code> unknown txn"],
        ]},
      ]},
    ]},
    { type: "callout", kind: "info", title: "Conventions across all APIs", body: "Bearer JWT auth, policy-based authorization, <code>Idempotency-Key</code> on all writes, <code>X-Correlation-Id</code> propagation, RFC-7807 <code>problem+json</code> error bodies, and semantic versioning via the gateway. Documented with OpenAPI/Swagger and pinned by contract tests." },
  ],
});

/* ---------- API styles: gRPC, GraphQL, OData ---------- */
window.SECTIONS.push({
  id: "api-styles", group: "Delivery", label: "gRPC · GraphQL · OData",
  kicker: "API Styles", title: "gRPC, GraphQL & OData — beyond plain REST",
  sub: "REST/JSON is the default public API, but three other styles solve specific problems: gRPC for fast internal service-to-service calls, GraphQL for flexible client-driven queries, and OData for standardized queryable REST. Here's how each works in C#, the exact NuGet packages to add, and when to reach for which.",
  blocks: [
    { type: "flow", title: "Where each style fits",
      diagramTitle: "One gateway, several API styles",
      legend: [ {cat:"client",label:"Client"},{cat:"api",label:"REST"},{cat:"app",label:"GraphQL"},{cat:"db",label:"OData"},{cat:"func",label:"gRPC (internal)"} ],
      steps: [
        { name: "Client", tech: "browser / mobile", icon: "user", cat: "client" },
        { name: "API Gateway", tech: "authN/Z · TLS", icon: "gateway", cat: "api", edge: "HTTPS", detail: D.gateway },
        { edge: "public / edge API styles", parallel: [
          { name: "REST / JSON", tech: "default public API", icon: "api", cat: "api" },
          { name: "GraphQL", tech: "client-driven queries", icon: "flow", cat: "app" },
          { name: "OData", tech: "queryable REST", icon: "monitor", cat: "db" },
        ]},
        { name: "Microservices", tech: "handle the request", icon: "grid", cat: "api", edge: "" },
        { name: "gRPC (internal)", tech: "service ↔ service · HTTP/2 · Protobuf", icon: "bolt", cat: "func", edge: "low-latency sync" },
      ]},

    { type: "tabs", title: "Each style in C#", tabs: [

      { label: "gRPC", blocks: [
        { type: "para", body: "<b>gRPC</b> is contract-first RPC over HTTP/2 using Protocol Buffers — compact, strongly-typed, streaming-capable. Ideal for <b>internal, synchronous, low-latency</b> service-to-service calls (e.g. Order service asking Pricing \"what's the price?\"). Not natively browser-callable — use gRPC-Web for that." },
        { type: "featureList", title: "NuGet packages to add", items: [
          "<code>Grpc.AspNetCore</code> — server hosting (bundles Grpc.Tools + Google.Protobuf)",
          "<code>Grpc.Net.ClientFactory</code> — typed clients via DI + resilience",
          "<code>Grpc.Tools</code> — <code>.proto</code> → C# code generation at build",
          "<code>Grpc.AspNetCore.Web</code> — gRPC-Web (browser / Angular clients)",
          "<code>Grpc.AspNetCore.Server.Reflection</code> — reflection for grpcurl / tooling",
          "<code>protobuf-net.Grpc.AspNetCore</code> — optional <b>code-first</b> gRPC (no .proto)" ]},
        { type: "code", lang: "proto", label: "Protos/pricing.proto", code:
"syntax = \"proto3\";\noption csharp_namespace = \"Assurance.Pricing\";\n\nservice Pricing {\n  rpc GetPrice (PriceRequest) returns (PriceReply);\n  rpc StreamPrices (PriceRequest) returns (stream PriceReply); // server streaming\n}\n\nmessage PriceRequest { string sku = 1; }\nmessage PriceReply   { string sku = 1; double price = 2; }" },
        { type: "code", lang: "bash", label: "Pricing.Api.csproj", code:
"<ItemGroup>\n  <Protobuf Include=\"Protos/pricing.proto\" GrpcServices=\"Server\" />\n</ItemGroup>" },
        { type: "code", lang: "csharp", label: "server", code:
"// Program.cs\nbuilder.Services.AddGrpc();\napp.MapGrpcService<PricingService>();\n\n// PricingService.cs — implement the generated base class\npublic class PricingService : Pricing.PricingBase\n{\n    public override async Task<PriceReply> GetPrice(PriceRequest req, ServerCallContext ctx)\n        => new PriceReply { Sku = req.Sku, Price = await _engine.CalculateAsync(req.Sku, ctx.CancellationToken) };\n}" },
        { type: "code", lang: "csharp", label: "typed client + resilience", code:
"builder.Services\n    .AddGrpcClient<Pricing.PricingClient>(o => o.Address = new Uri(\"https://pricing\"))\n    .AddStandardResilienceHandler();   // retry, timeout, circuit breaker\n\n// usage\nvar reply = await _pricing.GetPriceAsync(new PriceRequest { Sku = sku },\n                deadline: DateTime.UtcNow.AddSeconds(2));   // always set a deadline" },
        { type: "callout", kind: "ok", title: "Use it internally, with deadlines", body: "gRPC shines for chatty internal traffic. Always set a per-call <b>deadline</b> and wrap clients in a <b>circuit breaker</b> (a sync call is a coupling point). For browsers, enable <b>gRPC-Web</b>; for public APIs, stick to REST." },
      ]},

      { label: "GraphQL", blocks: [
        { type: "para", body: "<b>GraphQL</b> lets the <i>client</i> ask for exactly the fields it needs in one round-trip — no over- or under-fetching. Great for a mobile app or a BFF aggregating several services. In .NET the standard is <b>Hot Chocolate</b>." },
        { type: "featureList", title: "NuGet packages to add", items: [
          "<code>HotChocolate.AspNetCore</code> — GraphQL server + the Nitro/Banana Cake Pop IDE",
          "<code>HotChocolate.Data</code> — <code>$filter</code>/sort/paging + projections",
          "<code>HotChocolate.Data.EntityFramework</code> — EF Core integration (projections push down to SQL)",
          "<code>HotChocolate.AspNetCore.Authorization</code> — <code>[Authorize]</code> inside the schema" ]},
        { type: "code", lang: "csharp", label: "Program.cs", code:
"builder.Services\n    .AddGraphQLServer()\n    .AddQueryType<Query>()\n    .AddMutationType<Mutation>()\n    .AddProjections()      // select only requested columns\n    .AddFiltering()        // where(...) push-down\n    .AddSorting()\n    .AddAuthorization();\n\napp.MapGraphQL();          // POST /graphql  (+ IDE in dev)" },
        { type: "code", lang: "csharp", label: "Query.cs — resolvers over IQueryable", code:
"public class Query\n{\n    [UseProjection, UseFiltering, UseSorting]      // translated to efficient SQL by EF\n    public IQueryable<AuditTransaction> GetAuditTransactions([Service] AppDbContext db)\n        => db.AuditTransactions;\n\n    public Task<AuditTransaction?> GetAuditTransaction(Guid id, [Service] AppDbContext db)\n        => db.AuditTransactions.FirstOrDefaultAsync(x => x.Id == id);\n}" },
        { type: "code", lang: "graphql", label: "a client query", code:
"query {\n  auditTransactions(\n    where: { status: { eq: \"APPROVAL_REQUIRED\" } }\n    order: { createdDate: DESC }\n  ) {\n    transactionId\n    amount\n    payments { status amount }   # only the fields asked for, one round-trip\n  }\n}" },
        { type: "callout", kind: "warn", title: "Watch complexity & caching", body: "GraphQL trades HTTP caching and simplicity for flexibility. Guard against abusive queries with <b>max depth / complexity limits</b> and persisted queries; be aware the N+1 problem needs <b>DataLoader</b>. Best as a BFF/aggregation layer, not a replacement for every REST endpoint." },
      ]},

      { label: "OData", blocks: [
        { type: "para", body: "<b>OData</b> adds a <i>standardized query language</i> on top of REST — <code>$filter</code>, <code>$orderby</code>, <code>$select</code>, <code>$expand</code>, <code>$top</code>, <code>$count</code> — that the client composes in the URL and the server translates straight to SQL via <code>IQueryable</code>. Perfect for admin/reporting grids over EF entities." },
        { type: "featureList", title: "NuGet packages to add", items: [
          "<code>Microsoft.AspNetCore.OData</code> — OData v4 routing + query options for ASP.NET Core" ]},
        { type: "code", lang: "csharp", label: "Program.cs", code:
"var edm = new ODataConventionModelBuilder();\nedm.EntitySet<AuditTransaction>(\"AuditTransactions\");\n\nbuilder.Services.AddControllers().AddOData(opt => opt\n    .Select().Filter().OrderBy().Expand().Count()\n    .SetMaxTop(100)                                   // cap page size\n    .AddRouteComponents(\"odata\", edm.GetEdmModel()));" },
        { type: "code", lang: "csharp", label: "controller", code:
"public class AuditTransactionsController : ODataController\n{\n    private readonly AppDbContext _db;\n    public AuditTransactionsController(AppDbContext db) => _db = db;\n\n    [EnableQuery(MaxExpansionDepth = 2)]   // applies $filter/$orderby/$select/$expand to IQueryable\n    public IQueryable<AuditTransaction> Get() => _db.AuditTransactions;\n}" },
        { type: "code", lang: "http", label: "example requests", code:
"GET /odata/AuditTransactions?$filter=Status eq 'APPROVED' and Amount gt 1000\nGET /odata/AuditTransactions?$orderby=CreatedDate desc&$top=20&$count=true\nGET /odata/AuditTransactions?$select=Id,TransactionId,Amount&$expand=Payments\nGET /odata/AuditTransactions?$filter=year(CreatedDate) eq 2026" },
        { type: "callout", kind: "warn", title: "Powerful — so put guardrails on it", body: "OData exposes your data model directly, so cap it: <code>SetMaxTop</code>, limit <code>$expand</code> depth, and only enable the options you want. It's ideal for internal/reporting surfaces; for public APIs prefer curated REST or GraphQL so clients aren't coupled to your schema." },
      ]},

      { label: "When to use which", blocks: [
        { type: "table", head: ["Style", "Best for", "Transport / shape", "Trade-off"], rows: [
          ["<b>REST / JSON</b>", "Public & browser APIs (the default)", "HTTP/1.1 · JSON · cacheable", "Over/under-fetching; many endpoints"],
          ["<b>gRPC</b>", "Internal service-to-service, streaming", "HTTP/2 · Protobuf (binary)", "Not browser-native; binary is harder to debug"],
          ["<b>GraphQL</b>", "Client-driven queries, BFF/aggregation", "HTTP · one flexible endpoint", "Caching & query-complexity management"],
          ["<b>OData</b>", "Queryable REST for grids/reporting", "HTTP · REST + query params", "Couples clients to the data model"],
        ]},
        { type: "callout", kind: "ok", title: "They coexist", body: "This platform uses <b>REST</b> at the edge (see API Catalog), <b>gRPC</b> for internal sync calls, and can expose <b>GraphQL</b> (BFF/aggregation) or <b>OData</b> (reporting grids) where they earn their place. Pick per use case — not one style for everything." },
      ]},

    ]},

    { type: "table", title: "Extensions to add over C# — quick reference", head: ["Style", "NuGet packages"], rows: [
      ["gRPC", "<code>Grpc.AspNetCore</code>, <code>Grpc.Net.ClientFactory</code>, <code>Grpc.Tools</code>, <code>Google.Protobuf</code>, <code>Grpc.AspNetCore.Web</code>, <code>Grpc.AspNetCore.Server.Reflection</code>, <code>protobuf-net.Grpc.AspNetCore</code> (code-first)"],
      ["GraphQL", "<code>HotChocolate.AspNetCore</code>, <code>HotChocolate.Data</code>, <code>HotChocolate.Data.EntityFramework</code>, <code>HotChocolate.AspNetCore.Authorization</code>"],
      ["OData", "<code>Microsoft.AspNetCore.OData</code>"],
    ]},
  ],
});

/* ---------- 25 End-to-End Flow (animated) ---------- */
window.SECTIONS.push({
  id: "e2e", num: "25", group: "Delivery", label: "End-to-End Flow",
  kicker: "The Full Journey", title: "End-to-end transaction flow",
  sub: "Press Play to watch a single audit transaction travel through the entire platform — from the user's click to a real-time confirmation on their screen. Use Step to walk it manually during a workshop.",
  blocks: [
    { type: "player", title: "Create-audit-and-pay — full sequence", steps: [
      { from: "User", to: "Angular", title: "User submits an audit transaction", desc: "The user fills the form and clicks Submit. Angular attaches the JWT and a fresh correlation ID.", tags: ["JWT", "X-Correlation-Id"] },
      { from: "Angular", to: "API Gateway", title: "Request hits the gateway", desc: "APIM validates the token, checks scopes, applies rate limits and forwards the call.", tags: ["OAuth2", "throttle"] },
      { from: "Gateway", to: "ASP.NET API", title: "Command dispatched (CQRS)", desc: "The controller sends a CreateAuditCommand through MediatR; validation and authorization policies run in the pipeline.", tags: ["MediatR", "FluentValidation"] },
      { from: "API", to: "Database", title: "Atomic write + Outbox", desc: "The AuditTransaction and an OutboxMessage are written in one transaction. The API returns 201 immediately.", tags: ["EF Core", "Outbox", "201"] },
      { from: "Outbox", to: "Service Bus", title: "Event published reliably", desc: "The Outbox publisher picks up the pending row and publishes AuditCreated to the audit-events topic.", tags: ["at-least-once", "MessageId"] },
      { from: "Service Bus", to: "Payment Consumer", title: "Payment step consumed", desc: "After validation and approval, the payment subscription delivers the event to the payment consumer.", tags: ["subscription", "session"] },
      { from: "Payment Consumer", to: "KyrePay", title: "Charge sent to KyrePay", desc: "A signed, idempotent request is sent to KyrePay behind a timeout + circuit-breaker.", tags: ["HMAC", "Idempotency-Key", "Polly"] },
      { from: "KyrePay", to: "Webhook API", title: "Async signed callback", desc: "KyrePay settles and calls back. The webhook validates the signature, de-duplicates, persists and returns 200 fast.", tags: ["webhook", "dedup", "200"] },
      { from: "Webhook API", to: "Service Bus", title: "PaymentCompleted published", desc: "The webhook hands off to Service Bus; the finaliser consumer updates the transaction idempotently.", tags: ["publish", "idempotent"] },
      { from: "Consumer", to: "Database", title: "Transaction finalised", desc: "Payment marked Completed, report generated, status set to AUDIT_COMPLETED, audit log appended.", tags: ["AuditLog", "report"] },
      { from: "Service Bus", to: "SignalR → Angular", title: "Live confirmation to the user", desc: "The notification consumer pushes the final status over SignalR; the user's screen updates instantly — no refresh.", tags: ["SignalR", "WebSocket", "real-time"] },
    ]},
    { type: "callout", kind: "ok", title: "One correlation ID, eleven hops", body: "Every step above shares the same correlation ID. If anything fails, Application Insights shows the exact hop, the input, and the recovery action taken — from the browser all the way to KyrePay and back." },
  ],
});

/* ---------- 26 ADRs ---------- */
window.SECTIONS.push({
  id: "adr", num: "26", group: "Delivery", label: "Architecture Decision Records",
  kicker: "Rationale", title: "Architecture Decision Records",
  sub: "The 'why' behind each major choice — documented, so the reasoning survives the team. Click to expand each record.",
  blocks: [
    { type: "adrs", items: [
      { id: "ADR-001", q: "Why Azure Service Bus?", context: "We need reliable, ordered, decoupled processing of business transactions with guaranteed delivery and load leveling.", decision: "Use Azure Service Bus (topics/subscriptions) as the messaging backbone.",
        alternatives: ["RabbitMQ (self-managed ops overhead)", "Azure Storage Queues (no topics/sessions)", "Kafka (overkill; log-stream, not work-queue semantics)"],
        consequences: ["+ At-least-once, sessions, DLQ, dedup out of the box", "+ Fully managed, geo-DR capable", "− Azure-coupled; cost at premium tier"] },
      { id: "ADR-002", q: "Why the Saga pattern?", context: "A transaction spans audit, payment and reporting across services; 2-phase commit is impractical.", decision: "Use sagas (orchestration for payments, choreography for notifications) with compensating actions.",
        alternatives: ["Distributed transactions / 2PC", "Best-effort with manual reconciliation"],
        consequences: ["+ Consistency without distributed locks", "+ Explicit, auditable compensation", "− More design effort; eventual consistency"] },
      { id: "ADR-003", q: "Why the Outbox pattern?", context: "We must update the DB and publish an event atomically; dual writes risk inconsistency.", decision: "Write events to an Outbox table in the same transaction; a background publisher relays them.",
        alternatives: ["Publish directly after commit (lost-event risk)", "Distributed transaction across DB + broker"],
        consequences: ["+ No lost or phantom events", "+ Survives crashes and failover", "− At-least-once → consumers must be idempotent"] },
      { id: "ADR-004", q: "Why SignalR?", context: "Users need instant status updates without polling.", decision: "Use SignalR (Azure SignalR Service) over WebSockets with user/role groups.",
        alternatives: ["Client polling (latency + load)", "Raw WebSockets (build reconnect/scale yourself)"],
        consequences: ["+ Reconnect, groups, scale-out built in", "+ Integrated auth", "− Another managed service to run"] },
      { id: "ADR-005", q: "Why support both SQL Server and PostgreSQL?", context: "Clients have different licensing and platform preferences.", decision: "Use EF Core with a provider abstraction; Dapper for hot reads; keep migrations provider-neutral.",
        alternatives: ["Single database engine lock-in"],
        consequences: ["+ Client choice & portability", "+ Lower licensing option (PG)", "− Test matrix doubles; avoid engine-specific features"] },
      { id: "ADR-006", q: "Why Azure Functions (alongside Workers)?", context: "Some workloads are spiky and cost-sensitive; others are steady and high-throughput.", decision: "Use Functions for bursty/integration events and Worker Services for the sustained pipeline.",
        alternatives: ["Functions only (cold starts on steady load)", "Workers only (pay for idle burst capacity)"],
        consequences: ["+ Right tool per workload; cost efficiency", "− Two hosting models to operate"] },
      { id: "ADR-007", q: "Why Event Grid?", context: "Some events need broad, cheap, reactive fan-out rather than durable work-queue semantics.", decision: "Use Event Grid for notification/routing; hand durable work to Service Bus.",
        alternatives: ["Service Bus for everything (heavier for pure notifications)"],
        consequences: ["+ Cheap high fan-out; native retry", "− No ordering; not for guaranteed processing"] },
      { id: "ADR-008", q: "Why CQRS?", context: "Read and write models differ in shape, scale and consistency needs.", decision: "Separate commands and queries via MediatR; Dapper for optimised reads.",
        alternatives: ["Traditional CRUD services", "Full event sourcing (higher complexity)"],
        consequences: ["+ Independent read/write optimisation", "+ Clean place for cross-cutting behaviors", "− More classes than plain CRUD"] },
    ]},
  ],
});

/* ---------- 27 Sample Architectures ---------- */
window.SECTIONS.push({
  id: "samples", num: "27", group: "Delivery", label: "Sample Architectures",
  kicker: "Reference Patterns", title: "Client-facing sample architectures",
  sub: "A gallery of the canonical patterns this platform composes — useful for framing options with stakeholders during a workshop.",
  blocks: [
    { type: "tabs", title: "Pick a pattern", tabs: [
      { label: "Layered", blocks: [ { type: "flow", diagramTitle: "Traditional layered", steps: [
        { name: "Angular", tech: "UI", icon: "angular", cat: "client" },
        { name: "API", tech: "controllers", icon: "api", cat: "api", edge: "" },
        { name: "Business Layer", tech: "services", icon: "cog", cat: "app", edge: "" },
        { name: "Repository", tech: "data access", icon: "db", cat: "db", edge: "" },
        { name: "SQL", tech: "database", icon: "db", cat: "db", edge: "" } ]} ]},
      { label: "Event-Driven", blocks: [ { type: "flow", diagramTitle: "Event-driven", steps: [
        { name: "Angular", tech: "UI", icon: "angular", cat: "client" },
        { name: "API", tech: "publish", icon: "api", cat: "api", edge: "" },
        { name: "Service Bus", tech: "topic", icon: "bus", cat: "msg", edge: "", detail: D.servicebus },
        { name: "Consumers", tech: "async processing", icon: "worker", cat: "app", edge: "fan-out" } ]} ]},
      { label: "Saga", blocks: [ { type: "flow", diagramTitle: "Saga", steps: [
        { name: "Audit", tech: "start", icon: "doc", cat: "domain" },
        { name: "Saga", tech: "orchestrate + compensate", icon: "saga", cat: "app", edge: "" },
        { name: "Payment", tech: "KyrePay", icon: "card", cat: "ext", edge: "" },
        { name: "Notification", tech: "SignalR", icon: "signalr", cat: "mon", edge: "" } ]} ]},
      { label: "Outbox", blocks: [ { type: "flow", diagramTitle: "Outbox", steps: [
        { name: "API", tech: "write", icon: "api", cat: "api" },
        { name: "DB + Outbox", tech: "one transaction", icon: "inbox", cat: "db", edge: "" },
        { name: "Publisher", tech: "relay", icon: "worker", cat: "app", edge: "" },
        { name: "Service Bus", tech: "reliable events", icon: "bus", cat: "msg", edge: "", detail: D.servicebus } ]} ]},
      { label: "Real-Time", blocks: [ { type: "flow", diagramTitle: "Real-time", steps: [
        { name: "Backend", tech: "status change", icon: "cog", cat: "app" },
        { name: "SignalR", tech: "hub", icon: "signalr", cat: "mon", edge: "", detail: D.signalr },
        { name: "Angular", tech: "live UI", icon: "angular", cat: "client", edge: "" } ]} ]},
      { label: "3rd-Party", blocks: [ { type: "flow", diagramTitle: "Third-party integration", steps: [
        { name: "Internal API", tech: "request", icon: "api", cat: "api" },
        { name: "KyrePay", tech: "vendor", icon: "card", cat: "ext", edge: "", detail: D.kyrepay },
        { name: "Webhook", tech: "callback", icon: "webhook", cat: "ext", edge: "", detail: D.webhook },
        { name: "Service Bus", tech: "internal event", icon: "bus", cat: "msg", edge: "" },
        { name: "Internal System", tech: "process", icon: "cog", cat: "app", edge: "" } ]} ]},
      { label: "Serverless", blocks: [ { type: "flow", diagramTitle: "Serverless", steps: [
        { name: "Service Bus", tech: "trigger", icon: "bus", cat: "msg" },
        { name: "Azure Function", tech: "elastic", icon: "func", cat: "func", edge: "", detail: D.func },
        { name: "Database", tech: "persist", icon: "db", cat: "db", edge: "" } ]} ]},
      { label: "Hybrid Enterprise", blocks: [ { type: "flow", diagramTitle: "Hybrid on-prem + cloud", steps: [
        { name: "On-Premise Systems", tech: "source of record", icon: "cloud", cat: "ext" },
        { name: "API Gateway", tech: "secure ingress", icon: "gateway", cat: "api", edge: "VPN / ExpressRoute" },
        { name: "Azure", tech: "platform", icon: "cloud", cat: "client", edge: "" },
        { name: "Service Bus", tech: "integration", icon: "bus", cat: "msg", edge: "" },
        { name: "Microservices", tech: "processing", icon: "grid", cat: "func", edge: "" },
        { name: "Database", tech: "cloud data", icon: "db", cat: "db", edge: "" } ]} ]},
    ]},
  ],
});

/* ---------- 28 Microservices vs Modular Monolith ---------- */
window.SECTIONS.push({
  id: "mono-micro", num: "28", group: "Delivery", label: "Microservices vs Monolith",
  kicker: "Evolution", title: "Modular monolith → microservices",
  sub: "A pragmatic position: start as a well-factored modular monolith and extract services only where the business case is proven. A full rewrite is rarely required — and rarely wise.",
  blocks: [
    { type: "vs", title: "Two ends of a spectrum",
      left: { icon: "layers", title: "Modular Monolith", blocks: [
        { type: "featureList", variant: "pros", items: ["One deployable, simple ops", "In-process calls — fast, transactional", "Refactor across modules cheaply", "Clean seams ready to extract"] },
        { type: "featureList", variant: "cons", items: ["Scales as one unit", "Shared failure domain"] },
      ]},
      right: { icon: "grid", title: "Microservices", blocks: [
        { type: "featureList", variant: "pros", items: ["Independent scale & deploy", "Team & failure isolation", "Polyglot where justified"] },
        { type: "featureList", variant: "cons", items: ["Distributed-systems complexity", "Network, data consistency, ops cost", "Premature split = distributed monolith"] },
      ]},
    },
    { type: "flow", title: "Recommended evolution path",
      diagramTitle: "Extract when a module earns it",
      steps: [
        { name: "Monolith", tech: "start simple", icon: "cog", cat: "app" },
        { name: "Modular Monolith", tech: "clean boundaries (this platform)", icon: "layers", cat: "app", edge: "refactor" },
        { name: "Extract high-value modules", tech: "e.g. Payments", icon: "grid", cat: "func", edge: "when proven" },
        { name: "Microservices", tech: "only where justified", icon: "cloud", cat: "client", edge: "incremental" },
      ]},
    { type: "callout", kind: "ok", title: "Why not rewrite?", body: "Because the modular monolith already enforces the boundaries a microservice needs. Extraction becomes a mechanical move (a module already talks via events and interfaces), not a rewrite. You get microservice benefits <b>incrementally, driven by evidence</b> — scale pressure, team topology, or independent release cadence — instead of paying the distributed-systems tax on day one." },
  ],
});

/* ---------- 29 Implementation Roadmap ---------- */
window.SECTIONS.push({
  id: "roadmap", num: "29", group: "Delivery", label: "Implementation Roadmap",
  kicker: "Delivery Plan", title: "Potential delivery roadmap",
  sub: "An indicative, phased delivery plan. Durations are illustrative and refined during Discovery based on scope, team size and priorities.",
  blocks: [
    { type: "timeline", items: [
      { phase: "Phase 1", dur: "2–3 wks", title: "Discovery & Architecture", desc: "Confirm requirements, NFRs, integrations, data model and target Azure landing zone. Produce the agreed architecture and backlog.", chips: ["Workshops", "NFRs", "ADRs", "Landing zone"] },
      { phase: "Phase 2", dur: "2–3 wks", title: "Foundation", desc: "Solution skeleton (Clean Architecture), CI/CD, IaC (Bicep), auth, observability baseline and dev environments.", chips: ["Repo & CI/CD", "Bicep", "OIDC", "App Insights"] },
      { phase: "Phase 3", dur: "3–4 wks", title: "Core APIs & Domain", desc: "Audit transaction domain, CQRS handlers, persistence (SQL/PG), validation and the API surface with tests.", chips: ["CQRS", "EF Core", "Swagger", "Unit tests"] },
      { phase: "Phase 4", dur: "3–4 wks", title: "Messaging & Processing", desc: "Service Bus topology, Outbox, consumers (Functions/Workers), and the payment saga with compensation.", chips: ["Service Bus", "Outbox", "Saga", "Idempotency"] },
      { phase: "Phase 5", dur: "2–3 wks", title: "Payment Integration", desc: "KyrePay client with resilience, secure webhook endpoint, reconciliation and contract tests.", chips: ["Polly", "Webhooks", "HMAC", "Contract tests"] },
      { phase: "Phase 6", dur: "2–3 wks", title: "Real-Time UI", desc: "Angular workflows, dashboards and SignalR live updates with role-aware notifications.", chips: ["Angular", "SignalR", "RBAC UI"] },
      { phase: "Phase 7", dur: "1–2 wks", title: "Observability", desc: "Distributed tracing, dashboards, SLO alerts and DLQ monitoring/replay tooling.", chips: ["Tracing", "Dashboards", "Alerts"] },
      { phase: "Phase 8", dur: "1–2 wks", title: "Security Hardening", desc: "Threat model, pen-test remediation, WAF tuning, secrets review and rate-limit policies.", chips: ["Threat model", "Pen test", "WAF"] },
      { phase: "Phase 9", dur: "1–2 wks", title: "Performance Testing", desc: "Load & soak tests, autoscale tuning, capacity plan against agreed NFRs.", chips: ["Load test", "Autoscale", "Capacity"] },
      { phase: "Phase 10", dur: "1–2 wks", title: "Production Deployment", desc: "Blue/green rollout, DR game day, runbooks, handover and hypercare.", chips: ["Blue/green", "DR drill", "Runbooks", "Hypercare"] },
    ]},
  ],
});

/* ---------- GitHub CI/CD — auto-deploy on merge to main ---------- */
window.SECTIONS.push({
  id: "cicd", group: "Delivery", label: "GitHub CI/CD & Deploy",
  kicker: "Delivery Automation", title: "GitHub controls & automatic deployment",
  sub: "How code reaches production safely: branch protection forces every change through a reviewed, tested pull request; the moment that PR is approved and merged to main, GitHub Actions builds and deploys it automatically — with a manual approval gate in front of production and passwordless auth to Azure.",
  blocks: [
    { type: "flow", title: "From pull request to production", desc: "Merging an approved PR to main emits a push event that triggers the deploy pipeline — no manual step to kick it off.",
      diagramTitle: "PR → CI → merge → CD",
      legend: [ {cat:"client",label:"Developer"},{cat:"api",label:"CI checks"},{cat:"sec",label:"Gate"},{cat:"app",label:"Deploy"},{cat:"db",label:"Azure"} ],
      steps: [
        { name: "Open Pull Request", tech: "feature branch → main", icon: "code", cat: "client" },
        { name: "CI runs automatically", tech: "build · test · scan (required checks)", icon: "cog", cat: "api", edge: "on: pull_request" },
        { name: "Review & approval", tech: "required approvals + CODEOWNERS", icon: "check", cat: "sec", edge: "branch protection" },
        { name: "Merge to main", tech: "squash · auto-merge when green", icon: "check", cat: "sec", edge: "emits push event" },
        { name: "CD pipeline triggers", tech: "GitHub Actions", icon: "rocket", cat: "app", edge: "on: push → main" },
        { name: "Deploy to Staging", tech: "auto · smoke tests", icon: "cloud", cat: "app", edge: "environment: staging" },
        { name: "Production gate", tech: "required reviewer approves", icon: "lock", cat: "sec", edge: "environment: production" },
        { name: "Deploy to Azure", tech: "App Service / AKS · OIDC", icon: "cloud", cat: "db", edge: "passwordless" },
      ]},
    { type: "callout", kind: "info", title: "The trigger, precisely", body: "You can't literally deploy \"on approval\" — approval lets the merge happen, and it's the <b>merge to <code>main</code></b> that fires the deploy. So: branch protection guarantees a PR is <i>approved + green</i> before it can merge; the deploy workflow listens for <code>push</code> to <code>main</code> (or a merged PR) and runs immediately after. Enabling <b>auto-merge</b> makes this hands-off — the PR merges itself the instant the last approval and check pass." },
    { type: "table", title: "Branch protection rules on main (the controls)", head: ["Control", "Setting", "Why"], rows: [
      ["Require a pull request", "On — no direct pushes to main", "Everything is reviewed & tested first"],
      ["Required approvals", "≥ 1–2 reviewers", "Human sign-off before merge"],
      ["Dismiss stale approvals", "On", "New commits re-require review"],
      ["Require review from Code Owners", "On (<code>CODEOWNERS</code>)", "The right people review the right files"],
      ["Required status checks", "<code>build</code>, <code>test</code>, <code>security</code>", "Can't merge unless CI is green"],
      ["Require branches up to date", "On", "Test against the latest main"],
      ["Require conversation resolution", "On", "No unresolved review comments"],
      ["Require linear history", "On (squash merge)", "Clean, revertible history"],
      ["Require signed commits", "On (optional)", "Provenance / tamper-evidence"],
      ["Include administrators", "On", "Rules apply to everyone"],
      ["Restrict who can push", "Deployment identities only", "Least privilege"],
    ]},
    { type: "tabs", title: "The GitHub Actions workflows", tabs: [
      { label: "① CI (on pull request)", blocks: [
        { type: "para", body: "Runs on every PR targeting main. These jobs are the <b>required status checks</b> — the PR cannot be merged until they pass, so broken code never reaches main." },
        { type: "code", lang: "yaml", label: ".github/workflows/ci.yml", code:
"name: CI\non:\n  pull_request:\n    branches: [ main ]\n\njobs:\n  build-test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-dotnet@v4\n        with: { dotnet-version: '8.0.x' }\n      - run: dotnet restore\n      - run: dotnet build --no-restore -c Release\n      - run: dotnet test --no-build -c Release --collect:\"XPlat Code Coverage\"\n\n  security:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: CodeQL analyze\n        uses: github/codeql-action/analyze@v3" },
        { type: "callout", kind: "ok", title: "Wire these as required checks", body: "In branch protection, add <code>build-test</code> and <code>security</code> to <b>Required status checks</b>. Now a red build blocks the merge button automatically." },
      ]},
      { label: "② CD (on merge to main)", blocks: [
        { type: "para", body: "Triggered by the <code>push</code> to main that a merged PR produces. It builds a versioned artifact, deploys to <b>staging</b> automatically, then waits at the <b>production</b> environment gate before releasing." },
        { type: "code", lang: "yaml", label: ".github/workflows/deploy.yml", code:
"name: CD\non:\n  push:\n    branches: [ main ]        # fires right after an approved PR merges\n\npermissions:\n  id-token: write             # OIDC — no stored secrets\n  contents: read\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-dotnet@v4\n        with: { dotnet-version: '8.0.x' }\n      - run: dotnet publish -c Release -o ./publish\n      - uses: actions/upload-artifact@v4\n        with: { name: app, path: ./publish }\n\n  deploy-staging:\n    needs: build\n    runs-on: ubuntu-latest\n    environment: staging          # auto-deploys\n    steps:\n      - uses: actions/download-artifact@v4\n        with: { name: app, path: ./publish }\n      - uses: azure/login@v2\n        with:\n          client-id: ${{ vars.AZURE_CLIENT_ID }}\n          tenant-id: ${{ vars.AZURE_TENANT_ID }}\n          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}\n      - uses: azure/webapps-deploy@v3\n        with: { app-name: assurance-staging, package: ./publish }\n      - run: ./scripts/smoke-test.sh https://assurance-staging.azurewebsites.net\n\n  deploy-production:\n    needs: deploy-staging\n    runs-on: ubuntu-latest\n    environment: production       # <-- manual approval gate lives here\n    steps:\n      - uses: actions/download-artifact@v4\n        with: { name: app, path: ./publish }\n      - uses: azure/login@v2\n        with:\n          client-id: ${{ vars.AZURE_CLIENT_ID }}\n          tenant-id: ${{ vars.AZURE_TENANT_ID }}\n          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}\n      - uses: azure/webapps-deploy@v3\n        with:\n          app-name: assurance-prod\n          slot-name: staging        # deploy to a slot, then swap (blue/green)\n          package: ./publish\n      - run: az webapp deployment slot swap -g rg-assurance \\\n               -n assurance-prod --slot staging --target-slot production" },
      ]},
      { label: "③ Environment gates", blocks: [
        { type: "para", body: "GitHub <b>Environments</b> add deployment protection rules on top of branch protection. The <code>production</code> environment is where you make release itself require a human — even though the merge was already approved." },
        { type: "table", head: ["Environment protection", "Setting", "Effect"], rows: [
          ["Required reviewers", "1–2 approvers", "Deploy job pauses until a reviewer approves the release"],
          ["Wait timer", "e.g. 5 min", "Cooling-off window to cancel a bad release"],
          ["Deployment branches", "<code>main</code> only", "Only main can deploy to production"],
          ["Environment secrets/vars", "scoped per env", "Staging & prod config isolated"],
        ]},
        { type: "callout", kind: "info", title: "Fully automatic vs gated", body: "Leave the production environment with <b>no required reviewers</b> for true continuous deployment (merge → live in minutes). Add a required reviewer for <b>continuous delivery</b> (merge → staged → one-click release). Both are shown above; flip it per your risk appetite." },
      ]},
      { label: "④ Our .NET pipeline (in use)", blocks: [
        { type: "para", body: "The team's <b>actual deployment pipeline</b>. A single workflow triggered by a push to <code>main</code> — i.e. the moment an approved PR merges — builds, tests, publishes and deploys the .NET app to the SIT test server on an Azure VM (IIS), with email alerts on both failure and success." },
        { type: "code", lang: "yaml", label: ".github/workflows/dotnet-cicd.yml", code: [
          "name: .NET CI/CD Pipeline",
          "",
          "on:",
          "  push:",
          "    branches: [ \"main\" ]",
          "",
          "jobs:",
          "  build-and-test:",
          "    runs-on: ubuntu-latest",
          "    steps:",
          "    - name: Checkout Code",
          "      uses: actions/checkout@v4",
          "",
          "    - name: Setup .NET",
          "      uses: actions/setup-dotnet@v4",
          "      with:",
          "        dotnet-version: '8.0'",
          "",
          "    - name: Restore Dependencies",
          "      run: dotnet restore",
          "",
          "    - name: Build Application",
          "      run: dotnet build --configuration Release --no-restore",
          "",
          "    - name: Run Tests",
          "      id: run-tests",
          "      run: dotnet test --configuration Release --no-build --verbosity normal",
          "",
          "    - name: Send Failure Email",
          "      if: failure() && steps.run-tests.outcome == 'failure'",
          "      uses: dawidd6/action-send-mail@v3",
          "      with:",
          "        server_address: ${{ secrets.SMTP_SERVER }}",
          "        server_port: 587",
          "        username: ${{ secrets.SMTP_USERNAME }}",
          "        password: ${{ secrets.SMTP_PASSWORD }}",
          "        subject: \"\u274C GitHub Action Alert: .NET Test Failure\"",
          "        to: \"team-alerts@yourdomain.com\"",
          "        from: \"GitHub Actions <noreply@yourdomain.com>\"",
          "        body: |",
          "          The .NET test execution failed on branch ${{ github.ref_name }}.",
          "          Commit: ${{ github.sha }}",
          "          Author: ${{ github.actor }}",
          "",
          "          View the workflow run logs here:",
          "          ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}",
          "",
          "    - name: Publish Artifacts",
          "      run: dotnet publish -c Release -o ./publish",
          "",
          "    - name: Upload Build Artifact",
          "      uses: actions/upload-artifact@v4",
          "      with:",
          "        name: dotnet-app",
          "        path: ./publish",
          "",
          "  deploy:",
          "    needs: build-and-test",
          "    runs-on: windows-latest",
          "    steps:",
          "    - name: Download Build Artifact",
          "      uses: actions/download-artifact@v4",
          "      with:",
          "        name: dotnet-app",
          "        path: .\\app",
          "",
          "    - name: Deploy to Azure VM IIS via WinRM",
          "      run: |",
          "        $securePassword = ConvertTo-SecureString \"${{ secrets.VM_PASSWORD }}\" -AsPlainText -Force",
          "        $cred = New-Object System.Management.Automation.PSCredential (\"${{ secrets.VM_USERNAME }}\", $securePassword)",
          "        $session = New-PSSession -ComputerName \"${{ secrets.VM_HOST }}\" -Credential $cred -Authentication Negotiate",
          "",
          "        Invoke-Command -Session $session -ScriptBlock {",
          "            Import-Module WebAdministration",
          "            Stop-WebAppPool -Name \"sit-dtp\"",
          "        }",
          "",
          "        Copy-Item -Path \".\\app\\*\" -Destination \"C:\\inetpub\\wwwroot\\sit-dtp\" -Recurse -Force -ToSession $session",
          "",
          "        Invoke-Command -Session $session -ScriptBlock {",
          "            Start-WebAppPool -Name \"sit-dtp\"",
          "        }",
          "",
          "    - name: Send Success Email",
          "      if: success()",
          "      uses: dawidd6/action-send-mail@v3",
          "      with:",
          "        server_address: ${{ secrets.SMTP_SERVER }}",
          "        server_port: 587",
          "        username: ${{ secrets.SMTP_USERNAME }}",
          "        password: ${{ secrets.SMTP_PASSWORD }}",
          "        subject: \"\uD83D\uDE80 GitHub Action Success: Deployment Completed\"",
          "        to: \"team-alerts@yourdomain.com\"",
          "        from: \"GitHub Actions <noreply@yourdomain.com>\"",
          "        body: |",
          "          The application has been successfully deployed to the Azure VM test server!",
          "",
          "          Details:",
          "          - Environment: SIT (Test Server)",
          "          - IIS Path: C:\\inetpub\\wwwroot\\sit-dtp",
          "          - Branch: ${{ github.ref_name }}",
          "          - Deployed By: ${{ github.actor }}",
          "          - Commit: ${{ github.sha }}",
          "",
          "          You can view the execution history here:",
          "          ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}",
        ].join("\n") },
        { type: "callout", kind: "ok", title: "How it maps to the controls", body: "<b>on: push → main</b> makes it auto-deploy the instant an approved PR merges. The <code>deploy</code> job <code>needs: build-and-test</code>, so a red build blocks the release (and emails the team). The build artifact is handed between the Ubuntu build job and the Windows deploy job via <b>upload/download-artifact</b>. Deployment stops the IIS app pool, copies the published files over <b>WinRM</b>, restarts the pool, then emails on success." },
        { type: "callout", kind: "warn", title: "Hardening note", body: "This pipeline authenticates to the VM with a username/password stored in <b>GitHub secrets</b> over WinRM. To harden for production: prefer <b>OIDC federated credentials</b> (no long-lived secrets), add an <b>environment approval gate</b> before the deploy job (tabs ② &amp; ③), and consider an App Service deployment slot with swap for zero-downtime blue/green." },
      ]},
    ]},
    { type: "callout", kind: "ok", title: "Passwordless deploy — OIDC, no stored secrets", body: "The workflows authenticate to Azure with <b>OpenID Connect federated credentials</b> (<code>azure/login</code> + <code>id-token: write</code>) — GitHub presents a short-lived token that Azure trusts for that specific repo/branch/environment. There are <b>no long-lived cloud secrets in GitHub</b>, and the deploy identity is an Entra app/Managed Identity with least-privilege RBAC on only its target resources. Same passwordless model as the app's runtime (see EF Core &amp; Dapper, Key Vault)." },
    { type: "caps", title: "The controls at a glance", cols: 4, items: [
      { icon: "shield", cat: "sec", title: "Protected main", desc: "No direct pushes; PR + approvals + green CI required." },
      { icon: "check", cat: "db", title: "Required checks", desc: "Build, test & security scan gate the merge." },
      { icon: "rocket", cat: "app", title: "Auto-deploy", desc: "Merge to main triggers CD immediately." },
      { icon: "lock", cat: "sec", title: "Prod gate", desc: "Environment reviewer + wait timer before release." },
      { icon: "key", cat: "sec", title: "OIDC auth", desc: "Federated, short-lived tokens — no secrets." },
      { icon: "retry", cat: "ext", title: "Blue/green + rollback", desc: "Slot deploy & swap; revert the merge to roll back." },
      { icon: "cog", cat: "app", title: "Auto-merge", desc: "PR merges itself once approved & checks pass." },
      { icon: "book", cat: "mon", title: "Auditability", desc: "Every deploy tied to a PR, commit & approver." },
    ]},
    { type: "callout", kind: "warn", title: "Rollback strategy", body: "Because history is linear and each release maps to a merge, rollback is either a <b>slot swap back</b> (instant, blue/green) or <b>revert the merge commit</b> — which opens a normal PR that flows through the same protected, tested pipeline. Never hot-fix production outside the pipeline." },
  ],
});

/* ---------- Six Industries, One Platform ---------- */
window.SECTIONS.push({
  id: "industries", group: "Delivery", label: "Eight Industries, One Platform",
  kicker: "Reference Applications", title: "One reference architecture, eight industries",
  sub: "The same enterprise .NET microservices platform — Angular, ASP.NET Core, API Gateway, Service Bus, CQRS, Outbox, Saga, Redis, primary + read replicas — powers wildly different businesses. Each is <b>multi-portal</b> (a customer app plus employee/back-office apps on the same backend). Only the bounded contexts and business flows change; the platform, patterns and cross-cutting concerns are reused.",
  blocks: [
    { type: "callout", kind: "info", title: "The thesis", body: "Pharmacy, ride-hailing, food delivery, employee car-pooling, stock trading, student loans, e-commerce and event ticketing look nothing alike as businesses — yet each is the <b>same reference architecture</b> with different services, portals and sagas. Reuse the platform; specialise the domain." },

    /* ---- Common platform: edge ---- */
    { type: "flow", title: "Common platform — edge to gateway", desc: "Every application shares this front door. Angular talks to the backend two ways: HTTPS REST for request/response, and SignalR/WebSockets for real-time.",
      diagramTitle: "USER → Angular → Front Door → WAF → API Gateway",
      legend: [ {cat:"client",label:"Client / edge"},{cat:"sec",label:"Security"},{cat:"api",label:"Gateway / services"} ],
      steps: [
        { name: "User", tech: "browser / device", icon: "user", cat: "client" },
        { name: "Angular SPA", tech: "REST + SignalR client", icon: "angular", cat: "client", edge: "HTTPS" },
        { name: "Azure Front Door / CDN", tech: "global routing · TLS · caching", icon: "globe", cat: "client", edge: "edge" },
        { name: "WAF", tech: "OWASP protection", icon: "shield", cat: "sec", edge: "filtered" },
        { name: "API Gateway (APIM)", tech: "authN/Z · throttle · versioning", icon: "gateway", cat: "api", edge: "policy", detail: D.gateway },
        { name: "Microservice platform", tech: "13 bounded-context services", icon: "grid", cat: "api", edge: "routed (REST/gRPC)" },
      ]},
    { type: "callout", kind: "ok", title: "Two channels from Angular", body: "<b>REST over HTTPS</b> for normal operations; <b>SignalR / WebSockets</b> for live updates — prescription/order status (Pharmacy), driver location & ride status (Uber), order & delivery tracking (Zomato), ride accept/cancel (Car-pool), order execution & portfolio (Trading), application/approval status (Loan), order & shipment tracking (Amazon), live seat availability (BookMyShow)." },
    { type: "callout", kind: "info", title: "Multi-portal by design — one backend, many personas", body: "Every application ships a <b>customer/user portal</b> and one or more <b>employee / back-office / admin portals</b> — separate Angular apps that call the <b>same microservices and Service Bus</b>. They are separated by <b>OAuth2/OIDC roles and RBAC policies</b>, never by duplicating business logic. A rider and an ops supervisor, a student and a loan officer, a shopper and a seller all hit the same platform through different UIs and permissions. Each industry tab below lists its portals and personas." },

    /* ---- Security controls + CORS vs CSRF ---- */
    { type: "caps", title: "Security controls at the gateway", cols: 4, items: [
      { icon: "key", cat: "sec", title: "OAuth 2.0 / OIDC", desc: "Delegated auth & identity federation." },
      { icon: "lock", cat: "sec", title: "JWT validation", desc: "Signature, issuer, audience, expiry, scopes." },
      { icon: "user", cat: "sec", title: "AuthN & AuthZ", desc: "Authenticate, then policy/role authorize." },
      { icon: "shield", cat: "sec", title: "CORS policy", desc: "Which browser origins may call the API." },
      { icon: "shield", cat: "sec", title: "CSRF protection", desc: "Guards authenticated browser sessions." },
      { icon: "retry", cat: "ext", title: "Rate limiting", desc: "Per-client throttling & abuse protection." },
      { icon: "api", cat: "api", title: "API versioning", desc: "Evolve contracts without breaking clients." },
      { icon: "check", cat: "db", title: "Input validation", desc: "Reject malformed requests at the edge." },
    ]},
    { type: "callout", kind: "warn", title: "CORS ≠ CSRF (two different mechanisms)", body: "<b>CORS</b> controls <i>which browser origins are allowed to call the API</i> — a same-origin-policy relaxation enforced by the browser. <b>CSRF protection</b> stops a malicious site from riding an authenticated user's session to make <i>unauthorized state-changing requests</i> (via anti-forgery tokens / SameSite cookies). They solve different problems and are configured independently — never treat them as the same control." },

    /* ---- Microservice platform ---- */
    { type: "caps", title: "Reusable microservices (bounded contexts)", desc: "Common services composed differently per industry. Each service has API → Application → Domain → Infrastructure layers and owns its own database/schema.", cols: 4, items: [
      { icon: "key", cat: "sec", title: "Identity", desc: "AuthN, tokens, sessions." },
      { icon: "user", cat: "client", title: "Customer / User", desc: "Profiles, preferences." },
      { icon: "signalr", cat: "mon", title: "Notification", desc: "Email, push, SignalR." },
      { icon: "card", cat: "ext", title: "Payment", desc: "Charge, refund, payout." },
      { icon: "doc", cat: "domain", title: "Order", desc: "The core transaction per domain." },
      { icon: "shield", cat: "app", title: "Eligibility", desc: "Insurance, margin, income rules." },
      { icon: "scale", cat: "app", title: "Pricing", desc: "Surge, promos, interest, rebates." },
      { icon: "inbox", cat: "db", title: "Inventory", desc: "Stock, menu, seats, instruments." },
      { icon: "globe", cat: "func", title: "Location", desc: "Matching, tracking, geo." },
      { icon: "book", cat: "sec", title: "Audit", desc: "Immutable trace of actions." },
      { icon: "doc", cat: "domain", title: "Document", desc: "Rx, KYC, contracts." },
      { icon: "saga", cat: "app", title: "Workflow", desc: "Approvals, orchestration." },
    ]},
    { type: "callout", kind: "ok", title: "Database-per-service", body: "There is <b>no single shared database</b>. Each service owns its schema/store, chosen for its needs (SQL Server / PostgreSQL, read replicas, Redis). Services integrate through <b>events on Service Bus</b>, never by reaching into each other's tables." },

    /* ---- Shared building blocks ---- */
    { type: "caps", title: "Shared building blocks (detailed in their own sections)", cols: 4, items: [
      { icon: "code", cat: "app", title: "CQRS", desc: "Command/write vs query/read models." },
      { icon: "bus", cat: "msg", title: "Service Bus (EDA)", desc: "Topics, subscriptions, DLQ." },
      { icon: "inbox", cat: "db", title: "Outbox", desc: "Atomic write + reliable publish." },
      { icon: "saga", cat: "app", title: "Saga", desc: "Distributed transactions + compensation." },
      { icon: "cache", cat: "mon", title: "Redis", desc: "Cache-aside, TTL, rate limits, locks." },
      { icon: "db", cat: "db", title: "Primary + replicas", desc: "Writes → primary; reads → replicas." },
      { icon: "domain", cat: "domain", title: "DDD · Clean · Hexagonal · Onion", desc: "Domain at the core; adapters outside." },
      { icon: "retry", cat: "ext", title: "Resilience", desc: "Retry, circuit breaker, timeout, bulkhead." },
      { icon: "monitor", cat: "mon", title: "Observability", desc: "Tracing, central logs, App Insights, alerts." },
      { icon: "key", cat: "sec", title: "Secrets & crypto", desc: "Key Vault, TLS, encryption at rest." },
      { icon: "check", cat: "db", title: "Idempotency", desc: "Safe retries; no double processing." },
      { icon: "scale", cat: "app", title: "HA & scale-out", desc: "Horizontal scale, replication, zones." },
    ]},
    { type: "callout", kind: "info", title: "The reusable CQRS + Outbox + Saga loop", body: "For every domain: <b>Angular → Command API → Command Handler → Domain → Write DB</b>, then <b>Outbox → Service Bus → Event Consumer → Read Model (Read DB / Redis)</b>. Commands modify state, queries read optimised state, events propagate change asynchronously. Multi-step, cross-service transactions run as <b>Sagas</b> with compensations. This exact loop repeats across all six applications below." },

    /* ---- The six industries ---- */
    { type: "tabs", title: "The same platform, eight domains", tabs: [
      { label: "① Pharmacy", blocks: [
        { type: "para", body: "Prescription fulfilment: verify insurance eligibility, reserve drug stock, capture payment, dispense and notify — with order status pushed live to the patient." },
        { type: "table", title: "Portals & personas", head: ["Portal", "Persona", "What they do"], rows: [
          ["Patient portal", "Patient", "Order prescriptions, track status, pay co-pay"],
          ["Pharmacy portal", "Pharmacist", "Verify Rx, dispense, manage fulfilment"],
          ["Inventory portal", "Stock manager", "Manage drug stock, replenishment, expiry"],
          ["Billing portal", "Finance / Payments", "Co-pay, insurance claims, reconciliation"],
          ["Admin console", "Supervisor", "Users, roles, audit, reports"],
        ]},
        { type: "flow", diagramTitle: "Prescription fulfilment", steps: [
          { name: "Patient", tech: "portal", icon: "user", cat: "client" },
          { name: "Angular Pharmacy Portal", tech: "REST + SignalR", icon: "angular", cat: "client", edge: "HTTPS" },
          { name: "API Gateway", tech: "authN/Z", icon: "gateway", cat: "api", edge: "" },
          { name: "Prescription Service", tech: "Order context", icon: "doc", cat: "domain", edge: "command" },
          { edge: "saga steps", parallel: [
            { name: "Eligibility", tech: "insurance", icon: "shield", cat: "app" },
            { name: "Inventory", tech: "drug stock", icon: "inbox", cat: "db" },
            { name: "Payment", tech: "co-pay", icon: "card", cat: "ext" },
          ]},
          { name: "Notification → SignalR", tech: "order status", icon: "signalr", cat: "mon", edge: "live update" },
        ]},
        { type: "table", head: ["Concern", "How the platform handles it"], rows: [
          ["Real-time (SignalR)", "Prescription & order status pushed to the patient portal"],
          ["Strong consistency (primary)", "Stock decrement & payment capture write to the primary DB"],
          ["Redis cache", "Drug / product catalogue lookup (cache-aside + TTL)"],
          ["Key services", "Prescription (Order), Eligibility, Inventory, Payment, Document (Rx), Notification"],
          ["Saga — forward", "Create Rx order → verify insurance → reserve stock → capture payment → dispense → notify"],
          ["Saga — compensation", "Release stock → refund → cancel order → notify"],
          ["Boomi / scheduled", "Nightly insurance-claim submission & reconciliation; supplier stock replenishment feeds"],
        ]},
      ]},
      { label: "② Uber (Ride)", blocks: [
        { type: "para", body: "Ride booking: match a nearby driver, price the trip (with surge), run the trip with live location, then capture the fare." },
        { type: "table", title: "Portals & personas", head: ["Portal", "Persona", "What they do"], rows: [
          ["Rider app", "User (rider)", "Book rides, track driver, pay"],
          ["Driver app", "Driver", "Accept trips, navigate, view earnings"],
          ["Ops console", "Supervisor / Admin", "Monitor rides, disputes, driver onboarding, payouts"],
        ]},
        { type: "flow", diagramTitle: "Ride booking", steps: [
          { name: "Rider", tech: "app", icon: "user", cat: "client" },
          { name: "Angular Ride App", tech: "WebSockets", icon: "angular", cat: "client", edge: "HTTPS" },
          { name: "API Gateway", tech: "authN/Z", icon: "gateway", cat: "api", edge: "" },
          { name: "Ride / Trip Service", tech: "Order context", icon: "flow", cat: "domain", edge: "command" },
          { edge: "saga steps", parallel: [
            { name: "Location", tech: "driver matching", icon: "globe", cat: "func" },
            { name: "Pricing", tech: "surge", icon: "scale", cat: "app" },
            { name: "Payment", tech: "fare", icon: "card", cat: "ext" },
          ]},
          { name: "Notification → WebSocket", tech: "driver location / status", icon: "signalr", cat: "mon", edge: "live" },
        ]},
        { type: "table", head: ["Concern", "How the platform handles it"], rows: [
          ["Real-time (WebSockets)", "Live driver location & ride status to the rider and driver"],
          ["Strong consistency (primary)", "Trip state transitions & fare capture write to the primary DB"],
          ["Redis cache", "Driver availability & geo-index; surge reference data"],
          ["Key services", "Ride/Trip (Order), Location (matching), Pricing (surge), Payment, Notification"],
          ["Saga — forward", "Request ride → match driver → start trip → end trip → capture fare"],
          ["Saga — compensation", "Cancel match → void/refund → notify both parties"],
          ["Boomi / scheduled", "Driver payout batch settlement; partner/maps data sync"],
        ]},
      ]},
      { label: "③ Zomato (Food)", blocks: [
        { type: "para", body: "Food ordering: confirm the restaurant, capture payment, assign delivery and track it live." },
        { type: "table", title: "Portals & personas", head: ["Portal", "Persona", "What they do"], rows: [
          ["Customer app", "Diner", "Browse, order, track delivery"],
          ["Restaurant portal", "Restaurant partner", "Manage menu & availability, accept orders"],
          ["Delivery app", "Delivery partner", "Accept & complete deliveries"],
          ["Ops console", "Admin / Ops", "Onboarding, disputes, settlement"],
        ]},
        { type: "flow", diagramTitle: "Food ordering", steps: [
          { name: "Customer", tech: "app", icon: "user", cat: "client" },
          { name: "Angular Food App", tech: "REST + SignalR", icon: "angular", cat: "client", edge: "HTTPS" },
          { name: "API Gateway", tech: "authN/Z", icon: "gateway", cat: "api", edge: "" },
          { name: "Order Service", tech: "Order context", icon: "doc", cat: "domain", edge: "command" },
          { edge: "saga steps", parallel: [
            { name: "Inventory", tech: "menu / restaurant", icon: "inbox", cat: "db" },
            { name: "Payment", tech: "checkout", icon: "card", cat: "ext" },
            { name: "Location", tech: "delivery", icon: "globe", cat: "func" },
          ]},
          { name: "Notification → SignalR", tech: "order & delivery tracking", icon: "signalr", cat: "mon", edge: "live" },
        ]},
        { type: "table", head: ["Concern", "How the platform handles it"], rows: [
          ["Real-time (SignalR)", "Order status & live delivery tracking"],
          ["Strong consistency (primary)", "Order placement & payment write to the primary DB"],
          ["Redis cache", "Restaurant & menu availability (cache-aside + TTL)"],
          ["Key services", "Order, Inventory (menu), Pricing (promos), Payment, Location (delivery), Notification"],
          ["Saga — forward", "Place order → confirm restaurant → capture payment → assign delivery → deliver"],
          ["Saga — compensation", "Cancel order → refund → reassign / notify"],
          ["Boomi / scheduled", "Restaurant catalogue import; settlement & payout reconciliation"],
        ]},
      ]},
      { label: "④ Car-Pooling", blocks: [
        { type: "para", body: "Employee car-pooling: match riders to an offered ride, confirm a seat without overbooking, and notify on accept/cancel. Typically settled with internal credits, not card payments." },
        { type: "table", title: "Portals & personas", head: ["Portal", "Persona", "What they do"], rows: [
          ["Employee app", "Employee (rider &amp; driver)", "Offer / join rides, accept / cancel"],
          ["HR / Admin portal", "HR / Admin", "Policy, cost centres, credits, reporting"],
        ]},
        { type: "flow", diagramTitle: "Employee car-pool", steps: [
          { name: "Employee", tech: "portal", icon: "user", cat: "client" },
          { name: "Angular Car-Pool App", tech: "REST + SignalR", icon: "angular", cat: "client", edge: "HTTPS" },
          { name: "API Gateway", tech: "authN/Z", icon: "gateway", cat: "api", edge: "" },
          { name: "Carpool / Ride Service", tech: "Order context", icon: "flow", cat: "domain", edge: "command" },
          { edge: "saga steps", parallel: [
            { name: "Location", tech: "route matching", icon: "globe", cat: "func" },
            { name: "Customer/User", tech: "employees", icon: "user", cat: "client" },
          ]},
          { name: "Notification → SignalR", tech: "accept / cancel", icon: "signalr", cat: "mon", edge: "live" },
        ]},
        { type: "table", head: ["Concern", "How the platform handles it"], rows: [
          ["Real-time (SignalR)", "Ride acceptance & cancellation notifications"],
          ["Strong consistency (primary)", "Seat booking (no overbooking) writes to the primary DB"],
          ["Redis cache", "Available rides & seat-availability index"],
          ["Key services", "Carpool (Ride), Location (matching), Customer/User, Notification"],
          ["Saga — forward", "Offer ride / request seat → match → confirm seat → complete trip"],
          ["Saga — compensation", "Release seat → notify affected riders"],
          ["Boomi / scheduled", "HR / employee-directory sync; cost-centre / credits posting"],
        ]},
      ]},
      { label: "⑤ Zerodha (Trading)", blocks: [
        { type: "callout", kind: "warn", title: "Strong consistency is non-negotiable here", body: "Order placement, execution, holdings and funds are money-movement — they read and write the <b>primary</b> only (never a lagging replica), guarded by <b>idempotent order IDs</b> so a retry can never double-execute. Redis holds market <i>reference</i> data, never the source of truth for prices or positions." },
        { type: "table", title: "Portals & personas", head: ["Portal", "Persona", "What they do"], rows: [
          ["Trader portal", "Trader (user)", "Place orders, view portfolio & P&L"],
          ["Back-office portal", "Compliance / Risk analyst", "Surveillance, margin, settlement, reporting"],
          ["Admin console", "Admin", "KYC onboarding, roles, limits"],
        ]},
        { type: "flow", diagramTitle: "Stock trading", steps: [
          { name: "Trader", tech: "terminal", icon: "user", cat: "client" },
          { name: "Angular Trading App", tech: "WebSockets", icon: "angular", cat: "client", edge: "HTTPS" },
          { name: "API Gateway", tech: "authN/Z", icon: "gateway", cat: "api", edge: "" },
          { name: "Order Management", tech: "Order context", icon: "monitor", cat: "domain", edge: "command (idempotent)" },
          { edge: "saga steps", parallel: [
            { name: "Risk / Eligibility", tech: "margin check", icon: "shield", cat: "app" },
            { name: "Market Data", tech: "Redis reference", icon: "cache", cat: "mon" },
            { name: "Portfolio", tech: "holdings", icon: "db", cat: "db" },
          ]},
          { name: "Notification → WebSocket", tech: "execution / P&L", icon: "signalr", cat: "mon", edge: "live" },
        ]},
        { type: "table", head: ["Concern", "How the platform handles it"], rows: [
          ["Real-time (WebSockets)", "Order execution & portfolio / P&L updates (low latency)"],
          ["Strong consistency (primary)", "Order, execution, holdings & funds — <b>primary only</b>; idempotent order IDs"],
          ["Redis cache", "Market / instrument reference data & watchlists (not the source of truth)"],
          ["Key services", "Order Management, Risk/Eligibility (margin), Market-data/Pricing, Portfolio, Payment (funds), Notification"],
          ["Saga — forward", "Place order → risk / margin check → execute → settle → update portfolio"],
          ["Saga — compensation", "Reject / cancel order → reverse ledger → notify"],
          ["Boomi / scheduled", "End-of-day settlement, exchange reconciliation, regulatory reporting"],
        ]},
      ]},
      { label: "⑥ Student Loan", blocks: [
        { type: "para", body: "Loan lifecycle: verify income eligibility, price interest with rebates, run the approval workflow, disburse funds and schedule repayment — with status pushed to the applicant." },
        { type: "table", title: "Portals & personas", head: ["Portal", "Persona", "What they do"], rows: [
          ["Student portal", "Student", "Apply, upload documents, track status, repay"],
          ["Loan officer portal", "Bank employee", "Process applications, disburse, manage repayment"],
          ["Analyst portal", "Credit / eligibility analyst", "Income eligibility, risk scoring, rebate rules"],
          ["Admin console", "Admin", "Loan products, policy, audit, reports"],
        ]},
        { type: "flow", diagramTitle: "Student loan", steps: [
          { name: "Student", tech: "portal", icon: "user", cat: "client" },
          { name: "Angular Loan Portal", tech: "REST + SignalR", icon: "angular", cat: "client", edge: "HTTPS" },
          { name: "API Gateway", tech: "authN/Z", icon: "gateway", cat: "api", edge: "" },
          { name: "Loan Application Service", tech: "Order context", icon: "book", cat: "domain", edge: "command" },
          { edge: "saga steps", parallel: [
            { name: "Eligibility", tech: "income check", icon: "shield", cat: "app" },
            { name: "Pricing", tech: "interest / rebates", icon: "scale", cat: "app" },
            { name: "Workflow", tech: "approval", icon: "saga", cat: "app" },
            { name: "Payment", tech: "disbursement", icon: "card", cat: "ext" },
          ]},
          { name: "Notification → SignalR", tech: "application / approval status", icon: "signalr", cat: "mon", edge: "live" },
        ]},
        { type: "table", head: ["Concern", "How the platform handles it"], rows: [
          ["Real-time (SignalR)", "Application status & approval notifications"],
          ["Strong consistency (primary)", "Disbursement & repayment postings write to the primary DB"],
          ["Redis cache", "Eligibility rules & rebate / interest reference tables"],
          ["Key services", "Loan Application (Order), Eligibility (income), Pricing (interest/rebates), Workflow (approval), Document (KYC), Payment, Notification"],
          ["Saga — forward", "Submit application → verify income & eligibility → approve → disburse → schedule repayment"],
          ["Saga — compensation", "Reject / reverse disbursement → cancel schedule → notify"],
          ["Boomi / scheduled", "Scheduled repayment collection (direct debit), income / credit-bureau verification, disbursement bank-file generation"],
        ]},
      ]},
      { label: "⑦ Amazon (E-commerce)", blocks: [
        { type: "para", body: "E-commerce: browse a huge catalogue, reserve inventory, capture payment, fulfil from a warehouse and ship — with live order & shipment tracking. Sellers and warehouse ops run on the same platform through their own portals." },
        { type: "table", title: "Portals & personas", head: ["Portal", "Persona", "What they do"], rows: [
          ["Shopping app", "Shopper", "Browse, order, track shipment, returns"],
          ["Seller portal", "Seller / Vendor", "List products, manage inventory & pricing, fulfilment"],
          ["Warehouse app", "Ops / Picker", "Pick, pack, ship, stock counts"],
          ["Admin console", "Category manager / Admin", "Catalogue, promotions, disputes"],
        ]},
        { type: "flow", diagramTitle: "E-commerce order", steps: [
          { name: "Shopper", tech: "app", icon: "user", cat: "client" },
          { name: "Angular Shopping App", tech: "REST + SignalR", icon: "angular", cat: "client", edge: "HTTPS" },
          { name: "API Gateway", tech: "authN/Z", icon: "gateway", cat: "api", edge: "" },
          { name: "Order Service", tech: "Order context", icon: "doc", cat: "domain", edge: "command" },
          { edge: "saga steps", parallel: [
            { name: "Inventory", tech: "catalogue / stock", icon: "inbox", cat: "db" },
            { name: "Pricing", tech: "deals / promos", icon: "scale", cat: "app" },
            { name: "Payment", tech: "checkout", icon: "card", cat: "ext" },
          ]},
          { name: "Fulfilment → Location", tech: "warehouse → delivery", icon: "globe", cat: "func", edge: "ship" },
          { name: "Notification → SignalR", tech: "order & shipment tracking", icon: "signalr", cat: "mon", edge: "live" },
        ]},
        { type: "table", head: ["Concern", "How the platform handles it"], rows: [
          ["Real-time (SignalR)", "Order & shipment tracking; price / deal updates"],
          ["Strong consistency (primary)", "Inventory reservation, order & payment write to the primary DB"],
          ["Redis cache", "Product catalogue, search facets, session cart"],
          ["Key services", "Order, Inventory (catalogue/stock), Pricing (deals), Payment, Location (delivery), Document (invoice), Notification"],
          ["Saga — forward", "Place order → reserve inventory → capture payment → fulfil (warehouse) → ship → deliver"],
          ["Saga — compensation", "Release inventory → refund → cancel order → notify"],
          ["Boomi / scheduled", "Seller catalogue import, settlement / payout, ERP & tax integration"],
        ]},
      ]},
      { label: "⑧ BookMyShow (Ticketing)", blocks: [
        { type: "para", body: "Event & movie ticketing: shows are discovered <b>by location</b>, seat availability updates live as others book, and seats are held with a distributed lock so two people can never buy the same seat." },
        { type: "callout", kind: "warn", title: "Geo-aware availability + no double-booking", body: "The <b>Location</b> service filters shows and venues by the user's city/geo, so <b>availability adjusts per location</b>. Seat selection takes a <b>Redis distributed lock with a TTL</b> (a temporary hold); the confirmed reservation and payment write to the <b>primary</b> under an <b>idempotency key</b> — so concurrent buyers and retries can never double-book a seat." },
        { type: "table", title: "Portals & personas", head: ["Portal", "Persona", "What they do"], rows: [
          ["Booking app", "Movie / event-goer", "Browse by location, pick seats, pay, get tickets"],
          ["Organizer portal", "Venue / Event organizer", "Create shows, seat maps, pricing, availability"],
          ["Admin / Ops console", "Admin", "Onboarding, settlement, content moderation"],
        ]},
        { type: "flow", diagramTitle: "Seat booking (geo-aware)", steps: [
          { name: "Customer", tech: "app", icon: "user", cat: "client" },
          { name: "Angular Booking App", tech: "REST + SignalR", icon: "angular", cat: "client", edge: "HTTPS" },
          { name: "API Gateway", tech: "authN/Z", icon: "gateway", cat: "api", edge: "" },
          { name: "Location Service", tech: "shows near me (geo)", icon: "globe", cat: "func", edge: "filter by city" },
          { name: "Booking Service", tech: "Order context", icon: "doc", cat: "domain", edge: "command" },
          { edge: "saga steps", parallel: [
            { name: "Inventory (Seats)", tech: "availability", icon: "inbox", cat: "db" },
            { name: "Redis lock (hold)", tech: "seat hold · TTL", icon: "cache", cat: "mon" },
            { name: "Payment", tech: "checkout", icon: "card", cat: "ext" },
          ]},
          { name: "Notification → SignalR", tech: "live seat availability", icon: "signalr", cat: "mon", edge: "live" },
        ]},
        { type: "table", head: ["Concern", "How the platform handles it"], rows: [
          ["Real-time (SignalR)", "Live seat availability — seats grey out as others select them"],
          ["Geo / location", "Location service filters shows & venues by city; <b>availability adjusts per location</b>"],
          ["Strong consistency (primary)", "Seat reservation & payment → primary; <b>distributed lock + idempotency</b> prevent double-booking"],
          ["Redis cache", "Event & showtime catalogue per city; seat-hold locks with TTL"],
          ["Key services", "Booking (Order), Location (geo), Inventory (seats), Pricing, Payment, Document (tickets), Notification"],
          ["Saga — forward", "Select seats → hold (lock, TTL) → capture payment → confirm booking → issue tickets"],
          ["Saga — compensation", "Release held seats → refund → cancel booking → notify"],
          ["Boomi / scheduled", "Venue / partner catalogue sync, settlement & reconciliation"],
        ]},
      ]},
    ]},
    { type: "callout", kind: "ok", title: "What this proves", body: "Eight businesses, one platform. The edge, security, multi-portal model, microservice shape, CQRS + Outbox + Saga loop, Redis, replicas and cross-cutting concerns are <b>identical and reused</b>. Each application differs only in its <b>bounded contexts, portals & personas, saga steps, consistency requirements and real-time channel</b> — which is exactly the payoff of a domain-driven, event-driven reference architecture." },
  ],
});

/* ---------- 30 Why This Architecture ---------- */
window.SECTIONS.push({
  id: "why", num: "30", group: "Delivery", label: "Why This Architecture",
  kicker: "The Close", title: "Why this architecture",
  sub: "Measurable architecture outcomes — not marketing claims. Each maps directly to a section of this showcase you can drill into.",
  blocks: [
    { type: "caps", title: "Outcomes delivered", cols: 3, items: [
      { icon: "bolt", cat: "msg", title: "Decoupled processing", desc: "Producers and consumers evolve independently." },
      { icon: "scale", cat: "app", title: "Independent scaling", desc: "Each tier scales to its own load profile." },
      { icon: "check", cat: "db", title: "Reliable async work", desc: "Outbox + at-least-once + idempotency = no lost work." },
      { icon: "signalr", cat: "mon", title: "Real-time UX", desc: "Users see status the instant it changes." },
      { icon: "shield", cat: "sec", title: "Secure by design", desc: "OIDC, RBAC, Key Vault, WAF, audit trail." },
      { icon: "webhook", cat: "ext", title: "Integration isolation", desc: "Third parties behind resilient anti-corruption layers." },
      { icon: "book", cat: "domain", title: "Traceability", desc: "One correlation ID across the whole journey." },
      { icon: "retry", cat: "ext", title: "Failure recovery", desc: "Retries, breakers, DLQ, saga compensation." },
      { icon: "grid", cat: "func", title: "Extensibility", desc: "Add a subscriber without touching producers." },
    ]},
    { type: "twoCol", cols: [
      { type: "featureList", title: "The story, end to end", variant: "pros", items: [
        "<b>Business problem</b> → high-volume assurance processing",
        "<b>Proposed architecture</b> → event-driven, cloud-native",
        "<b>Why</b> → decoupling, reliability, scale, security",
        "<b>How data flows</b> → animated end-to-end sequence",
        "<b>How failures are handled</b> → resilience toolkit",
        "<b>How it scales</b> → queue-based load leveling",
        "<b>Real-time</b> → SignalR to the user",
        "<b>Third parties</b> → KyrePay, webhooks, isolation",
        "<b>How it evolves</b> → modular monolith → microservices" ]},
      { type: "kpis", cols: 2, items: [
        { val: "43", label: "Architecture sections", note: "in this showcase" },
        { val: "8", label: "ADRs documented", note: "decisions with rationale" },
        { val: "18+", label: "Design patterns", note: "applied deliberately" },
        { val: "10", label: "Delivery phases", note: "indicative roadmap" },
      ]},
    ]},
    { type: "callout", kind: "ok", title: "Where we go next", body: "This showcase is the architecture we would deliver for your organisation. The natural next step is a <b>Discovery &amp; Architecture workshop</b> (Phase 1) to turn these patterns into a concrete, costed plan against your real volumes, integrations and compliance requirements." },
    { type: "callout", kind: "info", title: "A note on the numbers", body: "All metrics and targets in this showcase are <b>illustrative architecture targets</b> for demonstration. They are not guarantees — real SLOs are agreed with you and configured to your requirements." },
  ],
});
