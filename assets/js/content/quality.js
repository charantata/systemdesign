/* ============================================================
   Content — Quality Attributes group
   ============================================================ */
window.SECTIONS = window.SECTIONS || [];
var D = window.DETAILS;

/* ---------- 19 Failure & Resilience ---------- */
window.SECTIONS.push({
  id: "resilience", num: "19", group: "Quality Attributes", label: "Failure & Resilience",
  kicker: "Reliability", title: "Failure handling & resilience",
  sub: "In a distributed system, failure is normal — not exceptional. Every dependency will be slow, unavailable or duplicate a message eventually. Here is how each failure mode is detected and contained.",
  blocks: [
    { type: "caps", title: "Resilience toolkit", cols: 3, items: [
      { icon: "retry", cat: "ext", title: "Retry", desc: "Exponential backoff for transient faults." },
      { icon: "shield", cat: "sec", title: "Circuit Breaker", desc: "Stop hammering a failing dependency." },
      { icon: "cog", cat: "app", title: "Timeout", desc: "Fail fast instead of hanging threads." },
      { icon: "layers", cat: "app", title: "Bulkhead", desc: "Isolate pools so one dependency can't sink all." },
      { icon: "check", cat: "db", title: "Idempotency", desc: "Safe to re-process any message." },
      { icon: "alert", cat: "sec", title: "Dead-Letter", desc: "Park poison messages for controlled replay." },
    ]},
    { type: "table", title: "Failure scenarios & responses", head: ["Scenario", "Detection", "Response", "Recovery"], rows: [
      ["Service Bus unavailable", "Send/receive errors", "Outbox holds events; retry", "Auto-resume when bus returns; nothing lost"],
      ["Database unavailable", "Connection failures", "Retry policy; API returns 503", "Health-probe recovery; queued work drains"],
      ["KyrePay timeout", "HTTP timeout (8s)", "Polly retry → circuit breaker", "Breaker half-opens; saga waits/compensates"],
      ["KyrePay returns 500", "5xx response", "Retry transient; else mark failed", "Saga compensation cancels reservation"],
      ["Duplicate webhook", "EventId already seen", "No-op, return 200", "No effect — idempotent"],
      ["Duplicate SB message", "MessageId processed", "Skip; complete message", "No double processing"],
      ["Consumer crashes", "Lock expiry / liveness", "Message re-delivered", "Another instance picks it up"],
      ["API timeout", "Client / gateway timeout", "Idempotency-Key on retry", "Safe client retry; no duplicate"],
      ["SignalR disconnect", "Client heartbeat loss", "Auto-reconnect w/ backoff", "State re-synced on reconnect"],
      ["Poison message", "Max delivery exceeded", "Dead-letter + alert", "Fix + manual replay from DLQ"],
    ]},
    { type: "code", title: "Composed resilience policy (Polly)", lang: "csharp", label: "resilience.cs", code:
"services.AddHttpClient<IKyrePayClient, KyrePayClient>()\n  .AddPolicyHandler(Policy.TimeoutAsync<HttpResponseMessage>(8))          // timeout\n  .AddPolicyHandler(HttpPolicyExtensions.HandleTransientHttpError()\n      .WaitAndRetryAsync(3, a => TimeSpan.FromSeconds(Math.Pow(2, a))))   // retry\n  .AddPolicyHandler(HttpPolicyExtensions.HandleTransientHttpError()\n      .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)))                  // breaker\n  .AddPolicyHandler(Policy.BulkheadAsync<HttpResponseMessage>(20, 40));   // bulkhead" },
    { type: "callout", kind: "ok", title: "Graceful degradation", body: "When KyrePay's circuit is open, payments queue and the UI shows “payment pending” rather than failing the whole audit. Core assurance work continues; only the payment step waits. Failure is <b>contained, not cascaded</b>." },
  ],
});

