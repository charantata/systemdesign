/* ============================================================
   Content — Saga & Outbox (dedicated deep-dives)
   ============================================================ */
window.SECTIONS = window.SECTIONS || [];
var D = window.DETAILS;

/* ---------- 09 Saga ---------- */
window.SECTIONS.push({
  id: "saga", num: "09", group: "Patterns", label: "Saga Pattern",
  kicker: "Distributed Transactions", title: "Saga pattern — long-running transactions",
  sub: "A distributed audit-and-payment transaction spans several services. A two-phase commit across them is impractical, so we use a Saga: a sequence of local transactions where each step has a compensating action that undoes it if a later step fails.",
  blocks: [
    { type: "flow", title: "The happy path", desc: "Five local transactions form one business transaction.",
      diagramTitle: "Audit payment saga",
      steps: [
        { name: "Create Audit Case", tech: "local tx 1", icon: "doc", cat: "domain" },
        { name: "Reserve Payment", tech: "local tx 2", icon: "card", cat: "ext", edge: "AuditCaseCreated" },
        { name: "Process Payment", tech: "local tx 3 · KyrePay", icon: "card", cat: "ext", edge: "PaymentReserved" },
        { name: "Generate Report", tech: "local tx 4", icon: "book", cat: "app", edge: "PaymentProcessed" },
        { name: "Notify User", tech: "local tx 5 · SignalR", icon: "signalr", cat: "mon", edge: "ReportGenerated" },
      ]},
    { type: "flow", title: "Compensation on failure", desc: "If Process Payment fails, previously-completed steps are undone in reverse.",
      diagramTitle: "Compensating transactions",
      steps: [
        { name: "Cancel Payment", tech: "compensate tx 2", icon: "retry", cat: "ext" },
        { name: "Rollback Audit Case", tech: "compensate tx 1", icon: "retry", cat: "domain", edge: "PaymentCancelled" },
        { name: "Notify Failure", tech: "SignalR + Ops", icon: "alert", cat: "sec", edge: "AuditRolledBack" },
      ]},
    { type: "vs", title: "Two ways to coordinate a saga",
      left: { icon: "cog", title: "Orchestration", blocks: [
        { type: "para", body: "A central <b>Saga Orchestrator</b> owns the workflow and tells each service what to do next. State is explicit and easy to observe." },
        { type: "featureList", variant: "pros", items: ["Centralised, visible workflow & state", "Straightforward compensation logic", "Easier to change the process"] },
        { type: "featureList", variant: "cons", items: ["Orchestrator is a critical component", "Risk of it becoming a 'god' service"] },
      ]},
      right: { icon: "saga", title: "Choreography", blocks: [
        { type: "para", body: "No central coordinator — each service reacts to events and emits the next event. <code>A → event → B → event → C</code>." },
        { type: "featureList", variant: "pros", items: ["Fully decoupled services", "No single bottleneck"] },
        { type: "featureList", variant: "cons", items: ["Workflow is implicit / harder to trace", "Compensation logic is scattered", "Cyclic-dependency risk"] },
      ]},
    },
    { type: "callout", kind: "ok", title: "Our choice", body: "We use <b>orchestration</b> for the payment saga (money movement needs a clear, auditable, centrally-observable workflow) and <b>choreography</b> for lightweight fan-out like notifications and reporting. The two styles coexist on the same Service Bus." },
    { type: "code", title: "Saga state (persisted)", lang: "csharp", label: "SagaState.cs", code:
"public class AuditPaymentSaga\n{\n    public Guid   Id            { get; set; }\n    public string CorrelationId { get; set; } = default!;\n    public string TransactionId { get; set; } = default!;\n    public SagaStep CurrentStep { get; set; } = SagaStep.CreateAuditCase;\n    public SagaStatus Status    { get; set; } = SagaStatus.Running;\n    public int    RetryCount    { get; set; }\n    public string? LastError    { get; set; }\n    public DateTime UpdatedAt   { get; set; }\n}\n\npublic enum SagaStep { CreateAuditCase, ReservePayment, ProcessPayment, GenerateReport, NotifyUser, Done }\npublic enum SagaStatus { Running, Compensating, Completed, Failed }" },
    { type: "code", title: "Orchestrator (production-shaped)", lang: "csharp", label: "AuditSagaOrchestrator.cs", code:
"public async Task HandleAsync(SagaMessage msg, CancellationToken ct)\n{\n    var saga = await _store.LoadAsync(msg.CorrelationId, ct);\n    try\n    {\n        switch (saga.CurrentStep)\n        {\n            case SagaStep.CreateAuditCase:\n                await _audit.CreateCaseAsync(saga.TransactionId, ct);\n                await Advance(saga, SagaStep.ReservePayment, ct); break;\n            case SagaStep.ReservePayment:\n                await _payments.ReserveAsync(saga.TransactionId, ct);\n                await Advance(saga, SagaStep.ProcessPayment, ct); break;\n            case SagaStep.ProcessPayment:\n                await _payments.ProcessAsync(saga.TransactionId, ct);\n                await Advance(saga, SagaStep.GenerateReport, ct); break;\n            case SagaStep.GenerateReport:\n                await _reports.GenerateAsync(saga.TransactionId, ct);\n                await Advance(saga, SagaStep.NotifyUser, ct); break;\n            case SagaStep.NotifyUser:\n                await _notify.SuccessAsync(saga.TransactionId, ct);\n                saga.Status = SagaStatus.Completed; break;\n        }\n        await _store.SaveAsync(saga, ct);\n    }\n    catch (Exception ex)\n    {\n        await CompensateAsync(saga, ex, ct); // reverse completed steps\n    }\n}" },
  ],
});

