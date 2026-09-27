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
