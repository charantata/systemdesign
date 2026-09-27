/* ============================================================
   Content — Real-Time & Integration group
   ============================================================ */
window.SECTIONS = window.SECTIONS || [];
var D = window.DETAILS;

/* ---------- 15 SignalR / WebSockets ---------- */
window.SECTIONS.push({
  id: "signalr", num: "15", group: "Real-Time & Integration", label: "SignalR / WebSockets",
  kicker: "Real-Time", title: "Real-time updates with SignalR",
  sub: "Assurance users should never refresh to see progress. As backend processing moves a transaction through its states, SignalR pushes the change over a WebSocket and the Angular UI updates instantly.",
  blocks: [
    { type: "flow", title: "From event to screen", desc: "A status change travels from the bus to the exact user in milliseconds.",
      diagramTitle: "Real-time notification path",
      steps: [
        { name: "Azure Service Bus", tech: "status event", icon: "bus", cat: "msg", detail: D.servicebus },
        { name: "Notification Consumer", tech: "maps event → client msg", icon: "worker", cat: "app", edge: "consume" },
        { name: "SignalR Hub", tech: "target user / role group", icon: "signalr", cat: "mon", edge: "push", detail: D.signalr },
        { name: "WebSocket", tech: "persistent duplex", icon: "bolt", cat: "mon", edge: "frame" },
        { name: "Angular", tech: "live UI update", icon: "angular", cat: "client", edge: "on(event)", detail: D.angular },
      ]},
    { type: "vs", title: "SignalR vs raw WebSockets",
      left: { icon: "signalr", title: "SignalR", blocks: [
        { type: "featureList", variant: "pros", items: ["Transport fallback (WS → SSE → long-poll)", "Auto-reconnect & connection management", "Groups, users & broadcast out of the box", "Scale-out via Azure SignalR Service backplane", "Auth integrated with JWT"] },
      ]},
      right: { icon: "bolt", title: "Raw WebSockets", blocks: [
        { type: "featureList", items: ["Lowest-level, full control of frames", "You build reconnect, grouping, scale-out yourself", "Good for bespoke binary protocols"] },
        { type: "para", body: "For an enterprise app, SignalR's higher-level features save significant effort and risk." },
      ]},
    },
    { type: "code", title: "Hub — targeted notifications", lang: "csharp", label: "NotificationHub.cs", code:
"[Authorize]\npublic class NotificationHub : Hub\n{\n    public override async Task OnConnectedAsync()\n    {\n        var user = Context.UserIdentifier!;                 // from JWT 'sub'\n        await Groups.AddToGroupAsync(Context.ConnectionId, $\"u:{user}\");\n        foreach (var role in Context.User!.FindAll(ClaimTypes.Role))\n            await Groups.AddToGroupAsync(Context.ConnectionId, $\"r:{role.Value}\");\n        await base.OnConnectedAsync();\n    }\n}\n\n// From the notification consumer:\nawait _hub.Clients.Group($\"u:{ev.UserId}\")\n    .SendAsync(\"TransactionStatusChanged\", new {\n        transactionId = ev.TransactionId, status = ev.Status });" },
    { type: "code", title: "Angular client", lang: "typescript", label: "signalr.service.ts", code:
"private connection = new signalR.HubConnectionBuilder()\n  .withUrl('/hubs/notifications', { accessTokenFactory: () => this.auth.token })\n  .withAutomaticReconnect([0, 2000, 5000, 10000])\n  .build();\n\nasync start() {\n  this.connection.on('TransactionStatusChanged', (evt) => {\n    this.store.updateStatus(evt.transactionId, evt.status);   // live UI\n  });\n  await this.connection.start();\n}" },
    { type: "caps", title: "Capabilities delivered", cols: 4, items: [
      { icon: "user", cat: "client", title: "User-specific", desc: "Notify exactly the submitter." },
      { icon: "shield", cat: "sec", title: "Role-specific", desc: "Alert the AuditManager group for approvals." },
      { icon: "retry", cat: "ext", title: "Reconnection", desc: "Automatic backoff reconnect on drop." },
      { icon: "scale", cat: "app", title: "Scale-out", desc: "Azure SignalR backplane across API instances." },
    ]},
  ],
});

