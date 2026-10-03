/* ============================================================
   QUANTUM ARCADE - games/pack3.js
   11 Quantum Dungeon  12 Quantum Spy  13 Quantum Minesweeper
   14 Qubit Pong       15 Quantum Tetris
   ============================================================ */
(function () {
  "use strict";
  var QG = window.QG, h = QG.h, PAL = QG.PAL, U = QG.U;
  var S2 = 1 / Math.SQRT2;

  function dark() { return document.documentElement.getAttribute("data-theme") === "dark"; }
  function fgCol() { return dark() ? PAL.paper : PAL.ink; }
  function bgCol() { return dark() ? "#0b0b14" : PAL.paper; }

  /* ==========================================================
     11. QUANTUM DUNGEON
     ========================================================== */
  QG.register("quantum-dungeon", function (root, api) {
    var COLS = 9, ROWS = 7, N = COLS * ROWS, MAXTURN = 30, MAXHP = 3;
    var D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    var DD = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
    var EXIT = 0, START = 0;

    var walls, pcells, pw, hp, turns, hasKey, keyCell, medCell, enemies;
    var linked, entLeft, over, busy, boom;

    function ix(r, c) { return r * COLS + c; }
    function rr(i) { return Math.floor(i / COLS); }
    function cc(i) { return i % COLS; }
    function inb(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
    function free(r, c) { return inb(r, c) && !walls[ix(r, c)]; }
    function nbrs(i) {
      var out = [], r = rr(i), c = cc(i);
      for (var k = 0; k < 4; k++) {
        var nr = r + D4[k][0], nc = c + D4[k][1];
        if (free(nr, nc)) out.push(ix(nr, nc));
      }
      return out;
    }
    function manh(a, b) { return Math.abs(rr(a) - rr(b)) + Math.abs(cc(a) - cc(b)); }
    function name(i) { return "(" + (rr(i) + 1) + "," + (cc(i) + 1) + ")"; }

    function connected(w) {
      var seen = {}, q = [START], cnt = 0, total = 0;
      for (var i = 0; i < N; i++) if (!w[i]) total++;
      if (w[START]) return false;
      seen[START] = 1;
      while (q.length) {
        var cur = q.pop(); cnt++;
        var r = rr(cur), c = cc(cur);
        for (var d = 0; d < 4; d++) {
          var nr = r + D4[d][0], nc = c + D4[d][1];
          if (!inb(nr, nc)) continue;
          var j = ix(nr, nc);
          if (w[j] || seen[j]) continue;
          seen[j] = 1; q.push(j);
        }
      }
      return cnt === total;
    }

    function genWalls() {
      for (var t = 0; t < 120; t++) {
        var w = {}, placed = 0, guard = 0;
        while (placed < 9 && guard++ < 400) {
          var i = U.int(N);
          if (i === START || i === EXIT || w[i]) continue;
          w[i] = true; placed++;
        }
        if (connected(w)) return w;
      }
      return {};
    }

    function pAt(i) {
      for (var k = 0; k < pcells.length; k++) if (pcells[k] === i) return pw[k];
      return 0;
    }
    function top() {
      var bi = pcells[0], bw = -1;
      for (var k = 0; k < pcells.length; k++) if (pw[k] > bw) { bw = pw[k]; bi = pcells[k]; }
      return bi;
    }
    function enemyAt(i) {
      for (var k = 0; k < enemies.length; k++) if (enemies[k].cells.indexOf(i) >= 0) return true;
      return false;
    }
    function setCloud(list) {
      var seen = {}, out = [];
      list.forEach(function (o) {
        if (seen[o.i]) { seen[o.i].w += o.w; return; }
        var rec = { i: o.i, w: o.w }; seen[o.i] = rec; out.push(rec);
      });
      out.sort(function (a, b) { return b.w - a.w; });
      out = out.slice(0, 4);
      var s = 0;
      out.forEach(function (o) { s += o.w; });
      s = s || 1;
      pcells = []; pw = [];
      out.forEach(function (o) { pcells.push(o.i); pw.push(o.w / s); });
    }

    function setup() {
      START = ix(0, 0); EXIT = ix(ROWS - 1, COLS - 1);
      walls = genWalls();
      pcells = [START]; pw = [1];
      hp = MAXHP; turns = MAXTURN; hasKey = false; linked = null; entLeft = 1;
      over = false; busy = false; boom = -1;

      var open = [];
      for (var i = 0; i < N; i++) if (!walls[i] && i !== START && i !== EXIT) open.push(i);

      var far = open.filter(function (i) { return manh(i, START) >= 5; });
      keyCell = far.length ? U.pick(far) : (open.length ? U.pick(open) : -1);
      var med = open.filter(function (i) { return i !== keyCell && manh(i, START) >= 3; });
      medCell = med.length ? U.pick(med) : -1;

      enemies = [];
      var tries = 0;
      while (enemies.length < 3 && tries++ < 400) {
        var a = U.pick(open), b = null;
        var nb = nbrs(a);
        if (nb.length) b = U.pick(nb); else b = a;
        if (a === b) continue;
        if (a === keyCell || b === keyCell) continue;
        enemies.push({ cells: [a, b] });
      }
      paint();
    }

    var grid = api.grid(COLS, ROWS, onCell);
    var pad = QG.dpad({ onPress: function (d) { act(d); } });
    var btnRow = h("div.actions.mt12");
    var bScan = api.btn("SCAN", "cyan", function () { act("scan"); });
    var bPhase = api.btn("PHASE", "purple", function () { act("phase"); });
    var bEnt = api.btn("ENTANGLE", "magenta", function () { act("ent"); });
    var bMeas = api.btn("MEASURE", "orange", function () { act("measure"); });
    btnRow.appendChild(bScan); btnRow.appendChild(bPhase);
    btnRow.appendChild(bEnt); btnRow.appendChild(bMeas);

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM DUNGEON"),
      h("span.badge", "You are a probability cloud")
    ));
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(h("div.mt12", pad));
    root.appendChild(btnRow);
    root.appendChild(h("div.small.muted.tc.mt8", "\uD83D\uDD11 key \u00B7 \uD83D\uDEAA exit \u00B7 \uD83D\uDC7E enemy \u00B7 \u2795 medkit \u00B7 % = chance you are in that room"));
    var hud = h("div.hud.mt12");
    root.appendChild(hud);

    var detach = QG.steer(grid.el, function (d) { act(d); });
    api.onCleanup(detach);

    function act(d) {
      if (over || busy) return;
      if (d === "scan") return doScan();
      if (d === "phase") return doPhase();
      if (d === "ent") return doEntangle();
      if (d === "measure") return doMeasure();
      if (!DD[d]) return;
      if (turns <= 0) return;
      spread(d);
      QG.sfx.tick();
      afterAction("You drifted " + d + ".");
    }

    function spread(dir) {
      var d = DD[dir], acc = [];
      for (var k = 0; k < pcells.length; k++) {
        var i = pcells[k], w = pw[k], r = rr(i), c = cc(i);
        var nr = r + d[0], nc = c + d[1];
        if (free(nr, nc)) { acc.push({ i: ix(nr, nc), w: w * 0.6 }); acc.push({ i: i, w: w * 0.4 }); }
        else acc.push({ i: i, w: w });
      }
      setCloud(acc);
    }

    function followTreasure() {
      if (!linked) return;
      var t = top();
      if (linked === "key" && keyCell >= 0) {
        keyCell = t;
        if (pAt(keyCell) > 0) {
          hasKey = true; keyCell = -1; linked = null;
          QG.sfx.good();
          api.log("The entangled <b>KEY</b> followed you into your cloud - key acquired!");
          api.toast("Key acquired!", "good");
        }
      } else if (linked === "med" && medCell >= 0) {
        medCell = t;
        if (pAt(medCell) > 0) {
          medCell = -1; linked = null; hp = Math.min(MAXHP, hp + 1);
          QG.sfx.good();
          api.log("The entangled <b>medkit</b> arrived - HP restored.");
          api.toast("+1 HP", "good");
        }
      }
    }

    function enemyTurn() {
      enemies.forEach(function (e) {
        var next = [];
        for (var k = 0; k < e.cells.length; k++) {
          var opts = nbrs(e.cells[k]); opts.push(e.cells[k]);
          next.push(U.pick(opts));
        }
        if (next[0] === next[1]) {
          var alts = nbrs(next[0]);
          if (alts.length) next[1] = U.pick(alts);
        }
        e.cells = next;
      });
      var bestP = 0, cell = -1;
      enemies.forEach(function (e) {
        e.cells.forEach(function (i) {
          var p = pAt(i);
          if (p > bestP) { bestP = p; cell = i; }
        });
      });
      if (cell >= 0 && bestP >= 0.15 && Math.random() < 0.5 * (0.5 + bestP)) {
        hp--;
        setCloud([{ i: cell, w: 1 }]);
        QG.sfx.measure();
        api.log("An enemy <b>measured you</b> in room " + name(cell) + " - your cloud collapsed. <b>-1 HP</b>");
        api.toast("Measured! -1 HP", "bad");
      }
    }

    function afterAction(msg) {
      turns--;
      followTreasure();
      paint();
      if (checkWin()) return;
      if (turns <= 0) { over = true; api.lose("Out of turns.", "The dungeon decohered around you after 30 turns."); return; }
      busy = true;
      api.setStatus("Enemies are moving...");
      api.after(360, function () {
        enemyTurn();
        busy = false;
        paint();
        if (hp <= 0) { over = true; api.lose("Your wavefunction collapsed.", "Enemies measured you three times."); return; }
        api.setStatus(msg + " " + turns + " turns left.");
      });
    }

    function checkWin() {
      if (hasKey && pAt(EXIT) >= 0.3) {
        over = true;
        api.setBest("escaped");
        api.setStatus("You escaped the dungeon!");
        api.win("You escaped!", "With the key entangled to your cloud you collapsed onto the exit.");
        return true;
      }
      return false;
    }

    function doScan() {
      if (turns <= 0) return;
      var pick = QG.sampleDist(pw.slice());
      var cell = pcells[pick] === undefined ? top() : pcells[pick];
      setCloud([{ i: cell, w: 1 }]);
      enemies.forEach(function (e) {
        e.cells = e.cells.map(function (i) {
          var opts = nbrs(i);
          if (!opts.length) return i;
          var best = i, bd = manh(i, cell);
          opts.forEach(function (j) { var d = manh(j, cell); if (d < bd) { bd = d; best = j; } });
          return best;
        });
      });
      QG.sfx.measure();
      api.log("You <b>SCANNED</b> yourself into room " + name(cell) + " - the measurement echoed through the dungeon.");
      api.toast("Enemies heard that!", "bad");
      afterAction("Scanned into " + name(cell) + ".");
    }

    function doPhase() {
      if (turns <= 0) return;
      var out = [];
      for (var k = 0; k < pcells.length; k++) {
        var i = pcells[k];
        var nr = ROWS - 1 - rr(i), nc = COLS - 1 - cc(i);
        out.push({ i: free(nr, nc) ? ix(nr, nc) : i, w: pw[k] });
      }
      setCloud(out);
      QG.sfx.teleport();
      api.log("You applied an <b>X gate</b> - your cloud mirrored across the dungeon centre.");
      afterAction("Phased to " + name(top()) + ".");
    }

    function doEntangle() {
      if (turns <= 0) return;
      if (entLeft <= 0) { api.toast("No entanglements left", "bad", 1100); return; }
      var me = top(), best = null, bd = 1e9, label = "";
      if (keyCell >= 0) { var d1 = manh(keyCell, me); if (d1 < bd) { bd = d1; best = "key"; label = "KEY"; } }
      if (medCell >= 0) { var d2 = manh(medCell, me); if (d2 < bd) { bd = d2; best = "med"; label = "medkit"; } }
      if (!best) { api.toast("No treasure left to entangle", "bad", 1100); return; }
      entLeft--; linked = best;
      QG.sfx.zap();
      api.log("You <b>ENTANGLED</b> your position with the " + label + " - it will follow you.");
      afterAction("Entangled with the " + label + ".");
    }

    function doMeasure() {
      if (turns <= 0) return;
      var before = enemies.length;
      enemies = enemies.filter(function (e) {
        return !e.cells.some(function (i) { return pAt(i) >= 0.1; });
      });
      var killed = before - enemies.length;
      QG.sfx.measure();
      if (killed) {
        api.log("You <b>MEASURED</b> " + killed + " superposed " + (killed === 1 ? "enemy" : "enemies") + " inside your cloud - collapsed and defeated!");
        api.toast("Enemy defeated!", "good");
      } else {
        api.toast("No enemies in your rooms", "bad", 1100);
        api.log("You measured, but no enemy occupied your cloud.");
      }
      afterAction("Measured your rooms.");
    }

    function onCell(r, c) {
      if (over || busy) return;
      var i = ix(r, c), me = top();
      if (i === me) return;
      var dr = rr(i) - rr(me), dc = cc(i) - cc(me);
      if (dr === 0 && dc === 0) return;
      var dir;
      if (Math.abs(dr) >= Math.abs(dc)) dir = dr < 0 ? "up" : "down";
      else dir = dc < 0 ? "left" : "right";
      act(dir);
    }

    function paint() {
      var tp = top();
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var i = ix(r, c), cell = grid.at(r, c);
          var cls = "", html = "", bg = "";
          if (walls[i]) {
            cls = "cell--wall";
          } else {
            var p = pAt(i);
            var parts = [];
            if (i === EXIT) parts.push("<span style='font-size:.95em'>\uD83D\uDEAA</span>");
            if (i === keyCell) parts.push("<span style='font-size:.9em'>\uD83D\uDD11</span>");
            if (i === medCell) parts.push("<span style='font-size:.9em'>\u2795</span>");
            if (enemyAt(i)) parts.push("<span style='opacity:.6;font-size:.9em'>\uD83D\uDC7E</span>");
            if (p > 0.004) {
              cls = "is-super";
              bg = U.rgba(PAL.cyan, 0.1 + p * 0.55);
              parts.push("<span style='font-size:.62em;font-weight:800'>" + Math.round(p * 100) + "%</span>");
            }
            if (i === tp) cls += " is-target";
            html = parts.join("");
          }
          cell.innerHTML = html;
          cell.className = "cell" + (cls ? " " + cls : "");
          cell.style.background = bg;
        }
      }
      QG.clear(hud);
      var pe = pAt(EXIT);
      [["Turns", turns], ["HP", hp], ["Enemies", enemies.length],
       ["Key", hasKey ? "YES" : "no"], ["Exit odds", Math.round(pe * 100) + "%"]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      bEnt.innerHTML = entLeft > 0 ? "ENTANGLE" : "ENTANGLE (used)";
      bEnt.style.opacity = entLeft > 0 ? "1" : ".55";
      api.setScores([
        { name: "HP", value: hp, color: "red" },
        { name: "Turns", value: turns, color: "cyan" },
        { name: "Enemies", value: enemies.length, color: "magenta" },
        { name: "Exit odds", value: Math.round(pe * 100) + "%", color: "lime" }
      ]);
    }

    setup();
    api.setStatus("Drift with the arrow pad. Grab the key, then reach the exit with 30%+ of your cloud on it.");
  });

  /* ==========================================================
     12. QUANTUM SPY
     ========================================================== */
  QG.register("quantum-spy", function (root, api) {
    var NB = 4;
    var secret, qs, guess, sel, probes, hLeft, xLeft, wrongs, over, note, busy;

    function classify(q) {
      var p0 = q.p0;
      if (p0 > 0.9985) return { kind: "def", bit: 0 };
      if (p0 < 0.0015) return { kind: "def", bit: 1 };
      var plus = { re: (q.a.re + q.b.re) * S2, im: (q.a.im + q.b.im) * S2 };
      var pp = QG.C.abs2(plus);
      if (pp > 0.9985) return { kind: "sup", bit: 0 };
      if (pp < 0.0015) return { kind: "sup", bit: 1 };
      return { kind: "mixed", bit: null };
    }
    function basis(i) { var c = classify(qs[i]); return c.kind === "def" ? "|" + c.bit + ">" : (c.kind === "sup" ? (c.bit === 0 ? "|+>" : "|->") : "mixed"); }

    function prepare(re) {
      var i;
      if (!re) {
        secret = [];
        for (i = 0; i < NB; i++) secret.push(U.int(2));
      }
      var supCount = 2 + U.int(2);
      var sup = U.shuffle([0, 1, 2, 3]).slice(0, supCount);
      qs = [];
      for (i = 0; i < NB; i++) {
        var q = new QG.Qubit(QG.C.re(1), QG.C.re(0));
        if (secret[i] === 1) q.apply(QG.GATES.X);
        if (sup.indexOf(i) >= 0) q.apply(QG.GATES.H);
        qs.push(q);
      }
      guess = [null, null, null, null];
      note = ["", "", "", ""];
      sel = 0; probes = 6; hLeft = 4; xLeft = 4;
      if (!re) wrongs = 0;
      over = false; busy = false;
      paint();
    }

    var cards = h("div.row.gap8.mt12", { style: "justify-content:center;flex-wrap:wrap" });
    var actRow = h("div.actions.mt12");
    var bProbe = api.btn("PROBE", "cyan", doProbe);
    var bX = api.btn("X (flip)", "purple", doX);
    var bH = api.btn("H (test)", "orange", doH);
    actRow.appendChild(bProbe); actRow.appendChild(bX); actRow.appendChild(bH);

    var guessRow = h("div.row.gap8.mt12", { style: "justify-content:center" });
    var subRow = h("div.actions.mt12");
    var bSub = api.btn("SUBMIT CODE", "lime", doSubmit);
    subRow.appendChild(bSub);

    var hud = h("div.hud.mt12");

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM SPY"),
      h("span.badge", "Crack the 4-bit code")
    ));
    root.appendChild(h("div.small.muted.tc.mt8", "Tap a qubit to select it, then PROBE, X or H. A definite state gives you the bit for free - a superposed one must be rotated back with H first."));
    root.appendChild(cards);
    root.appendChild(actRow);
    root.appendChild(h("div.marker.tc.mt16", { style: "font-size:.85rem" }, "YOUR CODE GUESS"));
    root.appendChild(guessRow);
    root.appendChild(subRow);
    root.appendChild(hud);

    function card(i) {
      var st = classify(qs[i]);
      var p0 = qs[i].p0;
      var tag, col;
      if (st.kind === "def") { tag = "DEFINITE"; col = PAL.lime; }
      else if (st.kind === "sup") { tag = "SUPERPOSED"; col = PAL.purple; }
      else { tag = "MIXED"; col = PAL.orange; }
      var el = h("div", {
        style: "min-width:88px;flex:1 1 88px;max-width:120px;padding:10px 8px;cursor:pointer;text-align:center;" +
          "border:3px solid " + (i === sel ? col : "var(--ink)") + ";border-radius:10px;background:var(--paper-2);" +
          "box-shadow:" + (i === sel ? "4px 4px 0 " + U.rgba(col, .55) : "3px 3px 0 var(--ink)") + ";" +
          "transform:" + (i === sel ? "translate(-2px,-2px)" : "none")
      });
      el.appendChild(h("div.marker", { style: "font-size:.8rem" }, "q" + i));
      el.appendChild(h("div", { style: "font-family:var(--font-mono);font-size:.72rem;margin:4px 0" }, basis(i)));
      var bar = h("div.qmeter__bar", { style: "height:12px" });
      bar.appendChild(h("div.qmeter__fill", { style: "width:" + (p0 * 100).toFixed(0) + "%;background:" + col }));
      el.appendChild(bar);
      el.appendChild(h("div", { style: "font-family:var(--font-mono);font-size:.62rem;margin-top:4px" },
        "P0 " + (p0 * 100).toFixed(0) + "% / P1 " + ((1 - p0) * 100).toFixed(0) + "%"));
      el.appendChild(h("div", { style: "font-size:.56rem;font-weight:800;letter-spacing:.06em;color:" + col + ";margin-top:3px" }, tag));
      if (note[i]) el.appendChild(h("div", { style: "font-size:.58rem;margin-top:3px;opacity:.85" }, note[i]));
      el.addEventListener("click", function () { if (!over) { sel = i; QG.sfx.tap(); paint(); } });
      return el;
    }

    function paint() {
      QG.clear(cards);
      for (var i = 0; i < NB; i++) cards.appendChild(card(i));
      QG.clear(guessRow);
      for (var k = 0; k < NB; k++) {
        (function (kk) {
          var g = guess[kk];
          var b = h("button.btn" + (g === null ? ".btn--ghost" : ".btn--lime"), {
            type: "button", style: "min-width:56px;min-height:48px;font-family:var(--font-mono);font-size:1.2rem"
          }, g === null ? "?" : String(g));
          b.addEventListener("click", function () {
            if (over) return;
            guess[kk] = guess[kk] === null ? 0 : (guess[kk] === 0 ? 1 : null);
            QG.sfx.tap(); paint();
          });
          guessRow.appendChild(b);
        })(k);
      }
      QG.clear(hud);
      [["Probes", probes], ["H gates", hLeft], ["X gates", xLeft], ["Wrong guesses", wrongs + "/3"]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      bProbe.innerHTML = "PROBE (" + probes + ")";
      bH.innerHTML = "H (" + hLeft + ")";
      bX.innerHTML = "X (" + xLeft + ")";
      api.setScores([
        { name: "Probes", value: probes, color: "cyan" },
        { name: "H", value: hLeft, color: "orange" },
        { name: "Wrong", value: wrongs + "/3", color: "red" }
      ]);
    }

    function crosstalk(except) {
      if (Math.random() > 0.22) return;
      var pool = [];
      for (var i = 0; i < NB; i++) if (i !== except) pool.push(i);
      var j = U.pick(pool);
      if (classify(qs[j]).kind === "def") {
        qs[j].apply(QG.GATES.H);
        api.log("Crosstalk: the measurement re-superposed <b>q" + j + "</b>.");
      }
    }

    function doProbe() {
      if (over || busy) return;
      if (probes <= 0) { api.toast("No probes left", "bad", 1100); return; }
      var i = sel, before = classify(qs[i]);
      probes--;
      var r = qs[i].measure();
      if (before.kind === "def") {
        note[i] = "probe " + r + " (reliable)";
        api.log("PROBE <b>q" + i + "</b> -> " + r + " - the state was definite, answer confirmed.");
        QG.sfx.good();
      } else {
        note[i] = "probe " + r + " (DISTURBED)";
        api.log("PROBE <b>q" + i + "</b> -> " + r + " - the qubit was SUPERPOSED. The measurement collapsed it at random; the original bit is lost.");
        api.toast("You disturbed a superposed qubit!", "bad");
        QG.sfx.measure();
      }
      crosstalk(i);
      paint();
      api.setStatus("Probe returned " + r + (before.kind === "def" ? " (reliable)." : " (unreliable - it was superposed)."));
    }

    function doX() {
      if (over || busy) return;
      if (xLeft <= 0) { api.toast("No X gates left", "bad", 1100); return; }
      xLeft--;
      var i = sel, before = classify(qs[i]);
      qs[i].apply(QG.GATES.X);
      QG.sfx.gate();
      if (before.kind === "def") {
        note[i] = "flipped";
        api.log("X applied to <b>q" + i + "</b> - the definite bit flipped to " + (1 - before.bit) + ".");
      } else {
        api.log("X applied to <b>q" + i + "</b> - on a superposed qubit X only shifts the phase, the state is unchanged.");
        api.toast("X did nothing - that qubit is in the X basis", "bad", 1400);
      }
      paint();
    }

    function doH() {
      if (over || busy) return;
      if (hLeft <= 0) { api.toast("No H gates left", "bad", 1100); return; }
      hLeft--;
      var i = sel, before = classify(qs[i]);
      qs[i].apply(QG.GATES.H);
      QG.sfx.gate();
      if (before.kind === "sup") {
        note[i] = "resolved";
        api.log("H applied to <b>q" + i + "</b> - the superposition rotated back into a definite bit. Read the bar.");
      } else {
        note[i] = "made uncertain";
        api.log("H applied to <b>q" + i + "</b> - a definite bit became superposed. Apply H again to undo.");
      }
      paint();
    }

    function doSubmit() {
      if (over || busy) return;
      for (var i = 0; i < NB; i++) {
        if (guess[i] === null) { api.toast("Set all four bits first", "bad", 1200); return; }
      }
      var ok = true;
      for (var k = 0; k < NB; k++) if (guess[k] !== secret[k]) ok = false;
      if (ok) {
        over = true;
        api.setBest("decoded");
        api.setStatus("Code accepted. You are through.");
        api.log("SUBMITTED " + guess.join("") + " - <b>correct</b>. The Agency never saw you.");
        api.win("Code cracked!", "You submitted " + guess.join("") + " with " + wrongs + " failed attempt" + (wrongs === 1 ? "" : "s") + ".");
        return;
      }
      wrongs++;
      QG.sfx.lose();
      api.log("SUBMITTED " + guess.join("") + " - <b>rejected</b>. Attempt " + wrongs + " of 3.");
      api.toast("Wrong code! " + (3 - wrongs) + " attempts left", "bad", 1500);
      if (wrongs >= 3) {
        over = true;
        api.lose("You were caught.", "Three wrong submissions - the Agency shut the channel down.");
        return;
      }
      api.setStatus("The Agency re-prepared the qubits. Same code, new states.");
      prepare(true);
    }

    prepare(false);
    api.setStatus("Read the bars. Definite qubits give the bit for free - rotate superposed ones with H.");
  });

  /* ==========================================================
     13. QUANTUM MINESWEEPER
     ========================================================== */
  QG.register("quantum-minesweeper", function (root, api) {
    var N = 9, CELLS = N * N;
    var solid, qmines, revealed, flags, lives, mode, over, boom, phase, safeCount;

    function rw(i) { return Math.floor(i / N); }
    function cl(i) { return i % N; }
    function nbrs8(i) {
      var out = [], r = rw(i), c = cl(i);
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N) out.push(nr * N + nc);
      }
      return out;
    }
    function pinnedAt(i) {
      for (var k = 0; k < qmines.length; k++) if (qmines[k].pin === i) return qmines[k];
      return null;
    }
    function unresolvedAt(i) {
      for (var k = 0; k < qmines.length; k++) if (qmines[k].pin === null && (qmines[k].a === i || qmines[k].b === i)) return qmines[k];
      return null;
    }
    function isMine(i) { return !!solid[i] || !!pinnedAt(i); }
    function isPossible(i) { return !!unresolvedAt(i); }
    function pin(i) { var q = unresolvedAt(i); if (q) q.pin = i; return q; }

    function danger(i) {
      var nb = nbrs8(i), n = 0, k, j;
      for (k = 0; k < nb.length; k++) {
        j = nb[k];
        if (solid[j]) n++;
        for (var m = 0; m < qmines.length; m++) {
          var q = qmines[m];
          if (q.pin !== null) { if (q.pin === j) n++; }
          else { if (q.a === j) n++; if (q.b === j) n++; }
        }
      }
      return n;
    }

    function setup() {
      solid = {}; qmines = []; revealed = {}; flags = {};
      lives = 3; mode = "reveal"; over = false; boom = -1; phase = 0;
      var centre = [];
      for (var r = 3; r <= 5; r++) for (var c = 3; c <= 5; c++) centre.push(r * N + c);
      var used = {}, i;
      for (var k = 0; k < centre.length; k++) used[centre[k]] = true;

      var pool = [];
      for (i = 0; i < CELLS; i++) if (!used[i]) pool.push(i);
      pool = U.shuffle(pool);
      var ptr = 0;
      for (i = 0; i < 6; i++) { solid[pool[ptr++]] = true; }
      for (i = 0; i < 4; i++) {
        var a = pool[ptr++], b = pool[ptr++];
        qmines.push({ a: a, b: b, pin: null });
      }
      revealed[4 * N + 4] = true;
      cascade();
      countSafe();
      paint();
    }
    function countSafe() {
      var n = 0;
      for (var i = 0; i < CELLS; i++) if (!solid[i] && !pinnedAt(i) && !revealed[i]) n++;
      safeCount = n;
    }

    function cascade() {
      var changed = true, guard = 0;
      while (changed && guard++ < 120) {
        changed = false;
        for (var i = 0; i < CELLS; i++) {
          if (!revealed[i] || danger(i) !== 0) continue;
          var nb = nbrs8(i);
          for (var k = 0; k < nb.length; k++) {
            var j = nb[k];
            if (revealed[j] || isMine(j) || isPossible(j)) continue;
            revealed[j] = true; changed = true;
          }
        }
      }
    }

    var grid = api.grid(N, N, onCell);
    var btnRow = h("div.actions.mt12");
    var bMode = api.btn("MODE: REVEAL", "cyan", function () {
      if (over) return;
      mode = mode === "reveal" ? "flag" : "reveal";
      QG.sfx.click(); paint();
      api.setStatus(mode === "reveal" ? "REVEAL mode - tap a cell to uncover it." : "FLAG mode - tap a shimmering cell to pin the quantum mine, or a hidden cell to flag it.");
    });
    var bNew = api.btn("New field", "ghost", function () { setup(); api.setStatus("New field laid out."); });
    btnRow.appendChild(bMode); btnRow.appendChild(bNew);

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM MINESWEEPER"),
      h("span.badge", "3 lives")
    ));
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(btnRow);
    root.appendChild(h("div.small.muted.tc.mt8", "Shimmering cells share one quantum mine - pin it in FLAG mode to make the partner safe. Numbers count a quantum mine once in each of its possible cells."));
    var hud = h("div.hud.mt12");
    root.appendChild(hud);

    api.every(430, function () {
      if (over) return;
      phase = phase ? 0 : 1;
      for (var k = 0; k < qmines.length; k++) {
        var q = qmines[k];
        if (q.pin !== null) continue;
        var col = phase ? 0.34 : 0.12;
        var ca = grid.at(rw(q.a), cl(q.a)), cb = grid.at(rw(q.b), cl(q.b));
        if (ca && !revealed[q.a]) ca.style.background = U.rgba(PAL.purple, col);
        if (cb && !revealed[q.b]) cb.style.background = U.rgba(PAL.purple, col);
      }
    });

    var NUMCOL = [PAL.blue, PAL.green, PAL.red, PAL.purple, PAL.orange, PAL.cyan, PAL.magenta, PAL.pink];

    function onCell(r, c) {
      if (over) return;
      var i = r * N + c;
      if (mode === "reveal") reveal(i);
      else flagTap(i);
    }

    function reveal(i) {
      if (revealed[i] || flags[i]) return;
      if (isMine(i)) {
        revealed[i] = true; lives--; boom = i;
        QG.sfx.zap();
        api.log("You uncovered a <b>certain mine</b> at (" + (rw(i) + 1) + "," + (cl(i) + 1) + ") - <b>-1 life</b>.");
        api.toast("Boom! -1 life", "bad");
      } else if (isPossible(i)) {
        pin(i); revealed[i] = true; lives--; boom = i;
        QG.sfx.measure();
        api.log("You measured a <b>quantum mine</b> into (" + (rw(i) + 1) + "," + (cl(i) + 1) + ") - it collapsed on you. <b>-1 life</b>. Its partner is now safe.");
        api.toast("Quantum mine collapsed! -1 life", "bad");
      } else {
        revealed[i] = true;
        QG.sfx.click();
      }
      if (lives <= 0) { over = true; countSafe(); paint(); api.lose("Three mines.", "You ran out of lives before clearing the field."); return; }
      cascade(); countSafe(); paint(); checkWin();
    }

    function flagTap(i) {
      if (revealed[i]) return;
      var q = unresolvedAt(i);
      if (q) {
        pin(i);
        QG.sfx.zap();
        api.log("You <b>pinned</b> the quantum mine into (" + (rw(i) + 1) + "," + (cl(i) + 1) + ") - its partner is safe.");
        api.toast("Quantum mine pinned", "quantum");
      } else {
        var pin = pinnedAt(i);
        if (pin) { pin.pin = null; QG.sfx.tap(); api.log("Unpinned (" + (rw(i) + 1) + "," + (cl(i) + 1) + ") - back into superposition."); }
        else if (flags[i]) { flags[i] = false; QG.sfx.tap(); }
        else { flags[i] = true; QG.sfx.tap(); }
      }
      cascade(); countSafe(); paint(); checkWin();
    }

    function checkWin() {
      if (safeCount > 0) return false;
      over = true;
      api.setBest("cleared");
      api.setStatus("Field cleared!");
      api.win("Field cleared!", "Every safe cell uncovered with " + lives + " life" + (lives === 1 ? "" : "ves") + " to spare.");
      return true;
    }

    function paint() {
      for (var r = 0; r < N; r++) {
        for (var c = 0; c < N; c++) {
          var i = r * N + c, cell = grid.at(r, c);
          var cls = "", html = "", bg = "";
          if (revealed[i]) {
            bg = U.rgba(PAL.lime, 0.14);
            if (isMine(i)) { html = "\uD83D\uDCA3"; bg = U.rgba(PAL.red, 0.3); }
            else {
              var d = danger(i);
              if (d > 0) html = "<span style='color:" + NUMCOL[(d - 1) % 8] + ";font-weight:800'>" + d + "</span>";
              else html = "<span style='opacity:.35'>\u00B7</span>";
            }
          } else if (pinnedAt(i)) {
            bg = U.rgba(PAL.red, 0.26);
            html = "\uD83D\uDEA9";
          } else if (flags[i]) {
            bg = U.rgba(PAL.yellow, 0.32);
            html = "\uD83D\uDEA9";
          } else if (isPossible(i)) {
            bg = U.rgba(PAL.purple, phase ? 0.34 : 0.12);
            html = "<span style='opacity:.75'>\u25C8</span>";
          }
          if (i === boom) cls = "is-measured";
          cell.innerHTML = html;
          cell.className = "cell" + (cls ? " " + cls : "");
          cell.style.background = bg;
        }
      }
      QG.clear(hud);
      var pins = 0, qres = 0;
      for (var k = 0; k < qmines.length; k++) { if (qmines[k].pin !== null) pins++; }
      for (var m = 0; m < qmines.length; m++) if (qmines[m].pin === null) qres++;
      [["Lives", lives], ["Certain mines", 6], ["Quantum mines", 4 - qres + "/4 pinned"],
       ["Cells left", safeCount]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      bMode.innerHTML = mode === "reveal" ? "MODE: REVEAL" : "MODE: FLAG";
      bMode.className = "btn btn--" + (mode === "reveal" ? "cyan" : "magenta");
      api.setScores([
        { name: "Lives", value: lives, color: "red" },
        { name: "Pinned", value: pins + "/4", color: "purple" },
        { name: "Left", value: safeCount, color: "lime" }
      ]);
    }

    setup();
    api.setStatus("REVEAL mode. Tap cells to uncover them - three lives.");
  });

  /* ==========================================================
     14. QUBIT PONG
     ========================================================== */
  QG.register("qubit-pong", function (root, api) {
    var W = 620, HGT = 400, R = 8;
    var PW = 14, PH = 92, PL = 26, PRX = W - 26 - PW;
    var TARGET = 7;

    var bx, by, vx, vy, py, ay, aiErr, aiT, measureT, charges;
    var swapT, cool, sYou, sAI, over, dragging, pTarget;

    function serve(towardPlayer) {
      bx = W / 2; by = HGT / 2;
      var ang = (Math.random() * 0.6 - 0.3);
      var dir = towardPlayer ? -1 : 1;
      var sp = 5.2;
      vx = dir * sp * Math.cos(ang);
      vy = sp * Math.sin(ang);
      swapT = 1.0 + Math.random() * 0.5;
      cool = 0.5;
    }
    function reset() {
      sYou = 0; sAI = 0; over = false; charges = 3; measureT = 0;
      py = HGT / 2; ay = HGT / 2; pTarget = HGT / 2; aiErr = 0; aiT = 0;
      dragging = false;
      serve(true);
      syncScores();
    }
    function mirror() { bx = W - bx; by = HGT - by; vx = -vx; vy = -vy; }

    var cv = api.canvas({ w: W, h: HGT });
    var c2 = cv.ctx;

    cv.on("down", function (p) { dragging = true; pTarget = U.clamp(p.y, 0, HGT); });
    cv.on("move", function (p) { if (dragging) pTarget = U.clamp(p.y, 0, HGT); });
    api.on(window, "pointerup", function () { dragging = false; });
    api.on(window, "pointercancel", function () { dragging = false; });

    var pad = QG.dpad({ onPress: function (d) {
      if (over) return;
      if (d === "up") pTarget = U.clamp(pTarget - 52, 0, HGT);
      else if (d === "down") pTarget = U.clamp(pTarget + 52, 0, HGT);
    } });
    var detach = QG.steer(cv.el, function (d) {
      if (over) return;
      if (d === "up") pTarget = U.clamp(pTarget - 52, 0, HGT);
      else if (d === "down") pTarget = U.clamp(pTarget + 52, 0, HGT);
    });
    api.onCleanup(detach);

    var btnRow = h("div.actions.mt12");
    var bM = api.btn("MEASURE (3)", "cyan", function () {
      if (over) return;
      if (charges <= 0) { api.toast("No charges left", "bad", 1000); return; }
      charges--; measureT = 6;
      QG.sfx.measure();
      api.log("You <b>measured</b> the ball - it is pinned to its real position for 6 seconds.");
      api.toast("Ball collapsed for 6s", "good");
      bM.innerHTML = "MEASURE (" + charges + ")";
      syncScores();
    });
    btnRow.appendChild(bM);

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUBIT PONG"),
      h("span.badge", "First to 7")
    ));
    root.appendChild(h("div.mt12", cv.el));
    root.appendChild(h("div.mt12", pad));
    root.appendChild(btnRow);
    root.appendChild(h("div.small.muted.tc.mt8", "The solid ball is real, the dashed one is its mirror. Un-measured it can tunnel between them - MEASURE freezes it."));

    function bouncePaddle(px, pcy, facing) {
      if (facing < 0 && vx > 0) return false;
      if (facing > 0 && vx < 0) return false;
      var near = facing < 0 ? (bx - R <= px + PW && bx - R > px - 14) : (bx + R >= px && bx + R < px + PW + 14);
      if (!near) return false;
      if (Math.abs(by - pcy) > PH / 2 + R) return false;
      vx = facing < 0 ? Math.abs(vx) * 1.035 : -Math.abs(vx) * 1.035;
      vy += (by - pcy) * 0.055;
      vy = U.clamp(vy, -6.4, 6.4);
      if (Math.abs(vy) < 1.1) vy = vy < 0 ? -1.1 : 1.1;
      cool = 0.32;
      return true;
    }

    function step(dt) {
      var f = dt / 16.67;
      if (over) return;
      if (measureT > 0) measureT = Math.max(0, measureT - dt / 1000);
      if (cool > 0) cool = Math.max(0, cool - dt / 1000);

      py += (pTarget - py) * Math.min(1, 0.28 * f);
      py = U.clamp(py, PH / 2, HGT - PH / 2);

      aiT -= dt / 1000;
      if (aiT <= 0) { aiT = 0.42 + Math.random() * 0.4; aiErr = (Math.random() * 2 - 1) * 62; }
      var aim = by + aiErr;
      if (vx > 0) {
        var dy = aim - ay;
        var sp = 4.4 * f;
        ay += U.clamp(dy, -sp, sp);
      }
      ay = U.clamp(ay, PH / 2, HGT - PH / 2);

      bx += vx * f; by += vy * f;
      if (by < R) { by = R; vy = Math.abs(vy); }
      if (by > HGT - R) { by = HGT - R; vy = -Math.abs(vy); }

      swapT -= dt / 1000;
      if (swapT <= 0 && measureT <= 0 && cool <= 0) {
        var mx = W - bx, my = HGT - by;
        if (!(mx < PL + PW + 24 || mx > PRX - 24)) {
          mirror();
          QG.sfx.zap();
        }
        swapT = 0.55 + Math.random() * 0.65;
      }

      bouncePaddle(PL, py, -1);
      bouncePaddle(PRX, ay, 1);

      if (bx < -24) { sAI++; QG.sfx.tick(); api.log("The AI takes the point. <b>" + sYou + " - " + sAI + "</b>"); serve(true); syncScores(); }
      else if (bx > W + 24) { sYou++; QG.sfx.good(); api.log("Point for you! <b>" + sYou + " - " + sAI + "</b>"); serve(false); syncScores(); }

      if (sYou >= TARGET) { over = true; api.setBest("win"); api.win("Match won!", "You took the set " + sYou + " - " + sAI + "."); }
      else if (sAI >= TARGET) { over = true; api.lose("Match lost.", "The AI reached " + TARGET + " points first."); }
    }

    function syncScores() {
      api.setScores([
        { name: "You", value: sYou, color: "lime" },
        { name: "AI", value: sAI, color: "magenta" },
        { name: "Charges", value: charges, color: "cyan" }
      ]);
    }

    function draw() {
      var ink = fgCol();
      c2.clearRect(0, 0, W, HGT);
      QG.draw.rect(c2, 4, 4, W - 8, HGT - 8, { fill: U.rgba(dark() ? PAL.purple : PAL.cyan, 0.06), color: ink, width: 3, wobble: 1.2, double: false });
      QG.draw.line(c2, W / 2, 10, W / 2, HGT - 10, { color: U.rgba(ink, 0.28), width: 2, wobble: 1.6 });

      var collapsed = measureT > 0;
      var gx = W - bx, gy = HGT - by;
      if (!collapsed) QG.draw.dashedCircle(c2, gx, gy, R, { color: PAL.purple, width: 3, dash: [5, 5] });
      else QG.draw.dashedCircle(c2, gx, gy, R, { color: U.rgba(PAL.purple, 0.3), width: 2, dash: [4, 7] });

      QG.draw.rect(c2, PL, py - PH / 2, PW, PH, { fill: PAL.lime, color: ink, width: 3, wobble: 1.1, double: false, radius: 4 });
      QG.draw.rect(c2, PRX, ay - PH / 2, PW, PH, { fill: PAL.magenta, color: ink, width: 3, wobble: 1.1, double: false, radius: 4 });
      QG.draw.circle(c2, bx, by, R, { fill: collapsed ? PAL.yellow : PAL.cyan, color: ink, width: 2.4, wobble: 0.7, double: false });

      QG.draw.text(c2, sYou + " : " + sAI, W / 2, 26, { size: 20, color: ink, font: QG.FONT.display });
      QG.draw.text(c2, "YOU", 52, 22, { size: 12, color: PAL.lime, font: QG.FONT.display });
      QG.draw.text(c2, "AI", W - 52, 22, { size: 12, color: PAL.magenta, font: QG.FONT.display });
      if (collapsed) QG.draw.text(c2, "COLLAPSED " + measureT.toFixed(1) + "s", W / 2, HGT - 22, { size: 13, color: PAL.yellow, font: QG.FONT.display });
      else QG.draw.text(c2, "SUPERPOSED", W / 2, HGT - 22, { size: 13, color: PAL.purple, font: QG.FONT.display });
    }

    reset();
    api.loop(function (dt) { step(dt); draw(); });
    api.setStatus("Drag on the court or use the arrow pad. Hit the solid ball past the AI.");
  });

  /* ==========================================================
     15. QUANTUM TETRIS
     ========================================================== */
  QG.register("quantum-tetris", function (root, api) {
    var COLS = 10, ROWS = 16, CS = 24, PX = 14, PY = 18;
    var W = 470, HGT = 420;
    var BASE = {
      I: [[0, 0], [1, 0], [2, 0], [3, 0]],
      O: [[0, 0], [1, 0], [0, 1], [1, 1]],
      T: [[0, 0], [1, 0], [2, 0], [1, 1]],
      S: [[1, 0], [2, 0], [0, 1], [1, 1]],
      Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
      J: [[0, 0], [0, 1], [1, 1], [2, 1]],
      L: [[2, 0], [0, 1], [1, 1], [2, 1]]
    };
    var BOX = { I: 4, O: 2, T: 3, S: 3, Z: 3, J: 3, L: 3 };
    var COL = { I: PAL.cyan, O: PAL.yellow, T: PAL.purple, S: PAL.green, Z: PAL.red, J: PAL.blue, L: PAL.orange };
    var ROTS = {};

    (function build() {
      for (var t in BASE) {
        ROTS[t] = [];
        var box = BOX[t];
        for (var r = 0; r < 4; r++) {
          var pts = [];
          for (var i = 0; i < BASE[t].length; i++) {
            var x = BASE[t][i][0], y = BASE[t][i][1];
            for (var k = 0; k < r; k++) { var nx = box - 1 - y, ny = x; x = nx; y = ny; }
            pts.push([x, y]);
          }
          ROTS[t].push(pts);
        }
      }
    })();

    var board, piece, nextType, bag, score, lines, over, acc, interval, measured;

    var off = document.createElement("canvas");
    off.width = COLS * CS * 2; off.height = ROWS * CS * 2;
    var octx = off.getContext("2d");
    var stackDirty = true;

    /* pre-rendered cell faces: one sketchy tile per piece type (solid + ghost) */
    var TILE = 48;
    var solidTile = {}, ghostTile = {};
    (function buildTiles() {
      for (var t in COL) {
        var cvA = document.createElement("canvas");
        cvA.width = TILE; cvA.height = TILE;
        var a = cvA.getContext("2d");
        a.setTransform(2, 0, 0, 2, 0, 0);
        QG.draw.rect(a, 2, 2, CS - 4, CS - 4, { fill: COL[t], color: PAL.ink, width: 2.4, wobble: 1, double: false, radius: 3 });
        solidTile[t] = cvA;
        var cvB = document.createElement("canvas");
        cvB.width = TILE; cvB.height = TILE;
        var b = cvB.getContext("2d");
        b.setTransform(2, 0, 0, 2, 0, 0);
        QG.draw.rect(b, 3, 3, CS - 6, CS - 6, { fill: U.rgba(COL[t], 0.18), color: PAL.purple, width: 2, wobble: 1, double: false, radius: 3 });
        b.globalAlpha = 0.55;
        QG.draw.dashedCircle(b, CS / 2, CS / 2, CS * 0.24, { color: PAL.purple, width: 2, dash: [4, 4] });
        b.globalAlpha = 1;
        ghostTile[t] = cvB;
      }
    })();

    function cellsAt(type, rot, col, y) {
      var pts = ROTS[type][rot], out = [];
      for (var i = 0; i < pts.length; i++) out.push([col + pts[i][0], y + pts[i][1]]);
      return out;
    }
    function valid(type, rot, col, y) {
      var c = cellsAt(type, rot, col, y);
      for (var i = 0; i < c.length; i++) {
        var x = c[i][0], yy = c[i][1];
        if (x < 0 || x >= COLS || yy >= ROWS) return false;
        if (yy >= 0 && board[yy * COLS + x]) return false;
      }
      return true;
    }
    function nextBag() {
      if (!bag || !bag.length) bag = U.shuffle(["I", "O", "T", "S", "Z", "J", "L"]);
      return bag.pop();
    }
    function makeAlt() {
      var cands = [];
      for (var r = 0; r < 4; r++) if (r !== piece.rot) cands.push({ rot: r, col: piece.col });
      cands.push({ rot: piece.rot, col: piece.col + 2 });
      cands.push({ rot: piece.rot, col: piece.col - 2 });
      cands.push({ rot: piece.rot, col: piece.col + 1 });
      cands.push({ rot: (piece.rot + 2) % 4, col: piece.col - 1 });
      cands = U.shuffle(cands);
      for (var i = 0; i < cands.length; i++) {
        var cd = cands[i];
        if (cd.col < 0 || cd.col >= COLS) continue;
        if (valid(piece.type, cd.rot, cd.col, piece.y)) {
          piece.altRot = cd.rot; piece.altCol = cd.col; return true;
        }
      }
      piece.altRot = piece.rot; piece.altCol = piece.col;
      return false;
    }
    function spawn() {
      var t = nextType || nextBag();
      nextType = nextBag();
      piece = { type: t, rot: 0, col: 3, y: 0, altRot: 0, altCol: 3 };
      measured = false;
      makeAlt();
      if (!valid(piece.type, piece.rot, piece.col, piece.y)) {
        over = true;
        api.setBest(score);
        api.lose("Top out.", "The stack reached the ceiling after " + lines + " line clears.");
        return false;
      }
      acc = 0;
      return true;
    }
    function reset() {
      board = new Array(COLS * ROWS).fill(null);
      bag = null; nextType = null;
      score = 0; lines = 0; over = false; acc = 0; interval = 620;
      stackDirty = true;
      spawn();
      paintHud();
    }

    function clearLines() {
      var cleared = 0;
      for (var r = ROWS - 1; r >= 0; r--) {
        var full = true;
        for (var c = 0; c < COLS; c++) if (!board[r * COLS + c]) { full = false; break; }
        if (!full) continue;
        cleared++;
        for (var rr = r; rr > 0; rr--) {
          for (var cc2 = 0; cc2 < COLS; cc2++) board[rr * COLS + cc2] = board[(rr - 1) * COLS + cc2];
        }
        for (var c2 = 0; c2 < COLS; c2++) board[c2] = null;
        r++;
      }
      if (cleared) {
        score += cleared * cleared * 120 + 60;
        lines += cleared;
        interval = Math.max(110, 620 - lines * 42);
        QG.sfx.good();
        api.log("<b>" + cleared + " line" + (cleared === 1 ? "" : "s") + "</b> cleared - " + lines + " total.");
      }
      return cleared;
    }

    function land() {
      var st;
      if (measured) {
        st = { rot: piece.rot, col: piece.col, how: "measured" };
      } else {
        var altOK = valid(piece.type, piece.altRot, piece.altCol, piece.y);
        var useAlt = altOK && Math.random() < 0.5;
        st = useAlt ? { rot: piece.altRot, col: piece.altCol, how: "collapsed to its alternative" }
                    : { rot: piece.rot, col: piece.col, how: "collapsed to its real state" };
      }
      var c = cellsAt(piece.type, st.rot, st.col, piece.y), i;
      for (i = 0; i < c.length; i++) {
        var x = c[i][0], y = c[i][1];
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) board[y * COLS + x] = piece.type;
      }
      stackDirty = true;
      QG.sfx.click();
      if (measured) api.log("The measured piece locked in place.");
      else api.log("The piece <b>" + st.how + "</b> on contact.");
      var n = clearLines();
      if (lines >= 12) {
        over = true;
        api.setBest(score);
        api.win("Quantum architect!", "You survived 12 line clears with " + score + " points.");
        return;
      }
      spawn();
      paintHud();
      if (!over) api.setStatus(n ? "Lines cleared. Keep stacking." : "Score " + score + " - " + lines + "/12 lines.");
    }

    function move(dx) {
      if (over) return;
      var nc = piece.col + dx, na = piece.altCol + dx;
      if (valid(piece.type, piece.rot, nc, piece.y)) piece.col = nc;
      if (na >= 0 && na < COLS && valid(piece.type, piece.altRot, na, piece.y)) piece.altCol = na;
      QG.sfx.tap();
    }
    function rotate() {
      if (over) return;
      var nr = (piece.rot + 1) % 4;
      if (valid(piece.type, nr, piece.col, piece.y)) { piece.rot = nr; QG.sfx.gate(); }
      else api.toast("Blocked", "bad", 700);
    }
    function down() {
      if (over) return;
      if (valid(piece.type, piece.rot, piece.col, piece.y + 1)) { piece.y++; acc = 0; return true; }
      land();
      return false;
    }
    function hardDrop() {
      if (over) return;
      var n = 0;
      while (valid(piece.type, piece.rot, piece.col, piece.y + 1)) { piece.y++; n++; }
      score += n * 2;
      land();
    }
    function doMeasure() {
      if (over) return;
      if (measured) { api.toast("Already measured", "bad", 800); return; }
      measured = true;
      piece.altRot = piece.rot; piece.altCol = piece.col;
      QG.sfx.measure();
      api.log("You <b>MEASURED</b> the piece - it is now definite at column " + (piece.col + 1) + ".");
      paintHud();
    }
    function doSplit() {
      if (over) return;
      measured = false;
      if (!makeAlt()) { api.toast("No valid partner state", "bad", 900); return; }
      QG.sfx.zap();
      api.log("You <b>SPLIT</b> the piece - it is superposed again with a partner shape.");
      paintHud();
    }

    function paintStack() {
      octx.setTransform(2, 0, 0, 2, 0, 0);
      octx.clearRect(0, 0, COLS * CS, ROWS * CS);
      octx.fillStyle = U.rgba(dark() ? PAL.paper : PAL.ink, 0.05);
      octx.fillRect(0, 0, COLS * CS, ROWS * CS);
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var t = board[r * COLS + c];
          if (!t) continue;
          octx.drawImage(solidTile[t], 0, 0, TILE, TILE, c * CS, r * CS, CS, CS);
        }
      }
      stackDirty = false;
    }

    var cv = api.canvas({ w: W, h: HGT });
    var c2 = cv.ctx;

    var pad = QG.dpad({ onPress: function (d) {
      if (d === "left") move(-1);
      else if (d === "right") move(1);
      else if (d === "down") { if (down()) QG.sfx.tick(); }
      else if (d === "up" || d === "center") rotate();
    }, center: "\u21BB" });
    var detach = QG.steer(cv.el, function (d) {
      if (d === "left") move(-1);
      else if (d === "right") move(1);
      else if (d === "down") { if (down()) QG.sfx.tick(); }
      else if (d === "up") rotate();
    });
    api.onCleanup(detach);

    var btnRow = h("div.actions.mt12");
    var bDrop = api.btn("HARD DROP", "orange", hardDrop);
    var bMeas = api.btn("MEASURE", "cyan", doMeasure);
    var bSplit = api.btn("SPLIT", "purple", doSplit);
    btnRow.appendChild(bDrop); btnRow.appendChild(bMeas); btnRow.appendChild(bSplit);

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM TETRIS"),
      h("span.badge", "12 lines to win")
    ));
    root.appendChild(h("div.mt12", cv.el));
    root.appendChild(h("div.mt12", pad));
    root.appendChild(btnRow);
    root.appendChild(h("div.small.muted.tc.mt8", "Each piece is superposed across two rotations or two columns. MEASURE before it lands or it collapses at random."));
    var hud = h("div.hud.mt12");
    root.appendChild(hud);

    function paintHud() {
      QG.clear(hud);
      [["Score", score], ["Lines", lines + "/12"], ["Speed", interval + "ms"],
       ["State", measured ? "MEASURED" : "SUPERPOSED"]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "Score", value: score, color: "cyan" },
        { name: "Lines", value: lines + "/12", color: "lime" },
        { name: "State", value: measured ? "measured" : "superposed", color: measured ? "yellow" : "purple" }
      ]);
    }

    function drawPiece(type, rot, col, y, ghost) {
      var c = cellsAt(type, rot, col, y);
      var img = ghost ? ghostTile[type] : solidTile[type];
      for (var i = 0; i < c.length; i++) {
        var x = c[i][0], yy = c[i][1];
        if (yy < 0 || yy >= ROWS) continue;
        c2.drawImage(img, 0, 0, TILE, TILE, PX + x * CS, PY + yy * CS, CS, CS);
      }
    }

    function drawNext() {
      var sx = PX + COLS * CS + 26, sy = 74;
      QG.draw.text(c2, "NEXT", sx, 46, { size: 13, color: fgCol(), align: "left", font: QG.FONT.display });
      if (!nextType) return;
      var pts = ROTS[nextType][0], i;
      for (i = 0; i < pts.length; i++) {
        c2.drawImage(solidTile[nextType], 0, 0, TILE, TILE, sx + pts[i][0] * 17, sy + pts[i][1] * 17, 15, 15);
      }
    }

    function draw() {
      var ink = fgCol();
      c2.clearRect(0, 0, W, HGT);
      QG.draw.rect(c2, 3, 3, W - 6, HGT - 6, { fill: U.rgba(dark() ? PAL.purple : PAL.cyan, 0.05), color: ink, width: 3, wobble: 1.2, double: false });

      if (stackDirty) paintStack();
      c2.drawImage(off, 0, 0, off.width, off.height, PX, PY, COLS * CS, ROWS * CS);
      QG.draw.rect(c2, PX, PY, COLS * CS, ROWS * CS, { color: ink, width: 3, wobble: 1.1, double: false, stroke: true, fill: null });

      if (!over && piece) {
        drawPiece(piece.type, piece.altRot, piece.altCol, piece.y, true);
        drawPiece(piece.type, piece.rot, piece.col, piece.y, false);
      }
      drawNext();

      var sx = PX + COLS * CS + 26;
      QG.draw.text(c2, "SCORE", sx, 176, { size: 12, color: ink, align: "left", font: QG.FONT.display });
      QG.draw.text(c2, String(score), sx, 200, { size: 24, color: PAL.cyan, align: "left", font: QG.FONT.display });
      QG.draw.text(c2, "LINES", sx, 244, { size: 12, color: ink, align: "left", font: QG.FONT.display });
      QG.draw.text(c2, lines + " / 12", sx, 268, { size: 20, color: PAL.lime, align: "left", font: QG.FONT.display });
      QG.draw.text(c2, "SPEED", sx, 312, { size: 12, color: ink, align: "left", font: QG.FONT.display });
      QG.draw.text(c2, interval + " ms", sx, 336, { size: 16, color: PAL.orange, align: "left", font: QG.FONT.display });
      QG.draw.text(c2, measured ? "STATE: MEASURED" : "STATE: SUPERPOSED", sx, 384, { size: 12, color: measured ? PAL.yellow : PAL.purple, align: "left", font: QG.FONT.display });
    }

    reset();
    api.loop(function (dt) {
      if (!over) {
        acc += dt;
        if (acc >= interval) { acc = 0; if (valid(piece.type, piece.rot, piece.col, piece.y + 1)) piece.y++; else land(); }
      }
      draw();
    });
    api.setStatus("Arrow pad moves the piece. MEASURE to collapse it before it lands. 12 lines to win.");
  });
})();
