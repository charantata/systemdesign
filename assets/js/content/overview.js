/* ============================================================
   Content — Overview group + shared component detail library
   ============================================================ */
window.SECTIONS = window.SECTIONS || [];

/* Shared detail objects for interactive diagram nodes (drawer) */
window.DETAILS = {
  angular: {
    kicker: "Client Layer", title: "Angular Application",
    sections: [
      { h: "Role", p: "Single-page enterprise UI built with Angular, TypeScript and Angular Material. Talks to the platform over HTTPS REST APIs and a persistent SignalR WebSocket for live updates." },
      { h: "Responsibilities", list: ["Acquire and attach JWT bearer tokens (OIDC)", "Render role-aware dashboards and workflows", "Optimistic UI + real-time status via SignalR", "Correlation-ID propagation for traceability"] },
      { h: "Scaling", p: "Static assets served from a CDN / Azure Front Door; the app is stateless, so scale is a caching and edge concern, not a compute one." },
    ],
  },
  gateway: {
    kicker: "Edge", title: "API Gateway / APIM",
    sections: [
      { h: "Role", p: "Azure API Management fronts every API. It is the single, policy-enforced entry point into the platform." },
      { h: "Responsibilities", list: ["JWT validation & OAuth2 scope checks", "Rate limiting and throttling per subscription", "Request/response transformation & versioning", "Central logging, correlation-ID injection, WAF integration"] },
    ],
  },
  api: {
    kicker: "API Layer", title: "ASP.NET Core Web API",
    sections: [
      { h: "Role", p: "Stateless ASP.NET Core APIs implementing Clean Architecture with CQRS via MediatR. Thin controllers delegate to application handlers." },
      { h: "Responsibilities", list: ["Authentication middleware + policy-based RBAC", "Command / Query dispatch (CQRS)", "Validation (FluentValidation) & mapping", "Transactional writes + Outbox enqueue"] },
      { h: "Sample controller", lang: "csharp", label: "AuditController.cs", code:
"[ApiController]\n[Route(\"api/audit\")]\n[Authorize]\npublic class AuditController : ControllerBase\n{\n    private readonly IMediator _mediator;\n    public AuditController(IMediator mediator) => _mediator = mediator;\n\n    [HttpPost]\n    [Authorize(Policy = \"CanCreateAudit\")]\n    public async Task<IActionResult> Create(\n        [FromBody] CreateAuditCommand cmd,\n        [FromHeader(Name = \"Idempotency-Key\")] string key,\n        CancellationToken ct)\n    {\n        var id = await _mediator.Send(cmd with { IdempotencyKey = key }, ct);\n        return CreatedAtAction(nameof(GetById), new { id }, id);\n    }\n}" },
    ],
  },
  servicebus: {
    kicker: "Messaging", title: "Azure Service Bus",
    sections: [
      { h: "Why it is used", p: "Reliable, ordered, at-least-once business messaging that decouples the API from processing. It absorbs load spikes (queue-based load leveling) and guarantees no work is lost if a consumer is down." },
      { h: "Topology", list: ["<b>Topic</b> <code>audit-events</code> — one publisher, many subscribers", "<b>Subscriptions</b> with SQL filter rules per consumer", "<b>Sessions</b> for per-transaction ordering", "<b>Dead-letter queue</b> for poison messages", "Exponential retry with max-delivery-count"] },
      { h: "Message envelope", lang: "json", label: "message.json", code:
"{\n  \"messageId\": \"e2b1...\",\n  \"correlationId\": \"c-8842\",\n  \"causationId\": \"c-8841\",\n  \"eventType\": \"PaymentInitiated\",\n  \"transactionId\": \"AUD-10293\",\n  \"timestamp\": \"2026-09-26T10:14:02Z\",\n  \"payload\": { \"amount\": 4200.00, \"currency\": \"USD\" }\n}" },
      { h: "Publisher", lang: "csharp", label: "ServiceBusPublisher.cs", code:
"public async Task PublishAsync(IntegrationEvent evt, CancellationToken ct)\n{\n    var msg = new ServiceBusMessage(JsonSerializer.SerializeToUtf8Bytes(evt))\n    {\n        MessageId     = evt.MessageId,        // dedup window\n        CorrelationId = evt.CorrelationId,\n        Subject       = evt.EventType,\n        SessionId     = evt.TransactionId,     // ordering\n        ContentType   = \"application/json\"\n    };\n    await _sender.SendMessageAsync(msg, ct);\n}" },
    ],
  },
  func: {
    kicker: "Serverless", title: "Azure Functions",
    sections: [
      { h: "Role", p: "Event-driven, elastically-scaled consumers for integration and burst workloads. Service Bus and Event Grid triggers scale to zero when idle and fan out under load." },
      { h: "When to use", list: ["Spiky / unpredictable throughput", "Lightweight integration & transformation", "Event notification handling from Event Grid", "Cost-efficient scale-to-zero workloads"] },
      { h: "Service Bus-triggered function", lang: "csharp", label: "PaymentFunction.cs", code:
"[Function(\"ProcessPayment\")]\npublic async Task Run(\n    [ServiceBusTrigger(\"audit-events\", \"payment-sub\",\n        Connection = \"Sb\")] ServiceBusReceivedMessage msg,\n    ServiceBusMessageActions actions,\n    CancellationToken ct)\n{\n    try\n    {\n        var evt = msg.Body.ToObjectFromJson<PaymentInitiated>();\n        await _payments.ProcessAsync(evt, ct);\n        await actions.CompleteMessageAsync(msg, ct);\n    }\n    catch (TransientException)\n    {\n        await actions.AbandonMessageAsync(msg, ct); // retry\n    }\n    catch (Exception ex)\n    {\n        await actions.DeadLetterMessageAsync(msg, ex.Message, ct);\n    }\n}" },
    ],
  },
  eventgrid: {
    kicker: "Eventing", title: "Azure Event Grid",
    sections: [
      { h: "Role", p: "High-fan-out event notification and routing. Distributes lightweight 'something happened' events to many subscribers (functions, webhooks, queues) with built-in retry." },
      { h: "Event Grid vs Service Bus", table: {
        head: ["Aspect", "Event Grid", "Service Bus"],
        rows: [["Model", "Event notification / reactive", "Reliable command & work queue"], ["Payload", "Small, 'it happened'", "Business message w/ state"], ["Ordering", "No", "Sessions (FIFO)"], ["Best for", "Integration & resource events", "Guaranteed processing"]] } },
    ],
  },
  signalr: {
    kicker: "Real-Time", title: "SignalR Hub",
    sections: [
      { h: "Role", p: "Pushes live transaction-status changes to the exact user, role group or tenant over WebSockets, so the Angular UI updates the instant backend state changes." },
      { h: "Responsibilities", list: ["Per-user & per-role group targeting", "Automatic reconnection & backplane via Azure SignalR Service", "Correlation-scoped notifications", "Scale-out across many API instances"] },
      { h: "Hub", lang: "csharp", label: "NotificationHub.cs", code:
"[Authorize]\npublic class NotificationHub : Hub\n{\n    public override async Task OnConnectedAsync()\n    {\n        var user = Context.UserIdentifier!;\n        await Groups.AddToGroupAsync(Context.ConnectionId, $\"u:{user}\");\n        var role = Context.User!.FindFirst(ClaimTypes.Role)?.Value;\n        if (role is not null)\n            await Groups.AddToGroupAsync(Context.ConnectionId, $\"r:{role}\");\n        await base.OnConnectedAsync();\n    }\n}" },
      { h: "Angular client", lang: "typescript", label: "signalr.service.ts", code:
"connection.on('TransactionStatusChanged', (evt) => {\n  this.store.update(evt.transactionId, evt.status);\n});" },
    ],
  },
  kyrepay: {
    kicker: "External System", title: "KyrePay (payment vendor)",
    sections: [
      { h: "What it is", p: "A fictional third-party payment & communication provider used to demonstrate secure external integration. It is called synchronously to create payments and responds asynchronously via signed webhooks." },
      { h: "Integration concerns", list: ["API-key + request signature (HMAC) auth", "<b>Idempotency-Key</b> to prevent duplicate charges", "Timeouts + Polly retry with circuit breaker", "Asynchronous webhook callbacks (not polling)", "Duplicate & out-of-order webhook handling"] },
      { h: "Resilient client", lang: "csharp", label: "KyrePayClient.cs", code:
"services.AddHttpClient<IKyrePayClient, KyrePayClient>(c =>\n{\n    c.BaseAddress = new Uri(cfg[\"KyrePay:BaseUrl\"]!);\n    c.Timeout = TimeSpan.FromSeconds(8);\n})\n.AddPolicyHandler(HttpPolicyExtensions\n    .HandleTransientHttpError()\n    .WaitAndRetryAsync(3, a => TimeSpan.FromSeconds(Math.Pow(2, a))))\n.AddPolicyHandler(HttpPolicyExtensions\n    .HandleTransientHttpError()\n    .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)));" },
    ],
  },
  webhook: {
    kicker: "Integration", title: "Webhook API",
    sections: [
      { h: "Role", p: "Receives asynchronous payment callbacks from KyrePay. It validates, de-duplicates and immediately hands off to Service Bus — never doing long-running work inside the request." },
      { h: "Validation pipeline", list: ["1. Verify HMAC signature", "2. Check timestamp freshness (replay guard)", "3. Idempotency check (WebhookEvent table)", "4. Confirm transaction exists", "5. Persist event, publish to bus, return 200"] },
      { h: "Handler", lang: "csharp", label: "WebhookController.cs", code:
"[HttpPost(\"webhooks/payment\")]\n[AllowAnonymous]\npublic async Task<IActionResult> Payment(\n    [FromBody] KyrePayCallback body,\n    [FromHeader(Name = \"X-Kyre-Signature\")] string sig)\n{\n    if (!_verifier.IsValid(body.Raw, sig)) return Unauthorized();\n    if (await _store.SeenAsync(body.EventId)) return Ok(); // dedup\n    await _store.SaveAsync(body);\n    await _bus.PublishAsync(body.ToIntegrationEvent());\n    return Ok(); // fast ack; processing is async\n}" },
    ],
  },
  database: {
    kicker: "Data Layer", title: "SQL Server / PostgreSQL",
    sections: [
      { h: "Role", p: "System of record. EF Core for the write model & transactions; Dapper for hot read paths. Portable across SQL Server and PostgreSQL." },
      { h: "Key tables", list: ["<code>AuditTransaction</code>, <code>AuditCase</code>, <code>Payment</code>", "<code>OutboxMessage</code> — transactional event publishing", "<code>SagaState</code> — long-running orchestration", "<code>WebhookEvent</code> — idempotency ledger", "<code>AuditLog</code> — immutable traceability"] },
      { h: "Indexing strategy", list: ["Clustered on Id; nonclustered on Status, CreatedDate", "Covering index on CorrelationId & TransactionId", "Filtered index on OutboxMessage(Status = 'Pending')"] },
    ],
  },
  redis: {
    kicker: "Infrastructure", title: "Redis Cache",
    sections: [
      { h: "Role", p: "Distributed cache and coordination primitive." },
      { h: "Uses", list: ["Read-through cache for reference data", "Idempotency-key store with TTL", "Distributed locks for the Outbox processor", "SignalR backplane fallback"] },
    ],
  },
  worker: {
    kicker: "Processing", title: "Worker Service (Consumer)",
    sections: [
      { h: "Role", p: "Long-running ASP.NET Core BackgroundService that consumes Service Bus messages for steady, high-throughput business processing under your own control (vs. Functions for spiky loads)." },
      { h: "When to use", list: ["Predictable, sustained throughput", "Long-lived connections & warm caches", "Fine-grained concurrency/prefetch control", "Runs on App Service / AKS"] },
    ],
  },
};