/* ---------- 20 Observability ---------- */
window.SECTIONS.push({
  id: "observability", num: "20", group: "Quality Attributes", label: "Observability",
  kicker: "Operations", title: "Observability & distributed tracing",
  sub: "You cannot operate what you cannot see. Every request carries a correlation ID from the browser to the database and back, so any transaction can be reconstructed end-to-end.",
  blocks: [
    { type: "flow", title: "Telemetry pipeline",
      diagramTitle: "Structured logs → App Insights → dashboards",
      steps: [
        { name: "Application", tech: "structured logs + metrics", icon: "cog", cat: "app" },
        { name: "OpenTelemetry", tech: "traces · spans", icon: "flow", cat: "mon", edge: "instrument" },
        { name: "Application Insights", tech: "correlate & store", icon: "monitor", cat: "mon", edge: "export" },
        { name: "Azure Monitor", tech: "metrics · Log Analytics", icon: "monitor", cat: "mon", edge: "" },
        { name: "Dashboards & Alerts", tech: "SLOs · on-call", icon: "alert", cat: "sec", edge: "" },
      ]},
    { type: "flow", title: "One trace across the whole flow", desc: "The same correlation ID appears on every hop — the moment something breaks, you see exactly where.",
      diagramTitle: "Distributed trace",
      steps: [
        { name: "Angular", tech: "generates correlationId", icon: "angular", cat: "client" },
        { name: "API", tech: "span: create audit", icon: "api", cat: "api", edge: "traceparent" },
        { name: "Service Bus", tech: "span: publish", icon: "bus", cat: "msg", edge: "propagate" },
        { name: "Payment Service", tech: "span: charge", icon: "cog", cat: "app", edge: "" },
        { name: "KyrePay", tech: "external dependency", icon: "card", cat: "ext", edge: "X-Correlation-Id" },
        { name: "Webhook → Bus → DB", tech: "spans: settle", icon: "db", cat: "db", edge: "" },
      ]},
    { type: "table", title: "Signals captured on every operation", head: ["Field", "Purpose"], rows: [
      ["<code>CorrelationId</code>", "Ties the entire business flow together"],
      ["<code>TransactionId</code>", "Business identity of the audit transaction"],
      ["<code>TraceId / SpanId</code>", "W3C distributed trace correlation"],
      ["<code>MessageId</code>", "Message-level idempotency & tracking"],
      ["<code>UserId / TenantId</code>", "Who & which tenant (audit + security)"],
      ["<code>ServiceName / Duration / Status</code>", "Where time is spent and what failed"],
    ]},
    { type: "code", title: "Correlation-ID middleware", lang: "csharp", label: "CorrelationMiddleware.cs", code:
"public async Task Invoke(HttpContext ctx)\n{\n    var id = ctx.Request.Headers[\"X-Correlation-Id\"].FirstOrDefault()\n             ?? Activity.Current?.TraceId.ToString()\n             ?? Guid.NewGuid().ToString();\n    ctx.Response.Headers[\"X-Correlation-Id\"] = id;\n    using (_logger.BeginScope(new Dictionary<string,object> { [\"CorrelationId\"] = id }))\n        await _next(ctx);   // every downstream log line now carries the id\n}" },
  ],
});

