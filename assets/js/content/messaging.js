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

/* ---------- RabbitMQ ---------- */
window.SECTIONS.push({
  id: "rabbitmq", group: "Messaging & Events", label: "RabbitMQ",
  kicker: "Open-Source Broker", title: "RabbitMQ — messaging without cloud lock-in",
  sub: "RabbitMQ is a battle-tested, open-source message broker speaking AMQP. It's the go-to when you need cloud-agnostic or on-prem messaging, or richer routing than a managed cloud bus. This page covers the model, how it's hosted, how you publish and consume in C#, and the tooling around it.",
  blocks: [
    { type: "callout", kind: "info", title: "The mental model", body: "A producer never publishes to a queue directly — it publishes to an <b>exchange</b>, which routes the message to zero or more <b>queues</b> via <b>bindings</b> and a <b>routing key</b>. Consumers read from queues. This indirection (exchange → binding → queue) is what makes RabbitMQ's routing so flexible." },
    { type: "flow", title: "How a message flows",
      diagramTitle: "Producer → Exchange → Queues → Consumers",
      legend: [ {cat:"app",label:"App"},{cat:"msg",label:"Broker"},{cat:"sec",label:"DLX"} ],
      steps: [
        { name: "Producer", tech: "C# app · publish", icon: "cog", cat: "app" },
        { name: "Exchange", tech: "direct / topic / fanout / headers", icon: "grid", cat: "msg", edge: "publish (routing key)" },
        { edge: "bindings route to queues", parallel: [
          { name: "Queue: orders", tech: "durable", icon: "queue", cat: "msg" },
          { name: "Queue: audit", tech: "durable", icon: "queue", cat: "msg" },
          { name: "Queue: notify", tech: "durable", icon: "queue", cat: "msg" },
        ]},
        { name: "Consumers", tech: "competing · prefetch · ack", icon: "worker", cat: "app", edge: "deliver + manual ack" },
        { name: "Dead Letter Exchange", tech: "poison / rejected messages", icon: "alert", cat: "sec", edge: "nack (no requeue)" },
      ]},
    { type: "caps", title: "Core concepts", cols: 4, items: [
      { icon: "api", cat: "app", title: "Connection & Channel", desc: "One TCP connection; many lightweight channels multiplex over it." },
      { icon: "cog", cat: "app", title: "Producer", desc: "Publishes messages to an exchange with a routing key." },
      { icon: "grid", cat: "msg", title: "Exchange", desc: "Routes messages to queues by type + bindings." },
      { icon: "queue", cat: "msg", title: "Queue", desc: "Buffers messages until a consumer acks them." },
      { icon: "flow", cat: "msg", title: "Binding + routing key", desc: "The rule linking an exchange to a queue." },
      { icon: "worker", cat: "app", title: "Consumer", desc: "Subscribes to a queue and processes messages." },
      { icon: "check", cat: "db", title: "Ack / Nack", desc: "Consumer confirms success or rejects for retry/DLX." },
      { icon: "alert", cat: "sec", title: "Dead Letter Exchange", desc: "Where rejected / expired messages are routed." },
    ]},
    { type: "table", title: "Exchange types — how routing works", head: ["Exchange", "Routes by", "Use it for"], rows: [
      ["<b>direct</b>", "Exact routing-key match", "Point-to-point / command queues (<code>order.created</code>)"],
      ["<b>topic</b>", "Wildcard pattern (<code>order.*.created</code>, <code>audit.#</code>)", "Pub/sub with selective subscriptions"],
      ["<b>fanout</b>", "Ignores key — broadcasts to all bound queues", "Broadcast events to every subscriber"],
      ["<b>headers</b>", "Message header attributes", "Routing on multiple metadata fields"],
    ]},

    { type: "tabs", title: "Working with RabbitMQ", tabs: [

      { label: "Hosting", blocks: [
        { type: "para", body: "RabbitMQ is a server you run — there's no first-party Azure RabbitMQ (Azure's native broker is Service Bus). Your options:" },
        { type: "table", head: ["Where", "How", "Best for"], rows: [
          ["Local / dev", "Docker container (<code>rabbitmq:3-management</code>)", "Development & testing"],
          ["Kubernetes (AKS)", "RabbitMQ Cluster Operator or Helm chart; 3+ nodes, quorum queues", "Self-managed HA in the cloud"],
          ["VM cluster", "Install on VMs behind a load balancer", "On-prem / lift-and-shift"],
          ["Managed", "<b>CloudAMQP</b> (Azure/AWS/GCP marketplace) or <b>Amazon MQ for RabbitMQ</b>", "No ops — someone else runs it"],
        ]},
        { type: "code", lang: "bash", label: "run locally with the management UI", code:
"docker run -d --name rabbit \\\n  -p 5672:5672   # AMQP (apps connect here) \\\n  -p 15672:15672 # Management UI  ->  http://localhost:15672  (guest/guest) \\\n  rabbitmq:3-management" },
        { type: "code", lang: "yaml", label: "docker-compose.yml", code:
"services:\n  rabbitmq:\n    image: rabbitmq:3-management\n    ports:\n      - \"5672:5672\"     # AMQP\n      - \"15672:15672\"   # Management UI\n      - \"15692:15692\"   # Prometheus metrics\n    environment:\n      RABBITMQ_DEFAULT_USER: app\n      RABBITMQ_DEFAULT_PASS: ${RMQ_PASS}\n    volumes:\n      - rabbit-data:/var/lib/rabbitmq   # persist queues & messages\nvolumes:\n  rabbit-data:" },
        { type: "callout", kind: "info", title: "Ports to remember", body: "<code>5672</code> = AMQP (what your C# app connects to), <code>15672</code> = the web Management UI, <code>15692</code> = Prometheus metrics endpoint. In production, put a real vhost/user (not <code>guest</code>, which is localhost-only), enable TLS on 5671, and use a 3-node cluster with <b>quorum queues</b>." },
      ]},

      { label: "Publish (C#)", blocks: [
        { type: "para", body: "The official <code>RabbitMQ.Client</code> library. Declare a <b>durable</b> queue, mark messages <b>persistent</b>, and turn on <b>publisher confirms</b> so you know the broker accepted the message." },
        { type: "code", lang: "csharp", label: "Publisher.cs (RabbitMQ.Client)", code:
"var factory = new ConnectionFactory {\n    HostName = \"rabbit\", UserName = \"app\", Password = cfg[\"Rmq:Pass\"],\n    VirtualHost = \"/\"\n};\nusing var connection = factory.CreateConnection();\nusing var channel = connection.CreateModel();\n\nchannel.QueueDeclare(queue: \"orders\", durable: true,        // survives restart\n                     exclusive: false, autoDelete: false, arguments: null);\nchannel.ConfirmSelect();                                      // publisher confirms\n\nvar props = channel.CreateBasicProperties();\nprops.Persistent   = true;                                    // write to disk\nprops.MessageId     = order.Id.ToString();                    // for idempotency\nprops.CorrelationId = correlationId;                          // distributed tracing\nprops.ContentType   = \"application/json\";\n\nvar body = JsonSerializer.SerializeToUtf8Bytes(order);\nchannel.BasicPublish(exchange: \"\", routingKey: \"orders\",     // default exchange -> queue\n                     basicProperties: props, body: body);\nchannel.WaitForConfirmsOrDie(TimeSpan.FromSeconds(5));        // broker confirmed it" },
        { type: "callout", kind: "info", title: "Client v7 is async", body: "The examples use the familiar <code>IModel</code> API. RabbitMQ.Client <b>v7</b> is fully asynchronous — <code>CreateChannelAsync()</code>, <code>BasicPublishAsync()</code>, <code>AsyncEventingBasicConsumer</code>. The concepts are identical; the calls are awaited." },
      ]},

      { label: "Consume (C#)", blocks: [
        { type: "para", body: "Host the consumer as a <b>BackgroundService</b>. Set a <b>prefetch</b> count for fair dispatch, use <b>manual acks</b>, and route failures to a <b>dead-letter exchange</b>." },
        { type: "code", lang: "csharp", label: "OrderConsumer.cs (BackgroundService)", code:
"public class OrderConsumer : BackgroundService\n{\n    private IConnection _conn = default!;\n    private IModel _channel = default!;\n\n    protected override Task ExecuteAsync(CancellationToken ct)\n    {\n        var factory = new ConnectionFactory { HostName = \"rabbit\", DispatchConsumersAsync = true };\n        _conn = factory.CreateConnection();\n        _channel = _conn.CreateModel();\n\n        // Route rejected messages to a dead-letter exchange\n        _channel.QueueDeclare(\"orders\", durable: true, exclusive: false, autoDelete: false,\n            arguments: new Dictionary<string, object> { [\"x-dead-letter-exchange\"] = \"orders.dlx\" });\n        _channel.BasicQos(prefetchSize: 0, prefetchCount: 20, global: false);  // fair dispatch\n\n        var consumer = new AsyncEventingBasicConsumer(_channel);\n        consumer.Received += async (_, ea) =>\n        {\n            try\n            {\n                var id = ea.BasicProperties.MessageId;\n                if (await _dedupe.SeenAsync(id)) { _channel.BasicAck(ea.DeliveryTag, false); return; } // idempotent\n\n                var evt = JsonSerializer.Deserialize<OrderPlaced>(ea.Body.Span)!;\n                await _handler.HandleAsync(evt);\n                await _dedupe.MarkAsync(id);\n                _channel.BasicAck(ea.DeliveryTag, multiple: false);                 // success\n            }\n            catch (TransientException)\n            {\n                _channel.BasicNack(ea.DeliveryTag, multiple: false, requeue: true);  // retry\n            }\n            catch (Exception)\n            {\n                _channel.BasicNack(ea.DeliveryTag, multiple: false, requeue: false); // -> DLX\n            }\n        };\n        _channel.BasicConsume(\"orders\", autoAck: false, consumer);                   // manual ack\n        return Task.CompletedTask;\n    }\n\n    public override void Dispose() { _channel?.Dispose(); _conn?.Dispose(); base.Dispose(); }\n}" },
        { type: "callout", kind: "warn", title: "Always ack manually + be idempotent", body: "With <code>autoAck: false</code>, a message stays on the queue until you <code>BasicAck</code>. If the consumer crashes mid-process, RabbitMQ redelivers it — so consumers <b>must be idempotent</b> (dedupe by <code>MessageId</code>). <code>BasicNack(requeue: false)</code> sends poison messages to the DLX instead of looping forever." },
      ]},

      { label: "Reliability", blocks: [
        { type: "caps", cols: 4, items: [
          { icon: "db", cat: "db", title: "Durable + persistent", desc: "Durable queues + persistent messages survive a broker restart." },
          { icon: "check", cat: "db", title: "Publisher confirms", desc: "Broker acknowledges it stored the message." },
          { icon: "worker", cat: "app", title: "Consumer acks", desc: "Manual ack = at-least-once; redeliver on crash." },
          { icon: "alert", cat: "sec", title: "Dead-letter exchange", desc: "Isolate poison / expired messages." },
          { icon: "scale", cat: "app", title: "Quorum queues", desc: "Raft-replicated queues for HA (preferred over classic mirrored)." },
          { icon: "cog", cat: "app", title: "Prefetch (QoS)", desc: "Limit unacked messages per consumer for fair dispatch." },
          { icon: "retry", cat: "ext", title: "TTL + retry", desc: "Message/queue TTL; delayed retry via DLX + TTL." },
          { icon: "shield", cat: "sec", title: "Idempotency", desc: "Dedupe by MessageId — at-least-once means duplicates happen." },
        ]},
        { type: "callout", kind: "info", title: "Delayed retry pattern", body: "RabbitMQ has no native scheduled retry. The common trick: <code>nack</code> to a <b>DLX</b> whose queue has a <b>TTL</b>; when the TTL expires the message dead-letters <i>back</i> to the main queue — an exponential-backoff retry loop. Or install the <b>delayed-message</b> plugin. (MassTransit does this for you.)" },
      ]},

      { label: "Tools & libraries", blocks: [
        { type: "table", title: "Operational tooling", head: ["Tool", "What it's for"], rows: [
          ["<b>Management UI</b> (15672)", "Browse queues/exchanges, publish test messages, watch rates, purge"],
          ["<code>rabbitmqctl</code>", "Cluster admin: users, vhosts, policies, status"],
          ["<code>rabbitmqadmin</code>", "CLI/scriptable: declare & inspect exchanges/queues"],
          ["<b>Shovel</b> / <b>Federation</b> plugins", "Move/replicate messages between brokers or regions"],
          ["<b>Prometheus + Grafana</b>", "Metrics (queue depth, publish/ack rates, memory) & alerts"],
        ]},
        { type: "para", title: "C# libraries", body: "Beyond the raw <code>RabbitMQ.Client</code>, higher-level libraries remove boilerplate:" },
        { type: "featureList", items: [
          "<b>MassTransit</b> — the popular choice: consumers, retries, DLQ, <b>sagas</b>, outbox, scheduling — and it can target RabbitMQ <i>or</i> Azure Service Bus with the same code.",
          "<b>EasyNetQ</b> — a simple, opinionated API over RabbitMQ.Client for quick pub/sub.",
          "<b>NServiceBus</b> — enterprise service bus with RabbitMQ transport." ]},
        { type: "code", lang: "csharp", label: "MassTransit over RabbitMQ (recommended)", code:
"builder.Services.AddMassTransit(x =>\n{\n    x.AddConsumer<OrderPlacedConsumer>();\n    x.UsingRabbitMq((ctx, cfg) =>\n    {\n        cfg.Host(\"rabbit\", \"/\", h => { h.Username(\"app\"); h.Password(cfg2[\"Rmq:Pass\"]); });\n        cfg.ReceiveEndpoint(\"orders\", e =>\n        {\n            e.PrefetchCount = 20;\n            e.UseMessageRetry(r => r.Exponential(5,\n                TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(2)));\n            e.ConfigureConsumer<OrderPlacedConsumer>(ctx);   // auto _error (DLQ) queue\n        });\n    });\n});" },
        { type: "callout", kind: "ok", title: "Prefer a library over the raw client", body: "For anything beyond a demo, use <b>MassTransit</b>: you get retries, dead-lettering, the outbox, sagas and consumer lifecycle for free — and switching the transport from RabbitMQ to Azure Service Bus is a one-line change (<code>UsingRabbitMq</code> → <code>UsingAzureServiceBus</code>)." },
      ]},

    ]},

    { type: "vs", title: "RabbitMQ vs Azure Service Bus — when to choose which",
      left: { icon: "queue", title: "RabbitMQ", blocks: [
        { type: "featureList", variant: "pros", items: ["Cloud-agnostic & on-prem — no lock-in", "Rich, flexible routing via exchanges", "Open-source; low latency; huge community", "Runs anywhere (Docker, K8s, VM, CloudAMQP)"] },
        { type: "featureList", variant: "cons", items: ["You operate it (or pay CloudAMQP)", "No native scheduled delivery / dedup (DIY or plugin)", "Clustering & upgrades are your responsibility"] },
      ]},
      right: { icon: "bus", title: "Azure Service Bus", blocks: [
        { type: "featureList", variant: "pros", items: ["Fully managed — zero ops", "Sessions (FIFO), duplicate detection, scheduled messages", "Geo-DR, deep Azure integration & security", "This platform's default broker"] },
        { type: "featureList", variant: "cons", items: ["Azure-coupled", "Less flexible routing than exchanges", "Cost at high throughput (Premium MUs)"] },
      ]},
    },
    { type: "callout", kind: "ok", title: "How it fits this platform", body: "This reference architecture uses <b>Azure Service Bus</b> as its backbone (see <b>Service Bus</b>). RabbitMQ is the answer when you need <b>cloud-agnostic or on-prem</b> messaging, hybrid deployments, or richer exchange-based routing. Because we go through <b>MassTransit</b>, the broker is an implementation detail — the same consumers, sagas and outbox run on either, so you can start on RabbitMQ on-prem and move to Service Bus in Azure (or vice-versa) without rewriting business code." },
  ],
});