/* ---------- 01 Executive Overview ---------- */
window.SECTIONS.push({
  id: "executive", num: "01", group: "Overview", label: "Executive Overview",
  kicker: "Enterprise Assurance & Audit", title: "Enterprise Assurance & Audit Processing Platform",
  sub: "A scalable, event-driven, secure and resilient digital assurance platform — built on Angular, ASP.NET Core and Azure. This showcase walks from business problem to production architecture the way we would deliver it for your organisation.",
  blocks: [
    { type: "kpis", cols: 4, items: [
      { val: "Event-Driven", label: "Decoupled async processing", note: "Azure Service Bus + Event Grid" },
      { val: "Cloud-Native", label: "Elastic, managed services", note: "App Service / AKS + Functions" },
      { val: "Real-Time", label: "Live status to users", note: "SignalR over WebSockets" },
      { val: "Auditable", label: "End-to-end traceability", note: "Correlation IDs + immutable log" },
    ]},
    { type: "caps", title: "Architecture capabilities", desc: "The pillars this platform is engineered around — each is demonstrated in a dedicated section with diagrams and code.", cols: 5, items: [
      { icon: "bolt", cat: "msg", title: "Event Driven", desc: "Asynchronous, decoupled processing via topics & subscriptions." },
      { icon: "cloud", cat: "client", title: "Cloud Native", desc: "Managed Azure services, IaC, elastic scale." },
      { icon: "scale", cat: "app", title: "Highly Scalable", desc: "Horizontal scale + queue-based load leveling." },
      { icon: "shield", cat: "sec", title: "Secure", desc: "OAuth2/OIDC, RBAC, Key Vault, WAF." },
      { icon: "signalr", cat: "mon", title: "Real-Time", desc: "Instant UI updates through SignalR." },
      { icon: "retry", cat: "ext", title: "Fault Tolerant", desc: "Retries, circuit breakers, DLQ, sagas." },
      { icon: "book", cat: "domain", title: "Auditable", desc: "Traceable, replayable, immutable history." },
      { icon: "api", cat: "api", title: "API First", desc: "Versioned, documented, contract-tested APIs." },
      { icon: "grid", cat: "func", title: "Microservices Ready", desc: "Modular monolith with clean seams to extract." },
      { icon: "webhook", cat: "ext", title: "Enterprise Integration", desc: "Secure webhooks & third-party isolation." },
    ]},
    { type: "flow", title: "High-level architecture", desc: "The end-to-end shape of the platform. Highlighted nodes are interactive — click for design rationale and code.",
      diagramTitle: "Assurance & Audit — high-level flow",
      legend: [ {cat:"client",label:"Client"},{cat:"api",label:"API / Edge"},{cat:"app",label:"Processing"},{cat:"msg",label:"Messaging"},{cat:"db",label:"Data"},{cat:"ext",label:"External"},{cat:"mon",label:"Real-time"} ],
      steps: [
        { name: "Angular Application", tech: "TypeScript · Material · SignalR client", icon: "angular", cat: "client", detail: DETAILS.angular },
        { name: "API Gateway", tech: "Azure API Management · JWT · WAF", icon: "gateway", cat: "api", edge: "HTTPS + JWT", detail: DETAILS.gateway },
        { name: "ASP.NET Core APIs", tech: ".NET · Clean Architecture · CQRS", icon: "api", cat: "api", edge: "authorized request", detail: DETAILS.api },
        { edge: "transactional write + outbox", parallel: [
          { name: "SQL / PostgreSQL", tech: "EF Core · Dapper", icon: "db", cat: "db", detail: DETAILS.database },
          { name: "Outbox Messages", tech: "same DB transaction", icon: "inbox", cat: "db", detail: DETAILS.database },
        ]},
        { name: "Azure Service Bus", tech: "Topics · Subscriptions · DLQ", icon: "bus", cat: "msg", edge: "outbox processor publishes", detail: DETAILS.servicebus },
        { edge: "fan-out to subscribers", parallel: [
          { name: "Payment Consumer", tech: "Worker / Function", icon: "worker", cat: "app", detail: DETAILS.worker },
          { name: "Audit Consumer", tech: "Function", icon: "func", cat: "func", detail: DETAILS.func },
          { name: "Notification Consumer", tech: "→ SignalR", icon: "signalr", cat: "mon", detail: DETAILS.signalr },
        ]},
        { name: "KyrePay", tech: "3rd-party payments · signed webhooks", icon: "card", cat: "ext", edge: "payment API + webhook", detail: DETAILS.kyrepay },
        { name: "Real-time to Angular", tech: "SignalR → WebSocket → UI", icon: "signalr", cat: "mon", edge: "status pushed back", detail: DETAILS.signalr },
      ]},
    { type: "callout", kind: "info", title: "How to use this showcase", body: "Move top-to-bottom through the left navigation — it tells a single story: <b>business problem → proposed architecture → why → how data flows → how failures are handled → how it scales → how it evolves.</b> Every diagram node and state is clickable, and the <b>End-to-End Flow</b> section animates a full transaction." },
  ],
});