/* ---------- 16 Payment Integration ---------- */
window.SECTIONS.push({
  id: "payment", num: "16", group: "Real-Time & Integration", label: "Payment Integration",
  kicker: "Third-Party Integration", title: "Payment integration with KyrePay",
  sub: "KyrePay is a fictional third-party payment & communication vendor used to demonstrate secure, resilient external integration — synchronous request, asynchronous signed webhook, isolated behind an anti-corruption layer.",
  blocks: [
    { type: "callout", kind: "info", title: "About KyrePay", body: "KyrePay is <b>not a real product</b> — it is a stand-in for any external payment provider (Stripe, Adyen, a bank gateway). Treating it as fictional lets us focus on the <i>integration patterns</i>: authentication, idempotency, timeouts, retries, and webhook reconciliation." },
    { type: "flow", title: "Payment integration flow",
      diagramTitle: "Audit → KyrePay → webhook → UI",
      steps: [
        { name: "Audit Service", tech: "approved → pay", icon: "doc", cat: "domain" },
        { name: "Payment Service", tech: "build request · idempotency-key", icon: "cog", cat: "app", edge: "" },
        { name: "KyrePay API", tech: "POST /payments (signed)", icon: "card", cat: "ext", edge: "HTTPS + HMAC", detail: D.kyrepay },
        { name: "Payment Provider", tech: "settles asynchronously", icon: "globe", cat: "ext", edge: "" },
        { name: "Webhook API", tech: "POST /webhooks/payment", icon: "webhook", cat: "ext", edge: "signed callback", detail: D.webhook },
        { name: "Service Bus", tech: "PaymentCompleted", icon: "bus", cat: "msg", edge: "publish", detail: D.servicebus },
        { name: "Payment Processor", tech: "finalise · persist", icon: "worker", cat: "app", edge: "consume" },
        { name: "SignalR → Angular", tech: "live confirmation", icon: "signalr", cat: "mon", edge: "notify", detail: D.signalr },
      ]},
    { type: "table", title: "API surface", head: ["Method", "Endpoint", "Purpose", "Security"], rows: [
      ["<span class='tag post'>POST</span>", "<code>/api/payment</code>", "Create a payment for a transaction", "JWT + policy"],
      ["<span class='tag get'>GET</span>", "<code>/api/payment/{id}</code>", "Query payment status", "JWT + policy"],
      ["<span class='tag post'>POST</span>", "<code>/api/webhooks/payment</code>", "Receive KyrePay callback", "HMAC signature"],
    ]},
    { type: "code", title: "Outbound call — auth, idempotency, timeout", lang: "csharp", label: "PaymentService.cs", code:
"public async Task<PaymentResult> ChargeAsync(PaymentRequest req, CancellationToken ct)\n{\n    using var http = _factory.CreateClient(\"KyrePay\");   // Polly: retry+breaker+timeout\n    var msg = new HttpRequestMessage(HttpMethod.Post, \"/v1/payments\")\n    {\n        Content = JsonContent.Create(req)\n    };\n    msg.Headers.Add(\"X-Api-Key\", _cfg[\"KyrePay:ApiKey\"]);\n    msg.Headers.Add(\"Idempotency-Key\", req.TransactionId);   // no double charge\n    msg.Headers.Add(\"X-Signature\", _signer.Sign(req));       // request integrity\n    msg.Headers.Add(\"X-Correlation-Id\", req.CorrelationId);\n\n    var resp = await http.SendAsync(msg, ct);\n    return await resp.Content.ReadFromJsonAsync<PaymentResult>(ct)\n        ?? throw new PaymentException(\"Empty response\");\n}" },
    { type: "caps", title: "Integration concerns handled", cols: 3, items: [
      { icon: "key", cat: "sec", title: "Authentication", desc: "API key + HMAC request signature." },
      { icon: "shield", cat: "sec", title: "Idempotency", desc: "Idempotency-Key prevents duplicate charges." },
      { icon: "retry", cat: "ext", title: "Resilience", desc: "Timeout, retry with backoff, circuit breaker." },
      { icon: "webhook", cat: "ext", title: "Async callback", desc: "Webhook, not polling — no wasted calls." },
      { icon: "domain", cat: "domain", title: "Anti-corruption", desc: "Vendor contract adapted to our domain model." },
      { icon: "book", cat: "mon", title: "Traceability", desc: "Correlation-Id flows through to the vendor." },
    ]},
  ],
});

