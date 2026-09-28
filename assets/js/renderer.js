/* ============================================================
   Renderer engine — turns content blocks into HTML.
   Global namespace: window.R
   ============================================================ */
(function () {
  "use strict";
  const R = {};
  window.R = R;

  /* ---------------- utils ---------------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  R.esc = esc;
  const arr = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]);

  /* ---------------- icons ---------------- */
  const P = {
    angular: '<path d="M12 2l9 3-1.4 12L12 22 4.4 17 3 5z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 5.5l4.5 11h-1.7l-.9-2.3H10l-.9 2.3H7.5L12 5.5zm1.3 7.1L12 9.2l-1.3 3.4z" fill="currentColor"/>',
    api: '<rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7 9l-2 3 2 3M17 9l2 3-2 3M13 8l-2 8" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    gateway: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.6"/>',
    db: '<ellipse cx="12" cy="6" rx="7" ry="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    bus: '<rect x="2.5" y="7" width="19" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M6 7V5M12 7V5M18 7V5M6 19v-2M12 19v-2M18 19v-2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    func: '<path d="M14 3c-3 0-3 4-3 6H8m6-6v18m0-18c3 0 3 4 3 6h-3m0 0v6m0 6c-3 0-3-4-3-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    signalr: '<circle cx="12" cy="12" r="2.4" fill="currentColor"/><path d="M6.5 6.5a8 8 0 000 11M17.5 6.5a8 8 0 010 11M3.5 3.5a12 12 0 000 17M20.5 3.5a12 12 0 010 17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    webhook: '<circle cx="7" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="18" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="6" cy="17" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9 9.5l4 5M9 16h6M16 14l-3-6" stroke="currentColor" stroke-width="1.5"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M2.5 9.5h19M6 15h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    monitor: '<path d="M3 17l5-6 4 4 5-8 4 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 21h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    cache: '<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 9h18M3 14h18M8 4v16" stroke="currentColor" stroke-width="1.4"/>',
    user: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    cloud: '<path d="M7 18a4 4 0 01-.5-8 6 6 0 0111.5 1.5A3.5 3.5 0 0117 18z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M3 13l9 5 9-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    domain: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3a13 13 0 000 18M12 3a13 13 0 010 18M3.5 9h17M3.5 15h17" fill="none" stroke="currentColor" stroke-width="1.3"/>',
    worker: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    bolt: '<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    retry: '<path d="M4 12a8 8 0 018-8c2.6 0 4.9 1.2 6.4 3M20 4v4h-4" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 12a8 8 0 01-8 8c-2.6 0-4.9-1.2-6.4-3M4 20v-4h4" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    lock: '<rect x="4.5" y="10" width="15" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    key: '<circle cx="8" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M11 11l9 9M17 17l2-2M14 14l2-2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    check: '<path d="M5 12l4.5 4.5L19 7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    play: '<path d="M7 5l12 7-12 7z" fill="currentColor"/>',
    book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M4 19a2 2 0 012-2h13" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    flow: '<rect x="3" y="3" width="6" height="5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="15" y="8" width="6" height="5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="16" width="6" height="5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 5.5h4a2 2 0 012 2v.5M9 18.5h4a2 2 0 002-2v-2" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    scale: '<path d="M12 3v18M6 7l-4 7h8zM18 7l-4 7h8zM4 21h16M9 3h6" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    globe: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="currentColor" stroke-width="1.4"/>',
    saga: '<circle cx="5" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="6" r="2.4" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="19" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="18" r="2.4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7 11l3.2-3M13.8 8l3.2 3M17 14l-3.2 3M10.2 17L7 14" stroke="currentColor" stroke-width="1.5"/>',
    inbox: '<path d="M3 13l3-8h12l3 8v6a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 13h5a1 1 0 011 1 2 2 0 004 0 1 1 0 011-1h5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    queue: '<rect x="3" y="6" width="13" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="14" width="13" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M20 8h1M20 16h1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    cog: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    alert: '<path d="M12 3l9 16H3z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9v4M12 16.5v.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5M12 7.6v.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M14 4c3 0 6 3 6 6-2 5-7 8-7 8l-4-4s3-5 5-10z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="14.5" cy="9.5" r="1.6" fill="currentColor"/>',
    dot: '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
    doc: '<path d="M6 2h8l4 4v16H6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 2v4h4M9 13h6M9 17h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  };
  R.icon = function (name, cls) {
    const d = P[name] || P.dot;
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' + d + "</svg>";
  };

  /* category color map */
  const CAT = {
    client: "--c-client", api: "--c-api", app: "--c-app", domain: "--c-domain",
    db: "--c-db", msg: "--c-msg", ext: "--c-ext", sec: "--c-sec", mon: "--c-mon", func: "--c-func",
  };
  const catVar = (c) => "var(" + (CAT[c] || "--accent") + ")";

  /* ---------------- syntax highlighter ---------------- */
  const G = "(?:", ncg = ")"; // helper markers not used; readability
  const LANG = {
    csharp: [
      ["tk-com", "\\/\\*[\\s\\S]*?\\*\\/"],
      ["tk-com", "\\/\\/[^\\n]*"],
      ["tk-attr", "\\[[A-Z][\\w.]*(?:\\([\\s\\S]*?\\))?\\]"],
      ["tk-str", "&quot;[\\s\\S]*?&quot;|&#39;[\\s\\S]*?&#39;|\\$&quot;[\\s\\S]*?&quot;"],
      ["tk-key", "\\b(?:public|private|protected|internal|static|readonly|class|interface|record|struct|enum|namespace|using|new|return|await|async|var|void|if|else|for|foreach|while|switch|case|break|continue|throw|try|catch|finally|get|set|init|ref|this|base|null|true|false|override|virtual|abstract|sealed|const|params|default|is|as|typeof|nameof|when|yield|partial|where|select|from|add|remove|do|lock)\\b"],
      ["tk-type", "\\b(?:string|int|long|bool|decimal|double|float|object|Guid|DateTime|DateTimeOffset|Task|ValueTask|CancellationToken|IEnumerable|IReadOnlyList|List|Dictionary|IActionResult|ActionResult|IServiceCollection|HttpClient|ILogger|DbContext|DbSet|Exception|byte|char|Func|Action|IMediator|IRequest|IRequestHandler|IConfiguration)\\b"],
      ["tk-fn", "\\b[A-Z][A-Za-z0-9_]*(?=\\()"],
      ["tk-num", "\\b\\d[\\d_.]*\\b"],
    ],
    typescript: [
      ["tk-com", "\\/\\*[\\s\\S]*?\\*\\/"],
      ["tk-com", "\\/\\/[^\\n]*"],
      ["tk-str", "&quot;[\\s\\S]*?&quot;|&#39;[\\s\\S]*?&#39;|`[\\s\\S]*?`"],
      ["tk-key", "\\b(?:import|from|export|const|let|var|function|return|await|async|new|class|interface|extends|implements|public|private|readonly|if|else|for|while|switch|case|break|this|null|true|false|void|type|enum|as|of|in)\\b"],
      ["tk-type", "\\b(?:string|number|boolean|any|void|Observable|Subject|Promise|HubConnection|HubConnectionBuilder|Injectable|Component|NgModule|OnInit)\\b"],
      ["tk-fn", "\\b[a-zA-Z_][A-Za-z0-9_]*(?=\\()"],
      ["tk-num", "\\b\\d[\\d_.]*\\b"],
    ],
    sql: [
      ["tk-com", "--[^\\n]*"],
      ["tk-com", "\\/\\*[\\s\\S]*?\\*\\/"],
      ["tk-str", "&#39;[\\s\\S]*?&#39;"],
      ["tk-key", "\\b(?:SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|NOT|NULL|DEFAULT|BEGIN|COMMIT|ROLLBACK|TRANSACTION|AND|OR|ON|JOIN|INNER|LEFT|GROUP|BY|ORDER|ASC|DESC|CONSTRAINT|UNIQUE|CLUSTERED|NONCLUSTERED|WITH|AS|ALTER|ADD|INCLUDE)\\b"],
      ["tk-type", "\\b(?:UNIQUEIDENTIFIER|NVARCHAR|VARCHAR|INT|BIGINT|DATETIME2|DATETIME|BIT|DECIMAL|MONEY|UUID|TEXT|TIMESTAMPTZ|TIMESTAMP|BOOLEAN|NUMERIC|JSONB|SERIAL|VARBINARY)\\b"],
      ["tk-num", "\\b\\d[\\d_.]*\\b"],
    ],
    json: [
      ["tk-attr", "&quot;[\\w$ -]+&quot;(?=\\s*:)"],
      ["tk-str", "&quot;[\\s\\S]*?&quot;"],
      ["tk-key", "\\b(?:true|false|null)\\b"],
      ["tk-num", "-?\\b\\d[\\d.eE+-]*\\b"],
    ],
    http: [
      ["tk-key", "^(?:GET|POST|PUT|DELETE|PATCH)"],
      ["tk-str", "&quot;[\\s\\S]*?&quot;"],
      ["tk-attr", "\\b[\\w-]+(?=:)"],
    ],
    bash: [
      ["tk-com", "#[^\\n]*"],
      ["tk-str", "&quot;[\\s\\S]*?&quot;|&#39;[\\s\\S]*?&#39;"],
      ["tk-key", "\\b(?:dotnet|npm|ng|az|docker|kubectl|git|cd|run|build|new|add)\\b"],
    ],
    yaml: [
      ["tk-com", "#[^\\n]*"],
      ["tk-str", "&quot;[\\s\\S]*?&quot;|&#39;[\\s\\S]*?&#39;"],
      ["tk-attr", "^\\s*-?\\s*[\\w.$-]+(?=\\s*:)"],
      ["tk-key", "\\b(?:true|false|null|on|off|yes|no)\\b"],
      ["tk-num", "\\b\\d[\\d.]*\\b"],
    ],
    proto: [
      ["tk-com", "\\/\\/[^\\n]*"],
      ["tk-str", "&quot;[\\s\\S]*?&quot;"],
      ["tk-key", "\\b(?:syntax|package|import|option|service|rpc|returns|stream|message|enum|repeated|optional|map|reserved|oneof)\\b"],
      ["tk-type", "\\b(?:int32|int64|uint32|uint64|sint32|sint64|string|bool|double|float|bytes|Timestamp|google)\\b"],
      ["tk-fn", "\\b[A-Z][A-Za-z0-9_]*(?=\\s*\\()"],
      ["tk-num", "\\b\\d[\\d.]*\\b"],
    ],
    graphql: [
      ["tk-com", "#[^\\n]*"],
      ["tk-str", "&quot;[\\s\\S]*?&quot;"],
      ["tk-key", "\\b(?:type|query|mutation|subscription|input|enum|interface|scalar|schema|extend|implements|fragment|on|union|directive)\\b"],
      ["tk-type", "\\b(?:Int|Float|String|Boolean|ID|DateTime|Decimal)\\b"],
      ["tk-num", "\\b\\d[\\d.]*\\b"],
    ],
    text: [],
  };
  const RX = {};
  function getRx(lang) {
    if (RX[lang]) return RX[lang];
    const defs = LANG[lang] || LANG.text;
    if (!defs.length) { RX[lang] = null; return null; }
    const src = defs.map((d) => "(" + d[1] + ")").join("|");
    RX[lang] = new RegExp(src, "gm");
    return RX[lang];
  }
  function highlight(raw, lang) {
    const escd = esc(raw);
    const defs = LANG[lang] || LANG.text;
    const rx = getRx(lang);
    if (!rx) return escd;
    return escd.replace(rx, function () {
      for (let i = 0; i < defs.length; i++) {
        const g = arguments[i + 1];
        if (g != null) return '<span class="' + defs[i][0] + '">' + g + "</span>";
      }
      return arguments[0];
    });
  }
  R.highlight = highlight;

  /* ---------------- detail registry (for drawer) ---------------- */
  R._details = {};
  R._idc = 0;
  R.beginSection = function () { R._details = {}; R._idc = 0; };
  function regDetail(detail) {
    if (!detail) return "";
    const id = "n" + (++R._idc);
    R._details[id] = detail;
    return id;
  }

  /* ============================================================
     Block renderers
     ============================================================ */

  R.sectionHead = function (sec) {
    return (
      '<header class="sec-head">' +
      '<div class="sec-kicker"><span class="kbar"></span>' + esc(sec.kicker || "Architecture") + "</div>" +
      '<h1 class="sec-title">' + esc(sec.title) + "</h1>" +
      (sec.sub ? '<p class="sec-sub">' + sec.sub + "</p>" : "") +
      "</header>"
    );
  };

  // paragraph / rich text
  function para(b) {
    return '<div class="block">' + titleDesc(b) + arr(b.body).map((p) => '<p class="block-desc">' + p + "</p>").join("") + "</div>";
  }
  function titleDesc(b) {
    let h = "";
    if (b.title) h += '<div class="block-title">' + esc(b.title) + "</div>";
    if (b.desc) h += '<p class="block-desc">' + b.desc + "</p>";
    return h;
  }

  // capability / feature cards
  function caps(b) {
    const cols = b.cols || 4;
    const items = b.items.map((it) => {
      const c = catVar(it.cat);
      return (
        '<div class="cap" style="--cap-c:' + c + '">' +
        '<div class="cap-ico">' + R.icon(it.icon || "dot") + "</div>" +
        '<div class="cap-title">' + esc(it.title) + "</div>" +
        (it.desc ? '<div class="cap-desc">' + it.desc + "</div>" : "") +
        "</div>"
      );
    }).join("");
    return '<div class="block">' + titleDesc(b) + '<div class="grid cols-' + cols + '">' + items + "</div></div>";
  }

  function kpis(b) {
    const cols = b.cols || 4;
    const items = b.items.map((it) =>
      '<div class="kpi"><div class="kpi-val">' + esc(it.val) + "</div><div class=\"kpi-label\">" + esc(it.label) + "</div>" +
      (it.note ? '<div class="kpi-note">' + esc(it.note) + "</div>" : "") + "</div>"
    ).join("");
    return '<div class="block">' + titleDesc(b) + '<div class="grid cols-' + cols + '">' + items + "</div></div>";
  }

  function callout(b) {
    const kind = b.kind || "info";
    const ic = { info: "info", ok: "check", warn: "alert", err: "alert" }[kind] || "info";
    return (
      '<div class="block"><div class="callout ' + kind + '">' +
      '<div class="ci">' + R.icon(ic) + "</div>" +
      "<div><div class=\"callout-title\">" + esc(b.title) + "</div>" +
      '<div class="callout-body">' + b.body + "</div></div></div></div>"
    );
  }

  function code(b) {
    const langLabel = b.label || b.lang || "text";
    return (
      '<div class="block">' + titleDesc(b) +
      '<div class="code"><div class="code-head"><div class="code-dots"><i></i><i></i><i></i></div>' +
      '<span class="code-lang">' + esc(langLabel) + "</span>" +
      '<button class="code-copy" type="button">Copy</button></div>' +
      "<pre><code>" + highlight(b.code, b.lang || "text") + "</code></pre></div></div>"
    );
  }

  function table(b) {
    const head = "<tr>" + b.head.map((h) => "<th>" + h + "</th>").join("") + "</tr>";
    const rows = b.rows.map((r) => "<tr>" + r.map((c) => "<td>" + c + "</td>").join("") + "</tr>").join("");
    return '<div class="block">' + titleDesc(b) + '<div class="tbl-wrap"><table class="tbl"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table></div></div>";
  }

  function featureList(b) {
    const cls = b.variant ? " " + b.variant : "";
    const ic = b.variant === "cons" ? "x" : "check";
    const items = b.items.map((t) => '<li><span class="fi">' + R.icon(ic) + "</span><span>" + t + "</span></li>").join("");
    return '<div class="block">' + titleDesc(b) + '<ul class="flist' + cls + '">' + items + "</ul></div>";
  }

  function twoCol(b) {
    return '<div class="block">' + titleDesc(b) + '<div class="two-col">' + b.cols.map((c) => R.renderBlocks(arr(c))).map((h) => "<div>" + h + "</div>").join("") + "</div></div>";
  }

  // pills / tabs
  function tabs(b) {
    const gid = "tabs" + (++R._idc);
    const heads = b.tabs.map((t, i) => '<button class="pill' + (i === 0 ? " active" : "") + '" data-tab="' + gid + "-" + i + '">' + esc(t.label) + "</button>").join("");
    const panes = b.tabs.map((t, i) => '<div class="pane' + (i === 0 ? " active" : "") + '" id="' + gid + "-" + i + '">' + R.renderBlocks(arr(t.blocks)) + "</div>").join("");
    return '<div class="block">' + titleDesc(b) + '<div class="pills" data-tabgroup="' + gid + '">' + heads + "</div>" + panes + "</div>";
  }

  // accordion
  function accordion(b) {
    const items = b.items.map((it) =>
      '<div class="acc-item' + (it.open ? " open" : "") + '"><div class="acc-head">' +
      (it.badge ? '<span class="acc-badge">' + esc(it.badge) + "</span>" : "") +
      "<span>" + esc(it.title) + "</span>" +
      '<span class="chev">' + R.icon("dot").replace(P.dot, '<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>') + "</span></div>" +
      '<div class="acc-body">' + R.renderBlocks(arr(it.blocks)) + "</div></div>"
    ).join("");
    return '<div class="block">' + titleDesc(b) + items + "</div>";
  }

  /* ---------- Node graph diagram ---------- */
  function node(n) {
    const c = catVar(n.cat);
    const clickable = n.detail ? " clickable" : "";
    const id = n.detail ? ' data-node="' + regDetail(Object.assign({ title: n.name, cat: n.cat }, n.detail)) + '"' : "";
    return (
      '<div class="node' + clickable + '" style="--nc:' + c + '"' + id + ">" +
      '<div class="node-ico">' + R.icon(n.icon || "dot") + "</div>" +
      '<div class="node-txt"><div class="node-name">' + esc(n.name) + "</div>" +
      (n.tech ? '<div class="node-tech">' + esc(n.tech) + "</div>" : "") +
      "</div></div>"
    );
  }
  R.node = node;

  function legend(items) {
    if (!items) return "";
    return '<div class="legend">' + items.map((i) => '<div class="legend-item"><span class="sw" style="background:' + catVar(i.cat) + '"></span>' + esc(i.label) + "</div>").join("") + "</div>";
  }

  // vertical flow diagram: array of steps, each = node or {parallel:[nodes], label}
  function flowDiagram(b) {
    let html = "";
    b.steps.forEach((s, i) => {
      if (i > 0) html += '<div class="flow-col">' + (b.steps[i].edge ? '<div class="flow-lbl">' + esc(b.steps[i].edge) + "</div>" : "") + '<div class="arrow-v"></div></div>';
      if (s.parallel) {
        html += '<div class="grid cols-' + Math.min(s.parallel.length, 4) + '" style="width:100%">' + s.parallel.map(node).join("") + "</div>";
      } else {
        html += node(s);
      }
    });
    return (
      '<div class="block">' + titleDesc(b) +
      '<div class="diagram"><div class="diagram-title">' + esc(b.diagramTitle || "Architecture flow") + "</div>" +
      '<div class="diagram-hint">' + R.icon("info") + "Click highlighted nodes for design detail, patterns and code.</div>" +
      '<div class="flow-col" style="align-items:center">' + html + "</div>" +
      legend(b.legend) + "</div></div>"
    );
  }

  // layered diagram (HLD): layers each with rows of nodes
  function layeredDiagram(b) {
    const layers = b.layers.map((L) => {
      const rows = '<div class="layer-row grid cols-' + Math.min(L.nodes.length, 5) + '">' + L.nodes.map(node).join("") + "</div>";
      return '<div class="layer" style="--layer-c:' + catVar(L.cat) + '"><span class="layer-tag" style="color:' + catVar(L.cat) + '">' + esc(L.name) + "</span>" + rows + "</div>";
    }).join('<div class="flow-col"><div class="arrow-v"></div></div>');
    return (
      '<div class="block">' + titleDesc(b) +
      '<div class="diagram"><div class="diagram-title">' + esc(b.diagramTitle || "Layered architecture") + "</div>" +
      '<div class="diagram-hint">' + R.icon("info") + "Click highlighted components to explore responsibilities and code.</div>" +
      layers + legend(b.legend) + "</div></div>"
    );
  }

  /* ---------- State machine ---------- */
  function stateMachine(b) {
    const gid = "sm" + (++R._idc);
    R._details[gid] = b.states; // store states for lookup
    const happy = b.states.filter((s) => !s.fail);
    const fails = b.states.filter((s) => s.fail);
    let track = happy.map((s, i) =>
      (i > 0 ? '<div class="sm-conn"></div>' : "") +
      '<div class="sm-state" data-sm="' + gid + '" data-state="' + esc(s.name) + '" style="--sc:' + (s.color ? "var(" + s.color + ")" : catVar("api")) + '">' +
      '<span class="sm-dot"></span><span class="sm-name">' + esc(s.name) + "</span>" +
      (s.meta ? '<span class="sm-meta">' + esc(s.meta) + "</span>" : "") + "</div>"
    ).join("");
    if (fails.length) {
      track += '<div class="sm-fail"><div class="sm-fail-label">Failure &amp; recovery paths</div>' +
        fails.map((s) =>
          '<div class="sm-state" data-sm="' + gid + '" data-state="' + esc(s.name) + '" style="--sc:var(--err)">' +
          '<span class="sm-dot"></span><span class="sm-name">' + esc(s.name) + "</span>" +
          (s.meta ? '<span class="sm-meta">' + esc(s.meta) + "</span>" : "") + "</div>"
        ).join('<div class="sm-conn"></div>') + "</div>";
    }
    const detail = '<div class="card sm-detail" id="' + gid + '-d"><div class="card-pad"><div class="sm-detail-empty">Select a state to inspect its business meaning, APIs, events and retry behaviour.</div></div></div>';
    return (
      '<div class="block">' + titleDesc(b) +
      '<div class="sm-wrap"><div class="sm-track">' + track + "</div>" + detail + "</div></div>"
    );
  }
  R.renderStateDetail = function (state) {
    const kv = [];
    const map = [
      ["meaning", "Business meaning"], ["api", "API involved"], ["db", "Database change"],
      ["event", "Event generated"], ["topic", "Service Bus topic"], ["subscriber", "Subscriber"],
      ["retry", "Retry behaviour"], ["ui", "UI notification"],
    ];
    map.forEach(([k, label]) => {
      if (state[k]) kv.push("<dt>" + label + "</dt><dd>" + state[k] + "</dd>");
    });
    return (
      '<div class="card-pad"><div class="sec-kicker" style="margin-bottom:8px"><span class="kbar"></span>State</div>' +
      '<h3 style="font-family:var(--ff-mono);font-size:18px;margin-bottom:12px">' + esc(state.name) + "</h3>" +
      '<dl class="sm-kv">' + kv.join("") + "</dl></div>"
    );
  };

  /* ---------- Sequence / flow player ---------- */
  function player(b) {
    const gid = "seq" + (++R._idc);
    const steps = b.steps.map((s, i) =>
      '<div class="seq-step" data-seq="' + gid + '" data-i="' + i + '"><div class="seq-idx"><div class="seq-num">' + (i + 1) + "</div>" +
      (i < b.steps.length - 1 ? '<div class="seq-line"></div>' : "") + "</div>" +
      '<div class="seq-card"><div class="seq-from">' + esc(s.from) + " &rarr; " + esc(s.to) + "</div>" +
      '<div class="seq-title">' + esc(s.title) + "</div>" +
      '<div class="seq-desc">' + s.desc + "</div>" +
      (s.tags ? '<div class="seq-tags">' + s.tags.map((t) => "<span>" + esc(t) + "</span>").join("") + "</div>" : "") +
      "</div></div>"
    ).join("");
    return (
      '<div class="block">' + titleDesc(b) +
      '<div class="player-bar">' +
      '<button class="btn btn-primary" data-player="' + gid + '" data-act="play">' + R.icon("play") + "Play flow</button>" +
      '<button class="btn" data-player="' + gid + '" data-act="step">Step</button>' +
      '<button class="btn" data-player="' + gid + '" data-act="reset">' + R.icon("retry") + "Reset</button>" +
      '<span class="step-counter" id="' + gid + '-c">Step 0 / ' + b.steps.length + "</span></div>" +
      '<div class="seq" id="' + gid + '">' + steps + "</div></div>"
    );
  }

  /* ---------- ADR ---------- */
  function adrs(b) {
    const items = b.items.map((a) =>
      '<div class="adr"><div class="adr-head"><span class="adr-id">' + esc(a.id) + "</span>" +
      '<span class="adr-q">' + esc(a.q) + "</span>" +
      '<span class="adr-status">' + esc(a.status || "Accepted") + "</span></div>" +
      '<div class="adr-body"><div class="adr-grid">' +
      '<div class="adr-cell"><h5>Context</h5><p>' + a.context + "</p></div>" +
      '<div class="adr-cell"><h5>Decision</h5><p>' + a.decision + "</p></div>" +
      '<div class="adr-cell"><h5>Alternatives considered</h5><ul>' + arr(a.alternatives).map((x) => "<li>" + x + "</li>").join("") + "</ul></div>" +
      '<div class="adr-cell"><h5>Consequences &amp; trade-offs</h5><ul>' + arr(a.consequences).map((x) => "<li>" + x + "</li>").join("") + "</ul></div>" +
      "</div></div></div>"
    ).join("");
    return '<div class="block">' + titleDesc(b) + items + "</div>";
  }

  /* ---------- Timeline ---------- */
  function timeline(b) {
    const items = b.items.map((it) =>
      '<div class="tl-item"><div class="tl-phase"><div class="ph">' + esc(it.phase) + "</div>" +
      (it.dur ? '<div class="dur">' + esc(it.dur) + "</div>" : "") + "</div>" +
      '<div class="tl-body"><div class="tl-title">' + esc(it.title) + "</div>" +
      '<div class="tl-desc">' + it.desc + "</div>" +
      (it.chips ? '<div class="tl-chips">' + it.chips.map((c) => "<span>" + esc(c) + "</span>").join("") + "</div>" : "") +
      "</div></div>"
    ).join("");
    return '<div class="block">' + titleDesc(b) + '<div class="timeline">' + items + "</div></div>";
  }

  /* ---------- VS comparison ---------- */
  function vs(b) {
    return (
      '<div class="block">' + titleDesc(b) +
      '<div class="vs"><div class="vs-card"><h4>' + R.icon(b.left.icon || "dot") + esc(b.left.title) + "</h4>" +
      R.renderBlocks(arr(b.left.blocks)) + "</div>" +
      '<div class="vs-mid"><span>VS</span></div>' +
      '<div class="vs-card"><h4>' + R.icon(b.right.icon || "dot") + esc(b.right.title) + "</h4>" +
      R.renderBlocks(arr(b.right.blocks)) + "</div></div></div>"
    );
  }

  /* ---------- Metric bars ---------- */
  function metrics(b) {
    const items = b.items.map((m) =>
      '<div class="mbar"><div class="mbar-head"><b>' + esc(m.label) + "</b><span>" + esc(m.value) + "</span></div>" +
      '<div class="mbar-track"><div class="mbar-fill" style="width:' + (m.pct || 80) + '%"></div></div></div>'
    ).join("");
    return '<div class="block card"><div class="card-pad">' + titleDesc(b) + items + "</div></div>";
  }

  /* ---------- ER diagram ---------- */
  function erd(b) {
    const boxW = b.boxW || 200, hRow = 18, head = 30, padB = 10;
    const ents = {};
    b.entities.forEach((e) => {
      ents[e.id] = Object.assign({}, e, { w: boxW, h: head + e.fields.length * hRow + padB });
    });
    let maxX = 0, maxY = 0;
    Object.keys(ents).forEach((k) => { const e = ents[k]; if (e.x + e.w > maxX) maxX = e.x + e.w; if (e.y + e.h > maxY) maxY = e.y + e.h; });
    const W = maxX + 24, H = maxY + 24;

    // relationship lines
    let rels = "";
    (b.rels || []).forEach((r) => {
      const a = ents[r.from], z = ents[r.to];
      if (!a || !z) return;
      const aC = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, zC = { x: z.x + z.w / 2, y: z.y + z.h / 2 };
      const dx = zC.x - aC.x, dy = zC.y - aC.y;
      let p1, p2;
      if (Math.abs(dx) >= Math.abs(dy)) {
        p1 = { x: dx > 0 ? a.x + a.w : a.x, y: aC.y };
        p2 = { x: dx > 0 ? z.x : z.x + z.w, y: zC.y };
      } else {
        p1 = { x: aC.x, y: dy > 0 ? a.y + a.h : a.y };
        p2 = { x: zC.x, y: dy > 0 ? z.y : z.y + z.h };
      }
      const len = Math.max(1, Math.hypot(p2.x - p1.x, p2.y - p1.y));
      const ux = (p2.x - p1.x) / len, uy = (p2.y - p1.y) / len;
      const px = -uy, py = ux; // perpendicular
      const col = r.logical ? "var(--text-3)" : "var(--accent)";
      const dash = r.logical ? ' stroke-dasharray="5 4"' : "";
      const parts = (r.card || "1:N").split(":");
      const c1 = parts[0], c2 = parts[1] || "";
      const lbl = (pt, s) => {
        const lx = pt.x + ux * (pt === p1 ? 15 : -15) + px * -9;
        const ly = pt.y + uy * (pt === p1 ? 15 : -15) + py * -9;
        return '<text class="erd-card" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" fill="' + col + '">' + esc(s) + "</text>";
      };
      rels +=
        '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y + '" stroke="' + col + '" stroke-width="1.6"' + dash + "/>" +
        '<circle cx="' + p1.x + '" cy="' + p1.y + '" r="3" fill="' + col + '"/>' +
        '<circle cx="' + p2.x + '" cy="' + p2.y + '" r="3" fill="' + col + '"/>' +
        lbl(p1, c1) + lbl(p2, c2);
    });

    // entity boxes (drawn after lines so they sit on top)
    let boxes = "";
    b.entities.forEach((e) => {
      const E = ents[e.id], c = catVar(e.cat);
      let fields = "";
      e.fields.forEach((f, i) => {
        const fy = E.y + head + i * hRow + 13;
        const kc = f.key === "PK" ? "var(--accent)" : f.key === "FK" ? "var(--c-db)" : f.key === "UQ" ? "var(--c-msg)" : "var(--text-3)";
        const tag = f.key ? '<text class="erd-tag" x="' + (E.x + 10) + '" y="' + fy + '" fill="' + kc + '">' + f.key + "</text>" : "";
        fields += tag + '<text class="erd-fld" x="' + (E.x + 40) + '" y="' + fy + '" fill="var(--text-2)">' + esc(f.name) + "</text>";
      });
      boxes +=
        '<g>' +
        '<rect x="' + E.x + '" y="' + E.y + '" width="' + E.w + '" height="' + E.h + '" rx="9" fill="var(--card)" stroke="var(--line-2)" stroke-width="1.4"/>' +
        '<path d="M' + E.x + " " + (E.y + head) + " L" + E.x + " " + (E.y + 9) + " Q" + E.x + " " + E.y + " " + (E.x + 9) + " " + E.y + " L" + (E.x + E.w - 9) + " " + E.y + " Q" + (E.x + E.w) + " " + E.y + " " + (E.x + E.w) + " " + (E.y + 9) + " L" + (E.x + E.w) + " " + (E.y + head) + ' Z" fill="' + c + '" fill-opacity="0.16"/>' +
        '<rect x="' + E.x + '" y="' + E.y + '" width="4" height="' + E.h + '" rx="2" fill="' + c + '"/>' +
        '<line x1="' + E.x + '" y1="' + (E.y + head) + '" x2="' + (E.x + E.w) + '" y2="' + (E.y + head) + '" stroke="var(--line-2)" stroke-width="1"/>' +
        '<text class="erd-name" x="' + (E.x + 12) + '" y="' + (E.y + 20) + '" fill="var(--text)">' + esc(e.label) + "</text>" +
        (e.badge ? '<text class="erd-badge" x="' + (E.x + E.w - 10) + '" y="' + (E.y + 20) + '" text-anchor="end" fill="' + c + '">' + esc(e.badge) + "</text>" : "") +
        fields + "</g>";
    });

    const legend =
      '<div class="legend">' +
      '<div class="legend-item"><span class="erd-key" style="color:var(--accent)">PK</span> Primary key</div>' +
      '<div class="legend-item"><span class="erd-key" style="color:var(--c-db)">FK</span> Foreign key</div>' +
      '<div class="legend-item"><span class="erd-key" style="color:var(--c-msg)">UQ</span> Unique</div>' +
      '<div class="legend-item"><span class="sw" style="background:var(--accent);height:2px;border-radius:2px;width:16px"></span> FK relationship</div>' +
      '<div class="legend-item"><span class="sw" style="background:var(--text-3);height:0;border-top:2px dashed var(--text-3);width:16px"></span> Logical link (no FK)</div>' +
      '<div class="legend-item muted">Cardinality: 1 = one · N = many</div>' +
      "</div>";

    return (
      '<div class="block">' + titleDesc(b) +
      '<div class="diagram"><div class="diagram-title">' + esc(b.diagramTitle || "Entity–relationship diagram") + "</div>" +
      '<div class="diagram-hint">' + R.icon("info") + "Crow’s-foot–style ER model — 1:1, 1:N and M:N via association tables. Scroll horizontally on small screens.</div>" +
      '<div class="erd-scroll"><svg class="erd" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img">' +
      rels + boxes + "</svg></div>" + legend + "</div></div>"
    );
  }

  /* ---------- dispatch ---------- */
  const REG = {
    para, caps, kpis, callout, code, table, featureList, twoCol,
    tabs, accordion, flow: flowDiagram, layered: layeredDiagram,
    stateMachine, player, adrs, timeline, vs, metrics, erd,
  };

  R.renderBlocks = function (blocks) {
    return arr(blocks).map((b) => {
      const fn = REG[b.type];
      if (!fn) return "";
      try { return fn(b); } catch (e) { return '<div class="callout err"><div class="ci"></div><div>Block error: ' + esc(b.type) + " — " + esc(e.message) + "</div></div>"; }
    }).join("");
  };

  R.renderSection = function (sec) {
    R.beginSection();
    return '<div class="view-anim">' + R.sectionHead(sec) + R.renderBlocks(sec.blocks) + "</div>";
  };
})();