/* ---------- 02 Business Use Case ---------- */
window.SECTIONS.push({
  id: "usecase", num: "02", group: "Overview", label: "Business Use Case",
  kicker: "The Problem We Solve", title: "Assurance & Audit transaction lifecycle",
  sub: "An assurance & audit organisation ingests high volumes of records — audit cases, financial & payment transactions, compliance records, documents and approvals — from many source systems. Each must be validated, enriched, processed, paid where required, and fully traceable.",
  blocks: [
    { type: "caps", title: "What the platform must do", cols: 3, items: [
      { icon: "queue", cat: "msg", title: "Ingest at scale", desc: "Receive transactions from many source systems reliably." },
      { icon: "check", cat: "domain", title: "Validate & enrich", desc: "Business validation, enrichment, and stateful processing." },
      { icon: "card", cat: "ext", title: "Pay when required", desc: "Trigger third-party payments and reconcile via webhooks." },
      { icon: "signalr", cat: "mon", title: "Notify in real time", desc: "Push status to users the moment it changes." },
      { icon: "retry", cat: "ext", title: "Handle failure", desc: "Retries, dead-letter, and manual review paths." },
      { icon: "book", cat: "sec", title: "Prove everything", desc: "Auditability, traceability and role-based access." },
    ]},
    { type: "stateMachine", title: "Interactive transaction state machine", desc: "Click any state to inspect its business meaning, the API involved, the database change, the event & topic emitted, the subscriber, retry behaviour and the UI notification.",
      states: [
        { name: "NEW", color: "--c-client", meta: "ingested", meaning: "Transaction received from a source system and accepted for processing.", api: "<code>POST /api/audit</code>", db: "Insert <code>AuditTransaction</code> (Status=NEW) + Outbox row", event: "<code>AuditCreated</code>", topic: "<code>audit-events</code>", subscriber: "Validation consumer", retry: "n/a (synchronous accept)", ui: "Toast: “Transaction submitted”" },
        { name: "VALIDATED", color: "--c-app", meta: "rules passed", meaning: "Schema, business rules and enrichment completed successfully.", api: "internal (consumer)", db: "Update Status=VALIDATED", event: "<code>AuditValidated</code>", topic: "<code>audit-events</code>", subscriber: "Processing orchestrator (Saga)", retry: "3× exponential, else DLQ", ui: "Status chip → Validated" },
        { name: "IN_PROGRESS", color: "--c-app", meta: "processing", meaning: "Core assurance processing and case work under way.", api: "internal", db: "Update Status=IN_PROGRESS", event: "<code>ProcessingStarted</code>", topic: "<code>audit-events</code>", subscriber: "Audit consumer", retry: "Idempotent handler; safe re-delivery", ui: "Progress indicator" },
        { name: "APPROVAL_REQUIRED", color: "--c-msg", meta: "human step", meaning: "Case requires an Audit Manager approval before payment.", api: "<code>GET /api/audit/{id}</code> (reviewer)", db: "Insert ApprovalRequest", event: "<code>ApprovalRequested</code>", topic: "<code>audit-events</code>", subscriber: "Notification consumer", retry: "n/a", ui: "SignalR alert to AuditManager group" },
        { name: "APPROVED", color: "--c-domain", meta: "signed off", meaning: "Approver signed off; payment may be initiated.", api: "<code>PUT /api/audit/{id}/approve</code>", db: "Update Status=APPROVED + AuditLog", event: "<code>AuditApproved</code>", topic: "<code>audit-events</code>", subscriber: "Payment consumer", retry: "n/a", ui: "Status chip → Approved" },
        { name: "PAYMENT_INITIATED", color: "--c-ext", meta: "call KyrePay", meaning: "Payment request created and sent to KyrePay.", api: "<code>POST /api/payment</code> → KyrePay", db: "Insert Payment (Initiated) + Idempotency-Key", event: "<code>PaymentInitiated</code>", topic: "<code>audit-events</code>", subscriber: "Payment processor", retry: "Polly retry + circuit breaker on KyrePay", ui: "“Payment processing…”" },
        { name: "PAYMENT_PROCESSING", color: "--c-ext", meta: "awaiting webhook", meaning: "KyrePay accepted the request; awaiting asynchronous callback.", api: "webhook inbound", db: "Payment Status=Processing", event: "—", topic: "—", subscriber: "Webhook API", retry: "Webhook is idempotent & replay-safe", ui: "Live spinner via SignalR" },
        { name: "PAYMENT_COMPLETED", color: "--c-db", meta: "settled", meaning: "Signed webhook confirms payment succeeded.", api: "<code>POST /api/webhooks/payment</code>", db: "Payment=Completed; WebhookEvent recorded", event: "<code>PaymentCompleted</code>", topic: "<code>audit-events</code>", subscriber: "Audit finaliser + Notification", retry: "Duplicate webhooks ignored (dedup)", ui: "Success toast + status → Paid" },
        { name: "AUDIT_COMPLETED", color: "--c-db", meta: "done", meaning: "Report generated, transaction closed and archived.", api: "internal", db: "Status=AUDIT_COMPLETED; report stored", event: "<code>AuditCompleted</code>", topic: "<code>audit-events</code>", subscriber: "Reporting / archive", retry: "n/a", ui: "Final state; report link shown" },
        { name: "VALIDATION_FAILED", fail: true, meaning: "Record failed business validation.", db: "Status=VALIDATION_FAILED", event: "<code>ValidationFailed</code>", subscriber: "Notification + Ops queue", retry: "Routed to MANUAL_REVIEW", ui: "Error with reason to submitter" },
        { name: "PAYMENT_FAILED", fail: true, meaning: "KyrePay declined or errored after retries.", db: "Payment=Failed; compensation triggered", event: "<code>PaymentFailed</code>", subscriber: "Saga compensation", retry: "Saga rolls back reservation", ui: "Failure notice + retry option" },
        { name: "RETRY", fail: true, meaning: "Transient failure; message re-delivered with backoff.", retry: "Exponential backoff up to max delivery count", ui: "No user impact (silent)" },
        { name: "DEAD_LETTER", fail: true, meaning: "Exceeded retries; message parked for inspection.", db: "Moved to DLQ", subscriber: "DLQ monitor / alert", retry: "Manual replay after fix", ui: "Ops alert only" },
        { name: "MANUAL_REVIEW", fail: true, meaning: "Human intervention required to resolve.", subscriber: "Operations user", ui: "Task appears in Ops worklist" },
      ]},
  ],
});

