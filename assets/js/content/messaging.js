/* ============================================================
   Content — Messaging & Events group
   ============================================================ */
window.SECTIONS = window.SECTIONS || [];
var D = window.DETAILS;

/* ---------- 11 Service Bus ---------- */
window.SECTIONS.push({
  id: "servicebus", num: "11", group: "Messaging & Events", label: "Service Bus",
  kicker: "Reliable Messaging", title: "Azure Service Bus — the messaging backbone",
  sub: "The reliable, ordered, at-least-once transport that decouples the API from processing. It absorbs load, guarantees delivery, and lets many independent consumers react to the same business events.",
  blocks: [
    { type: "flow", title: "Topic, subscriptions & DLQ", desc: "One publisher, many filtered subscribers, each with its own dead-letter queue.",
      diagramTitle: "audit-events topic",
      steps: [
        { name: "Audit API", tech: "publisher (via Outbox)", icon: "api", cat: "api", detail: D.api },
        { name: "Topic: audit-events", tech: "single logical stream", icon: "bus", cat: "msg", edge: "publish", detail: D.servicebus },
        { edge: "SQL filter rules → fan-out", parallel: [
          { name: "Payment Subscription", tech: "→ Worker", icon: "worker", cat: "app", detail: D.worker },
          { name: "Audit Subscription", tech: "→ Function", icon: "func", cat: "func", detail: D.func },
          { name: "Notification Subscription", tech: "→ SignalR", icon: "signalr", cat: "mon", detail: D.signalr },
        ]},
      ]},
    { type: "caps", title: "Core concepts", cols: 4, items: [
      { icon: "queue", cat: "msg", title: "Queue", desc: "Point-to-point; one consumer group competes for messages." },
      { icon: "bus", cat: "msg", title: "Topic", desc: "Publish-subscribe; one message → many subscriptions." },
      { icon: "grid", cat: "func", title: "Subscription", desc: "A filtered view of a topic per consumer." },
      { icon: "alert", cat: "sec", title: "Dead-Letter Queue", desc: "Poison / expired messages parked for inspection." },
    ]},
    { type: "table", title: "Reliability features we rely on", head: ["Feature", "What it gives us"], rows: [
      ["<b>Sessions</b>", "Per-<code>transactionId</code> FIFO ordering when order matters"],
      ["<b>Duplicate detection</b>", "MessageId-based dedup window at the broker"],
      ["<b>Peek-lock</b>", "Message stays invisible until explicitly completed"],
      ["<b>Max delivery count</b>", "Auto dead-letter after N failed attempts"],
      ["<b>Auto-forward & DLQ</b>", "Route poison messages to a monitored queue"],
      ["<b>Geo-DR (Premium)</b>", "Namespace pairing for regional failover"],
    ]},
    { type: "code", title: "The message envelope contract", lang: "json", label: "envelope.json", code:
"{\n  \"messageId\":     \"e2b1c9a4-...\",   // dedup + idempotency key\n  \"correlationId\": \"c-8842\",           // ties the whole flow together\n  \"causationId\":   \"c-8841\",           // which message caused this one\n  \"eventType\":     \"PaymentInitiated\",\n  \"transactionId\": \"AUD-10293\",        // session id for ordering\n  \"timestamp\":     \"2026-09-26T10:14:02Z\",\n  \"payload\":       { \"amount\": 4200.00, \"currency\": \"USD\" }\n}" },
    { type: "code", title: "Publisher — enriching every message", lang: "csharp", label: "ServiceBusPublisher.cs", code:
"public async Task PublishAsync(IntegrationEvent evt, CancellationToken ct)\n{\n    var msg = new ServiceBusMessage(BinaryData.FromObjectAsJson(evt))\n    {\n        MessageId     = evt.MessageId,       // duplicate detection\n        CorrelationId = evt.CorrelationId,   // distributed tracing\n        Subject       = evt.EventType,       // used by subscription filters\n        SessionId     = evt.TransactionId,   // ordered per transaction\n        ContentType   = \"application/json\",\n        ApplicationProperties = { [\"causationId\"] = evt.CausationId }\n    };\n    await _sender.SendMessageAsync(msg, ct);\n}" },
  ],
});