/* ---------- Testing, Code Quality & Security Scanning ---------- */
window.SECTIONS.push({
  id: "testing-quality", group: "Quality Attributes", label: "Testing & Code Quality",
  kicker: "Quality Gates", title: "Testing, code quality & security scanning",
  sub: "Correctness and security are proven by automation, not opinion: NUnit + Moq unit tests with coverage, SonarQube static analysis as a merge-blocking quality gate, and Brinqa aggregating security findings across all scanners into one prioritised risk view. These gates plug directly into the CI/CD pipeline.",
  blocks: [
    { type: "flow", title: "The quality & security pipeline",
      diagramTitle: "PR → tests → SonarQube gate → Brinqa risk",
      legend: [ {cat:"client",label:"Dev"},{cat:"api",label:"CI"},{cat:"app",label:"Tests"},{cat:"sec",label:"Scan / gate"},{cat:"ext",label:"Risk"} ],
      steps: [
        { name: "Pull Request", tech: "feature → main", icon: "code", cat: "client" },
        { name: "CI build", tech: "GitHub Actions", icon: "cog", cat: "api", edge: "on PR / push" },
        { name: "NUnit + Moq + coverage", tech: "unit tests · coverlet", icon: "check", cat: "app", edge: "run tests" },
        { name: "SonarQube", tech: "bugs · vulns · smells · coverage", icon: "monitor", cat: "sec", edge: "quality gate (pass/fail)" },
        { name: "Security scanners", tech: "SAST · SCA · DAST · secrets", icon: "shield", cat: "sec", edge: "findings" },
        { name: "Brinqa", tech: "aggregate · dedupe · risk-score", icon: "shield", cat: "ext", edge: "unified risk posture" },
        { name: "Merge & Deploy", tech: "only if gates pass", icon: "rocket", cat: "app", edge: "gated", detail: null },
      ]},
    { type: "callout", kind: "info", title: "Two layers of quality", body: "<b>SonarQube</b> works at the <b>code level</b> — is this change well-built and free of bugs/vulnerabilities, with enough test coverage? <b>Brinqa</b> works at the <b>organisation level</b> — pulling findings from Sonar and every other scanner into one prioritised, de-duplicated view of security risk across all applications and assets." },

    { type: "tabs", title: "The three pillars", tabs: [

      { label: "NUnit + Moq", blocks: [
        { type: "para", body: "Unit tests exercise the domain and application handlers in isolation. <b>NUnit</b> is the test framework; <b>Moq</b> fakes the ports (repositories, bus, external clients) so a handler is tested without a database or network." },
        { type: "code", lang: "csharp", label: "ApproveAuditHandlerTests.cs", code:
"public class ApproveAuditHandlerTests\n{\n    private Mock<IAuditCaseRepository> _repo = default!;\n    private Mock<IUnitOfWork> _uow = default!;\n    private ApproveAuditHandler _sut = default!;\n\n    [SetUp]\n    public void SetUp()\n    {\n        _repo = new Mock<IAuditCaseRepository>();\n        _uow  = new Mock<IUnitOfWork>();\n        _sut  = new ApproveAuditHandler(_repo.Object, _uow.Object);\n    }\n\n    [Test]\n    public async Task Handle_WhenCaseInReview_ApprovesAndSavesOnce()\n    {\n        // Arrange\n        var aggregate = AuditCase.OpenForReview();\n        _repo.Setup(r => r.GetAsync(aggregate.Id, It.IsAny<CancellationToken>()))\n             .ReturnsAsync(aggregate);                       // stub the port\n\n        // Act\n        await _sut.Handle(new ApproveAuditCommand(aggregate.Id, Guid.NewGuid()),\n                          CancellationToken.None);\n\n        // Assert\n        Assert.That(aggregate.Status, Is.EqualTo(AuditStatus.Approved));\n        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);\n    }\n\n    [Test]\n    public void Handle_WhenCaseMissing_ThrowsAndNeverSaves()\n    {\n        _repo.Setup(r => r.GetAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))\n             .ReturnsAsync((AuditCase?)null);\n\n        Assert.ThrowsAsync<NotFoundException>(() =>\n            _sut.Handle(new ApproveAuditCommand(Guid.NewGuid(), Guid.NewGuid()),\n                        CancellationToken.None));\n\n        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);\n    }\n}" },
        { type: "code", lang: "csharp", label: "parameterized tests", code:
"[TestCase(AuditStatus.New)]\n[TestCase(AuditStatus.Approved)]\npublic void Approve_FromInvalidState_Throws(AuditStatus state)\n{\n    var c = AuditCase.WithStatus(state);\n    Assert.Throws<DomainException>(() => c.Approve(Guid.NewGuid()));\n}" },
        { type: "featureList", title: "Moq essentials", items: [
          "<code>Setup(...).Returns / ReturnsAsync</code> — stub what a dependency returns",
          "<code>Setup(...).Throws&lt;T&gt;()</code> — simulate failure paths",
          "<code>Verify(..., Times.Once/Never/Exactly)</code> — assert interactions happened",
          "<code>It.IsAny&lt;T&gt;()</code> / <code>It.Is&lt;T&gt;(x =&gt; …)</code> — argument matching",
          "<code>Callback(...)</code> — capture arguments passed to a mock",
          "<code>MockBehavior.Strict</code> — fail on any unexpected call" ]},
        { type: "callout", kind: "ok", title: "What to test (and mock)", body: "Test the <b>domain</b> (aggregate invariants) and <b>application handlers</b> — the code where bugs cost most. Mock only the <b>ports</b> (repositories, bus, external clients). Don't mock the domain itself. Integration tests (a real DB + Service Bus emulator) and contract tests cover the wiring." },
      ]},

      { label: "SonarQube", blocks: [
        { type: "para", body: "<b>SonarQube</b> (or SonarCloud, the SaaS version) runs static analysis on every PR and enforces a <b>Quality Gate</b> — a set of pass/fail conditions. If the gate fails, the required check is red and branch protection blocks the merge." },
        { type: "table", title: "What SonarQube measures", head: ["Dimension", "Detects"], rows: [
          ["<b>Reliability</b>", "Bugs — code that will likely fail at runtime"],
          ["<b>Security</b>", "Vulnerabilities + <b>Security Hotspots</b> (code to review)"],
          ["<b>Maintainability</b>", "Code smells & technical debt"],
          ["<b>Coverage</b>", "% of code covered by your tests (from coverlet)"],
          ["<b>Duplications</b>", "Copy-pasted blocks"],
        ]},
        { type: "code", lang: "bash", label: "SonarScanner in CI (.NET)", code:
"dotnet tool install --global dotnet-sonarscanner\n\ndotnet sonarscanner begin \\\n  /k:\"assurance-audit\" \\\n  /d:sonar.host.url=\"$SONAR_HOST\" \\\n  /d:sonar.token=\"$SONAR_TOKEN\" \\\n  /d:sonar.cs.opencover.reportsPaths=\"**/coverage.opencover.xml\"\n\ndotnet build -c Release\ndotnet test -c Release --collect:\"XPlat Code Coverage\"   # produces coverage\n\ndotnet sonarscanner end /d:sonar.token=\"$SONAR_TOKEN\"    # uploads + evaluates gate" },
        { type: "table", title: "A typical Quality Gate (on NEW code)", head: ["Condition", "Threshold"], rows: [
          ["Coverage on new code", "&ge; 80%"],
          ["New bugs", "0"],
          ["New vulnerabilities", "0"],
          ["Security hotspots reviewed", "100%"],
          ["Duplicated lines on new code", "&lt; 3%"],
          ["Maintainability rating", "A"],
        ]},
        { type: "callout", kind: "warn", title: "Gate on NEW code, not the whole repo", body: "\"Clean as You Code\": enforce the gate on the code changed in the PR, not the entire legacy codebase. New work stays clean without needing a big-bang cleanup of everything first. Wire the Sonar check into <b>required status checks</b> (see GitHub CI/CD & Deploy)." },
      ]},

      { label: "Code coverage", blocks: [
        { type: "para", body: "In .NET, <b>coverlet</b> collects coverage during <code>dotnet test</code> and emits a report (Cobertura / OpenCover) that SonarQube (and PR checks) consume." },
        { type: "code", lang: "bash", label: "coverage.sh", code:
"# Option A: built-in collector (Cobertura)\ndotnet test --collect:\"XPlat Code Coverage\"\n\n# Option B: coverlet.msbuild -> OpenCover (what Sonar reads)\ndotnet test /p:CollectCoverage=true \\\n            /p:CoverletOutputFormat=opencover \\\n            /p:CoverletOutput=./coverage.opencover.xml\n\n# Human-readable HTML report\ndotnet tool install --global dotnet-reportgenerator-globaltool\nreportgenerator -reports:**/coverage.*.xml -targetdir:coveragereport" },
        { type: "callout", kind: "info", title: "Coverage is a floor, not a goal", body: "80% coverage of <i>meaningful</i> assertions is far better than 100% that asserts nothing. Prioritise coverage of the <b>domain and handlers</b>; don't chase coverage on generated code, DTOs or Program.cs. Sonar's <b>coverage on new code</b> keeps the number honest over time." },
      ]},

      { label: "Brinqa", blocks: [
        { type: "para", body: "<b>Brinqa</b> is a Cyber Risk Posture / vulnerability-management platform. It <b>ingests findings from every security tool</b>, normalises and de-duplicates them, correlates them to assets and owners, applies risk-based prioritisation, and tracks remediation against SLAs — turning scattered scanner output into one actionable risk view for security and leadership." },
        { type: "table", title: "Sources Brinqa aggregates", head: ["Category", "Example tools"], rows: [
          ["SAST (static)", "<b>SonarQube</b>, Checkmarx, Fortify"],
          ["SCA (dependencies)", "Dependabot, Snyk, OWASP Dependency-Check"],
          ["DAST (running app)", "OWASP ZAP, Burp"],
          ["Secrets scanning", "GitHub secret scanning, Gitleaks"],
          ["Cloud / infra", "Defender for Cloud, Prisma, Tenable"],
          ["Pen tests & manual", "Imported findings / tickets"],
        ]},
        { type: "caps", title: "What Brinqa does with them", cols: 3, items: [
          { icon: "inbox", cat: "ext", title: "Aggregate & normalise", desc: "One schema across many scanners." },
          { icon: "check", cat: "db", title: "De-duplicate & correlate", desc: "One issue, not five; mapped to the asset & owner." },
          { icon: "scale", cat: "app", title: "Risk-based scoring", desc: "Prioritise by exploitability & business impact, not raw CVSS." },
          { icon: "retry", cat: "sec", title: "Remediation & SLAs", desc: "Assign, track and enforce fix deadlines." },
          { icon: "monitor", cat: "mon", title: "Dashboards & reporting", desc: "Posture over time for teams & leadership." },
          { icon: "cog", cat: "app", title: "Automation", desc: "Auto-ticket (Jira), notify owners, close on re-scan." },
        ]},
        { type: "callout", kind: "ok", title: "SonarQube feeds Brinqa", body: "SonarQube finds and gates security issues <i>in this codebase</i>; its findings (plus SCA, DAST, cloud, etc.) flow into <b>Brinqa</b>, which answers the bigger question — <i>\"across all our applications, what is our security risk and what do we fix first?\"</i>" },
      ]},

    ]},

    { type: "callout", kind: "ok", title: "How it ties into delivery", body: "These gates live in the pipeline (see <b>GitHub CI/CD & Deploy</b>): NUnit/Moq tests and the SonarQube Quality Gate are <b>required status checks</b> that block a merge to main; coverage proves correctness; and Brinqa gives an org-wide, prioritised security posture on top. Quality and security become automatic and non-negotiable, not a manual afterthought." },
  ],
});