/* ---------- 17 Webhooks ---------- */
window.SECTIONS.push({
  id: "webhooks", num: "17", group: "Real-Time & Integration", label: "Webhooks",
  kicker: "Inbound Integration", title: "Secure webhook design",
  sub: "Inbound callbacks are attack surface and a source of subtle bugs (duplicates, replays, out-of-order delivery). The rule: validate hard, de-duplicate, hand off fast, never do long work inside the request.",
  blocks: [
    { type: "flow", title: "Webhook processing pipeline",
      diagramTitle: "Validate → dedup → persist → publish → 200",
      steps: [
        { name: "Webhook received", tech: "POST /webhooks/payment", icon: "webhook", cat: "ext" },
        { name: "Validate signature", tech: "HMAC verify", icon: "lock", cat: "sec", edge: "reject 401 if invalid" },
        { name: "Check timestamp", tech: "replay guard", icon: "retry", cat: "sec", edge: "reject if stale" },
        { name: "Check idempotency", tech: "WebhookEvent table", icon: "shield", cat: "sec", edge: "200 if duplicate" },
        { name: "Persist event", tech: "record callback", icon: "db", cat: "db", edge: "" },
        { name: "Publish to Service Bus", tech: "async processing", icon: "bus", cat: "msg", edge: "", detail: D.servicebus },
        { name: "Return HTTP 200", tech: "fast ack", icon: "check", cat: "db", edge: "" },
      ]},
    { type: "code", title: "The webhook payload", lang: "json", label: "callback.json", code:
"{\n  \"eventId\":       \"whk_9f1a...\",\n  \"transactionId\": \"AUD-10293\",\n  \"paymentId\":     \"pay_77c2...\",\n  \"status\":        \"completed\",\n  \"amount\":        4200.00,\n  \"timestamp\":     \"2026-09-26T10:14:31Z\",\n  \"signature\":     \"hmac-sha256=...\"\n}" },
    { type: "code", title: "The handler — thin, safe, fast", lang: "csharp", label: "WebhookController.cs", code:
"[HttpPost(\"webhooks/payment\")]\n[AllowAnonymous]                                   // authenticated by signature\npublic async Task<IActionResult> Payment(\n    [FromBody] KyrePayCallback body,\n    [FromHeader(Name = \"X-Kyre-Signature\")] string sig,\n    CancellationToken ct)\n{\n    if (!_verifier.IsValid(body.Raw, sig))          return Unauthorized();\n    if (_clock.IsStale(body.Timestamp, TimeSpan.FromMinutes(5))) return BadRequest();\n    if (await _events.SeenAsync(body.EventId, ct))  return Ok();   // idempotent\n    if (!await _tx.ExistsAsync(body.TransactionId, ct)) return NotFound();\n\n    await _events.SaveAsync(body, ct);              // persist first\n    await _bus.PublishAsync(body.ToIntegrationEvent(), ct);\n    return Ok();                                    // processing happens async\n}" },
    { type: "callout", kind: "warn", title: "Never process synchronously inside the webhook", body: "Providers retry aggressively on slow or failed responses. If you do heavy work inline you invite timeouts, duplicate deliveries and cascading load. Validate → persist → publish → <b>return 200 fast</b>; let a Service Bus consumer do the real work idempotently." },
  ],
});

