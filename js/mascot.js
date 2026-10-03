/* ============================================================
   QUANTUM ARCADE — mascot.js
   Three hand-drawn cartoons live in the hero wave band.
   They watch your cursor, they get annoyed, and if you tease
   them for twelve accumulated seconds they climb out of the
   screen, wreck the place, and force you into a game.
   ============================================================ */
(function () {
  "use strict";
  var QG = window.QG;
  if (!QG) return;
  var host = document.getElementById("mascots");
  if (!host) return;

  var TEASE_MS = 12000;   // twelve seconds of teasing = he comes out
  var BUBBLE_MS = 2000;
  var NEAR = 150;         // px radius that counts as "teasing"

  /* ---------------- the cast ----------------
     Body outlines use var(--ink) so they invert with the theme.
     Face details stay fixed dark so they read against the bright bodies. */
  var FACE = "#0d0d12";
  var SVG = {
    qubit:
      "<svg viewBox='0 0 100 112' fill='none' aria-hidden='true'>" +
      "<path d='M50 26 L50 10' stroke='var(--ink)' stroke-width='4' stroke-linecap='round'/>" +
      "<circle cx='50' cy='9' r='6.5' fill='var(--magenta)' stroke='var(--ink)' stroke-width='3.4'/>" +
      "<path d='M50 24 C 79 24, 93 45, 91 67 C 89 92, 74 102, 50 102 C 26 102, 11 92, 9 67 C 7 45, 21 24, 50 24 Z' fill='var(--cyan)' stroke='var(--ink)' stroke-width='4.5' stroke-linejoin='round'/>" +
      "<ellipse cx='35' cy='59' rx='11.5' ry='13.5' fill='#ffffff' stroke='" + FACE + "' stroke-width='3.4'/>" +
      "<ellipse cx='65' cy='59' rx='11.5' ry='13.5' fill='#ffffff' stroke='" + FACE + "' stroke-width='3.4'/>" +
      "<circle data-pupil cx='35' cy='59' r='5.2' fill='" + FACE + "'/>" +
      "<circle data-pupil cx='65' cy='59' r='5.2' fill='" + FACE + "'/>" +
      "<path data-brow-l d='M23 43 L46 46' stroke='" + FACE + "' stroke-width='4.2' stroke-linecap='round'/>" +
      "<path data-brow-r d='M77 43 L54 46' stroke='" + FACE + "' stroke-width='4.2' stroke-linecap='round'/>" +
      "<path data-mouth d='M38 76 Q50 88 62 76' stroke='" + FACE + "' stroke-width='4' stroke-linecap='round' fill='none'/>" +
      "<path d='M32 101 L28 110' stroke='var(--ink)' stroke-width='4.2' stroke-linecap='round'/>" +
      "<path d='M68 101 L72 110' stroke='var(--ink)' stroke-width='4.2' stroke-linecap='round'/>" +
      "</svg>",
    ghost:
      "<svg viewBox='0 0 100 112' fill='none' aria-hidden='true'>" +
      "<path d='M50 16 C 78 16, 90 38, 90 62 L90 102 L79 93 L68 102 L57 93 L46 102 L35 93 L24 102 L13 93 L10 102 L10 62 C 10 38, 22 16, 50 16 Z' fill='var(--purple)' stroke='var(--ink)' stroke-width='4.5' stroke-linejoin='round'/>" +
      "<path d='M50 16 C 78 16, 90 38, 90 62 L90 102 L79 93 L68 102 L57 93 L46 102 L35 93 L24 102 L13 93 L10 102 L10 62 C 10 38, 22 16, 50 16 Z' fill='none' stroke='#ffffff' stroke-width='2' stroke-dasharray='7 7' opacity='.5'/>" +
      "<ellipse cx='35' cy='54' rx='11' ry='13' fill='#ffffff' stroke='" + FACE + "' stroke-width='3.4'/>" +
      "<ellipse cx='65' cy='54' rx='11' ry='13' fill='#ffffff' stroke='" + FACE + "' stroke-width='3.4'/>" +
      "<circle data-pupil cx='35' cy='54' r='5' fill='" + FACE + "'/>" +
      "<circle data-pupil cx='65' cy='54' r='5' fill='" + FACE + "'/>" +
      "<path data-brow-l d='M24 39 L45 42' stroke='" + FACE + "' stroke-width='4.2' stroke-linecap='round'/>" +
      "<path data-brow-r d='M76 39 L55 42' stroke='" + FACE + "' stroke-width='4.2' stroke-linecap='round'/>" +
      "<path data-mouth d='M38 76 Q50 88 62 76' stroke='" + FACE + "' stroke-width='4' stroke-linecap='round' fill='none'/>" +
      "</svg>",
    bot:
      "<svg viewBox='0 0 100 112' fill='none' aria-hidden='true'>" +
      "<path d='M50 26 L50 13' stroke='var(--ink)' stroke-width='4' stroke-linecap='round'/>" +
      "<circle cx='50' cy='11' r='5.5' fill='var(--orange)' stroke='var(--ink)' stroke-width='3.2'/>" +
      "<rect x='14' y='26' width='72' height='72' rx='13' fill='var(--lime)' stroke='var(--ink)' stroke-width='4.5'/>" +
      "<rect x='25' y='41' width='21' height='19' rx='5' fill='#ffffff' stroke='" + FACE + "' stroke-width='3.2'/>" +
      "<rect x='54' y='41' width='21' height='19' rx='5' fill='#ffffff' stroke='" + FACE + "' stroke-width='3.2'/>" +
      "<circle data-pupil cx='35.5' cy='50.5' r='4.8' fill='" + FACE + "'/>" +
      "<circle data-pupil cx='64.5' cy='50.5' r='4.8' fill='" + FACE + "'/>" +
      "<path data-brow-l d='M22 35 L45 38' stroke='" + FACE + "' stroke-width='4' stroke-linecap='round'/>" +
      "<path data-brow-r d='M78 35 L55 38' stroke='" + FACE + "' stroke-width='4' stroke-linecap='round'/>" +
      "<path data-mouth d='M38 76 Q50 88 62 76' stroke='" + FACE + "' stroke-width='4' stroke-linecap='round' fill='none'/>" +
      "<path d='M14 80 L6 85' stroke='var(--ink)' stroke-width='4.2' stroke-linecap='round'/>" +
      "<path d='M86 80 L94 85' stroke='var(--ink)' stroke-width='4.2' stroke-linecap='round'/>" +
      "</svg>"
  };

  var MOUTH = {
    happy: "M38 76 Q50 88 62 76",
    calm: "M39 79 L61 79",
    uneasy: "M39 82 L61 82",
    frown: "M38 86 Q50 76 62 86",
    shout: "M36 78 Q50 97 64 78 Z"
  };

  var CREW = [
    { kind: "qubit", name: "QUBIT", style: "left:5%", delay: "-0.3s" },
    { kind: "ghost", name: "GHOSTY", style: "left:45%", delay: "-1.5s" },
    { kind: "bot", name: "BIT", style: "right:6%", delay: "-2.7s" }
  ];

  var POKES = [
    "ow.",
    "hey!",
    "stop poking me.",
    "that tickles. quit it.",
    "i am literally a wave. rude.",
    "you're poking a superposition. that's a felony.",
    "ok. ok. OK.",
    "i'm counting to three.",
    "you're really doing this?",
    "i have been measured. i am DEFINITE now."
  ];

  var WARNS = [
    { at: 0.88, t: "hey. stop that." },
    { at: 0.72, t: "i can feel your cursor. it's cold." },
    { at: 0.56, t: "seriously. cut it out." },
    { at: 0.40, t: "do not tease this guy." },
    { at: 0.26, t: "i'm warning you. i am very definite about this." },
    { at: 0.13, t: "FINAL WARNING. one more second." }
  ];

  var IDLE = [
    "psst. try the ludo.",
    "i exist in two places. so does my patience.",
    "40 games. i checked. twice. at once.",
    "don't poke me.",
    "measure me. i dare you.",
    "the carrom board is rigged. i rigged it."
  ];

  /* ---------------- state ---------------- */
  var mascots = [];
  var patience = 1, teased = 0, pokes = 0, broken = false;
  var warnIdx = 0, idleT = 0;
  var pointer = { x: -9999, y: -9999, movedAt: 0 };
  var meterFill, meterLab, meter;
  var locked = null;

  /* ---------------- build the meter ---------------- */
  meterLab = QG.h("div.tease-meter__lab", "PATIENCE");
  meterFill = QG.h("div.tease-meter__fill");
  meter = QG.h("div.tease-meter", meterLab, QG.h("div.tease-meter__track", meterFill));
  host.appendChild(meter);

  /* ---------------- build the crew ---------------- */
  CREW.forEach(function (c) {
    var el = QG.h("div.mascot", { style: c.style + ";--d:" + c.delay, "data-kind": c.kind, title: "..." });
    var bubble = QG.h("div.mascot__bubble");
    var body = QG.h("div.mascot__body", { html: SVG[c.kind] });
    el.appendChild(bubble);
    el.appendChild(body);
    host.appendChild(el);

    var m = {
      kind: c.kind, name: c.name, el: el, bubble: bubble, body: body,
      pupils: Array.prototype.slice.call(el.querySelectorAll("[data-pupil]")),
      browL: el.querySelector("[data-brow-l]"),
      browR: el.querySelector("[data-brow-r]"),
      mouth: el.querySelector("[data-mouth]"),
      lean: 0, hot: false, pokeT: 0
    };
    el.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      poke(m);
    });
    el.addEventListener("pointerenter", function () { el.classList.add("is-alert"); });
    el.addEventListener("pointerleave", function () { el.classList.remove("is-alert"); });
    mascots.push(m);
  });

  /* ---------------- pointer ---------------- */
  document.addEventListener("pointermove", function (e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  }, { passive: true });
  document.addEventListener("pointerdown", function (e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  }, { passive: true });

  /* ---------------- bubbles ---------------- */
  function bubble(m, text, mad) {
    m.bubble.textContent = text;
    if (mad) m.bubble.classList.add("is-mad"); else m.bubble.classList.remove("is-mad");
    m.bubble.classList.add("is-on");
    clearTimeout(m._bt);
    m._bt = setTimeout(function () { m.bubble.classList.remove("is-on"); }, BUBBLE_MS);
  }

  /* ---------------- poking ---------------- */
  function poke(m) {
    if (broken) return;
    pokes++;
    teased += 750;                       // a poke is worth about 0.75s of teasing
    patience = Math.max(0, 1 - teased / TEASE_MS);
    m.el.classList.remove("is-poked");
    void m.el.offsetWidth;
    m.el.classList.add("is-poked");
    clearTimeout(m.pokeT);
    m.pokeT = setTimeout(function () { m.el.classList.remove("is-poked"); }, 640);
    QG.sfx.tap();
    var line = pokes <= POKES.length ? POKES[pokes - 1] : POKES[POKES.length - 1];
    bubble(m, line, patience < 0.5);
    if (patience <= 0) breakout(m);
  }

  /* ---------------- the loop ---------------- */
  var rects = [];
  QG.loop(function (dt) {
    if (broken) return;

    // 1. read every bounding box first (avoids layout thrash)
    var i, m, r;
    for (i = 0; i < mascots.length; i++) {
      m = mascots[i];
      rects[i] = m.el.getBoundingClientRect();
    }

    // 2. how close is the cursor?
    var nearCount = 0, nearest = null, nearestD = 1e9;
    for (i = 0; i < mascots.length; i++) {
      r = rects[i];
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height * 0.58;
      var dx = pointer.x - cx;
      var dy = pointer.y - cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      mascots[i]._dx = dx;
      mascots[i]._dy = dy;
      mascots[i]._d = d;
      if (d < NEAR) { nearCount++; if (d < nearestD) { nearestD = d; nearest = mascots[i]; } }
    }

    // 3. accumulate / recover teasing time.
    //    Only an actively wiggling cursor counts as teasing - parking the
    //    mouse over them by accident should not summon the takeover.
    var now = performance.now();
    var active = nearCount > 0 && (now - (pointer.movedAt || 0)) < 350;
    if (active) teased += dt;
    else teased = Math.max(0, teased - dt * 0.9);
    patience = Math.max(0, 1 - teased / TEASE_MS);
    var anger = 1 - patience;

    // 4. write the visuals
    var mouth = anger < 0.14 ? "happy" : anger < 0.34 ? "calm" : anger < 0.58 ? "uneasy" : anger < 0.84 ? "frown" : "shout";
    var brow = anger * 21;
    for (i = 0; i < mascots.length; i++) {
      m = mascots[i];
      var d2 = Math.max(m._d, 1);
      var k = m._d < NEAR ? 1 : 0.4;
      var px = Math.max(-4.5, Math.min(4.5, (m._dx / d2) * 4.5 * k));
      var py = Math.max(-4, Math.min(4, (m._dy / d2) * 4 * k));
      for (var p = 0; p < m.pupils.length; p++) {
        m.pupils[p].style.transform = "translate(" + px.toFixed(2) + "px," + py.toFixed(2) + "px)";
      }
      if (m.browL) m.browL.style.transform = "rotate(" + brow.toFixed(1) + "deg)";
      if (m.browR) m.browR.style.transform = "rotate(" + (-brow).toFixed(1) + "deg)";
      if (m.mouth && m.mouth.getAttribute("d") !== MOUTH[mouth]) m.mouth.setAttribute("d", MOUTH[mouth]);

      // lean away from the cursor, capped so it stays readable
      var lean = m._d < 260 ? Math.max(-11, Math.min(11, -m._dx * 0.05)) : 0;
      if (Math.abs(lean - m.lean) > 0.4) {
        m.lean = lean;
        m.el.style.transform = "translateX(" + lean.toFixed(1) + "px)";
      }

      m.el.classList.toggle("is-mad", anger > 0.5);
      m.el.classList.toggle("is-furious", anger > 0.8);
    }

    // 5. meter
    if (teased > 350) meter.classList.add("is-on");
    else meter.classList.remove("is-on");
    meterFill.style.width = (patience * 100).toFixed(1) + "%";
    meterFill.style.background = patience > 0.6 ? QG.PAL.lime : patience > 0.3 ? QG.PAL.yellow : QG.PAL.red;
    meterLab.textContent = patience > 0.7 ? "PATIENCE"
      : patience > 0.45 ? "PATIENCE RUNNING OUT"
        : patience > 0.2 ? "HE IS GETTING MAD"
          : "RUN.";

    // 6. escalating warnings
    if (warnIdx < WARNS.length && patience <= WARNS[warnIdx].at) {
      var w = WARNS[warnIdx];
      bubble(nearest || mascots[Math.floor(Math.random() * mascots.length)], w.t, anger > 0.45);
      warnIdx++;
      QG.sfx.tick();
    }

    // 7. idle chatter
    idleT += dt;
    if (idleT > 12000) {
      idleT = 0;
      if (teased < 400) bubble(mascots[Math.floor(Math.random() * mascots.length)], IDLE[Math.floor(Math.random() * IDLE.length)]);
    }

    if (patience <= 0) breakout(nearest || mascots[0]);
  });

  /* ---------------- breakout ---------------- */
  function lockInput(on) {
    if (on) {
      if (locked) return;
      locked = {
        wheel: function (e) { e.preventDefault(); },
        touch: function (e) { e.preventDefault(); },
        key: function (e) {
          if (/^(Arrow|Page|Home|End| )/.test(e.key) || e.key === "Spacebar") e.preventDefault();
        }
      };
      document.addEventListener("wheel", locked.wheel, { passive: false });
      document.addEventListener("touchmove", locked.touch, { passive: false });
      document.addEventListener("keydown", locked.key, true);
      document.documentElement.style.scrollBehavior = "auto";
    } else if (locked) {
      document.removeEventListener("wheel", locked.wheel);
      document.removeEventListener("touchmove", locked.touch);
      document.removeEventListener("keydown", locked.key, true);
      document.documentElement.style.scrollBehavior = "";
      locked = null;
    }
  }

  function breakout(m) {
    if (broken) return;
    broken = true;
    QG.sfx.zap();

    // lift the mascot out of the hero so nothing can clip it
    var r = m.el.getBoundingClientRect();
    m.el.style.position = "fixed";
    m.el.style.left = "0px";
    m.el.style.top = "0px";
    m.el.style.bottom = "auto";
    m.el.style.margin = "0";
    m.el.style.zIndex = "265";
    m.el.style.width = "86px";
    m.el.style.transformOrigin = "50% 100%";
    m.el.style.transform = "translate(" + r.left.toFixed(1) + "px," + r.top.toFixed(1) + "px) scale(1) rotate(0deg)";
    m.el.classList.remove("is-mad", "is-furious", "is-poked", "is-alert");
    document.body.appendChild(m.el);

    if (meter) meter.classList.remove("is-on");
    document.body.classList.add("screen-shake", "rampage");
    lockInput(true);

    // freeze him mid-rage
    if (m.browL) m.browL.style.transform = "rotate(22deg)";
    if (m.browR) m.browR.style.transform = "rotate(-22deg)";
    if (m.mouth) m.mouth.setAttribute("d", MOUTH.shout);

    // climb out of the screen
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        m.el.style.transition = "transform .8s cubic-bezier(.5,-.5,.3,1.5)";
        m.el.style.transform = "translate(" + (r.left + r.width / 2 - 43).toFixed(1) + "px," + (r.top - 90).toFixed(1) + "px) scale(4.4) rotate(330deg)";
      });
    });

    setTimeout(function () {
      document.body.classList.remove("screen-shake");
      rampage(m);
    }, 880);
  }

  /* ---------------- weapons ---------------- */
  var WEAPONS = [
    { key: "punch", glyph: "\uD83E\uDD4A", death: "crush", label: "bare hands", s: "pop" },
    { key: "hammer", glyph: "\uD83D\uDD28", death: "flat", label: "hammer", s: "zap" },
    { key: "sword", glyph: "\u2694\uFE0F", death: "slash", label: "sword", s: "click" },
    { key: "snake", glyph: "\uD83D\uDC0D", death: "venom", label: "a snake", s: "tick" },
    { key: "gun", glyph: "\uD83D\uDD2B", death: "holes", label: "a gun", s: "tap" },
    { key: "laser", glyph: "\uD83D\uDD34", death: "burn", label: "eye lasers", s: "gate" },
    { key: "fire", glyph: "\uD83D\uDD25", death: "ash", label: "fire", s: "zap" },
    { key: "tornado", glyph: "\uD83C\uDF00", death: "blown", label: "a tornado", s: "teleport" },
    { key: "lightning", glyph: "\u26A1", death: "char", label: "lightning", s: "zap" },
    { key: "bomb", glyph: "\uD83D\uDCA5", death: "boom", label: "a bomb", s: "measure" }
  ];

  var SNAKE_SVG = "<svg viewBox='0 0 200 120' preserveAspectRatio='none'><path d='M4 98 C 48 10, 80 110, 118 42 S 178 20, 197 76'/><path d='M4 98 C 48 10, 80 110, 118 42 S 178 20, 197 76'/></svg>";
  var BOLT_SVG = "<svg viewBox='0 0 60 100' preserveAspectRatio='none'><path d='M36 2 L12 46 L30 46 L16 98 L50 38 L31 38 L46 2 Z'/></svg>";

  function spawnFx(card, w) {
    var r = card.getBoundingClientRect();
    var box = "left:" + (r.left - 14).toFixed(1) + "px;top:" + (r.top - 14).toFixed(1) + "px;width:" +
      (r.width + 28).toFixed(1) + "px;height:" + (r.height + 28).toFixed(1) + "px;";
    var el = QG.h("div.fx.fx--" + w.key, { style: box });
    var i;
    if (w.key === "sword") {
      el.appendChild(QG.h("div.fx__blade"));
    } else if (w.key === "snake") {
      el.innerHTML = SNAKE_SVG;
    } else if (w.key === "gun") {
      for (i = 0; i < 6; i++) {
        el.appendChild(QG.h("div.fx__hole", {
          style: "left:" + (14 + Math.random() * Math.max(10, r.width - 24)).toFixed(0) + "px;top:" +
            (14 + Math.random() * Math.max(10, r.height - 24)).toFixed(0) + "px;animation-delay:" + (i * 0.035).toFixed(2) + "s"
        }));
      }
      el.appendChild(QG.h("div.fx__flash", { style: "left:-6px;top:50%;margin-top:-13px" }));
    } else if (w.key === "laser") {
      el.appendChild(QG.h("div.fx__beam"));
    } else if (w.key === "lightning") {
      el.innerHTML = BOLT_SVG;
    } else if (w.key === "bomb") {
      el.appendChild(QG.h("div.fx__ring"));
      el.appendChild(QG.h("span.fx__glyph", w.glyph));
    } else {
      el.appendChild(QG.h("span.fx__glyph", w.glyph));
    }
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 760);
    return el;
  }

  function killCard(card, w) {
    spawnFx(card, w);
    var fn = QG.sfx[w.s];
    if (fn) fn();
    card.classList.add("is-dead", "dead--" + w.death);
  }

  /* ---------------- the rampage ---------------- */
  function rampage(m) {
    var cards = Array.prototype.slice.call(document.querySelectorAll("#grid .card"));
    var total = cards.length;

    var bar = QG.h("div.rampage-bar",
      QG.h("span", "GAMES DESTROYED"),
      QG.h("span.rampage-bar__n", "0"),
      QG.h("span", "of " + Math.max(0, total - 1)),
      QG.h("span.rampage-bar__sep", "\u2022"),
      QG.h("span", "weapon:"),
      QG.h("span.rampage-bar__w", "bare hands")
    );
    document.body.appendChild(bar);
    var nEl = bar.querySelector(".rampage-bar__n");
    var wEl = bar.querySelector(".rampage-bar__w");

    if (!total) { showTakeover(m, null); return; }

    // he leaves exactly one alive
    var survIdx = Math.floor(Math.random() * total);
    var survivor = cards[survIdx];
    var order = cards.filter(function (c, i) { return i !== survIdx; });

    m.el.classList.add("is-rampaging");
    m.el.style.transition = "none";
    m.weapon = QG.h("span.mascot__weapon");
    m.el.appendChild(m.weapon);

    var mx = 0, my = 0, seeded = false;
    var scrollPos = window.scrollY || window.pageYOffset || 0;
    var targetScroll = scrollPos;
    var current = null;
    var killed = 0, i = 0, stopped = false, rafId = 0;

    function maxScroll() {
      return Math.max(0, (document.documentElement.scrollHeight || 0) - window.innerHeight);
    }

    function frame() {
      if (stopped) return;
      var d = targetScroll - scrollPos;
      if (Math.abs(d) > 0.5) {
        // fast enough to keep up with the kill beat even in a 1-column mobile grid
        scrollPos += d * 0.3;
        window.scrollTo(0, Math.round(scrollPos));
      }
      if (current) {
        var r = current.getBoundingClientRect();
        var tx = r.left + r.width / 2 - 43;
        var ty = r.top + r.height / 2 - 62;
        if (!seeded) { mx = tx; my = ty; seeded = true; }
        mx += (tx - mx) * 0.3;
        my += (ty - my) * 0.3;
        var tilt = Math.sin(performance.now() / 200) * 8;
        m.el.style.transform = "translate(" + mx.toFixed(1) + "px," + my.toFixed(1) + "px) scale(1.6) rotate(" + tilt.toFixed(1) + "deg)";
      }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    function step() {
      if (stopped) return;
      if (i >= order.length) { finish(); return; }
      var card = order[i++];
      current = card;
      var w = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
      wEl.textContent = w.label;
      m.weapon.textContent = w.glyph;
      m.weapon.classList.remove("is-on");
      void m.weapon.offsetWidth;
      m.weapon.classList.add("is-on");

      var top = card.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
      targetScroll = Math.min(maxScroll(), Math.max(0, top + card.offsetHeight / 2 - window.innerHeight / 2));

      setTimeout(function () {
        if (stopped) return;
        killCard(card, w);
        killed++;
        nEl.textContent = String(killed);
        if (killed === 1) bar.classList.add("is-on");
        setTimeout(step, 55 + Math.random() * 70);
      }, 115);
    }

    function finish() {
      current = null;
      var gt = survivor.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
      targetScroll = Math.min(maxScroll(), Math.max(0, gt + survivor.offsetHeight / 2 - window.innerHeight / 2));
      survivor.classList.add("is-survivor");
      wEl.textContent = "one survivor";
      m.weapon.classList.remove("is-on");
      if (m.mouth) m.mouth.setAttribute("d", MOUTH.happy);
      if (m.browL) m.browL.style.transform = "rotate(0deg)";
      if (m.browR) m.browR.style.transform = "rotate(0deg)";
      QG.sfx.win();

      setTimeout(function () {
        stopped = true;
        cancelAnimationFrame(rafId);
        document.body.classList.remove("rampage");
        lockInput(false);
        showTakeover(m, QG.byId(survivor.getAttribute("data-id")));
      }, 1650);
    }

    setTimeout(step, 260);
  }

  function showTakeover(m, g) {
    if (!g) g = QG.GAMES[Math.floor(Math.random() * QG.GAMES.length)];
    var hex = QG.accentHex(g);

    var box = QG.h("div.takeover__box");
    box.appendChild(QG.h("div.takeover__mascot", { html: SVG[m.kind] }));
    box.appendChild(QG.h("span.takeover__tag", "HE IS OUT OF THE SCREEN"));
    box.appendChild(QG.h("h2", { html: "YOU BROKE THE <em>ARCADE</em>" }));
    box.appendChild(QG.h("p.takeover__lead",
      "You teased " + m.name + " for twelve whole seconds. He climbed out of the wave and took 39 games apart with " +
      "ten different weapons. He left exactly one standing. This one."));
    box.appendChild(QG.h("div.takeover__game",
      QG.h("span.takeover__game-emoji", { style: "background:" + hex }, g.emoji),
      QG.h("div.takeover__game-meta",
        QG.h("span.takeover__game-no", "THE SURVIVOR \u00B7 GAME " + String(g.num).padStart(2, "0") + " / 40"),
        QG.h("h3", g.title),
        QG.h("p", g.desc)
      )
    ));
    box.appendChild(QG.h("div.takeover__warn", {
      html: "<b>&#9888;&#65039; DO NOT TEASE THIS GUY.</b><br>" +
        "He is already definite. He has been measured. He knows exactly where you live &mdash; it is a CSS selector."
    }));
    box.appendChild(QG.h("div.takeover__actions",
      QG.h("button.btn.btn--lime", { type: "button", onclick: function () { location.reload(); } }, "\u21BB Restart the website"),
      QG.h("button.btn.btn--magenta", { type: "button", onclick: function () { location.href = "game.html?g=" + g.id; } },
        "\u25B6 Fine, I'll play " + g.title)
    ));
    box.appendChild(QG.h("p.takeover__fine", "two choices. that is all he left you."));

    var ov = QG.h("div.takeover", QG.h("div.takeover__scan"), box);
    document.body.appendChild(ov);
    document.body.style.overflow = "hidden";
    ov.scrollTop = 0;
    QG.sfx.lose();
  }
})();
