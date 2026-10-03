/* ============================================================
   QUANTUM ARCADE — games/pack5.js
   21 Quantum Pallanguzhi   22 Quantum Teen Patti
   23 Quantum Snakes & Ladders
   24 Quantum Raja-Mantri-Chor-Sipahi   25 Quantum Checkers
   ============================================================ */
(function () {
  "use strict";
  var QG = window.QG, h = QG.h, PAL = QG.PAL, U = QG.U;

  /* ==========================================================
     21. QUANTUM PALLANGUZHI
     ========================================================== */
  QG.register("quantum-pallanguzhi", function (root, api) {
    /* pits 0-6 = your bottom row (left to right), 7-13 = AI top row.
       LOOP is the counter-clockwise sowing circuit. */
    var LOOP = [0, 1, 2, 3, 4, 5, 6, 13, 12, 11, 10, 9, 8, 7];
    var pits, qseeds, store, turn, over, busy, moves, shimmer, lastPit;

    function ownerOf(p) { return p < 7 ? "you" : "ai"; }

    function reset() {
      pits = [];
      for (var i = 0; i < 14; i++) pits.push(5);
      qseeds = []; store = { you: 0, ai: 0 };
      turn = "you"; over = false; busy = false; moves = 0; shimmer = 0; lastPit = -1;
    }

    function qcount(p) {
      var n = 0;
      for (var i = 0; i < qseeds.length; i++) if (qseeds[i].a === p || qseeds[i].b === p) n++;
      return n;
    }
    function pitTotal() {
      var s = 0;
      for (var i = 0; i < 14; i++) s += pits[i];
      return s;
    }
    function rowSeeds(who) {
      var s = 0;
      for (var i = 0; i < 14; i++) if (ownerOf(i) === who) s += pits[i];
      return s;
    }

    /* ---------- sowing ---------- */
    function sow(start) {
      var n = pits[start];
      if (n <= 0) return 0;
      pits[start] = 0;
      var at = LOOP.indexOf(start), made = 0;
      for (var k = 1; k <= n; k++) {
        var t = LOOP[(at + k) % 14];
        if (k % 4 === 0) {
          qseeds.push({ a: t, b: LOOP[(at + k + 1) % 14] });
          made++;
        } else {
          pits[t]++;
        }
      }
      lastPit = LOOP[(at + n) % 14];
      return made;
    }

    /* ---------- measurement: collapse every quantum seed ---------- */
    function collapse() {
      var list = qseeds.slice(), got = { you: 0, ai: 0 }, n = 0;
      qseeds = [];
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        var ca = pits[s.a], cb = pits[s.b];
        var w = ca === cb ? [1, 1] : (ca > cb ? [7, 3] : [3, 7]);
        var q = new QG.Qubit(QG.C.re(Math.sqrt(w[0])), QG.C.re(Math.sqrt(w[1])));
        var pick = q.measure() === 0 ? s.a : s.b;
        pits[pick]++;
        n++;
        var pair = [s.a, s.b];
        for (var j = 0; j < 2; j++) {
          var p = pair[j];
          if (pits[p] === 4) {
            var who = ownerOf(p);
            store[who] += 4; got[who] += 4; pits[p] = 0;
          }
        }
      }
      return { n: n, got: got };
    }

    /* ---------- AI greedy evaluation ---------- */
    function simulate(start, who) {
      var p = pits.slice();
      var n = p[start]; p[start] = 0;
      var at = LOOP.indexOf(start), score = 0, qs = [];
      for (var k = 1; k <= n; k++) {
        var t = LOOP[(at + k) % 14];
        if (k % 4 === 0) qs.push([t, LOOP[(at + k + 1) % 14]]);
        else { p[t]++; score += ownerOf(t) === who ? 1.2 : -1; }
      }
      for (var j = 0; j < qs.length; j++) {
        var a = qs[j][0], b = qs[j][1];
        var wa = p[a] > p[b] ? 0.7 : (p[b] > p[a] ? 0.3 : 0.5);
        score += wa * (ownerOf(a) === who ? 1.2 : -1) + (1 - wa) * (ownerOf(b) === who ? 1.2 : -1);
      }
      for (var m = 0; m < 14; m++) if (ownerOf(m) === who && p[m] === 4) score += 2.5;
      return score;
    }

    /* ---------- UI ---------- */
    var grid = api.grid(7, 2, onPit);
    var aiStoreEl = h("div.hud__item", h("div.hud__k", "AI STORE"), h("div.hud__v", "0"));
    var youStoreEl = h("div.hud__item", h("div.hud__k", "YOUR STORE"), h("div.hud__v", "0"));
    var hud = h("div.hud.mt12");
    var btnRow = h("div.actions.mt12");
    var bMeasure = api.btn("Measure", "cyan", function () {
      if (over || busy || turn !== "you") { api.toast("Not your turn", "bad", 900); return; }
      if (!qseeds.length) { api.toast("No quantum seeds on the board", "bad", 900); return; }
      measure("you");
      if (!checkEnd()) api.setStatus("Collapsed. Tap a pit to sow.");
    });
    btnRow.appendChild(bMeasure);

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM PALLANGUZHI"),
      h("span.badge", "You own the bottom row")
    ));
    root.appendChild(h("div.hud.mt12", aiStoreEl));
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(h("div.hud.mt12", youStoreEl));
    root.appendChild(h("div.small.muted.tc.mt8", "Tap a lime pit to sow. \u25C8 = quantum seed, sitting in two pits until measured. 4 seeds in a pit after a collapse are captured."));
    root.appendChild(btnRow);
    root.appendChild(hud);

    api.every(160, function () {
      shimmer = shimmer ? 0 : 1;
      var els = grid.el.querySelectorAll(".qseed");
      for (var i = 0; i < els.length; i++) els[i].style.opacity = shimmer ? "1" : "0.35";
    });

    function paint() {
      for (var r = 0; r < 2; r++) {
        for (var c = 0; c < 7; c++) {
          var p = r === 0 ? 13 - c : c;
          var qc = qcount(p);
          var cls = r === 0 ? "cell--dark" : "";
          if (ownerOf(p) === "you") cls += " is-hint";
          if (p === lastPit && pits[p] > 0) cls += " is-sel";
          var inner = "<b>" + pits[p] + "</b>";
          if (qc > 0) {
            var marks = "";
            for (var k = 0; k < qc; k++) marks += "\u25C8";
            inner += "<span class='qseed' style='font-size:.55em;color:" + PAL.purple + ";letter-spacing:1px'>" + marks + "</span>";
          }
          grid.set(r, c, "<span style='display:flex;flex-direction:column;align-items:center;line-height:1.05'>" + inner + "</span>", cls);
        }
      }
      aiStoreEl.lastChild.textContent = String(store.ai);
      youStoreEl.lastChild.textContent = String(store.you);
      QG.clear(hud);
      [["Turn", turn === "you" ? "YOU" : "AI"], ["Quantum seeds", qseeds.length],
       ["Seeds in pits", pitTotal()], ["Sowings", moves]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "You", value: store.you, color: "lime", turn: turn === "you" },
        { name: "AI", value: store.ai, color: "magenta", turn: turn === "ai" },
        { name: "Quantum", value: qseeds.length, color: "purple" }
      ]);
    }

    function measure(who) {
      var r = collapse();
      api.log((who === "you" ? "You" : "AI") + " <b>measured</b>: " + r.n + " seed" + (r.n === 1 ? "" : "s") +
        " collapsed" + (r.got.you || r.got.ai ? " - captured " + r.got.you + " for you, " + r.got.ai + " for the AI." : "."));
      QG.sfx.measure();
      paint();
    }

    function endGame(why) {
      over = true; busy = false; paint();
      api.setBest(store.you);
      if (store.you > store.ai) api.win("Harvest complete!", "You banked " + store.you + " seeds to the AI's " + store.ai + ". " + why);
      else if (store.you < store.ai) api.lose("The AI out-harvested you.", "AI " + store.ai + " seeds, you " + store.you + ". " + why);
      else api.overlay({ title: "Perfectly balanced", sub: "Both stores hold " + store.you + " seeds. " + why,
        actions: [{ label: "Play again", kind: "lime", onClick: api.restart }] });
    }

    function checkEnd() {
      var dry = pitTotal() === 0;
      var mine = turn === "you" ? rowSeeds("you") : rowSeeds("ai");
      if (dry || mine === 0 || moves > 180) {
        endGame(dry ? "The pits ran dry." : (mine === 0 ? "No seeds left to sow." : "Sowing limit reached."));
        return true;
      }
      return false;
    }

    function aiTurn() {
      if (over) return;
      var best = null, bestScore = -1e9;
      for (var i = 7; i < 14; i++) {
        if (pits[i] <= 0) continue;
        var sc = simulate(i, "ai");
        if (sc > bestScore) { bestScore = sc; best = i; }
      }
      if (best === null) { endGame("The AI had no seeds left to sow."); return; }
      var made = sow(best);
      moves++;
      api.log("AI sowed pit " + (best + 1) + " - " + made + " quantum seed" + (made === 1 ? "" : "s") + ".");
      QG.sfx.tick();
      paint();
      var willMeasure = qseeds.length > 0 && Math.random() < 0.72;
      api.after(willMeasure ? 460 : 280, function () {
        if (over) return;
        if (willMeasure) measure("ai");
        turn = "you";
        if (checkEnd()) return;
        busy = false;
        api.setStatus("Your move. Tap one of your pits to sow.");
        paint();
      });
    }

    function onPit(r, c) {
      if (over || busy || turn !== "you") return;
      var p = r === 0 ? 13 - c : c;
      if (ownerOf(p) !== "you") { api.toast("That is the AI's row", "bad", 900); return; }
      if (pits[p] <= 0) { api.toast("That pit is empty", "bad", 900); return; }
      var made = sow(p);
      moves++;
      api.log("You sowed pit " + (p + 1) + " - " + made + " quantum seed" + (made === 1 ? "" : "s") + ".");
      QG.sfx.click();
      paint();
      turn = "ai";
      if (checkEnd()) return;
      busy = true;
      api.setStatus("AI is sowing...");
      paint();
      api.after(640, aiTurn);
    }

    reset(); paint();
    api.setStatus("Your move. Tap one of your lime pits to sow its seeds.");
  });

  /* ==========================================================
     22. QUANTUM TEEN PATTI
     ========================================================== */
  QG.register("quantum-teen-patti", function (root, api) {
    var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    var RV = [14, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    var SUITS = ["\u2660", "\u2665", "\u2666", "\u2663"];
    var RED = [false, true, true, false];
    var CATS = ["", "High Card", "Pair", "Colour", "Sequence", "Pure Sequence", "Trail"];
    var MAX_HANDS = 10;

    var you, ai, hand, pot, chips, sel, measuresUsed, over, busy, revealed, raises, handResult;

    function newCard() {
      var a = U.int(13), b = U.int(13);
      while (b === a) b = U.int(13);
      return {
        a: a, b: b, suit: U.int(4), measured: false, rank: -1,
        q: new QG.Qubit(QG.C.re(1), QG.C.re(1))
      };
    }
    function cardVal(c) { return c.measured ? RV[c.rank] : (RV[c.a] + RV[c.b]) / 2; }
    function measureCard(c) {
      if (c.measured) return false;
      c.rank = c.q.measure() === 0 ? c.a : c.b;
      c.measured = true;
      return true;
    }
    function evalHand(cards) {
      var v = [cardVal(cards[0]), cardVal(cards[1]), cardVal(cards[2])];
      var s = v.slice().sort(function (x, y) { return x - y; });
      var flush = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
      var trail = s[2] - s[0] < 0.01;
      var d1 = s[1] - s[0], d2 = s[2] - s[1];
      var straight = d1 > 0.65 && d1 < 1.35 && d2 > 0.65 && d2 < 1.35;
      var pair = Math.abs(s[1] - s[0]) < 0.01 || Math.abs(s[2] - s[1]) < 0.01;
      var cat;
      if (trail) cat = 6;
      else if (straight && flush) cat = 5;
      else if (straight) cat = 4;
      else if (flush) cat = 3;
      else if (pair) cat = 2;
      else cat = 1;
      return { cat: cat, score: cat * 1000 + s[0] + s[1] + s[2] + s[2] * 0.01 };
    }
    function aiChooseMeasures(cards) {
      var order = [0, 1, 2].sort(function (x, y) {
        return Math.max(RV[cards[y].a], RV[cards[y].b]) - Math.max(RV[cards[x].a], RV[cards[x].b]);
      });
      return order.slice(0, 2);
    }

    /* ---------- cards on screen ---------- */
    function mkCard(c, opts) {
      var el = h("div.pcard");
      if (opts.back) { el.className = "pcard is-back"; return el; }
      el.style.backgroundImage = c.measured ? "" : "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(139,92,246,.35) 5px, rgba(139,92,246,.35) 10px)";
      if (opts.picked) { el.style.outline = "3px dashed " + PAL.magenta; el.style.outlineOffset = "-4px"; }
      var suitColor = RED[c.suit] ? PAL.red : "var(--ink)";
      var top = c.measured ? RANKS[c.rank] : RANKS[c.a];
      var bot = c.measured ? RANKS[c.rank] : RANKS[c.b];
      el.appendChild(h("span.pcard__corner", { style: "color:" + suitColor }, top));
      el.appendChild(h("span.pcard__corner.pcard__corner--br", { style: "color:" + suitColor }, bot));
      var mid = c.measured ? RANKS[c.rank] : (RANKS[c.a] + "\u2502" + RANKS[c.b]);
      el.appendChild(h("span", { style: "font-size:" + (c.measured ? "1.5rem" : "1.05rem") + ";line-height:1" }, mid));
      el.appendChild(h("span", { style: "position:absolute;top:50%;left:0;right:0;transform:translateY(14px);font-size:.62rem;font-family:var(--font-body);color:" + suitColor }, SUITS[c.suit]));
      el.appendChild(h("span", { style: "position:absolute;bottom:3px;left:0;right:0;font-size:.5rem;font-family:var(--font-body);letter-spacing:.06em;color:var(--ink-faint)" },
        c.measured ? "measured" : "superposed"));
      return el;
    }

    var youRow = h("div.row.gap8.mt12", { style: "justify-content:center" });
    var aiRow = h("div.row.gap8.mt12", { style: "justify-content:center" });
    var readout = h("div.panel.mt12");
    var btnRow = h("div.actions.mt12");
    var bMeasure = api.btn("Measure", "purple", function () {
      if (over || busy) return;
      if (sel < 0) { api.toast("Tap a card first", "bad", 900); return; }
      if (measuresUsed >= 2) { api.toast("Only 2 measurements per hand", "bad", 1000); return; }
      if (you[sel].measured) { api.toast("That card is already definite", "bad", 900); return; }
      measureCard(you[sel]);
      measuresUsed++;
      api.log("You measured card " + (sel + 1) + " \u2192 <b>" + RANKS[you[sel].rank] + "</b>.");
      QG.sfx.measure();
      sel = -1;
      paint();
      api.setStatus(measuresUsed + "/2 measured. BET, CALL or FOLD.");
    });
    var bBet = api.btn("Bet +10", "lime", playerBet);
    var bCall = api.btn("Call", "cyan", playerCall);
    var bFold = api.btn("Fold", "magenta", playerFold);
    btnRow.appendChild(bMeasure); btnRow.appendChild(bBet); btnRow.appendChild(bCall); btnRow.appendChild(bFold);

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM TEEN PATTI"),
      h("span.badge", "Rank is undecided")
    ));
    root.appendChild(h("div.marker.mt12", { style: "font-size:.8rem" }, "AI"));
    root.appendChild(aiRow);
    root.appendChild(h("div.marker.mt16", { style: "font-size:.8rem" }, "YOU"));
    root.appendChild(youRow);
    root.appendChild(readout);
    root.appendChild(btnRow);

    function paint() {
      QG.clear(aiRow); QG.clear(youRow);
      for (var i = 0; i < 3; i++) {
        var showBack = !revealed && !over;
        var el = mkCard(ai[i], { back: showBack });
        if (!showBack) el.style.opacity = "0.92";
        aiRow.appendChild(el);
      }
      for (var j = 0; j < 3; j++) {
        (function (jj) {
          var c = you[jj];
          var el = mkCard(c, { picked: jj === sel });
          el.addEventListener("click", function () {
            if (over || busy) return;
            if (c.measured) { api.toast("Already measured", "bad", 800); return; }
            sel = jj; QG.sfx.tap(); paint();
          });
          youRow.appendChild(el);
        })(j);
      }
      QG.clear(readout);
      readout.appendChild(h("div.hud__k", "YOUR HAND SO FAR"));
      var ev = evalHand(you);
      var txt = CATS[ev.cat];
      var pending = you.filter(function (c) { return !c.measured; }).length;
      readout.appendChild(h("div", { style: "font-size:.9rem;font-weight:700;margin-top:4px" },
        txt + (pending ? " (with " + pending + " card" + (pending === 1 ? "" : "s") + " at their average)" : " - fully measured")));
      readout.appendChild(h("div.small.muted.mt8",
        "Values: " + you.map(function (c) { return cardVal(c).toFixed(1); }).join(" / ")));
      QG.clear(hud);
      hud.appendChild(h("div.hud__item", h("div.hud__k", "Hand"), h("div.hud__v", hand + "/" + MAX_HANDS)));
      hud.appendChild(h("div.hud__item", h("div.hud__k", "Pot"), h("div.hud__v", String(pot))));
      hud.appendChild(h("div.hud__item", h("div.hud__k", "Your chips"), h("div.hud__v", String(chips.you))));
      hud.appendChild(h("div.hud__item", h("div.hud__k", "AI chips"), h("div.hud__v", String(chips.ai))));
      api.setScores([
        { name: "You", value: chips.you, color: "cyan", turn: !busy },
        { name: "AI", value: chips.ai, color: "red", turn: busy },
        { name: "Pot", value: pot, color: "yellow" }
      ]);
      bMeasure.innerHTML = "Measure (" + measuresUsed + "/2)";
      bBet.disabled = busy || over; bCall.disabled = busy || over; bFold.disabled = busy || over;
      bMeasure.disabled = busy || over || measuresUsed >= 2;
    }

    var hud = h("div.hud.mt12");
    root.appendChild(hud);

    function newHand() {
      if (over) return;
      hand++;
      if (hand > MAX_HANDS) { finish("Ten hands played."); return; }
      you = [newCard(), newCard(), newCard()];
      ai = [newCard(), newCard(), newCard()];
      sel = -1; measuresUsed = 0; pot = 0; raises = 0; revealed = false; busy = false; handResult = "";
      var ay = Math.min(10, chips.you), aa = Math.min(10, chips.ai);
      chips.you -= ay; chips.ai -= aa; pot += ay + aa;
      aiChooseMeasures(ai).forEach(function (i) { measureCard(ai[i]); });
      api.log("<b>Hand " + hand + "</b> - antes " + ay + " / " + aa + ". Pot " + pot + ".");
      paint();
      api.setStatus("Tap a card, MEASURE it, then BET, CALL or FOLD.");
    }

    function playerBet() {
      if (over || busy) return;
      var cost = Math.min(10, chips.you);
      chips.you -= cost; pot += cost; raises++;
      api.log("You bet " + cost + ". Pot " + pot + ".");
      QG.sfx.click();
      paint();
      if (raises >= 4) { api.setStatus("Raise cap reached - AI calls."); busy = true; paint(); api.after(520, aiCall); return; }
      busy = true;
      api.setStatus("AI is deciding...");
      paint();
      api.after(620, aiRespond);
    }
    function playerCall() {
      if (over || busy) return;
      var cost = Math.min(10, chips.you);
      chips.you -= cost; pot += cost;
      api.log("You called with " + cost + ". Pot " + pot + ".");
      busy = true;
      paint();
      showdown();
    }
    function playerFold() {
      if (over || busy) return;
      var p = pot;
      chips.ai += p; pot = 0;
      api.log("You <b>folded</b> - the AI takes the pot of " + p + ".");
      QG.sfx.lose();
      busy = true; revealed = true;
      paint();
      api.after(700, afterHand);
    }

    function strength(cards) {
      var sc = evalHand(cards).score;
      return U.clamp((sc - 1020) / 5000, 0, 1);
    }
    function aiRespond() {
      if (over) { busy = false; return; }
      var st = strength(ai), r = Math.random();
      if (st < 0.28) { if (r < 0.62) return aiFold(); return aiCall(); }
      if (st < 0.55) { if (r < 0.6) return aiCall(); return aiRaise(); }
      if (r < 0.4) return aiCall();
      return aiRaise();
    }
    function aiFold() {
      var p = pot;
      chips.you += p; pot = 0;
      api.log("AI <b>folded</b> - you take the pot of " + p + ".");
      QG.sfx.good();
      revealed = true;
      paint();
      api.after(700, afterHand);
    }
    function aiCall() {
      var cost = Math.min(10, chips.ai);
      chips.ai -= cost; pot += cost;
      api.log("AI called with " + cost + ". Pot " + pot + ".");
      paint();
      showdown();
    }
    function aiRaise() {
      var cost = Math.min(10, chips.ai);
      chips.ai -= cost; pot += cost; raises++;
      api.log("AI raised " + cost + ". Pot " + pot + " - your move.");
      QG.sfx.tick();
      busy = false;
      paint();
      api.setStatus("The AI raised. BET again, CALL or FOLD.");
    }

    function showdown() {
      busy = true; revealed = true;
      var ys = evalHand(you), as = evalHand(ai);
      var p = pot;
      paint();
      api.log("Showdown: you <b>" + CATS[ys.cat] + "</b> vs AI <b>" + CATS[as.cat] + "</b>.");
      api.after(520, function () {
        if (ys.score > as.score) { chips.you += p; api.log("You win the pot of " + p + "!"); QG.sfx.good(); }
        else if (as.score > ys.score) { chips.ai += p; api.log("AI wins the pot of " + p + "."); QG.sfx.lose(); }
        else { var half = Math.floor(p / 2); chips.you += half; chips.ai += p - half; api.log("Split pot."); }
        pot = 0;
        paint();
        api.after(760, afterHand);
      });
    }

    function afterHand() {
      if (over) return;
      if (chips.ai <= 0) { over = true; api.setBest(chips.you); paint(); api.win("You busted the AI!", "The AI is out of chips after " + hand + " hand" + (hand === 1 ? "" : "s") + "."); return; }
      if (chips.you <= 0) { over = true; paint(); api.lose("You are busted.", "The AI cleaned you out in " + hand + " hand" + (hand === 1 ? "" : "s") + "."); return; }
      newHand();
    }
    function finish(why) {
      over = true; paint();
      api.setBest(chips.you);
      if (chips.you > chips.ai) api.win("Most chips!", "You finished on " + chips.you + " chips to the AI's " + chips.ai + ". " + why);
      else if (chips.you < chips.ai) api.lose("The AI has more chips.", "AI " + chips.ai + ", you " + chips.you + ". " + why);
      else api.overlay({ title: "Dead heat", sub: "Both players hold " + chips.you + " chips. " + why,
        actions: [{ label: "Play again", kind: "lime", onClick: api.restart }] });
    }

    you = []; ai = []; hand = 0; pot = 0; chips = { you: 100, ai: 100 };
    sel = -1; measuresUsed = 0; over = false; busy = false; revealed = false; raises = 0;
    newHand();
  });

  /* ==========================================================
     23. QUANTUM SNAKES & LADDERS
     ========================================================== */
  QG.register("quantum-snakes-ladders", function (root, api) {
    var LADDERS = [
      { from: 3, to: 22, q: true }, { from: 8, to: 26, q: false },
      { from: 20, to: 41, q: false }, { from: 28, to: 77, q: true },
      { from: 50, to: 91, q: false }, { from: 71, to: 92, q: false }
    ];
    var SNAKES = [
      { from: 17, to: 4 }, { from: 32, to: 10 }, { from: 49, to: 29 },
      { from: 62, to: 18 }, { from: 88, to: 67 }, { from: 95, to: 74 }
    ];
    var pos, state, rolls, dieW, lastFace, turn, over, busy, turns;

    function numAt(r, c) {
      var row = 9 - r;
      return row % 2 === 0 ? row * 10 + c + 1 : row * 10 + (10 - c);
    }
    function ladderAt(n) {
      for (var i = 0; i < LADDERS.length; i++) if (LADDERS[i].from === n) return LADDERS[i];
      return null;
    }
    function snakeAt(n) {
      for (var i = 0; i < SNAKES.length; i++) if (SNAKES[i].from === n) return SNAKES[i];
      return null;
    }

    function reset() {
      pos = { you: 0, ai: 0 };
      state = { you: null, ai: null };
      rolls = { you: 0, ai: 0 };
      dieW = [1, 1, 1, 1, 1, 1];
      lastFace = 0; turn = "you"; over = false; busy = false; turns = 0;
    }

    /* ---------- quantum die ---------- */
    function rollDie() {
      var p = QG.dist(dieW);
      var f = QG.sampleDist(p) + 1;
      for (var i = 0; i < 6; i++) dieW[i] = Math.max(0.3, dieW[i] * 0.55 + 0.45 * (0.4 + Math.random() * 1.8));
      dieW[f - 1] *= 0.55;
      lastFace = f;
      return f;
    }

    /* ---------- three-square superposition from a real 2-qubit register ---------- */
    function makeSuper(base) {
      var lo = U.clamp(base - 1, 1, 100);
      var hi = U.clamp(base + 1, 1, 100);
      var reg = new QG.QReg(2);
      var s = 1 / Math.sqrt(3);
      /* the true square carries the phase reference; a snake at the true square
         kicks it by pi so the collapse prefers the lower neighbour instead. */
      var phase = snakeAt(base) ? Math.PI : (ladderAt(base) ? 0 : Math.PI / 2);
      reg.amp[0] = QG.C.c(s, 0);
      reg.amp[1] = QG.C.scale(QG.C.expi(phase), s);
      reg.amp[2] = QG.C.c(s, 0);
      reg.amp[3] = QG.C.c(0, 0);
      reg.normalize();
      reg.apply1(0, QG.GATES.H);
      return { base: base, lo: lo, hi: hi, reg: reg };
    }
    function collapseSuper(who, penalised) {
      var st = state[who];
      if (!st) return null;
      var sq;
      if (penalised) sq = Math.min(st.lo, st.base, st.hi);
      else {
        var idx = st.reg.sample();
        sq = idx === 0 ? st.base : (idx === 1 ? st.lo : (idx === 2 ? st.hi : st.base));
      }
      state[who] = null;
      return sq;
    }
    function applySquare(n) {
      var l = ladderAt(n);
      if (l) {
        if (l.q) { var dbl = Math.min(100, l.to + (l.to - l.from)); return { pos: dbl, note: "quantum ladder \u21C8 double climb to " + dbl }; }
        return { pos: l.to, note: "ladder \u2191 to " + l.to };
      }
      var s = snakeAt(n);
      if (s) return { pos: s.to, note: "snake \u2193 to " + s.to };
      return { pos: n, note: "" };
    }

    /* ---------- UI ---------- */
    var grid = api.grid(10, 10, null);
    var dieRow = h("div.hud.mt12");
    var diracBox = h("div.dirac.mt12");
    var btnRow = h("div.actions.mt12");
    var bRoll = api.btn("Roll", "lime", playerRoll);
    var bMeasure = api.btn("Measure", "cyan", function () { playerMeasure(false); });
    btnRow.appendChild(bRoll); btnRow.appendChild(bMeasure);

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM SNAKES & LADDERS"),
      h("span.badge", "Reach 100 exactly")
    ));
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(dieRow);
    root.appendChild(diracBox);
    root.appendChild(btnRow);
    root.appendChild(h("div.small.muted.tc.mt8", "\u21C8 quantum ladder (double climb) \u00B7 \u2191 ladder \u00B7 \u2193 snake. Your token drifts in a 3-square superposition until measured."));

    function paint() {
      var youSq = state.you ? [state.you.lo, state.you.base, state.you.hi] : [pos.you];
      var aiSq = state.ai ? [state.ai.lo, state.ai.base, state.ai.hi] : [pos.ai];
      var youBright = state.you ? state.you.base : pos.you;
      var aiBright = state.ai ? state.ai.base : pos.ai;
      for (var r = 0; r < 10; r++) {
        for (var c = 0; c < 10; c++) {
          var n = numAt(r, c);
          var cls = (r + c) % 2 ? "cell--dark" : "";
          var l = ladderAt(n), s = snakeAt(n);
          if (l) cls += " is-hint";
          if (s) cls += " is-target";
          if (youSq.indexOf(n) >= 0 || aiSq.indexOf(n) >= 0) cls += " is-super";
          var badges = "";
          if (l) badges += "<span style='color:" + (l.q ? PAL.orange : PAL.green) + "'>" + (l.q ? "\u21C8" : "\u2191") + "</span>";
          if (s) badges += "<span style='color:" + PAL.red + "'>\u2193</span>";
          var toks = "";
          if (youSq.indexOf(n) >= 0) toks += "<span style='position:absolute;bottom:2px;left:3px;font-size:.5em;font-weight:700;background:" + PAL.cyan + ";color:" + PAL.ink + ";border-radius:4px;padding:0 3px;opacity:" + (n === youBright ? 1 : 0.45) + "'>Y</span>";
          if (aiSq.indexOf(n) >= 0) toks += "<span style='position:absolute;bottom:2px;right:3px;font-size:.5em;font-weight:700;background:" + PAL.magenta + ";color:#fff;border-radius:4px;padding:0 3px;opacity:" + (n === aiBright ? 1 : 0.45) + "'>A</span>";
          var html = "<span style='position:absolute;top:1px;left:4px;font-size:.5em;opacity:.6'>" + n + "</span>" +
            "<span style='font-size:.72em'>" + badges + "</span>" + toks;
          grid.set(r, c, html, cls);
        }
      }
      QG.clear(dieRow);
      var probs = QG.dist(dieW);
      for (var f = 0; f < 6; f++) {
        var box = h("div.hud__item", { style: f + 1 === lastFace ? "border-color:" + PAL.orange : "" });
        box.appendChild(h("div.hud__k", "die " + (f + 1)));
        box.appendChild(h("div.hud__v", (probs[f] * 100).toFixed(0) + "%"));
        box.appendChild(h("div", { style: "height:6px;background:var(--paper-3);border-radius:3px;overflow:hidden;margin-top:4px" },
          h("div", { style: "height:100%;width:" + (probs[f] * 100).toFixed(0) + "%;background:" + (f + 1 === lastFace ? PAL.orange : PAL.purple) })));
        dieRow.appendChild(box);
      }
      var st = state.you || state.ai;
      diracBox.textContent = st
        ? (state.you ? "You: " : "AI: ") + st.reg.dirac(2) + "  \u2192  squares " + st.lo + " | " + st.base + " | " + st.hi
        : "No superposition - roll the quantum die.";
      api.setScores([
        { name: "You", value: pos.you || 0, color: "cyan", turn: turn === "you" },
        { name: "AI", value: pos.ai || 0, color: "magenta", turn: turn === "ai" },
        { name: "Drift", value: rolls.you + "/3", color: "purple" }
      ]);
    }

    function endWin() { over = true; busy = false; paint(); api.setBest(turns); api.win("Exactly 100!", "You collapsed onto the final square after " + turns + " turns."); }
    function endLose(why) { over = true; busy = false; paint(); api.lose("The AI got there first.", why); }
    function endDraw(why) {
      over = true; busy = false; paint();
      api.overlay({ title: "Turn limit", sub: why, actions: [{ label: "Play again", kind: "lime", onClick: api.restart }] });
    }

    function playerRoll() {
      if (over || busy || turn !== "you") return;
      var f = rollDie();
      var base = pos.you + f;
      if (base > 100) base = 200 - base;
      base = U.clamp(base, 1, 100);
      state.you = makeSuper(base);
      rolls.you++;
      api.log("You rolled <b>" + f + "</b> \u2192 superposed on " + state.you.lo + " / " + state.you.base + " / " + state.you.hi + ".");
      QG.sfx.tick();
      paint();
      if (rolls.you >= 3) {
        api.setStatus("Three rolls without measuring - the token collapses!");
        api.toast("Drift limit - auto collapse!", "bad");
        busy = true;
        api.after(620, function () { playerMeasure(true); });
        return;
      }
      api.setStatus("Superposed. MEASURE to collapse, or ROLL again (drift " + rolls.you + "/3).");
    }

    function playerMeasure(auto) {
      if (over) return;
      if (!state.you) { if (!auto) api.toast("Roll the die first", "bad", 900); busy = false; return; }
      var sq = collapseSuper("you", auto);
      var res = applySquare(sq);
      if (auto) { res.pos = U.clamp(res.pos - 3, 1, 100); res.note = (res.note ? res.note + ", then " : "") + "drift penalty \u22123"; }
      pos.you = res.pos;
      api.log("You <b>measured</b> onto " + sq + (res.note ? " (" + res.note + ")" : "") + " \u2192 square " + pos.you + ".");
      QG.sfx.measure();
      rolls.you = 0;
      turns++;
      paint();
      if (pos.you === 100) { endWin(); return; }
      turn = "ai";
      busy = true;
      api.setStatus("AI is rolling...");
      paint();
      api.after(700, aiTurn);
    }

    function aiTurn() {
      if (over) return;
      rolls.ai = 0;
      aiStep();
    }
    function aiStep() {
      if (over) return;
      var f = rollDie();
      var base = pos.ai + f;
      if (base > 100) base = 200 - base;
      base = U.clamp(base, 1, 100);
      state.ai = makeSuper(base);
      rolls.ai++;
      api.log("AI rolled " + f + " \u2192 superposed on " + state.ai.lo + " / " + state.ai.base + " / " + state.ai.hi + ".");
      paint();
      var stop = rolls.ai >= 3 || Math.random() < 0.62;
      api.after(600, function () {
        if (over) return;
        if (stop) aiMeasure(rolls.ai >= 3);
        else aiStep();
      });
    }
    function aiMeasure(auto) {
      if (over) return;
      var sq = collapseSuper("ai", auto);
      var res = applySquare(sq);
      if (auto) res.pos = U.clamp(res.pos - 3, 1, 100);
      pos.ai = res.pos;
      api.log("AI measured onto " + sq + (res.note ? " (" + res.note + ")" : "") + " \u2192 square " + pos.ai + ".");
      rolls.ai = 0;
      turns++;
      paint();
      if (pos.ai === 100) { endLose("The AI collapsed onto square 100 first."); return; }
      if (turns > 70) {
        if (pos.you > pos.ai) endWin();
        else if (pos.you < pos.ai) endLose("The turn limit hit with the AI ahead.");
        else endDraw("Both tokens stalled at square " + pos.you + ".");
        return;
      }
      turn = "you"; busy = false;
      api.setStatus("Your turn. ROLL the quantum die.");
      paint();
    }

    reset(); paint();
    api.setStatus("ROLL the quantum die, then MEASURE to collapse onto one square.");
  });

  /* ==========================================================
     24. QUANTUM RAJA-MANTRI-CHOR-SIPAHI
     ========================================================== */
  QG.register("quantum-rmcs", function (root, api) {
    var ROLES = [
      { name: "Raja", pts: 1000, color: PAL.yellow },
      { name: "Mantri", pts: 800, color: PAL.cyan },
      { name: "Sipahi", pts: 500, color: PAL.lime },
      { name: "Chor", pts: 0, color: PAL.magenta }
    ];
    var ROUNDS = 5, REVEAL_COST = 200;
    var PERMS = (function () {
      var out = [], a = [0, 1, 2, 3];
      function rec(cur, rest) {
        if (!rest.length) { out.push(cur.slice()); return; }
        for (var i = 0; i < rest.length; i++) {
          var nrest = rest.slice(); var v = nrest.splice(i, 1)[0];
          cur.push(v); rec(cur, nrest); cur.pop();
        }
      }
      rec([], a);
      return out;
    })();

    var cards, round, score, bank, sel, revealed, busy, over;

    function deal() {
      var perm = U.shuffle([0, 1, 2, 3]);
      cards = [];
      for (var i = 0; i < 4; i++) {
        var t = perm[i], other = t;
        while (other === t) other = U.int(4);
        cards.push({
          true: t,
          shown: Math.random() < 0.5 ? [t, other] : [other, t],
          q: new QG.Qubit(QG.C.re(1), QG.C.re(1)),
          measured: false
        });
      }
      sel = -1; revealed = false; busy = false;
      api.log("<b>Round " + round + "</b> dealt. Four roles, each in a superposition of two identities.");
      paint();
      api.setStatus("Arrest a role, or REVEAL every role first (costs " + REVEAL_COST + ").");
    }

    /* posterior probability that each position holds the Chor, over every
       permutation consistent with the two identities shown on each card */
    function chorPosterior() {
      var counts = [0, 0, 0, 0], total = 0;
      for (var k = 0; k < PERMS.length; k++) {
        var p = PERMS[k], ok = true;
        for (var i = 0; i < 4; i++) {
          if (cards[i].measured) { if (p[i] !== cards[i].true) { ok = false; break; } }
          else if (cards[i].shown.indexOf(p[i]) < 0) { ok = false; break; }
        }
        if (!ok) continue;
        total++;
        for (var j = 0; j < 4; j++) if (p[j] === 3) counts[j]++;
      }
      var out = [];
      for (var m = 0; m < 4; m++) out.push(total ? counts[m] / total : 0);
      return out;
    }

    var board = h("div.row.gap10.mt12", { style: "justify-content:center" });
    var bankBox = h("div.hud.mt12");
    var hud = h("div.hud.mt12");
    var btnRow = h("div.actions.mt12");
    var bReveal = api.btn("Reveal (\u2212200)", "purple", doReveal);
    btnRow.appendChild(bReveal);

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM R-M-C-S"),
      h("span.badge", "You are the Sipahi")
    ));
    root.appendChild(h("div.small.muted.tc.mt8", "Each card holds two possible identities. Tap a role to ARREST it. Catch the Chor and you keep your 500 points."));
    root.appendChild(board);
    root.appendChild(bankBox);
    root.appendChild(btnRow);
    root.appendChild(hud);

    function cardEl(c, i) {
      var el = h("div.pcard", { style: "width:112px;height:132px;font-size:1rem" });
      var mine = i === 0;
      el.style.borderColor = mine ? PAL.lime : "var(--ink)";
      if (mine) el.style.borderWidth = "4px";
      if (sel === i) { el.style.outline = "3px dashed " + PAL.magenta; el.style.outlineOffset = "-5px"; }
      var a = c.measured ? c.true : c.shown[0];
      var b = c.measured ? c.true : c.shown[1];
      var line1 = h("div", { style: "font-size:.8rem;font-weight:700;color:" + ROLES[a].color }, ROLES[a].name);
      var line2 = c.measured ? h("div", { style: "font-size:.62rem;color:var(--ink-faint)" }, ROLES[a].pts + " pts")
        : h("div", { style: "font-size:.8rem;font-weight:700;color:" + ROLES[b].color }, ROLES[b].name);
      var line3 = c.measured ? null : h("div", { style: "font-size:.6rem;color:var(--ink-faint);margin-top:3px" }, ROLES[a].pts + " / " + ROLES[b].pts + " pts");
      el.appendChild(h("div", { style: "display:flex;flex-direction:column;align-items:center;line-height:1.25" },
        h("div", { style: "font-size:.56rem;letter-spacing:.1em;color:var(--ink-faint)" }, (i + 1) + (mine ? " \u00B7 YOU" : "")),
        line1, line2, line3,
        c.measured ? h("div", { style: "font-size:.56rem;margin-top:4px;color:" + PAL.lime }, "MEASURED") : null
      ));
      el.addEventListener("click", function () { arrest(i); });
      return el;
    }

    function paint() {
      QG.clear(board);
      for (var i = 0; i < 4; i++) board.appendChild(cardEl(cards[i], i));
      QG.clear(bankBox);
      bankBox.appendChild(h("div.hud__k", "ROLES THAT KEPT THEIR POINTS"));
      bankBox.appendChild(h("div", { style: "font-size:.8rem;font-weight:700;margin-top:4px" },
        ROLES.map(function (r) { return r.name + " " + (bank[r.name] || 0); }).join("  \u00B7  ")));
      QG.clear(hud);
      hud.appendChild(h("div.hud__item", h("div.hud__k", "Round"), h("div.hud__v", round + "/" + ROUNDS)));
      hud.appendChild(h("div.hud__item", h("div.hud__k", "Your score"), h("div.hud__v", String(score.you))));
      hud.appendChild(h("div.hud__item", h("div.hud__k", "AI score"), h("div.hud__v", String(score.ai))));
      hud.appendChild(h("div.hud__item", h("div.hud__k", "Revealed"), h("div.hud__v", revealed ? "yes" : "no")));
      bReveal.disabled = busy || over || revealed;
      api.setScores([
        { name: "You", value: score.you, color: "lime" },
        { name: "AI", value: score.ai, color: "yellow" },
        { name: "Round", value: round + "/" + ROUNDS, color: "purple" }
      ]);
    }

    function doReveal() {
      if (over || busy || revealed) { api.toast("Already revealed", "bad", 900); return; }
      revealed = true;
      score.you -= REVEAL_COST;
      for (var i = 0; i < 4; i++) { cards[i].q.measure(); cards[i].measured = true; }
      api.log("You <b>revealed</b> every role (-" + REVEAL_COST + "). All identities are now definite.");
      QG.sfx.measure();
      paint();
      api.setStatus("Roles measured. Now arrest the Chor.");
    }

    function arrest(i) {
      if (over || busy) return;
      busy = true;
      var c = cards[i];
      c.q.measure();
      c.measured = true;
      sel = i;
      paint();
      var isChor = c.true === 3;
      if (isChor) {
        score.you += 500;
        api.log("You arrested card " + (i + 1) + " - it was the <b>Chor</b>! You keep your 500 points.");
        QG.sfx.good();
        paint();
        api.after(800, nextRound);
        return;
      }
      var kept = ROLES[c.true];
      bank[kept.name] = (bank[kept.name] || 0) + kept.pts;
      api.log("You arrested card " + (i + 1) + " - it was the <b>" + kept.name + "</b>. " + kept.name + " keeps " + kept.pts + " and you score 0.");
      QG.sfx.lose();
      paint();
      api.after(700, aiArrest);
    }

    function aiArrest() {
      if (over) return;
      var post = chorPosterior();
      var best = -1, bestP = -1;
      for (var i = 0; i < 4; i++) {
        if (cards[i].measured) continue;
        if (post[i] > bestP) { bestP = post[i]; best = i; }
      }
      if (best < 0) { api.log("The AI has nothing left to arrest."); api.after(500, nextRound); return; }
      var c = cards[best];
      c.q.measure(); c.measured = true;
      api.log("AI arrested card " + (best + 1) + " (Chor odds " + (bestP * 100).toFixed(0) + "%).");
      if (c.true === 3) {
        score.ai += 500;
        api.log("It was the <b>Chor</b> - the AI scores 500.");
        QG.sfx.zap();
      } else {
        var kept = ROLES[c.true];
        bank[kept.name] = (bank[kept.name] || 0) + kept.pts;
        api.log("It was the <b>" + kept.name + "</b> - the AI scores 0.");
      }
      paint();
      api.after(800, nextRound);
    }

    function nextRound() {
      if (over) return;
      round++;
      if (round > ROUNDS) { finish(); return; }
      deal();
    }

    function finish() {
      over = true; busy = false; paint();
      api.setBest(score.you);
      if (score.you > score.ai) api.win("Sharpest eye!", "You finished on " + score.you + " points to the AI's " + score.ai + ".");
      else if (score.you < score.ai) api.lose("Out-investigated.", "AI " + score.ai + ", you " + score.you + ".");
      else api.overlay({ title: "Dead heat", sub: "Both finished on " + score.you + " points.",
        actions: [{ label: "Play again", kind: "lime", onClick: api.restart }] });
    }

    round = 0; score = { you: 0, ai: 0 }; bank = {}; sel = -1; revealed = false; busy = false; over = false;
    cards = [];
    round = 1;
    deal();
  });

  /* ==========================================================
     25. QUANTUM CHECKERS
     ========================================================== */
  QG.register("quantum-checkers", function (root, api) {
    var idc = 0;
    var board, turn, sel, splitMode, over, busy, mustJump;

    function inb(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

    function fresh() {
      board = new Array(64).fill(null);
      idc = 0;
      var r, c;
      for (r = 0; r < 3; r++) for (c = 0; c < 8; c++) if ((r + c) % 2 === 1) put({ id: idc++, color: "b", king: false, squares: [r * 8 + c], q: null, dead: false });
      for (r = 5; r < 8; r++) for (c = 0; c < 8; c++) if ((r + c) % 2 === 1) put({ id: idc++, color: "w", king: false, squares: [r * 8 + c], q: null, dead: false });
      turn = "w"; sel = null; splitMode = false; over = false; busy = false; mustJump = null;
    }
    function put(p) { p.squares.forEach(function (s) { board[s] = p; }); }
    function removePiece(p) {
      p.dead = true;
      p.squares.forEach(function (s) { if (board[s] === p) board[s] = null; });
      p.squares = [];
    }

    function genMoves(from, color) {
      var p = board[from];
      if (!p || p.color !== color) return [];
      var r = Math.floor(from / 8), c = from % 8, out = [];
      var dirs = p.king ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
        : (color === "w" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
      for (var i = 0; i < dirs.length; i++) {
        var dr = dirs[i][0], dc = dirs[i][1];
        var r1 = r + dr, c1 = c + dc;
        if (!inb(r1, c1)) continue;
        var t1 = r1 * 8 + c1, occ = board[t1];
        if (!occ) out.push({ to: t1, cap: -1 });
        else if (occ.color !== color) {
          var r2 = r1 + dr, c2 = c1 + dc;
          if (inb(r2, c2) && !board[r2 * 8 + c2]) out.push({ to: r2 * 8 + c2, cap: t1 });
        }
      }
      return out;
    }
    function allPieces(color) {
      var out = [], seen = {};
      for (var i = 0; i < 64; i++) {
        var p = board[i];
        if (p && p.color === color && !p.dead && !seen[p.id]) { seen[p.id] = 1; out.push(p); }
      }
      return out;
    }
    function allMoves(color) {
      var res = [];
      allPieces(color).forEach(function (p) {
        p.squares.forEach(function (s) {
          genMoves(s, color).forEach(function (m) { res.push({ p: p, from: s, to: m.to, cap: m.cap }); });
        });
      });
      return res;
    }
    function capturesFor(color) { return allMoves(color).filter(function (m) { return m.cap >= 0; }); }
    function superposedPieces() {
      return allPieces("w").concat(allPieces("b")).filter(function (p) { return p.squares.length === 2; });
    }

    function threatAt(sq) {
      var p = board[sq];
      if (!p) return 0;
      var r = Math.floor(sq / 8), c = sq % 8, n = 0;
      var d = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (var i = 0; i < 4; i++) {
        var rr = r + d[i][0], cc = c + d[i][1];
        if (!inb(rr, cc)) continue;
        var o = board[rr * 8 + cc];
        if (o && o.color !== p.color) n++;
      }
      return n;
    }
    function makeSplitQubit(a, b) {
      var q = new QG.Qubit(QG.C.re(1), QG.C.re(0));
      q.apply(QG.GATES.H);
      var da = threatAt(a), db = threatAt(b);
      if (db < da) q.apply(QG.GATES.TDG);
      else if (db > da) q.apply(QG.GATES.T);
      q.apply(QG.GATES.H);
      return q;
    }

    function doMove(p, from, to, cap) {
      var victim = null;
      if (cap >= 0 && board[cap] && board[cap] !== p) { victim = board[cap]; removePiece(victim); }
      var idx = p.squares.indexOf(from);
      if (idx >= 0) p.squares.splice(idx, 1);
      if (from !== to && board[from] === p) board[from] = null;
      if (p.squares.indexOf(to) < 0) p.squares.push(to);
      board[to] = p;
      var far = p.color === "w" ? 0 : 7;
      var allFar = p.squares.length > 0 && p.squares.every(function (s) { return Math.floor(s / 8) === far; });
      var wasKing = p.king;
      if (allFar) p.king = true;
      if (p.squares.length === 2) p.q = makeSplitQubit(p.squares[0], p.squares[1]);
      else p.q = null;
      return { victim: victim, crowned: !wasKing && p.king };
    }

    function doMeasure() {
      var list = superposedPieces(), collapsed = 0, captured = 0, merged = 0;
      list.forEach(function (p) {
        if (p.dead || p.squares.length !== 2) return;
        var idx = p.q ? p.q.measure() : (Math.random() < 0.5 ? 0 : 1);
        var pick = p.squares[idx], other = p.squares[1 - idx];
        if (board[other] === p) board[other] = null;
        var occ = board[pick];
        if (occ && occ !== p && !occ.dead) {
          if (occ.color === p.color) merged++;
          else captured++;
          removePiece(occ);
        }
        p.squares = [pick];
        board[pick] = p;
        p.q = null;
        collapsed++;
      });
      return { collapsed: collapsed, captured: captured, merged: merged };
    }

    /* ---------- UI ---------- */
    var grid = api.grid(8, 8, onCell);
    var btnRow = h("div.actions.mt12");
    var bSplit = api.btn("Split", "purple", onSplit);
    var bMeasure = api.btn("Measure", "cyan", function () {
      if (over || busy || turn !== "w") return;
      var sup = superposedPieces();
      if (!sup.length) { api.toast("Nothing is superposed", "bad", 900); return; }
      var r = doMeasure();
      api.log("You <b>measured</b>: " + r.collapsed + " collapsed, " + r.captured + " captured, " + r.merged + " merged.");
      QG.sfx.measure();
      sel = null; splitMode = false; mustJump = null;
      endTurn();
    });
    btnRow.appendChild(bSplit); btnRow.appendChild(bMeasure);

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM CHECKERS"),
      h("span.badge", "Captures are mandatory")
    ));
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(h("div.small.muted.tc.mt8", "Tap a piece, then a highlighted diagonal. SPLIT duplicates it across two squares; MEASURE collapses every superposed piece."));
    root.appendChild(btnRow);
    var hud = h("div.hud.mt12");
    root.appendChild(hud);

    function pieceHTML(p) {
      var fill = p.color === "w" ? PAL.paper : PAL.ink;
      var stroke = p.color === "w" ? PAL.ink : PAL.paper;
      var crown = p.king ? "<span style='font-size:.62em;color:" + PAL.yellow + ";text-shadow:0 0 3px #000'>\u265B</span>" : "";
      var main = "<span style='position:absolute;width:60%;height:60%;border-radius:50%;background:" + fill + ";border:2px solid " + stroke +
        ";display:grid;place-items:center'>" + crown + "</span>";
      if (p.squares.length === 2) {
        main += "<span style='position:absolute;width:60%;height:60%;border-radius:50%;border:2px dashed " + stroke +
          ";opacity:.45;transform:translate(24%,24%)'></span>";
      }
      return main;
    }

    function paint() {
      var targets = {};
      if (sel !== null && !over && board[sel] && !busy) {
        var ms = genMoves(sel, "w");
        var caps = capturesFor("w");
        for (var k = 0; k < ms.length; k++) if (!caps.length || ms[k].cap >= 0) targets[ms[k].to] = true;
      }
      for (var i = 0; i < 64; i++) {
        var r = Math.floor(i / 8), c = i % 8, p = board[i];
        var cls = ((r + c) % 2) ? "cell cell--dark" : "cell";
        var html = p ? pieceHTML(p) : "";
        if (i === sel) cls += " is-sel";
        if (targets[i]) cls += " is-hint";
        if (splitMode && targets[i]) cls += " is-target";
        grid.set(r, c, html, cls.replace(/^cell\s?/, ""));
      }
      bSplit.style.background = splitMode ? PAL.purple : "";
      bSplit.style.color = splitMode ? "#fff" : "";
      bSplit.innerHTML = splitMode ? "\u2713 Split armed" : "Split";
      QG.clear(hud);
      var sup = superposedPieces();
      [["Turn", turn === "w" ? "YOU" : "AI"], ["Your pieces", allPieces("w").length],
       ["AI pieces", allPieces("b").length], ["Superposed", sup.length]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "You", value: allPieces("w").length, color: "cyan", turn: turn === "w" },
        { name: "AI", value: allPieces("b").length, color: "magenta", turn: turn === "b" },
        { name: "Superposed", value: sup.length, color: "purple" }
      ]);
    }

    function checkEnd() {
      var w = allPieces("w"), b = allPieces("b");
      if (!b.length) { over = true; api.setBest("win"); paint(); api.win("Board cleared!", "You captured every AI piece."); return true; }
      if (!w.length) { over = true; paint(); api.lose("Your army is gone.", "The AI captured every one of your pieces."); return true; }
      if (!allMoves("b").length) { over = true; api.setBest("win"); paint(); api.win("The AI is stuck!", "The AI has no legal move left."); return true; }
      if (!allMoves("w").length) { over = true; paint(); api.lose("No legal moves.", "Every one of your pieces is blocked."); return true; }
      return false;
    }

    function endTurn() {
      paint();
      if (checkEnd()) return;
      turn = "b"; busy = true;
      api.setStatus("AI is thinking...");
      api.after(520, aiTurn);
    }

    function onSplit() {
      if (over || busy || turn !== "w") return;
      if (sel === null || !board[sel] || board[sel].color !== "w") { api.toast("Select one of your pieces first", "bad", 1000); return; }
      if (board[sel].squares.length === 2) { api.toast("That piece is already superposed", "bad", 1000); return; }
      splitMode = !splitMode;
      paint();
      api.setStatus(splitMode ? "SPLIT armed - tap an empty diagonal to duplicate the piece there." : "Your move.");
    }

    function onCell(r, c) {
      if (over || busy || turn !== "w") return;
      var i = r * 8 + c, p = board[i];

      if (mustJump !== null) {
        var jumps = genMoves(mustJump, "w").filter(function (m) { return m.cap >= 0; });
        var hit = null;
        for (var k = 0; k < jumps.length; k++) if (jumps[k].to === i) hit = jumps[k];
        if (!hit) { api.toast("You must keep jumping!", "bad", 1100); return; }
        doJump(board[mustJump], mustJump, hit.to, hit.cap);
        return;
      }

      if (sel === null) {
        if (p && p.color === "w") { sel = i; splitMode = false; QG.sfx.tap(); paint(); }
        else if (p) api.setStatus("That is an AI piece.");
        return;
      }
      if (i === sel) { sel = null; splitMode = false; paint(); return; }

      var ms = genMoves(sel, "w"), legal = null;
      for (var j = 0; j < ms.length; j++) if (ms[j].to === i) legal = ms[j];
      if (!legal) {
        if (p && p.color === "w") { sel = i; splitMode = false; QG.sfx.tap(); paint(); }
        else api.toast("Not a legal diagonal", "bad", 1000);
        return;
      }
      var caps = capturesFor("w");
      if (caps.length && legal.cap < 0) {
        api.toast("Captures are mandatory!", "bad", 1300);
        api.setStatus("A capture is available - you must take it.");
        return;
      }
      if (splitMode) {
        if (legal.cap >= 0) { api.toast("Split onto an empty square", "bad", 1000); return; }
        var piece = board[sel];
        piece.squares.push(i);
        board[i] = piece;
        piece.q = makeSplitQubit(piece.squares[0], piece.squares[1]);
        api.log("You <b>split</b> a piece into a superposition of two squares.");
        QG.sfx.zap();
        splitMode = false; sel = null;
        endTurn();
        return;
      }
      if (legal.cap >= 0) doJump(board[sel], sel, legal.to, legal.cap);
      else {
        var res = doMove(board[sel], sel, legal.to, -1);
        api.log("You moved" + (res.crowned ? " and crowned a <b>King</b>" : "") + ".");
        QG.sfx.click();
        sel = null;
        endTurn();
      }
    }

    function doJump(p, from, to, cap) {
      var res = doMove(p, from, to, cap);
      api.log("You captured" + (res.crowned ? " and crowned a <b>King</b>" : "") + "!");
      QG.sfx.zap();
      paint();
      var more = genMoves(to, "w").filter(function (m) { return m.cap >= 0; });
      if (more.length) {
        mustJump = to; sel = to;
        api.setStatus("Multi-jump! Keep capturing.");
        paint();
        return;
      }
      mustJump = null; sel = null;
      endTurn();
    }

    function aiTurn() {
      if (over) { busy = false; return; }
      var moves = allMoves("b");
      if (!moves.length) { busy = false; checkEnd(); return; }
      var caps = moves.filter(function (m) { return m.cap >= 0; });
      var mv;
      if (caps.length) mv = U.pick(caps);
      else {
        moves.sort(function (x, y) { return Math.floor(y.to / 8) - Math.floor(x.to / 8); });
        mv = moves[0];
      }
      var res = doMove(mv.p, mv.from, mv.to, mv.cap);
      api.log("AI moved" + (res.victim ? " and <b>captured</b> a piece" : "") + (res.crowned ? " and crowned a King" : "") + ".");
      QG.sfx.click();
      paint();
      if (checkEnd()) return;
      var more = mv.cap >= 0 ? genMoves(mv.to, "b").filter(function (m) { return m.cap >= 0; }) : [];
      if (more.length) { api.after(420, function () { aiChain(mv.p, mv.to); }); return; }
      finishAiTurn();
    }
    function aiChain(p, from) {
      if (over) return;
      var more = genMoves(from, "b").filter(function (m) { return m.cap >= 0; });
      if (!more.length) { finishAiTurn(); return; }
      var mv = U.pick(more);
      var res = doMove(p, from, mv.to, mv.cap);
      api.log("AI chained another capture" + (res.crowned ? " and crowned a King" : "") + "!");
      QG.sfx.zap();
      paint();
      if (checkEnd()) return;
      var nxt = genMoves(mv.to, "b").filter(function (m) { return m.cap >= 0; });
      if (nxt.length) { api.after(420, function () { aiChain(p, mv.to); }); return; }
      finishAiTurn();
    }
    function finishAiTurn() {
      if (over) return;
      if (superposedPieces().length && Math.random() < 0.25) {
        var r = doMeasure();
        api.log("AI <b>measured</b>: " + r.collapsed + " collapsed, " + r.captured + " captured.");
        QG.sfx.measure();
        paint();
        if (checkEnd()) return;
      }
      turn = "w"; busy = false;
      paint();
      if (checkEnd()) return;
      api.setStatus("Your move. Tap a piece, then a highlighted diagonal.");
    }

    fresh(); paint();
    api.setStatus("Your move. Tap a piece, then a highlighted diagonal.");
  });
})();
