/* ============================================================
   QUANTUM ARCADE — shell.js
   Boots the selected game, wires the status bar, scoreboard,
   instructions, restart, theme, sound and error handling.

   ---- GAME AUTHOR CONTRACT ----------------------------------
   QG.register("game-id", function (root, api) {
       // build your UI inside `root`
       // return nothing; use api.onCleanup(fn) for teardown
   });

   api inherits EVERYTHING from QG (api.h, api.draw, api.U, api.Qubit,
   api.QReg, api.GATES, api.PAL, api.FONT, api.toast, api.store, api.sfx,
   api.wait, api.modal, api.esc, api.quantumPick, api.dist ...).

   Extra helpers added by the shell:
     api.root          HTMLElement to render into (the stage)
     api.game          the registry entry (title, num, accent, ...)
     api.accent        accent colour hex for this game
     api.setStatus(s)  set the status bar text
     api.setScores([{name, value, color, turn}])
     api.log(msg)      append a line to the move log panel
     api.clearLog()
     api.overlay({title, sub, actions}) -> { close() }
     api.closeOverlay()
     api.win(title, sub) / api.lose(title, sub)
     api.setBest(v) / api.getBest()
     api.restart()
     api.onCleanup(fn)  teardown callback (REQUIRED for timers/listeners)
     api.canvas(opts)   QG.canvas(api.root, opts) + auto cleanup
     api.loop(fn) / api.every(ms, fn) / api.after(ms, fn)  auto cleanup
     api.on(target, ev, fn)  auto cleanup
     api.grid(cols, rows, onCell, cellClass)  board builder
     api.btn(label, kind, onClick, attrs)
   ============================================================ */