/* ---------- 12 Publisher / Subscriber ---------- */
window.SECTIONS.push({
  id: "pubsub", num: "12", group: "Messaging & Events", label: "Publisher / Subscriber",
  kicker: "Consumer Strategies", title: "Subscriber implementation options",
  sub: "The same message can be consumed three ways. Choosing correctly is a cost, control and scale decision — here is how we decide.",
  blocks: [
    { type: "tabs", title: "Three consumer models", tabs: [
      { label: "① Azure Function", blocks: [
        { type: "flow", diagramTitle: "Service Bus-triggered Function", steps: [
          { name: "Service Bus", tech: "topic/subscription", icon: "bus", cat: "msg" },
          { name: "Azure Function", tech: "ServiceBusTrigger", icon: "func", cat: "func", edge: "auto-scale" },
          { name: "Business Logic", tech: "handler", icon: "cog", cat: "app", edge: "" },
          { name: "Database", tech: "persist", icon: "db", cat: "db", edge: "" },
        ]},
        { type: "callout", kind: "ok", title: "Use when", body: "Spiky / unpredictable load, lightweight processing, cost-sensitive workloads that should scale to zero." },
        { type: "code", lang: "csharp", label: "PaymentFunction.cs", code:
"[Function(\"ProcessPayment\")]\npublic async Task Run(\n    [ServiceBusTrigger(\"audit-events\", \"payment-sub\", Connection=\"Sb\")]\n    ServiceBusReceivedMessage msg, ServiceBusMessageActions actions)\n{\n    var evt = msg.Body.ToObjectFromJson<PaymentInitiated>();\n    await _payments.ProcessAsync(evt);\n    await actions.CompleteMessageAsync(msg);\n}" },
      ]},
      { label: "② Worker Service", blocks: [
        { type: "flow", diagramTitle: "BackgroundService consumer", steps: [
          { name: "Service Bus", tech: "topic/subscription", icon: "bus", cat: "msg" },
          { name: "BackgroundService", tech: "ServiceBusProcessor", icon: "worker", cat: "app", edge: "prefetch · concurrency" },
          { name: "Business Logic", tech: "handler", icon: "cog", cat: "app", edge: "" },
        ]},
        { type: "callout", kind: "ok", title: "Use when", body: "Sustained, predictable throughput; you need warm caches, long-lived connections and fine control over concurrency/prefetch. Runs on App Service or AKS." },
        { type: "code", lang: "csharp", label: "PaymentConsumer.cs", code:
"var processor = client.CreateProcessor(\"audit-events\", \"payment-sub\",\n    new ServiceBusProcessorOptions { MaxConcurrentCalls = 10, PrefetchCount = 50 });\nprocessor.ProcessMessageAsync += async args =>\n{\n    var evt = args.Message.Body.ToObjectFromJson<PaymentInitiated>();\n    await _payments.ProcessAsync(evt, args.CancellationToken);\n    await args.CompleteMessageAsync(args.Message);\n};\nawait processor.StartProcessingAsync(ct);" },
      ]},
      { label: "③ API-driven", blocks: [
        { type: "flow", diagramTitle: "Consumer → internal API", steps: [
          { name: "Service Bus", tech: "subscription", icon: "bus", cat: "msg" },
          { name: "Consumer", tech: "thin relay", icon: "worker", cat: "app", edge: "receive" },
          { name: "Internal API", tech: "reuse HTTP use case", icon: "api", cat: "api", edge: "HTTP" },
          { name: "Business Logic", tech: "shared handler", icon: "cog", cat: "app", edge: "" },
        ]},
        { type: "callout", kind: "warn", title: "Use when", body: "You must reuse existing synchronous API logic verbatim, or the processing service can only be reached over HTTP. Adds a network hop and couples async flow to API availability — use sparingly." },
      ]},
    ]},
    { type: "table", title: "Decision matrix", head: ["Criterion", "Function", "Worker", "API-driven"], rows: [
      ["Scale-to-zero", "✅ yes", "❌ no", "❌ no"],
      ["Sustained throughput", "⚠️ cold starts", "✅ best", "⚠️ hop overhead"],
      ["Concurrency control", "⚠️ limited", "✅ full", "⚠️ limited"],
      ["Operational simplicity", "✅ high", "⚠️ medium", "⚠️ medium"],
      ["Cost at low volume", "✅ lowest", "⚠️ always-on", "⚠️ always-on"],
    ]},
  ],
});

