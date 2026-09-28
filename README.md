# Enterprise Assurance & Audit Processing Platform — Architecture Showcase

A **client-facing Solution Architecture showcase portal**. It presents an enterprise-grade, event-driven, cloud-native **Assurance & Audit processing platform** the way a Principal Solution Architect would demonstrate it to CTOs, CIOs, Enterprise Architects and business stakeholders during a technical proposal or architecture workshop.

It is a single, self-contained web app: open it in a browser and walk a client from **business problem → proposed architecture → why → how data flows → how failures are handled → how it scales → how it evolves**, across **46 interactive sections** with diagrams, sequence flows, code and design rationale.

> **Two different "stacks" in this project — don't confuse them:**
> 1. **What the showcase app is built with** — plain HTML/CSS/JavaScript (this document, first section below).
> 2. **What the showcase app describes** — an Angular + ASP.NET Core + Azure reference architecture (the *content*; see "Architecture stack presented").

---

## 1. Built with (the showcase app itself)

This portal is deliberately built as a **zero-dependency, zero-build static web application** so it opens instantly in any browser during a live workshop — no `npm install`, no compilation, works offline, and can be handed over as a single folder or hosted on any static host.

### Core technologies

| Layer | Technology | Notes |
|---|---|---|
| **Markup** | HTML5 | A single `index.html` shell (top bar, sidebar, content area, detail drawer). |
| **Styling** | CSS3 (hand-written design system) | No CSS framework. Uses **CSS custom properties (variables)**, `grid`/`flexbox`, `color-mix()`, `backdrop-filter`, and media queries. Split into `theme.css` (design tokens) and `components.css` (components). |
| **Logic** | Vanilla JavaScript (ES5-safe, no modules) | No framework (no React/Angular/Vue), no bundler, no transpiler. Loaded as classic `<script>` tags so it runs directly from `file://` as well as a server. |
| **Fonts** | Google Fonts — **Inter** (UI) + **JetBrains Mono** (code) | Loaded via `<link>` with full system-font fallback stacks, so it still looks correct offline. |
| **Icons** | Inline SVG | A hand-built icon set defined in `renderer.js` — no icon library or web requests. |
| **Dev server (optional)** | Python `http.server` | Configured in `.claude/launch.json`; only needed if a browser blocks `file://` sub-resource loading. |

### Key architectural choices of the app

- **Data-driven rendering engine.** Content is *not* hand-written HTML. Each section is a JavaScript object describing an array of typed **blocks**; a small renderer (`renderer.js`) turns blocks into HTML. This keeps all 46 sections visually consistent and makes editing content a matter of editing data, not markup.
- **Custom lightweight syntax highlighter.** A regex-based tokenizer in `renderer.js` colours C#, SQL, JSON, TypeScript, HTTP and Bash snippets — no Prism/Highlight.js dependency.
- **Theming.** Dark (default) and light themes via CSS variables; the choice is persisted in `localStorage`.
- **Interactivity** (all vanilla JS, wired in `app.js`): clickable diagram nodes → slide-in **detail drawer**; an interactive **state machine**; an animated **"Play Flow"** sequence player; pill **tabs**, **accordions**, expandable **ADR** cards; copy-to-clipboard on code blocks; **auto-numbered** navigation; hash-based deep-linking; prev/next and a reading-progress bar.
- **Responsive.** Sidebar collapses to a slide-out drawer below 980px; grids reflow for tablet and mobile.
- **Accessibility-minded.** Semantic landmarks (`header`, `main`, `aside`), keyboard-dismissible drawer (Esc), focus-friendly controls.

### Browser support
Any modern evergreen browser (Chrome, Edge, Firefox, Safari). Uses standard, widely-supported CSS/JS; no polyfills required.

---

## 2. Architecture stack presented (the *content*)

The reference architecture the showcase teaches — i.e. the technology the *client project* would be built with — is:

- **Frontend:** Angular, TypeScript, HTML, CSS, Angular Material; SignalR client for real-time.
- **Backend:** C#, ASP.NET Core Web API, .NET, Clean Architecture, CQRS (MediatR), FluentValidation.
- **Data access:** Entity Framework Core (write model) + Dapper (hot reads), across **SQL Server** and **PostgreSQL**.
- **Messaging:** Azure Service Bus (topics, subscriptions, sessions, DLQ, retries).
- **Eventing / serverless:** Azure Event Grid, Azure Functions, Webhooks.
- **Real-time:** SignalR over WebSockets (Azure SignalR Service backplane).
- **Caching / coordination:** Redis.
- **Security:** OAuth 2.0 / OpenID Connect, JWT, policy-based RBAC, Azure Key Vault, **Managed Identity**, WAF, rate limiting.
- **Storage & ops:** Azure Blob Storage, Application Insights, Azure Monitor / Log Analytics, Bicep (IaC).
- **Third-party integration:** **KyrePay** — a *fictional* payment/communication vendor used purely to demonstrate secure external integration (signed webhooks, idempotency, retries, circuit breaking).

---

## 3. Getting started

### Option A — just open it
Double-click **`index.html`**. Everything runs from `file://`.

### Option B — run a static server (recommended)
Some browsers restrict loading local sub-resources over `file://`. Serving the folder avoids that:

```bash
python -m http.server 8123
```

Then open **http://localhost:8123**. (Any static server works — `npx serve`, `dotnet serve`, IIS, Nginx, Azure Static Web Apps, etc.)

### Deploy
Because it is fully static, deploy the folder as-is to any static host (Azure Static Web Apps, Azure Storage static website, GitHub Pages, Netlify, S3, an Nginx container, …).

---

## 4. Project structure

```
ArchitectureOverView/
├── index.html                 # App shell: top bar, sidebar, content area, detail drawer
├── README.md                  # This file
├── .claude/
│   └── launch.json            # Optional local dev-server config (python http.server :8123)
└── assets/
    ├── css/
    │   ├── theme.css          # Design tokens: colours, spacing, layout, top bar, sidebar, themes
    │   └── components.css      # All block/component styles (cards, diagrams, code, tables, drawer…)
    └── js/
        ├── renderer.js         # Rendering engine: icons, syntax highlighter, block renderers
        ├── app.js              # Navigation, routing, auto-numbering, all interactivity wiring
        └── content/            # Section content (pure data) — loaded in order below
            ├── overview.js     # Sections 01–04  + shared component "detail" library
            ├── architecture.js # Sections 05–10  (incl. SOLID & DDD)
            ├── data.js         # Sections 11–15  (Data & Persistence)
            ├── patterns.js     # Sections 16–17  (Saga, Outbox)
            ├── messaging.js    # Sections 18–22  (incl. RabbitMQ)
            ├── integration.js  # Sections 23–27
            ├── quality.js      # Sections 28–35
            └── delivery.js     # Sections 36–46
```

**Load order matters:** `index.html` loads the content files in the order above, and the left-nav groups appear in that order. Section numbers are assigned automatically from final position (see `app.js`), so inserting a new section never desyncs the badges.

---

## 5. What's covered (all 46 sections)

Organised into 7 navigation groups.

### Overview
| # | Section | What it covers |
|---|---|---|
| 1 | **Executive Overview** | Executive dashboard: capability cards (event-driven, cloud-native, real-time, secure, fault-tolerant…) and the interactive high-level architecture diagram. |
| 2 | **Business Use Case** | The assurance & audit problem, plus an **interactive transaction state machine** (NEW → … → AUDIT_COMPLETED with failure/retry/DLQ paths); click any state for its API, DB change, event, topic, subscriber, retry and UI notification. |
| 3 | **HLD Architecture** | Layered high-level design (Clean Architecture) with the dependency rule; clickable components. |
| 4 | **LLD Architecture** | .NET solution structure (`Audit.Api/Application/Domain/Infrastructure/Worker/SignalR/Tests`) and per-project responsibilities. |

