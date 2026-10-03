/* ============================================================
   QUANTUM ARCADE — games/pack4.js
   16 Quantum Carrom   17 Quantum Kabaddi   18 Quantum Kho-Kho
   19 Quantum Ludo     20 Quantum Pachisi
   Indian Classics pack.
   ============================================================ */
(function () {
  "use strict";
  var QG = window.QG, h = QG.h, PAL = QG.PAL, U = QG.U;

  /* offscreen static-layer helper (keeps per-frame canvas work tiny) */
  function offscreen(w, hgt, scale) {
    var el = document.createElement("canvas");
    el.width = Math.round(w * scale);
    el.height = Math.round(hgt * scale);
    var g = el.getContext("2d");
    g.scale(scale, scale);
    return { el: el, ctx: g, w: w, h: hgt };
  }
  function dashLine(c, x1, y1, x2, y2, color, width, dash) {
    c.save();
    c.beginPath();
    c.setLineDash(dash || [7, 6]);
    c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.strokeStyle = color; c.lineWidth = width || 2.5; c.lineCap = "round";
    c.stroke();
    c.restore();
  }

  /* ==========================================================
     16. QUANTUM CARROM
     ========================================================== */
  QG.register("quantum-carrom", function (root, api) {
    var W = 420, PAD = 26, PR = 20, CR = 9, SR = 10;
    var IN0 = PAD, IN1 = W - PAD, CTR = W / 2;
    var FR = 0.965, WALL = 0.8, ELAST = 0.93;
    var SX = CTR, SY = IN1 - 38;
    var POCKETS = [
      { x: IN0 + 16, y: IN0 + 16 }, { x: IN1 - 16, y: IN0 + 16 },
      { x: IN0 + 16, y: IN1 - 16 }, { x: IN1 - 16, y: IN1 - 16 }
    ];
    var ZONES = [
      { x: CTR + 26.87, y: CTR + 26.87, r: 27 },
      { x: CTR - 26.87, y: CTR - 26.87, r: 27 },
      { x: CTR, y: CTR + 38, r: 27 }
    ];

    var coins, aim, power, spread, measured, shots, score, over, busy;
    var running, wA, wB, frame, startPos, lastReal;

    function reset() {
      coins = [];
      var pos = [{ x: CTR, y: CTR }];
      for (var k = 0; k < 8; k++) {
        var a = k * Math.PI / 4;
        pos.push({ x: CTR + Math.cos(a) * 38, y: CTR + Math.sin(a) * 38 });
      }
      for (var i = 0; i < pos.length; i++) {
        coins.push({ id: i, x: pos[i].x, y: pos[i].y, alive: true, dark: i % 2 === 0 });
      }
      aim = -Math.PI / 2; power = 0.65; spread = 14; measured = false;
      shots = 12; score = 0; over = false; busy = false;
      running = false; wA = null; wB = null; frame = 0; startPos = {}; lastReal = 0;
    }

    function byId(id) { for (var i = 0; i < coins.length; i++) if (coins[i].id === id) return coins[i]; return null; }
    function pottedCount() { var n = 0; for (var i = 0; i < coins.length; i++) if (!coins[i].alive) n++; return n; }
    function inZone(x, y) {
      for (var i = 0; i < ZONES.length; i++) {
        var z = ZONES[i], dx = x - z.x, dy = y - z.y;
        if (dx * dx + dy * dy <= z.r * z.r) return true;
      }
      return false;
    }

    /* ---------- static board ---------- */
    var off = (function () {
      var o = offscreen(W, W, 2), g = o.ctx, i;
      QG.draw.rect(g, PAD - 8, PAD - 8, W - 2 * (PAD - 8), W - 2 * (PAD - 8),
        { fill: "#e0ab63", color: "#7a4a1d", width: 4.5, radius: 10, wobble: 2 });
      QG.draw.rect(g, IN0, IN0, IN1 - IN0, IN1 - IN0,
        { fill: "rgba(255,247,221,.30)", color: "#7a4a1d", width: 2.5, radius: 4, wobble: 1.6 });
      QG.draw.dashedCircle(g, CTR, CTR, 52, { color: "rgba(122,74,29,.65)", dash: [5, 7], width: 2 });
      QG.draw.dashedCircle(g, CTR, CTR, 20, { color: "rgba(122,74,29,.65)", dash: [4, 5], width: 2 });
      /* base lines */
      [IN0 + 58, IN1 - 58].forEach(function (y) {
        QG.draw.line(g, IN0 + 26, y - 13, IN1 - 26, y - 13, { color: "#7a4a1d", width: 2.5, wobble: 1.2 });
        QG.draw.line(g, IN0 + 26, y + 13, IN1 - 26, y + 13, { color: "#7a4a1d", width: 2.5, wobble: 1.2 });
        QG.draw.circle(g, IN0 + 26, y, 5, { fill: "#7a4a1d", stroke: false, double: false });
        QG.draw.circle(g, IN1 - 26, y, 5, { fill: "#7a4a1d", stroke: false, double: false });
      });
      /* interference zones */
      for (i = 0; i < ZONES.length; i++) {
        var z = ZONES[i];
        QG.draw.circle(g, z.x, z.y, z.r, { fill: U.rgba(PAL.purple, 0.20), stroke: false, double: false });
        QG.draw.dashedCircle(g, z.x, z.y, z.r, { color: PAL.purple, dash: [7, 6], width: 2.5 });
        QG.draw.text(g, "\u2248", z.x, z.y + 1, { size: 20, color: PAL.purple, font: QG.FONT.display });
      }
      /* pockets */
      for (i = 0; i < POCKETS.length; i++) {
        QG.draw.circle(g, POCKETS[i].x, POCKETS[i].y, PR, { fill: "#2b1a0a", color: "#120b04", width: 3 });
      }
      return o;
    })();

    var cv = api.canvas({ w: W, h: W });
    var c = cv.ctx;

    var head = h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM CARROM"),
      h("span.badge", "Superposed striker")
    );
    root.appendChild(head);
    /* canvas is appended by api.canvas here (between header and controls) */

    var spreadVal = h("span.qmeter__val", "14\u00B0");
    var spreadIn = h("input", {
      type: "range", min: "0", max: "30", step: "1", value: "14",
      style: "flex:1;min-width:120px", "aria-label": "spread",
      oninput: function (e) { spread = parseFloat(e.target.value) || 0; spreadVal.textContent = Math.round(spread) + "\u00B0"; paint(); }
    });
    var powerVal = h("span.qmeter__val", "65%");
    var powerIn = h("input", {
      type: "range", min: "5", max: "100", step: "1", value: "65",
      style: "flex:1;min-width:120px", "aria-label": "power",
      oninput: function (e) { power = (parseFloat(e.target.value) || 5) / 100; powerVal.textContent = Math.round(power * 100) + "%"; }
    });
    var rowSpread = h("div.qmeter__row.mt12", h("span.qmeter__lab", "SPREAD"), spreadIn, spreadVal);
    var rowPower = h("div.qmeter__row.mt8", h("span.qmeter__lab", "POWER"), powerIn, powerVal);

    var btnRow = h("div.actions.mt12");
    var bShoot = api.btn("Shoot", "lime", doShoot);
    var bMeasure = api.btn("Measure", "cyan", function () {
      if (over || busy) return;
      measured = !measured;
      if (measured) { api.log("You <b>measured</b> the striker - one aim line, no interference bonus."); QG.sfx.measure(); }
      else api.log("Striker re-superposed into two aim lines.");
      paint(); paintHud();
    });
    var bReset = api.btn("Reset", "ghost", function () { reset(); paint(); paintHud(); api.setStatus("New board. Drag to aim."); });
    btnRow.appendChild(bShoot); btnRow.appendChild(bMeasure); btnRow.appendChild(bReset);

    var hud = h("div.hud.mt12");
    root.appendChild(rowSpread); root.appendChild(rowPower); root.appendChild(btnRow); root.appendChild(hud);

    var detach = QG.steer(cv.el, function (dir) {
      if (over || busy) return;
      if (dir === "left") aim -= 0.035;
      else if (dir === "right") aim += 0.035;
      else if (dir === "up") { power = U.clamp(power + 0.06, 0.05, 1); powerIn.value = Math.round(power * 100); powerVal.textContent = Math.round(power * 100) + "%"; }
      else if (dir === "down") { power = U.clamp(power - 0.06, 0.05, 1); powerIn.value = Math.round(power * 100); powerVal.textContent = Math.round(power * 100) + "%"; }
      clampAim(); paint();
    });
    api.onCleanup(detach);

    var dragging = false;
    cv.on("down", function (pt) { if (over || busy) return; dragging = true; aimAt(pt.x, pt.y); });
    cv.on("move", function (pt) { if (dragging) aimAt(pt.x, pt.y); });
    cv.on("up", function () { dragging = false; });

    function aimAt(x, y) {
      var a = Math.atan2(y - SY, x - SX);
      aim = a; clampAim(); paint();
    }
    function clampAim() {
      if (aim > -0.14) aim = -0.14;
      if (aim < -Math.PI + 0.14) aim = -Math.PI + 0.14;
    }

    function rayEnd(x, y, ang) {
      var dx = Math.cos(ang), dy = Math.sin(ang), t = 1e9;
      if (dx > 1e-6) t = Math.min(t, (IN1 - x) / dx); else if (dx < -1e-6) t = Math.min(t, (IN0 - x) / dx);
      if (dy > 1e-6) t = Math.min(t, (IN1 - y) / dy); else if (dy < -1e-6) t = Math.min(t, (IN0 - y) / dy);
      return { x: x + dx * t, y: y + dy * t };
    }

    /* ---------- physics ---------- */
    function mkWorld(ang) {
      var v = 4 + power * 9;
      var st = { x: SX, y: SY, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, r: SR, striker: true, dead: false };
      var cs = [];
      for (var i = 0; i < coins.length; i++) {
        var cn = coins[i];
        cs.push({ id: cn.id, x: cn.x, y: cn.y, vx: 0, vy: 0, r: CR, dead: !cn.alive });
      }
      return { st: st, coins: cs, balls: [st].concat(cs), potted: {}, touched: {}, foul: false };
    }

    function step(w) {
      var all = w.balls, i, j, moving = false;
      for (i = 0; i < all.length; i++) {
        var b = all[i];
        if (b.dead) continue;
        if (Math.abs(b.vx) > 0.02 || Math.abs(b.vy) > 0.02) {
          b.x += b.vx; b.y += b.vy;
          b.vx *= FR; b.vy *= FR;
          if (b.vx * b.vx + b.vy * b.vy < 0.03) { b.vx = 0; b.vy = 0; }
          moving = true;
        } else { b.vx = 0; b.vy = 0; }
      }
      if (!moving) return false;
      for (i = 0; i < all.length; i++) {
        var b2 = all[i];
        if (b2.dead) continue;
        for (j = 0; j < POCKETS.length; j++) {
          var p = POCKETS[j], dx = b2.x - p.x, dy = b2.y - p.y;
          if (dx * dx + dy * dy < (PR - 4) * (PR - 4)) {
            b2.dead = true; b2.vx = 0; b2.vy = 0;
            if (b2.striker) w.foul = true; else w.potted[b2.id] = true;
            break;
          }
        }
      }
      for (i = 0; i < all.length; i++) {
        var b3 = all[i];
        if (b3.dead) continue;
        var lo = IN0 + b3.r, hi = IN1 - b3.r;
        if (b3.x < lo) { b3.x = lo; b3.vx = Math.abs(b3.vx) * WALL; }
        if (b3.x > hi) { b3.x = hi; b3.vx = -Math.abs(b3.vx) * WALL; }
        if (b3.y < lo) { b3.y = lo; b3.vy = Math.abs(b3.vy) * WALL; }
        if (b3.y > hi) { b3.y = hi; b3.vy = -Math.abs(b3.vy) * WALL; }
      }
      for (i = 0; i < all.length; i++) {
        for (j = i + 1; j < all.length; j++) {
          var a = all[i], b4 = all[j];
          if (a.dead || b4.dead) continue;
          var ddx = b4.x - a.x, ddy = b4.y - a.y, rr = a.r + b4.r;
          var d2 = ddx * ddx + ddy * ddy;
          if (d2 > rr * rr || d2 < 1e-6) continue;
          var d = Math.sqrt(d2), nx = ddx / d, ny = ddy / d, ov = (rr - d) / 2;
          a.x -= nx * ov; a.y -= ny * ov;
          b4.x += nx * ov; b4.y += ny * ov;
          var vn = (b4.vx - a.vx) * nx + (b4.vy - a.vy) * ny;
          if (vn < 0) {
            var imp = -(1 + ELAST) * vn / 2;
            a.vx -= imp * nx; a.vy -= imp * ny;
            b4.vx += imp * nx; b4.vy += imp * ny;
            if (a.striker && !b4.striker) w.touched[b4.id] = 1;
            if (b4.striker && !a.striker) w.touched[a.id] = 1;
          }
        }
      }
      return true;
    }

    /* ---------- shooting ---------- */
    function doShoot() {
      if (over || busy) return;
      busy = true;
      var half = measured ? 0 : (spread * Math.PI / 180) / 2;
      startPos = {};
      for (var i = 0; i < coins.length; i++) startPos[coins[i].id] = { x: coins[i].x, y: coins[i].y };
      wA = mkWorld(aim - half);
      wB = measured ? null : mkWorld(aim + half);
      running = true; frame = 0;
      api.setStatus(measured ? "Measured shot - one trajectory." : "Both trajectories are in flight...");
      QG.sfx.zap();
      paint();
    }

    function finish() {
      running = false;
      var realIsA = measured ? true : (Math.random() < 0.5);
      var realW = realIsA ? wA : wB;
      var ghostW = realIsA ? wB : wA;
      lastReal = realIsA ? 0 : 1;
      var i, k;
      for (i = 0; i < coins.length; i++) {
        var cn = coins[i], rc = null;
        for (k = 0; k < realW.coins.length; k++) if (realW.coins[k].id === cn.id) { rc = realW.coins[k]; break; }
        if (!rc) continue;
        if (rc.dead) cn.alive = false;
        else { cn.x = rc.x; cn.y = rc.y; }
      }
      /* coins brushed only by the ghost line get an interference nudge */
      var nudged = 0;
      if (ghostW) {
        for (k = 0; k < ghostW.coins.length; k++) {
          var gc = ghostW.coins[k];
          if (gc.dead || !ghostW.touched[gc.id] || realW.touched[gc.id]) continue;
          var t = byId(gc.id);
          if (t && t.alive) {
            t.x += (Math.random() * 2 - 1) * 7;
            t.y += (Math.random() * 2 - 1) * 7;
            nudged++;
          }
        }
      }
      /* keep every coin legal */
      for (i = 0; i < coins.length; i++) {
        var c2 = coins[i];
        if (!c2.alive) continue;
        c2.x = U.clamp(c2.x, IN0 + CR, IN1 - CR);
        c2.y = U.clamp(c2.y, IN0 + CR, IN1 - CR);
        for (k = 0; k < POCKETS.length; k++) {
          var pk = POCKETS[k], dx = c2.x - pk.x, dy = c2.y - pk.y, dd = Math.sqrt(dx * dx + dy * dy);
          if (dd < PR + CR) {
            var ux = (c2.x - CTR), uy = (c2.y - CTR), ul = Math.sqrt(ux * ux + uy * uy) || 1;
            c2.x += (ux / ul) * (PR + CR - dd);
            c2.y += (uy / ul) * (PR + CR - dd);
          }
        }
      }
      /* score the potted coins of the real world */
      var gained = 0, list = [];
      for (var id in realW.potted) {
        if (!realW.potted.hasOwnProperty(id)) continue;
        var cid = parseInt(id, 10), sp = startPos[cid];
        var mult = (!measured && sp && inZone(sp.x, sp.y)) ? 2 : 1;
        gained += mult;
        list.push(cid + (mult === 2 ? "\u00D72" : ""));
      }
      score += gained;
      if (list.length) api.log("Potted " + list.join(", ") + " \u2014 +" + gained + " point" + (gained === 1 ? "" : "s") + ".");
      else api.log("No coins potted" + (realW.foul ? " (striker fouled)." : "."));
      if (nudged) api.log("<b>Interference:</b> " + nudged + " coin" + (nudged === 1 ? "" : "s") + " nudged by the ghost line.");
      if (realW.foul) api.log("Striker went down a pocket - foul.");
      shots--;
      measured = false; busy = false; wA = null; wB = null;
      QG.sfx.measure();
      paint(); paintHud();
      if (pottedCount() === 9) {
        over = true; api.setBest(score);
        api.win("Board cleared!", "All 9 coins potted with " + shots + " shot" + (shots === 1 ? "" : "s") + " to spare. Score " + score + ".");
        return;
      }
      if (shots <= 0) {
        over = true;
        api.lose("Out of shots.", "You potted " + pottedCount() + " of 9 coins (score " + score + ").");
        return;
      }
      api.setStatus(shots + " shot" + (shots === 1 ? "" : "s") + " left. Drag to aim, then SHOOT.");
    }

    function drawStriker(x, y, alpha) {
      c.globalAlpha = alpha;
      QG.draw.circle(c, x, y, SR, { fill: PAL.orange, color: PAL.ink, width: 2.5, wobble: 0.9 });
      c.globalAlpha = 1;
    }
    function drawCoin(x, y, alpha, dark) {
      c.globalAlpha = alpha;
      QG.draw.circle(c, x, y, CR, { fill: dark ? PAL.ink : PAL.paper2, color: PAL.ink, width: 2, wobble: 0.9 });
      c.globalAlpha = 1;
    }

    function paint() {
      c.clearRect(0, 0, W, W);
      c.drawImage(off.el, 0, 0, W, W);
      var i;
      if (running) {
        if (wB) for (i = 0; i < wB.coins.length; i++) { var gb = wB.coins[i]; if (!gb.dead) drawCoin(gb.x, gb.y, 0.35, coins[i].dark); }
        for (i = 0; i < wA.coins.length; i++) { var ab = wA.coins[i]; if (!ab.dead) drawCoin(ab.x, ab.y, 1, coins[i].dark); }
        drawStriker(wA.st.x, wA.st.y, 1);
        if (wB) drawStriker(wB.st.x, wB.st.y, 0.4);
        return;
      }
      /* aim lines */
      var half = measured ? 0 : (spread * Math.PI / 180) / 2;
      var e1 = rayEnd(SX, SY, aim - half);
      var e2 = rayEnd(SX, SY, aim + half);
      if (!measured) {
        dashLine(c, SX, SY, e2.x, e2.y, U.rgba(PAL.purple, 0.95), 2.5, [8, 7]);
        QG.draw.line(c, SX, SY, e1.x, e1.y, { color: U.rgba(PAL.orange, 0.95), width: 3, wobble: 0.8 });
      } else {
        QG.draw.line(c, SX, SY, e1.x, e1.y, { color: PAL.cyan, width: 3.5, wobble: 0.6 });
        QG.draw.text(c, "MEASURED", (SX + e1.x) / 2, (SY + e1.y) / 2 - 12, { size: 12, color: PAL.cyan });
      }
      for (i = 0; i < coins.length; i++) {
        var cn = coins[i];
        if (cn.alive) drawCoin(cn.x, cn.y, 1, cn.dark);
      }
      drawStriker(SX, SY, 1);
      if (measured) QG.draw.dashedCircle(c, SX, SY, SR + 6, { color: PAL.cyan, dash: [4, 4], width: 2 });
    }

    function paintHud() {
      QG.clear(hud);
      [["Shots left", shots], ["Potted", pottedCount() + "/9"], ["Score", score], ["Striker", measured ? "COLLAPSED" : "2 LINES"]]
        .forEach(function (kv) {
          hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
        });
      bMeasure.innerHTML = measured ? "\u2713 Measured" : "Measure";
      bMeasure.style.background = measured ? PAL.cyan : "";
      bMeasure.style.color = measured ? "#101018" : "";
      bShoot.disabled = running || over;
      api.setScores([
        { name: "Score", value: score, color: "orange" },
        { name: "Coins", value: pottedCount() + "/9", color: "lime" },
        { name: "Shots", value: shots, color: "cyan" }
      ]);
    }

    api.loop(function () {
      if (!running) return;
      var s;
      for (s = 0; s < 3; s++) {
        var a = step(wA), b = wB ? step(wB) : false;
        frame++;
        if ((!a && !b) || frame > 900) { finish(); break; }
      }
      paint();
    });

    reset(); paint(); paintHud();
    api.setStatus("Drag on the board (or arrows) to aim, then SHOOT.");
  });

  /* ==========================================================
     17. QUANTUM KABADDI
     ========================================================== */
  QG.register("quantum-kabaddi", function (root, api) {
    var COLS = 4, LANES = 3, BUDGET = 8, GOAL = 3;
    var lane, col, ghost, hasLoot, moves, defenders, raiding, score, fails, raid, over, busy;

    function reset() {
      score = 0; fails = 0; raid = 1; over = false;
      startRaid();
    }
    function startRaid() {
      lane = 1; col = 0; ghost = -1; hasLoot = false; moves = 0; busy = false; raiding = true;
      var spots = [[0, 1], [0, 2], [1, 1], [1, 2], [2, 1], [2, 2]];
      defenders = U.shuffle(spots).slice(0, 3).map(function (s) { return { lane: s[0], col: s[1] }; });
      paint();
      api.setStatus("Raid " + raid + ": reach the treasure (col 4) and get back to your start line.");
    }

    function cloud() {
      /* returns [{lane, p}] — the probability cloud over adjacent lanes */
      var out = [], g = ghost >= 0 ? 0.32 : 0;
      var total = 1 + (ghost >= 0 ? 0.32 : 0);
      out.push({ lane: lane, p: 1 / total });
      if (ghost >= 0) out.push({ lane: ghost, p: 0.32 / total });
      return out;
    }
    function uncertainty() { return ghost >= 0 ? 1 : 0; }

    var grid = api.grid(COLS, LANES, onCell);
    var head = h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM KABADDI"),
      h("span.badge", "You are the raider")
    );
    var legend = h("div.small.muted.tc.mt8", "Brightest cell = your real position \u00B7 percentages = your probability cloud \u00B7 \u25A0 defenders \u00B7 \u2605 treasure");
    var pad = QG.dpad({ onPress: function (dir) { move(dir); } });
    var btnRow = h("div.actions.mt12");
    var bDash = api.btn("Dash \u00BB", "orange", function () { dash(); });
    var bScan = api.btn("Scan odds", "ghost", function () {
      api.toast("Defenders scan with " + Math.round(scanChance() * 100) + "% odds \u2014 spreading lowers it.", "quantum");
    });
    btnRow.appendChild(bDash); btnRow.appendChild(bScan);
    var hud = h("div.hud.mt12");

    root.appendChild(head);
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(legend);
    root.appendChild(h("div.mt12", pad));
    root.appendChild(btnRow);
    root.appendChild(hud);

    var detach = QG.steer(grid.el, function (dir) { move(dir); });
    api.onCleanup(detach);

    function scanChance() { return 0.30 + 0.45 * (1 - uncertainty()); }

    function inCloud(l) {
      if (l === lane) return true;
      return ghost >= 0 && l === ghost;
    }

    function move(dir) {
      if (over || busy || !raiding) return;
      if (dir === "up") col = Math.min(GOAL, col + 1);
      else if (dir === "down") col = Math.max(0, col - 1);
      else if (dir === "left") lane = Math.max(0, lane - 1);
      else if (dir === "right") lane = Math.min(LANES - 1, lane + 1);
      else return;
      /* stepping narrows the cloud a little */
      if (ghost >= 0 && Math.random() < 0.5) ghost = -1;
      if (ghost === lane) ghost = -1;
      QG.sfx.tick();
      resolve();
    }

    function dash() {
      if (over || busy || !raiding) return;
      if (col >= GOAL) { api.toast("Already at the treasure end", "bad", 900); return; }
      col = Math.min(GOAL, col + 2);
      /* dashing spreads you further */
      var opts = [];
      if (lane - 1 >= 0) opts.push(lane - 1);
      if (lane + 1 <= LANES - 1) opts.push(lane + 1);
      ghost = opts.length ? U.pick(opts) : -1;
      QG.sfx.zap();
      resolve();
    }

    function resolve() {
      moves++;
      busy = true;
      var i, hit = null, ghostHit = null;
      for (i = 0; i < defenders.length; i++) {
        var d = defenders[i];
        if (d.col !== col) continue;
        if (d.lane === lane) hit = d;
        else if (ghost >= 0 && d.lane === ghost) ghostHit = d;
      }
      if (col === GOAL) hasLoot = true;
      paint();

      if (hit) {
        defenders.splice(defenders.indexOf(hit), 1);
        api.log("You <b>TAGGED</b> a defender in lane " + (hit.lane + 1) + ".");
        QG.sfx.good();
      } else if (ghostHit) {
        endRaid(false, "You touched a ghost cell - the defender was never really there.");
        return;
      }
      if (hasLoot && col === 0) { endRaid(true, "You carried the treasure home!"); return; }
      if (moves > BUDGET) { endRaid(false, "Out of moves."); return; }

      /* defenders scan */
      api.after(360, function () {
        if (over) { busy = false; return; }
        if (Math.random() < scanChance()) {
          ghost = -1;
          QG.sfx.measure();
          api.log("<b>SCAN:</b> the defenders measured you into lane " + (lane + 1) + ".");
          paint();
          var tackle = null;
          for (var k = 0; k < defenders.length; k++) {
            var d = defenders[k];
            if (Math.abs(d.lane - lane) + Math.abs(d.col - col) === 1) { tackle = d; break; }
          }
          if (tackle) {
            api.after(420, function () { endRaid(false, "A defender measured you and tackled you."); });
            return;
          }
        }
        busy = false;
        api.setStatus("Raid " + raid + " \u00B7 move " + moves + "/" + BUDGET + " \u00B7 col " + (col + 1) + "/" + COLS +
          (hasLoot ? " \u00B7 loot secured, run home!" : ""));
        paint();
      });
    }

    function endRaid(ok, why) {
      raiding = false; busy = false;
      if (ok) {
        score++;
        api.log("<b>Raid " + raid + " scored!</b>");
        QG.sfx.good();
      } else {
        fails++;
        api.log("Raid " + raid + " failed: " + why);
        QG.sfx.lose();
      }
      paint();
      if (score >= 2) { over = true; api.setBest(score + " raids"); api.win("Match won!", "You scored " + score + " raids to " + fails + "."); return; }
      if (fails >= 2) { over = true; api.lose("Match lost.", "The defenders held you to " + score + " successful raid" + (score === 1 ? "" : "s") + "."); return; }
      raid++;
      api.setStatus(why + " Preparing raid " + raid + "...");
      api.after(1100, startRaid);
    }

    function onCell(r, c) {
      if (over || busy || !raiding) return;
      if (r === lane && c === col) { api.toast("You are already here", "bad", 800); return; }
      if (c === col && Math.abs(r - lane) === 1) move(r < lane ? "left" : "right");
      else if (r === lane && Math.abs(c - col) === 1) move(c > col ? "up" : "down");
      else api.toast("Move one cell with the pad or tap an adjacent cell", "bad", 1100);
    }

    function paint() {
      var cl = cloud(), i, j, r, cc;
      for (r = 0; r < LANES; r++) {
        for (cc = 0; cc < COLS; cc++) {
          var html = "", cls = "";
          if (cc === GOAL) { html += "<span style='color:" + PAL.yellow + "'>\u2605</span>"; cls += " is-hint"; }
          if (cc === 0) cls += " cell--dark";
          var def = null;
          for (i = 0; i < defenders.length; i++) if (defenders[i].lane === r && defenders[i].col === cc) def = defenders[i];
          if (def) html += "<span style='color:" + PAL.red + "'>\u25A0</span>";
          if (raiding && cc === col) {
            for (j = 0; j < cl.length; j++) {
              if (cl[j].lane !== r) continue;
              var real = cl[j].lane === lane;
              html += "<span style='color:" + (real ? PAL.cyan : PAL.purple) + ";opacity:" + (real ? 1 : 0.55) + "'>\u25C6</span>";
              html += "<span class='cell__lab'>" + Math.round(cl[j].p * 100) + "%</span>";
              if (real) cls += " is-sel"; else cls += " is-super";
            }
          }
          grid.set(r, cc, html, cls.replace(/^\s+/, ""));
        }
      }
      QG.clear(hud);
      [["Raid", raid + "/3"], ["Moves", moves + "/" + BUDGET], ["Score", score], ["Defenders", defenders.length],
       ["Scan odds", Math.round(scanChance() * 100) + "%"]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      bDash.disabled = over || busy || !raiding;
      api.setScores([
        { name: "Raids won", value: score, color: "magenta" },
        { name: "Failed", value: fails, color: "red" },
        { name: "Moves", value: moves + "/" + BUDGET, color: "cyan" }
      ]);
    }

    reset();
    api.setStatus("Raid 1: move forward to the treasure, then back to the start line.");
  });

  /* ==========================================================
     18. QUANTUM KHO-KHO
     ========================================================== */
  QG.register("quantum-kho-kho", function (root, api) {
    var N = 9, LIMIT = 15;
    var chaser, runner, ghost, definite, revealed, turns, khoCd, round, wins, losses, over, busy;

    function reset() {
      wins = 0; losses = 0; round = 1; over = false;
      startRound();
    }
    function startRound() {
      chaser = 0;
      runner = 5; ghost = 7; definite = 0; revealed = false;
      turns = 0; khoCd = 0; busy = false;
      paint();
      api.setStatus("Round " + round + ": chase the runner. LEFT/RIGHT to move, KHO to teleport.");
    }

    var grid = api.grid(N, 1, onCell);
    var head = h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM KHO-KHO"),
      h("span.badge", "You are the chaser")
    );
    var legend = h("div.small.muted.tc.mt8", "Both \u25CF are the runner - only one is real \u00B7 MEASURE reveals it, but the runner sprints 2 \u00B7 \u25C6 is you");
    var btnRow = h("div.actions.mt12");
    var bKho = api.btn("Kho (teleport)", "purple", doKho);
    var bMeasure = api.btn("Measure", "cyan", doMeasure);
    btnRow.appendChild(bKho); btnRow.appendChild(bMeasure);
    var hud = h("div.hud.mt12");

    root.appendChild(head);
    root.appendChild(h("div.mt12", grid.el));
    root.appendChild(legend);
    root.appendChild(h("div.actions.mt12",
      api.btn("\u25C0 Left", "ghost", function () { stepChaser(-1); }),
      api.btn("Right \u25B6", "ghost", function () { stepChaser(1); })
    ));
    root.appendChild(btnRow);
    root.appendChild(hud);

    var detach = QG.steer(grid.el, function (dir) {
      if (dir === "left") stepChaser(-1);
      else if (dir === "right") stepChaser(1);
    });
    api.onCleanup(detach);

    function stepChaser(d) {
      if (over || busy) return;
      var t = chaser + d;
      if (t < 0 || t >= N) { api.toast("End of the line", "bad", 800); return; }
      chaser = t;
      afterChaser();
    }
    function onCell(r, c) {
      if (over || busy) return;
      if (Math.abs(c - chaser) === 1) { chaser = c; afterChaser(); return; }
      if (khoCd <= 0) { chaser = c; api.log("Kho! You teleported to square " + (c + 1) + "."); QG.sfx.teleport(); afterChaser(); return; }
      api.toast("KHO recharges in " + khoCd + " turn" + (khoCd === 1 ? "" : "s"), "bad", 1000);
    }

    function afterChaser() {
      busy = true;
      if (khoCd > 0) khoCd--;
      turns++;
      paint();
      if (chaser === runner) { endRound(true, "You landed on the runner's real square!"); return; }
      if (!revealed && chaser === ghost) {
        api.log("That square held only the ghost - a wasted move.");
        QG.sfx.tick();
      }
      if (turns >= LIMIT) { endRound(false, "You ran out of turns."); return; }
      api.after(280, runnerTurn);
    }

    function runnerTurn() {
      if (over) { busy = false; return; }
      var dir = runner > chaser ? 1 : (runner < chaser ? -1 : (runner < N / 2 ? 1 : -1));
      var nr = runner + dir;
      if (nr < 0 || nr >= N) nr = runner - dir;
      runner = nr;
      if (ghost >= 0) {
        var gd = Math.random() < 0.5 ? 1 : -1;
        var ng = ghost + gd;
        if (ng < 0 || ng >= N || ng === runner) ng = ghost - gd;
        if (ng >= 0 && ng < N && ng !== runner) ghost = ng;
        else ghost = -1;
      }
      if (definite > 0) {
        definite--;
        if (definite === 0) {
          var opts = [];
          if (runner - 1 >= 0) opts.push(runner - 1);
          if (runner + 1 < N) opts.push(runner + 1);
          ghost = opts.length ? U.pick(opts) : -1;
          revealed = false;
          api.log("The runner re-superposed across two squares.");
        }
      }
      busy = false;
      paint();
      if (chaser === runner) { endRound(true, "You tagged the runner!"); return; }
      api.setStatus("Turn " + turns + "/" + LIMIT + (khoCd <= 0 ? " \u00B7 KHO ready" : " \u00B7 KHO in " + khoCd));
    }

    function doKho() {
      if (over || busy) return;
      if (khoCd > 0) { api.toast("KHO recharges in " + khoCd + " turn" + (khoCd === 1 ? "" : "s"), "bad", 1000); return; }
      api.toast("KHO armed - tap any square to teleport there.", "quantum", 1600);
      api.setStatus("Tap a square to teleport (KHO armed).");
      paint();
    }

    function doMeasure() {
      if (over || busy) return;
      if (revealed) { api.toast("The runner is already definite", "bad", 900); return; }
      busy = true;
      QG.sfx.measure();
      revealed = true; ghost = -1; definite = 3;
      api.log("<b>MEASURE:</b> the runner collapsed onto square " + (runner + 1) + ".");
      var dir = runner >= chaser ? 1 : -1;
      var nr = runner + dir * 2;
      if (nr < 0 || nr >= N) nr = U.clamp(runner - dir * 2, 0, N - 1);
      runner = nr;
      turns++;
      api.log("It sprints 2 squares to " + (runner + 1) + ".");
      paint();
      if (turns >= LIMIT) { endRound(false, "You ran out of turns."); return; }
      api.after(360, function () {
        busy = false;
        if (chaser === runner) { endRound(true, "You were already on top of it!"); return; }
        api.setStatus("Turn " + turns + "/" + LIMIT + " \u00B7 runner measured for " + definite + " turns.");
      });
    }

    function endRound(ok, why) {
      busy = true;
      if (ok) { wins++; api.log("<b>Round " + round + " won:</b> " + why); QG.sfx.good(); }
      else { losses++; api.log("Round " + round + " lost: " + why); QG.sfx.lose(); }
      paint();
      if (wins >= 2) { over = true; api.setBest(wins + "-" + losses); api.win("Match won!", "You caught the runner " + wins + " rounds to " + losses + "."); return; }
      if (losses >= 2) { over = true; api.lose("Match lost.", "The runner escaped twice (" + wins + "-" + losses + ")."); return; }
      round++;
      api.setStatus(why + " Starting round " + round + "...");
      api.after(1200, startRound);
    }

    function paint() {
      var i;
      for (i = 0; i < N; i++) {
        var html = "", cls = "";
        if (i === runner) { html += "<span style='color:" + PAL.magenta + "'>\u25CF</span>"; cls += " is-super"; }
        if (!revealed && i === ghost) html += "<span style='color:" + PAL.magenta + ";opacity:.6'>\u25CF</span>";
        if (revealed && i === runner) cls += " is-measured";
        if (i === chaser) { html += "<span style='color:" + PAL.cyan + "'>\u25C6</span>"; cls += " is-sel"; }
        if (Math.abs(i - chaser) === 1) cls += " is-hint";
        grid.set(0, i, html, cls.replace(/^\s+/, ""));
      }
      QG.clear(hud);
      [["Round", round + " / 3"], ["Turns", turns + "/" + LIMIT], ["Rounds", wins + "-" + losses],
       ["Runner", revealed ? "MEASURED" : "2 squares"], ["KHO", khoCd <= 0 ? "ready" : khoCd + " turns"]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      bKho.disabled = over || busy || khoCd > 0;
      bMeasure.disabled = over || busy || revealed;
      api.setScores([
        { name: "You", value: wins, color: "cyan" },
        { name: "Runner", value: losses, color: "magenta" },
        { name: "Turns", value: turns + "/" + LIMIT, color: "yellow" }
      ]);
    }

    reset();
    api.setStatus("Round 1: LEFT/RIGHT to move, MEASURE to reveal the runner.");
  });

  /* ==========================================================
     19. QUANTUM LUDO
     ========================================================== */
  QG.register("quantum-ludo", function (root, api) {
    var W = 460, M = 40, S = 380, C = S / 13;
    var LAP = 26, HLEN = 4, TOTAL = LAP + HLEN;
    var START = [32, 6];
    var COL = [PAL.cyan, PAL.magenta];

    function ringPos(i) {
      var p = (i + 0.5) * C;
      if (p < S) return { x: M + p, y: M };
      if (p < 2 * S) return { x: M + S, y: M + (p - S) };
      if (p < 3 * S) return { x: M + S - (p - 2 * S), y: M + S };
      return { x: M, y: M + S - (p - 3 * S) };
    }
    /* owner 0 starts on the bottom-middle and homes via the TOP column;
       owner 1 starts on the top-middle and homes via the BOTTOM column. */
    function homeColPos(owner, j) {
      var d = 45 + j * 33;
      if (owner === 0) return { x: M + S / 2, y: M + d };
      if (owner === 1) return { x: M + S / 2, y: M + S - d };
      if (owner === 2) return { x: M + S - d, y: M + S / 2 };
      return { x: M + d, y: M + S / 2 };
    }
    var YARD = [{ x: M + 2.5 * C, y: M + 10.5 * C }, { x: M + 10.5 * C, y: M + 2.5 * C },
                { x: M + 2.5 * C, y: M + 2.5 * C }, { x: M + 10.5 * C, y: M + 10.5 * C }];
    var HOME_C = { x: M + S / 2, y: M + S / 2 };

    var tokens, weights, bias, turn, over, busy, sel, lastSix;

    function reset() {
      tokens = [];
      for (var o = 0; o < 2; o++) for (var i = 0; i < 4; i++) tokens.push({ owner: o, p: -1, slot: i });
      weights = [1, 1, 1, 1, 1, 1];
      bias = [0, 0]; turn = 0; over = false; busy = false; sel = -1; lastSix = 0;
      paintDie(); paintBoard(); paintHud();
      api.setStatus("Tap a token (optional), spend BIAS on a face, then ROLL.");
    }

    function owned(o) { return tokens.filter(function (t) { return t.owner === o; }); }
    function ringOf(o, p) { return (START[o] + p) % 52; }
    function posOf(t) {
      if (t.p < 0) {
        var y = YARD[t.owner], k = t.slot;
        return { x: y.x + (k % 2 ? 22 : -22), y: y.y + (k > 1 ? 22 : -22) };
      }
      if (t.p < LAP) return ringPos(ringOf(t.owner, t.p));
      if (t.p < TOTAL) return homeColPos(t.owner, t.p - LAP);
      return HOME_C;
    }

    /* ---------- static board ---------- */
    var off = (function () {
      var o = offscreen(W, W, 2), g = o.ctx, i;
      QG.draw.rect(g, M - 10, M - 10, S + 20, S + 20, { fill: PAL.paper2, color: PAL.ink, width: 4, radius: 12, wobble: 2 });
      /* ring */
      for (i = 0; i < 52; i++) {
        var p = ringPos(i);
        var isStart = (i === START[0] || i === START[1]);
        var col = isStart ? (i === START[0] ? COL[0] : COL[1]) : null;
        QG.draw.rect(g, p.x - C * 0.45, p.y - C * 0.45, C * 0.9, C * 0.9,
          { fill: col ? U.rgba(col, 0.75) : "rgba(255,255,255,.55)", color: PAL.ink, width: 1.8, radius: 4, wobble: 1.2, double: false });
      }
      /* home columns (4 drawn, 2 in use) */
      for (var o2 = 0; o2 < 4; o2++) {
        for (i = 0; i < HLEN; i++) {
          var hp = homeColPos(o2, i);
          var fc = o2 < 2 ? U.rgba(COL[o2], 0.35) : "rgba(255,255,255,.5)";
          QG.draw.rect(g, hp.x - C * 0.45, hp.y - C * 0.45, C * 0.9, C * 0.9,
            { fill: fc, color: PAL.ink, width: 1.8, radius: 4, wobble: 1.2, double: false });
        }
      }
      /* yards */
      for (i = 0; i < 4; i++) {
        var y = YARD[i], own = (i === 0 ? 0 : (i === 1 ? 1 : -1));
        QG.draw.rect(g, y.x - 44, y.y - 44, 88, 88,
          { fill: own >= 0 ? U.rgba(COL[own], 0.22) : "rgba(255,255,255,.45)", color: PAL.ink, width: 2.5, radius: 10, wobble: 1.6 });
        for (var k = 0; k < 4; k++) {
          var sx = y.x + (k % 2 ? 22 : -22), sy = y.y + (k > 1 ? 22 : -22);
          QG.draw.circle(g, sx, sy, 11, { fill: "rgba(0,0,0,.10)", color: PAL.ink, width: 1.6, wobble: 0.8, double: false });
        }
      }
      /* centre home */
      QG.draw.circle(g, HOME_C.x, HOME_C.y, 40, { fill: U.rgba(PAL.yellow, 0.35), color: PAL.ink, width: 3, wobble: 1.6 });
      QG.draw.text(g, "HOME", HOME_C.x, HOME_C.y, { size: 14, color: PAL.ink });
      return o;
    })();

    var head = h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM LUDO"),
      h("span.badge", "Bias the die, then measure")
    );
    root.appendChild(head);
    var cv = api.canvas({ w: W, h: W });
    var c = cv.ctx;

    var dieBox = h("div.mt12");
    var btnRow = h("div.actions.mt12");
    var bRoll = api.btn("Roll", "lime", function () { playerRoll(); });
    var bReset = api.btn("New match", "ghost", function () { reset(); });
    btnRow.appendChild(bRoll); btnRow.appendChild(bReset);
    var hud = h("div.hud.mt12");
    root.appendChild(dieBox); root.appendChild(btnRow); root.appendChild(hud);

    function prob() { return QG.dist(weights.slice()); }
    function sampleFace() { return QG.sampleDist(prob()) + 1; }

    function paintDie() {
      QG.clear(dieBox);
      var p = prob();
      dieBox.appendChild(h("div.hud__k", "QUANTUM DIE \u00B7 tap a bar to bias"));
      for (var f = 1; f <= 6; f++) {
        (function (ff) {
          var row = h("div.qmeter__row", { style: "margin-top:5px;cursor:pointer" });
          row.appendChild(h("span.qmeter__lab", String(ff)));
          var bar = h("div.qmeter__bar");
          bar.appendChild(h("div.qmeter__fill", { style: "width:" + (p[ff - 1] * 100).toFixed(1) + "%;background:" + PAL.blue }));
          row.appendChild(bar);
          row.appendChild(h("span.qmeter__val", (p[ff - 1] * 100).toFixed(0) + "%"));
          row.addEventListener("click", function () { spendBias(ff); });
          dieBox.appendChild(row);
        })(f);
      }
      dieBox.appendChild(h("div.small.muted.tc.mt8",
        "Bias charges \u2014 you: " + bias[0] + "  \u00B7  AI: " + bias[1]));
    }

    function spendBias(face) {
      if (over || busy || turn !== 0) return;
      if (bias[0] <= 0) { api.toast("No bias charges - you gain 1 per turn (max 5)", "bad", 1200); return; }
      bias[0]--;
      weights[face - 1] = Math.min(3.0, weights[face - 1] + 0.85);
      QG.sfx.gate();
      api.log("You spent a bias charge on face <b>" + face + "</b>.");
      paintDie(); paintHud();
    }

    function drift() {
      for (var i = 0; i < 6; i++) weights[i] = U.clamp(weights[i] + (Math.random() * 2 - 1) * 0.45, 0.35, 2.4);
    }

    function canMove(t) { return t.p < TOTAL; }

    function faceScore(owner, f) {
      var best = -1e9, mine = owned(owner);
      for (var i = 0; i < mine.length; i++) {
        var t = mine[i], sc = 0, np;
        if (t.p < 0) { np = 0; sc = 6; }
        else { np = t.p + f; if (np > TOTAL) np = TOTAL; sc = f * 0.4; }
        if (np >= TOTAL) sc += 14;
        if (np < LAP) {
          var ri = (START[owner] + np) % 52;
          for (var j = 0; j < tokens.length; j++) {
            var o = tokens[j];
            if (o.owner === owner) continue;
            if (o.p >= 0 && o.p < LAP && (START[o.owner] + o.p) % 52 === ri) sc += 20;
          }
        }
        if (sc > best) best = sc;
      }
      return best;
    }

    function pickToken(owner, f) {
      var mine = owned(owner), i;
      if (owner === 0 && sel >= 0 && tokens[sel] && tokens[sel].owner === 0 && canMove(tokens[sel])) return tokens[sel];
      var yard = mine.filter(function (t) { return t.p < 0; });
      if (yard.length) return yard[0];
      var best = null, bs = -1e9;
      for (i = 0; i < mine.length; i++) {
        var t = mine[i];
        if (!canMove(t)) continue;
        var np = Math.min(TOTAL, t.p + f), sc = np;
        if (np >= TOTAL) sc += 40;
        if (np < LAP) {
          var ri = (START[owner] + np) % 52;
          for (var j = 0; j < tokens.length; j++) {
            var o = tokens[j];
            if (o.owner !== owner && o.p >= 0 && o.p < LAP && (START[o.owner] + o.p) % 52 === ri) sc += 60;
          }
        }
        if (sc > bs) { bs = sc; best = t; }
      }
      return best;
    }

    function doRoll(owner) {
      if (over) return;
      drift();
      var f = sampleFace();
      var t = pickToken(owner, f);
      if (!t) {
        api.log((owner === 0 ? "You" : "AI") + " rolled " + f + " - no legal move.");
      } else {
        var wasYard = t.p < 0;
        var from = t.p;
        t.p = wasYard ? 0 : Math.min(TOTAL, t.p + f);
        if (owner === 0) sel = tokens.indexOf(t);
        var cap = 0;
        if (t.p < LAP) {
          var ri = ringOf(owner, t.p);
          for (var j = 0; j < tokens.length; j++) {
            var o = tokens[j];
            if (o.owner === owner) continue;
            if (o.p >= 0 && o.p < LAP && ringOf(o.owner, o.p) === ri) { o.p = -1; cap++; }
          }
        }
        api.log((owner === 0 ? "You" : "AI") + " rolled <b>" + f + "</b>" +
          (wasYard ? " and released a token" : "") +
          (t.p >= TOTAL ? " \u2014 token HOME!" : "") + (cap ? " \u2014 sent " + cap + " home!" : ""));
        if (cap) QG.sfx.zap(); else QG.sfx.click();
      }
      paintBoard(); paintDie(); paintHud();
      if (checkWin()) return;
      if (f === 6 && lastSix < 2) { lastSix++; api.setStatus((owner === 0 ? "You" : "AI") + " rolled a 6 - another roll!"); api.after(700, function () { owner === 0 ? enableRoll() : aiTurn(); }); return; }
      lastSix = 0;
      if (owner === 0) { bias[1] = Math.min(5, bias[1] + 1); turn = 1; busy = true; api.setStatus("AI is rolling..."); api.after(650, aiTurn); }
      else { bias[0] = Math.min(5, bias[0] + 1); turn = 0; busy = false; enableRoll(); }
    }

    function enableRoll() {
      if (over) return;
      busy = false; turn = 0; sel = -1;
      bRoll.disabled = false;
      api.setStatus("Your roll. Bias a face first if you like.");
      paintHud();
    }

    function playerRoll() {
      if (over || busy || turn !== 0) return;
      busy = true; bRoll.disabled = true;
      doRoll(0);
    }

    function aiTurn() {
      if (over || turn !== 1) return;
      var best = 1, bs = -1e9, f;
      for (f = 1; f <= 6; f++) { var s = faceScore(1, f); if (s > bs) { bs = s; best = f; } }
      if (bias[1] > 0 && Math.random() < 0.8) {
        bias[1]--;
        weights[best - 1] = Math.min(3.0, weights[best - 1] + 0.85);
        api.log("AI spent a bias charge on face <b>" + best + "</b>.");
        paintDie();
      }
      doRoll(1);
    }

    function checkWin() {
      var a = owned(0).filter(function (t) { return t.p >= TOTAL; }).length;
      var b = owned(1).filter(function (t) { return t.p >= TOTAL; }).length;
      if (a === 4) { over = true; api.setBest("win"); api.win("Ludo won!", "All four of your tokens reached home."); return true; }
      if (b === 4) { over = true; api.lose("Ludo lost.", "The AI got all four tokens home first."); return true; }
      return false;
    }

    function paintBoard() {
      c.clearRect(0, 0, W, W);
      c.drawImage(off.el, 0, 0, W, W);
      var occ = {};
      for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i], p = posOf(t);
        var key = Math.round(p.x) + "," + Math.round(p.y);
        var n = occ[key] || 0; occ[key] = n + 1;
        var ox = n ? (n % 2 ? 8 : -8) : 0, oy = n > 1 ? 8 : 0;
        var isSel = (i === sel && t.owner === 0 && turn === 0);
        QG.draw.circle(c, p.x + ox, p.y + oy, 10, { fill: COL[t.owner], color: PAL.ink, width: 2.4, wobble: 0.8, double: false });
        if (isSel) QG.draw.dashedCircle(c, p.x + ox, p.y + oy, 15, { color: PAL.yellow, dash: [4, 4], width: 2.5 });
      }
    }

    function paintHud() {
      QG.clear(hud);
      var mine = owned(0).filter(function (t) { return t.p >= 0 && t.p < TOTAL; }).length;
      var home = owned(0).filter(function (t) { return t.p >= TOTAL; }).length;
      var aiHome = owned(1).filter(function (t) { return t.p >= TOTAL; }).length;
      [["Turn", turn === 0 ? "YOU" : "AI"], ["Your home", home + "/4"], ["AI home", aiHome + "/4"],
       ["Your bias", bias[0]], ["On board", mine]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "You home", value: home + "/4", color: "cyan", turn: turn === 0 },
        { name: "AI home", value: aiHome + "/4", color: "magenta", turn: turn === 1 }
      ]);
    }

    function onCanvasTap(pt) {
      if (over || busy || turn !== 0) return;
      var best = -1, bd = 1e9;
      for (var i = 0; i < tokens.length; i++) {
        if (tokens[i].owner !== 0 || tokens[i].p >= TOTAL) continue;
        var p = posOf(tokens[i]);
        var d = (p.x - pt.x) * (p.x - pt.x) + (p.y - pt.y) * (p.y - pt.y);
        if (d < bd) { bd = d; best = i; }
      }
      if (best >= 0 && bd < 30 * 30) {
        sel = best;
        QG.sfx.tap();
        paintBoard();
        api.setStatus("Token selected \u2014 press ROLL.");
      }
    }
    cv.on("down", onCanvasTap);

    reset();
  });

  /* ==========================================================
     20. QUANTUM PACHISI
     ========================================================== */
  QG.register("quantum-pachisi", function (root, api) {
    var G = 15, W = 460, CELL = W / G;
    var LAP = 26, HLEN = 5, TOTAL = LAP + HLEN;
    var START = [25, 51];
    var COL = [PAL.cyan, PAL.magenta];
    var CASTLES = [6, 19, 32, 45];

    var TRACK = (function () {
      var t = [], r, c;
      for (r = 0; r <= 5; r++) t.push([r, 6]);
      for (c = 5; c >= 0; c--) t.push([6, c]);
      t.push([7, 0]);
      for (c = 0; c <= 5; c++) t.push([8, c]);
      for (r = 9; r <= 13; r++) t.push([r, 6]);
      t.push([14, 6]); t.push([14, 7]); t.push([14, 8]);
      for (r = 13; r >= 9; r--) t.push([r, 8]);
      for (c = 9; c <= 14; c++) t.push([8, c]);
      t.push([7, 14]);
      for (c = 14; c >= 9; c--) t.push([6, c]);
      for (r = 5; r >= 1; r--) t.push([r, 8]);
      t.push([0, 8]); t.push([0, 7]);
      return t;
    })();
    var HOME_COL = [
      [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
      [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
    ];
    var YARD = [{ x: 3.2 * CELL, y: 12.2 * CELL }, { x: 11.8 * CELL, y: 2.8 * CELL }];

    function gpos(rc) { return { x: rc[1] * CELL + CELL / 2, y: rc[0] * CELL + CELL / 2 }; }
    function ringPos(p) { return gpos(TRACK[p]); }
    function posOf(t) {
      if (t.p < 0) {
        var y = YARD[t.owner], k = t.slot;
        return { x: y.x + (k % 2 ? 20 : -20), y: y.y + (k > 1 ? 20 : -20) };
      }
      if (t.p < LAP) return ringPos((START[t.owner] + t.p) % 52);
      if (t.p < TOTAL) return gpos(HOME_COL[t.owner][t.p - LAP]);
      return { x: 7.5 * CELL, y: 7.5 * CELL };
    }
    function ringOf(t) { return (START[t.owner] + t.p) % 52; }
    function isCastle(t) { return t.p >= 0 && t.p < LAP && CASTLES.indexOf(ringOf(t)) >= 0; }

    var tokens, turn, over, busy, sel, measureUsed;

    function reset() {
      tokens = [];
      for (var o = 0; o < 2; o++) for (var i = 0; i < 4; i++) tokens.push({ owner: o, p: -1, slot: i, sup: false, from: -1, blocked: 0 });
      turn = 0; over = false; busy = false; sel = -1; measureUsed = 0;
      paintBoard(); paintHud();
      api.setStatus("Tap one of your tokens, then ROLL. MEASURE collapses every token.");
    }

    function owned(o) { return tokens.filter(function (t) { return t.owner === o; }); }
    function movable(t) { return t.p < TOTAL && !t.sup && t.blocked <= 0; }
    /* blocked goes 2 -> 1 -> 0 so a token misses exactly one full turn */
    function tickBlocks(owner) {
      var m = owned(owner);
      for (var i = 0; i < m.length; i++) {
        if (m[i].blocked === 2) m[i].blocked = 1;
        else if (m[i].blocked === 1) m[i].blocked = 0;
      }
    }

    /* ---------- static board ---------- */
    var off = (function () {
      var o = offscreen(W, W, 2), g = o.ctx, i, k;
      /* cross silhouette */
      QG.draw.rect(g, 6 * CELL, 0, 3 * CELL, W, { fill: PAL.paper2, color: PAL.ink, width: 3, radius: 8, wobble: 1.6 });
      QG.draw.rect(g, 0, 6 * CELL, W, 3 * CELL, { fill: PAL.paper2, color: PAL.ink, width: 3, radius: 8, wobble: 1.6 });
      for (i = 0; i < 52; i++) {
        var p = gpos(TRACK[i]);
        var castle = CASTLES.indexOf(i) >= 0;
        var startCell = (i === START[0] || i === START[1]);
        var fill = castle ? U.rgba(PAL.orange, 0.55) : (startCell ? U.rgba(i === START[0] ? COL[0] : COL[1], 0.65) : "rgba(255,255,255,.6)");
        QG.draw.rect(g, p.x - CELL * 0.42, p.y - CELL * 0.42, CELL * 0.84, CELL * 0.84,
          { fill: fill, color: PAL.ink, width: 1.6, radius: 3, wobble: 1.1, double: false });
        if (castle) QG.draw.text(g, "\u265C", p.x, p.y + 1, { size: 15, color: PAL.ink });
      }
      for (var o2 = 0; o2 < 2; o2++) {
        for (k = 0; k < HLEN; k++) {
          var hp = gpos(HOME_COL[o2][k]);
          QG.draw.rect(g, hp.x - CELL * 0.42, hp.y - CELL * 0.42, CELL * 0.84, CELL * 0.84,
            { fill: U.rgba(COL[o2], 0.30), color: PAL.ink, width: 1.6, radius: 3, wobble: 1.1, double: false });
        }
      }
      /* the other two arms' home columns (decorative) */
      for (k = 0; k < HLEN; k++) {
        var a = gpos([7, 13 - k]), b = gpos([7, 1 + k]);
        QG.draw.rect(g, a.x - CELL * 0.42, a.y - CELL * 0.42, CELL * 0.84, CELL * 0.84,
          { fill: "rgba(255,255,255,.4)", color: PAL.ink, width: 1.6, radius: 3, wobble: 1.1, double: false });
        QG.draw.rect(g, b.x - CELL * 0.42, b.y - CELL * 0.42, CELL * 0.84, CELL * 0.84,
          { fill: "rgba(255,255,255,.4)", color: PAL.ink, width: 1.6, radius: 3, wobble: 1.1, double: false });
      }
      /* yards */
      for (i = 0; i < 2; i++) {
        var y = YARD[i];
        QG.draw.rect(g, y.x - 42, y.y - 42, 84, 84, { fill: U.rgba(COL[i], 0.20), color: PAL.ink, width: 2.4, radius: 9, wobble: 1.5 });
        for (k = 0; k < 4; k++) {
          QG.draw.circle(g, y.x + (k % 2 ? 20 : -20), y.y + (k > 1 ? 20 : -20), 10,
            { fill: "rgba(0,0,0,.10)", color: PAL.ink, width: 1.5, wobble: 0.8, double: false });
        }
      }
      QG.draw.rect(g, 6 * CELL + 2, 6 * CELL + 2, 3 * CELL - 4, 3 * CELL - 4,
        { fill: U.rgba(PAL.yellow, 0.35), color: PAL.ink, width: 2.5, radius: 8, wobble: 1.4 });
      QG.draw.text(g, "HOME", 7.5 * CELL, 7.5 * CELL, { size: 13, color: PAL.ink });
      return o;
    })();

    var head = h("div.row", { style: "justify-content:space-between" },
      h("span.marker", { style: "font-size:1.05rem" }, "QUANTUM PACHISI"),
      h("span.badge", "Castles \u265C grant a bonus roll")
    );
    root.appendChild(head);
    var cv = api.canvas({ w: W, h: W });
    var c = cv.ctx;

    var btnRow = h("div.actions.mt12");
    var bRoll = api.btn("Roll", "lime", function () { playerRoll(); });
    var bMeasure = api.btn("Measure", "cyan", function () { playerMeasure(); });
    var bReset = api.btn("New match", "ghost", function () { reset(); });
    btnRow.appendChild(bRoll); btnRow.appendChild(bMeasure); btnRow.appendChild(bReset);
    var hud = h("div.hud.mt12");
    root.appendChild(btnRow); root.appendChild(hud);

    function moveToken(t, roll) {
      if (t.p < 0) { t.p = 0; t.sup = false; t.from = -1; return false; }
      var from = t.p;
      t.p = Math.min(TOTAL, t.p + roll);
      t.from = from; t.sup = true;
      return isCastle({ owner: t.owner, p: t.p });
    }

    function doRoll(owner) {
      var roll = 1 + U.int(6);
      var mine = owned(owner).filter(movable);
      var t = null;
      if (owner === 0 && sel >= 0 && tokens[sel] && tokens[sel].owner === 0 && movable(tokens[sel])) t = tokens[sel];
      if (!t && mine.length) {
        t = mine.slice().sort(function (a, b) {
          var sa = (a.p < 0 ? -1 : a.p), sb = (b.p < 0 ? -1 : b.p);
          return sb - sa;
        })[0];
      }
      if (!t) {
        api.log((owner === 0 ? "You" : "AI") + " rolled " + roll + " but had no free token.");
        afterTurn(owner, false);
        return;
      }
      var bonus = moveToken(t, roll);
      if (owner === 0) sel = tokens.indexOf(t);
      api.log((owner === 0 ? "You" : "AI") + " rolled <b>" + roll + "</b> \u2014 token now spans " +
        (t.from < 0 ? "the yard to p0" : "squares " + (t.from + 1) + "\u2013" + (t.p + 1)) + ".");
      if (bonus) api.log("Castle! Bonus roll.");
      QG.sfx.zap();
      paintBoard(); paintHud();
      afterTurn(owner, bonus);
    }

    function afterTurn(owner, bonus) {
      if (over) return;
      if (bonus) {
        if (owner === 0) { api.setStatus("Castle bonus - roll again!"); enableRoll(); }
        else api.after(700, aiTurn);
        return;
      }
      if (owner === 0) { turn = 1; busy = true; bRoll.disabled = true; bMeasure.disabled = true; api.setStatus("AI is playing..."); tickBlocks(0); api.after(700, aiTurn); }
      else { tickBlocks(1); turn = 0; enableRoll(); }
    }

    function enableRoll() {
      if (over) return;
      busy = false; turn = 0;
      bRoll.disabled = false; bMeasure.disabled = false;
      api.setStatus("Your turn: tap a token then ROLL, or MEASURE to collapse them all.");
      paintHud();
    }

    function playerRoll() {
      if (over || busy || turn !== 0) return;
      busy = true; bRoll.disabled = true; bMeasure.disabled = true;
      doRoll(0);
    }

    function playerMeasure() {
      if (over || busy || turn !== 0) return;
      if (!owned(0).some(function (t) { return t.sup; })) { api.toast("No token is in superposition", "bad", 1000); return; }
      busy = true; bRoll.disabled = true; bMeasure.disabled = true;
      measure(0);
    }

    function measure(owner) {
      var mine = owned(owner), i, j;
      var collapses = 0, captures = 0, blocks = 0;
      for (i = 0; i < mine.length; i++) {
        var t = mine[i];
        if (!t.sup) continue;
        var pickNew = Math.random() < 0.5;
        t.p = pickNew ? t.p : t.from;
        t.sup = false; t.from = -1;
        collapses++;
      }
      QG.sfx.measure();
      /* resolve: enemy on the same square goes home, own token gets blocked */
      for (i = 0; i < mine.length; i++) {
        var a = mine[i];
        if (a.p < 0 || a.p >= TOTAL) continue;
        for (j = 0; j < tokens.length; j++) {
          var b = tokens[j];
          if (b === a || b.p < 0 || b.p >= TOTAL) continue;
          if (b.p !== a.p) continue;
          if (b.owner !== a.owner) { b.p = -1; b.sup = false; b.from = -1; captures++; }
          else { b.blocked = 2; blocks++; }
        }
      }
      api.log((owner === 0 ? "You" : "AI") + " <b>measured</b>: " + collapses + " collapsed" +
        (captures ? ", " + captures + " enemy home" : "") + (blocks ? ", " + blocks + " own blocked" : "") + ".");
      if (captures) QG.sfx.zap();
      paintBoard(); paintHud();
      if (checkWin()) return;
      tickBlocks(owner);
      if (owner === 0) { turn = 1; api.setStatus("AI is playing..."); api.after(700, aiTurn); }
      else { turn = 0; enableRoll(); }
    }

    function aiTurn() {
      if (over || turn !== 1) return;
      var mine = owned(1);
      var sups = mine.filter(function (t) { return t.sup; }).length;
      var free = mine.filter(movable).length;
      if (free === 0 || (sups >= 2 && Math.random() < 0.55)) { measure(1); return; }
      doRoll(1);
    }

    function checkWin() {
      var a = owned(0).filter(function (t) { return t.p >= TOTAL; }).length;
      var b = owned(1).filter(function (t) { return t.p >= TOTAL; }).length;
      if (a === 4) { over = true; api.setBest("win"); api.win("Pachisi won!", "All four of your tokens are home."); return true; }
      if (b === 4) { over = true; api.lose("Pachisi lost.", "The AI got all four tokens home first."); return true; }
      return false;
    }

    function spanCells(t) {
      var out = [], p;
      var lo = Math.min(t.from, t.p), hi = Math.max(t.from, t.p);
      for (p = lo; p <= hi; p++) {
        if (p < 0) out.push({ x: YARD[t.owner].x, y: YARD[t.owner].y });
        else if (p < LAP) out.push(ringPos((START[t.owner] + p) % 52));
        else if (p < TOTAL) out.push(gpos(HOME_COL[t.owner][p - LAP]));
        else out.push({ x: 7.5 * CELL, y: 7.5 * CELL });
      }
      return out;
    }

    function paintBoard() {
      c.clearRect(0, 0, W, W);
      c.drawImage(off.el, 0, 0, W, W);
      var i, k;
      /* superposition spans first */
      for (i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (!t.sup) continue;
        var cells = spanCells(t);
        for (k = 0; k < cells.length; k++) {
          var cp = cells[k];
          c.globalAlpha = 0.34;
          QG.draw.circle(c, cp.x, cp.y, 9, { fill: COL[t.owner], color: PAL.ink, width: 1.8, wobble: 0.8, double: false });
          c.globalAlpha = 1;
        }
        if (cells.length > 1) {
          QG.draw.line(c, cells[0].x, cells[0].y, cells[cells.length - 1].x, cells[cells.length - 1].y,
            { color: U.rgba(COL[t.owner], 0.7), width: 2.5, wobble: 1.5 });
        }
      }
      var occ = {};
      for (i = 0; i < tokens.length; i++) {
        var tk = tokens[i], p = posOf(tk);
        var key = Math.round(p.x) + "," + Math.round(p.y);
        var n = occ[key] || 0; occ[key] = n + 1;
        var ox = n ? (n % 2 ? 7 : -7) : 0, oy = n > 1 ? 7 : 0;
        QG.draw.circle(c, p.x + ox, p.y + oy, 10, { fill: COL[tk.owner], color: PAL.ink, width: 2.4, wobble: 0.8, double: false });
        if (tk.blocked > 0) QG.draw.dashedCircle(c, p.x + ox, p.y + oy, 14, { color: PAL.red, dash: [3, 3], width: 2.4 });
        if (i === sel && tk.owner === 0 && turn === 0) QG.draw.dashedCircle(c, p.x + ox, p.y + oy, 15, { color: PAL.yellow, dash: [4, 4], width: 2.5 });
      }
    }

    function paintHud() {
      QG.clear(hud);
      var mine = owned(0);
      var home = mine.filter(function (t) { return t.p >= TOTAL; }).length;
      var aiHome = owned(1).filter(function (t) { return t.p >= TOTAL; }).length;
      var sup = mine.filter(function (t) { return t.sup; }).length;
      var blk = mine.filter(function (t) { return t.blocked > 0; }).length;
      [["Turn", turn === 0 ? "YOU" : "AI"], ["Your home", home + "/4"], ["AI home", aiHome + "/4"],
       ["Superposed", sup], ["Blocked", blk]].forEach(function (kv) {
        hud.appendChild(h("div.hud__item", h("div.hud__k", kv[0]), h("div.hud__v", String(kv[1]))));
      });
      api.setScores([
        { name: "You home", value: home + "/4", color: "cyan", turn: turn === 0 },
        { name: "AI home", value: aiHome + "/4", color: "magenta", turn: turn === 1 },
        { name: "In flux", value: sup, color: "purple" }
      ]);
    }

    cv.on("down", function (pt) {
      if (over || busy || turn !== 0) return;
      var best = -1, bd = 1e9;
      for (var i = 0; i < tokens.length; i++) {
        if (tokens[i].owner !== 0) continue;
        var p = posOf(tokens[i]);
        var d = (p.x - pt.x) * (p.x - pt.x) + (p.y - pt.y) * (p.y - pt.y);
        if (d < bd) { bd = d; best = i; }
      }
      if (best >= 0 && bd < 30 * 30) {
        sel = best;
        QG.sfx.tap();
        paintBoard();
        var t = tokens[best];
        api.setStatus(t.sup ? "That token is in superposition - MEASURE to collapse it."
          : (t.blocked > 0 ? "That token is blocked for this turn." : "Token selected - press ROLL."));
      }
    });

    reset();
  });
})();