/* ---------- 18 Security ---------- */
window.SECTIONS.push({
  id: "security", num: "18", group: "Real-Time & Integration", label: "Security",
  kicker: "Security Architecture", title: "Security & access control",
  sub: "Security is layered and defence-in-depth: identity at the edge, authorization at every level, secrets in a vault, and traceability throughout — appropriate for regulated assurance & audit data.",
  blocks: [
    { type: "flow", title: "Identity & token flow",
      diagramTitle: "OIDC → JWT → API",
      steps: [
        { name: "Angular", tech: "OIDC login (PKCE)", icon: "angular", cat: "client" },
        { name: "Identity Provider", tech: "Entra ID / OAuth2", icon: "key", cat: "sec", edge: "authenticate" },
        { name: "JWT (Bearer)", tech: "signed access token", icon: "lock", cat: "sec", edge: "issued" },
        { name: "API Gateway", tech: "validate · scopes", icon: "gateway", cat: "api", edge: "Authorization: Bearer", detail: D.gateway },
        { name: "ASP.NET Core APIs", tech: "policy-based RBAC", icon: "api", cat: "api", edge: "authorized", detail: D.api },
      ]},
    { type: "twoCol", cols: [
      { type: "code", title: "JWT claims", lang: "json", label: "jwt.payload", code:
"{\n  \"sub\":   \"u-4821\",\n  \"role\":  [\"Auditor\",\"Finance\"],\n  \"scope\": \"audit.read audit.write payment.write\",\n  \"tenant\":\"acme-assurance\",\n  \"permissions\": [\"audit:create\",\"payment:approve\"],\n  \"iss\":   \"https://login.contoso.com\",\n  \"aud\":   \"assurance-api\",\n  \"exp\":   1790000000\n}" },
      { type: "featureList", title: "Roles (RBAC)", items: [
        "<b>Admin</b> — full platform administration",
        "<b>Auditor</b> — create & work audit cases",
        "<b>Audit Manager</b> — approve, oversee",
        "<b>Finance User</b> — payment operations",
        "<b>Operations User</b> — monitoring & DLQ replay",
        "<b>Compliance User</b> — read + audit trail",
        "<b>ReadOnly User</b> — dashboards only" ]},
    ]},
    { type: "code", title: "Authorization at every level", lang: "csharp", label: "authz.cs", code:
"// Program.cs — policies\nbuilder.Services.AddAuthorization(o =>\n{\n    o.AddPolicy(\"CanApprovePayment\", p =>\n        p.RequireRole(\"AuditManager\", \"Finance\")\n         .RequireClaim(\"permissions\", \"payment:approve\"));\n    o.AddPolicy(\"CanCreateAudit\", p =>\n        p.RequireClaim(\"permissions\", \"audit:create\"));\n});\n\n// Controller / endpoint\n[Authorize(Roles = \"AuditManager\")]                 // role-based\n[Authorize(Policy = \"CanApprovePayment\")]           // policy-based\n[HttpPut(\"{id}/approve\")]\npublic Task<IActionResult> Approve(Guid id) => ...;\n\n// Data-level: every query is tenant-scoped\nquery = query.Where(x => x.TenantId == _ctx.TenantId);" },
    { type: "caps", title: "Defence in depth", cols: 4, items: [
      { icon: "lock", cat: "sec", title: "HTTPS / TLS", desc: "Encryption in transit end-to-end." },
      { icon: "key", cat: "sec", title: "Key Vault", desc: "Secrets & certs; Managed Identity access." },
      { icon: "shield", cat: "sec", title: "WAF", desc: "OWASP protection at the edge." },
      { icon: "retry", cat: "ext", title: "Rate limiting", desc: "Throttle per subscription / client." },
      { icon: "api", cat: "api", title: "Input validation", desc: "FluentValidation on every command." },
      { icon: "db", cat: "db", title: "SQLi protection", desc: "Parameterised queries / EF Core only." },
      { icon: "user", cat: "client", title: "CORS", desc: "Locked to known origins." },
      { icon: "book", cat: "mon", title: "Audit logging", desc: "Immutable trail of who did what, when." },
    ]},
  ],
});