### Architecture
| # | Section | What it covers |
|---|---|---|
| 5 | **N-Layer vs N-Tier** | Logical layers vs physical tiers, side by side, and how they combine here. |
| 6 | **Physical Deployment** | Azure topology: Front Door → WAF → APIM → App Service/AKS → Service Bus → Functions/Workers → DB; private endpoints, VNet, Managed Identity. |
| 7 | **Database Design** | Core tables & relationships, schemas (SQL Server + PostgreSQL), and indexing strategy. |
| 8 | **Design Patterns** | Catalogue: Clean Architecture, DDD, CQRS, Repository/UoW, Mediator, Specification, GoF (Strategy/Factory/Adapter/Decorator), and resilience patterns (Retry/Circuit Breaker/Timeout/Bulkhead/Idempotency/DI). |
| 9 | **SOLID & Patterns (Car)** | SOLID principles and the GoF design patterns taught through one running example — building a **Car** feature by feature. Each principle (SRP/OCP/LSP/ISP/DIP) and pattern — Creational (Builder, Factory, Abstract Factory, Prototype, Singleton), Structural (Decorator, Adapter, Facade, Composite, Bridge, Proxy, Flyweight), Behavioral (Strategy, Observer, State, Command, Chain, Template, Mediator, Memento, Iterator, Visitor, Interpreter) — has one focused C# snippet. |
| 10 | **Domain-Driven Design** | In-depth DDD: strategic (ubiquitous language, subdomains, bounded contexts, context mapping incl. ACL) + tactical (entity, value object, **aggregate/aggregate root**, domain events, repository, domain/application service) with C# in the audit domain; the aggregate-as-consistency-boundary idea and how DDD feeds CQRS/Outbox/Saga/Sharding. |

### Data & Persistence
| # | Section | What it covers |
|---|---|---|
| 11 | **SQL Functions** | Aggregate, string, date/time, **window functions**, conditional/null, conversion & **JSON** functions, plus **UDF/TVF vs stored procedures** — with PostgreSQL notes and Dapper call examples. |
| 12 | **EF Core & Dapper** | Why both (EF for writes, Dapper for reads), a shared **passwordless connection via Managed Identity**, and **database RBAC** grants. |
| 13 | **Sharding · Replica · Partitioning** | Three distinct scaling techniques — table **partitioning**, **read replicas**, and **sharding** (shard map by TenantId) — with trade-offs and a decision table. |
| 14 | **Redis & CQRS Sync** | Full CQRS read/write pipeline, cache-aside, **event-driven projection** (how read & write stores stay in sync), invalidation strategies, and honest eventual-consistency handling. |
| 15 | **Redis Caching Patterns** | The five caching patterns (cache-aside, read-through, write-through, write-behind, refresh-ahead), Redis data structures for caching, .NET integration (IDistributedCache, **HybridCache** L1+L2), cache-**stampede** defences, invalidation strategies (TTL/event/versioned/tag), eviction policies (LRU/LFU) and deployment topologies (replica/sentinel/cluster/Azure). |

### Patterns
| # | Section | What it covers |
|---|---|---|
| 16 | **Saga Pattern** | Long-running distributed transactions: happy path + **compensation**, orchestration vs choreography, persisted saga state, and orchestrator code. |
| 17 | **Outbox Pattern** | The dual-write problem and the transactional outbox: atomic write, background publisher, at-least-once + idempotency, poison handling. |

### Messaging & Events
| # | Section | What it covers |
|---|---|---|
| 18 | **Service Bus** | Topics/subscriptions/DLQ, sessions, dedup, the message envelope contract, and an enriching publisher. |
| 19 | **Publisher / Subscriber** | Three consumer models (Function / Worker / API-driven) with a decision matrix and code. |
| 20 | **Azure Functions** | Serverless, elastic consumers; Service Bus trigger with explicit settlement; Functions-vs-Worker trade-off. |
| 21 | **Event Grid** | Event notification & routing; Event Grid vs Service Bus, and how they are used together. |
| 22 | **RabbitMQ** | Open-source AMQP broker: the exchange→binding→queue model, exchange types (direct/topic/fanout/headers), hosting (Docker/K8s/CloudAMQP), publish & consume in C# (`RabbitMQ.Client`: durable queues, publisher confirms, prefetch, manual ack, DLX), reliability (quorum queues, TTL retry, idempotency), tooling (Management UI, rabbitmqctl, MassTransit/EasyNetQ), and RabbitMQ vs Azure Service Bus. |