/* ---------- Key Vault, Azure Logging & Blob ---------- */
window.SECTIONS.push({
  id: "platform-services", group: "Quality Attributes", label: "Key Vault · Logging · Blob",
  kicker: "Azure Platform Services", title: "Key Vault, Azure logging & Blob storage",
  sub: "The platform services that keep the system secure, observable and able to store large artefacts. All three are accessed with a Managed Identity — no keys or connection strings in configuration.",
  blocks: [
    { type: "flow", title: "How the app uses each service",
      diagramTitle: "One Managed Identity → three platform services",
      legend: [ {cat:"app",label:"App"},{cat:"sec",label:"Secrets"},{cat:"mon",label:"Logging"},{cat:"db",label:"Storage"} ],
      steps: [
        { name: "App Service / AKS", tech: "Managed Identity", icon: "cog", cat: "app", detail: D.managedIdentity },
        { edge: "authenticate with the same identity (no secrets)", parallel: [
          { name: "Key Vault", tech: "secrets · keys · certs", icon: "key", cat: "sec" },
          { name: "App Insights / Monitor", tech: "logs · traces · metrics", icon: "monitor", cat: "mon" },
          { name: "Blob Storage", tech: "documents · reports", icon: "inbox", cat: "db" },
        ]},
      ]},
    { type: "tabs", title: "Each service in detail", tabs: [
      { label: "Key Vault", blocks: [
        { type: "para", body: "Central, audited store for secrets, encryption keys and TLS certificates. The app reads secrets at startup via the Key Vault configuration provider using its Managed Identity — so <code>IConfiguration</code> transparently contains vault-backed values with no secrets on disk." },
        { type: "code", lang: "csharp", label: "keyvault-config.cs", code:
"// Load Key Vault secrets straight into IConfiguration (Managed Identity)\nbuilder.Configuration.AddAzureKeyVault(\n    new Uri(\"https://assurance-kv.vault.azure.net/\"),\n    new DefaultAzureCredential());\n\n// Anywhere in the app — no idea it came from a vault:\nvar kyreKey = builder.Configuration[\"KyrePay--ApiKey\"];\n\n// Or resolve on demand\nvar client = new SecretClient(\n    new Uri(\"https://assurance-kv.vault.azure.net/\"),\n    new DefaultAzureCredential());\nKeyVaultSecret secret = await client.GetSecretAsync(\"KyrePay-ApiKey\");" },
        { type: "featureList", title: "What it gives us", variant: "pros", items: [
          "No secrets in source, config files or environment variables",
          "Access controlled by Azure RBAC + vault access policies",
          "Automatic secret rotation with versioning",
          "Full audit log of every secret access",
          "Backs TLS certs and data-encryption keys" ]},
        { type: "callout", kind: "warn", title: "Least privilege", body: "The app identity is granted only <b>Key Vault Secrets User</b> (read secrets), never management rights. Rotation and secret creation are done by a separate operations identity or pipeline." },
      ]},
      { label: "Azure Logging", blocks: [
        { type: "para", body: "Structured logging flows through <code>ILogger</code> to Application Insights and Azure Monitor / Log Analytics, correlated by the same correlation & trace IDs used everywhere. Logs are queryable with KQL and drive dashboards and alerts (see Observability)." },
        { type: "code", lang: "csharp", label: "logging.cs", code:
"// Wire up App Insights + OpenTelemetry\nbuilder.Services.AddApplicationInsightsTelemetry();\nbuilder.Logging.AddOpenTelemetry(o => o.AddAzureMonitorLogExporter());\n\n// Structured logging — fields become queryable columns, not string soup\n_logger.LogInformation(\n    \"Payment {Status} for {TransactionId} amount {Amount} corr {CorrelationId}\",\n    result.Status, tx.TransactionId, tx.Amount, ctx.CorrelationId);\n\n// Levels used deliberately:\n// Trace/Debug -> dev only, Information -> business milestones,\n// Warning -> recoverable/degraded, Error -> failed operation, Critical -> outage" },
        { type: "code", lang: "sql", label: "KQL — errors by correlation", code:
"// Log Analytics (KQL): trace one transaction end-to-end\ntraces\n| where customDimensions.CorrelationId == 'c-8842'\n| project timestamp, severityLevel, message, operation_Name\n| order by timestamp asc;\n\n// Failure rate over the last hour\nrequests\n| where timestamp > ago(1h)\n| summarize failRate = 100.0*countif(success==false)/count() by bin(timestamp, 5m)" },
        { type: "featureList", title: "Captured & correlated", variant: "pros", items: [
          "Structured fields (CorrelationId, TransactionId, UserId, Duration)",
          "Distributed traces across API → bus → KyrePay → DB",
          "Metrics & KQL-queryable logs in Log Analytics",
          "Alerts on SLOs, error rate and DLQ depth" ]},
      ]},
      { label: "Blob Storage", blocks: [
        { type: "para", body: "Large artefacts — uploaded audit documents and generated reports — belong in Blob Storage, not the database. The app reads/writes blobs with its Managed Identity; end-users receive time-limited download links via short-lived <b>user-delegation SAS</b>, so the storage account is never public." },
        { type: "code", lang: "csharp", label: "blob.cs", code:
"var svc = new BlobServiceClient(\n    new Uri(\"https://assurancesa.blob.core.windows.net\"),\n    new DefaultAzureCredential());               // Managed Identity — no account key\n\nvar container = svc.GetBlobContainerClient(\"audit-reports\");\nvar blob = container.GetBlobClient($\"{tenantId}/{transactionId}.pdf\");\n\n// Upload the generated report\nawait blob.UploadAsync(stream, new BlobUploadOptions {\n    HttpHeaders = new BlobHttpHeaders { ContentType = \"application/pdf\" }\n}, ct);\n\n// Hand the user a time-limited, read-only link (user-delegation SAS)\nvar udk = await svc.GetUserDelegationKeyAsync(DateTimeOffset.UtcNow,\n                                              DateTimeOffset.UtcNow.AddMinutes(15));\nvar sas = new BlobSasBuilder(BlobSasPermissions.Read,\n              DateTimeOffset.UtcNow.AddMinutes(15)) { BlobContainerName = \"audit-reports\",\n              BlobName = blob.Name }\n    .ToSasQueryParameters(udk, \"assurancesa\").ToString();\nvar downloadUrl = $\"{blob.Uri}?{sas}\";" },
        { type: "featureList", title: "Storage practices", variant: "pros", items: [
          "Managed Identity access — no account keys in use",
          "Private endpoint; no public/anonymous access",
          "User-delegation SAS for short-lived, scoped downloads",
          "Lifecycle policy tiers cold data Hot → Cool → Archive",
          "GRS/RA-GRS replication for DR (see Disaster Recovery)" ]},
      ]},
    ]},
    { type: "callout", kind: "ok", title: "The common thread: Managed Identity", body: "Key Vault, Application Insights and Blob Storage are all reached with the app's <b>Managed Identity</b> and governed by Azure RBAC — exactly as the database is (see EF Core &amp; Dapper). One identity model, least privilege per service, and <b>zero secrets in configuration</b>." },
  ],
});

