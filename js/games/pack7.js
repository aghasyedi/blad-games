/* ============================================================
   QUANTUM ARCADE — games/pack7.js
   31 Quantum Cricket  32 Quantum Badminton  33 Quantum Tennis
   34 Quantum Snooker  35 Quantum Battleships: Fleet War
   ============================================================ */
(function () {
  "use strict";
  var QG = window.QG, h = QG.h, PAL = QG.PAL, U = QG.U;

  /* ==========================================================
     31. QUANTUM CRICKET
     ========================================================== */
  QG.register("quantum-cricket", function (root, api) {
    var BASE = [3, 4, 3, 2, 1, 1];
    var LABEL = ["0", "1", "2", "4", "6", "OUT"];
    var TARGET = 45, BALLS = 12, MAX_WKTS = 2;

    var w, runs, balls, wkts, over, busy, history, bowlerNote;

    function reset() {
      w = BASE.slice(); runs = 0; balls = 0; wkts = 0; over = false; busy = false;
      history = []; bowlerNote = "";
    }

    var bars = h("div.mt12");
    var tiles = h("div.grid", { style: "grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px" });
    var tileEls = [];
    LABEL.forEach(function (lab, i) {
      var t = h("button.tile", { type: "button", style: "min-height:64px;flex-direction:column;display:flex;gap:2px" },
        h("span", { style: "font-family:var(--font-display);font-size:1.15rem" }, lab),
        h("span.small.muted", { style: "font-size:.62rem" }, "tap to amplify")
      );
      t.addEventListener("click", function () {
        if (over || busy) return;
        w[i] += 2;
        QG.sfx.gate();
        api.log("You amplified <b>" + lab + "</b>.");
        paint();
      });
      tileEls.push(t); tiles.appendChild(t);
    });

    var btnRow = h("div.actions.mt12");
    var bH = api.btn("H (even out)", "cyan", function () {
      if (over || busy) return;
      w = BASE.slice();
      api.log("H gate - back to the base distribution.");
      QG.sfx.gate(); paint();
    });
    var bInterfere = api.btn("Interfere", "purple", function () {
      if (over || busy) return;
      var last = w.pop(); w.unshift(last);
      api.log("Interference rotated the distribution.");
      QG.sfx.zap(); paint();
    });
    var bMeasure = api.btn("Measure (face the ball)", "magenta", function () { if (!over && !busy) face(); });
    btnRow.appendChild(bH); btnRow.appendChild(bInterfere); btnRow.appendChild(bMeasure);

    var info = h("div.hud.mt12");

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM CRICKET"),
      h("span.badge", "Chase " + TARGET + " in " + BALLS + " balls")
    ));
    root.appendChild(bars);
    root.appendChild(tiles);
    root.appendChild(btnRow);
    root.appendChild(info);

    function paint() {
      var total = w.reduce(function (a, b) { return a + b; }, 0) || 1;
      QG.clear(bars);
      w.forEach(function (val, i) {
        var p = val / total;
        var row = h("div.qmeter__row");
        row.appendChild(h("span.qmeter__lab", LABEL[i]));
        var bar = h("div.qmeter__bar");
        bar.appendChild(h("div.qmeter__fill", {
          style: "width:" + (p * 100).toFixed(1) + "%;background:" + (LABEL[i] === "OUT" ? PAL.red : LABEL[i] === "6" ? PAL.lime : PAL.cyan)
        }));
        row.appendChild(bar);
        row.appendChild(h("span.qmeter__val", (p * 100).toFixed(0) + "%"));
        bars.appendChild(h("div.qmeter", { style: "margin-bottom:4px" }, row));
      });
      tileEls.forEach(function (t, i) {
        t.classList.toggle("is-picked", w[i] > BASE[i]);
      });
      QG.clear(info);
      [["Runs", runs + "/" + TARGET], ["Balls left", BALLS - balls], ["Wickets", wkts + "/" + MAX_WKTS],
       ["Bowler", bowlerNote || "waiting"]].forEach(function (kv) {
        info.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "Runs", value: runs + "/" + TARGET, color: "lime" },
        { name: "Wickets", value: wkts + "/" + MAX_WKTS, color: "red" },
        { name: "Balls", value: BALLS - balls, color: "cyan" }
      ]);
    }

    function face() {
      busy = true;
      var ww = w.slice();
      bowlerNote = U.pick(["yorker", "bouncer", "slower ball", "off spin", "leg spin", "quantum googly"]);
      if (bowlerNote === "yorker") ww[5] += 2.5;
      if (bowlerNote === "bouncer") ww[4] += 1.5;
      if (bowlerNote === "slower ball") ww[0] += 2;
      api.log("The bowler sends down a <b>" + bowlerNote + "</b>.");
      var idx = QG.sampleDist(QG.dist(ww));
      var outcome = LABEL[idx];
      balls++;
      if (outcome === "OUT") {
        wkts++;
        api.log("You are <b>OUT</b>! Collapsed to a wicket.");
        QG.sfx.lose();
        api.toast("OUT!", "bad");
      } else {
        runs += parseInt(outcome, 10);
        api.log("Collapsed to <b>" + outcome + "</b> - " + runs + "/" + TARGET + ".");
        QG.sfx[outcome === "6" || outcome === "4" ? "win" : "pop"]();
        api.toast(outcome + " run" + (outcome === "1" ? "" : "s"), "good");
      }
      w = BASE.slice();
      paint();
      if (runs >= TARGET) { over = true; api.setBest(runs); api.win("Target chased!", runs + " with " + (BALLS - balls) + " balls to spare."); return; }
      if (wkts >= MAX_WKTS) { over = true; api.setBest(runs); api.lose("Bowled out.", "You made " + runs + " - needed " + TARGET + "."); return; }
      if (balls >= BALLS) {
        over = true;
        api.setBest(runs);
        if (runs >= TARGET) api.win("Chased!", runs + " runs."); else api.lose("Out of balls.", runs + " of " + TARGET + ".");
        return;
      }
      busy = false;
      api.setStatus("Ball " + (balls + 1) + ": amplify an outcome, then MEASURE.");
    }

    reset(); paint();
    api.setStatus("Amplify the outcomes you like, then MEASURE to face the ball.");
  });

  /* ==========================================================
     32. QUANTUM BADMINTON
     ========================================================== */
  QG.register("quantum-badminton", function (root, api) {
    var W = 620, H = 400;
    var cv = api.canvas({ w: W, h: H });
    var ctx = cv.ctx;

    var shuttle, racketX, myScore, aiScore, over, rally, deceive, stamina, incoming, msg, msgT, hudSig;

    function reset() {
      racketX = W / 2; myScore = 0; aiScore = 0; over = false;
      rally = 0; deceive = 0; stamina = 3; incoming = false; msg = ""; msgT = 0; hudSig = "";
      serve();
    }
    function serve() {
      shuttle = { x: W / 2 + (Math.random() * 160 - 80), gx: 0, y: 40, t: 0, dur: 1500, from: "ai", real: 0 };
      shuttle.gx = W - shuttle.x;
      incoming = true;
      api.setStatus("Shuttle incoming. Move under it and press HIT.");
    }

    var btnRow = h("div.actions.mt12");
    var bHit = api.btn("Hit", "lime", function () { doHit(); });
    var bDeceive = api.btn("Deceive", "purple", function () {
      if (over) return;
      deceive = Math.min(3, deceive + 1);
      api.log("You loaded a <b>deception</b> (" + deceive + "/3).");
      QG.sfx.gate(); paintHud();
    });
    var bMeasure = api.btn("Measure", "cyan", function () {
      if (over) return;
      if (stamina <= 0) { api.toast("No stamina left", "bad", 1000); return; }
      if (shuttle.real === 0 && shuttle.gx === shuttle.x) { api.toast("Already definite", "bad", 900); return; }
      stamina--;
      shuttle.real = shuttle.x;
      shuttle.gx = shuttle.x;
      api.log("You <b>measured</b> the shuttle - one trajectory now.");
      QG.sfx.measure(); paintHud();
    });
    btnRow.appendChild(bHit); btnRow.appendChild(bDeceive); btnRow.appendChild(bMeasure);

    var hud = h("div.hud.mt12");

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM BADMINTON"),
      h("span.badge", "First to 7")
    ));
    root.appendChild(h("div.mt12", cv.el));
    root.appendChild(btnRow);
    root.appendChild(hud);

    var dragging = false;
    cv.on("down", function (p) { dragging = true; racketX = U.clamp(p.x, 40, W - 40); });
    cv.on("move", function (p) { if (dragging) racketX = U.clamp(p.x, 40, W - 40); });
    cv.on("up", function () { dragging = false; });

    var detach = QG.steer(cv.el, function (dir) {
      if (dir === "left") racketX = U.clamp(racketX - 46, 40, W - 40);
      if (dir === "right") racketX = U.clamp(racketX + 46, 40, W - 40);
      if (dir === "up") doHit();
    });
    api.onCleanup(detach);

    function doHit() {
      if (over || !incoming) return;
      var realX = shuttle.real === 0 ? shuttle.x : shuttle.real;
      var dist = Math.abs(realX - racketX);
      if (dist > 74) { api.toast("Too far away!", "bad", 900); QG.sfx.tick(); return; }
      incoming = false;
      rally++;
      var chance = 0.62 - deceive * 0.16 + (dist < 30 ? 0.14 : 0);
      QG.sfx.pop();
      if (Math.random() < chance) {
        api.log("You returned it cleanly (deception " + deceive + ").");
        deceive = 0;
        api.after(360, function () {
          if (over) return;
          myScore++;
          msg = "WINNER"; msgT = 800;
          QG.sfx.good(); paintHud();
          checkEnd();
          if (!over) api.after(500, serve);
        });
      } else {
        api.log("The AI read your deception and returned it.");
        api.after(360, function () {
          if (over) return;
          aiScore++;
          msg = "LOST THE RALLY"; msgT = 800;
          QG.sfx.lose(); paintHud();
          checkEnd();
          if (!over) api.after(500, serve);
        });
      }
    }

    function checkEnd() {
      if (myScore >= 7) { over = true; api.setBest(myScore); api.win("Game, set and match!", "7-" + aiScore + "."); return true; }
      if (aiScore >= 7) { over = true; api.lose("The AI takes it.", "7-" + aiScore + " the other way."); return true; }
      return false;
    }

    function frame(dt) {
      if (over) return;
      if (msgT > 0) msgT = Math.max(0, msgT - dt);
      if (incoming) {
        shuttle.t += dt;
        var u = Math.min(1, shuttle.t / shuttle.dur);
        shuttle.y = 40 + u * (H - 120);
        shuttle.x += Math.sin(u * 6) * 0.6;
        if (shuttle.real === 0) shuttle.gx = W - shuttle.x;
        if (u >= 1) {
          incoming = false;
          aiScore++;
          msg = "SHUTTLE DOWN"; msgT = 900;
          api.log("The shuttle landed in your court.");
          QG.sfx.lose();
          if (!checkEnd()) api.after(560, serve);
        }
      }
      draw();
      paintHud();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      QG.draw.rect(ctx, 14, 14, W - 28, H - 28, { fill: U.rgba(PAL.blue, .1), color: PAL.ink, width: 4, radius: 8, wobble: 2 });
      QG.draw.line(ctx, 14, 110, W - 14, 110, { color: PAL.ink, width: 3, wobble: 1.4 });
      QG.draw.dashedCircle(ctx, W / 2, H - 60, 130, { color: U.rgba(PAL.ink, .18), width: 2 });
      // landing circles
      var realX = shuttle.real === 0 ? shuttle.x : shuttle.real;
      if (incoming) {
        QG.draw.dashedCircle(ctx, W - realX, H - 40, 46, { color: PAL.purple, width: 3 });
        QG.draw.text(ctx, "?", W - realX, H - 40, { size: 18, color: PAL.purple });
        QG.draw.dashedCircle(ctx, realX, H - 40, 46, { color: PAL.lime, width: 3 });
      }
      // racket
      QG.draw.rect(ctx, racketX - 34, H - 52, 68, 16, { fill: PAL.lime, color: PAL.ink, width: 3.4, radius: 8, wobble: 1.2 });
      // shuttle
      var sx = shuttle.real === 0 ? shuttle.x : shuttle.real;
      if (shuttle.real === 0 && incoming) {
        QG.draw.circle(ctx, W - shuttle.x, shuttle.y, 9, { fill: "transparent", color: PAL.purple, width: 3, double: false });
      }
      QG.draw.circle(ctx, sx, shuttle.y, 10, { fill: PAL.paper, color: PAL.ink, width: 3.4 });
      QG.draw.text(ctx, "\u{1F3F8}", sx, shuttle.y, { size: 14, color: PAL.ink });
      if (msgT > 0) QG.draw.text(ctx, msg, W / 2, H / 2, { size: 30, color: msg === "WINNER" ? PAL.lime : PAL.red, strokeColor: PAL.ink, strokeWidth: 6 });
    }

    function paintHud() {
      var sig = myScore + "|" + aiScore + "|" + deceive + "|" + stamina + "|" + rally;
      if (sig === hudSig) return;
      hudSig = sig;
      QG.clear(hud);
      [["You", myScore + "/7"], ["AI", aiScore + "/7"], ["Deception", deceive + "/3"],
       ["Stamina", stamina], ["Rally", rally]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "You", value: myScore, color: "lime" },
        { name: "AI", value: aiScore, color: "magenta" }
      ]);
    }

    reset();
    api.loop(frame);
    paintHud();
  });

  /* ==========================================================
     33. QUANTUM TENNIS
     ========================================================== */
  QG.register("quantum-tennis", function (root, api) {
    var W = 620, H = 400;
    var cv = api.canvas({ w: W, h: H });
    var ctx = cv.ctx;

    var ball, px, myScore, aiScore, over, collapsed, spin, msg, msgT, lastHit, hudSig;

    function reset() {
      px = W / 2; myScore = 0; aiScore = 0; over = false; collapsed = false;
      spin = 0; msg = ""; msgT = 0; lastHit = 0; hudSig = "";
      serve();
    }
    function serve() {
      ball = { x: W / 2 + (Math.random() * 200 - 100), y: 60, vy: 2.6, vx: (Math.random() - 0.5) * 2.4, drift: 0 };
      collapsed = false;
      api.setStatus("Ball incoming. Get under it and SWING.");
    }

    var btnRow = h("div.actions.mt12");
    var bSwing = api.btn("Swing", "lime", function () { swing(); });
    var bCollapse = api.btn("Collapse", "cyan", function () {
      if (over) return;
      collapsed = true;
      ball.drift = 0;
      api.log("You <b>collapsed</b> the ball - easy to hit, easy to read.");
      QG.sfx.measure();
    });
    var bSpin = api.btn("Spin", "purple", function () {
      if (over) return;
      spin = Math.min(3, spin + 1);
      ball.drift = spin * 1.5;
      api.log("You added <b>interference</b> - the ghost position drifts.");
      QG.sfx.gate();
    });
    btnRow.appendChild(bSwing); btnRow.appendChild(bCollapse); btnRow.appendChild(bSpin);

    var hud = h("div.hud.mt12");
    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM TENNIS"),
      h("span.badge", "First to 6")
    ));
    root.appendChild(h("div.mt12", cv.el));
    root.appendChild(btnRow);
    root.appendChild(hud);

    var dragging = false;
    cv.on("down", function (p) { dragging = true; px = U.clamp(p.x, 40, W - 40); });
    cv.on("move", function (p) { if (dragging) px = U.clamp(p.x, 40, W - 40); });
    cv.on("up", function () { dragging = false; });
    var detach = QG.steer(cv.el, function (dir) {
      if (dir === "left") px = U.clamp(px - 44, 40, W - 40);
      if (dir === "right") px = U.clamp(px + 44, 40, W - 40);
      if (dir === "up") swing();
    });
    api.onCleanup(detach);

    function swing() {
      if (over) return;
      if (ball.y < H - 130) { api.toast("Too early!", "bad", 800); return; }
      var d = Math.abs(ball.x - px);
      if (d > 78) { api.toast("Missed it", "bad", 800); QG.sfx.tick(); return; }
      lastHit = d;
      QG.sfx.pop();
      var power = d < 26 ? 3 : d < 50 ? 2 : 1;
      var aiChance = 0.66 + spin * 0.07 - power * 0.12 - (collapsed ? 0.14 : 0);
      api.log("Returned with power " + power + (collapsed ? " (collapsed)" : ""));
      if (Math.random() < aiChance) {
        api.after(320, function () {
          if (over) return;
          aiScore++;
          msg = "AI WINS THE POINT"; msgT = 900;
          QG.sfx.lose(); paintHud();
          if (!checkEnd()) api.after(560, serve);
        });
      } else {
        api.after(320, function () {
          if (over) return;
          myScore++;
          msg = "WINNER"; msgT = 900;
          QG.sfx.good(); paintHud();
          if (!checkEnd()) api.after(560, serve);
        });
      }
    }

    function checkEnd() {
      if (myScore >= 6) { over = true; api.setBest(myScore); api.win("Set won!", "6-" + aiScore + "."); return true; }
      if (aiScore >= 6) { over = true; api.lose("Set lost.", "6-" + aiScore + " to the AI."); return true; }
      return false;
    }

    function frame(dt) {
      if (over) return;
      var s = dt / 16.67;
      if (msgT > 0) msgT = Math.max(0, msgT - dt);
      ball.y += ball.vy * s;
      ball.x += (ball.vx + (collapsed ? 0 : Math.sin(ball.y / 40) * ball.drift)) * s;
      if (ball.x < 30 || ball.x > W - 30) ball.vx *= -1;
      ball.x = U.clamp(ball.x, 30, W - 30);
      if (ball.y > H - 40) {
        aiScore++;
        msg = "BALL DROPPED"; msgT = 900;
        api.log("The ball bounced past you.");
        QG.sfx.lose();
        if (!checkEnd()) api.after(600, serve);
      }
      draw();
      paintHud();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      QG.draw.rect(ctx, 14, 14, W - 28, H - 28, { fill: U.rgba(PAL.lime, .12), color: PAL.ink, width: 4, radius: 8, wobble: 2 });
      QG.draw.line(ctx, 14, H / 2 - 10, W - 14, H / 2 - 10, { color: PAL.ink, width: 3, wobble: 1.4 });
      QG.draw.rect(ctx, 14, H - 130, W - 28, 3, { color: PAL.ink, width: 3, wobble: 1.2, fill: "transparent", double: false });
      // ghost
      if (!collapsed) {
        var gx = U.clamp(W - ball.x, 30, W - 30);
        QG.draw.circle(ctx, gx, ball.y, 12, { fill: "transparent", color: PAL.purple, width: 3, double: false });
        QG.draw.dashedCircle(ctx, gx, ball.y, 18, { color: PAL.purple, width: 2 });
      }
      QG.draw.circle(ctx, ball.x, ball.y, 13, { fill: PAL.yellow, color: PAL.ink, width: 3.4 });
      QG.draw.rect(ctx, px - 36, H - 56, 72, 15, { fill: PAL.cyan, color: PAL.ink, width: 3.4, radius: 8, wobble: 1.2 });
      if (msgT > 0) QG.draw.text(ctx, msg, W / 2, H / 2 - 20, { size: 26, color: msg === "WINNER" ? PAL.lime : PAL.red, strokeColor: PAL.ink, strokeWidth: 6 });
    }

    function paintHud() {
      var sig = myScore + "|" + aiScore + "|" + spin + "|" + collapsed;
      if (sig === hudSig) return;
      hudSig = sig;
      QG.clear(hud);
      [["You", myScore + "/6"], ["AI", aiScore + "/6"], ["Spin", spin + "/3"], ["Ball", collapsed ? "definite" : "superposed"]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "You", value: myScore, color: "cyan" },
        { name: "AI", value: aiScore, color: "magenta" }
      ]);
    }

    reset();
    api.loop(frame);
    paintHud();
  });

  /* ==========================================================
     34. QUANTUM SNOOKER
     ========================================================== */
  QG.register("quantum-snooker", function (root, api) {
    var W = 620, H = 400;
    var cv = api.canvas({ w: W, h: H });
    var ctx = cv.ctx;

    var COLOURS = [
      { n: "Yellow", c: PAL.yellow, v: 2 }, { n: "Green", c: PAL.green, v: 3 },
      { n: "Brown", c: "#8b5a2b", v: 4 }, { n: "Blue", c: PAL.blue, v: 5 },
      { n: "Pink", c: PAL.pink, v: 6 }, { n: "Black", c: "#222", v: 7 }
    ];
    var POCKETS = [[30, 30], [W / 2, 26], [W - 30, 30], [30, H - 30], [W / 2, H - 26], [W - 30, H - 30]];
    var ZONES = [{ x: 200, y: 200, r: 62 }, { x: 420, y: 140, r: 62 }];

    var cue, balls, aim, power, shots, potted, over, spread, hudSig;

    function reset() {
      cue = { x: W / 2, y: H - 90 };
      balls = [];
      var spots = [[210, 110], [250, 150], [330, 120], [390, 170], [290, 210], [360, 250]];
      COLOURS.forEach(function (c, i) { balls.push({ x: spots[i][0], y: spots[i][1], c: c.c, v: c.v, n: c.n, potted: false }); });
      aim = -1.15; power = 0.8; shots = 10; potted = 0; over = false; spread = 0.22; hudSig = "";
    }

    var btnRow = h("div.actions.mt12");
    var bMeasure = api.btn("Measure", "cyan", function () {
      if (over) return;
      spread = 0;
      api.log("You <b>measured</b> - one aim line, no double pot.");
      QG.sfx.measure();
      paintHud();
    });
    var bSpread = api.btn("Widen spread", "purple", function () {
      if (over) return;
      spread = Math.min(0.55, spread + 0.1);
      api.log("Interference widened the aim spread to " + Math.round(spread * 100) / 100 + ".");
      QG.sfx.gate();
      paintHud();
    });
    var bShoot = api.btn("Shoot", "lime", function () { shoot(); });
    btnRow.appendChild(bMeasure); btnRow.appendChild(bSpread); btnRow.appendChild(bShoot);

    var powerWrap = h("div.mt12.row.gap8", { style: "align-items:center" });
    var range = h("input", { type: "range", min: "20", max: "100", value: "80", style: "flex:1;accent-color:#ff2e97" });
    range.addEventListener("input", function () { power = parseInt(range.value, 10) / 100; paintHud(); });
    powerWrap.appendChild(h("span.small.strong", "POWER"));
    powerWrap.appendChild(range);

    var hud = h("div.hud.mt12");
    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM SNOOKER"),
      h("span.badge", "Pot all 6")
    ));
    root.appendChild(h("div.mt12", cv.el));
    root.appendChild(powerWrap);
    root.appendChild(btnRow);
    root.appendChild(hud);

    var dragging = false;
    cv.on("down", function (p) { dragging = true; setAim(p); });
    cv.on("move", function (p) { if (dragging) setAim(p); });
    cv.on("up", function () { dragging = false; });

    function setAim(p) {
      if (over) return;
      aim = Math.atan2(p.y - cue.y, p.x - cue.x);
      aim = U.clamp(aim, -Math.PI + 0.25, -0.25);
    }

    function rayPocket(x, y, ang) {
      var dx = Math.cos(ang), dy = Math.sin(ang);
      for (var t = 0; t < 900; t += 6) {
        var px = x + dx * t, py = y + dy * t;
        for (var k = 0; k < POCKETS.length; k++) {
          if (Math.hypot(px - POCKETS[k][0], py - POCKETS[k][1]) < 26) return k;
        }
        if (px < 12 || px > W - 12 || py < 12 || py > H - 12) return -1;
      }
      return -1;
    }
    function firstBall(x, y, ang) {
      var dx = Math.cos(ang), dy = Math.sin(ang), best = null, bt = 1e9;
      balls.forEach(function (b) {
        if (b.potted) return;
        var t = (b.x - x) * dx + (b.y - y) * dy;
        if (t <= 6 || t > bt) return;
        var cx = x + dx * t, cy = y + dy * t;
        if (Math.hypot(cx - b.x, cy - b.y) < 24) { bt = t; best = b; }
      });
      return best;
    }
    function inZone(x, y) {
      for (var i = 0; i < ZONES.length; i++) if (Math.hypot(x - ZONES[i].x, y - ZONES[i].y) < ZONES[i].r) return true;
      return false;
    }

    function runLine(ang, label) {
      var hit = firstBall(cue.x, cue.y, ang);
      if (!hit) {
        var pk = rayPocket(cue.x, cue.y, ang);
        if (pk >= 0) { api.log(label + ": cue ball potted - <b>foul</b>."); return -1; }
        api.log(label + ": no contact.");
        return 0;
      }
      var dbl = inZone(hit.x, hit.y) ? 2 : 1;
      var pk2 = rayPocket(hit.x, hit.y, ang);
      if (pk2 >= 0) {
        hit.potted = true;
        potted++;
        var gain = hit.v * dbl;
        api.log(label + ": potted <b>" + hit.n + "</b> for " + gain + (dbl > 1 ? " (interference zone, doubled)" : "") + ".");
        return gain;
      }
      api.log(label + ": hit the " + hit.n + " but it did not drop.");
      return 0;
    }

    function shoot() {
      if (over) return;
      if (shots <= 0) return;
      shots--;
      var a1 = aim, a2 = aim + spread;
      var score = 0;
      if (spread === 0) {
        score = runLine(a1, "Measured line");
      } else {
        var s1 = runLine(a1, "Solid line");
        var s2 = runLine(a2, "Ghost line");
        score = (s1 < 0 && s2 < 0) ? -1 : Math.max(0, s1) + Math.max(0, s2);
      }
      if (score < 0) { shots--; api.log("Foul - one extra shot lost."); }
      QG.sfx.measure();
      paintHud();
      if (potted >= balls.length) { over = true; api.setBest(shots); api.win("Table cleared!", "All six colours potted with " + shots + " shots to spare."); return; }
      if (shots <= 0) {
        over = true;
        api.setBest(potted);
        api.lose("Out of shots.", "You potted " + potted + " of " + balls.length + " colours.");
        return;
      }
      api.setStatus("Shots left: " + shots + " - aim, set power, SHOOT.");
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      QG.draw.rect(ctx, 16, 16, W - 32, H - 32, { fill: U.rgba(PAL.green, .28), color: PAL.ink, width: 5, radius: 8, wobble: 2 });
      ZONES.forEach(function (z) {
        QG.draw.circle(ctx, z.x, z.y, z.r, { fill: U.rgba(PAL.purple, .16), stroke: false });
        QG.draw.dashedCircle(ctx, z.x, z.y, z.r, { color: PAL.purple, width: 2 });
      });
      POCKETS.forEach(function (p) {
        QG.draw.circle(ctx, p[0], p[1], 15, { fill: PAL.ink, color: PAL.ink, width: 3, double: false });
      });
      balls.forEach(function (b) {
        if (b.potted) return;
        QG.draw.circle(ctx, b.x, b.y, 11, { fill: b.c, color: PAL.ink, width: 3, double: false });
      });
      // aim lines
      var L = 250;
      if (spread > 0) {
        QG.draw.line(ctx, cue.x, cue.y, cue.x + Math.cos(aim + spread) * L, cue.y + Math.sin(aim + spread) * L,
          { color: PAL.purple, width: 2.5, wobble: 1, passes: 1 });
      }
      QG.draw.line(ctx, cue.x, cue.y, cue.x + Math.cos(aim) * L, cue.y + Math.sin(aim) * L,
        { color: PAL.cyan, width: 3.5, wobble: 1 });
      QG.draw.circle(ctx, cue.x, cue.y, 11, { fill: PAL.paper, color: PAL.ink, width: 3.4 });
      QG.draw.text(ctx, "POWER " + Math.round(power * 100) + "%", W / 2, 30, { size: 12, color: PAL.ink });
    }

    function paintHud() {
      var sig = potted + "|" + shots + "|" + spread + "|" + Math.round(power * 100);
      if (sig === hudSig) return;
      hudSig = sig;
      QG.clear(hud);
      [["Potted", potted + "/6"], ["Shots left", shots], ["Spread", spread === 0 ? "measured" : spread.toFixed(2)],
       ["Power", Math.round(power * 100) + "%"]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "Potted", value: potted + "/6", color: "green" },
        { name: "Shots", value: shots, color: "yellow" }
      ]);
    }

    reset();
    api.loop(draw);
    paintHud();
    api.setStatus("Drag to aim. SHOOT sends the cue down both lines at once.");
  });

  /* ==========================================================
     35. QUANTUM BATTLESHIPS: FLEET WAR  (10x10)
     ========================================================== */
  QG.register("quantum-fleet-war", function (root, api) {
    var N = 10;
    var SHIPS = [{ n: "Carrier", s: 5 }, { n: "Battleship", s: 4 }, { n: "Cruiser", s: 3 }, { n: "Submarine", s: 3 }, { n: "Patrol", s: 2 }];

    function placements(size) {
      var out = [];
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
        if (c + size <= N) { var a = []; for (var k = 0; k < size; k++) a.push(r * N + c + k); out.push(a); }
        if (r + size <= N) { var b = []; for (var k2 = 0; k2 < size; k2++) b.push((r + k2) * N + c); out.push(b); }
      }
      return out;
    }
    function randFleet() {
      var used = {}, fleet = [];
      SHIPS.forEach(function (s) {
        var tries = 0;
        while (tries++ < 5000) {
          var pl = U.pick(placements(s.s));
          var ok = true;
          for (var i = 0; i < pl.length; i++) if (used[pl[i]]) { ok = false; break; }
          if (ok) { pl.forEach(function (x) { used[x] = 1; }); fleet.push({ name: s.n, cells: pl, hits: {} }); break; }
        }
      });
      return fleet;
    }

    var enemy, player, shots, misses, heat, scans, jams, scanFx, turn, over, showHeat;

    function reset() {
      enemy = randFleet(); player = randFleet();
      shots = {}; misses = {}; heat = new Float64Array(N * N);
      scans = 2; jams = 3; scanFx = 0; turn = "you"; over = false; showHeat = true;
      recompute();
    }
    function sunk(f) { return f.filter(function (s) { return s.cells.every(function (c) { return s.hits[c]; }); }).length; }
    function allSunk(f) { return f.every(function (s) { return s.cells.every(function (c) { return s.hits[c]; }); }); }

    function recompute() {
      heat = new Float64Array(N * N);
      enemy.forEach(function (ship) {
        var hc = Object.keys(ship.hits).map(Number);
        var list = placements(ship.cells.length).filter(function (pl) {
          for (var i = 0; i < pl.length; i++) if (misses[pl[i]]) return false;
          return hc.every(function (x) { return pl.indexOf(x) >= 0; });
        });
        list.forEach(function (pl) { pl.forEach(function (i) { heat[i] += 1 / (list.length || 1); }); });
      });
      var mx = 0;
      for (var i = 0; i < heat.length; i++) mx = Math.max(mx, heat[i]);
      if (mx > 0) for (var j = 0; j < heat.length; j++) heat[j] /= mx;
    }

    var grid = api.grid(N, N, onFire);
    var btnRow = h("div.actions.mt12");
    var bScan = api.btn("Scan (2)", "purple", function () {
      if (over || turn !== "you" || scans <= 0) { if (scans <= 0) api.toast("No scans left", "bad"); return; }
      scans--; scanFx = 3;
      enemy.forEach(function (s) { s.cells.forEach(function (c) { s.hits[c] = true; }); });
      api.log("You <b>SCANNED</b> the whole enemy fleet - every ship measured. The AI gets double shots for 3 turns.");
      QG.sfx.measure();
      paint();
      if (allSunk(enemy)) { over = true; api.setBest("win"); api.win("Fleet annihilated!", "A single scan found everything."); }
    });
    var bJam = api.btn("Jam (3)", "cyan", function () {
      if (over || turn !== "you" || jams <= 0) { if (jams <= 0) api.toast("No jams left", "bad"); return; }
      jams--;
      api.log("You <b>JAMMED</b> the AI's targeting for 3 turns.");
      QG.sfx.zap(); paint();
    });
    var bHeat = api.btn("Heatmap: on", "ghost", function () {
      showHeat = !showHeat;
      bHeat.innerHTML = "Heatmap: " + (showHeat ? "on" : "off");
      paint();
    });
    btnRow.appendChild(bScan); btnRow.appendChild(bJam); btnRow.appendChild(bHeat);

    var hud = h("div.hud.mt12");

    root.appendChild(h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "FLEET WAR"),
      h("span.badge", "10 x 10 ocean")
    ));
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(btnRow);
    root.appendChild(hud);

    function paint() {
      for (var i = 0; i < N * N; i++) {
        var r = Math.floor(i / N), c = i % N, cls = "cell cell--dark", html = "";
        var ship = null;
        for (var k = 0; k < enemy.length; k++) if (enemy[k].hits[i]) { ship = enemy[k]; break; }
        if (misses[i]) { cls += " is-hint"; html = "<span style='opacity:.45'>\u00B7</span>"; }
        if (ship) {
          var isSunk = ship.cells.every(function (x) { return ship.hits[x]; });
          cls += " is-measured" + (isSunk ? " is-sel" : "");
          html = isSunk ? "\u{1F4A5}" : "\u{1F525}";
        } else if (showHeat && heat[i] > 0.04) {
          cls += " is-super";
          html = "<span style='font-size:.56em;opacity:.85'>" + Math.round(heat[i] * 100) + "</span>";
        }
        grid.set(r, c, html, cls.replace(/^cell\s?/, ""));
      }
      QG.clear(hud);
      [["Enemy sunk", sunk(enemy) + "/5"], ["Your sunk", sunk(player) + "/5"],
       ["Scans", scans], ["Jams", jams], ["Shots", Object.keys(shots).length],
       ["AI double-shots", scanFx > 0 ? scanFx + " turns" : "-"]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "Enemy", value: 5 - sunk(enemy), color: "magenta" },
        { name: "You", value: 5 - sunk(player), color: "lime" }
      ]);
    }

    function onFire(r, c) {
      if (over || turn !== "you") return;
      var i = r * N + c;
      if (shots[i] !== undefined) { api.toast("Already fired there", "bad", 900); return; }
      var hit = null;
      for (var k = 0; k < enemy.length; k++) if (enemy[k].cells.indexOf(i) >= 0) { hit = enemy[k]; break; }
      shots[i] = hit ? 1 : 0;
      if (hit) {
        hit.hits[i] = true;
        QG.sfx.measure();
        if (hit.cells.every(function (x) { return hit.hits[x]; })) { api.log("You <b>sank</b> the " + hit.name + "!"); api.toast("Sunk: " + hit.name, "good"); }
        else { api.log("Hit on the " + hit.name + " - it <b>collapsed</b> into place."); api.toast("Hit!", "good"); }
      } else {
        misses[i] = true;
        QG.sfx.tick();
        api.log("Miss at " + String.fromCharCode(65 + c) + (r + 1) + ".");
      }
      recompute(); paint();
      if (allSunk(enemy)) { over = true; api.setBest("win"); api.win("Fleet destroyed!", "You measured every enemy ship."); return; }
      turn = "ai";
      api.setStatus("The AI is returning fire...");
      api.after(480, aiFire);
    }

    function aiFire() {
      if (over) return;
      var shotsToTake = scanFx > 0 ? 2 : 1;
      if (scanFx > 0) scanFx--;
      var accuracy = jams > 0 ? 0.55 : 0.85;
      var did = 0;
      for (var t = 0; t < shotsToTake; t++) {
        if (allSunk(player)) break;
        var cands = [];
        for (var i = 0; i < N * N; i++) if (!misses["p" + i] && !player.some(function (s) { return s.hits[i]; })) cands.push(i);
        if (!cands.length) break;
        var pick;
        if (Math.random() > accuracy) pick = U.pick(cands);
        else {
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
          pick = hot.length ? U.pick(hot) : U.pick(cands);
        }
        var hit = null;
        for (var k = 0; k < player.length; k++) if (player[k].cells.indexOf(pick) >= 0) { hit = player[k]; break; }
        if (hit) { hit.hits[pick] = true; QG.sfx.zap(); api.log("Enemy <b>hit</b> your " + hit.name + "!"); }
        else { misses["p" + pick] = true; api.log("Enemy missed."); }
        did++;
      }
      if (!did) { turn = "you"; paint(); return; }
      turn = "you"; paint();
      if (allSunk(player)) { over = true; api.lose("Your fleet is gone.", "The AI measured every ship you had."); return; }
      api.setStatus("Your turn - fire at the enemy ocean.");
    }

    reset(); paint();
    bHeat.innerHTML = "Heatmap: on";
    api.setStatus("Tap the ocean to fire. The numbers are enemy ship odds.");
  });
})();
