/* ============================================================
   QUANTUM ARCADE — games/pack6.js
   26 Quantum Go  27 Quantum Connect Four  28 Quantum Monopoly
   29 Quantum Car Racing  30 Quantum Football
   ============================================================ */
(function () {
  "use strict";
  var QG = window.QG, h = QG.h, PAL = QG.PAL, U = QG.U;

  /* ==========================================================
     26. QUANTUM GO  (9x9, superposed stones)
     ========================================================== */
  QG.register("quantum-go", function (root, api) {
    var N = 9, TOTAL = N * N;
    var stones, at, idc, turn, over, splitArm, pending, captures, passes, busy;

    function reset() {
      stones = []; idc = 0; turn = "you"; over = false;
      splitArm = false; pending = -1; captures = { you: 0, ai: 0 }; passes = 0; busy = false;
      rebuild();
    }
    function rebuild() {
      at = new Array(TOTAL).fill(null);
      stones.forEach(function (s) { s.pts.forEach(function (p) { at[p] = s; }); });
    }
    function rc(i) { return [Math.floor(i / N), i % N]; }
    function nbrs(i) {
      var r = Math.floor(i / N), c = i % N, out = [];
      if (r > 0) out.push(i - N);
      if (r < N - 1) out.push(i + N);
      if (c > 0) out.push(i - 1);
      if (c < N - 1) out.push(i + 1);
      return out;
    }
    function groupAt(start) {
      var st0 = at[start];
      if (!st0) return null;
      var color = st0.color, seen = {}, stack = [start], pts = {}, sids = {};
      while (stack.length) {
        var i = stack.pop();
        if (seen[i]) continue;
        seen[i] = 1;
        var st = at[i];
        if (!st || st.color !== color) continue;
        pts[i] = 1; sids[st.id] = st;
        var nb = nbrs(i);
        for (var k = 0; k < nb.length; k++) if (!seen[nb[k]]) stack.push(nb[k]);
      }
      return { pts: pts, stones: sids };
    }
    function libs(ptsSet) {
      var lib = {}, keys = Object.keys(ptsSet);
      for (var k = 0; k < keys.length; k++) {
        var nb = nbrs(+keys[k]);
        for (var j = 0; j < nb.length; j++) if (!at[nb[j]]) lib[nb[j]] = 1;
      }
      return Object.keys(lib).length;
    }
    function drop(sids) {
      var ids = Object.keys(sids).map(Number);
      var lost = stones.filter(function (s) { return ids.indexOf(s.id) >= 0; });
      stones = stones.filter(function (s) { return ids.indexOf(s.id) < 0; });
      rebuild();
      return lost;
    }
    function resolve() {
      var removed = 0, guard = 0;
      while (guard++ < 90) {
        var checked = {}, hit = null;
        for (var i = 0; i < TOTAL; i++) {
          var st = at[i];
          if (!st || checked[st.id]) continue;
          var g = groupAt(i);
          for (var k in g.stones) checked[k] = 1;
          if (libs(g.pts) === 0) { removed += Object.keys(g.stones).length; hit = g; break; }
        }
        if (!hit) break;
        drop(hit.stones);
      }
      return removed;
    }
    function place(color, pts) {
      stones.push({ id: idc++, color: color, pts: pts.slice() });
      rebuild();
      resolve();
    }
    function superposed() { return stones.filter(function (s) { return s.pts.length > 1; }); }
    function doMeasure() {
      var sups = superposed();
      sups.forEach(function (s) {
        var w = [1, 1];
        if (s.pts.length === 2 && Math.random() < 0.5) s.pts = [s.pts[0]];
        else if (s.pts.length === 2) s.pts = [s.pts[1]];
        else s.pts = [s.pts[0]];
        void w;
      });
      rebuild();
      resolve();
      return sups.length;
    }
    function countStones(color) { return stones.filter(function (s) { return s.color === color; }).length; }

    function territory() {
      var visited = {}, out = { you: 0, ai: 0 };
      for (var i = 0; i < TOTAL; i++) {
        if (at[i] || visited[i]) continue;
        var region = [], stack = [i], borders = {};
        while (stack.length) {
          var j = stack.pop();
          if (visited[j]) continue;
          visited[j] = 1;
          if (at[j]) { borders[at[j].color] = 1; continue; }
          region.push(j);
          var nb = nbrs(j);
          for (var k = 0; k < nb.length; k++) if (!visited[nb[k]]) stack.push(nb[k]);
        }
        var keys = Object.keys(borders);
        if (keys.length === 1 && region.length) out[keys[0]] += region.length;
      }
      return out;
    }

    /* ---------- UI ---------- */
    var grid = api.grid(N, N, onCell);
    var btnRow = h("div.actions.mt12");
    var bSplit = api.btn("Split", "purple", function () { splitArm = !splitArm; pending = -1; paint(); });
    var bMeasure = api.btn("Measure", "cyan", function () {
      if (turn !== "you" || over || busy) return;
      var n = doMeasure();
      api.log("You <b>measured</b>: " + n + " superposed stone" + (n === 1 ? "" : "s") + " collapsed.");
      QG.sfx.measure();
      endTurn();
    });
    var bPass = api.btn("Pass", "ghost", function () {
      if (turn !== "you" || over || busy) return;
      passes++;
      api.log("You passed.");
      if (passes >= 2) { finishGame(); return; }
      endTurn();
    });
    btnRow.appendChild(bSplit); btnRow.appendChild(bMeasure); btnRow.appendChild(bPass);
    var info = h("div.mt12");

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM GO"),
      h("span.badge", "You are \u25CF lime")
    ));
    root.appendChild(h("div.small.muted.tc.mt8", "Tap an empty point to place. SPLIT then tap two points for a superposed stone."));
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(btnRow);
    root.appendChild(info);

    function paint() {
      for (var i = 0; i < TOTAL; i++) {
        var r = Math.floor(i / N), c = i % N, st = at[i], cls = "cell", html = "";
        if (st) {
          var col = st.color === "you" ? PAL.lime : PAL.magenta;
          if (st.pts.length === 2) {
            cls += " is-super";
            html = "<span style='display:block;width:62%;aspect-ratio:1;border-radius:50%;background:" + col +
              ";border:2px solid var(--ink);margin:auto;opacity:.75'></span>" +
              "<span class='cell__ghost' style='width:44%;aspect-ratio:1;border-radius:50%;background:" + col +
              ";border:2px dashed var(--ink);opacity:.7'></span>";
          } else {
            html = "<span style='display:block;width:74%;aspect-ratio:1;border-radius:50%;background:" + col +
              ";border:2px solid var(--ink);margin:auto'></span>";
          }
        }
        if (i === pending) cls += " is-sel";
        if (splitArm && !st && i !== pending) cls += " is-target";
        grid.set(r, c, html, cls.replace(/^cell\s?/, ""));
      }
      bSplit.innerHTML = splitArm ? (pending >= 0 ? "\u2713 pick 2nd point" : "\u2713 Split armed") : "Split";
      QG.clear(info);
      var ter = territory();
      [["Your stones", countStones("you")], ["AI stones", countStones("ai")],
       ["Your captures", captures.you], ["AI captures", captures.ai],
       ["Your territory", ter.you], ["AI territory", ter.ai]].forEach(function (kv) {
        info.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      info.className = "hud mt12";
      api.setScores([
        { name: "You", value: ter.you + captures.you, color: "lime", turn: turn === "you" },
        { name: "AI", value: ter.ai + captures.ai, color: "magenta", turn: turn === "ai" },
        { name: "Superposed", value: superposed().length, color: "purple" }
      ]);
    }

    function onCell(r, c) {
      if (over || busy || turn !== "you") return;
      var i = r * N + c;
      if (at[i]) { api.toast("That point is taken", "bad", 900); return; }
      if (splitArm) {
        if (pending < 0) { pending = i; QG.sfx.tap(); paint(); return; }
        if (i === pending) { pending = -1; paint(); return; }
        place("you", [pending, i]);
        api.log("You placed a <b>superposed</b> stone on two points.");
        QG.sfx.zap();
        pending = -1; splitArm = false;
      } else {
        place("you", [i]);
        api.log("You played " + String.fromCharCode(65 + c) + (r + 1) + ".");
        QG.sfx.click();
      }
      passes = 0;
      endTurn();
    }

    function endTurn() {
      paint();
      if (checkBoard()) return;
      turn = "ai"; busy = true;
      api.setStatus("AI is thinking...");
      api.after(460, aiTurn);
    }

    function checkBoard() {
      if (!countStones("you") || !countStones("ai")) { finishGame(); return true; }
      return false;
    }

    function aiTurn() {
      if (over) { busy = false; return; }
      if (superposed().some(function (s) { return s.color === "ai"; }) && Math.random() < 0.25) {
        var n = doMeasure();
        api.log("AI <b>measured</b>: " + n + " collapsed.");
        QG.sfx.measure();
      } else {
        var empties = [], near = [];
        for (var i = 0; i < TOTAL; i++) {
          if (at[i]) continue;
          empties.push(i);
          var nb = nbrs(i);
          for (var k = 0; k < nb.length; k++) {
            var st = at[nb[k]];
            if (st && st.color === "ai") { near.push(i); break; }
          }
        }
        if (!empties.length) { api.log("AI passed."); passes++; if (passes >= 2) finishGame(); else endTurn(); return; }
        var pick = (near.length && Math.random() < 0.8) ? U.pick(near) : U.pick(empties);
        var pair = empties.filter(function (e) { return e !== pick; });
        if (pair.length && Math.random() < 0.18) {
          place("ai", [pick, U.pick(pair)]);
          api.log("AI placed a <b>superposed</b> stone.");
        } else {
          place("ai", [pick]);
          api.log("AI played.");
        }
        QG.sfx.click();
      }
      turn = "you"; busy = false; passes = 0;
      paint();
      if (checkBoard()) return;
      api.setStatus("Your move.");
    }

    function finishGame() {
      over = true;
      var ter = territory();
      var you = ter.you + captures.you + countStones("you");
      var ai = ter.ai + captures.ai + countStones("ai");
      api.setStatus("Final: you " + you + " / AI " + ai);
      api.setBest(you);
      if (you > ai) api.win("You win the board!", "Territory + captures: " + you + " to " + ai + ".");
      else if (you < ai) api.lose("The AI takes the board.", "Territory + captures: " + ai + " to " + you + ".");
      else api.overlay({ title: "Quantum draw", sub: "Perfectly balanced interference.", actions: [{ label: "Play again", kind: "lime", onClick: api.restart }] });
    }

    reset(); paint();
    api.setStatus("Tap an empty point to place a stone.");
  });

  /* ==========================================================
     27. QUANTUM CONNECT FOUR
     ========================================================== */
  QG.register("quantum-connect-four", function (root, api) {
    var COLS = 7, ROWS = 6;
    var discs, idc, turn, over, busy, splitArm, pendingCol;

    function reset() {
      discs = []; idc = 0; turn = "you"; over = false; busy = false;
      splitArm = false; pendingCol = -1;
    }
    function build() {
      var b = [], heights = new Array(COLS).fill(0), r, c;
      for (r = 0; r < ROWS; r++) { b[r] = []; for (c = 0; c < COLS; c++) b[r][c] = null; }
      discs.forEach(function (d) {
        d.cols.forEach(function (col) {
          if (heights[col] >= ROWS) return;
          var row = ROWS - 1 - heights[col];
          heights[col]++;
          b[row][col] = d;
        });
      });
      return b;
    }
    function winner(b) {
      var dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        for (var k = 0; k < 4; k++) {
          var dr = dirs[k][0], dc = dirs[k][1];
          var seen = {}, pl = null, ok = true, n = 0;
          for (var s = 0; s < 4; s++) {
            var rr = r + dr * s, cc = c + dc * s;
            if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) { ok = false; break; }
            var d = b[rr][cc];
            if (!d) { ok = false; break; }
            if (pl === null) pl = d.player; else if (d.player !== pl) { ok = false; break; }
            if (seen[d.id]) { ok = false; break; }
            seen[d.id] = 1; n++;
          }
          if (ok && n === 4) return pl;
        }
      }
      return null;
    }
    function colFull(col) {
      var n = 0;
      discs.forEach(function (d) { if (d.cols.indexOf(col) >= 0) n++; });
      return n >= ROWS;
    }
    function superposed() { return discs.filter(function (d) { return d.cols.length > 1; }); }

    function doMeasure() {
      var sups = superposed();
      sups.forEach(function (d) {
        d.cols = [Math.random() < 0.5 ? d.cols[0] : d.cols[1]];
      });
      return sups.length;
    }

    var grid = api.grid(COLS, ROWS, onCell);
    var btnRow = h("div.actions.mt12");
    var bSplit = api.btn("Split", "purple", function () { splitArm = !splitArm; pendingCol = -1; paint(); });
    var bMeasure = api.btn("Measure", "cyan", function () {
      if (turn !== "you" || over || busy) return;
      var n = doMeasure();
      if (!n) { api.toast("Nothing is superposed", "bad", 1000); return; }
      api.log("You <b>measured</b> " + n + " disc" + (n === 1 ? "" : "s") + " into place.");
      QG.sfx.measure();
      afterAction();
    });
    btnRow.appendChild(bSplit); btnRow.appendChild(bMeasure);
    var info = h("div.mt12");

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM CONNECT FOUR"),
      h("span.badge", "You are \u25CF cyan")
    ));
    root.appendChild(h("div.small.muted.tc.mt8", "Tap a column to drop. SPLIT then tap two columns to superpose a disc across both."));
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(btnRow);
    root.appendChild(info);

    function paint() {
      var b = build();
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        var d = b[r][c], cls = "cell cell--dark", html = "";
        if (d) {
          var col = d.player === "you" ? PAL.cyan : PAL.magenta;
          if (d.cols.length > 1) {
            cls += " is-super";
            html = "<span style='display:block;width:66%;aspect-ratio:1;border-radius:50%;background:" + col +
              ";border:2px solid var(--ink);margin:auto;opacity:.8'></span>" +
              "<span class='cell__ghost' style='width:46%;aspect-ratio:1;border-radius:50%;background:" + col +
              ";border:2px dashed var(--ink);opacity:.65'></span>";
          } else {
            html = "<span style='display:block;width:78%;aspect-ratio:1;border-radius:50%;background:" + col +
              ";border:2px solid var(--ink);margin:auto'></span>";
          }
        }
        if (c === pendingCol) cls += " is-sel";
        else if (splitArm && !colFull(c)) cls += " is-hint";
        grid.set(r, c, html, cls.replace(/^cell\s?/, ""));
      }
      bSplit.innerHTML = splitArm ? (pendingCol >= 0 ? "\u2713 pick 2nd column" : "\u2713 Split armed") : "Split";
      QG.clear(info);
      [["Superposed", superposed().length], ["Your discs", discs.filter(function (d) { return d.player === "you"; }).length],
       ["AI discs", discs.filter(function (d) { return d.player === "ai"; }).length]].forEach(function (kv) {
        info.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      info.className = "hud mt12";
      api.setScores([
        { name: "You", value: discs.filter(function (d) { return d.player === "you"; }).length, color: "cyan", turn: turn === "you" },
        { name: "AI", value: discs.filter(function (d) { return d.player === "ai"; }).length, color: "magenta", turn: turn === "ai" },
        { name: "Superposed", value: superposed().length, color: "purple" }
      ]);
    }

    function onCell(r, c) {
      if (over || busy || turn !== "you") return;
      void r;
      if (colFull(c)) { api.toast("That column is full", "bad", 900); return; }
      if (splitArm) {
        if (pendingCol < 0) { pendingCol = c; QG.sfx.tap(); paint(); return; }
        if (c === pendingCol) { pendingCol = -1; paint(); return; }
        discs.push({ id: idc++, player: "you", cols: [pendingCol, c] });
        api.log("You dropped a <b>superposed</b> disc across two columns.");
        QG.sfx.zap();
        pendingCol = -1; splitArm = false;
      } else {
        discs.push({ id: idc++, player: "you", cols: [c] });
        api.log("You dropped in column " + (c + 1) + ".");
        QG.sfx.click();
      }
      afterAction();
    }

    function afterAction() {
      paint();
      var w = winner(build());
      if (w) { finish(w); return; }
      if (discs.length >= COLS * ROWS) { finish(null); return; }
      turn = "ai"; busy = true;
      api.setStatus("AI is thinking...");
      api.after(420, aiTurn);
    }

    function finish(w) {
      over = true;
      var b = build();
      if (w === "you") { api.setBest("win"); api.win("Connect four!", "Four in a row - the collapse went your way."); return; }
      if (w === "ai") { api.lose("The AI connected four.", "Try splitting earlier to block two lanes at once."); return; }
      var you = 0, ai = 0;
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        if (!b[r][c]) continue;
        if (b[r][c].player === "you") you++; else ai++;
      }
      if (you > ai) api.win("Board full - you win on count!", you + " discs to " + ai + ".");
      else if (ai > you) api.lose("Board full - AI wins on count.", ai + " discs to " + you + ".");
      else api.overlay({ title: "Quantum draw", sub: "Dead even.", actions: [{ label: "Play again", kind: "lime", onClick: api.restart }] });
    }

    function tryDrop(player, col) {
      var d = { id: -1, player: player, cols: [col] };
      discs.push(d);
      var b = build();
      var w = winner(b);
      discs.pop();
      return w;
    }

    function aiTurn() {
      if (over) { busy = false; return; }
      var free = [];
      for (var c = 0; c < COLS; c++) if (!colFull(c)) free.push(c);
      if (!free.length) { busy = false; finish(null); return; }

      if (superposed().some(function (d) { return d.player === "ai"; }) && Math.random() < 0.22) {
        var n = doMeasure();
        api.log("AI <b>measured</b> " + n + " disc" + (n === 1 ? "" : "s") + ".");
        QG.sfx.measure();
        busy = false; turn = "you"; paint();
        var w0 = winner(build());
        if (w0) finish(w0); else api.setStatus("Your move.");
        return;
      }

      var play = -1, i;
      for (i = 0; i < free.length; i++) if (tryDrop("ai", free[i]) === "ai") { play = free[i]; break; }
      if (play < 0) for (i = 0; i < free.length; i++) if (tryDrop("you", free[i]) === "you") { play = free[i]; break; }
      if (play < 0) {
        var scored = free.slice().sort(function (a, b2) { return Math.abs(3 - a) - Math.abs(3 - b2); });
        play = scored[0];
      }
      if (Math.random() < 0.16 && free.length > 1) {
        var other = free.filter(function (x) { return x !== play; })[0];
        if (other !== undefined) {
          discs.push({ id: idc++, player: "ai", cols: [play, other] });
          api.log("AI dropped a <b>superposed</b> disc.");
          QG.sfx.zap();
        }
      } else {
        discs.push({ id: idc++, player: "ai", cols: [play] });
        api.log("AI dropped in column " + (play + 1) + ".");
        QG.sfx.click();
      }
      busy = false; turn = "you";
      paint();
      var w = winner(build());
      if (w) { finish(w); return; }
      if (discs.length >= COLS * ROWS) { finish(null); return; }
      api.setStatus("Your move. Tap a column.");
    }

    reset(); paint();
    api.setStatus("Tap a column to drop a disc.");
  });

  /* ==========================================================
     28. QUANTUM MONOPOLY  (7x7 ring = 24 squares)
     ========================================================== */
  QG.register("quantum-monopoly", function (root, api) {
    var SQ = [
      { t: "go", n: "GO" },
      { t: "p", n: "Marine Dr", g: "A", price: 60, rent: 6 },
      { t: "p", n: "Chowpatty", g: "A", price: 60, rent: 6 },
      { t: "tax", n: "Income Tax", amt: 60 },
      { t: "p", n: "Connaught Pl", g: "B", price: 100, rent: 10 },
      { t: "p", n: "Karol Bagh", g: "B", price: 100, rent: 10 },
      { t: "chance", n: "Chance" },
      { t: "p", n: "Brigade Rd", g: "C", price: 140, rent: 14 },
      { t: "p", n: "MG Road", g: "C", price: 140, rent: 14 },
      { t: "jail", n: "Jail" },
      { t: "p", n: "Park Street", g: "D", price: 180, rent: 18 },
      { t: "p", n: "Salt Lake", g: "D", price: 180, rent: 18 },
      { t: "free", n: "Free Parking" },
      { t: "p", n: "Anna Salai", g: "E", price: 220, rent: 22 },
      { t: "p", n: "T Nagar", g: "E", price: 220, rent: 22 },
      { t: "tax", n: "Luxury Tax", amt: 120 },
      { t: "p", n: "Banjara Hl", g: "F", price: 260, rent: 26 },
      { t: "p", n: "Charminar", g: "F", price: 260, rent: 26 },
      { t: "chance", n: "Chance" },
      { t: "p", n: "Dal Lake", g: "G", price: 300, rent: 30 },
      { t: "p", n: "Leh Bazaar", g: "G", price: 300, rent: 30 },
      { t: "p", n: "Gateway", g: "H", price: 350, rent: 35 },
      { t: "p", n: "Colaba", g: "H", price: 350, rent: 35 },
      { t: "bonus", n: "Bonus +150" }
    ];
    var N = SQ.length;
    var GROUP_COLOR = { A: "cyan", B: "lime", C: "yellow", D: "orange", E: "pink", F: "purple", G: "blue", H: "green" };
    var FACES = [1, 2, 3, 4, 5, 6];

    var cash, owner, pos, cloud, weights, bias, turn, round, over, busy, lastRoll, log;

    function reset() {
      cash = { you: 800, ai: 800 };
      owner = new Array(N).fill(null);
      pos = { you: 0, ai: 0 };
      cloud = { you: [], ai: [] };
      weights = [1, 1, 1, 1, 1, 1];
      bias = 4; turn = "you"; round = 1; over = false; busy = false; lastRoll = 0;
      log = [];
    }

    function posOf(i) {
      if (i <= 6) return [0, i];
      if (i <= 12) return [i - 6, 6];
      if (i <= 18) return [6, 6 - (i - 12)];
      return [6 - (i - 18), 0];
    }

    var grid = api.grid(7, 7, function (r, c) {
      var idx = indexOf(r, c);
      if (idx < 0) return;
      onSquare(idx);
    });
    for (var rr = 1; rr <= 5; rr++) for (var cc = 1; cc <= 5; cc++) {
      grid.at(rr, cc).style.visibility = "hidden";
    }
    function indexOf(r, c) {
      if (r === 0) return c;
      if (c === 6) return 6 + r;
      if (r === 6) return 12 + (6 - c);
      if (c === 0) return 18 + (6 - r);
      return -1;
    }

    var diceRow = h("div.row.gap8.mt12", { style: "justify-content:center" });
    var faceBtns = [];
    FACES.forEach(function (f, i) {
      var b = api.btn(String(f), "ghost", function () {
        if (turn !== "you" || over || busy) return;
        if (bias <= 0) { api.toast("No bias charges left", "bad", 1000); return; }
        bias--; weights[i] += 1.4;
        api.log("You biased the die toward <b>" + f + "</b>.");
        QG.sfx.gate(); paint();
      });
      faceBtns.push(b); diceRow.appendChild(b);
    });

    var btnRow = h("div.actions.mt12");
    var bRoll = api.btn("Roll", "lime", function () { if (turn === "you" && !over && !busy) roll("you"); });
    var bMeasure = api.btn("Measure", "cyan", function () {
      if (turn !== "you" || over || busy) return;
      if (!cloud.you.length) { api.toast("Nothing to measure - roll first", "bad", 1100); return; }
      collapse("you");
    });
    var bBuy = api.btn("Buy", "orange", function () {
      if (turn !== "you" || over || busy) return;
      var i = pos.you;
      var sq = SQ[i];
      if (sq.t !== "p" || owner[i]) { api.toast("Nothing to buy here", "bad", 1000); return; }
      if (cash.you < sq.price) { api.toast("Not enough cash", "bad", 1000); return; }
      cash.you -= sq.price; owner[i] = "you";
      api.log("You bought <b>" + sq.n + "</b> for " + sq.price + ".");
      QG.sfx.good(); paint();
    });
    btnRow.appendChild(bRoll); btnRow.appendChild(bMeasure); btnRow.appendChild(bBuy);

    var probBox = h("div.mt12");
    var info = h("div.mt12");

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM MONOPOLY"),
      h("span.badge", "You are the lime pin")
    ));
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(h("div.small.muted.tc.mt8", "Tap a face to bias the die, ROLL, then MEASURE to commit your position."));
    root.appendChild(diceRow);
    root.appendChild(probBox);
    root.appendChild(btnRow);
    root.appendChild(info);

    function paint() {
      var i, r, c, cell;
      for (i = 0; i < N; i++) {
        var p = posOf(i);
        var sq = SQ[i], o = owner[i];
        var cls = "cell";
        var bg = sq.t === "p" ? (PAL[GROUP_COLOR[sq.g]] || PAL.cyan)
          : sq.t === "go" ? PAL.lime : sq.t === "jail" ? PAL.red
            : sq.t === "chance" ? PAL.purple : sq.t === "tax" ? PAL.orange
              : sq.t === "bonus" ? PAL.green : PAL.paper2;
        if (o === "you") bg = "color-mix(in srgb, " + bg + " 45%, var(--paper-2))";
        else if (o === "ai") bg = "color-mix(in srgb, " + bg + " 45%, var(--ink))";
        var html = "<span style='position:absolute;inset:0;display:grid;place-items:center;font-size:.5em;font-weight:700;padding:2px;text-align:center;line-height:1.05'>" +
          sq.n + "</span>";
        var pins = "";
        if (cloud.you.indexOf(i) >= 0) pins += "<span class='cell__lab' style='color:" + PAL.lime + ";bottom:1px;right:2px'>\u25CF</span>";
        if (cloud.ai.indexOf(i) >= 0) pins += "<span class='cell__lab' style='color:" + PAL.magenta + ";bottom:1px;left:2px'>\u25CF</span>";
        if (pos.you === i && !cloud.you.length) pins += "<span class='cell__lab' style='color:" + PAL.lime + ";bottom:1px;right:2px'>\u25CF</span>";
        if (pos.ai === i && !cloud.ai.length) pins += "<span class='cell__lab' style='color:" + PAL.magenta + ";bottom:1px;left:2px'>\u25CF</span>";
        if (o) pins += "<span class='cell__lab' style='top:1px;left:2px;font-size:.45em'>" + (o === "you" ? "Y" : "A") + "</span>";
        cell = grid.at(p[0], p[1]);
        cell.className = "cell" + (cloud.you.indexOf(i) >= 0 || cloud.ai.indexOf(i) >= 0 ? " is-super" : "");
        cell.innerHTML = html + pins;
        cell.style.background = bg;
      }
      var total = 0;
      weights.forEach(function (w) { total += w; });
      QG.clear(probBox);
      var bar = h("div.qmeter__row");
      bar.appendChild(h("span.qmeter__lab", "DIE"));
      var track = h("div.qmeter__bar", { style: "display:flex" });
      weights.forEach(function (w, k) {
        track.appendChild(h("div", { style: "flex:" + w + ";background:" + (k % 2 ? PAL.cyan : PAL.purple) + ";height:100%" }));
      });
      bar.appendChild(track);
      bar.appendChild(h("span.qmeter__val", FACES.map(function (f, k) { return f + ":" + Math.round(weights[k] / total * 100) + "%"; }).join(" ")));
      probBox.appendChild(h("div.qmeter", bar));
      probBox.appendChild(h("div.small.muted.tc.mt8", "Bias charges: " + bias + " \u00B7 click a number above to spend one"));

      QG.clear(info);
      [["Round", round + "/20"], ["Your cash", cash.you], ["AI cash", cash.ai],
       ["Your properties", owner.filter(function (o) { return o === "you"; }).length],
       ["AI properties", owner.filter(function (o) { return o === "ai"; }).length]].forEach(function (kv) {
        info.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      info.className = "hud mt12";
      api.setScores([
        { name: "You", value: "\u20B9" + cash.you, color: "lime", turn: turn === "you" },
        { name: "AI", value: "\u20B9" + cash.ai, color: "magenta", turn: turn === "ai" }
      ]);
    }

    function roll(who) {
      if (who === "you" && cloud.you.length) { api.toast("MEASURE your position first", "bad", 1300); return; }
      busy = true;
      var face = QG.sampleDist(QG.dist(weights)) + 1;
      lastRoll = face;
      api.log((who === "you" ? "You" : "AI") + " rolled <b>" + face + "</b>.");
      QG.sfx.pop();
      var from = pos[who];
      var c2 = [];
      for (var k = 0; k < 3; k++) c2.push((from + face + k) % N);
      cloud[who] = c2;
      paint();
      if (who === "you") {
        api.setStatus("Rolled " + face + ". You are superposed across 3 squares - MEASURE to commit.");
        busy = false;
        api.after(7000, function () {
          if (over || turn !== "you" || !cloud.you.length) return;
          api.toast("Your position collapsed on its own!", "bad", 1400);
          collapse("you");
        });
      } else {
        api.after(520, function () { collapse("ai"); });
      }
    }

    function collapse(who) {
      var cl = cloud[who];
      if (!cl.length) return;
      var w = [1, 0.5, 0.25];
      var idx = QG.sampleDist(QG.dist(w));
      var landed = cl[idx];
      cloud[who] = [];
      pos[who] = landed;
      QG.sfx.measure();
      api.log((who === "you" ? "You" : "AI") + " collapsed onto <b>" + SQ[landed].n + "</b>.");
      resolve(who, landed);
    }

    function resolve(who, i) {
      var sq = SQ[i], other = who === "you" ? "ai" : "you";
      if (sq.t === "go") { cash[who] += 100; api.log("Passed GO: +100."); }
      else if (sq.t === "bonus") { cash[who] += 150; api.log("Bonus square: +150."); }
      else if (sq.t === "tax") { cash[who] -= sq.amt; api.log("Tax: -" + sq.amt + "."); }
      else if (sq.t === "jail") { api.log("Just visiting the jail."); }
      else if (sq.t === "chance") {
        var roll2 = U.int(3);
        if (roll2 === 0) { cash[who] += 120; api.log("Chance: a quantum dividend, +120."); }
        else if (roll2 === 1) { cash[who] -= 90; api.log("Chance: measurement tax, -90."); }
        else {
          var free = [];
          for (var k = 0; k < N; k++) if (SQ[k].t === "p" && !owner[k]) free.push(k);
          if (free.length) { var g = U.pick(free); owner[g] = who; api.log("Chance: you inherit <b>" + SQ[g].n + "</b>!"); }
          else api.log("Chance: nothing happened. Suspicious.");
        }
      } else if (sq.t === "free") { api.log("Free parking. Breathe."); }
      else if (sq.t === "p") {
        if (!owner[i]) { api.log(sq.n + " is unowned - press BUY (" + sq.price + ")."); }
        else if (owner[i] === who) { api.log("You own " + sq.n + ". Nice."); }
        else {
          var rent = sq.rent;
          var partners = 0;
          for (var m = 0; m < N; m++) if (SQ[m].t === "p" && SQ[m].g === sq.g && owner[m] === owner[i]) partners++;
          if (partners === 2) rent *= 2;
          cash[who] -= rent;
          api.log("<b>Rent</b> on " + sq.n + ": -" + rent + (partners === 2 ? " (colour set, doubled)" : "") + ".");
        }
      }
      paint();
      if (cash[who] <= 0) { over = true; finishGame(who); return; }
      if (who === "ai") {
        if (SQ[pos.ai].t === "p" && !owner[pos.ai] && cash.ai >= SQ[pos.ai].price) {
          cash.ai -= SQ[pos.ai].price; owner[pos.ai] = "ai";
          api.log("AI bought <b>" + SQ[pos.ai].n + "</b>.");
        }
        turn = "you"; busy = false; paint();
        api.setStatus("Your turn. Bias, ROLL, MEASURE.");
      } else {
        busy = false;
        api.setStatus("Your turn - or press BUY if you landed on a free property.");
      }
    }

    function endRound() {
      round++;
      weights = weights.map(function (w) { return 1 + (w - 1) * 0.6; });
      bias = Math.min(6, bias + 1);
      if (round > 20) { finishGame(null); return; }
      turn = "ai"; busy = true;
      api.setStatus("AI is playing...");
      api.after(560, function () {
        var need = 1;
        if (cash.ai < 200) need = 0;
        var idx = U.int(6);
        weights[idx] += need ? 1.2 : 0;
        roll("ai");
      });
    }

    function finishGame(loser) {
      over = true;
      if (loser === "you") { api.lose("Bankrupt.", "The AI cleaned you out."); return; }
      if (loser === "ai") { api.setBest(cash.you); api.win("Bankrupt the AI!", "You finished with \u20B9" + cash.you + "."); return; }
      api.setBest(cash.you);
      if (cash.you > cash.ai) api.win("You win on cash!", "\u20B9" + cash.you + " to \u20B9" + cash.ai + ".");
      else if (cash.you < cash.ai) api.lose("The AI ends richer.", "\u20B9" + cash.ai + " to \u20B9" + cash.you + ".");
      else api.overlay({ title: "Dead heat", sub: "Identical portfolios.", actions: [{ label: "Play again", kind: "lime", onClick: api.restart }] });
    }

    function onSquare(i) {
      if (over || busy || turn !== "you") return;
      var sq = SQ[i];
      api.toast(sq.n + (sq.t === "p" ? " \u00B7 \u20B9" + sq.price : ""), "quantum", 1200);
    }

    var origCollapse = collapse;
    collapse = function (who) {
      origCollapse(who);
      if (who === "you" && !over) {
        if (turn === "you") { turn = "ai"; api.after(700, endRound); }
      }
    };

    reset(); paint();
    api.setStatus("Bias the die if you like, then press ROLL.");
  });

  /* ==========================================================
     29. QUANTUM CAR RACING
     ========================================================== */
  QG.register("quantum-car-racing", function (root, api) {
    var W = 620, H = 430, LAPS = 3, LAP_LEN = 2600;
    var cv = api.canvas({ w: W, h: H });
    var ctx = cv.ctx;

    var x, ghost, speed, dist, aiDist, cones, grip, swapped, over, boost, keys, hudT;

    function reset() {
      x = W / 2; ghost = W / 2; speed = 3.6; dist = 0; aiDist = 0;
      cones = []; grip = 0; swapped = false; over = false; boost = 0; hudT = 0;
      keys = { left: false, right: false };
      for (var i = 0; i < 26; i++) {
        cones.push({ x: 120 + U.int(3) * 190 + U.int(50) - 25, y: -U.int(2200) - 60, hit: false });
      }
    }

    var hud = h("div.hud.mt12");
    var btnRow = h("div.actions.mt12");
    var bSwap = api.btn("Swap", "purple", function () {
      if (over) return;
      swapped = !swapped;
      var t = x; x = ghost; ghost = t;
      api.log("You <b>swapped</b> racing lines.");
      QG.sfx.teleport();
    });
    var bMeasure = api.btn("Measure", "cyan", function () {
      if (over) return;
      if (grip > 0) { api.toast("Already measured", "bad", 900); return; }
      grip = 4000; boost = 900;
      api.log("You <b>measured</b>: 4 seconds of grip and a boost.");
      QG.sfx.measure();
    });
    btnRow.appendChild(bSwap); btnRow.appendChild(bMeasure);
    var pad = QG.dpad({
      up: "\u25B2", down: "\u25BC", left: "\u25C0", right: "\u25B6",
      onPress: function (dir) {
        if (dir === "left") keys.left = true, setTimeout(function () { keys.left = false; }, 160);
        if (dir === "right") keys.right = true, setTimeout(function () { keys.right = false; }, 160);
        if (dir === "up") boost = Math.max(boost, 600);
        if (dir === "down") boost = 0;
      }
    });

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM CAR RACING"),
      h("span.badge", "You are the solid car")
    ));
    root.appendChild(h("div.mt12", cv.el));
    root.appendChild(h("div.mt12", pad));
    root.appendChild(btnRow);
    root.appendChild(hud);

    var detach = QG.steer(cv.el, function (dir) {
      if (dir === "left") keys.left = true, setTimeout(function () { keys.left = false; }, 160);
      if (dir === "right") keys.right = true, setTimeout(function () { keys.right = false; }, 160);
    });
    api.onCleanup(detach);

    var drag = false;
    cv.on("down", function (p) { drag = true; x = U.clamp(p.x, 90, W - 90); });
    cv.on("move", function (p) { if (drag) x = U.clamp(p.x, 90, W - 90); });
    cv.on("up", function () { drag = false; });

    function frame(dt) {
      if (over) return;
      var s = dt / 16.67;
      if (keys.left) x -= 5.2 * s;
      if (keys.right) x += 5.2 * s;
      x = U.clamp(x, 86, W - 86);
      ghost = U.clamp(W - x, 86, W - 86);
      if (grip > 0) grip = Math.max(0, grip - dt);
      if (boost > 0) boost = Math.max(0, boost - dt);

      var v = speed * s * (1 + (boost > 0 ? 0.55 : 0)) * (1 + (grip > 0 ? 0.12 : 0));
      dist += v;
      aiDist += speed * s * 0.93 * (1 + Math.sin(performance.now() / 900) * 0.05);

      for (var i = 0; i < cones.length; i++) {
        var c = cones[i];
        c.y += v;
        if (c.y > H + 40) { c.y -= 2400 + U.int(400); c.x = 120 + U.int(3) * 190 + U.int(50) - 25; c.hit = false; }
        if (!c.hit && c.y > H - 74 && c.y < H - 6 && Math.abs(c.x - x) < 26) {
          c.hit = true;
          if (grip > 0) { api.log("Grip absorbed a cone."); }
          else { dist -= 120; api.log("You clipped a cone. Ouch."); QG.sfx.zap(); }
        }
      }

      if (dist >= LAPS * LAP_LEN) { over = true; api.setBest("win"); api.win("Chequered flag!", "Three laps, and the other racing line never caught you."); return; }
      if (aiDist >= LAPS * LAP_LEN) { over = true; api.lose("The AI took the flag.", "Overtake with SWAP next time."); return; }
      draw();
      hudT += dt;
      if (hudT > 150) { hudT = 0; paintHud(); }
    }

    function laneEdge(px) { return 86 + (W - 172) * px; }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      QG.draw.rect(ctx, 78, 0, W - 156, H, { fill: U.rgba(PAL.ink, .08), stroke: PAL.ink, width: 4, radius: 10, wobble: 2, double: false });
      for (var k = 0; k < 3; k++) {
        var lx = laneEdge((k + 1) / 4);
        QG.draw.line(ctx, lx, 0, lx, H, { color: PAL.ink, width: 2.5, wobble: 1.2 });
      }
      var scroll = (dist * 0.6) % 60;
      for (var y = -60 + scroll; y < H; y += 60) {
        QG.draw.line(ctx, W / 2 - 60, y, W / 2 - 60, y + 26, { color: PAL.yellow, width: 4, wobble: 1 });
        QG.draw.line(ctx, W / 2 + 60, y, W / 2 + 60, y + 26, { color: PAL.yellow, width: 4, wobble: 1 });
      }
      cones.forEach(function (c) {
        if (c.y < -30 || c.y > H + 30) return;
        QG.draw.circle(ctx, c.x, c.y, 12, { fill: c.hit ? U.rgba(PAL.red, .3) : PAL.orange, color: PAL.ink, width: 3, double: false });
        QG.draw.circle(ctx, c.x, c.y, 5, { fill: PAL.yellow, color: PAL.ink, width: 2, double: false });
      });
      // ghost racing line
      QG.draw.rect(ctx, ghost - 20, H - 66, 40, 56, { fill: "transparent", color: PAL.purple, width: 3, radius: 7, wobble: 1.4, double: false });
      QG.draw.text(ctx, "GHOST", ghost, H - 12, { size: 9, color: PAL.purple, font: QG.FONT.display });
      // real car
      QG.draw.rect(ctx, x - 21, H - 70, 42, 60, { fill: PAL.cyan, color: PAL.ink, width: 4, radius: 8, wobble: 1.2 });
      QG.draw.rect(ctx, x - 13, H - 62, 26, 16, { fill: U.rgba(PAL.ink, .5), color: PAL.ink, width: 2, radius: 4, wobble: .8, double: false });
      if (grip > 0) QG.draw.dashedCircle(ctx, x, H - 40, 42, { color: PAL.lime, width: 3 });
      // progress
      QG.draw.text(ctx, "LAP " + Math.min(LAPS, Math.floor(dist / LAP_LEN) + 1) + " / " + LAPS, W / 2, 24, { size: 16, color: PAL.ink });
    }

    function paintHud() {
      QG.clear(hud);
      var youLap = Math.min(LAPS, Math.floor(dist / LAP_LEN) + 1);
      var aiLap = Math.min(LAPS, Math.floor(aiDist / LAP_LEN) + 1);
      [["Your lap", youLap + "/" + LAPS], ["AI lap", aiLap + "/" + LAPS],
       ["Your progress", Math.round(dist / (LAPS * LAP_LEN) * 100) + "%"],
       ["AI progress", Math.round(aiDist / (LAPS * LAP_LEN) * 100) + "%"],
       ["Grip", grip > 0 ? (grip / 1000).toFixed(1) + "s" : "-"],
       ["Line", swapped ? "SWAPPED" : "normal"]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "You", value: Math.round(dist / (LAPS * LAP_LEN) * 100) + "%", color: "cyan" },
        { name: "AI", value: Math.round(aiDist / (LAPS * LAP_LEN) * 100) + "%", color: "magenta" }
      ]);
    }

    reset();
    api.loop(frame);
    paintHud();
    api.setStatus("Steer with the pad, the arrows or by dragging. SWAP flips your racing line.");
  });

  /* ==========================================================
     30. QUANTUM FOOTBALL
     ========================================================== */
  QG.register("quantum-football", function (root, api) {
    var W = 620, H = 440;
    var cv = api.canvas({ w: W, h: H });
    var ctx = cv.ctx;

    var LANES = [150, 310, 470];
    var ball, defenders, keeperLane, score, aiScore, timeLeft, over, celebrate, hudT;

    function reset() {
      ball = { lane: 1, ghostLane: 1, y: H - 70, t: 0 };
      defenders = [{ lane: 0, y: 250 }, { lane: 1, y: 180 }, { lane: 2, y: 320 }];
      keeperLane = U.int(3);
      score = 0; aiScore = 0; timeLeft = 60000; over = false; celebrate = 0; hudT = 0;
    }

    var hud = h("div.hud.mt12");
    var btnRow = h("div.actions.mt12");
    var bMeasure = api.btn("Measure", "cyan", function () {
      if (over) return;
      if (ball.lane === ball.ghostLane) { api.toast("Already definite", "bad", 900); return; }
      ball.ghostLane = ball.lane;
      api.log("You <b>measured</b> the ball into lane " + (ball.lane + 1) + ".");
      QG.sfx.measure();
    });
    var bShoot = api.btn("Shoot", "magenta", function () { if (!over) shoot(); });
    btnRow.appendChild(bMeasure); btnRow.appendChild(bShoot);

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM FOOTBALL"),
      h("span.badge", "You attack upward")
    ));
    root.appendChild(h("div.mt12", cv.el));
    root.appendChild(btnRow);
    root.appendChild(hud);

    var dragLane = -1;
    function laneFromX(px) {
      var best = 0, bd = 1e9;
      for (var i = 0; i < 3; i++) { var d = Math.abs(LANES[i] - px); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    cv.on("down", function (p) {
      if (over) return;
      if (p.y < 80) { shoot(); return; }
      dragLane = laneFromX(p.x);
      ball.lane = dragLane;
      ball.ghostLane = 2 - dragLane;
      QG.sfx.tap();
    });
    cv.on("move", function (p) {
      if (over || dragLane < 0) return;
      var l = laneFromX(p.x);
      ball.lane = l; ball.ghostLane = 2 - l;
    });
    cv.on("up", function () { dragLane = -1; });

    var detach = QG.steer(cv.el, function (dir) {
      if (over) return;
      if (dir === "left") { ball.lane = Math.max(0, ball.lane - 1); ball.ghostLane = 2 - ball.lane; }
      if (dir === "right") { ball.lane = Math.min(2, ball.lane + 1); ball.ghostLane = 2 - ball.lane; }
      if (dir === "up") shoot();
    });
    api.onCleanup(detach);

    function shoot() {
      if (over) return;
      if (ball.y > 210) { api.toast("Too far out - dribble closer", "bad", 1200); return; }
      keeperLane = U.int(3);
      var realLane = Math.random() < 0.5 ? ball.lane : ball.ghostLane;
      var saved = realLane === keeperLane;
      if (saved) {
        api.log("SAVED. The keeper guessed lane " + (keeperLane + 1) + ".");
        api.toast("Saved!", "bad");
        QG.sfx.lose();
        aiScore += 0;
        resetBall();
      } else {
        score++;
        api.log("<b>GOAL!</b> The ball collapsed into lane " + (realLane + 1) + " and the keeper dived the other way.");
        api.toast("GOAL!", "good");
        QG.sfx.win();
        celebrate = 900;
        resetBall();
      }
      if (score >= 3) { over = true; api.setBest(score); api.win("Hat-trick!", "Three goals past a quantum keeper."); }
      else if (aiScore >= 3) { over = true; api.lose("The AI scored three.", "Measure earlier next time."); }
    }

    function resetBall() {
      ball.lane = 1; ball.ghostLane = 1; ball.y = H - 70;
      keeperLane = U.int(3);
      defenders.forEach(function (d, i) { d.y = 160 + i * 80; });
    }

    function frame(dt) {
      if (over) return;
      var s = dt / 16.67;
      timeLeft -= dt;
      if (timeLeft <= 0) {
        over = true;
        if (score > aiScore) { api.setBest(score); api.win("Full time - you win!", score + " to " + aiScore + "."); }
        else if (score < aiScore) api.lose("Full time - AI wins.", aiScore + " to " + score + ".");
        else api.overlay({ title: "Full time: draw", sub: score + " all.", actions: [{ label: "Play again", kind: "lime", onClick: api.restart }] });
        return;
      }
      if (celebrate > 0) celebrate = Math.max(0, celebrate - dt);

      ball.y -= 0.42 * s;
      if (ball.y < 96) ball.y = 96;

      defenders.forEach(function (d) {
        d.y -= 0.3 * s;
        if (d.y < 130) { d.y = 360 + U.int(60); d.lane = U.int(3); }
        if (Math.abs(d.y - ball.y) < 22 && d.lane === ball.lane) {
          api.log("A defender tackled the real ball.");
          api.toast("Possession lost!", "bad");
          QG.sfx.zap();
          resetBall();
        }
      });
      // AI counter-attack pressure
      if (Math.random() < 0.0016 * s) {
        aiScore++;
        api.log("The AI scored on the counter. " + aiScore + ".");
        QG.sfx.lose();
        if (aiScore >= 3) { over = true; api.lose("The AI scored three.", "Measure earlier next time."); }
      }
      draw();
      hudT += dt;
      if (hudT > 150) { hudT = 0; paintHud(); }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      QG.draw.rect(ctx, 14, 14, W - 28, H - 28, { fill: U.rgba(PAL.green, .16), color: PAL.ink, width: 4, radius: 8, wobble: 2 });
      QG.draw.line(ctx, 14, H / 2, W - 14, H / 2, { color: PAL.ink, width: 2.5, wobble: 1 });
      QG.draw.rect(ctx, W / 2 - 110, 14, 220, 66, { fill: "transparent", color: PAL.ink, width: 4, radius: 6, wobble: 1.5 });
      // goal
      QG.draw.rect(ctx, W / 2 - 90, 18, 180, 22, { fill: U.rgba(PAL.ink, .12), color: PAL.ink, width: 3, radius: 4, wobble: 1, double: false });
      QG.draw.text(ctx, "TAP HERE TO SHOOT", W / 2, 58, { size: 11, color: PAL.ink });
      // keeper
      QG.draw.circle(ctx, LANES[keeperLane], 96, 17, { fill: PAL.orange, color: PAL.ink, width: 3.4 });
      QG.draw.text(ctx, "GK", LANES[keeperLane], 96, { size: 10, color: PAL.ink, font: QG.FONT.display });
      // defenders
      defenders.forEach(function (d) {
        QG.draw.circle(ctx, LANES[d.lane], d.y, 15, { fill: PAL.magenta, color: PAL.ink, width: 3.2 });
      });
      // lane guides
      for (var i = 0; i < 3; i++) QG.draw.line(ctx, LANES[i], 120, LANES[i], H - 30, { color: U.rgba(PAL.ink, .16), width: 2, wobble: 1.4 });
      // ball: real + ghost
      QG.draw.circle(ctx, LANES[ball.ghostLane], ball.y, 12, { fill: "transparent", color: PAL.purple, width: 3, double: false });
      QG.draw.dashedCircle(ctx, LANES[ball.ghostLane], ball.y, 16, { color: PAL.purple, width: 2 });
      QG.draw.circle(ctx, LANES[ball.lane], ball.y, 13, { fill: PAL.paper, color: PAL.ink, width: 3.4 });
      QG.draw.text(ctx, "\u26BD", LANES[ball.lane], ball.y, { size: 16, color: PAL.ink });
      if (celebrate > 0) {
        QG.draw.text(ctx, "GOAL!", W / 2, H / 2, { size: 46, color: PAL.lime, strokeColor: PAL.ink, strokeWidth: 7 });
      }
    }

    function paintHud() {
      QG.clear(hud);
      [["Your goals", score + "/3"], ["AI goals", aiScore + "/3"],
       ["Time", Math.max(0, Math.ceil(timeLeft / 1000)) + "s"],
       ["Ball lane", (ball.lane + 1) + (ball.lane !== ball.ghostLane ? " or " + (ball.ghostLane + 1) : "")]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "You", value: score, color: "lime" },
        { name: "AI", value: aiScore, color: "magenta" }
      ]);
    }

    reset();
    api.loop(frame);
    paintHud();
    api.setStatus("Drag to change lane, tap the goal to SHOOT, MEASURE to collapse the ball.");
  });
})();
