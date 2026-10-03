/* ============================================================
   QUANTUM ARCADE — games/pack8.js
   36 Quantum Sudoku  37 Quantum Crossword  38 Quantum Memory
   39 Quantum Treasure Hunt  40 Quantum Indian Treasure Hunt
   ============================================================ */
(function () {
  "use strict";
  var QG = window.QG, h = QG.h, PAL = QG.PAL, U = QG.U;

  /* ==========================================================
     36. QUANTUM SUDOKU  (4x4)
     ========================================================== */
  QG.register("quantum-sudoku", function (root, api) {
    var BASE = [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]];
    var sol, cand, fixed, givens, sel, lives, over, busy, wrongs;

    function shuffled() {
      var g = BASE.map(function (r) { return r.slice(); });
      var perm = U.shuffle([1, 2, 3, 4]);
      var r, c;
      for (r = 0; r < 4; r++) for (c = 0; c < 4; c++) g[r][c] = perm[g[r][c] - 1];
      var bands = U.shuffle([0, 1]), stacks = U.shuffle([0, 1]);
      var rows = [].concat(bands.map(function (b) { return b * 2; }), bands.map(function (b) { return b * 2 + 1; }));
      var cols = [].concat(stacks.map(function (s) { return s * 2; }), stacks.map(function (s) { return s * 2 + 1; }));
      var out = [];
      for (r = 0; r < 4; r++) { out[r] = []; for (c = 0; c < 4; c++) out[r][c] = g[rows[r]][cols[c]]; }
      return out;
    }

    function peers(r, c) {
      var out = [];
      for (var k = 0; k < 4; k++) { if (k !== c) out.push([r, k]); if (k !== r) out.push([k, c]); }
      var br = Math.floor(r / 2) * 2, bc = Math.floor(c / 2) * 2;
      for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
        var rr = br + i, cc = bc + j;
        if (rr !== r || cc !== c) out.push([rr, cc]);
      }
      return out;
    }

    function reset() {
      sol = shuffled();
      cand = []; fixed = []; givens = {};
      for (var r = 0; r < 4; r++) { cand[r] = []; fixed[r] = []; for (var c = 0; c < 4; c++) { cand[r][c] = [1, 2, 3, 4]; fixed[r][c] = false; } }
      var cells = U.shuffle(U.rangeArr(16)).slice(0, 6);
      cells.forEach(function (i) {
        var r = Math.floor(i / 4), c = i % 4;
        fixed[r][c] = true;
        givens[r + "," + c] = true;
        cand[r][c] = [sol[r][c]];
      });
      propagate();
      sel = null; lives = 3; over = false; busy = false; wrongs = 0;
    }

    // Only COLLAPSED (measured) cells propagate constraints, so a wrong
    // narrowing can never poison the puzzle into an unsolvable state.
    function propagate() {
      var changed = true, guard = 0;
      while (changed && guard++ < 40) {
        changed = false;
        for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
          if (!fixed[r][c] || cand[r][c].length !== 1) continue;
          var v = cand[r][c][0];
          var ps = peers(r, c);
          for (var k = 0; k < ps.length; k++) {
            var pr = ps[k][0], pc = ps[k][1];
            if (fixed[pr][pc]) continue;
            var idx = cand[pr][pc].indexOf(v);
            if (idx >= 0 && cand[pr][pc].length > 1) {
              cand[pr][pc] = cand[pr][pc].slice(0, idx).concat(cand[pr][pc].slice(idx + 1));
              changed = true;
            }
          }
        }
      }
    }

    function solvedCount() {
      var n = 0;
      for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) if (fixed[r][c] && cand[r][c][0] === sol[r][c]) n++;
      return n;
    }
    function allSolved() {
      for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) if (!fixed[r][c] || cand[r][c][0] !== sol[r][c]) return false;
      return true;
    }

    var grid = api.grid(4, 4, onCell);
    var digitRow = h("div.actions.mt12");
    var digitBtns = [];
    [1, 2, 3, 4].forEach(function (d) {
      var b = api.btn(String(d), "cyan", function () { narrow(d); });
      digitBtns.push(b); digitRow.appendChild(b);
    });
    var btnRow = h("div.actions.mt12");
    var bMeasure = api.btn("Measure", "magenta", function () {
      if (over || busy) return;
      var collapsed = 0, bad = 0;
      for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
        if (fixed[r][c] || cand[r][c].length !== 1) continue;
        fixed[r][c] = true; collapsed++;
        if (cand[r][c][0] !== sol[r][c]) bad++;
      }
      if (!collapsed) { api.toast("Nothing is determined yet", "bad", 1100); return; }
      QG.sfx.measure();
      api.log("MEASURE collapsed <b>" + collapsed + "</b> cell" + (collapsed === 1 ? "" : "s") + (bad ? ", " + bad + " wrong" : "") + ".");
      if (bad) {
        lives -= bad;
        wrongs += bad;
        api.toast(bad + " wrong collapse" + (bad === 1 ? "" : "s"), "bad");
      }
      propagate(); paint();
      if (allSolved()) { over = true; api.setBest(lives); api.win("Grid solved!", "Every cell collapsed correctly with " + lives + " lives left."); return; }
      if (lives <= 0) { over = true; api.lose("The grid locked.", "Too many wrong measurements."); return; }
      api.setStatus("Measured. " + lives + " lives left.");
    });
    btnRow.appendChild(bMeasure);
    var info = h("div.hud.mt12");

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM SUDOKU"),
      h("span.badge", "1-4 in every row, column and box")
    ));
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(h("div.small.muted.tc.mt8", "Tap a cell, then a digit to narrow it. MEASURE collapses every determined cell."));
    root.appendChild(digitRow);
    root.appendChild(btnRow);
    root.appendChild(info);

    function paint() {
      for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
        var cls = "cell", html = "";
        var isGiven = !!givens[r + "," + c];
        if (fixed[r][c]) {
          html = "<b style='font-size:1.25em'>" + cand[r][c][0] + "</b>";
          cls += isGiven ? " is-sel" : " is-measured";
        } else if (cand[r][c].length === 1) {
          html = "<b style='font-size:1.25em;opacity:.75'>" + cand[r][c][0] + "</b>";
          cls += " is-hint";
        } else {
          cls += " is-super";
          html = cand[r][c].map(function (d) {
            return "<span style='position:absolute;font-size:.6em;opacity:.6;transform:translate(" + ((d - 2.5) * 9) + "px," + ((d % 2) * 10 - 5) + "px)'>" + d + "</span>";
          }).join("");
        }
        if (sel && sel[0] === r && sel[1] === c) cls += " is-target";
        grid.set(r, c, html, cls.replace(/^cell\s?/, ""));
      }
      digitBtns.forEach(function (b) { b.disabled = !sel || (sel && fixed[sel[0]][sel[1]]); });
      QG.clear(info);
      [["Solved", solvedCount() + "/16"], ["Lives", lives], ["Wrong", wrongs]].forEach(function (kv) {
        info.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "Solved", value: solvedCount() + "/16", color: "cyan" },
        { name: "Lives", value: lives, color: "red" }
      ]);
    }

    function onCell(r, c) {
      if (over || busy) return;
      if (givens[r + "," + c]) { api.toast("That digit is given", "bad", 900); return; }
      if (fixed[r][c]) { api.toast("Already collapsed", "bad", 900); return; }
      sel = [r, c];
      QG.sfx.tap();
      paint();
    }

    function narrow(d) {
      if (over || busy || !sel) return;
      var r = sel[0], c = sel[1];
      if (fixed[r][c]) return;
      if (cand[r][c].indexOf(d) < 0) { api.toast(d + " is already excluded here", "bad", 1000); return; }
      cand[r][c] = [d];
      QG.sfx.gate();
      api.log("You narrowed " + String.fromCharCode(65 + c) + (r + 1) + " to <b>" + d + "</b>.");
      propagate();
      paint();
      if (allSolved()) { over = true; api.setBest(lives); api.win("Grid solved!", "Every cell collapsed correctly."); }
    }

    reset(); paint();
    api.setStatus("Tap a cell, then a digit to narrow it.");
  });

  /* ==========================================================
     37. QUANTUM CROSSWORD  (5x5 word square)
     ========================================================== */
  QG.register("quantum-crossword", function (root, api) {
    var WORDS = ["HEART", "EMBER", "ABUSE", "RESIN", "TREND"];
    var CLUES = [
      "Pumps blood, or a card suit",
      "A glowing lump in a dying fire",
      "To misuse badly",
      "Sticky plant sap",
      "The general direction things are going"
    ];
    var ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var cand, fixed, sel, attempts, over, busy, revealed;

    function reset() {
      cand = []; fixed = [];
      for (var r = 0; r < 5; r++) {
        cand[r] = []; fixed[r] = [];
        for (var c = 0; c < 5; c++) {
          var opts = [WORDS[r][c]];
          var pool = U.shuffle(ALPHA.split("")).filter(function (L) { return L !== WORDS[r][c]; });
          opts.push(pool[0], pool[1]);
          cand[r][c] = U.shuffle(opts);
          fixed[r][c] = false;
        }
      }
      sel = null; attempts = 3; over = false; busy = false; revealed = 0;
    }

    var grid = api.grid(5, 5, onCell);
    var letterRow = h("div.actions.mt12", { style: "min-height:52px" });
    var btnRow = h("div.actions.mt12");
    var bMeasure = api.btn("Measure", "magenta", function () {
      if (over || busy) return;
      var n = 0;
      for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) {
        if (!fixed[r][c] && cand[r][c].length === 1) {
          fixed[r][c] = true; n++;
          if (cand[r][c][0] === WORDS[r][c]) revealed++;
        }
      }
      if (!n) { api.toast("Nothing is determined yet", "bad", 1100); return; }
      QG.sfx.measure();
      api.log("MEASURE collapsed <b>" + n + "</b> cell" + (n === 1 ? "" : "s") + ".");
      paint();
      checkWin();
    });
    btnRow.appendChild(bMeasure);
    var clueBox = h("div.mt12");
    var info = h("div.hud.mt12");

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM CROSSWORD"),
      h("span.badge", "A 5x5 word square")
    ));
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(h("div.small.muted.tc.mt8", "Tap a cell to see its candidate letters, then tap one to narrow it."));
    root.appendChild(letterRow);
    root.appendChild(btnRow);
    root.appendChild(clueBox);
    root.appendChild(info);

    function paint() {
      for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) {
        var cls = "cell", html = "";
        if (fixed[r][c]) {
          html = "<b style='font-size:1.1em'>" + cand[r][c][0] + "</b>";
          cls += cand[r][c][0] === WORDS[r][c] ? " is-measured" : " is-sel";
        } else if (cand[r][c].length === 1) {
          html = "<b style='font-size:1.1em;opacity:.7'>" + cand[r][c][0] + "</b>";
          cls += " is-hint";
        } else {
          cls += " is-super";
          html = "<span style='font-size:.56em;letter-spacing:.08em;opacity:.7'>" + cand[r][c].join("") + "</span>";
        }
        if (sel && sel[0] === r && sel[1] === c) cls += " is-target";
        grid.set(r, c, html, cls.replace(/^cell\s?/, ""));
      }
      QG.clear(letterRow);
      if (sel && !fixed[sel[0]][sel[1]]) {
        letterRow.appendChild(h("span.small.strong", "Pick: "));
        cand[sel[0]][sel[1]].forEach(function (L) {
          letterRow.appendChild(api.btn(L, "cyan", function () { pick(L); }));
        });
        letterRow.appendChild(api.btn("cancel", "ghost", function () { sel = null; paint(); }));
      } else {
        letterRow.appendChild(h("span.small.muted", "Tap any cell to narrow it."));
      }
      QG.clear(clueBox);
      var box = h("div.gpanel");
      box.appendChild(h("h3", "CLUES"));
      var ol = h("ol.instr");
      WORDS.forEach(function (w, i) { ol.appendChild(h("li", CLUES[i] + " (" + w.length + ")")); });
      box.appendChild(ol);
      clueBox.appendChild(box);
      QG.clear(info);
      [["Correct cells", revealed + "/25"], ["Attempts left", attempts]].forEach(function (kv) {
        info.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "Correct", value: revealed + "/25", color: "magenta" },
        { name: "Attempts", value: attempts, color: "red" }
      ]);
    }

    function onCell(r, c) {
      if (over || busy) return;
      if (fixed[r][c]) { api.toast("That cell is collapsed", "bad", 900); return; }
      sel = [r, c];
      QG.sfx.tap();
      paint();
    }

    function pick(L) {
      if (!sel) return;
      var r = sel[0], c = sel[1];
      if (cand[r][c].indexOf(L) < 0) { api.toast(L + " is not a candidate here", "bad", 1000); return; }
      if (L === WORDS[r][c]) {
        cand[r][c] = [L];
        fixed[r][c] = true;
        revealed++;
        QG.sfx.good();
        api.log("Correct: <b>" + L + "</b> locked in.");
      } else {
        cand[r][c] = cand[r][c].filter(function (x) { return x !== L; });
        attempts--;
        QG.sfx.lose();
        api.log("<b>" + L + "</b> is wrong - that letter is now excluded.");
        api.toast("Wrong letter", "bad");
      }
      sel = null;
      paint();
      if (attempts <= 0) { over = true; api.lose("The grid locked.", "You used all three wrong-letter attempts."); return; }
      checkWin();
    }

    function checkWin() {
      for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) if (!fixed[r][c] || cand[r][c][0] !== WORDS[r][c]) return;
      over = true;
      api.setBest(attempts);
      api.win("Crossword collapsed!", "All five words measured out correctly.");
    }

    reset(); paint();
    api.setStatus("Tap a cell to see its candidate letters.");
  });

  /* ==========================================================
     38. QUANTUM MEMORY
     ========================================================== */
  QG.register("quantum-memory", function (root, api) {
    var SYM = ["\u26A1", "\u2B50", "\u{1F48E}", "\u{1F300}", "\u{1F52E}", "\u269B", "\u{1F9EC}", "\u{1F30C}"];
    var cards, flipped, matched, flips, over, busy, entangleArm, entanglePending, entangleLeft;

    function reset() {
      var deck = U.shuffle(SYM.concat(SYM));
      cards = deck.map(function (s, i) { return { id: i, sym: s, up: false, done: false }; });
      flipped = []; matched = 0; flips = 0; over = false; busy = false;
      entangleArm = false; entanglePending = -1; entangleLeft = 3;
    }
    function partnerOf(i) {
      for (var k = 0; k < cards.length; k++) if (k !== i && cards[k].sym === cards[i].sym && !cards[k].done) return k;
      return -1;
    }

    var grid = api.grid(4, 4, onCell);
    var btnRow = h("div.actions.mt12");
    var bEnt = api.btn("Entangle", "purple", function () {
      if (over || busy) return;
      if (entangleLeft <= 0) { api.toast("No entanglements left", "bad", 1000); return; }
      entangleArm = !entangleArm;
      entanglePending = -1;
      api.log("Entangle armed - tap two face-down cards to link them.");
      paint();
    });
    btnRow.appendChild(bEnt);
    var info = h("div.hud.mt12");

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM MEMORY"),
      h("span.badge", "Flip pairs to match")
    ));
    root.appendChild(h("div.small.muted.tc.mt8", "Entangled pairs glow. ENTANGLE links two hidden cards so they will match each other."));
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(btnRow);
    root.appendChild(info);

    function paint() {
      for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
        var i = r * 4 + c, card = cards[i], cls = "cell", html = "";
        if (card.done) {
          cls += " is-measured";
          html = "<span style='font-size:1.1em;opacity:.55'>" + card.sym + "</span>";
        } else if (card.up) {
          cls += " is-sel";
          html = "<span style='font-size:1.35em'>" + card.sym + "</span>";
        } else {
          cls += " is-super";
          html = "<span style='font-size:1.1em;opacity:.6'>?</span>";
        }
        if (i === entanglePending) cls += " is-target";
        grid.set(r, c, html, cls.replace(/^cell\s?/, ""));
      }
      bEnt.innerHTML = entangleArm ? "\u2713 pick two cards" : "Entangle (" + entangleLeft + ")";
      QG.clear(info);
      [["Flips", flips], ["Pairs", matched + "/8"], ["Entanglements", entangleLeft]].forEach(function (kv) {
        info.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "Flips", value: flips, color: "purple" },
        { name: "Pairs", value: matched + "/8", color: "lime" }
      ]);
    }

    function doEntangle(a, b) {
      if (a === b) return;
      var partner = partnerOf(a);
      if (partner < 0) { api.toast("That card has no partner left", "bad", 1100); return; }
      // swap b's symbol with a's current partner so the multiset stays intact
      var tmp = cards[b].sym;
      cards[b].sym = cards[a].sym;
      cards[partner].sym = tmp;
      entangleLeft--;
      entangleArm = false;
      entanglePending = -1;
      api.log("You <b>entangled</b> two cards - they now share a symbol.");
      QG.sfx.teleport();
      paint();
    }

    function onCell(r, c) {
      if (over || busy) return;
      var i = r * 4 + c, card = cards[i];
      if (card.done) return;
      if (entangleArm) {
        if (card.up) { api.toast("Pick face-down cards", "bad", 900); return; }
        if (entanglePending < 0) { entanglePending = i; QG.sfx.tap(); paint(); return; }
        doEntangle(entanglePending, i);
        return;
      }
      if (card.up) return;
      card.up = true;
      flips++;
      flipped.push(i);
      QG.sfx.tap();
      paint();
      if (flipped.length === 2) {
        busy = true;
        var a = flipped[0], b = flipped[1];
        api.after(620, function () {
          if (cards[a].sym === cards[b].sym) {
            cards[a].done = true; cards[b].done = true;
            matched++;
            QG.sfx.good();
            api.log("Pair found.");
          } else {
            cards[a].up = false; cards[b].up = false;
            QG.sfx.tick();
          }
          flipped = []; busy = false;
          paint();
          if (matched === 8) {
            over = true;
            api.setBest(flips);
            api.win("Board cleared!", "You found all 8 pairs in " + flips + " flips.");
          }
        });
      }
    }

    reset(); paint();
    api.setStatus("Flip two cards. Remember where the pairs are.");
  });

  /* ==========================================================
     39. QUANTUM TREASURE HUNT
     ========================================================== */
  QG.register("quantum-treasure-hunt", function (root, api) {
    var N = 10;
    var treasure, candidates, digs, clues, interferes, over, busy, showHeat, eliminatedRows, eliminatedCols;

    function reset() {
      treasure = U.int(N * N);
      candidates = [];
      candidates.push(treasure);
      while (candidates.length < 4) {
        var x = U.int(N * N);
        if (candidates.indexOf(x) < 0) candidates.push(x);
      }
      eliminatedRows = {}; eliminatedCols = {};
      digs = 8; clues = 3; interferes = 2; over = false; busy = false; showHeat = true;
    }
    function heat(i) {
      if (candidates.indexOf(i) >= 0) return 1;
      var r = Math.floor(i / N), c = i % N, best = 0;
      candidates.forEach(function (k) {
        var kr = Math.floor(k / N), kc = k % N;
        var d = Math.abs(kr - r) + Math.abs(kc - c);
        best = Math.max(best, Math.max(0, 1 - d / 5) * 0.55);
      });
      return best;
    }

    var grid = api.grid(N, N, onDig);
    var btnRow = h("div.actions.mt12");
    var bClue = api.btn("Clue (3)", "purple", function () {
      if (over || busy || clues <= 0) { if (clues <= 0) api.toast("No clues left", "bad"); return; }
      clues--;
      var rowsWith = {}, colsWith = {};
      candidates.forEach(function (k) { rowsWith[Math.floor(k / N)] = 1; colsWith[k % N] = 1; });
      var freeRows = [], freeCols = [];
      for (var r = 0; r < N; r++) if (!rowsWith[r]) freeRows.push(r);
      for (var c = 0; c < N; c++) if (!colsWith[c]) freeCols.push(c);
      var msg;
      if (freeRows.length && (!freeCols.length || Math.random() < 0.5)) {
        var rr = U.pick(freeRows); eliminatedRows[rr] = 1;
        msg = "Row " + (rr + 1) + " is clean - no treasure there.";
      } else if (freeCols.length) {
        var cc = U.pick(freeCols); eliminatedCols[cc] = 1;
        msg = "Column " + String.fromCharCode(65 + cc) + " is clean.";
      } else { msg = "No clean lines left - the cloud is tight."; }
      api.log(msg);
      api.toast(msg, "quantum", 1700);
      QG.sfx.good();
      paint();
    });
    var bInterfere = api.btn("Interfere (2)", "cyan", function () {
      if (over || busy || interferes <= 0) { if (interferes <= 0) api.toast("No interference left", "bad"); return; }
      interferes--;
      candidates = [candidates[0]];
      while (candidates.length < 4) {
        var x = U.int(N * N);
        if (candidates.indexOf(x) < 0) candidates.push(x);
      }
      api.log("You <b>interfered</b> - the possibility cloud reshuffled.");
      QG.sfx.teleport();
      paint();
    });
    var bHeat = api.btn("Heatmap: on", "ghost", function () {
      showHeat = !showHeat;
      bHeat.innerHTML = "Heatmap: " + (showHeat ? "on" : "off");
      paint();
    });
    btnRow.appendChild(bClue); btnRow.appendChild(bInterfere); btnRow.appendChild(bHeat);

    var eliminatedRows, eliminatedCols;
    var info = h("div.hud.mt12");

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM TREASURE HUNT"),
      h("span.badge", "4 possible locations")
    ));
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(btnRow);
    root.appendChild(info);

    function paint() {
      for (var i = 0; i < N * N; i++) {
        var r = Math.floor(i / N), c = i % N, cls = "cell cell--dark", html = "";
        var dead = eliminatedRows[r] || eliminatedCols[c];
        if (dead) { cls += " is-hint"; html = "<span style='opacity:.3'>\u2013</span>"; }
        else if (showHeat && heat(i) > 0.12) {
          var hv = heat(i);
          cls += " is-super";
          html = "<span style='font-size:.55em;opacity:.85'>" + Math.round(hv * 100) + "</span>";
        }
        grid.set(r, c, html, cls.replace(/^cell\s?/, ""));
      }
      QG.clear(info);
      [["Digs left", digs], ["Clues", clues], ["Interference", interferes], ["Possibilities", candidates.length]].forEach(function (kv) {
        info.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "Digs", value: digs, color: "orange" },
        { name: "Possibilities", value: candidates.length, color: "purple" }
      ]);
    }

    function onDig(r, c) {
      if (over || busy) return;
      var i = r * N + c;
      if (eliminatedRows[r] || eliminatedCols[c]) { api.toast("You ruled that line out", "bad", 1000); return; }
      digs--;
      if (i === treasure) {
        over = true;
        api.setBest(8 - digs);
        QG.sfx.win();
        api.win("Treasure found!", "It was at " + String.fromCharCode(65 + c) + (r + 1) + " with " + digs + " digs to spare.");
        return;
      }
      if (candidates.indexOf(i) >= 0) {
        candidates = candidates.filter(function (k) { return k !== i; });
        api.log("Nothing here - one possibility <b>collapsed</b>. " + candidates.length + " left.");
        api.toast("Miss. " + candidates.length + " possibilities left.", "bad");
      } else {
        api.log("Cold. " + String.fromCharCode(65 + c) + (r + 1) + " was never a candidate - the cloud grew back.");
        api.toast("Cold - a new possibility appeared", "bad");
        if (candidates.length < 4) {
          var x = U.int(N * N);
          var guard = 0;
          while ((candidates.indexOf(x) >= 0 || x === treasure) && guard++ < 60) x = U.int(N * N);
          candidates.push(x);
        }
      }
      QG.sfx.tick();
      paint();
      if (digs <= 0) {
        over = true;
        api.lose("Out of digs.", "The treasure was at " + String.fromCharCode(65 + (treasure % N)) + (Math.floor(treasure / N) + 1) + ".");
      }
    }

    reset(); paint();
    bHeat.innerHTML = "Heatmap: on";
    api.setStatus("Tap a square to dig. The numbers are the odds.");
  });

  /* ==========================================================
     40. QUANTUM INDIAN TREASURE HUNT
     ========================================================== */
  QG.register("quantum-indian-treasure", function (root, api) {
    var SITES = [
      { n: "Hampi", emoji: "\u{1F6D5}" },
      { n: "Konark", emoji: "\u2600\uFE0F" },
      { n: "Taj Mahal", emoji: "\u{1F54C}" },
      { n: "Meenakshi Temple", emoji: "\u{1F6AA}" },
      { n: "Sanchi Stupa", emoji: "\u26A9" },
      { n: "Sundarbans", emoji: "\u{1F405}" }
    ];
    var SPOTS = ["North gate", "Sunken well", "Stone carving"];

    var site, relic, eliminated, myRelics, aiRelics, aiT, entangleLeft, over, busy, log, vault;

    function reset() {
      site = 0; myRelics = 0; aiRelics = 0; aiT = 0; entangleLeft = 1; over = false; busy = false;
      log = []; vault = false;
      newSite();
    }
    function newSite() {
      relic = U.int(3);
      eliminated = [false, false, false];
      entangleLeft = 1;
    }

    var spotRow = h("div.row.gap10.mt12", { style: "justify-content:center" });
    var btnRow = h("div.actions.mt12");
    var bMeasure = api.btn("Measure", "magenta", function () {
      if (over || busy) return;
      collect("You measured the relic out", 1);
    });
    var bEntangle = api.btn("Entangle (1)", "purple", function () {
      if (over || busy) return;
      if (entangleLeft <= 0) { api.toast("Already entangled this site", "bad", 1100); return; }
      if (!eliminated.some(function (e) { return e; })) { api.toast("Eliminate one spot first", "bad", 1200); return; }
      entangleLeft--;
      collect("You entangled the relic to a known-safe spot", 0);
    });
    btnRow.appendChild(bMeasure); btnRow.appendChild(bEntangle);

    var track = h("div.mt12");
    var info = h("div.hud.mt12");

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "INDIAN TREASURE HUNT"),
      h("span.badge", "Race the AI for 6 relics")
    ));
    root.appendChild(track);
    root.appendChild(h("div.small.muted.tc.mt8", "Tap a spot to search it. MEASURE takes it now but speeds the AI up."));
    root.appendChild(spotRow);
    root.appendChild(btnRow);
    root.appendChild(info);

    function paint() {
      QG.clear(track);
      var strip = h("div.row.gap8", { style: "justify-content:center;flex-wrap:nowrap;overflow-x:auto" });
      SITES.forEach(function (s, i) {
        var st = i < site ? "done" : i === site ? "now" : "todo";
        var box = h("div", {
          style: "flex:0 0 auto;text-align:center;padding:6px 8px;border:var(--bd-thin);border-radius:8px;" +
            "background:" + (st === "done" ? PAL.lime : st === "now" ? PAL.yellow : "var(--card)") + ";" +
            (st === "done" ? "opacity:.7;" : "")
        },
          h("div", { style: "font-size:1.2rem" }, s.emoji),
          h("div", { style: "font-size:.56rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;max-width:74px;line-height:1.1" }, s.n)
        );
        strip.appendChild(box);
      });
      track.appendChild(strip);

      QG.clear(spotRow);
      SPOTS.forEach(function (name, i) {
        var dead = eliminated[i];
        var b = api.btn(name, dead ? "ghost" : "cyan", function () { search(i); }, {
          disabled: dead || over || busy,
          style: "min-width:120px" + (dead ? ";opacity:.4;text-decoration:line-through" : "")
        });
        spotRow.appendChild(b);
      });

      paintInfo();
    }

    function paintInfo() {
      QG.clear(info);
      [["Your relics", myRelics + "/6"], ["AI relics", aiRelics + "/6"],
       ["Next AI relic", Math.max(0, (5.5 - aiT / 1000)).toFixed(1) + "s"],
       ["Entangle", entangleLeft]].forEach(function (kv) {
        info.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "You", value: myRelics + "/6", color: "magenta" },
        { name: "AI", value: aiRelics + "/6", color: "orange" }
      ]);
    }

    function search(i) {
      if (over || busy || eliminated[i]) return;
      if (i === relic) { collect("You found the relic at the " + SPOTS[i], 0); return; }
      eliminated[i] = true;
      QG.sfx.tick();
      api.log("Nothing at the <b>" + SPOTS[i] + "</b> - that possibility collapsed.");
      api.toast("Not there. " + (eliminated.filter(function (e) { return !e; }).length) + " spots left.", "bad", 1300);
      paint();
    }

    function collect(msg, aiPenalty) {
      myRelics++;
      if (aiPenalty) aiT += aiPenalty * 1600;
      QG.sfx.good();
      api.log(msg + " - relic " + myRelics + "/6 collected.");
      api.toast("Relic " + myRelics + "/6!", "good");
      site++;
      if (myRelics >= 6) { over = true; api.setBest("all 6"); api.win("All six relics!", "You beat the AI to the vault."); return; }
      if (site >= SITES.length) site = SITES.length - 1;
      newSite();
      paint();
      api.setStatus("Site " + (site + 1) + ": " + SITES[site].n + ". Search or measure.");
    }

    var aiTicker = api.every(250, function () {
      if (over) return;
      aiT += 250;
      if (aiT >= 5500) {
        aiT = 0;
        aiRelics++;
        api.log("The AI pulled a relic out. " + aiRelics + "/6.");
        QG.sfx.zap();
        if (aiRelics >= 6) { over = true; api.lose("The AI reached the vault first.", "Six relics to the AI - use ENTANGLE earlier next time."); return; }
      }
      paintInfo();
    });
    api.onCleanup(aiTicker);

    reset(); paint();
    api.setStatus("Site 1: Hampi. Search the spots or MEASURE the relic out.");
  });
})();