/* ---------- 21 Scalability ---------- */
window.SECTIONS.push({
  id: "scalability", num: "21", group: "Quality Attributes", label: "Scalability",
  kicker: "Scale", title: "How the platform scales",
  sub: "Every tier scales independently. Because processing is asynchronous and stateless, scaling is mostly a matter of adding consumers and letting the queue level the load.",
  blocks: [
    { type: "table", title: "Scaling strategy per tier", head: ["Tier", "Strategy", "Mechanism"], rows: [
      ["Angular UI", "Edge caching", "CDN / Azure Front Door — static, stateless"],
      ["APIs", "Horizontal scale", "Stateless instances behind App Gateway; autoscale on CPU/RPS"],
      ["Service Bus", "Throughput units", "Premium messaging units; partitioned entities"],
      ["Consumers", "Competing consumers", "Add Worker/Function instances; scale on queue depth"],
      ["Database", "Read scale + partition", "Read replicas, indexing, partitioning; Dapper hot paths"],
      ["Cache", "Offload reads", "Redis for reference data & idempotency"],
      ["SignalR", "Backplane", "Azure SignalR Service across all API nodes"],
    ]},
    { type: "callout", kind: "ok", title: "Queue-based load leveling", body: "Under a spike, the API keeps accepting requests and the Service Bus queue simply grows. Consumers drain it at a sustainable rate and autoscale on depth. The database is never hammered by the peak — the queue absorbs it. This is the single most important scalability property of the design." },
    { type: "caps", title: "Scaling dimensions", cols: 4, items: [
      { icon: "scale", cat: "app", title: "Horizontal", desc: "Add stateless instances — the default lever." },
      { icon: "cog", cat: "app", title: "Vertical", desc: "Bigger SKU for DB / stateful tiers." },
      { icon: "bolt", cat: "func", title: "Auto-scale", desc: "Rules on CPU, RPS and queue depth." },
      { icon: "queue", cat: "msg", title: "Load leveling", desc: "Queue absorbs spikes; consumers pace." },
    ]},
    { type: "metrics", title: "Illustrative scale profile", desc: "Example targets — configurable per client SLA (see NFR Dashboard).", items: [
      { label: "API instances (autoscale range)", value: "2 → 30", pct: 70 },
      { label: "Consumer concurrency per instance", value: "10–50 msgs", pct: 55 },
      { label: "Peak absorbed by queue", value: "10× steady", pct: 90 },
      { label: "Cache hit ratio (reference data)", value: "~95%", pct: 95 },
    ]},
  ],
});