/* ---------- 03 HLD ---------- */
window.SECTIONS.push({
  id: "hld", num: "03", group: "Overview", label: "HLD Architecture",
  kicker: "High-Level Design", title: "Layered high-level architecture",
  sub: "A logical view of the platform organised into clean layers. Each layer has a single responsibility and depends only inward — the dependency rule of Clean Architecture. Click components for detail.",
  blocks: [
    { type: "layered", diagramTitle: "Logical layers (Clean Architecture)",
      legend: [ {cat:"client",label:"Client"},{cat:"api",label:"API"},{cat:"app",label:"Application"},{cat:"domain",label:"Domain"},{cat:"db",label:"Infrastructure"},{cat:"mon",label:"Real-time / Observability"} ],
      layers: [
        { name: "Client Layer", cat: "client", nodes: [ {name:"Angular Application", tech:"SPA · Material", icon:"angular", cat:"client", detail: DETAILS.angular} ]},
        { name: "API Layer", cat: "api", nodes: [ {name:"API Gateway", tech:"APIM · WAF", icon:"gateway", cat:"api", detail: DETAILS.gateway}, {name:"ASP.NET Core APIs", tech:"Controllers · Middleware · Filters", icon:"api", cat:"api", detail: DETAILS.api} ]},
        { name: "Application Layer", cat: "app", nodes: [ {name:"Command Handlers", tech:"CQRS write", icon:"cog", cat:"app"}, {name:"Query Handlers", tech:"CQRS read", icon:"code", cat:"app"}, {name:"Orchestration", tech:"Saga · MediatR", icon:"saga", cat:"app"} ]},
        { name: "Domain Layer", cat: "domain", nodes: [ {name:"Entities & Aggregates", tech:"Invariants", icon:"domain", cat:"domain"}, {name:"Domain Services", tech:"Business rules", icon:"cog", cat:"domain"}, {name:"Domain Events", tech:"Ubiquitous language", icon:"bolt", cat:"domain"} ]},
        { name: "Infrastructure Layer", cat: "db", nodes: [ {name:"EF Core / Dapper", tech:"Persistence", icon:"db", cat:"db", detail: DETAILS.database}, {name:"Service Bus", tech:"Messaging", icon:"bus", cat:"msg", detail: DETAILS.servicebus}, {name:"Event Grid", tech:"Eventing", icon:"grid", cat:"func", detail: DETAILS.eventgrid}, {name:"KyrePay Client", tech:"External", icon:"card", cat:"ext", detail: DETAILS.kyrepay}, {name:"Redis", tech:"Cache", icon:"cache", cat:"db", detail: DETAILS.redis} ]},
        { name: "Real-time & Observability", cat: "mon", nodes: [ {name:"SignalR", tech:"WebSockets", icon:"signalr", cat:"mon", detail: DETAILS.signalr}, {name:"App Insights", tech:"Traces · metrics · logs", icon:"monitor", cat:"mon"} ]},
      ]},
    { type: "callout", kind: "ok", title: "The dependency rule", body: "Dependencies point <b>inward</b>: Infrastructure and API depend on Application and Domain — never the reverse. The Domain has zero framework dependencies, so business rules are testable in isolation and infrastructure (SQL vs PostgreSQL, Functions vs Workers) can be swapped without touching business logic." },
  ],
});

