/* ============================================================
   QUANTUM ARCADE - games/pack2.js
   Games 6-10
     6  quantum-tower-defense
     7  qubit-duel
     8  quantum-card-game
     9  quantum-dice
     10 quantum-rps
   Written against the pack1.js house style: plain ES5, QG.draw
   on canvas, shared .css widgets in the DOM, teardown via api.*
   ============================================================ */
(function () {
  "use strict";
  var QG = window.QG, h = QG.h, PAL = QG.PAL, U = QG.U;

  /* ---------------- shared little helpers ---------------- */
  function isDark() { return document.documentElement.getAttribute("data-theme") === "dark"; }
  function inkCol() { return isDark() ? "#f2f2ff" : PAL.ink; }
  function paperCol() { return isDark() ? "#141422" : PAL.paper2; }
  function faint(a) { return isDark() ? "rgba(242,242,255," + a + ")" : "rgba(13,13,18," + a + ")"; }

  function meterRow(label, pct, color, val) {
    var row = h("div.qmeter__row");
    row.appendChild(h("span.qmeter__lab", label));
    var bar = h("div.qmeter__bar");
    bar.appendChild(h("div.qmeter__fill", {
      style: "width:" + Math.max(0, Math.min(100, pct)).toFixed(1) + "%;background:" + color
    }));
    row.appendChild(bar);
    row.appendChild(h("span.qmeter__val", val));
    return row;
  }

  // small tile grid with big tap targets (api.grid caps at 62px/col, too small here)
  function tileGrid(cols, count, onTap) {
    var el = h("div", { style: "display:grid;grid-template-columns:repeat(" + cols + ",1fr);gap:8px" });
    var cells = [];
    for (var i = 0; i < count; i++) {
      var t = h("button.tile", { type: "button", style: "min-height:74px;padding:8px 6px" });
      (function (idx, btn) {
        btn.addEventListener("click", function () { QG.sfx.tap(); onTap(idx, btn); });
      })(i, t);
      el.appendChild(t);
      cells.push(t);
    }
    return { el: el, cells: cells };
  }

  /* ==========================================================
     6. QUANTUM TOWER DEFENSE
     Enemies are probability clouds on a fixed branching path.
     ========================================================== */
  QG.register("quantum-tower-defense", function (root, api) {
    var COLS = 13, ROWS = 9, CW = 620, CH = 430, PAD = 12;
    var cs = Math.min((CW - PAD * 2) / COLS, (CH - PAD * 2) / ROWS);
    var ox = (CW - cs * COLS) / 2, oy = (CH - cs * ROWS) / 2;

    var MAIN = [
      [0, 0], [1, 0], [2, 0], [3, 0],
      [3, 1], [3, 2], [3, 3],
      [3, 4], [3, 5], [3, 6],
      [3, 7], [3, 8],
      [3, 9], [3, 10], [3, 11],
      [4, 11], [5, 11], [6, 11],
      [6, 10], [6, 9], [6, 8], [6, 7], [6, 6], [6, 5],
      [6, 4], [6, 3], [6, 2], [6, 1], [6, 0]
    ];
    // detours: the cloud splits at "at" and both arms merge again at "rejoin"
    var BRANCHES = [
      { at: 6, cells: [[4, 3], [4, 4], [4, 5], [4, 6]], rejoin: 9 },
      { at: 7, cells: [[2, 4], [2, 5]], rejoin: 8 },
      { at: 11, cells: [[4, 8], [4, 9], [4, 10]], rejoin: 13 },
      { at: 12, cells: [[2, 9], [2, 10]], rejoin: 13 },
      { at: 21, cells: [[5, 7], [5, 6], [5, 5], [5, 4], [5, 3]], rejoin: 25 },
      { at: 22, cells: [[7, 6], [7, 5]], rejoin: 23 }
    ];

    var TOWER_COST = { splitter: 25, collapser: 55, phase: 35 };
    var TOWER_COL = { splitter: PAL.cyan, collapser: PAL.magenta, phase: PAL.purple };
    var TOWER_GLYPH = { splitter: "\u00F7", collapser: "\u2299", phase: "\u223F" };
    var TOWER_NAME = { splitter: "SPLITTER", collapser: "COLLAPSER", phase: "PHASE" };

    var cellOf = function (r, c) { return r * COLS + c; };
    var PATH = MAIN.map(function (p) { return cellOf(p[0], p[1]); });
    var CORE = PATH[PATH.length - 1];
    var SPAWN = PATH[0];
    var nextOf = {}, pathSet = {};

    PATH.forEach(function (cell, i) {
      pathSet[cell] = 1;
      if (i < PATH.length - 1) nextOf[cell] = [PATH[i + 1]];
    });
    BRANCHES.forEach(function (b) {
      var head = PATH[b.at], tail = PATH[b.rejoin];
      var cells = b.cells.map(function (p) { return cellOf(p[0], p[1]); });
      nextOf[head] = [PATH[b.at + 1], cells[0]];
      for (var i = 0; i < cells.length; i++) {
        pathSet[cells[i]] = 1;
        nextOf[cells[i]] = [i < cells.length - 1 ? cells[i + 1] : tail];
      }
    });

    var slotSet = {}, slotList = [];
    PATH.forEach(function (cell) {
      var r = Math.floor(cell / COLS), c = cell % COLS;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nr = r + d[0], nc = c + d[1];
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
        var j = cellOf(nr, nc);
        if (pathSet[j] || slotSet[j]) return;
        slotSet[j] = 1; slotList.push(j);
      });
    });

    /* ---------------- state ---------------- */
    var wave, lives, cash, towers, enemies, queue, phase, spawnTimer, over, fast, measureCd, eid, tickAcc;

    function reset() {
      wave = 0; lives = 10; cash = 90; towers = {}; enemies = []; queue = [];
      phase = "build"; spawnTimer = 0; over = false; fast = false; measureCd = 0;
      eid = 0; tickAcc = 0;
      renderStatic();
      paint();
      api.setStatus("Build towers on the marked slots, then press START WAVE.");
    }

    /* ---------------- cloud maths ---------------- */
    function norm(e) {
      var s = 0, k;
      for (k in e.amp) s += e.amp[k] * e.amp[k];
      return s || 1;
    }
    function probAt(e, cell) {
      var a = e.amp[cell];
      if (a === undefined) return 0;
      return (a * a) / norm(e);
    }
    function cloudSize(e) { var n = 0, k; for (k in e.amp) n++; return n; }
    function renormalise(e) {
      var s = 0, k;
      for (k in e.amp) s += e.amp[k] * e.amp[k];
      if (s < 1e-9) { e.dead = true; e.amp = {}; return; }
      var f = 1 / Math.sqrt(s);
      for (k in e.amp) e.amp[k] *= f;
    }
    function capCells(e) {
      var keys = [], k;
      for (k in e.amp) keys.push({ k: k, a: Math.abs(e.amp[k]) });
      if (keys.length <= 4) return;
      keys.sort(function (x, y) { return y.a - x.a; });
      var out = {};
      for (var i = 0; i < 4; i++) out[keys[i].k] = e.amp[keys[i].k];
      e.amp = out;
      renormalise(e);
    }

    function makeEnemy() {
      var hp = 16 + wave * 6;
      return { id: ++eid, hp: hp, maxHp: hp, amp: {}, leak: 0, dead: false, leaked: false, counted: false };
    }
    function stepEnemy(e) {
      var out = {}, leaked = 0, k;
      for (k in e.amp) {
        var cell = +k, a = e.amp[cell];
        if (cell === CORE) { leaked += a * a; continue; }
        var succ = nextOf[cell];
        if (!succ || !succ.length) { leaked += a * a; continue; }
        var share = succ.length > 1 ? a / Math.SQRT2 : a;
        for (var i = 0; i < succ.length; i++) out[succ[i]] = (out[succ[i]] || 0) + share;
      }
      e.leak += leaked;
      e.amp = out;
      if (cloudSize(e) === 0) { e.dead = true; return; }
      capCells(e);
      if (e.leak >= 0.5) { e.leaked = true; e.dead = true; }
    }

    function damage(e, d) {
      if (e.dead) return;
      e.hp -= d;
      if (e.hp <= 0) e.dead = true;
    }
    function collapseEnemy(e) {
      var tot = norm(e), r = Math.random() * tot, acc = 0, pick = null, k;
      for (k in e.amp) {
        acc += e.amp[k] * e.amp[k];
        if (r <= acc + 1e-12) { pick = +k; break; }
      }
      if (pick === null) { for (k in e.amp) pick = +k; }
      if (pick === null) return;
      var out = {};
      out[pick] = e.amp[pick] < 0 ? -1 : 1;
      e.amp = out;
    }
    function splitFurther(e, cells) {
      var size = cloudSize(e);
      for (var i = 0; i < cells.length && size < 4; i++) {
        var cell = cells[i];
        if (e.amp[cell] === undefined) continue;
        var succ = nextOf[cell];
        if (!succ || !succ.length) continue;
        var target = null;
        for (var j = 0; j < succ.length; j++) {
          if (e.amp[succ[j]] === undefined) { target = succ[j]; break; }
        }
        if (target === null) continue;
        var a = e.amp[cell];
        e.amp[cell] = a / Math.SQRT2;
        e.amp[target] = (e.amp[target] || 0) + a / Math.SQRT2;
        size++;
      }
    }

    /* ---------------- towers ---------------- */
    function towersFire() {
      var k;
      for (k in towers) {
        var t = towers[k];
        var cell = t.cell, tr = Math.floor(cell / COLS), tc = cell % COLS;
        var fired = false;
        for (var i = 0; i < enemies.length; i++) {
          var e = enemies[i];
          if (e.dead) continue;
          var inRange = [], kk;
          for (kk in e.amp) {
            var cc = +kk, rr = Math.floor(cc / COLS), rc = cc % COLS;
            if (Math.max(Math.abs(rr - tr), Math.abs(rc - tc)) <= 1) inRange.push(cc);
          }
          if (!inRange.length) continue;
          fired = true;
          var mass = 0;
          for (var m = 0; m < inRange.length; m++) mass += probAt(e, inRange[m]);
          if (t.type === "splitter") {
            damage(e, 6 * mass);
            splitFurther(e, inRange);
          } else if (t.type === "collapser") {
            collapseEnemy(e);
            damage(e, 14);
          } else {
            for (var q = 0; q < inRange.length; q++) e.amp[inRange[q]] *= -0.78;
            damage(e, 8 * mass);
          }
        }
        t.flash = fired ? 2 : Math.max(0, (t.flash || 0) - 1);
      }
    }

    /* ---------------- wave flow ---------------- */
    function startWave() {
      if (over || phase !== "build") return;
      if (wave >= 8) return;
      wave++;
      var n = 3 + wave;
      queue = [];
      for (var i = 0; i < n; i++) queue.push(1);
      phase = "running";
      spawnTimer = 0;
      QG.sfx.gate();
      api.log("Wave <b>" + wave + "</b> incoming - " + n + " probability clouds.");
      paint();
    }

    function tick() {
      if (over) return;
      if (measureCd > 0) measureCd--;
      if (phase === "running") {
        if (queue.length && spawnTimer <= 0) {
          var e = makeEnemy();
          e.amp[SPAWN] = 1;
          enemies.push(e);
          queue.pop();
          spawnTimer = 3;
        }
        spawnTimer--;
        var i;
        for (i = 0; i < enemies.length; i++) if (!enemies[i].dead) stepEnemy(enemies[i]);
        towersFire();
        for (i = 0; i < enemies.length; i++) {
          var en = enemies[i];
          if (en.dead && !en.counted) {
            en.counted = true;
            if (en.leaked) {
              lives--;
              api.log("A cloud reached the core. <b>-1 life</b>");
              QG.sfx.lose();
            } else {
              var rw = 12 + wave * 3;
              cash += rw;
              api.log("Cloud collapsed. <b>+" + rw + "</b> cash.");
              QG.sfx.good();
            }
          }
        }
        var alive = [];
        for (i = 0; i < enemies.length; i++) if (!enemies[i].dead) alive.push(enemies[i]);
        enemies = alive;

        if (lives <= 0) {
          over = true;
          paint();
          api.lose("The core collapsed.", "A probability cloud reached the core " + (10 - lives) + " times.");
          return;
        }
        if (!enemies.length && !queue.length) {
          var bonus = 25 + wave * 8;
          cash += bonus;
          api.log("Wave " + wave + " cleared. <b>+" + bonus + "</b> cash.");
          QG.sfx.good();
          if (wave >= 8) {
            over = true;
            api.setBest(8);
            paint();
            api.win("Core secured!", "You survived all 8 quantum waves with " + lives + " lives left.");
            return;
          }
          phase = "build";
          api.setStatus("Wave " + wave + " cleared. Build, then start wave " + (wave + 1) + ".");
        }
      }
      paint();
    }

    function measureAll() {
      if (over || measureCd > 0 || !enemies.length) {
        if (measureCd > 0) api.toast("Measurement recharging (" + measureCd + ")", "quantum", 900);
        else if (!enemies.length) api.toast("No clouds on the board", "bad", 900);
        return;
      }
      measureCd = 5;
      var total = 0, i, k;
      for (i = 0; i < enemies.length; i++) {
        var e = enemies[i], mx = 0;
        for (k in e.amp) mx = Math.max(mx, probAt(e, +k));
        var dmg = 26 * (1 - mx) + 3;
        damage(e, dmg);
        total += Math.round(dmg);
      }
      QG.sfx.measure();
      api.log("MEASURE ALL: <b>" + total + "</b> damage across " + enemies.length + " cloud(s).");
      paint();
    }

    /* ---------------- build ---------------- */
    function openBuildMenu(cell) {
      var opts = [
        { key: "splitter", desc: "Splits the cloud further at every junction. Cheap, light damage." },
        { key: "collapser", desc: "Measures clouds in range: forces one definite cell, then heavy damage." },
        { key: "phase", desc: "Interferes with the cloud: cancels enemy probability in range." }
      ];
      var body = h("div.mt8");
      opts.forEach(function (o) {
        body.appendChild(h("div.small", { style: "margin-bottom:7px" },
          h("b", TOWER_NAME[o.key] + " - " + TOWER_COST[o.key] + "  "), o.desc));
      });
      body.appendChild(h("div.small.muted", "Cash: " + cash));
      var actions = opts.map(function (o) {
        return { label: TOWER_NAME[o.key] + " " + TOWER_COST[o.key], kind: o.key === "splitter" ? "cyan" : (o.key === "collapser" ? "magenta" : "purple"), onClick: function () { build(cell, o.key); } };
      });
      actions.push({ label: "Cancel", kind: "ghost" });
      api.overlay({ title: "Build a tower", sub: "Tap a slot to open this menu", body: body, actions: actions });
    }
    function build(cell, type) {
      var cost = TOWER_COST[type];
      if (cash < cost) { api.toast("Not enough cash", "bad"); return; }
      cash -= cost;
      towers[cell] = { type: type, cell: cell, flash: 0 };
      QG.sfx.gate();
      api.log("Built <b>" + TOWER_NAME[type] + "</b> for " + cost + ".");
      paint();
    }

    function onTap(pt) {
      if (over) return;
      var c = Math.floor((pt.x - ox) / cs), r = Math.floor((pt.y - oy) / cs);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
      var cell = cellOf(r, c);
      if (towers[cell]) { api.toast(TOWER_NAME[towers[cell].type] + " already built here", "quantum", 900); return; }
      if (!slotSet[cell]) {
        if (pathSet[cell]) api.toast("The path is fixed - build on a slot", "bad", 900);
        return;
      }
      openBuildMenu(cell);
    }

    /* ---------------- rendering ---------------- */
    var off = document.createElement("canvas");
    off.width = CW * 2; off.height = CH * 2;
    var octx = off.getContext("2d");
    octx.setTransform(2, 0, 0, 2, 0, 0);

    function renderStatic() {
      var r, c, i, k;
      octx.clearRect(0, 0, CW, CH);
      octx.fillStyle = paperCol();
      octx.fillRect(0, 0, CW, CH);
      // faint dot lattice
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          octx.fillStyle = faint(0.10);
          octx.beginPath();
          octx.arc(ox + c * cs + cs / 2, oy + r * cs + cs / 2, 1.3, 0, Math.PI * 2);
          octx.fill();
        }
      }
      // path cells
      for (k = 0; k < PATH.length; k++) {
        i = PATH[k];
        var rr = Math.floor(i / COLS), cc = i % COLS;
        QG.draw.rect(octx, ox + cc * cs + 1, oy + rr * cs + 1, cs - 2, cs - 2, {
          fill: U.rgba(PAL.orange, isDark() ? 0.16 : 0.13), stroke: false, wobble: 0
        });
      }
      // build slots
      for (k = 0; k < slotList.length; k++) {
        i = slotList[k];
        var sr = Math.floor(i / COLS), sc = i % COLS;
        QG.draw.rect(octx, ox + sc * cs + 4, oy + sr * cs + 4, cs - 8, cs - 8, {
          stroke: true, color: faint(0.28), width: 1.6, wobble: 1, double: false
        });
        QG.draw.text(octx, "+", ox + sc * cs + cs / 2, oy + sr * cs + cs / 2 + 1, {
          size: Math.max(9, cs * 0.34), color: faint(0.3)
        });
      }
      // spawn
      var spr = Math.floor(SPAWN / COLS), spc = SPAWN % COLS;
      QG.draw.circle(octx, ox + spc * cs + cs / 2, oy + spr * cs + cs / 2, cs * 0.28, {
        fill: U.rgba(PAL.magenta, 0.85), color: inkCol(), width: 2, double: false
      });
      // core
      var cr = Math.floor(CORE / COLS), cc2 = CORE % COLS;
      var cx = ox + cc2 * cs + cs / 2, cy = oy + cr * cs + cs / 2;
      QG.draw.glow(octx, cx, cy, cs * 1.2, PAL.red, 0.5);
      QG.draw.circle(octx, cx, cy, cs * 0.34, { fill: U.rgba(PAL.red, 0.9), color: inkCol(), width: 2.4, double: false });
      QG.draw.circle(octx, cx, cy, cs * 0.14, { fill: PAL.yellow, color: inkCol(), width: 2, double: false });
    }

    var badge = h("span.badge", "Wave 0 / 8");
    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM TOWER DEFENSE"),
      badge
    ));
    root.appendChild(h("div.small.muted.mt8.tc",
      "Bright cells are where the cloud probably is. Split it, collapse it or interfere with it."));

    var cv = api.canvas({ w: CW, h: CH });
    var c2 = cv.ctx;
    cv.el.style.marginTop = "12px";
    cv.on("down", onTap);

    function drawEnemy(e) {
      var tot = norm(e), best = null, bestP = -1, k;
      for (k in e.amp) {
        var cell = +k, a = e.amp[cell];
        var p = (a * a) / tot;
        var r = Math.floor(cell / COLS), c = cell % COLS;
        var x = ox + c * cs + cs / 2, y = oy + r * cs + cs / 2;
        var col = a < 0 ? PAL.cyan : PAL.magenta;
        var rad = cs * (0.16 + 0.34 * Math.sqrt(p));
        QG.draw.glow(c2, x, y, rad * 2.4, col, Math.min(0.7, 0.18 + p * 0.6));
        QG.draw.blob(c2, x, y, rad, {
          fill: U.rgba(col, 0.15 + 0.75 * p), color: inkCol(), width: 2, wobble: 1.1, lobes: 6, amp: 0.24
        });
        if (a < 0) QG.draw.dashedCircle(c2, x, y, rad * 1.35, { color: PAL.cyan, width: 2, dash: [4, 4] });
        if (p > 0.16) QG.draw.text(c2, Math.round(p * 100) + "", x, y + 1, {
          size: Math.max(8, cs * 0.3), color: inkCol(), font: QG.FONT.mono
        });
        if (p > bestP) { bestP = p; best = { x: x, y: y }; }
      }
      if (best) {
        var bw = cs * 0.92, bh = 5;
        var bx = best.x - bw / 2, by = best.y - cs * 0.55;
        QG.draw.rect(c2, bx, by, bw, bh, { fill: faint(0.2), stroke: false, wobble: 0 });
        var frac = Math.max(0, Math.min(1, e.hp / e.maxHp));
        QG.draw.rect(c2, bx, by, bw * frac, bh, { fill: PAL.lime, stroke: false, wobble: 0 });
      }
    }

    function paint() {
      c2.clearRect(0, 0, CW, CH);
      c2.drawImage(off, 0, 0, CW, CH);
      var k, i;
      for (k in towers) {
        var t = towers[k];
        var r = Math.floor(t.cell / COLS), c = t.cell % COLS;
        var x = ox + c * cs + cs / 2, y = oy + r * cs + cs / 2;
        if (t.flash > 0) QG.draw.glow(c2, x, y, cs * 1.4, TOWER_COL[t.type], 0.45);
        QG.draw.rect(c2, x - cs * 0.34, y - cs * 0.34, cs * 0.68, cs * 0.68, {
          fill: U.rgba(TOWER_COL[t.type], 0.85), color: inkCol(), width: 2, radius: 5, wobble: 1
        });
        QG.draw.text(c2, TOWER_GLYPH[t.type], x, y + 1, { size: Math.max(11, cs * 0.4), color: isDark() ? "#0b0b12" : PAL.ink });
      }
      for (i = 0; i < enemies.length; i++) drawEnemy(enemies[i]);

      badge.textContent = "Wave " + wave + " / 8";
      bStart.innerHTML = phase === "running" ? "Wave " + wave + " running" : (wave >= 8 ? "All waves done" : "Start wave " + (wave + 1));
      bStart.disabled = phase !== "build" || over;
      bMeasure.innerHTML = measureCd > 0 ? "Recharging " + measureCd : "Measure all";
      bSpeed.innerHTML = fast ? "Speed: fast" : "Speed: normal";
      bSpeed.style.background = fast ? PAL.lime : "";

      QG.clear(hud);
      [["Wave", wave + "/8"], ["Lives", lives], ["Cash", cash], ["Towers", Object.keys(towers).length], ["Clouds", enemies.length]]
        .forEach(function (kv) {
          hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
        });
      api.setScores([
        { name: "Lives", value: lives, color: "red" },
        { name: "Cash", value: cash, color: "lime" },
        { name: "Wave", value: wave + "/8", color: "orange" }
      ]);
    }

    /* ---------------- DOM ---------------- */
    var bStart = api.btn("Start wave 1", "lime", startWave);
    var bMeasure = api.btn("Measure all", "cyan", measureAll);
    var bSpeed = api.btn("Speed: normal", "ghost", function () {
      fast = !fast;
      paint();
    });
    var row = h("div.actions.mt12");
    row.appendChild(bStart); row.appendChild(bMeasure); row.appendChild(bSpeed);
    root.appendChild(row);
    var hud = h("div.hud.mt12");
    root.appendChild(hud);

    // theme changes repaint the pre-rendered static layer
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () { renderStatic(); paint(); });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      api.onCleanup(function () { mo.disconnect(); });
    }

    reset();
    api.every(210, function () {
      tickAcc += 1;
      if (tickAcc >= (fast ? 1 : 2)) { tickAcc = 0; tick(); }
    });
  });

  /* ==========================================================
     7. QUBIT DUEL
     ========================================================== */
  QG.register("qubit-duel", function (root, api) {
    var Qubit = api.Qubit, GATES = api.GATES;
    var me, foe, myHp, foeHp, myArm, foeArm, turn, over, busy, gateUsed, focus, aiFocus;

    function reset() {
      me = new Qubit(); foe = new Qubit();
      myHp = 10; foeHp = 10; myArm = 0; foeArm = 0;
      turn = "you"; over = false; busy = false; gateUsed = false;
      focus = false; aiFocus = false;
      paint();
      api.setStatus("Your turn. Tap a gate (optional), then ATTACK, SHIELD or MEASURE.");
    }

    function hurt(who, dmg) {
      if (who === "me") {
        var a = Math.min(myArm, dmg); myArm -= a; dmg -= a;
        myHp = Math.max(0, myHp - dmg);
      } else {
        var b = Math.min(foeArm, dmg); foeArm -= b; dmg -= b;
        foeHp = Math.max(0, foeHp - dmg);
      }
    }

    /* ---------------- panels ---------------- */
    function panel(title, color) {
      var el = h("div.panel", { style: "flex:1 1 240px;min-width:210px;box-shadow:var(--sh-sm)" });
      var badge = h("span.badge", "10 HP");
      el.appendChild(h("div.row", { style: "justify-content:space-between;margin-bottom:8px" },
        h("span.marker", { style: "font-size:.95rem;color:" + color }, title), badge));
      var bars = h("div");
      var dirac = h("div.dirac.mt8");
      var stat = h("div.hud.mt8");
      el.appendChild(bars); el.appendChild(dirac); el.appendChild(stat);
      return { el: el, badge: badge, bars: bars, dirac: dirac, stat: stat };
    }
    var pMe = panel("YOU", PAL.cyan);
    var pFoe = panel("AI", PAL.magenta);

    function paintPanel(p, q, hp, arm, focusOn) {
      p.badge.textContent = hp + " HP" + (arm ? " + " + arm + " armour" : "");
      QG.clear(p.bars);
      p.bars.appendChild(h("div.qmeter", { style: "margin-bottom:6px" },
        meterRow("|0>", q.p0 * 100, PAL.cyan, (q.p0 * 100).toFixed(0) + "%"),
        meterRow("|1>", q.p1 * 100, PAL.magenta, (q.p1 * 100).toFixed(0) + "%")
      ));
      p.dirac.textContent = q.dirac(2);
      QG.clear(p.stat);
      p.stat.appendChild(h("div.hud__item", h("div.hud__k", "HP"), h("div.hud__v", String(hp))));
      p.stat.appendChild(h("div.hud__item", h("div.hud__k", "Armour"), h("div.hud__v", String(arm))));
      p.stat.appendChild(h("div.hud__item", h("div.hud__k", "Locked"), h("div.hud__v", focusOn ? "yes" : "-")));
    }

    function paint() {
      paintPanel(pMe, me, myHp, myArm, focus);
      paintPanel(pFoe, foe, foeHp, foeArm, aiFocus);
      for (var i = 0; i < gateBtns.length; i++) {
        gateBtns[i].disabled = over || busy || turn !== "you" || gateUsed;
        gateBtns[i].style.opacity = gateUsed ? ".45" : "";
      }
      var dis = over || busy || turn !== "you";
      actBtns.forEach(function (b) { b.disabled = dis; });
      api.setScores([
        { name: "You", value: myHp + " HP", color: "cyan", turn: turn === "you" },
        { name: "AI", value: foeHp + " HP", color: "magenta", turn: turn === "ai" }
      ]);
    }

    /* ---------------- player actions ---------------- */
    function applyGate(g) {
      if (over || busy || turn !== "you" || gateUsed) return;
      me.apply(GATES[g]);
      gateUsed = true;
      api.log("You applied <b>" + g + "</b> \u2192 " + me.dirac(2));
      QG.sfx.gate();
      paint();
    }

    function act(kind) {
      if (over || busy || turn !== "you") return;
      if (kind === "attack") {
        var out = me.measure();
        var dmg = (out === 1 ? 4 : 1) + (focus ? 1 : 0);
        hurt("foe", dmg);
        api.log("You <b>measured |" + out + "></b> \u2192 " + dmg + " damage" + (focus ? " (locked bonus)" : "") + ".");
        me = new Qubit();
        focus = false;
        QG.sfx.measure();
      } else if (kind === "shield") {
        me.apply(GATES.Z);
        myArm += 2;
        api.log("You <b>shielded</b>: Z applied, +2 armour, state kept.");
        QG.sfx.gate();
      } else {
        var r = me.measure();
        focus = true;
        api.log("You <b>measured</b> your qubit \u2192 |" + r + "> locked in. Next attack +1.");
        QG.sfx.measure();
      }
      paint();
      if (foeHp <= 0) { over = true; api.setBest("win"); api.win("Duel won!", "The AI qubit decohered to 0 HP."); return; }
      turn = "ai"; busy = true; gateUsed = false;
      api.setStatus("AI is thinking...");
      paint();
      api.after(650, aiTurn);
    }

    function aiTurn() {
      if (over) { busy = false; return; }
      var g = null, p1 = foe.p1;
      if (p1 > 0.85) g = null;
      else if (p1 < 0.15) g = "X";
      else if (Math.random() < 0.55) g = "H";
      else g = U.pick(["Z", "S"]);
      if (g) { foe.apply(GATES[g]); api.log("AI applied <b>" + g + "</b>."); }

      var p = foe.p1, action;
      if (p >= 0.75) action = "attack";
      else if (p > 0.35 && Math.random() < 0.45) action = "attack";
      else if (foeArm < 3 && Math.random() < 0.5) action = "shield";
      else if (Math.random() < 0.5) action = "measure";
      else action = "attack";

      if (action === "attack") {
        var out = foe.measure();
        var dmg = (out === 1 ? 4 : 1) + (aiFocus ? 1 : 0);
        hurt("me", dmg);
        api.log("AI <b>attacked</b>: measured |" + out + "> \u2192 " + dmg + " damage to you.");
        foe = new Qubit();
        aiFocus = false;
        QG.sfx.zap();
      } else if (action === "shield") {
        foe.apply(GATES.Z);
        foeArm += 2;
        api.log("AI <b>shielded</b>: +2 armour.");
        QG.sfx.gate();
      } else {
        var r2 = foe.measure();
        aiFocus = true;
        api.log("AI <b>measured</b> its qubit \u2192 |" + r2 + "> locked.");
        QG.sfx.tick();
      }
      turn = "you"; busy = false; gateUsed = false;
      paint();
      if (myHp <= 0) { over = true; api.lose("Your qubit decohered.", "The AI reduced you to 0 HP."); return; }
      api.setStatus("Your turn. Gate, then ATTACK / SHIELD / MEASURE.");
    }

    /* ---------------- DOM ---------------- */
    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUBIT DUEL"),
      h("span.badge", "Gate then act")
    ));
    root.appendChild(h("div.row.mt12", { style: "align-items:stretch" }, pMe.el, pFoe.el));

    var gateBtns = [];
    var gateRow = h("div.actions.mt12");
    ["H", "X", "Z", "S"].forEach(function (g) {
      var b = api.btn(g, "purple", function () { applyGate(g); });
      gateBtns.push(b);
      gateRow.appendChild(b);
    });
    root.appendChild(h("div.small.strong.tc.mt12", "1. Apply one gate to YOUR qubit (optional)"));
    root.appendChild(gateRow);

    var actBtns = [];
    var actRow = h("div.actions.mt12");
    [["ATTACK", "magenta"], ["SHIELD", "cyan"], ["MEASURE", "lime"]].forEach(function (a) {
      var b = api.btn(a[0], a[1], function () { act(a[0].toLowerCase()); });
      actBtns.push(b);
      actRow.appendChild(b);
    });
    root.appendChild(h("div.small.strong.tc.mt12", "2. Then choose your action"));
    root.appendChild(actRow);

    reset();
  });

  /* ==========================================================
     8. QUANTUM CARD GAME
     ========================================================== */
  QG.register("quantum-card-game", function (root, api) {
    var HAND = 5;
    var myHp, aiHp, myHand, aiHand, sel, over, busy, myTricks, aiTricks, round, table;

    function newCard() {
      var a = U.int(9) + 1, b = U.int(9) + 1;
      while (b === a) b = U.int(9) + 1;
      return { a: a, b: b, measured: null };
    }
    function cardVal(c) { return c.measured !== null ? c.measured : Math.round((c.a + c.b) / 2); }

    function reset() {
      myHp = 20; aiHp = 20; myTricks = 0; aiTricks = 0; round = 0;
      sel = null; over = false; busy = false;
      myHand = []; aiHand = [];
      for (var i = 0; i < HAND; i++) { myHand.push(newCard()); aiHand.push(newCard()); }
      table = { you: null, ai: null };
      paint();
      api.setStatus("Tap one of your cards, then MEASURE, FLIP or PLAY CARD.");
    }

    /* ---------------- DOM ---------------- */
    var myHpEl = h("span.badge", "20 HP");
    var aiHpEl = h("span.badge", "20 HP");
    var tableBox = h("div.row.mt12", { style: "justify-content:center;align-items:center;gap:26px" });
    var aiHandBox = h("div.row.scroll-x.mt8", { style: "justify-content:center;gap:8px" });
    var myHandBox = h("div.row.scroll-x.mt12", { style: "justify-content:center;gap:10px" });

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM CARD GAME"),
      h("span.badge", "5 cards each")
    ));
    root.appendChild(h("div.row.mt12", { style: "justify-content:space-between" },
      h("span.strong", "AI  "), aiHpEl));
    root.appendChild(aiHandBox);
    root.appendChild(tableBox);
    root.appendChild(h("div.row.mt12", { style: "justify-content:space-between" },
      h("span.strong", "YOU  "), myHpEl));
    root.appendChild(myHandBox);

    var bMeasure = api.btn("Measure", "cyan", doMeasure);
    var bFlip = api.btn("Flip", "purple", doFlip);
    var bPlay = api.btn("Play card", "magenta", doPlay);
    var row = h("div.actions.mt12");
    row.appendChild(bMeasure); row.appendChild(bFlip); row.appendChild(bPlay);
    root.appendChild(row);
    root.appendChild(h("div.small.muted.tc.mt8",
      "Unmeasured cards count as the rounded average of their two values."));

    function cardEl(card, idx) {
      var el = h("div.pcard", { style: "position:relative" });
      if (card.measured !== null) {
        el.style.background = "var(--yellow)";
        el.appendChild(h("span.pcard__corner", String(card.measured)));
        el.appendChild(h("span.pcard__corner.pcard__corner--br", String(card.measured)));
        el.appendChild(h("span", { style: "font-size:2rem" }, String(card.measured)));
      } else {
        el.appendChild(h("span.pcard__corner", String(card.a)));
        el.appendChild(h("span.pcard__corner.pcard__corner--br", String(card.b)));
        el.appendChild(h("span", { style: "font-size:2rem" }, String(card.a)));
        el.appendChild(h("span", { style: "position:absolute;right:9px;bottom:16px;font-size:1rem;opacity:.45" }, String(card.b)));
        el.appendChild(h("span", { style: "position:absolute;left:0;right:0;bottom:3px;text-align:center;font-family:var(--font-body);font-size:.55rem;font-weight:700;opacity:.7" },
          "avg " + Math.round((card.a + card.b) / 2)));
      }
      if (idx === sel) el.style.outline = "4px dashed " + PAL.magenta;
      return el;
    }

    function paint() {
      myHpEl.textContent = myHp + " HP";
      aiHpEl.textContent = aiHp + " HP";
      QG.clear(aiHandBox);
      for (var a = 0; a < aiHand.length; a++) {
        aiHandBox.appendChild(cardEl(aiHand[a], -1));
      }
      QG.clear(myHandBox);
      for (var i = 0; i < myHand.length; i++) {
        (function (idx) {
          var el = cardEl(myHand[idx], idx);
          el.addEventListener("click", function () {
            if (over || busy) return;
            sel = sel === idx ? null : idx;
            QG.sfx.tap();
            paint();
          });
          myHandBox.appendChild(el);
        })(i);
      }
      QG.clear(tableBox);
      tableBox.appendChild(slotBox("YOU PLAYED", table.you, PAL.cyan));
      tableBox.appendChild(h("span.marker", { style: "font-size:1.1rem" }, "VS"));
      tableBox.appendChild(slotBox("AI PLAYED", table.ai, PAL.magenta));
      var dis = over || busy || sel === null;
      bMeasure.disabled = dis || myHand[sel] === undefined || myHand[sel].measured !== null;
      bFlip.disabled = dis || myHand[sel] === undefined || myHand[sel].measured !== null;
      bPlay.disabled = over || busy || sel === null;
      api.setScores([
        { name: "You", value: myHp + " HP", color: "cyan" },
        { name: "AI", value: aiHp + " HP", color: "magenta" },
        { name: "Tricks", value: myTricks + "-" + aiTricks, color: "lime" }
      ]);
    }

    function slotBox(title, card, color) {
      var box = h("div", { style: "text-align:center" });
      box.appendChild(h("div.hud__k", { style: "margin-bottom:6px;color:" + color }, title));
      if (!card) box.appendChild(h("div.pcard", { style: "opacity:.35;display:grid;place-items:center" }, "?"));
      else {
        var el = cardEl(card, -1);
        el.style.cursor = "default";
        box.appendChild(el);
        box.appendChild(h("div.small.strong.mt8", "value " + cardVal(card)));
      }
      return box;
    }

    /* ---------------- actions ---------------- */
    function doMeasure() {
      if (over || busy || sel === null) return;
      var c = myHand[sel];
      if (c.measured !== null) { api.toast("Already measured", "bad", 900); return; }
      c.measured = Math.random() < 0.5 ? c.a : c.b;
      QG.sfx.measure();
      api.log("You measured a card \u2192 <b>" + c.measured + "</b> (permanent).");
      paint();
    }
    function doFlip() {
      if (over || busy || sel === null) return;
      var c = myHand[sel];
      if (c.measured !== null) { api.toast("Measured cards cannot be flipped", "bad", 900); return; }
      var t = c.a; c.a = c.b; c.b = t;
      QG.sfx.zap();
      api.log("You flipped a card \u2192 now " + c.a + "|" + c.b + " (avg " + Math.round((c.a + c.b) / 2) + ").");
      paint();
    }
    function doPlay() {
      if (over || busy || sel === null) return;
      var c = myHand[sel];
      var mine = cardVal(c);
      myHand.splice(sel, 1);
      sel = null;
      table.you = c;
      table.ai = null;
      busy = true;
      api.log("You played <b>" + mine + "</b>" + (c.measured === null ? " (avg of " + c.a + "/" + c.b + ")" : " (measured)") + ".");
      paint();
      api.after(620, function () { aiPlay(mine); });
    }

    function aiPlay(myVal) {
      if (over) { busy = false; return; }
      var bi = 0, bv = -1, i;
      for (i = 0; i < aiHand.length; i++) {
        var ev = cardVal(aiHand[i]);
        if (ev > bv) { bv = ev; bi = i; }
      }
      var card = aiHand[bi];
      if (card.measured === null && Math.max(card.a, card.b) > myVal && Math.random() < 0.6) {
        card.measured = Math.random() < 0.5 ? card.a : card.b;
        api.log("AI measured its card \u2192 <b>" + card.measured + "</b>.");
        QG.sfx.measure();
      }
      var aiVal = cardVal(card);
      aiHand.splice(bi, 1);
      table.ai = card;
      api.log("AI played <b>" + aiVal + "</b>" + (card.measured === null ? " (avg of " + card.a + "/" + card.b + ")" : " (measured)") + ".");
      paint();
      api.after(420, function () { resolve(myVal, aiVal); });
    }

    function resolve(myVal, aiVal) {
      round++;
      if (myVal > aiVal) {
        var d = myVal - aiVal;
        aiHp = Math.max(0, aiHp - d);
        myTricks++;
        api.log("Trick " + round + ": <b>you win</b> " + myVal + " v " + aiVal + " \u2192 AI loses " + d + " HP.");
        QG.sfx.good();
      } else if (aiVal > myVal) {
        var d2 = aiVal - myVal;
        myHp = Math.max(0, myHp - d2);
        aiTricks++;
        api.log("Trick " + round + ": <b>AI wins</b> " + aiVal + " v " + myVal + " \u2192 you lose " + d2 + " HP.");
        QG.sfx.zap();
      } else {
        api.log("Trick " + round + ": tie at " + myVal + " - no damage.");
        QG.sfx.tick();
      }
      while (myHand.length < HAND) myHand.push(newCard());
      while (aiHand.length < HAND) aiHand.push(newCard());
      busy = false;
      paint();
      if (aiHp <= 0) { over = true; api.setBest(myTricks); api.win("Hand measured out!", "The AI hit 0 HP. Tricks: " + myTricks + "-" + aiTricks + "."); return; }
      if (myHp <= 0) { over = true; api.lose("Your hand collapsed.", "You hit 0 HP. Tricks: " + myTricks + "-" + aiTricks + "."); return; }
      api.setStatus("Tap a card, then MEASURE, FLIP or PLAY CARD.");
    }

    reset();
  });

  /* ==========================================================
     9. QUANTUM DICE
     ========================================================== */
  QG.register("quantum-dice", function (root, api) {
    var ROLLS = 3, WIN_ROUND = 10;
    var weights, sel, round, target, fails, bias, rollsLeft, roundTotal, over, busy, lastFace;

    function reset() {
      weights = [1, 1, 1, 1, 1, 1];
      sel = 0; round = 1; target = round + 2; fails = 0; bias = 3;
      rollsLeft = ROLLS; roundTotal = 0; over = false; busy = false; lastFace = 0;
      drift();
      paint();
      api.setStatus("Round 1: roll " + target + " or more in " + ROLLS + " rolls. Bias a face, then ROLL.");
    }
    function drift() {
      for (var i = 0; i < 6; i++) {
        weights[i] = U.clamp(weights[i] + (Math.random() - 0.5) * 0.34, 0.05, 14);
      }
    }
    function probs() { return QG.dist(weights); }

    function doBias(sign) {
      if (over || busy) return;
      if (bias <= 0) { api.toast("No bias charges left", "bad"); return; }
      bias--;
      weights[sel] = U.clamp(weights[sel] + sign * 0.9, 0.05, 14);
      QG.sfx.gate();
      api.log("BIAS " + (sign > 0 ? "+1" : "-1") + " on face <b>" + (sel + 1) + "</b>.");
      paint();
    }

    function startRound() {
      target = round + 2;
      rollsLeft = ROLLS;
      roundTotal = 0;
      paint();
      api.setStatus("Round " + round + ": reach " + target + " in " + ROLLS + " rolls.");
    }

    function doRoll() {
      if (over || busy || rollsLeft <= 0) return;
      var p = probs();
      var face = QG.sampleDist(p) + 1;
      lastFace = face;
      rollsLeft--;
      roundTotal += face;
      QG.sfx.measure();
      api.log("Rolled <b>" + face + "</b> \u2014 round total " + roundTotal + " / " + target + ".");
      drift();
      paint();

      if (roundTotal >= target) {
        bias += 1;
        api.log("Round " + round + " cleared! <b>+1 bias charge</b>.");
        QG.sfx.good();
        round++;
        if (round > WIN_ROUND) {
          over = true;
          api.setBest(WIN_ROUND);
          paint();
          api.win("Ten rounds beaten!", "You measured your way past every target.");
          return;
        }
        startRound();
        return;
      }
      if (rollsLeft <= 0) {
        fails++;
        api.log("Round " + round + " failed (" + roundTotal + "/" + target + "). Failures " + fails + "/3.");
        QG.sfx.lose();
        if (fails >= 3) {
          over = true;
          paint();
          api.lose("Three failed rounds.", "The run ended at round " + round + ".");
          return;
        }
        round++;
        startRound();
        return;
      }
      paint();
    }

    /* ---------------- DOM ---------------- */
    var faces = tileGrid(3, 6, function (i) { sel = i; QG.sfx.tap(); paint(); });
    var badge = h("span.badge", "Round 1 / 10");
    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM DICE"),
      badge
    ));
    root.appendChild(h("div.small.muted.tc.mt8",
      "Tap a face to target it, then spend BIAS charges. The bars are the live probabilities."));
    root.appendChild(h("div.mt12", faces.el));
    root.appendChild(h("div.small.muted.tc.mt8", "Tap a face to select it, then bias it up or down."));

    var bPlus = api.btn("Bias +1", "lime", function () { doBias(1); });
    var bMinus = api.btn("Bias -1", "orange", function () { doBias(-1); });
    var bRoll = api.btn("Roll", "magenta", doRoll);
    var row = h("div.actions.mt12");
    row.appendChild(bPlus); row.appendChild(bMinus); row.appendChild(bRoll);
    root.appendChild(row);
    var hud = h("div.hud.mt12");
    root.appendChild(hud);

    function paint() {
      var p = probs(), i;
      for (i = 0; i < 6; i++) {
        var pct = p[i] * 100;
        var on = i === sel;
        faces.cells[i].innerHTML =
          "<div style='display:flex;flex-direction:column;align-items:center;gap:5px;width:100%'>" +
          "<span style='font-size:1.6rem;line-height:1'>" + (i + 1) + "</span>" +
          "<span style='font-size:.62rem;font-family:var(--font-mono)'>" + pct.toFixed(0) + "%</span>" +
          "<div style='width:90%;height:9px;background:var(--paper-3);border:2px solid var(--ink);border-radius:99px;overflow:hidden'>" +
          "<div style='height:100%;width:" + pct.toFixed(1) + "%;background:" + (on ? PAL.orange : PAL.cyan) + "'></div>" +
          "</div></div>";
        faces.cells[i].style.background = on ? "var(--yellow)" : "";
        faces.cells[i].style.outline = on ? "3px dashed var(--magenta)" : "";
      }
      bPlus.disabled = over || bias <= 0;
      bMinus.disabled = over || bias <= 0;
      bRoll.disabled = over || rollsLeft <= 0;
      bPlus.innerHTML = "Bias +1 (" + bias + ")";
      bMinus.innerHTML = "Bias -1 (" + bias + ")";
      bRoll.innerHTML = "Roll (" + rollsLeft + " left)";
      badge.textContent = "Round " + Math.min(round, WIN_ROUND) + " / 10";
      QG.clear(hud);
      [["Round", round + "/10"], ["Target", target], ["Round total", roundTotal],
       ["Rolls left", rollsLeft], ["Fails", fails + "/3"], ["Last face", lastFace || "-"]]
        .forEach(function (kv) {
          hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
        });
      api.setScores([
        { name: "Round", value: round + "/10", color: "yellow" },
        { name: "Target", value: target, color: "cyan" },
        { name: "Bias", value: bias, color: "lime" },
        { name: "Fails", value: fails + "/3", color: "red" }
      ]);
    }

    reset();
  });

  /* ==========================================================
     10. QUANTUM ROCK-PAPER-SCISSORS
     ========================================================== */
  QG.register("quantum-rps", function (root, api) {
    var NAMES = ["ROCK", "PAPER", "SCISSORS"];
    var GLYPH = ["\u270A", "\u270B", "\u270C"];
    var TARGET_SCORE = 5;
    var weights, myScore, aiScore, history, over, busy, last;

    function reset() {
      weights = [1, 1, 1];
      myScore = 0; aiScore = 0; history = []; over = false; busy = false; last = null;
      paint();
      api.setStatus("Build your distribution, then MEASURE to play the round.");
    }
    function probs() { return QG.dist(weights); }
    function beats(a, b) { return (a + 2) % 3 === b; }

    function amplify(i) {
      if (over || busy) return;
      weights[i] += 2;
      QG.sfx.gate();
      api.log("You amplified <b>" + NAMES[i] + "</b> (weight +2).");
      paint();
    }
    function evenSplit() {
      if (over || busy) return;
      weights = [1, 1, 1];
      QG.sfx.gate();
      api.log("H applied \u2014 even 1/3 superposition.");
      paint();
    }
    function interfere() {
      if (over || busy) return;
      var w = weights.slice();
      weights = [w[2], w[0], w[1]];
      QG.sfx.zap();
      api.log("INTERFERE \u2014 distribution rotated one step (Rock\u2192Paper\u2192Scissors\u2192Rock).");
      paint();
    }

    function aiChoose() {
      var p = probs(), top = 0, i;
      for (i = 1; i < 3; i++) if (p[i] > p[top]) top = i;
      var aw = [1, 1, 1];
      if (Math.random() < 0.75) aw[(top + 1) % 3] += 2;
      else aw[U.int(3)] += 2;
      if (history.length) {
        var counts = [0, 0, 0];
        var from = Math.max(0, history.length - 4);
        for (i = from; i < history.length; i++) counts[history[i].you]++;
        var hTop = 0;
        for (i = 1; i < 3; i++) if (counts[i] > counts[hTop]) hTop = i;
        aw[(hTop + 1) % 3] += 1;
      }
      return QG.sampleDist(QG.dist(aw));
    }

    function measure() {
      if (over || busy) return;
      busy = true;
      var mine = QG.sampleDist(probs());
      var theirs = aiChoose();
      var res = mine === theirs ? "tie" : (beats(mine, theirs) ? "win" : "lose");
      if (res === "win") { myScore++; QG.sfx.good(); }
      else if (res === "lose") { aiScore++; QG.sfx.zap(); }
      else QG.sfx.tick();
      history.push({ you: mine, ai: theirs, res: res });
      if (history.length > 6) history.shift();
      last = { you: mine, ai: theirs, res: res };
      api.log("MEASURE \u2014 you <b>" + NAMES[mine] + "</b> v AI <b>" + NAMES[theirs] + "</b> \u2192 " + res.toUpperCase() + ".");

      // the measurement collapses your state onto the observed move
      weights = [0, 0, 0];
      weights[mine] = 1;
      QG.sfx.measure();
      busy = false;
      paint();

      if (myScore >= TARGET_SCORE) { over = true; api.setBest(myScore); api.win("Five points!", "Your superposition outplayed the AI " + myScore + "-" + aiScore + "."); return; }
      if (aiScore >= TARGET_SCORE) { over = true; api.lose("The AI reached five.", "Final score " + myScore + "-" + aiScore + "."); return; }
      api.setStatus("Your state collapsed to " + NAMES[mine] + ". Amplify other moves or press H to re-split.");
    }

    /* ---------------- DOM ---------------- */
    var tiles = tileGrid(3, 3, function (i) { amplify(i); });
    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM ROCK-PAPER-SCISSORS"),
      h("span.badge", "First to 5")
    ));
    root.appendChild(h("div.small.muted.tc.mt8",
      "Tap a move to amplify it. H re-splits evenly. INTERFERE rotates. MEASURE collapses and plays."));
    root.appendChild(h("div.mt12", tiles.el));
    var barsBox = h("div.mt12");
    root.appendChild(barsBox);

    var bH = api.btn("H - even split", "cyan", evenSplit);
    var bInt = api.btn("Interfere", "purple", interfere);
    var bMeas = api.btn("Measure", "magenta", measure);
    var row = h("div.actions.mt12");
    row.appendChild(bH); row.appendChild(bInt); row.appendChild(bMeas);
    root.appendChild(row);

    var histBox = h("div.mt12");
    root.appendChild(h("div.hud__k.mt12", "LAST 6 ROUNDS"));
    root.appendChild(histBox);
    var lastBox = h("div.small.strong.tc.mt8");
    root.appendChild(lastBox);

    function paint() {
      var p = probs(), i;
      for (i = 0; i < 3; i++) {
        var pct = p[i] * 100;
        tiles.cells[i].innerHTML =
          "<div style='display:flex;flex-direction:column;align-items:center;gap:4px;width:100%'>" +
          "<span style='font-size:1.7rem;line-height:1'>" + GLYPH[i] + "</span>" +
          "<span style='font-size:.66rem;font-weight:700'>" + NAMES[i] + "</span>" +
          "<span style='font-size:.62rem;font-family:var(--font-mono)'>" + pct.toFixed(0) + "%</span>" +
          "<div style='width:90%;height:9px;background:var(--paper-3);border:2px solid var(--ink);border-radius:99px;overflow:hidden'>" +
          "<div style='height:100%;width:" + pct.toFixed(1) + "%;background:" + PAL.cyan + "'></div>" +
          "</div></div>";
      }
      QG.clear(barsBox);
      var meter = h("div.qmeter");
      for (i = 0; i < 3; i++) meter.appendChild(meterRow(NAMES[i], p[i] * 100, PAL.cyan, (p[i] * 100).toFixed(0) + "%"));
      barsBox.appendChild(meter);

      QG.clear(histBox);
      var chips = h("div.row", { style: "justify-content:center;gap:6px" });
      if (!history.length) chips.appendChild(h("span.small.muted", "No rounds played yet."));
      history.forEach(function (r2) {
        chips.appendChild(h("span.chip", { style: "border-color:" + (r2.res === "win" ? PAL.lime : (r2.res === "lose" ? PAL.magenta : "")) },
          GLYPH[r2.you] + " v " + GLYPH[r2.ai] + "  " + r2.res.toUpperCase()));
      });
      histBox.appendChild(chips);
      lastBox.textContent = last
        ? ("Last round: you " + NAMES[last.you] + " vs AI " + NAMES[last.ai] + " - " + last.res.toUpperCase())
        : "";

      api.setScores([
        { name: "You", value: myScore, color: "cyan" },
        { name: "AI", value: aiScore, color: "magenta" }
      ]);
    }

    reset();
  });
})();