/* ---------- Scaling for Maximum Load ---------- */
window.SECTIONS.push({
  id: "max-load", group: "Quality Attributes", label: "Scaling for Max Load",
  kicker: "Capacity & Throughput", title: "Scaling to attain maximum load",
  sub: "Scaling means adding capacity so the platform keeps meeting its latency and error targets as demand grows. 'Maximum load' is not a guess — it is the highest sustained throughput the system can carry within SLO, found by removing bottlenecks one at a time and proven by load testing.",
  blocks: [
    { type: "callout", kind: "info", title: "What 'scaling' actually means here", body: "Two levers. <b>Vertical scaling (scale up)</b> gives a resource more power — a bigger VM/DB SKU. <b>Horizontal scaling (scale out)</b> adds more instances of a stateless resource behind a load balancer. This platform is built to scale <b>out</b> — APIs, consumers and the read side are stateless, so capacity is added by adding instances, and the Service Bus queue absorbs spikes while they catch up." },
    { type: "vs", title: "The two levers",
      left: { icon: "cog", title: "Vertical (scale up)", blocks: [
        { type: "featureList", variant: "pros", items: ["Simple — no code or topology change", "Right for stateful tiers (databases)"] },
        { type: "featureList", variant: "cons", items: ["Hard ceiling — the biggest SKU is a wall", "Downtime/failover to resize", "Cost grows faster than capacity"] },
      ]},
      right: { icon: "scale", title: "Horizontal (scale out)", blocks: [
        { type: "featureList", variant: "pros", items: ["Near-linear capacity by adding instances", "No single ceiling; commodity sizing", "Fault isolation — lose one, keep serving", "The default lever for stateless tiers"] },
        { type: "featureList", variant: "cons", items: ["Requires statelessness + a load balancer", "Contention on shared resources caps gains"] },
      ]},
    },
    { type: "flow", title: "The load journey — what engages at each level", desc: "As demand rises, different mechanisms carry it. Nothing has to fail for the system to reach its peak.",
      diagramTitle: "Baseline → peak → burst",
      legend: [ {cat:"db",label:"Steady"},{cat:"msg",label:"Absorb"},{cat:"app",label:"Scale-out"},{cat:"ext",label:"Protect"} ],
      steps: [
        { name: "Baseline load", tech: "min instances · warm", icon: "monitor", cat: "db" },
        { name: "Expected peak", tech: "autoscale adds instances", icon: "scale", cat: "app", edge: "CPU / RPS / queue-depth rules" },
        { name: "Sudden burst", tech: "queue absorbs the spike", icon: "queue", cat: "msg", edge: "load leveling", detail: D.servicebus },
        { name: "Beyond capacity", tech: "throttle + shed load gracefully", icon: "shield", cat: "ext", edge: "rate limit / 429" },
      ]},
    { type: "flow", title: "Reaching maximum load = removing the bottleneck", desc: "Throughput is capped by the single most constrained resource. You find it, remove it, and the ceiling moves — repeat until you hit the target (Theory of Constraints).",
      diagramTitle: "Iterative bottleneck removal",
      steps: [
        { name: "Load test to failure", tech: "push until SLO breaks", icon: "bolt", cat: "app" },
        { name: "Find the constraint", tech: "which resource saturates first?", icon: "monitor", cat: "mon", edge: "metrics + traces" },
        { name: "Remove it", tech: "scale / index / cache / pool", icon: "cog", cat: "app", edge: "targeted fix" },
        { name: "New higher ceiling", tech: "re-test — constraint has moved", icon: "scale", cat: "db", edge: "repeat" },
      ]},
    { type: "table", title: "Common bottlenecks & how this design removes them", head: ["Bottleneck", "Symptom", "Remedy in this platform"], rows: [
      ["API CPU / threads", "Rising p95, CPU > 75%", "Autoscale out; async I/O everywhere (no thread blocking)"],
      ["Database connections", "Pool exhaustion, timeouts", "Connection pooling; Dapper reads on replicas; CQRS offload"],
      ["Database throughput", "DTU/CPU saturated", "Indexing, partitioning, read replicas, Redis cache"],
      ["Hot read queries", "Repeated expensive reads", "Redis cache-aside (see Redis &amp; CQRS)"],
      ["Downstream (KyrePay)", "Latency spikes, 5xx", "Async via bus; circuit breaker; bulkhead isolates it"],
      ["Consumer lag", "Queue depth climbing", "Scale consumers on queue depth; raise prefetch/concurrency"],
      ["SignalR fan-out", "Connection limits", "Azure SignalR Service backplane"],
    ]},
    { type: "table", title: "Autoscale rules (illustrative)", head: ["Tier", "Signal", "Scale-out trigger", "Action"], rows: [
      ["API (App Service/AKS)", "CPU %, requests/sec", "CPU > 70% for 5 min", "+2 instances (to max 30)"],
      ["Payment consumers", "Service Bus queue depth", "Depth > 1,000 msgs", "+1 consumer per 1k backlog"],
      ["Functions", "Event/queue volume", "automatic (event-driven)", "Scale to demand; to zero when idle"],
      ["Read replicas", "Replica CPU, read RPS", "sustained > 70%", "Add replica; route more reads"],
      ["All tiers", "cool-down", "load normal for 10 min", "Scale in one step at a time"],
    ]},
    { type: "code", title: "Autoscale on queue depth (Bicep / KEDA-style)", lang: "csharp", label: "autoscale.rule", code:
"// KEDA ScaledObject — scale payment consumers by Service Bus backlog\ntriggers:\n  - type: azure-servicebus\n    metadata:\n      topicName: audit-events\n      subscriptionName: payment-sub\n      messageCount: \"1000\"      // add a replica per 1000 queued messages\nminReplicaCount: 2\nmaxReplicaCount: 50\ncooldownPeriod: 300            // scale in gently after load subsides" },
    { type: "tabs", title: "Prove the maximum with load testing", tabs: [
      { label: "Test types", blocks: [
        { type: "table", head: ["Test", "Question it answers"], rows: [
          ["<b>Load</b>", "Does it meet SLO at the expected peak?"],
          ["<b>Stress</b>", "Where does it break — the true maximum?"],
          ["<b>Spike</b>", "Can it absorb a sudden 10× surge? (queue leveling)"],
          ["<b>Soak</b>", "Does it hold for hours without leaks/degradation?"],
        ]},
        { type: "callout", kind: "warn", title: "Maximum load is measured, not assumed", body: "The only credible 'max load' number comes from a <b>stress test to failure</b> against production-like infrastructure. Everything else is a projection. We establish it during the Performance Testing phase and re-check it after significant changes." },
      ]},
      { label: "Load test script", blocks: [
        { type: "code", lang: "typescript", label: "k6 stress test", code:
"import http from 'k6/http';\nimport { check } from 'k6';\n\nexport const options = {\n  stages: [\n    { duration: '2m',  target: 200 },   // ramp to expected peak\n    { duration: '5m',  target: 200 },   // hold  (load test)\n    { duration: '3m',  target: 2000 },  // push to failure (stress)\n    { duration: '2m',  target: 0 },     // recover\n  ],\n  thresholds: {\n    http_req_duration: ['p(95)<200'],   // SLO: p95 under 200ms\n    http_req_failed:   ['rate<0.01'],   // < 1% errors\n  },\n};\n\nexport default function () {\n  const res = http.post('https://api/audit', payload, { headers });\n  check(res, { 'accepted': (r) => r.status === 201 });\n}" },
      ]},
    ]},
    { type: "code", title: "Capacity planning — Little's Law", lang: "bash", label: "capacity.txt", code:
"# Little's Law:  concurrency = throughput x latency\n#\n# Target: 2,000 requests/sec at 150ms average service time\n#   required in-flight concurrency = 2000 req/s x 0.150 s = 300 concurrent\n#\n# If one API instance handles ~40 concurrent requests within SLO:\n#   instances needed = 300 / 40 = 8  (then add headroom + N+1 for HA => ~10)\n#\n# Validate the number with a load test — models set the target, tests confirm it." },
    { type: "callout", kind: "info", title: "Why more instances ≠ infinite throughput", body: "The <b>Universal Scalability Law</b> says throughput gains flatten (and can reverse) as shared-resource <b>contention</b> and <b>coherency</b> costs grow. This architecture pushes that ceiling far out by minimising sharing: stateless compute, <b>queue-based load leveling</b> instead of synchronous chains, CQRS to keep reads off the write DB, caching, and sharding by tenant when needed. The less the tiers contend, the closer scaling stays to linear." },
    { type: "kpis", title: "Illustrative maximum-load profile", cols: 4, items: [
      { val: "10×", label: "Spike absorbed by queue", note: "vs steady state" },
      { val: "2 → 30", label: "API autoscale range", note: "instances" },
      { val: "2 → 50", label: "Consumer autoscale range", note: "on queue depth" },
      { val: "p95 ≤ 200ms", label: "Held at peak", note: "example SLO target" },
    ]},
    { type: "callout", kind: "ok", title: "In one line", body: "Design stateless + asynchronous so you can scale <b>out</b>; let the queue absorb bursts; find and remove the current bottleneck; and <b>prove</b> the maximum with a stress test rather than claiming it. That is how the platform reaches — and sustains — maximum load within SLO." },
  ],
});