/* ---------- 04 LLD ---------- */
window.SECTIONS.push({
  id: "lld", num: "04", group: "Overview", label: "LLD Architecture",
  kicker: "Low-Level Design", title: "Solution structure & components",
  sub: "How the codebase is physically organised. A modular-monolith .NET solution with clean project boundaries that map 1:1 to the logical layers — ready to extract into services when a module earns it.",
  blocks: [
    { type: "code", title: "ASP.NET Core solution layout", lang: "bash", label: "/src", code:
"/src\n  /Audit.Api                 # Thin HTTP surface\n      Controllers/           #   REST endpoints\n      Middleware/            #   Auth, correlation-id, exceptions\n      Filters/               #   Validation, idempotency\n  /Audit.Application         # Use cases (CQRS)\n      Commands/  Queries/    #   MediatR requests + handlers\n      DTOs/  Validators/     #   FluentValidation\n      Interfaces/            #   Ports (repos, bus, clients)\n      Behaviors/             #   Pipeline: logging, retry, tx\n  /Audit.Domain             # Enterprise business rules\n      Entities/  Aggregates/\n      ValueObjects/\n      DomainEvents/\n      Specifications/\n  /Audit.Infrastructure     # Adapters\n      Persistence/           #   EF Core, migrations, Dapper\n      Repositories/\n      Messaging/             #   Service Bus, Outbox\n      ExternalServices/      #   KyrePay client (Polly)\n      Webhooks/\n  /Audit.Worker             # Background processing\n      Consumers/\n      BackgroundServices/    #   Outbox publisher, saga runner\n  /Audit.SignalR            # Real-time\n      Hubs/\n  /Audit.Tests\n      UnitTests/ IntegrationTests/ ContractTests/" },
    { type: "accordion", title: "Component responsibilities", items: [
      { title: "Audit.Api", badge: "Presentation", open: true, blocks: [ { type: "para", body: "Thin controllers only — validate the request shape, dispatch a MediatR command/query, and map the result to an HTTP response. Cross-cutting concerns (auth, correlation IDs, global exception handling, idempotency) live in middleware and filters, not controllers." } ]},
      { title: "Audit.Application", badge: "Use cases", blocks: [ { type: "para", body: "The heart of the system: one handler per use case, orchestrating domain objects and infrastructure ports. MediatR <b>pipeline behaviors</b> add logging, validation, retry and transaction+outbox wrapping uniformly around every handler." },
        { type: "code", lang: "csharp", label: "TransactionBehavior.cs", code: "public async Task<TRes> Handle(TReq req, RequestHandlerDelegate<TRes> next, CancellationToken ct)\n{\n    await using var tx = await _db.BeginTransactionAsync(ct);\n    var res = await next();                 // handler writes aggregate + outbox\n    await _db.SaveChangesAsync(ct);\n    await tx.CommitAsync(ct);\n    return res;\n}" } ]},
      { title: "Audit.Domain", badge: "Core", blocks: [ { type: "para", body: "Pure C# — entities, aggregates and value objects that enforce invariants, plus domain events raised when meaningful state changes occur. No EF Core, no Azure SDK, no HTTP. This is what makes the business logic fast to test and cheap to change." } ]},
      { title: "Audit.Infrastructure", badge: "Adapters", blocks: [ { type: "para", body: "Concrete implementations of the ports declared in Application: EF Core repositories, the Service Bus publisher/consumer, the resilient KyrePay HttpClient, and the Outbox. Swapping SQL Server for PostgreSQL is an infrastructure-only change." } ]},
      { title: "Audit.Worker", badge: "Processing", blocks: [ { type: "para", body: "Hosts long-running BackgroundServices: the Outbox publisher polls and publishes pending messages, and consumers process Service Bus messages with idempotency and retry. Scales independently of the API." } ]},
      { title: "Audit.Tests", badge: "Quality", blocks: [ { type: "para", body: "Unit tests for domain & handlers (fast, no I/O), integration tests against a real database + Service Bus emulator, and contract tests that pin the KyrePay and webhook schemas so external changes are caught early." } ]},
    ]},
  ],
});