(function () {
  "use strict";
  var QG = window.QG;
  var h = QG.h, PAL = QG.PAL;

  var stage = document.getElementById("stage");
  var statusEl = document.getElementById("gStatus");
  var dotEl = document.getElementById("gDot");
  var scoresEl = document.getElementById("gScores");
  var logPanel = document.getElementById("logPanel");
  var logEl = document.getElementById("gLog");
  var bestEl = document.getElementById("gBest");
  var moreEl = document.getElementById("moreGames");

  var meta = QG.byId(QG.query("g") || "quantum-chess") || QG.GAMES[0];
  var accent = QG.accentHex(meta);
  var cleanups = [];
  var overlayEl = null;

  /* ---------------- THEME + SOUND ---------------- */
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    QG.store.set("theme", t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "dark" ? "#101018" : "#fffdf4");
  }
  setTheme(QG.store.get("theme", "light"));
  document.getElementById("themeBtn").addEventListener("click", function () {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
    QG.sfx.click();
  });
  var soundBtn = document.getElementById("soundBtn");
  function paintSound() { soundBtn.innerHTML = QG.sfx.isMuted() ? "&#128263;" : "&#128266;"; }
  soundBtn.addEventListener("click", function () { QG.sfx.toggle(); paintSound(); });
  paintSound();

  /* ---------------- HEADER ---------------- */
  document.title = meta.title + " - Quantum Arcade";
  document.getElementById("gName").textContent = meta.title;
  document.getElementById("gNum").textContent = "GAME " + String(meta.num).padStart(2, "0") + " / 40";
  var gEmoji = document.getElementById("gEmoji");
  gEmoji.textContent = meta.emoji;
  gEmoji.style.background = accent;
  document.documentElement.style.setProperty("--accent", accent);

  /* ---------------- INSTRUCTIONS ---------------- */
  var instr = document.getElementById("gInstr");
  (meta.instr || []).forEach(function (line) { instr.appendChild(h("li", line)); });
  document.getElementById("gCtrl").innerHTML = "<b>Controls:</b> " + QG.esc(meta.controls || "Tap / click.");

  /* ---------------- BEST SCORE ---------------- */
  function paintBest() {
    var b = QG.store.get("best:" + meta.id, null);
    bestEl.innerHTML = b === null ? "<b>Best:</b> -" : "<b>Best:</b> " + QG.esc(String(b));
  }
  paintBest();

  /* ---------------- MORE GAMES ---------------- */
  (function () {
    var pool = QG.GAMES.filter(function (g) { return g.id !== meta.id; });
    pool = QG.U.shuffle(pool).slice(0, 5);
    pool.forEach(function (g) {
      moreEl.appendChild(h("a.btn.btn--ghost.btn--sm", {
        href: "game.html?g=" + g.id,
        style: "justify-content:flex-start;text-align:left;--btn-bg:var(--card)"
      }, h("span", { style: "font-size:1rem" }, g.emoji), " ", h("span", { style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, g.title)));
    });
  })();

  /* ---------------- API ---------------- */
  var api = Object.create(QG);
  api.root = stage;
  api.game = meta;
  api.accent = accent;
  api.accentName = meta.accent;

  api.setStatus = function (t) { statusEl.textContent = String(t); };
  api.setScores = function (arr) {
    QG.clear(scoresEl);
    (arr || []).forEach(function (s) {
      scoresEl.appendChild(h("span.score" + (s.turn ? ".is-turn" : ""),
        s.color ? h("i.score__swatch", { style: "background:" + (PAL[s.color] || s.color) }) : null,
        h("span", (s.name ? s.name + " " : "") + s.value)
      ));
    });
  };
  api.log = function (msg) {
    logPanel.hidden = false;
    logEl.appendChild(h("div", { html: msg }));
    while (logEl.children.length > 60) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
  };
  api.clearLog = function () { QG.clear(logEl); logPanel.hidden = true; };

  api.onCleanup = function (fn) { if (typeof fn === "function") cleanups.push(fn); };
  api.canvas = function (opts) {
    var cv = QG.canvas(stage, opts);
    api.onCleanup(cv.destroy);
    return cv;
  };
  api.loop = function (fn) { var stop = QG.loop(fn); api.onCleanup(stop); return stop; };
  api.every = function (ms, fn) { var stop = QG.every(ms, fn); api.onCleanup(stop); return stop; };
  api.after = function (ms, fn) { var stop = QG.after(ms, fn); api.onCleanup(stop); return stop; };
  api.on = function (target, ev, fn, opt) {
    target.addEventListener(ev, fn, opt);
    api.onCleanup(function () { target.removeEventListener(ev, fn, opt); });
  };
  api.btn = function (label, kind, onClick, attrs) {
    attrs = attrs || {};
    attrs.type = "button";
    var b = h("button.btn" + (kind ? ".btn--" + kind : ""), attrs, label);
    if (onClick) b.addEventListener("click", function (e) { QG.sfx.tap(); onClick(e, b); });
    return b;
  };
  api.grid = function (cols, rows, onCell, cellClass) {
    var el = h("div.board", { style: "grid-template-columns:repeat(" + cols + ",1fr);max-width:" + Math.min(560, cols * 62) + "px;margin:0 auto;" });
    var cells = [];
    for (var r = 0; r < rows; r++) {
      cells[r] = [];
      for (var c = 0; c < cols; c++) {
        var cell = h("div.cell" + (cellClass ? "." + cellClass : ""), { "data-r": r, "data-c": c });
        (function (rr, cc, cc2) {
          if (onCell) cc2.addEventListener("click", function () { onCell(rr, cc, cc2); });
        })(r, c, cell);
        el.appendChild(cell);
        cells[r][c] = cell;
      }
    }
    return {
      el: el, cells: cells,
      at: function (r, c) { return cells[r] ? cells[r][c] : null; },
      set: function (r, c, html, cls) {
        var cell = this.at(r, c); if (!cell) return;
        cell.innerHTML = html === null || html === undefined ? "" : html;
        if (cls !== undefined) cell.className = "cell" + (cls ? " " + cls : "");
      },
      cls: function (r, c, name, on) {
        var cell = this.at(r, c); if (!cell) return;
        if (on) cell.classList.add(name); else cell.classList.remove(name);
      }
    };
  };

  /* ---------------- OVERLAY ---------------- */
  api.overlay = function (opts) {
    api.closeOverlay();
    opts = opts || {};
    var box = h("div.overlay__box");
    if (opts.title) box.appendChild(h("h2", opts.title));
    if (opts.sub) box.appendChild(h("p", opts.sub));
    if (opts.body) box.appendChild(opts.body);
    var actions = h("div.row.mt16", { style: "justify-content:center" });
    (opts.actions || []).forEach(function (a) {
      actions.appendChild(api.btn(a.label, a.kind || "ghost", function () { api.closeOverlay(); if (a.onClick) a.onClick(); }));
    });
    if (actions.children.length) box.appendChild(actions);
    overlayEl = h("div.overlay", box);
    stage.appendChild(overlayEl);
    return { close: api.closeOverlay, el: overlayEl, box: box };
  };
  api.closeOverlay = function () {
    if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
    overlayEl = null;
  };
  api.win = function (title, sub) {
    QG.sfx.win();
    api.overlay({
      title: title || "You win!",
      sub: sub || "Measurement was kind to you.",
      actions: [
        { label: "\u21BB Play again", kind: "lime", onClick: api.restart },
        { label: "Next game \u25B6", kind: "cyan", onClick: function () { location.href = "game.html?g=" + QG.GAMES[(meta.num % 40)].id; } }
      ]
    });
  };
  api.lose = function (title, sub) {
    QG.sfx.lose();
    api.overlay({
      title: title || "Collapsed.",
      sub: sub || "The wavefunction did not go your way.",
      actions: [
        { label: "\u21BB Try again", kind: "magenta", onClick: api.restart },
        { label: "All games", kind: "ghost", onClick: function () { location.href = "index.html#games"; } }
      ]
    });
  };
  api.setBest = function (v) {
    var cur = QG.store.get("best:" + meta.id, null);
    var better = cur === null || (typeof v === "number" ? v > cur : String(v) > String(cur));
    if (better) { QG.store.set("best:" + meta.id, v); paintBest(); return true; }
    return false;
  };
  api.getBest = function () { return QG.store.get("best:" + meta.id, null); };
  api.restart = function () { boot(); };

  /* ---------------- BOOT / TEARDOWN ---------------- */
  function teardown() {
    for (var i = cleanups.length - 1; i >= 0; i--) {
      try { cleanups[i](); } catch (e) { console.error(e); }
    }
    cleanups = [];
    api.closeOverlay();
    QG.clear(stage);
    api.clearLog();
  }

  function boot() {
    teardown();
    statusEl.textContent = "Ready.";
    dotEl.style.background = PAL.lime;
    api.setScores([]);
    var fn = QG.games[meta.id];
    if (typeof fn !== "function") {
      stage.appendChild(h("div.panel", { style: "border-radius:var(--sketch-c);text-align:center" },
        h("h2", { style: "font-size:1.4rem;text-transform:uppercase" }, "Game module missing"),
        h("p.hand", { style: "font-size:1.3rem" }, "This game did not register itself. Check js/games/*.js."),
        h("p.small.muted", "Looking for id: " + meta.id)
      ));
      return;
    }
    try {
      fn(stage, api);
      // safety: if a game forgot to append anything, tell the player
      if (!stage.children.length) {
        stage.appendChild(h("p.hand.tc", { style: "font-size:1.3rem" }, "This game rendered nothing."));
      }
    } catch (err) {
      console.error("[quantum-arcade] " + meta.id + " failed:", err);
      QG.clear(stage);
      stage.appendChild(h("div.panel", { style: "border-radius:var(--sketch-c)" },
        h("h2", { style: "font-size:1.3rem;text-transform:uppercase;color:var(--magenta)" }, "Runtime error"),
        h("p.small", { style: "font-family:var(--font-mono);white-space:pre-wrap;word-break:break-word" }, String(err && err.message ? err.message : err)),
        h("p.small.muted", "Open the browser console for the full trace.")
      ));
      statusEl.textContent = "Error - see message.";
      dotEl.style.background = PAL.red;
    }
  }

  document.getElementById("btnRestart").addEventListener("click", function () { QG.sfx.click(); boot(); });
  document.getElementById("btnHelp").addEventListener("click", function () {
    QG.modal({
      title: meta.title,
      body: h("div",
        h("p", { class: "hand", style: "font-size:1.25rem" }, meta.desc),
        h("ol.instr", (meta.instr || []).map(function (t) { return h("li", t); })),
        h("div.controls-note", { html: "<b>Controls:</b> " + QG.esc(meta.controls || "Tap / click.") })
      )
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlayEl) api.closeOverlay();
  });

  /* ---------------- LAZY PACK LOADER ----------------
     Each pack holds 5 games (~50 KB). Loading only the pack that owns the
     requested game keeps the first paint fast on phones. If the guess is
     wrong we fall back to the remaining packs, one at a time. */
  var loaded = {};
  function loadScript(p, next) {
    if (loaded[p]) { next(); return; }
    loaded[p] = 1;
    var s = document.createElement("script");
    s.src = "js/games/pack" + p + ".js";
    s.onload = next;
    s.onerror = next;
    document.head.appendChild(s);
  }

  function loadGame() {
    stage.appendChild(h("p.hand.tc", { style: "font-size:1.3rem;padding:34px 10px;margin:0" }, "Measuring the wavefunction..."));
    var first = Math.max(1, Math.ceil(meta.num / 5));
    var order = [first, 1, 2, 3, 4, 5, 6, 7, 8].filter(function (v, i, a) { return a.indexOf(v) === i; });
    var i = 0;
    (function step() {
      if (typeof QG.games[meta.id] === "function" || i >= order.length) { QG.clear(stage); boot(); return; }
      loadScript(order[i++], function () {
        if (typeof QG.games[meta.id] === "function") { QG.clear(stage); boot(); }
        else step();
      });
    })();
  }

  window.QAPI = api; // handy for debugging in the console
  loadGame();
})();