/* ---------- 22 Disaster Recovery ---------- */
window.SECTIONS.push({
  id: "dr", num: "22", group: "Quality Attributes", label: "Disaster Recovery",
  kicker: "Business Continuity", title: "Disaster recovery & continuity",
  sub: "Regional resilience for a platform that handles regulated financial and audit data. The strategy balances recovery objectives against cost with an active-passive, multi-region design.",
  blocks: [
    { type: "flow", title: "Multi-region topology",
      diagramTitle: "Primary → secondary failover",
      steps: [
        { name: "Azure Front Door", tech: "global health-based routing", icon: "globe", cat: "client" },
        { edge: "active / passive", parallel: [
          { name: "Primary Region", tech: "live traffic", icon: "cloud", cat: "api" },
          { name: "Secondary Region", tech: "warm standby", icon: "cloud", cat: "app" },
        ]},
        { name: "Data replication", tech: "geo-replica + GRS storage", icon: "db", cat: "db", edge: "continuous", detail: D.database },
        { name: "Failover", tech: "promote secondary", icon: "retry", cat: "ext", edge: "automated + runbook" },
      ]},
    { type: "kpis", title: "Recovery objectives (example targets)", cols: 4, items: [
      { val: "RTO ≤ 30m", label: "Recovery Time Objective", note: "Time to restore service" },
      { val: "RPO ≤ 5m", label: "Recovery Point Objective", note: "Max acceptable data loss" },
      { val: "GRS", label: "Storage replication", note: "Geo-redundant reports/docs" },
      { val: "IaC", label: "Redeploy from code", note: "Bicep — rebuild anywhere" },
    ]},
    { type: "featureList", title: "DR building blocks", items: [
      "<b>SQL / PostgreSQL:</b> automated backups + geo-replicas; point-in-time restore.",
      "<b>Service Bus:</b> Premium geo-DR namespace pairing for metadata failover.",
      "<b>Storage:</b> GRS/RA-GRS replication of documents and generated reports.",
      "<b>Compute:</b> stateless — redeploy to secondary via Infrastructure-as-Code (Bicep).",
      "<b>Outbox:</b> guarantees in-flight events survive failover — no lost work.",
      "<b>Runbooks + game days:</b> failover is rehearsed, not theoretical." ]},
    { type: "callout", kind: "info", title: "Why stateless compute matters for DR", body: "Because APIs and consumers hold no durable state, disaster recovery reduces to <b>data replication + redeploy</b>. The hard part (state) is handled by managed data services with geo-replication; the easy part (compute) is recreated from code in minutes." },
  ],
});