/* ---------- 13 Azure Functions ---------- */
window.SECTIONS.push({
  id: "functions", num: "13", group: "Messaging & Events", label: "Azure Functions",
  kicker: "Serverless", title: "Azure Functions — elastic event consumers",
  sub: "Serverless compute for event-driven and bursty workloads. Functions scale automatically with queue depth and Event Grid volume, and cost nothing while idle.",
  blocks: [
    { type: "caps", title: "Where Functions fit", cols: 3, items: [
      { icon: "bolt", cat: "func", title: "Event handlers", desc: "React to Service Bus / Event Grid events." },
      { icon: "scale", cat: "app", title: "Elastic burst", desc: "Scale out with load, in to zero when idle." },
      { icon: "webhook", cat: "ext", title: "Integration", desc: "Lightweight transforms & vendor callbacks." },
    ]},
    { type: "code", title: "Service Bus trigger with explicit settlement", lang: "csharp", label: "ProcessPayment.cs", code:
"[Function(\"ProcessPayment\")]\npublic async Task Run(\n    [ServiceBusTrigger(\"audit-events\", \"payment-sub\", Connection = \"Sb\")]\n    ServiceBusReceivedMessage msg,\n    ServiceBusMessageActions actions,\n    CancellationToken ct)\n{\n    if (await _seen.ExistsAsync(msg.MessageId, ct))     // idempotency\n    { await actions.CompleteMessageAsync(msg, ct); return; }\n\n    try\n    {\n        var evt = msg.Body.ToObjectFromJson<PaymentInitiated>();\n        await _payments.ProcessAsync(evt, ct);\n        await _seen.MarkAsync(msg.MessageId, ct);\n        await actions.CompleteMessageAsync(msg, ct);\n    }\n    catch (TransientException)\n    {\n        await actions.AbandonMessageAsync(msg, ct);     // retry (delivery++)\n    }\n    catch (Exception ex)\n    {\n        await actions.DeadLetterMessageAsync(msg, ex.Message, ct);\n    }\n}" },
    { type: "callout", kind: "info", title: "Functions vs Worker Service — the trade-off", body: "Functions win on cost and elasticity for spiky loads; a Worker Service wins on sustained throughput, warm state and fine-grained control. This platform uses <b>both</b> — Functions for integration & bursts, Workers for the steady payment pipeline. See the Publisher/Subscriber section for the full matrix." },
  ],
});

/* ---------- 14 Event Grid ---------- */
window.SECTIONS.push({
  id: "eventgrid", num: "14", group: "Messaging & Events", label: "Event Grid",
  kicker: "Eventing", title: "Azure Event Grid — event distribution",
  sub: "Event Grid handles high-fan-out event notification and routing — 'something happened' signals delivered reactively to many subscribers, with built-in retry and filtering. It complements, rather than replaces, Service Bus.",
  blocks: [
    { type: "flow", title: "Notification & routing", desc: "External and platform events distributed to reactive handlers.",
      diagramTitle: "Event Grid distribution",
      steps: [
        { name: "External / Resource System", tech: "emits event", icon: "cloud", cat: "ext" },
        { name: "Event Grid", tech: "filter · fan-out · retry", icon: "grid", cat: "func", edge: "notify", detail: D.eventgrid },
        { edge: "route by event type", parallel: [
          { name: "Azure Function", tech: "handler", icon: "func", cat: "func", detail: D.func },
          { name: "Service Bus", tech: "durable follow-up", icon: "bus", cat: "msg", detail: D.servicebus },
          { name: "Webhook endpoint", tech: "subscriber", icon: "webhook", cat: "ext", detail: D.webhook },
        ]},
        { name: "Internal Services", tech: "reliable processing", icon: "cog", cat: "app", edge: "" },
      ]},
    { type: "vs", title: "Event Grid vs Service Bus — when to use which",
      left: { icon: "grid", title: "Event Grid", blocks: [
        { type: "featureList", variant: "pros", items: ["Event <b>notification</b> ('it happened')", "Integration & resource events", "Massive fan-out to many subscribers", "Webhook / event distribution"] },
        { type: "para", body: "Small payloads, reactive, push-based, no ordering guarantee." },
      ]},
      right: { icon: "bus", title: "Service Bus", blocks: [
        { type: "featureList", variant: "pros", items: ["Reliable <b>business messaging</b> & commands", "Work queues with guaranteed processing", "Ordering (sessions) & transactions", "Load leveling & competing consumers"] },
        { type: "para", body: "Richer messages, pull-based, durable, ordered when needed." },
      ]},
    },
    { type: "callout", kind: "ok", title: "Used together", body: "A common enterprise pattern: Event Grid <b>notifies</b> broadly and cheaply, then hands work that must not be lost to <b>Service Bus</b> for guaranteed, ordered processing. Notification is reactive; business processing is reliable." },
  ],
});
