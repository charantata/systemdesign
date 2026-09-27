/* ============================================================
   App controller — navigation, routing, interactivity
   ============================================================ */
(function () {
  "use strict";

  const SECTIONS = window.SECTIONS || [];
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

  const view = $("#view");
  const navList = $("#navList");
  const content = $("#content");
  let current = 0;

  /* ---------- build sidebar ---------- */
  function buildNav() {
    const groups = [];
    const map = {};
    SECTIONS.forEach((s, i) => {
      if (!map[s.group]) { map[s.group] = []; groups.push(s.group); }
      map[s.group].push({ s, i });
    });
    let html = "";
    groups.forEach((g) => {
      html += '<div class="nav-group-label">' + R.esc(g) + "</div>";
      map[g].forEach(({ s, i }) => {
        html +=
          '<div class="nav-item" data-idx="' + i + '">' +
          '<span class="nav-num">' + s.num + "</span>" +
          '<span class="nav-label">' + R.esc(s.label) + "</span></div>";
      });
    });
    navList.innerHTML = html;
    $$(".nav-item", navList).forEach((el) => {
      el.addEventListener("click", () => { go(+el.dataset.idx); closeMobileNav(); });
    });
  }

  function markActive() {
    $$(".nav-item").forEach((el) => el.classList.toggle("active", +el.dataset.idx === current));
    const active = $(".nav-item.active");
    if (active) active.scrollIntoView({ block: "nearest" });
    const pct = ((current + 1) / SECTIONS.length) * 100;
    $("#progressBar").style.width = pct + "%";
    $("#progressText").textContent = "Section " + (current + 1) + " of " + SECTIONS.length;
  }

  /* ---------- render a section ---------- */
  function go(idx) {
    if (idx < 0 || idx >= SECTIONS.length) return;
    current = idx;
    const sec = SECTIONS[idx];
    view.innerHTML = R.renderSection(sec);
    content.scrollTop = 0;
    window.scrollTo({ top: 0 });
    markActive();
    wire();
    location.hash = sec.id;
  }

  /* ---------- wire interactivity after render ---------- */
  function wire() {
    // code copy
    $$(".code-copy").forEach((btn) => {
      btn.addEventListener("click", () => {
        const codeEl = btn.closest(".code").querySelector("code");
        const text = codeEl.innerText;
        navigator.clipboard && navigator.clipboard.writeText(text);
        const old = btn.textContent; btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = old), 1400);
      });
    });

    // pill tabs
    $$(".pills").forEach((group) => {
      const gid = group.dataset.tabgroup;
      $$(".pill", group).forEach((pill) => {
        pill.addEventListener("click", () => {
          $$(".pill", group).forEach((p) => p.classList.remove("active"));
          pill.classList.add("active");
          const paneId = pill.dataset.tab;
          // scope panes to the same block
          const block = group.closest(".block");
          $$(".pane", block).forEach((pn) => pn.classList.toggle("active", pn.id === paneId));
        });
      });
    });

    // accordion + adr
    $$(".acc-head").forEach((h) => h.addEventListener("click", () => h.parentElement.classList.toggle("open")));
    $$(".adr-head").forEach((h) => h.addEventListener("click", () => h.parentElement.classList.toggle("open")));

    // drawer nodes
    $$("[data-node]").forEach((n) => {
      n.addEventListener("click", () => {
        const d = R._details[n.dataset.node];
        if (d) openDrawer(d, n);
      });
    });

    // state machine
    $$(".sm-state").forEach((st) => {
      st.addEventListener("click", () => {
        const gid = st.dataset.sm;
        const states = R._details[gid];
        const state = states.find((s) => s.name === st.dataset.state);
        $$('.sm-state[data-sm="' + gid + '"]').forEach((x) => x.classList.remove("active"));
        st.classList.add("active");
        const panel = $("#" + gid + "-d");
        if (panel && state) panel.innerHTML = R.renderStateDetail(state);
      });
    });

    // flow player
    $$("[data-player]").forEach((btn) => {
      btn.addEventListener("click", () => runPlayer(btn.dataset.player, btn.dataset.act));
    });
  }

  /* ---------- player logic ---------- */
  const players = {};
  function runPlayer(gid, act) {
    const seq = $("#" + gid);
    if (!seq) return;
    const steps = $$(".seq-step", seq);
    const counter = $("#" + gid + "-c");
    let st = players[gid] || { i: 0, timer: null };
    players[gid] = st;

    function paint() {
      steps.forEach((s, idx) => {
        s.classList.toggle("on", idx === st.i - 1);
        s.classList.toggle("done", idx < st.i - 1);
      });
      counter.textContent = "Step " + st.i + " / " + steps.length;
      if (st.i > 0 && steps[st.i - 1]) steps[st.i - 1].scrollIntoView({ block: "center", behavior: "smooth" });
    }
    function stop() { if (st.timer) { clearInterval(st.timer); st.timer = null; } }

    if (act === "reset") { stop(); st.i = 0; steps.forEach((s) => s.classList.remove("on", "done")); counter.textContent = "Step 0 / " + steps.length; return; }
    if (act === "step") { stop(); if (st.i < steps.length) st.i++; paint(); return; }
    if (act === "play") {
      stop();
      if (st.i >= steps.length) st.i = 0;
      st.timer = setInterval(() => {
        if (st.i >= steps.length) { stop(); return; }
        st.i++; paint();
        if (st.i >= steps.length) stop();
      }, 1100);
    }
  }

  /* ---------- drawer ---------- */
  const drawer = $("#drawer"), drawerScrim = $("#drawerScrim");
  function openDrawer(d, srcNode) {
    if (srcNode) { srcNode.classList.add("pop"); setTimeout(() => srcNode.classList.remove("pop"), 500); }
    $("#drawerKicker").textContent = d.kicker || "Component";
    $("#drawerTitle").textContent = d.title || "Detail";
    let body = "";
    (d.sections || []).forEach((s) => {
      body += "<h4>" + R.esc(s.h) + "</h4>";
      if (s.p) body += "<p>" + s.p + "</p>";
      if (s.list) body += '<ul class="flist" style="margin:6px 0 4px">' + s.list.map((x) => '<li><span class="fi">' + R.icon("check") + "</span><span>" + x + "</span></li>").join("") + "</ul>";
      if (s.code) body += R.renderBlocks([{ type: "code", lang: s.lang || "csharp", label: s.label, code: s.code }]);
      if (s.table) body += R.renderBlocks([{ type: "table", head: s.table.head, rows: s.table.rows }]);
    });
    $("#drawerBody").innerHTML = body;
    $("#drawerBody").scrollTop = 0;
    drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false");
    drawerScrim.classList.add("show");
    // wire copy buttons inside drawer
    $$(".code-copy", drawer).forEach((btn) => btn.addEventListener("click", () => {
      const text = btn.closest(".code").querySelector("code").innerText;
      navigator.clipboard && navigator.clipboard.writeText(text);
      const old = btn.textContent; btn.textContent = "Copied!"; setTimeout(() => (btn.textContent = old), 1400);
    }));
  }
  function closeDrawer() { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); drawerScrim.classList.remove("show"); }
  $("#drawerClose").addEventListener("click", closeDrawer);
  drawerScrim.addEventListener("click", closeDrawer);

  /* ---------- top bar controls ---------- */
  $("#prevBtn").addEventListener("click", () => go(current - 1));
  $("#nextBtn").addEventListener("click", () => go(current + 1));
  $("#themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("aa-theme", next); } catch (e) {}
  });

  // mobile nav
  const sidebar = $("#sidebar"), scrim = $("#scrim");
  function closeMobileNav() { sidebar.classList.remove("open"); scrim.classList.remove("show"); }
  $("#navToggle").addEventListener("click", () => { sidebar.classList.toggle("open"); scrim.classList.toggle("show"); });
  scrim.addEventListener("click", closeMobileNav);

  // keyboard nav
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "Escape") closeDrawer();
    if (e.key === "ArrowRight" && !e.ctrlKey && !e.metaKey) { /* keep for future */ }
  });

  /* ---------- init ---------- */
  try {
    const saved = localStorage.getItem("aa-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  } catch (e) {}

  // auto-number sections by final order so inserting tabs never desyncs badges
  SECTIONS.forEach((s, i) => { s.num = String(i + 1).padStart(2, "0"); });

  buildNav();
  // route from hash
  const hash = location.hash.replace("#", "");
  const startIdx = Math.max(0, SECTIONS.findIndex((s) => s.id === hash));
  go(startIdx < 0 ? 0 : startIdx);
})();