### Real-Time & Integration
| # | Section | What it covers |
|---|---|---|
| 23 | **SignalR / WebSockets** | Real-time status from bus → hub → WebSocket → Angular; SignalR vs raw WebSockets; hub + Angular client code. |
| 24 | **Angular Front-End** | The client side of the design: app structure, **SignalR consumption** (signals), **JWT + refresh-token + CSRF** (in-memory access token, httpOnly refresh cookie, single-flight silent refresh, XSRF config, CSRF≠CORS), component **lifecycle** hooks + `takeUntilDestroyed` + OnPush, **Reactive vs Template-driven forms** (comparison + async validators), and cross-cutting concerns (guards, RBAC UI, lazy loading, XSS, observability). |
| 25 | **Payment Integration** | KyrePay flow, API surface, and outbound integration concerns (auth, idempotency, timeout, resilience, anti-corruption). |
| 26 | **Webhooks** | Secure inbound callback pipeline: validate → dedup → persist → publish → fast 200; never process synchronously. |
| 27 | **Security** | OIDC → JWT → API flow, JWT claims, roles/RBAC, authorization at every level, and defence-in-depth (TLS, Key Vault, WAF, rate limiting, audit logging). |

### Quality Attributes
| # | Section | What it covers |
|---|---|---|
| 28 | **Failure & Resilience** | Resilience toolkit; 10 failure scenarios with detection/response/recovery; composed Polly policy; graceful degradation. |
| 29 | **Observability** | Telemetry pipeline, one distributed trace across the whole flow, correlation signals, and correlation-ID middleware. |
| 30 | **Testing & Code Quality** | Quality gates that prove correctness & security: **NUnit + Moq** unit tests (stub ports, verify interactions), **code coverage** (coverlet), **SonarQube** static analysis + merge-blocking Quality Gate (bugs, vulnerabilities, hotspots, coverage), and **Brinqa** aggregating findings from all scanners (SAST/SCA/DAST/secrets/cloud) into one prioritised security-risk view. |
| 31 | **Key Vault · Logging · Blob** | Three Azure platform services accessed via one Managed Identity: secrets (Key Vault), structured logging + KQL, and Blob storage with user-delegation SAS. |
| 32 | **Scalability** | Scaling strategy per tier, queue-based load leveling, and scaling dimensions. |
| 33 | **Scaling for Max Load** | What scaling is to reach maximum sustainable load: vertical vs horizontal, bottleneck removal, autoscale rules, load testing (load/stress/spike/soak), capacity planning (Little's Law) and the Universal Scalability Law. |
| 34 | **Disaster Recovery** | Multi-region active/passive, RTO/RPO targets, and DR building blocks. |
| 35 | **NFR Dashboard** | Non-functional targets across performance, availability, reliability, security, DR, compliance and more (illustrative, configurable). |

### Delivery
| # | Section | What it covers |
|---|---|---|
| 36 | **API Catalog** | Endpoint catalogue with security, idempotency and correlation conventions; contract detail. |
| 37 | **gRPC · GraphQL · OData** | API styles beyond REST: **gRPC** (contract-first RPC over HTTP/2 for internal calls — .proto, server/client, streaming), **GraphQL** (Hot Chocolate — client-driven queries, projections/filtering), and **OData** (queryable REST — `$filter`/`$orderby`/`$expand` over `IQueryable`), each with detailed C# code, the exact **NuGet packages** to add, and a when-to-use-which comparison. |
| 38 | **End-to-End Flow** | **Animated 11-step sequence player** ("Play / Step / Reset") of a full create-audit-and-pay transaction. |
| 39 | **Architecture Decision Records** | 8 expandable ADRs (Service Bus, Saga, Outbox, SignalR, SQL/PG, Functions, Event Grid, CQRS) with context, decision, alternatives, consequences. |
| 40 | **Sample Architectures** | Gallery of canonical patterns (layered, event-driven, saga, outbox, real-time, third-party, serverless, hybrid). |
| 41 | **Microservices vs Monolith** | Modular monolith → microservices evolution and why a full rewrite is rarely needed. |
| 42 | **Implementation Roadmap** | Indicative 10-phase delivery plan from Discovery to Production. |
| 43 | **GitHub CI/CD & Deploy** | GitHub controls & automatic deployment: branch protection on main, required approvals/status checks, CI + CD **GitHub Actions** workflows, auto-deploy on merge to main, environment approval gates, passwordless **OIDC** deploy to Azure, and blue/green rollback. Includes the team's real in-use .NET pipeline (build/test → email → deploy to Azure VM IIS via WinRM). |
| 44 | **Docker · Kubernetes · Load Balancing** | What the pipeline ships to: a hardened multi-stage **Docker** image + compose; **Kubernetes** objects (Deployment, Service, Ingress, ConfigMap/Secret, HPA, liveness/readiness probes, rolling updates); **load-balancing** tiers (Front Door → App Gateway/WAF → Ingress → Service, L4 vs L7) and algorithms (round-robin, least-connections, weighted, IP-hash); and deployment strategies (rolling, blue-green, canary). |
| 45 | **Eight Industries, One Platform** | The same reference architecture applied to eight businesses — Pharmacy, Uber-like ride booking, Zomato-like food ordering, employee car-pooling, Zerodha-like trading, student loans, Amazon-like e-commerce, and BookMyShow-like ticketing. Shows the common edge/security/microservice platform (incl. CORS≠CSRF), the **multi-portal model** (customer + employee/admin portals per app via RBAC), the reusable CQRS+Outbox+Saga loop, and per-industry flows with **portals & personas** and a platform-mapping table (real-time channel, consistency, Redis, key services, saga + compensation, Boomi/scheduled). BookMyShow highlights **geo-based availability + seat-lock (no double-booking)**. |
| 46 | **Why This Architecture** | Measurable outcomes, the end-to-end story recap, and the next step. |

---

## 6. How the rendering engine works (for maintainers)

Each section is a plain object pushed onto the global `window.SECTIONS` array:

```js
window.SECTIONS.push({
  id: "my-section",          // used for the URL hash (#my-section)
  group: "Quality Attributes", // nav group (order follows script load order)
  label: "My Tab",           // sidebar label
  kicker: "Category",        // small eyebrow text
  title: "My section title",
  sub: "One-paragraph intro.",
  blocks: [ /* typed blocks, rendered top-to-bottom */ ],
});
```

`renderer.js` supports these **block types**:

| Type | Purpose |
|---|---|
| `para` | Title + paragraph(s). |
| `caps` | Grid of capability/feature cards (icon, colour category). |
| `kpis` | KPI stat tiles. |
| `callout` | Highlighted note (`info` / `ok` / `warn` / `err`). |
| `code` | Syntax-highlighted code block with copy button. |
| `table` | Data table (cells accept HTML). |
| `featureList` | Check/cross bullet list (`pros` / `cons` variants). |
| `twoCol` | Two-column layout of nested blocks. |
| `tabs` | Pill-style tabbed panes of nested blocks. |
| `accordion` | Expandable items of nested blocks. |
| `flow` | Vertical node-graph diagram (supports parallel branches, edge labels, clickable nodes). |
| `layered` | Layered diagram (e.g. HLD) with labelled layers. |
| `stateMachine` | Interactive state machine with a detail panel. |
| `player` | Animated step-through sequence flow. |
| `adrs` | Architecture Decision Record cards. |
| `timeline` | Phased roadmap/timeline. |
| `vs` | Side-by-side comparison of two nested block sets. |
| `metrics` | Labelled metric bars. |

**Interactive diagram nodes:** any `flow`/`layered` node with a `detail` object becomes clickable and opens the slide-in drawer. Common component details are defined once in `window.DETAILS` (in `overview.js` / `data.js`) and reused across sections.

### Adding a new section
1. Add a `window.SECTIONS.push({...})` block to the appropriate `assets/js/content/*.js` file (position it where you want it to appear in that group).
2. If it introduces a new group, load its file in `index.html` at the position where the group should appear.
3. That's it — numbering, the sidebar, progress bar and hash routing update automatically.

---

## 7. Customisation

- **Brand colours / theme:** edit the CSS variables at the top of `assets/css/theme.css` (`--accent`, `--accent-2`, the component-category colours `--c-*`, and the dark/light palette blocks).
- **Fonts:** change the Google Fonts `<link>` in `index.html` and the `--ff-sans` / `--ff-mono` variables in `theme.css`.
- **Logo / title:** edit the `.brand` block in `index.html`.
- **Content:** edit the data objects in `assets/js/content/*.js`. No build step — refresh the browser.

---

## 8. Notes & disclaimers

- **KyrePay is fictional** — a stand-in for any real payment/communication provider (Stripe, Adyen, a bank gateway), used only to demonstrate secure external integration patterns.
- **All metrics, SLOs and targets are illustrative** architecture targets for demonstration, not guarantees. Real targets are agreed and configured per client during Discovery.
- This is a **presentation/showcase tool**, not the production application. The content is architected to the Angular/.NET/Azure stack above and the structure ports cleanly to Angular components if a real workspace is later scaffolded.
