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

/* ---------- Angular Front-End ---------- */
window.SECTIONS.push({
  id: "angular-frontend", group: "Real-Time & Integration", label: "Angular Front-End",
  kicker: "Client Architecture", title: "Angular front-end — the client side of the design",
  sub: "How the Angular SPA is built to consume this platform: real-time via SignalR, secure calls via JWT with a refresh-token flow and CSRF protection, disciplined component lifecycle, and the right forms strategy. This is the client counterpart to the SignalR, Security and API sections.",
  blocks: [
    { type: "flow", title: "How the Angular app talks to the platform",
      diagramTitle: "Component → services → interceptors → API / Hub",
      legend: [ {cat:"client",label:"Angular"},{cat:"sec",label:"Security"},{cat:"api",label:"Backend"},{cat:"mon",label:"Real-time"} ],
      steps: [
        { name: "Component", tech: "signals / OnPush", icon: "angular", cat: "client" },
        { name: "Feature service", tech: "HttpClient / state", icon: "cog", cat: "client", edge: "call" },
        { edge: "every request passes through", parallel: [
          { name: "Auth interceptor", tech: "attach JWT · refresh on 401", icon: "lock", cat: "sec" },
          { name: "XSRF interceptor", tech: "CSRF token (cookie auth)", icon: "shield", cat: "sec" },
          { name: "Error interceptor", tech: "retry · toast", icon: "retry", cat: "ext" },
        ]},
        { name: "API Gateway", tech: "REST over HTTPS", icon: "gateway", cat: "api", edge: "Bearer", detail: D.gateway },
        { name: "SignalR Hub", tech: "live updates → signal", icon: "signalr", cat: "mon", edge: "WebSocket (side channel)", detail: D.signalr },
      ]},
    { type: "code", title: "App structure", lang: "bash", label: "src/app", code:
"src/app\n  /core\n      /interceptors   auth.interceptor.ts · xsrf · error.interceptor.ts\n      /guards         auth.guard.ts · role.guard.ts\n      /services       auth.service.ts · token.service.ts · signalr.service.ts\n  /features           lazy-loaded feature routes (standalone components)\n  /shared             ui components, pipes, directives, validators\n  environments        environment.ts / environment.prod.ts (API + hub URLs)" },

    { type: "tabs", title: "The client-side design in detail", tabs: [

      { label: "SignalR consumption", blocks: [
        { type: "para", body: "A singleton service owns the hub connection: it authenticates with the current access token, auto-reconnects, routes server events into <b>signals</b>, and is consumed by components without manual subscription juggling." },
        { type: "code", lang: "typescript", label: "signalr.service.ts", code:
"@Injectable({ providedIn: 'root' })\nexport class RealtimeService {\n  private readonly status = signal<'up' | 'down'>('down');\n  readonly txStatus = signal<Record<string, string>>({});\n\n  private connection = new signalR.HubConnectionBuilder()\n    .withUrl(environment.hubUrl, {\n      accessTokenFactory: () => this.auth.accessToken() ?? ''  // JWT on connect & reconnect\n    })\n    .withAutomaticReconnect([0, 2000, 5000, 10000])\n    .configureLogging(signalR.LogLevel.Warning)\n    .build();\n\n  async start(): Promise<void> {\n    this.connection.on('TransactionStatusChanged', (e: TxStatusEvent) =>\n      this.txStatus.update(m => ({ ...m, [e.transactionId]: e.status })));\n    this.connection.onreconnected(() => this.status.set('up'));\n    this.connection.onclose(() => this.status.set('down'));\n    await this.connection.start();\n    this.status.set('up');\n  }\n  stop() { return this.connection.stop(); }\n}" },
        { type: "code", lang: "typescript", label: "component usage", code:
"@Component({ /* ... */ changeDetection: ChangeDetectionStrategy.OnPush })\nexport class OrderComponent {\n  private rt = inject(RealtimeService);\n  status = computed(() => this.rt.txStatus()[this.id()] ?? 'PENDING'); // live, reactive\n}" },
        { type: "callout", kind: "info", title: "Connect after auth, not before", body: "Start the hub only once a valid token exists, and let <code>accessTokenFactory</code> supply a fresh token on every (re)connect — so a token that refreshed mid-session is used on reconnect. Targeting (per-user / per-role groups) is done server-side (see <b>SignalR / WebSockets</b>)." },
      ]},

      { label: "JWT · refresh · CSRF", blocks: [
        { type: "para", body: "Access tokens are attached by an interceptor, kept <b>in memory</b> (never <code>localStorage</code>), and silently refreshed. The refresh token lives in an <b>httpOnly, Secure, SameSite cookie</b> the JS can't read — and that cookie-based refresh endpoint is exactly where <b>CSRF protection</b> applies." },
        { type: "code", lang: "typescript", label: "auth.interceptor.ts", code:
"export const authInterceptor: HttpInterceptorFn = (req, next) => {\n  const auth = inject(AuthService);\n  const token = auth.accessToken();\n  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;\n\n  return next(authed).pipe(\n    catchError((err: HttpErrorResponse) => {\n      if (err.status === 401 && !req.url.includes('/refresh')) {\n        return auth.refresh().pipe(          // silent refresh (shared, de-duped)\n          switchMap(t => next(authed.clone({\n            setHeaders: { Authorization: `Bearer ${t}` } }))) // retry once\n        );\n      }\n      return throwError(() => err);\n    })\n  );\n};" },
        { type: "code", lang: "typescript", label: "auth.service.ts — refresh (single-flight)", code:
"private refresh$?: Observable<string>;\n\nrefresh(): Observable<string> {\n  // Share ONE refresh call across all queued 401s (no refresh storm)\n  this.refresh$ ??= this.http.post<{ accessToken: string }>('/api/auth/refresh', {},\n      { withCredentials: true })                 // sends the httpOnly refresh cookie\n    .pipe(\n      tap(r => this.accessToken.set(r.accessToken)),\n      map(r => r.accessToken),\n      finalize(() => this.refresh$ = undefined),\n      shareReplay(1)\n    );\n  return this.refresh$;\n}" },
        { type: "code", lang: "typescript", label: "app.config.ts — XSRF (CSRF) + tokens", code:
"provideHttpClient(\n  withInterceptors([authInterceptor, errorInterceptor]),\n  withXsrfConfiguration({            // double-submit cookie for cookie-authed calls\n    cookieName: 'XSRF-TOKEN',\n    headerName: 'X-XSRF-TOKEN'\n  })\n)" },
        { type: "callout", kind: "warn", title: "Token storage & CSRF — the rules", body: "<b>Access token</b> → in memory (a signal/BehaviorSubject); <b>never</b> <code>localStorage</code>/<code>sessionStorage</code> (XSS-readable). <b>Refresh token</b> → httpOnly + Secure + SameSite cookie (JS can't read it). <b>CSRF</b> protection (anti-forgery token / SameSite) guards the <i>cookie-based</i> refresh & logout endpoints; pure Bearer APIs aren't CSRF-exposed because the token isn't sent automatically by the browser." },
        { type: "callout", kind: "info", title: "CSRF ≠ CORS (again)", body: "<b>CORS</b> = which browser origins may call the API (browser-enforced). <b>CSRF</b> = stops a malicious site abusing an authenticated <i>cookie</i> session. Configure both; they are unrelated controls (see <b>Security</b>)." },
      ]},

      { label: "Component lifecycle", blocks: [
        { type: "para", body: "Use the right hook for the right job — and always clean up subscriptions. Modern Angular uses <code>takeUntilDestroyed()</code> / <code>DestroyRef</code> so you rarely write <code>ngOnDestroy</code> by hand." },
        { type: "table", title: "Lifecycle hooks & when to use them", head: ["Hook", "Fires", "Use it for"], rows: [
          ["<code>constructor</code>", "On instantiation", "DI only — no work, no HTTP"],
          ["<code>ngOnChanges</code>", "On @Input change (before init & on updates)", "React to input changes"],
          ["<code>ngOnInit</code>", "Once, after first inputs set", "Initial data load, subscriptions"],
          ["<code>ngDoCheck</code>", "Every change-detection run", "Custom checks (use sparingly)"],
          ["<code>ngAfterViewInit</code>", "After the view & @ViewChild ready", "DOM / child-component access"],
          ["<code>ngAfterContentInit</code>", "After projected content ready", "@ContentChild access"],
          ["<code>ngOnDestroy</code>", "Just before teardown", "Unsubscribe, disconnect, timers"],
        ]},
        { type: "code", lang: "typescript", label: "lifecycle + cleanup", code:
"export class DashboardComponent implements OnInit {\n  private api = inject(ApiService);\n  private destroyRef = inject(DestroyRef);\n  orders = signal<Order[]>([]);\n\n  ngOnInit(): void {\n    this.api.getOrders()\n      .pipe(takeUntilDestroyed(this.destroyRef))   // auto-unsubscribe on destroy\n      .subscribe(o => this.orders.set(o));\n  }\n}" },
        { type: "callout", kind: "ok", title: "Change detection: prefer OnPush + signals", body: "<code>ChangeDetectionStrategy.OnPush</code> plus <b>signals</b> means the view updates only when inputs or signals actually change — far fewer checks, better performance on real-time-heavy screens (order lists, dashboards, live tracking)." },
      ]},

      { label: "Forms: Reactive vs Template", blocks: [
        { type: "vs", title: "Two forms strategies",
          left: { icon: "code", title: "Reactive forms", blocks: [
            { type: "para", body: "The form model is defined in <b>TypeScript</b> (<code>FormGroup</code>/<code>FormControl</code>). Explicit, testable, great for complex/dynamic forms and custom/async validation." },
            { type: "featureList", variant: "pros", items: ["Model in code — unit-testable", "Dynamic controls & cross-field rules", "Sync + <b>async</b> validators (server checks)", "Typed forms; predictable data flow"] },
            { type: "featureList", variant: "cons", items: ["More boilerplate for trivial forms"] },
          ]},
          right: { icon: "doc", title: "Template-driven forms", blocks: [
            { type: "para", body: "The form is built from directives in the <b>template</b> (<code>ngModel</code>). Minimal code — good for simple, small forms." },
            { type: "featureList", variant: "pros", items: ["Very little code for simple forms", "Familiar two-way binding"] },
            { type: "featureList", variant: "cons", items: ["Logic hidden in the template", "Harder to test & scale", "Async / dynamic validation awkward"] },
          ]},
        },
        { type: "code", lang: "typescript", label: "reactive form + async validator", code:
"form = this.fb.group({\n  amount:   [0, [Validators.required, Validators.min(1)]],\n  currency: ['USD', Validators.required],\n  customerId: ['', {\n    validators: [Validators.required],\n    asyncValidators: [this.eligibility.check()],   // hits the Eligibility API\n    updateOn: 'blur'\n  }]\n});\n\nsubmit() {\n  if (this.form.invalid) { this.form.markAllAsTouched(); return; }\n  this.api.create(this.form.getRawValue()).subscribe(/* ... */);\n}" },
        { type: "code", lang: "typescript", label: "template-driven (for simple forms)", code:
"<form #f=\"ngForm\" (ngSubmit)=\"save(f.value)\">\n  <input name=\"email\" ngModel required email />\n  <button [disabled]=\"f.invalid\">Save</button>\n</form>" },
        { type: "table", title: "Which to choose", head: ["Criterion", "Reactive", "Template-driven"], rows: [
          ["Form complexity", "Medium → complex", "Simple / small"],
          ["Where the model lives", "TypeScript", "Template"],
          ["Testability", "High", "Lower"],
          ["Dynamic / cross-field rules", "Easy", "Hard"],
          ["Async validation (server)", "First-class", "Awkward"],
          ["Recommended default here", "✅ Reactive", "Only for trivial forms"],
        ]},
      ]},

      { label: "Cross-cutting", blocks: [
        { type: "caps", title: "The rest of a production Angular app", cols: 3, items: [
          { icon: "bolt", cat: "app", title: "Signals & RxJS", desc: "Signals for state; RxJS for streams; always clean up." },
          { icon: "retry", cat: "ext", title: "Error interceptor", desc: "Central error handling, retry with backoff, user toasts." },
          { icon: "lock", cat: "sec", title: "Route guards", desc: "Auth & role guards protect routes and lazy modules." },
          { icon: "shield", cat: "sec", title: "RBAC in UI", desc: "Show/hide by role/permission — mirrors API policies." },
          { icon: "scale", cat: "app", title: "Lazy loading", desc: "Feature routes loaded on demand; smaller initial bundle." },
          { icon: "shield", cat: "sec", title: "XSS safety", desc: "Angular auto-sanitizes; avoid bypassSecurityTrust." },
          { icon: "monitor", cat: "mon", title: "Observability", desc: "App Insights JS SDK; propagate correlation IDs." },
          { icon: "cog", cat: "app", title: "Config per env", desc: "environment.ts for API/hub URLs & feature flags." },
          { icon: "user", cat: "client", title: "Accessibility & i18n", desc: "ARIA, keyboard nav, localization." },
        ]},
        { type: "callout", kind: "ok", title: "How it ties back", body: "The Angular client mirrors the backend contracts end-to-end: JWT/roles match the <b>Security</b> policies, SignalR events match the <b>Notification</b> flow, correlation IDs match <b>Observability</b>, and REST calls hit the <b>API Catalog</b> through the gateway. Same design, both sides of the wire." },
      ]},

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

/* ============================================================
   Authentication & Authorization — full deep-dive tab
   ============================================================ */
window.SECTIONS.push({
  id: "auth", group: "Real-Time & Integration", label: "AuthN & AuthZ",
  kicker: "Identity & Access", title: "Authentication & Authorization",
  sub: "Every request proves who it is (authentication) and what it may do (authorization). This page covers OAuth 2.0 / OIDC (including Authorization Code + PKCE), JWTs, key-based schemes, mTLS and managed identity, the identity providers (Entra ID, Okta, Entra External ID / B2C, Auth0), and how internal, external, public and workload identities are handled.",
  blocks: [
    { type: "callout", kind: "info", title: "AuthN ≠ AuthZ",
      body: "<b>Authentication (AuthN)</b> answers <i>“who are you?”</i> — it validates an identity (password + MFA, a token, a certificate). <b>Authorization (AuthZ)</b> answers <i>“what are you allowed to do?”</i> — it evaluates roles, scopes, permissions and policies <i>after</i> identity is established. You always authenticate first, then authorize per resource." },

    { type: "caps", title: "Mechanisms at a glance", cols: 4, items: [
      { icon: "lock", cat: "sec", title: "Password + MFA", desc: "Primary human sign-in; always paired with a second factor (TOTP, push, FIDO2)." },
      { icon: "key", cat: "sec", title: "OAuth 2.0 / OIDC", desc: "Delegated, token-based auth. The modern default for apps, APIs and SSO." },
      { icon: "card", cat: "sec", title: "JWT", desc: "Signed, self-describing bearer token carrying claims (sub, scope, roles)." },
      { icon: "code", cat: "api", title: "API key / HMAC", desc: "Machine-to-machine; a shared key or a signed request for webhooks & partners." },
      { icon: "shield", cat: "sec", title: "mTLS", desc: "Mutual TLS — the client proves identity with a certificate, not a token." },
      { icon: "cloud", cat: "app", title: "Managed Identity", desc: "Azure-issued workload identity — zero secrets for service-to-service." },
      { icon: "globe", cat: "mon", title: "SAML 2.0 / WS-Fed", desc: "XML-based enterprise SSO for legacy relying parties." },
      { icon: "user", cat: "client", title: "SSO + federation", desc: "One sign-in across apps via a central IdP (Entra ID, Okta, Auth0)." },
    ]},

    { type: "table", title: "Authentication vs Authorization",
      head: ["", "Authentication", "Authorization"],
      rows: [
        ["Question", "Who are you?", "What can you do?"],
        ["Runs", "First — at the edge / gateway", "After AuthN — per endpoint & per record"],
        ["Based on", "Credentials, tokens, certificates", "Roles, scopes, permissions, policies, attributes"],
        ["Fails with", "<code>401 Unauthorized</code>", "<code>403 Forbidden</code>"],
        ["ASP.NET", "<code>AddAuthentication()</code> + schemes", "<code>AddAuthorization()</code> + <code>[Authorize]</code> policies"],
        ["Example", "Valid Entra ID JWT present", "Token has <code>scp: payment.write</code> + role <code>Finance</code>"],
      ]},

    { type: "flow", title: "The modern default — OAuth 2.0 Authorization Code + PKCE",
      diagramTitle: "SPA / mobile → IdP → API (no client secret in the browser)",
      steps: [
        { name: "Angular SPA", tech: "builds code_verifier + S256 challenge", icon: "angular", cat: "client" },
        { name: "Authorize endpoint", tech: "/authorize?response_type=code", icon: "key", cat: "sec", edge: "redirect + code_challenge" },
        { name: "User signs in", tech: "password + MFA / SSO", icon: "user", cat: "client", edge: "authenticate" },
        { name: "Token endpoint", tech: "exchange code + code_verifier", icon: "lock", cat: "sec", edge: "auth code returned" },
        { name: "Tokens issued", tech: "access + id + refresh (JWT)", icon: "card", cat: "sec", edge: "verifier proves same client" },
        { name: "ASP.NET Core API", tech: "validate signature · scopes", icon: "api", cat: "api", edge: "Authorization: Bearer" },
      ]},
    { type: "callout", kind: "ok", title: "Why PKCE (Proof Key for Code Exchange)?",
      body: "A public client (SPA, mobile, desktop) can’t keep a secret. PKCE binds the authorization code to the exact client that started the flow: the client sends a hashed <code>code_challenge</code> up front, then the real <code>code_verifier</code> when redeeming the code. An attacker who intercepts the code can’t use it without the verifier. PKCE is now <b>required for all OAuth clients</b> (OAuth 2.1), and MSAL / most libraries enable it automatically — the <i>Implicit</i> flow it replaces is deprecated." },

    { type: "dropdown", title: "OAuth 2.0 / OIDC grant types — pick one", label: "OAuth grant", desc: "Which flow to use depends on the client and whether a user is present.", items: [
      { name: "Authorization Code + PKCE (SPA / mobile / web)", blocks: [
        { type: "para", body: [
          "<b>Use when:</b> a user is present in a browser or app that can’t hold a secret (Angular/React SPA, mobile, desktop). This is the default for first-party user-facing apps.",
          "<b>How it flows:</b> redirect to the IdP → user authenticates → short-lived <code>code</code> → exchanged (with the PKCE verifier) for tokens. No secret ever touches the browser." ]},
        { type: "code", lang: "typescript", label: "app.config.ts — MSAL (Entra ID), PKCE is automatic", code:
`// Authorization Code + PKCE for an Angular SPA via @azure/msal-angular
import { Configuration, LogLevel } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: '11111111-2222-3333-4444-555555555555',
    authority: 'https://login.microsoftonline.com/<tenant-id>',
    redirectUri: '/auth-callback',
    postLogoutRedirectUri: '/'
  },
  // sessionStorage, never localStorage — tokens die with the tab
  cache: { cacheLocation: 'sessionStorage' }
};

// MSAL emits response_type=code with code_challenge_method=S256.
// Request only the scopes you need:
export const protectedResources = {
  api: { scopes: ['api://assurance-api/audit.read', 'api://assurance-api/audit.write'] }
};` },
        { type: "code", lang: "csharp", label: "Program.cs — API validates the resulting access token", code:
`builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Authority exposes JWKS at /.well-known/openid-configuration
        options.Authority = "https://login.microsoftonline.com/<tenant-id>/v2.0";
        options.Audience  = "api://assurance-api";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,  // signing keys fetched + cached from JWKS
            ClockSkew                = TimeSpan.FromSeconds(30)
        };
    });` } ]},
      { name: "Client Credentials (service-to-service, no user)", blocks: [
        { type: "para", body: [
          "<b>Use when:</b> a daemon, worker, Function or API calls another API on <i>its own behalf</i> — no human involved. The client is confidential and authenticates with a secret or (better) a certificate.",
          "<b>Scope:</b> request <code>&lt;resource&gt;/.default</code> to get the app’s configured application permissions." ]},
        { type: "code", lang: "csharp", label: "ConfidentialClient.cs", code:
`// Worker/API authenticating as itself (MSAL confidential client)
var app = ConfidentialClientApplicationBuilder
    .Create(clientId)
    .WithCertificate(signingCert)      // prefer a cert over WithClientSecret in prod
    .WithAuthority($"https://login.microsoftonline.com/{tenantId}")
    .Build();

AuthenticationResult result = await app
    .AcquireTokenForClient(new[] { "api://assurance-api/.default" })
    .ExecuteAsync();                    // MSAL caches + auto-renews the token

http.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", result.AccessToken);` } ]},
      { name: "On-Behalf-Of (API → downstream API as the user)", blocks: [
        { type: "para", body: [
          "<b>Use when:</b> API A receives a user’s access token and must call API B <i>as that same user</i>, preserving their identity and permissions (not the app’s).",
          "<b>How:</b> exchange the incoming token for a new token scoped to the downstream API." ]},
        { type: "code", lang: "csharp", label: "OnBehalfOf.cs", code:
`// Inside API A — 'incomingToken' is the bearer token API A received
var obo = await app.AcquireTokenOnBehalfOf(
        new[] { "api://downstream-api/.default" },
        new UserAssertion(incomingToken))
    .ExecuteAsync();

// Call API B carrying the ORIGINAL user's identity, not the app's
downstream.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", obo.AccessToken);` } ]},
      { name: "Device Code (TV, CLI, IoT — no browser)", blocks: [
        { type: "para", body: [
          "<b>Use when:</b> the device has no browser or keyboard (smart TV, CLI tool, IoT). The user authenticates on a <i>second</i> device by entering a short code.",
          "<b>Example:</b> <code>az login</code>, GitHub CLI, PowerShell." ]},
        { type: "code", lang: "csharp", label: "DeviceCode.cs", code:
`var result = await app.AcquireTokenWithDeviceCode(scopes, cb =>
{
    // "To sign in, open https://microsoft.com/devicelogin and enter CODE ABCD-EFGH"
    Console.WriteLine(cb.Message);
    return Task.CompletedTask;
}).ExecuteAsync();

// The app polls the token endpoint until the user finishes on their phone.` } ]},
      { name: "Refresh token / silent renewal", blocks: [
        { type: "para", body: [
          "<b>Use when:</b> an access token (short-lived, ~1 hour) expires and you want a new one <i>without</i> prompting the user again. The long-lived refresh token is exchanged silently.",
          "<b>Rule:</b> keep access tokens short, rotate refresh tokens, and store them securely (httpOnly cookie via a BFF, or MSAL’s protected cache — never in <code>localStorage</code>)." ]},
        { type: "code", lang: "csharp", label: "SilentRenew.cs", code:
`try
{
    // Uses the cached refresh token — no UI
    result = await app.AcquireTokenSilent(scopes, account).ExecuteAsync();
}
catch (MsalUiRequiredException)
{
    // Refresh token expired/revoked → fall back to interactive sign-in
    result = await app.AcquireTokenInteractive(scopes).ExecuteAsync();
}` } ]},
      { name: "Implicit & ROPC (legacy — avoid)", blocks: [
        { type: "para", body: [
          "<b>Implicit flow</b> returned tokens directly in the URL fragment. It leaks tokens via history/referrer and has <i>no</i> refresh tokens — <b>deprecated; use Authorization Code + PKCE instead.</b>",
          "<b>Resource Owner Password Credentials (ROPC)</b> has the app collect the user’s raw username + password. It breaks MFA, SSO and federation — <b>never use it for interactive users;</b> only ever for tightly-controlled legacy automation, and even then prefer client credentials." ]},
        { type: "callout", kind: "warn", title: "Deprecated by OAuth 2.1",
          body: "Both Implicit and ROPC are removed in OAuth 2.1. If you see them in an old app, migrate to Authorization Code + PKCE (interactive) or Client Credentials (machine)." } ]},
    ]},

    { type: "tabs", title: "JWT — anatomy, validation & token types", tabs: [
      { label: "Anatomy", blocks: [
        { type: "para", body: [ "A JWT is three Base64URL parts joined by dots: <code>header.payload.signature</code>. The header + payload are <i>signed, not encrypted</i> — anyone can read them, but the signature proves they weren’t tampered with and came from the trusted issuer." ]},
        { type: "code", lang: "json", label: "decoded header", code:
`{ "alg": "RS256", "typ": "JWT", "kid": "a1b2c3-signing-key-id" }` },
        { type: "code", lang: "json", label: "decoded payload (claims)", code:
`{
  "sub":    "u-4821",                       // subject — the user/principal id
  "name":   "Jordan Auditor",
  "roles":  ["Auditor", "Finance"],         // app roles → RBAC
  "scp":    "audit.read audit.write",       // scopes → what the app may do
  "tenant": "acme-assurance",               // tenant for multi-tenant isolation
  "iss":    "https://login.microsoftonline.com/<tenant-id>/v2.0",
  "aud":    "api://assurance-api",
  "iat":    1793000000,
  "exp":    1793003600,                      // short-lived (~1h)
  "jti":    "f91c…"                          // unique id (replay / revocation)
}` },
        { type: "callout", kind: "info", title: "Signature vs encryption",
          body: "Standard JWTs are <b>signed</b> (JWS) — readable but tamper-evident. Never put secrets in a JWT. If the payload must be confidential, use an <b>encrypted</b> JWT (JWE) or keep sensitive data server-side and reference it by id." } ]},
      { label: "Validation (ASP.NET Core)", blocks: [
        { type: "para", body: [ "Validate <i>every</i> inbound token: signature (against the issuer’s JWKS), issuer, audience, and expiry. The <code>AddJwtBearer</code> middleware does this automatically from the <code>Authority</code>." ]},
        { type: "code", lang: "csharp", label: "Program.cs", code:
`builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.Authority = "https://login.microsoftonline.com/<tenant-id>/v2.0";
        o.Audience  = "api://assurance-api";
        o.MapInboundClaims = false;   // keep original claim names (scp, roles)
        o.TokenValidationParameters = new()
        {
            ValidateIssuerSigningKey = true,   // RS256 — key from JWKS, auto-rotated
            ValidateIssuer   = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
        o.Events = new JwtBearerEvents
        {
            OnTokenValidated = ctx => { /* extra checks: tenant, ban-list */ return Task.CompletedTask; }
        };
    });

var app = builder.Build();
app.UseAuthentication();   // 401 if token invalid
app.UseAuthorization();    // 403 if policy fails` } ]},
      { label: "Access vs ID vs Refresh", blocks: [
        { type: "table", head: ["Token", "Audience", "Purpose", "Lifetime"],
          rows: [
            ["<b>Access token</b>", "The API (resource)", "Authorize API calls — sent as <code>Bearer</code>", "Short (~1h)"],
            ["<b>ID token</b>", "The client app", "Prove the user signed in (OIDC) — read profile claims", "Short (session)"],
            ["<b>Refresh token</b>", "The IdP", "Silently obtain new access tokens", "Long, rotating"],
          ]},
        { type: "callout", kind: "warn", title: "Don’t confuse ID and access tokens",
          body: "APIs must only accept <b>access tokens</b> with the correct <code>aud</code>. Never send an ID token to an API, and never use an access token to read profile info in the client — that’s the ID token’s job." } ]},
    ]},

    { type: "tabs", title: "Key-based & other schemes", tabs: [
      { label: "API key", blocks: [
        { type: "para", body: [ "<b>Use for:</b> simple machine-to-machine access (partner integrations, webhooks, internal tools). A single opaque secret in a header. Store only a <i>hash</i> of each key; compare in constant time; scope and rotate keys per client." ]},
        { type: "code", lang: "csharp", label: "ApiKeyMiddleware.cs", code:
`app.Use(async (ctx, next) =>
{
    if (!ctx.Request.Headers.TryGetValue("X-Api-Key", out var provided)
        || !await _keys.IsValidAsync(provided))   // lookup by hash, constant-time compare
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
    }
    await next();
});
// Trade-off: no user context, no expiry by default. Prefer OAuth for anything richer.` } ]},
      { label: "HMAC signature", blocks: [
        { type: "para", body: [ "<b>Use for:</b> webhooks and partner APIs where you need <i>integrity + authenticity</i> without sending the secret. Both sides share a key; the caller signs a canonical request, the receiver recomputes and compares. A timestamp + nonce blocks replay." ]},
        { type: "code", lang: "csharp", label: "HmacSigning.cs", code:
`// Caller signs
var canonical = $"{method}\\n{path}\\n{timestamp}\\n{Sha256(body)}";
using var hmac = new HMACSHA256(Convert.FromBase64String(sharedSecret));
var signature = Convert.ToBase64String(
    hmac.ComputeHash(Encoding.UTF8.GetBytes(canonical)));

req.Headers.Add("X-Timestamp", timestamp);
req.Headers.Add("X-Signature", signature);

// Receiver: reject if |now - timestamp| > 5 min, then recompute + fixed-time compare.
// This is exactly how Stripe/GitHub webhook signatures work.` } ]},
      { label: "mTLS (client certificates)", blocks: [
        { type: "para", body: [ "<b>Use for:</b> high-trust service-to-service, B2B partners, or zero-trust networks. The client proves its identity with a certificate during the TLS handshake — no bearer token to steal. Often terminated at the gateway / ingress." ]},
        { type: "code", lang: "csharp", label: "Certificate auth", code:
`builder.Services
    .AddAuthentication(CertificateAuthenticationDefaults.AuthenticationScheme)
    .AddCertificate(o =>
    {
        o.AllowedCertificateTypes = CertificateTypes.Chained;
        o.RevocationMode = X509RevocationMode.Online;
        o.Events = new CertificateAuthenticationEvents
        {
            OnCertificateValidated = ctx =>
            {
                // Map thumbprint/subject → application principal + roles
                ctx.Principal = PrincipalFactory.For(ctx.ClientCertificate);
                ctx.Success();
                return Task.CompletedTask;
            }
        };
    });` } ]},
      { label: "Managed Identity", blocks: [
        { type: "para", body: [ "<b>Use for:</b> Azure-hosted workloads calling Azure resources (Key Vault, SQL, Service Bus, Storage) or your own APIs. Azure issues and rotates the identity — <b>zero secrets in code or config</b>. This is the preferred service-to-service auth on Azure." ]},
        { type: "code", lang: "csharp", label: "ManagedIdentity.cs", code:
`// DefaultAzureCredential uses Managed Identity in Azure,
// your dev login locally — same code everywhere, no secrets.
var credential = new DefaultAzureCredential();

// SDKs accept it directly:
var secrets = new SecretClient(new Uri(kvUri), credential);
var bus     = new ServiceBusClient(ns, credential);

// Or get a bearer token to call your own API:
var token = await credential.GetTokenAsync(
    new TokenRequestContext(new[] { "api://assurance-api/.default" }));` } ]},
      { label: "SAML 2.0 / WS-Fed", blocks: [
        { type: "para", body: [ "<b>Use for:</b> enterprise SSO with older relying parties and IdPs that speak XML (ADFS, many corporate apps). OIDC is preferred for new work, but SAML is still common for workforce SSO and must be supported for some partners." ]},
        { type: "code", lang: "csharp", label: "Sustainsys.Saml2 (middleware)", code:
`builder.Services.AddAuthentication()
    .AddSaml2(o =>
    {
        o.SPOptions.EntityId = new EntityId("https://assurance.example.com/saml");
        o.IdentityProviders.Add(new IdentityProvider(
            new EntityId("https://idp.partner.com/metadata"), o.SPOptions)
        { MetadataLocation = "https://idp.partner.com/metadata", LoadMetadata = true });
    });
// Claims arrive via the SAML assertion; map them to your app roles.` } ]},
      { label: "Basic / Windows (intranet)", blocks: [
        { type: "para", body: [
          "<b>Basic auth</b> (base64 username:password in a header) is only acceptable over TLS for simple internal tools — it has no MFA, no expiry, and sends credentials on every call. Prefer OAuth even internally.",
          "<b>Windows / Kerberos (Negotiate)</b> gives seamless SSO for domain-joined intranet apps — the browser authenticates the signed-in Windows user with no prompt." ]},
        { type: "code", lang: "csharp", label: "Negotiate (Windows auth)", code:
`builder.Services.AddAuthentication(NegotiateDefaults.AuthenticationScheme)
    .AddNegotiate();   // Kerberos/NTLM SSO for domain-joined clients` } ]},
    ]},

    { type: "dropdown", title: "Identity provider / SSO setup", label: "Provider", desc: "OIDC is a standard, so the API config barely changes between providers — only the authority and audience differ.", items: [
      { name: "Microsoft Entra ID (Azure AD) — workforce SSO", blocks: [
        { type: "para", body: [ "The default for <b>internal/workforce</b> identities: employees sign in with their corporate account, with Conditional Access, MFA and SSO across every app. Use <code>Microsoft.Identity.Web</code> for the tightest integration." ]},
        { type: "code", lang: "csharp", label: "Program.cs — Microsoft.Identity.Web", code:
`builder.Services
    .AddMicrosoftIdentityWebApiAuthentication(builder.Configuration, "AzureAd");

// appsettings.json
// "AzureAd": {
//   "Instance": "https://login.microsoftonline.com/",
//   "TenantId": "<tenant-id>",
//   "ClientId": "api://assurance-api",
//   "Audience": "api://assurance-api"
// }` } ]},
      { name: "Okta — workforce or customer", blocks: [
        { type: "para", body: [ "Okta is a standards-based OIDC/OAuth provider used for both workforce and customer identity. Because it’s OIDC, the API only needs Okta’s authority + audience." ]},
        { type: "code", lang: "csharp", label: "Program.cs — Okta via JwtBearer", code:
`builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.Authority = "https://dev-123456.okta.com/oauth2/default";
        o.Audience  = "api://assurance";   // the Okta Authorization Server audience
    });
// Angular: @okta/okta-angular + @okta/okta-auth-js (Authorization Code + PKCE).` } ]},
      { name: "Entra External ID / Azure AD B2C — public customers", blocks: [
        { type: "para", body: [ "For <b>public/consumer</b> users (sign-up/sign-in, social logins, password reset via user-flows). The authority points at the B2C/External-ID tenant and a specific user-flow policy." ]},
        { type: "code", lang: "csharp", label: "B2C authority", code:
`o.Authority =
  "https://acmecustomers.b2clogin.com/acmecustomers.onmicrosoft.com/B2C_1_signupsignin/v2.0";
o.Audience = "<b2c-api-client-id>";
// User-flows handle sign-up, MFA, social IdPs (Google/Apple/Facebook), self-service reset.` } ]},
      { name: "Auth0 — customer identity (CIAM)", blocks: [
        { type: "para", body: [ "Auth0 (now part of Okta) is a popular CIAM provider for public apps. Same OIDC story — point the API at the Auth0 domain and the API’s audience identifier." ]},
        { type: "code", lang: "csharp", label: "Auth0 via JwtBearer", code:
`o.Authority = "https://your-tenant.us.auth0.com/";
o.Audience  = "https://api.assurance.example.com";
// Auth0 Rules/Actions can enrich tokens with custom roles/permissions claims.` } ]},
      { name: "Generic OIDC / Keycloak / Ping", blocks: [
        { type: "para", body: [ "Any compliant OIDC provider (Keycloak, PingFederate, Cognito, Google) works the same way — discovery at <code>/.well-known/openid-configuration</code> supplies issuer, endpoints and JWKS." ]},
        { type: "code", lang: "csharp", label: "Generic OIDC", code:
`o.Authority = "https://keycloak.example.com/realms/assurance";
o.Audience  = "assurance-api";
// Middleware auto-discovers endpoints + signing keys from the Authority.` } ]},
    ]},

    { type: "table", title: "Who is signing in? — internal, external, public & workload",
      head: ["User type", "Who", "Identity store / IdP", "Protocol & controls", "Example"],
      rows: [
        ["<b>Internal (B2E / workforce)</b>", "Employees, auditors, admins", "Entra ID workforce tenant (or Okta Workforce)", "OIDC SSO + Conditional Access + MFA; app roles via security groups", "Staff / audit portal"],
        ["<b>External partner (B2B)</b>", "Users from another organisation", "Entra External ID B2B guests / cross-tenant / Okta Org2Org", "Guest invitation or federation; scoped roles", "Partner collaboration area"],
        ["<b>Public / consumer (B2C)</b>", "Customers, citizens, self-service", "Entra External ID for customers (Azure AD B2C) / Okta CIC / Auth0", "OIDC + social logins + self-service sign-up, reset, progressive MFA", "Public-facing self-service app"],
        ["<b>Workload (non-human)</b>", "Apps, daemons, Functions, CI/CD", "Managed Identity / app registration / workload identity federation", "Client credentials or federated creds; certificates, no passwords", "Service-to-service calls"],
      ]},
    { type: "flow", title: "One gateway, routed by identity type",
      diagramTitle: "Edge routes each caller to the right IdP & policy",
      steps: [
        { name: "Incoming request", tech: "browser · partner · service", icon: "globe", cat: "client" },
        { name: "API Gateway / WAF", tech: "TLS · rate-limit · route by audience", icon: "gateway", cat: "api", edge: "HTTPS" },
        { name: "Identity resolution", tech: "which tenant / IdP / scheme?", icon: "key", cat: "sec", edge: "inspect token / cert / key" },
        { name: "Authenticated principal", tech: "claims normalised", icon: "user", cat: "sec", edge: "401 if invalid" },
        { name: "Authorization policies", tech: "roles · scopes · tenant · ABAC", icon: "shield", cat: "app", edge: "403 if not permitted" },
        { name: "Business API", tech: "runs with least privilege", icon: "api", cat: "api", edge: "authorized" },
      ]},

    { type: "code", title: "Authorization — roles, scopes, policies & attribute (ABAC) checks", lang: "csharp", label: "authorization.cs", code:
`// Program.cs — declare policies
builder.Services.AddAuthorization(o =>
{
    // Role-based (RBAC) — coarse
    o.AddPolicy("Admins", p => p.RequireRole("Admin"));

    // Scope-based (OAuth) — what the CLIENT app may do
    o.AddPolicy("CanWriteAudit", p => p.RequireClaim("scp", "audit.write"));

    // Policy combining role + fine-grained permission
    o.AddPolicy("CanApprovePayment", p => p
        .RequireRole("AuditManager", "Finance")
        .RequireClaim("permissions", "payment:approve"));

    // Attribute-based (ABAC) — decision from a requirement handler
    o.AddPolicy("SameTenant", p => p.AddRequirements(new SameTenantRequirement()));
});

// Endpoint
[Authorize(Policy = "CanApprovePayment")]
[HttpPut("{id}/approve")]
public Task<IActionResult> Approve(Guid id) => _mediator.Send(new ApprovePayment(id));

// Record-level: every query is tenant-scoped (never trust client input for tenant)
query = query.Where(x => x.TenantId == _ctx.TenantId);` },

    { type: "vs", title: "Where do tokens live? — BFF cookies vs browser-held bearer tokens",
      left: { icon: "shield", title: "BFF + httpOnly cookie (recommended)", blocks: [
        { type: "featureList", items: [
          "Tokens stay <b>server-side</b>; browser only gets a secure, httpOnly, SameSite cookie",
          "Immune to token theft via XSS",
          "Backend-for-Frontend refreshes tokens; SPA never sees them",
          "Needs a small server component + CSRF protection" ]} ]},
      right: { icon: "card", title: "SPA holds bearer token", blocks: [
        { type: "featureList", variant: "cons", items: [
          "Token in JS memory / sessionStorage — reachable by XSS",
          "Simpler: no backend session component",
          "Must guard rigorously against XSS and keep lifetimes short",
          "Acceptable for lower-risk apps; avoid <code>localStorage</code>" ]} ]} },

    { type: "featureList", title: "Best practices", items: [
      "<b>Always HTTPS</b> — bearer tokens and keys are only as safe as the transport.",
      "<b>Validate every token</b> — signature, issuer, audience, expiry; never trust unsigned claims.",
      "<b>Short access tokens, rotating refresh tokens</b> — minimise the blast radius of theft.",
      "<b>PKCE for all interactive clients</b>; client credentials or managed identity for machines.",
      "<b>Least privilege</b> — request the narrowest scopes; authorize at endpoint <i>and</i> record level.",
      "<b>No secrets in the browser or source</b> — use Key Vault, Managed Identity and certificates.",
      "<b>Centralise identity</b> in one IdP (Entra ID / Okta) for SSO, MFA and a single revocation point.",
      "<b>Audit auth events</b> — log sign-ins, token issuance, 401/403s with correlation IDs.",
    ]},
    { type: "callout", kind: "warn", title: "Common anti-patterns to avoid",
      body: "Storing tokens in <code>localStorage</code>; accepting ID tokens at APIs; long-lived or non-rotating refresh tokens; API keys with no scope/expiry; the Implicit or ROPC flows; validating only expiry (not signature/issuer/audience); rolling your own crypto for JWTs; and trusting a client-supplied <code>tenant</code> or <code>role</code> claim without server-side enforcement." },
  ],
});