/* ---------- 23 NFR Dashboard ---------- */
window.SECTIONS.push({
  id: "nfr", num: "23", group: "Quality Attributes", label: "NFR Dashboard",
  kicker: "Non-Functional Requirements", title: "Non-functional requirements",
  sub: "The quality attributes the architecture is designed to meet. The numbers below are example architecture targets — they are configurable per client SLA and workload, not guarantees.",
  blocks: [
    { type: "callout", kind: "warn", title: "About these targets", body: "The values shown are <b>illustrative architecture targets</b> to demonstrate the shape of the SLOs, not committed figures. Real targets are set with you during Discovery based on volume, criticality and budget." },
    { type: "kpis", cols: 5, items: [
      { val: "≤ 200ms", label: "API p95 latency", note: "read paths, example" },
      { val: "99.9%", label: "Availability", note: "configurable to 99.95%" },
      { val: "≤ 30m", label: "RTO", note: "recovery time" },
      { val: "≤ 5m", label: "RPO", note: "data loss window" },
      { val: "< 0.1%", label: "Error rate", note: "4xx excl." },
    ]},
    { type: "table", title: "NFR categories", head: ["Category", "Target (example)", "How the architecture delivers it"], rows: [
      ["Performance", "p95 ≤ 200ms reads", "Dapper hot paths, Redis cache, async writes"],
      ["Scalability", "10× spike absorbed", "Queue-based load leveling; horizontal scale"],
      ["Availability", "99.9%+", "Zone-redundant services; health probes; retries"],
      ["Reliability", "No lost messages", "Outbox + at-least-once + idempotency"],
      ["Security", "Zero critical findings", "OIDC, RBAC, Key Vault, WAF, audit trail"],
      ["Maintainability", "Change isolation", "Clean Architecture; high test coverage"],
      ["Observability", "MTTD < 5m", "Correlated traces, metrics, alerts"],
      ["Disaster Recovery", "RTO 30m / RPO 5m", "Multi-region, geo-replication, IaC"],
      ["Compliance", "Full audit trail", "Immutable AuditLog; data residency by tenant"],
      ["Auditability", "Replayable history", "Event log + correlation across the flow"],
    ]},
    { type: "metrics", title: "Quality attribute coverage", items: [
      { label: "Reliability (messaging guarantees)", value: "Strong", pct: 92 },
      { label: "Security posture", value: "Defence-in-depth", pct: 90 },
      { label: "Observability", value: "Full-trace", pct: 88 },
      { label: "Scalability headroom", value: "High", pct: 86 },
      { label: "Maintainability", value: "High", pct: 84 },
    ]},
  ],
});
