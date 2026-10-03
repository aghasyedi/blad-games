/* ============================================================
   QUANTUM ARCADE — games/pack1.js
   1 Quantum Chess  2 Quantum Battleship  3 Quantum Tic-Tac-Toe
   4 Quantum Maze   5 Quantum Escape Room
   Reference implementations — follow this style for every game.
   ============================================================ */
(function () {
  "use strict";
  var QG = window.QG, h = QG.h, PAL = QG.PAL, U = QG.U;

  /* ==========================================================
     1. QUANTUM CHESS
     ========================================================== */
  QG.register("quantum-chess", function (root, api) {
    var N = 8;
    var GLYPH = {
      w: { K: "\u2654", Q: "\u2655", R: "\u2656", B: "\u2657", N: "\u2658", P: "\u2659" },
      b: { K: "\u265A", Q: "\u265B", R: "\u265C", B: "\u265D", N: "\u265E", P: "\u265F" }
    };
    var idc = 0;
    var board, interference, turn, sel, splitMode, history, over, busy;
    var uid = 0;

    function inb(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

    function fresh() {
      board = new Array(64).fill(null);
      idc = 0;
      var back = ["R", "N", "B", "Q", "K", "B", "N", "R"];
      for (var c = 0; c < 8; c++) {
        put({ id: idc++, type: back[c], color: "b", squares: [c] });
        put({ id: idc++, type: "P", color: "b", squares: [8 + c] });
        put({ id: idc++, type: "P", color: "w", squares: [48 + c] });
        put({ id: idc++, type: back[c], color: "w", squares: [56 + c] });
      }
      interference = {};
      var zones = U.shuffle(U.rangeArr(64)).slice(0, 7);
      zones.forEach(function (z) { interference[z] = true; });
      turn = "w"; sel = null; splitMode = false; history = []; over = false; busy = false;
    }
    function put(p) { p.squares.forEach(function (s) { board[s] = p; }); }
    function removePiece(p) { p.squares.forEach(function (s) { if (board[s] === p) board[s] = null; }); }

    function genMoves(from, color) {
      var p = board[from];
      if (!p || p.color !== color) return [];
      var r = Math.floor(from / 8), c = from % 8, out = [];
      function push(rr, cc) {
        if (!inb(rr, cc)) return false;
        var t = rr * 8 + cc, occ = board[t];
        if (!occ) { out.push(t); return true; }
        if (occ.color !== color) out.push(t);
        return false;
      }
      function slide(dirs) { dirs.forEach(function (o) { var rr = r, cc = c; while (push(rr += o[0], cc += o[1])) { } }); }
      var i;
      if (p.type === "P") {
        var d = color === "w" ? -1 : 1, start = color === "w" ? 6 : 1;
        if (inb(r + d, c) && !board[(r + d) * 8 + c]) {
          out.push((r + d) * 8 + c);
          if (r === start && !board[(r + 2 * d) * 8 + c]) out.push((r + 2 * d) * 8 + c);
        }
        [[d, -1], [d, 1]].forEach(function (o) {
          var rr = r + o[0], cc = c + o[1];
          if (inb(rr, cc) && board[rr * 8 + cc] && board[rr * 8 + cc].color !== color) out.push(rr * 8 + cc);
        });
      } else if (p.type === "N") {
        [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(function (o) { push(r + o[0], c + o[1]); });
      } else if (p.type === "K") {
        for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) if (dr || dc) push(r + dr, c + dc);
      } else if (p.type === "R") slide([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      else if (p.type === "B") slide([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
      else if (p.type === "Q") slide([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
      return out;
    }

    function allPieces(color) {
      var out = [], seen = {};
      for (var i = 0; i < 64; i++) {
        var p = board[i];
        if (p && p.color === color && !seen[p.id]) { seen[p.id] = 1; out.push(p); }
      }
      return out;
    }
    function allMoves(color) {
      var res = [];
      allPieces(color).forEach(function (p) {
        p.squares.forEach(function (s) {
          genMoves(s, color).forEach(function (t) { res.push({ p: p, from: s, to: t }); });
        });
      });
      return res;
    }

    function doMove(mv) {
      var p = mv.p, victim = board[mv.to];
      if (victim && victim !== p) removePiece(victim);
      p.squares.forEach(function (s) { if (board[s] === p) board[s] = null; });
      p.squares = [mv.to];
      board[mv.to] = p;
      if (p.type === "P" && ((p.color === "w" && mv.to < 8) || (p.color === "b" && mv.to >= 56))) p.type = "Q";
      return victim;
    }
    function doSplit(p, to) {
      var victim = board[to];
      if (victim && victim.color !== p.color) removePiece(victim);
      if (p.squares.indexOf(to) < 0) p.squares.push(to);
      board[to] = p;
      return victim;
    }
    function superposed() {
      return allPieces("w").concat(allPieces("b")).filter(function (p) { return p.squares.length === 2; });
    }
    function doMeasure() {
      var list = superposed(), collapsed = 0, captured = 0;
      list.forEach(function (p) {
        var w = [1, 1];
        var a = interference[p.squares[0]] ? 1 : 0, b = interference[p.squares[1]] ? 1 : 0;
        if (a && !b) w = [3, 1]; else if (b && !a) w = [1, 3];
        var pick = Math.random() < w[0] / (w[0] + w[1]) ? p.squares[0] : p.squares[1];
        var other = pick === p.squares[0] ? p.squares[1] : p.squares[0];
        if (board[other] === p) board[other] = null;
        var occ = board[pick];
        if (occ && occ !== p) { removePiece(occ); captured++; }
        p.squares = [pick];
        board[pick] = p;
        collapsed++;
      });
      return { collapsed: collapsed, captured: captured };
    }

    function clone() {
      var map = {}, nb = new Array(64).fill(null);
      for (var i = 0; i < 64; i++) {
        var p = board[i]; if (!p) continue;
        if (!map[p.id]) map[p.id] = { id: p.id, type: p.type, color: p.color, squares: [] };
        map[p.id].squares.push(i); nb[i] = map[p.id];
      }
      return nb;
    }
    function push() { history.push(clone()); if (history.length > 6) history.shift(); }

    /* ---------- rendering ---------- */
    var grid = api.grid(8, 8, onCell);
    var boardBox = h("div", grid.el);
    var legend = h("div.small.muted.tc.mt8", "\u2248 = interference zone (favours collapse) \u00B7 double-drawn pieces are superposed");
    var btnRow = h("div.actions.mt12");
    var bSplit = api.btn("Split", "purple", function () { splitMode = !splitMode; sel = sel; paint(); });
    var bMeasure = api.btn("Measure", "cyan", function () { if (turn !== "w" || busy || over) return; push(); var r = doMeasure(); api.log("You <b>measured</b>: " + r.collapsed + " collapsed, " + r.captured + " captured."); QG.sfx.measure(); endTurn(); });
    var bUndo = api.btn("Undo", "ghost", function () { if (!history.length) { api.toast("Nothing to undo"); return; } board = history.pop(); turn = "w"; sel = null; over = false; paint(); api.setStatus("Your move (undone)."); });
    btnRow.appendChild(bSplit); btnRow.appendChild(bMeasure); btnRow.appendChild(bUndo);

    var status = h("div.hud.mt12");
    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM CHESS"),
      h("span.badge", "White = you")
    ));
    root.appendChild(h("div.mt12", boardBox));
    root.appendChild(legend);
    root.appendChild(btnRow);
    root.appendChild(status);

    function paint() {
      var targets = {};
      if (sel !== null && !over) genMoves(sel, "w").forEach(function (t) { targets[t] = true; });
      for (var i = 0; i < 64; i++) {
        var r = Math.floor(i / 8), c = i % 8, p = board[i];
        var cls = ((r + c) % 2) ? "cell cell--dark" : "cell";
        var html = "";
        if (p) {
          html = (p.color === "w" ? GLYPH.w : GLYPH.b)[p.type];
          if (p.squares.length === 2) cls += " is-super";
          if (p.squares.length === 2) html = "<span style='opacity:.55'>" + html + "</span><span class='cell__ghost' style='opacity:.45'>" + html + "</span>";
        }
        if (interference[i]) html += "<span class='cell__lab'>\u2248</span>";
        if (i === sel) cls += " is-sel";
        if (targets[i]) cls += " is-hint";
        if (splitMode && sel !== null && targets[i]) cls += " is-target";
        grid.set(r, c, html, cls.replace(/^cell\s?/, ""));
      }
      bSplit.style.background = splitMode ? PAL.purple : "";
      bSplit.style.color = splitMode ? "#fff" : "";
      bSplit.innerHTML = splitMode ? "\u2713 Split armed" : "Split";
      QG.clear(status);
      var sup = superposed();
      [["Turn", turn === "w" ? "YOU" : "AI"], ["Your pieces", allPieces("w").length],
       ["AI pieces", allPieces("b").length], ["Superposed", sup.length]].forEach(function (kv) {
        status.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
    }

    function checkEnd() {
      var w = allPieces("w"), b = allPieces("b");
      var wK = w.some(function (p) { return p.type === "K"; });
      var bK = b.some(function (p) { return p.type === "K"; });
      if (!bK || !b.length) { over = true; api.setBest("win"); api.win("Checkmate!", "You captured the AI king. Quantum chess is yours."); return true; }
      if (!wK || !w.length) { over = true; api.lose("Your king collapsed.", "The AI captured your king."); return true; }
      if (!allMoves("w").length) { over = true; api.lose("Stalemate.", "You have no legal moves left."); return true; }
      return false;
    }

    function endTurn() {
      sel = null; splitMode = false; turn = "b"; paint();
      api.setScores([{ name: "Superposed", value: superposed().length, color: "purple" }]);
      if (checkEnd()) return;
      busy = true;
      api.setStatus("AI is thinking...");
      api.after(520, aiTurn);
    }

    function aiTurn() {
      if (over) { busy = false; return; }
      var moves = allMoves("b");
      if (!moves.length) { busy = false; checkEnd(); return; }
      var mine = allPieces("b");
      var sups = mine.filter(function (p) { return p.squares.length === 2; });

      if (sups.length && Math.random() < 0.22) {
        var r = doMeasure();
        api.log("AI <b>measured</b>: " + r.collapsed + " collapsed.");
        QG.sfx.measure();
      } else {
        var splits = [];
        if (Math.random() < 0.3) {
          mine.filter(function (p) { return p.squares.length === 1; }).forEach(function (p) {
            genMoves(p.squares[0], "b").forEach(function (t) { splits.push({ p: p, to: t }); });
          });
        }
        if (splits.length && Math.random() < 0.45) {
          var sp = U.pick(splits);
          var v = doSplit(sp.p, sp.to);
          api.log("AI <b>split</b> a " + sp.p.type + (v ? " (captured!)" : "") + ".");
          QG.sfx.zap();
        } else {
          var caps = moves.filter(function (m) { return board[m.to]; });
          var mv = caps.length && Math.random() < 0.8 ? U.pick(caps) : U.pick(moves);
          var victim = doMove(mv);
          api.log("AI played " + mv.p.type + (victim ? " x " + victim.type : "") + ".");
          QG.sfx.click();
        }
      }
      turn = "w"; busy = false; paint();
      if (checkEnd()) return;
      api.setStatus("Your move. Tap a piece, then a highlighted square.");
    }

    function onCell(r, c) {
      if (over || busy || turn !== "w") return;
      var i = r * 8 + c, p = board[i];
      if (sel === null) {
        if (p && p.color === "w") { sel = i; splitMode = false; QG.sfx.tap(); paint(); }
        else if (p) api.setStatus("That is an AI piece.");
        return;
      }
      if (i === sel) { sel = null; paint(); return; }
      var legal = genMoves(sel, "w").indexOf(i) >= 0;
      if (!legal) {
        if (p && p.color === "w") { sel = i; QG.sfx.tap(); paint(); }
        else { api.toast("Not a legal square", "bad", 1000); }
        return;
      }
      push();
      if (splitMode) {
        var piece = board[sel], v = doSplit(piece, i);
        api.log("You <b>split</b> the " + piece.type + (v ? " capturing a " + v.type : "") + " \u2192 now in 2 squares.");
        QG.sfx.zap();
      } else {
        var mv = { p: board[sel], from: sel, to: i };
        var victim = doMove(mv);
        api.log("You played " + mv.p.type + (victim ? " x " + victim.type : "") + ".");
        QG.sfx.click();
      }
      endTurn();
    }

    fresh(); paint();
    api.setStatus("Your move. Tap a white piece, then a highlighted square.");
    api.setScores([]);
  });

  /* ==========================================================
     2. QUANTUM BATTLESHIP
     ========================================================== */
  QG.register("quantum-battleship", function (root, api) {
    var N = 8;
    var SHIPS = [{ n: "Carrier", s: 5 }, { n: "Battleship", s: 4 }, { n: "Cruiser", s: 3 }, { n: "Submarine", s: 3 }, { n: "Patrol", s: 2 }];

    function placements(size) {
      var out = [];
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
        if (c + size <= N) { var cells = []; for (var k = 0; k < size; k++) cells.push(r * N + c + k); out.push(cells); }
        if (r + size <= N) { var cells2 = []; for (var k2 = 0; k2 < size; k2++) cells2.push((r + k2) * N + c); out.push(cells2); }
      }
      return out;
    }
    function randFleet() {
      var used = {}, fleet = [];
      SHIPS.forEach(function (s) {
        var tries = 0;
        while (true) {
          var pl = U.pick(placements(s.s));
          var ok = pl.every(function (i) { return !used[i]; });
          if (ok) { pl.forEach(function (i) { used[i] = 1; }); fleet.push({ name: s.n, size: s.s, cells: pl, hits: {} }); break; }
          if (++tries > 4000) break;
        }
      });
      return fleet;
    }

    var enemy, player, shots, misses, probes, probeOn, over, turn;
    var heat = new Float64Array(N * N);

    function reset() {
      enemy = randFleet(); player = randFleet();
      shots = {}; misses = {}; probes = 3; probeOn = false; over = false; turn = "you";
      recompute();
    }
    function sunkCount(f) { return f.filter(function (s) { return s.cells.every(function (c) { return s.hits[c]; }); }).length; }
    function allSunk(f) { return f.every(function (s) { return s.cells.every(function (c) { return s.hits[c]; }); }); }

    function recompute() {
      heat = new Float64Array(N * N);
      var cands = [];
      enemy.forEach(function (ship) {
        var hitCells = Object.keys(ship.hits).map(Number);
        var list = placements(ship.size).filter(function (pl) {
          if (pl.some(function (i) { return misses[i]; })) return false;
          return hitCells.every(function (hc) { return pl.indexOf(hc) >= 0; });
        });
        cands.push(list);
      });
      cands.forEach(function (list) {
        list.forEach(function (pl) { pl.forEach(function (i) { heat[i] += 1 / (list.length || 1); }); });
      });
      var mx = 0; for (var i = 0; i < heat.length; i++) mx = Math.max(mx, heat[i]);
      if (mx > 0) for (var j = 0; j < heat.length; j++) heat[j] /= mx;
    }

    /* ---------- UI ---------- */
    var eGrid = api.grid(8, 8, onFire);
    var pGrid = api.grid(8, 8, null);
    var heatWrap = h("div.mt12.hidden");
    var statusRow = h("div.hud.mt12");
    var btnRow = h("div.actions.mt12");
    var bProbe = api.btn("Probe (3)", "cyan", function () {
      if (probes <= 0 || over) { api.toast("No probes left", "bad"); return; }
      probes--; probeOn = true; bProbe.innerHTML = "Probe (" + probes + ")";
      api.toast("Probability heatmap revealed for this turn", "quantum");
      paint();
    });

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "ENEMY WATERS"),
      h("span.badge", "Tap to fire")
    ));
    root.appendChild(h("div.mt12", eGrid.el));
    root.appendChild(heatWrap);
    btnRow.appendChild(bProbe);
    root.appendChild(btnRow);
    root.appendChild(h("div.mt16", h("div.marker", { style: "font-size:.85rem;margin-bottom:6px" }, "YOUR FLEET")));
    root.appendChild(pGrid.el);
    root.appendChild(statusRow);

    function paint() {
      var i, r, c;
      for (i = 0; i < N * N; i++) {
        r = Math.floor(i / N); c = i % N;
        var cls = "cell cell--dark";
        var html = "";
        var hitShip = null;
        enemy.forEach(function (s) { if (s.hits[i]) hitShip = s; });
        if (misses[i]) { cls += " is-hint"; html = "<span style='opacity:.5'>\u00B7</span>"; }
        if (hitShip) {
          var sunk = hitShip.cells.every(function (x) { return hitShip.hits[x]; });
          cls += " is-measured";
          html = sunk ? "\u{1F4A5}" : "\u{1F525}";
          if (sunk) cls += " is-sel";
        } else if (probeOn && heat[i] > 0.02) {
          cls += " is-super";
          html = "<span style='font-size:.62em;opacity:.85'>" + Math.round(heat[i] * 100) + "</span>";
        }
        eGrid.set(r, c, html, cls.replace(/^cell\s?/, ""));
      }
      for (i = 0; i < N * N; i++) {
        r = Math.floor(i / N); c = i % N;
        var pcls = "cell cell--dark", phtml = "";
        player.forEach(function (s) {
          if (s.cells.indexOf(i) >= 0) {
            phtml = s.hits[i] ? "\u{1F525}" : "\u25A0";
            if (s.cells.every(function (x) { return s.hits[x]; })) pcls += " is-sel";
          }
        });
        if (misses["p" + i]) { phtml = "<span style='opacity:.5'>\u00B7</span>"; }
        pGrid.set(r, c, phtml, pcls.replace(/^cell\s?/, ""));
      }
      QG.clear(statusRow);
      [["Enemy sunk", sunkCount(enemy) + "/5"], ["Your sunk", sunkCount(player) + "/5"],
       ["Your shots", Object.keys(shots).length], ["Probes", probes]].forEach(function (kv) {
        statusRow.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "Enemy", value: 5 - sunkCount(enemy), color: "magenta" },
        { name: "You", value: 5 - sunkCount(player), color: "lime" }
      ]);
    }

    function onFire(r, c) {
      if (over || turn !== "you") return;
      var i = r * N + c;
      if (shots[i] !== undefined) { api.toast("Already fired there", "bad", 900); return; }
      var hit = null;
      enemy.forEach(function (s) { if (s.cells.indexOf(i) >= 0) hit = s; });
      shots[i] = hit ? 1 : 0;
      if (hit) {
        hit.hits[i] = true;
        QG.sfx.measure();
        var sunk = hit.cells.every(function (x) { return hit.hits[x]; });
        if (sunk) {
          api.log("You <b>sank</b> the enemy " + hit.name + "!");
          api.toast("Sunk: " + hit.name + "!", "good");
        } else {
          api.log("Hit on " + hit.name + " - position <b>collapsed</b>.");
          api.toast("Hit! Ship collapsed into place.", "good");
        }
      } else {
        misses[i] = true;
        QG.sfx.tick();
        api.log("Miss at " + String.fromCharCode(65 + c) + (r + 1) + " - the cloud reshapes.");
      }
      recompute(); paint();
      if (allSunk(enemy)) { over = true; api.setBest("win"); api.win("Fleet destroyed!", "You measured every enemy ship."); return; }
      turn = "ai";
      api.setStatus("Enemy is firing...");
      api.after(560, aiFire);
    }

    function aiFire() {
      if (over) return;
      var candidates = [];
      for (var i = 0; i < N * N; i++) if (misses["p" + i] !== true && !player.some(function (s) { return s.hits[i]; })) candidates.push(i);
      // hunt: prefer neighbours of existing hits
      var hot = [];
      player.forEach(function (s) {
        var hc = s.cells.filter(function (x) { return s.hits[x]; });
        if (hc.length && !s.cells.every(function (x) { return s.hits[x]; })) {
          hc.forEach(function (x) {
            var r = Math.floor(x / N), c = x % N;
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
              var nr = r + d[0], nc = c + d[1];
              if (nr >= 0 && nr < N && nc >= 0 && nc < N) hot.push(nr * N + nc);
            });
          });
        }
      });
      var pick = hot.length ? U.pick(hot) : U.pick(candidates);
      if (pick === undefined) return;
      var hit = null;
      player.forEach(function (s) { if (s.cells.indexOf(pick) >= 0) hit = s; });
      if (hit) { hit.hits[pick] = true; QG.sfx.zap(); api.log("Enemy <b>hit</b> your " + hit.name + "!"); }
      else { misses["p" + pick] = true; api.log("Enemy missed."); }
      turn = "you"; probeOn = false;
      paint();
      if (allSunk(player)) { over = true; api.lose("Your fleet is gone.", "The enemy measured every one of your ships."); return; }
      api.setStatus("Your turn - fire at the enemy grid.");
    }

    reset(); paint();
    api.setStatus("Fire at the enemy grid. A hit collapses that ship into place.");
  });

  /* ==========================================================
     3. QUANTUM TIC-TAC-TOE
     ========================================================== */
  QG.register("quantum-tic-tac-toe", function (root, api) {
    var moves, real, pending, turn, over, wins;

    wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

    function reset() {
      moves = []; real = new Array(9).fill(null); pending = []; turn = "X"; over = false;
    }

    var grid = api.grid(3, 3, onCell);
    var btnRow = h("div.actions.mt12");
    var bCollapse = api.btn("Collapse", "magenta", doCollapse);
    var bUndo = api.btn("Undo", "ghost", function () {
      if (!moves.length || over) return;
      var last = moves.pop(); pending = pending.filter(function (p) { return p !== last; });
      turn = turn === "X" ? "O" : "X"; paint();
    });
    btnRow.appendChild(bCollapse); btnRow.appendChild(bUndo);
    var info = h("div.mt12");

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM TIC-TAC-TOE"),
      h("span.badge", "Tap two squares per move")
    ));
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(btnRow);
    root.appendChild(info);

    function ghostsAt(i) {
      var g = [];
      moves.forEach(function (m) { if (!m.resolved && m.cells.indexOf(i) >= 0) g.push(m); });
      return g;
    }
    function winner() {
      for (var k = 0; k < wins.length; k++) {
        var w = wins[k];
        if (real[w[0]] && real[w[0]] === real[w[1]] && real[w[1]] === real[w[2]]) return real[w[0]];
      }
      return null;
    }

    function paint() {
      for (var i = 0; i < 9; i++) {
        var r = Math.floor(i / 3), c = i % 3, cls = "cell", html = "";
        if (real[i]) { html = "<b>" + real[i] + "</b>"; cls += " is-measured"; }
        else {
          var g = ghostsAt(i);
          if (g.length) {
            cls += " is-super";
            html = g.map(function (m) {
              return "<span class='cell__ghost' style='opacity:" + (m.player === "X" ? ".8" : ".55") + ";font-size:.72em'>" + m.player + "</span>";
            }).join("");
          }
        }
        if (pending.indexOf(i) >= 0) cls += " is-sel";
        grid.set(r, c, html, cls.replace(/^cell\s?/, ""));
      }
      var free = 0; for (var j = 0; j < 9; j++) if (!real[j]) free++;
      var w = winner();
      QG.clear(info);
      info.appendChild(h("div.small.muted.tc",
        w ? "" : (pending.length ? "Now tap a second square to entangle this move." : "Your move: tap two squares for one entangled quantum move.")
      ));
      api.setScores([
        { name: "X", value: real.filter(function (v) { return v === "X"; }).length, color: "cyan", turn: turn === "X" },
        { name: "O", value: real.filter(function (v) { return v === "O"; }).length, color: "magenta", turn: turn === "O" },
        { name: "Entangled", value: moves.filter(function (m) { return !m.resolved; }).length, color: "purple" }
      ]);
    }

    function onCell(r, c) {
      if (over || turn !== "X") return;
      var i = r * 3 + c;
      if (real[i]) { api.toast("That square is already measured", "bad", 900); return; }
      if (pending.indexOf(i) >= 0) { pending = []; paint(); return; }
      if (!pending.length) { pending = [i]; QG.sfx.tap(); paint(); return; }
      // second square -> create the entangled move
      var a = pending[0];
      if (ghostsAt(i).length >= 2) { api.toast("Too many ghosts there", "bad", 900); return; }
      var m = { player: "X", cells: [a, i], resolved: false };
      moves.push(m); pending = [];
      api.log("You placed an entangled <b>X</b> across two squares.");
      QG.sfx.zap();
      turn = "O"; paint();
      api.after(520, aiMove);
    }

    function aiMove() {
      if (over) return;
      var empty = [];
      for (var i = 0; i < 9; i++) if (!real[i]) empty.push(i);
      if (empty.length < 2) { api.setStatus("Collapse to finish the board."); return; }
      empty = U.shuffle(empty);
      var m = { player: "O", cells: [empty[0], empty[1]], resolved: false };
      moves.push(m);
      api.log("AI placed an entangled <b>O</b>.");
      QG.sfx.click();
      turn = "X"; paint();
      var total = 0; moves.forEach(function (mm) { if (!mm.resolved) total += 2; });
      if (total >= 12) { api.toast("Board saturated - auto collapse!", "quantum"); api.after(420, doCollapse); }
    }

    function doCollapse() {
      if (over) return;
      var guard = 0, resolved = 0;
      while (guard++ < 40) {
        var next = null;
        for (var k = 0; k < moves.length; k++) { if (!moves[k].resolved) { next = moves[k]; break; } }
        if (!next) break;
        var free = next.cells.filter(function (c) { return !real[c]; });
        if (!free.length) { next.resolved = true; continue; }
        var pick;
        if (free.length === 1) pick = free[0];
        else {
          // interference: a crowded square is less likely to win the collapse
          var w = free.map(function (c) {
            var crowd = ghostsAt(c).filter(function (m) { return m !== next; }).length;
            return 1 / (1 + crowd * 0.8);
          });
          pick = Math.random() < w[0] / (w[0] + w[1]) ? free[0] : free[1];
        }
        real[pick] = next.player;
        next.resolved = true;
        resolved++;
        QG.sfx.measure();
      }
      moves.forEach(function (m) { m.resolved = true; });
      api.log("Collapse resolved <b>" + resolved + "</b> quantum move" + (resolved === 1 ? "" : "s") + ".");
      paint();
      var w = winner();
      if (w) {
        over = true;
        api.setStatus(w + " wins!");
        if (w === "X") { api.setBest("win"); api.win("X wins!", "The board collapsed in your favour."); }
        else api.lose("O wins.", "The collapse went the AI's way.");
        return;
      }
      var freeSquares = 0; for (var i = 0; i < 9; i++) if (!real[i]) freeSquares++;
      if (freeSquares === 0) { over = true; api.setStatus("Draw."); api.overlay({ title: "Quantum draw", sub: "Perfect interference - nobody won.", actions: [{ label: "Play again", kind: "lime", onClick: api.restart }] }); return; }
      api.setStatus(freeSquares + " squares left. Keep entangling.");
    }

    reset(); paint();
    api.setStatus("Tap two squares to place one entangled X move.");
  });

  /* ==========================================================
     4. QUANTUM MAZE
     ========================================================== */
  QG.register("quantum-maze", function (root, api) {
    var COLS = 13, ROWS = 9;
    var cells, amp, interference, movesLeft, measures, exitIdx, over, steps;

    var DIRS = [{ i: 0, dr: -1, dc: 0, n: "N" }, { i: 1, dr: 0, dc: 1, n: "E" }, { i: 2, dr: 1, dc: 0, n: "S" }, { i: 3, dr: 0, dc: -1, n: "W" }];

    function gen() {
      cells = [];
      for (var r = 0; r < ROWS; r++) {
        cells[r] = [];
        for (var c = 0; c < COLS; c++) cells[r][c] = { w: [true, true, true, true] };
      }
      var vis = {}, stack = [{ r: 0, c: 0 }];
      vis["0,0"] = 1;
      while (stack.length) {
        var cur = stack[stack.length - 1], ns = [];
        DIRS.forEach(function (d) {
          var nr = cur.r + d.dr, nc = cur.c + d.dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !vis[nr + "," + nc]) ns.push({ r: nr, c: nc, a: d.i, b: (d.i + 2) % 4 });
        });
        if (!ns.length) { stack.pop(); continue; }
        var p = U.pick(ns);
        cells[cur.r][cur.c].w[p.a] = false;
        cells[p.r][p.c].w[p.b] = false;
        vis[p.r + "," + p.c] = 1;
        stack.push({ r: p.r, c: p.c });
      }
      // braid: punch extra holes so the wave has loops to interfere in
      var holes = Math.floor(COLS * ROWS * 0.14);
      for (var k = 0; k < holes; k++) {
        var r2 = U.int(ROWS), c2 = U.int(COLS), d2 = U.int(4);
        var nr2 = r2 + DIRS[d2].dr, nc2 = c2 + DIRS[d2].dc;
        if (nr2 >= 0 && nr2 < ROWS && nc2 >= 0 && nc2 < COLS) {
          cells[r2][c2].w[d2] = false;
          cells[nr2][nc2].w[(d2 + 2) % 4] = false;
        }
      }
    }

    function reset() {
      gen();
      exitIdx = (ROWS - 1) * COLS + (COLS - 1);
      interference = {};
      var open = [];
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (r * COLS + c !== 0 && r * COLS + c !== exitIdx) open.push(r * COLS + c);
      U.shuffle(open).slice(0, 8).forEach(function (i, k) { interference[i] = k % 3 === 0 ? -1.7 : 1.7; });
      amp = new Float64Array(COLS * ROWS);
      amp[0] = 1;
      movesLeft = 30; measures = 3; over = false; steps = 0;
    }

    function normalise(a) {
      var s = 0;
      for (var i = 0; i < a.length; i++) s += a[i] * a[i];
      s = Math.sqrt(s) || 1;
      for (var j = 0; j < a.length; j++) a[j] /= s;
      return a;
    }
    function openNbrs(r, c) {
      var out = [];
      DIRS.forEach(function (d) {
        if (cells[r][c].w[d.i]) return;
        var nr = r + d.dr, nc = c + d.dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
        out.push(nr * COLS + nc);
      });
      return out;
    }

    function spread() {
      var next = new Float64Array(COLS * ROWS);
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        var i = r * COLS + c, a = amp[i];
        if (!a) continue;
        var mult = interference[i] || 1;
        openNbrs(r, c).forEach(function (j) { next[j] += a * 0.82 * (interference[j] || 1); });
        next[i] += a * 0.22;
      }
      amp = normalise(next);
      steps++;
    }

    function drift(dir) {
      var f = new Float64Array(COLS * ROWS);
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        var proj = 0;
        if (dir === "right") proj = c / (COLS - 1) - 0.5;
        else if (dir === "left") proj = 0.5 - c / (COLS - 1);
        else if (dir === "down") proj = r / (ROWS - 1) - 0.5;
        else proj = 0.5 - r / (ROWS - 1);
        f[r * COLS + c] = amp[r * COLS + c] * (1 + 1.1 * proj);
      }
      amp = normalise(f);
    }

    var cv = api.canvas({ w: 620, h: 430 });
    var c2 = cv.ctx;
    var pad = QG.dpad({ onPress: function (dir) { walk(dir); } });
    var btnRow = h("div.actions.mt12");
    var bMeasure = api.btn("Measure", "cyan", doMeasure);
    var bReset = api.btn("New maze", "ghost", function () { reset(); paint(); });
    btnRow.appendChild(bMeasure); btnRow.appendChild(bReset);

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM MAZE"),
      h("span.badge", "You are a wave")
    ));
    root.appendChild(h("div.mt12", cv.el));
    root.appendChild(h("div.mt12", pad));
    root.appendChild(btnRow);
    var info = h("div.mt12");
    root.appendChild(info);

    var detach = QG.steer(cv.el, function (dir) { walk(dir); });
    api.onCleanup(detach);

    function walk(dir) {
      if (over) return;
      if (movesLeft <= 0) { endLose("Out of moves."); return; }
      drift(dir);
      spread();
      movesLeft--;
      QG.sfx.tick();
      var pe = amp[exitIdx] * amp[exitIdx];
      if (pe > 0.6) { over = true; api.setBest("win"); api.setStatus("The wave reached the exit!"); api.win("You escaped!", "Your wavefunction reached the exit with " + Math.round(pe * 100) + "% probability."); return; }
      api.setStatus("Walking " + dir + ". Exit probability: " + (pe * 100).toFixed(1) + "%.");
    }

    function doMeasure() {
      if (over) return;
      if (measures <= 0) { api.toast("No measurements left", "bad"); return; }
      measures--;
      var pick = QG.sampleDist(Array.prototype.slice.call(amp).map(function (a) { return a * a; }));
      var wasExit = pick === exitIdx;
      amp = new Float64Array(COLS * ROWS);
      amp[wasExit ? exitIdx : pick] = 1;
      QG.sfx.measure();
      paint();
      if (wasExit) { over = true; api.setBest("win"); api.win("Measured onto the exit!", "You collapsed exactly where you needed to be."); return; }
      api.log("Measured into cell " + (Math.floor(pick / COLS) + 1) + "," + (pick % COLS + 1) + " - the wave collapsed.");
      api.setStatus("Collapsed! " + measures + " measurements left.");
    }

    function endLose(why) { over = true; api.lose("The wave decohered.", why); }

    function paint() {
      c2.clearRect(0, 0, cv.w, cv.h);
      var pad2 = 14;
      var cs = Math.min((cv.w - pad2 * 2) / COLS, (cv.h - pad2 * 2) / ROWS);
      var ox = (cv.w - cs * COLS) / 2, oy = (cv.h - cs * ROWS) / 2;
      var i, r, c;
      // cells
      for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
        i = r * COLS + c;
        var x = ox + c * cs, y = oy + r * cs;
        var p = amp[i] * amp[i];
        if (p > 0.001) {
          QG.draw.rect(c2, x + 1, y + 1, cs - 2, cs - 2, {
            fill: U.rgba(PAL.cyan, Math.min(0.85, 0.12 + p * 1.5)),
            stroke: false, wobble: 0, double: false
          });
        }
        if (i === exitIdx) QG.draw.rect(c2, x + 3, y + 3, cs - 6, cs - 6, { fill: U.rgba(PAL.lime, .55), color: PAL.ink, width: 2.5, wobble: 1, radius: 3 });
        if (i === 0) QG.draw.circle(c2, x + cs / 2, y + cs / 2, cs * 0.22, { fill: PAL.yellow, color: PAL.ink, width: 2.5, double: false });
        if (interference[i]) {
          QG.draw.text(c2, interference[i] > 0 ? "+" : "\u2212", x + cs - 7, y + 9, {
            size: Math.max(9, cs * 0.34), color: interference[i] > 0 ? PAL.green : PAL.red, font: QG.FONT.display
          });
        }
      }
      // walls
      for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
        var xx = ox + c * cs, yy = oy + r * cs;
        if (cells[r][c].w[0]) QG.draw.line(c2, xx, yy, xx + cs, yy, { width: 3, color: PAL.ink, wobble: 1 });
        if (cells[r][c].w[1]) QG.draw.line(c2, xx + cs, yy, xx + cs, yy + cs, { width: 3, color: PAL.ink, wobble: 1 });
        if (cells[r][c].w[2]) QG.draw.line(c2, xx, yy + cs, xx + cs, yy + cs, { width: 3, color: PAL.ink, wobble: 1 });
        if (cells[r][c].w[3]) QG.draw.line(c2, xx, yy, xx, yy + cs, { width: 3, color: PAL.ink, wobble: 1 });
      }
      // wave
      for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
        i = r * COLS + c;
        var pp = amp[i] * amp[i];
        if (pp < 0.002) continue;
        var cx = ox + c * cs + cs / 2, cy = oy + r * cs + cs / 2;
        var rad = cs * 0.14 + Math.sqrt(pp) * cs * 0.42;
        QG.draw.circle(c2, cx, cy, rad, {
          fill: U.rgba(PAL.magenta, Math.min(0.9, 0.25 + pp * 1.6)),
          color: PAL.ink, width: 2, double: false, wobble: 0.9
        });
      }
      QG.clear(info);
      var pExit = amp[exitIdx] * amp[exitIdx];
      [["Moves left", movesLeft], ["Measurements", measures], ["Exit odds", (pExit * 100).toFixed(1) + "%"]].forEach(function (kv) {
        info.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      info.className = "hud mt12";
      api.setScores([{ name: "Exit odds", value: (pExit * 100).toFixed(1) + "%", color: "lime" }, { name: "Moves", value: movesLeft, color: "cyan" }]);
    }

    reset();
    paint();
    api.loop(paint);
    api.setStatus("Use the arrows to walk your wave toward the green exit.");
  });

  /* ==========================================================
     5. QUANTUM ESCAPE ROOM
     ========================================================== */
  QG.register("quantum-escape-room", function (root, api) {
    var LEVELS = [
      { n: 1, qubits: 1, start: [1, 0], target: [0, 1], gates: ["X"], teach: "X is the NOT gate: it flips |0> into |1>." },
      { n: 2, qubits: 1, start: [1, 0], target: [1, 1], gates: ["H"], teach: "H puts a qubit into an equal superposition of |0> and |1>." },
      { n: 3, qubits: 1, start: [1, 0], target: [1, -1], gates: ["X", "H", "Z"], teach: "Z flips the sign of |1>. Combine with H for a minus superposition." },
      { n: 4, qubits: 2, start: [1, 0, 0, 0], target: [1 / Math.SQRT2, 0, 0, 1 / Math.SQRT2], gates: ["H", "CNOT"], teach: "H then CNOT creates a Bell pair - two qubits that are entangled." },
      { n: 5, qubits: 2, start: [1, 0, 0, 0], target: [1 / Math.SQRT2, 0, 0, -1 / Math.SQRT2], gates: ["H", "X", "Z", "CNOT"], teach: "Add a Z to flip the phase of the entangled branch." },
      { n: 6, qubits: 2, start: [1, 0, 0, 0], target: [0, 1 / Math.SQRT2, 1 / Math.SQRT2, 0], gates: ["H", "X", "CNOT", "SWAP"], teach: "Entangle, then SWAP - you get the symmetric Bell state |01> + |10>." }
    ];
    var idx, reg, qsel, solved, over;

    function load(i) {
      idx = i;
      var L = LEVELS[idx];
      reg = new QG.QReg(L.qubits);
      // start vector: level 1-3 start at |0>
      reg.setBasis(0);
      qsel = 0; solved = false; over = false;
      paint();
    }

    function matchTarget() {
      var L = LEVELS[idx], a = reg.amp, t = L.target;
      var first = -1;
      for (var i = 0; i < a.length; i++) if (Math.abs(a[i].re) + Math.abs(a[i].im) > 1e-6) { first = i; break; }
      if (first < 0) return false;
      var cr = a[first].re, ci = a[first].im, m = cr * cr + ci * ci;
      if (m < 1e-9) return false;
      for (var k = 0; k < a.length; k++) {
        // divide state by the first amplitude (removes global phase)
        var re = (a[k].re * cr + a[k].im * ci) / m;
        var im = (a[k].im * cr - a[k].re * ci) / m;
        var tr = t[k] || 0;
        if (Math.abs(re - tr) > 0.02 || Math.abs(im) > 0.02) return false;
      }
      return true;
    }

    var head = h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "ESCAPE ROOM"),
      h("span.badge", { id: "room" }, "Room 1 / 6")
    );
    var teach = h("div.controls-note.mt12");
    var bars = h("div.mt12");
    var dirac = h("div.dirac.mt12");
    var targetBox = h("div.mt12");
    var qselRow = h("div.row.gap8.mt12");
    var gateRow = h("div.actions.mt12");
    var btnRow = h("div.actions.mt12");
    var bReset = api.btn("Reset room", "ghost", function () { load(idx); });

    root.appendChild(head);
    root.appendChild(teach);
    root.appendChild(bars);
    root.appendChild(dirac);
    root.appendChild(targetBox);
    root.appendChild(qselRow);
    root.appendChild(gateRow);
    root.appendChild(btnRow);
    btnRow.appendChild(bReset);

    function label(i, n) {
      var bits = i.toString(2);
      while (bits.length < n) bits = "0" + bits;
      return "|" + bits + ">";
    }

    function paint() {
      var L = LEVELS[idx];
      head.lastChild.textContent = "Room " + (idx + 1) + " / 6";
      teach.innerHTML = "<b>Concept:</b> " + QG.esc(L.teach);
      QG.clear(bars);
      for (var i = 0; i < reg.size; i++) {
        var p = QG.C.abs2(reg.amp[i]);
        var row = h("div.qmeter__row");
        row.appendChild(h("span.qmeter__lab", label(i, L.qubits)));
        var bar = h("div.qmeter__bar");
        var fill = h("div.qmeter__fill", { style: "width:" + (p * 100).toFixed(1) + "%;background:" + PAL.cyan });
        bar.appendChild(fill);
        row.appendChild(bar);
        row.appendChild(h("span.qmeter__val", (p * 100).toFixed(1) + "%"));
        bars.appendChild(h("div.qmeter", { style: "margin-bottom:6px" }, row));
      }
      dirac.textContent = reg.dirac(3);
      var tstr = [];
      for (var k = 0; k < reg.size; k++) {
        var v = L.target[k] || 0;
        if (Math.abs(v) > 1e-6) tstr.push((v < 0 ? "\u2212" : "") + Math.abs(v).toFixed(3) + label(k, L.qubits));
      }
      QG.clear(targetBox);
      targetBox.appendChild(h("div.panel", { style: "box-shadow:var(--sh-xs)" },
        h("div.hud__k", "TARGET STATE"), h("div.dirac.mt8", tstr.join(" + "))
      ));
      QG.clear(qselRow);
      if (L.qubits > 1) {
        qselRow.appendChild(h("span.small.strong", "Gate acts on:"));
        for (var q = 0; q < L.qubits; q++) {
          (function (qq) {
            var b = api.btn("q" + qq, qq === qsel ? "lime" : "ghost", function () { qsel = qq; paint(); });
            qselRow.appendChild(b);
          })(q);
        }
      }
      QG.clear(gateRow);
      L.gates.forEach(function (g) {
        gateRow.appendChild(api.btn(g, "purple", function () { applyGate(g); }));
      });
      api.setStatus(solved ? "Room solved!" : "Match the target state.");
      api.setScores([{ name: "Room", value: (idx + 1) + "/6", color: "purple" }]);
    }

    function applyGate(g) {
      if (solved) return;
      var L = LEVELS[idx];
      if (g === "CNOT") { reg.cnot(0, 1); }
      else if (g === "SWAP") { reg.swap(0, 1); }
      else { reg.apply1(qsel, QG.GATES[g]); }
      QG.sfx.gate();
      paint();
      if (matchTarget()) {
        solved = true;
        QG.sfx.good();
        api.log("Room " + (idx + 1) + " solved with " + g + ".");
        if (idx === LEVELS.length - 1) {
          over = true;
          api.setBest("escaped");
          api.win("You escaped the lab!", "All six quantum concepts mastered.");
        } else {
          api.setStatus("Room solved - moving on...");
          api.after(900, function () { load(idx + 1); });
        }
      }
    }

    load(0);
    api.setStatus("Apply gates to match the target state.");
  });
})();