/* ---------- 10 Outbox ---------- */
window.SECTIONS.push({
  id: "outbox", num: "10", group: "Patterns", label: "Outbox Pattern",
  kicker: "Reliable Publishing", title: "Transactional Outbox pattern",
  sub: "The dual-write problem: you must update the database and publish an event, but you cannot do both atomically across two systems. The Outbox pattern makes the event part of the same database transaction, then publishes it reliably afterwards.",
  blocks: [
    { type: "callout", kind: "warn", title: "The problem it prevents", body: "Without an outbox, a crash between “DB committed” and “event published” leaves the system inconsistent — the transaction is updated but downstream consumers never hear about it (or the reverse). Distributed transactions across DB + broker are slow and often unsupported." },
    { type: "flow", title: "How it works", desc: "Write the aggregate and the outbox row in one transaction; a separate processor publishes.",
      diagramTitle: "Outbox flow",
      steps: [
        { name: "Application / Handler", tech: "use case", icon: "cog", cat: "app" },
        { name: "DB Transaction", tech: "BEGIN … COMMIT", icon: "db", cat: "db", edge: "single atomic write" },
        { edge: "committed together", parallel: [
          { name: "AuditTransaction", tech: "business state", icon: "doc", cat: "db" },
          { name: "OutboxMessage", tech: "event row (Pending)", icon: "inbox", cat: "db" },
        ]},
        { name: "Outbox Processor", tech: "BackgroundService · polls", icon: "worker", cat: "app", edge: "after commit", detail: D.worker },
        { name: "Azure Service Bus", tech: "publish · mark Processed", icon: "bus", cat: "msg", edge: "at-least-once", detail: D.servicebus },
        { name: "Subscribers", tech: "consumers (idempotent)", icon: "func", cat: "func", edge: "fan-out" },
      ]},
    { type: "code", title: "The atomic write", lang: "sql", label: "atomic-write.sql", code:
"BEGIN TRANSACTION;\n    UPDATE AuditTransaction\n       SET Status = 'APPROVED', UpdatedDate = SYSUTCDATETIME()\n     WHERE Id = @id;\n\n    INSERT INTO OutboxMessages (AggregateId, EventType, Payload, CorrelationId)\n    VALUES (@id, 'AuditApproved', @payload, @correlationId);\nCOMMIT;   -- business change and event are now inseparable" },
    { type: "code", title: "The publisher (BackgroundService)", lang: "csharp", label: "OutboxPublisher.cs", code:
"public class OutboxPublisher : BackgroundService\n{\n    protected override async Task ExecuteAsync(CancellationToken ct)\n    {\n        while (!ct.IsCancellationRequested)\n        {\n            await using var scope = _sp.CreateAsyncScope();\n            var db  = scope.ServiceProvider.GetRequiredService<AppDbContext>();\n            var bus = scope.ServiceProvider.GetRequiredService<IServiceBusPublisher>();\n\n            var batch = await db.OutboxMessages\n                .Where(m => m.Status == \"Pending\")\n                .OrderBy(m => m.CreatedAt)\n                .Take(100).ToListAsync(ct);   // batch publishing\n\n            foreach (var m in batch)\n            {\n                try\n                {\n                    await bus.PublishAsync(m.ToEnvelope(), ct);   // MessageId = m.Id (dedup)\n                    m.Status = \"Processed\"; m.ProcessedAt = DateTime.UtcNow;\n                }\n                catch (Exception ex)\n                {\n                    m.RetryCount++; m.ErrorMessage = ex.Message;\n                    if (m.RetryCount >= 10) m.Status = \"Poison\";   // park for inspection\n                }\n            }\n            await db.SaveChangesAsync(ct);\n            await Task.Delay(TimeSpan.FromSeconds(2), ct);        // polling interval\n        }\n    }\n}" },
    { type: "caps", title: "Guarantees & concerns handled", cols: 4, items: [
      { icon: "check", cat: "db", title: "Atomicity", desc: "Event can never be lost after a committed change." },
      { icon: "retry", cat: "ext", title: "Retry", desc: "Failed publishes retried with a poison threshold." },
      { icon: "shield", cat: "sec", title: "Idempotency", desc: "MessageId = Outbox Id → consumers dedup safely." },
      { icon: "queue", cat: "msg", title: "Batch & lock", desc: "Batched publish; distributed lock for multi-instance." },
    ]},
    { type: "callout", kind: "info", title: "At-least-once, not exactly-once", body: "The outbox guarantees an event is published <i>at least once</i>. A crash after publish-but-before-mark-processed causes a re-publish — which is why every consumer is <b>idempotent</b>. Exactly-once is an illusion; at-least-once + idempotency is the robust, industry-standard combination." },
  ],
});
