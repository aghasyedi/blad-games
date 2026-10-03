/* ============================================================
   QUANTUM ARCADE — ui.js
   Shared runtime: hyperscript, canvas helper, hand-drawn canvas
   drawing kit, sound, storage, toast, modal, timers, registry.
   Every game is written against this API.
   ============================================================ */
(function () {
  "use strict";
  var QG = (window.QG = window.QG || {});
  var U = QG.U;

  /* ================= PALETTE & FONTS ================= */
  QG.PAL = {
    ink: "#0d0d12", paper: "#fffdf4", paper2: "#fff7dd",
    cyan: "#00e5ff", magenta: "#ff2e97", lime: "#c6ff00", yellow: "#ffe500",
    purple: "#8b5cf6", orange: "#ff7a00", blue: "#2979ff", red: "#ff3b3b",
    green: "#00e676", pink: "#ff8ad4"
  };
  QG.ACCENTS = ["cyan", "magenta", "lime", "yellow", "purple", "orange", "blue", "green", "pink", "red"];
  QG.hex = function (name) { return QG.PAL[name] || name || QG.PAL.cyan; };
  QG.FONT = {
    display: '"Archivo Black","Arial Black",sans-serif',
    body: '"Space Grotesk",system-ui,sans-serif',
    hand: '"Caveat","Comic Sans MS",cursive',
    marker: '"Permanent Marker","Comic Sans MS",cursive',
    mono: 'ui-monospace,Menlo,monospace'
  };

  /* ================= HYPERSCRIPT ================= */
  var SVGNS = "http://www.w3.org/2000/svg";
  var SVG_TAGS = { svg: 1, path: 1, circle: 1, ellipse: 1, rect: 1, line: 1, polyline: 1, polygon: 1, g: 1, text: 1, defs: 1, filter: 1, feTurbulence: 1, feDisplacementMap: 1, use: 1, tspan: 1, clipPath: 1, linearGradient: 1, stop: 1, radialGradient: 1, mask: 1 };

  function applyAttrs(el, attrs, isSvg) {
    for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === "class" || k === "className") {
        el.setAttribute("class", Array.isArray(v) ? v.filter(Boolean).join(" ") : String(v));
      } else if (k === "style") {
        if (typeof v === "string") el.setAttribute("style", v);
        else for (var s in v) { try { el.style[s] = v[s]; } catch (e) { el.style.setProperty(s, v[s]); } }
      } else if (k === "html" || k === "innerHTML") {
        el.innerHTML = v;
      } else if (k === "text") {
        el.textContent = v;
      } else if (k.slice(0, 2) === "on" && typeof v === "function") {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === "dataset" && typeof v === "object") {
        for (var d in v) el.dataset[d] = v[d];
      } else if (k === "value" && "value" in el) {
        el.value = v;
      } else if (k === "checked" || k === "disabled" || k === "open" || k === "selected") {
        if (v) el.setAttribute(k, ""); else el.removeAttribute(k);
        try { el[k] = !!v; } catch (e) { }
      } else {
        el.setAttribute(k, v === true ? "" : String(v));
      }
    }
  }

  function h(sel) {
    var parts = String(sel).split(/(?=[.#])/);
    var tag = "div", classes = [], id = null;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p) continue;
      if (p[0] === ".") classes.push(p.slice(1));
      else if (p[0] === "#") id = p.slice(1);
      else tag = p;
    }
    var isSvg = !!SVG_TAGS[tag];
    var el = isSvg ? document.createElementNS(SVGNS, tag) : document.createElement(tag);
    if (classes.length) el.setAttribute("class", classes.join(" "));
    if (id) el.id = id;

    for (var a = 1; a < arguments.length; a++) {
      var arg = arguments[a];
      if (arg === null || arg === undefined || arg === false) continue;
      if (Array.isArray(arg)) { for (var j = 0; j < arg.length; j++) append(el, arg[j], isSvg); }
      else if (arg && arg.nodeType) append(el, arg, isSvg);
      else if (typeof arg === "object" && a === 1) applyAttrs(el, arg, isSvg);
      else if (typeof arg === "object") applyAttrs(el, arg, isSvg);
      else append(el, String(arg), isSvg);
    }
    return el;
  }
  function append(el, kid, isSvg) {
    if (kid === null || kid === undefined || kid === false) return;
    if (kid.nodeType) { el.appendChild(kid); return; }
    el.appendChild(document.createTextNode(String(kid)));
  }
  function frag() {
    var f = document.createDocumentFragment();
    for (var i = 0; i < arguments.length; i++) {
      var a = arguments[i];
      if (Array.isArray(a)) { for (var j = 0; j < a.length; j++) append(f, a[j]); }
      else append(f, a);
    }
    return f;
  }
  function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); return el; }

  QG.h = h; QG.frag = frag; QG.clear = clear;
  QG.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };

  /* ================= STORAGE ================= */
  var PREFIX = "qarc:";
  QG.store = {
    get: function (k, def) {
      try { var v = localStorage.getItem(PREFIX + k); return v === null ? def : JSON.parse(v); }
      catch (e) { return def; }
    },
    set: function (k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { } return v; },
    del: function (k) { try { localStorage.removeItem(PREFIX + k); } catch (e) { } },
    add: function (k, n, def) { var v = (QG.store.get(k, def === undefined ? 0 : def) || 0) + n; QG.store.set(k, v); return v; }
  };

  /* ================= SOUND (tiny WebAudio blips) ================= */
  var actx = null;
  var muted = QG.store.get("muted", false);
  function ctx() {
    if (muted) return null;
    try {
      if (!actx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        actx = new AC();
      }
      if (actx.state === "suspended") actx.resume();
      return actx;
    } catch (e) { return null; }
  }
  function tone(freq, dur, type, vol, slideTo) {
    var a = ctx(); if (!a) return;
    try {
      var o = a.createOscillator(), g = a.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, a.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), a.currentTime + dur);
      g.gain.setValueAtTime(0.0001, a.currentTime);
      g.gain.exponentialRampToValueAtTime(vol || 0.07, a.currentTime + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + dur + 0.02);
    } catch (e) { }
  }
  function noise(dur, vol) {
    var a = ctx(); if (!a) return;
    try {
      var n = Math.floor(a.sampleRate * dur);
      var buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = a.createBufferSource(); s.buffer = buf;
      var g = a.createGain(); g.gain.value = vol || 0.06;
      s.connect(g); g.connect(a.destination); s.start();
    } catch (e) { }
  }
  QG.sfx = {
    click: function () { tone(520, 0.05, "square", 0.05); },
    tap: function () { tone(720, 0.04, "triangle", 0.05); },
    pop: function () { tone(880, 0.08, "sine", 0.06, 1500); },
    measure: function () { tone(1200, 0.16, "sawtooth", 0.05, 320); noise(0.1, 0.03); },
    gate: function () { tone(400, 0.1, "sine", 0.05, 900); },
    good: function () { tone(660, 0.09, "square", 0.05); setTimeout(function () { tone(990, 0.12, "square", 0.05); }, 80); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tone(f, 0.16, "square", 0.055); }, i * 95); }); },
    lose: function () { [400, 320, 240, 170].forEach(function (f, i) { setTimeout(function () { tone(f, 0.18, "sawtooth", 0.05); }, i * 110); }); },
    zap: function () { tone(180, 0.22, "sawtooth", 0.05, 1400); },
    teleport: function () { tone(300, 0.24, "sine", 0.05, 1800); noise(0.16, 0.03); },
    tick: function () { tone(1400, 0.02, "square", 0.03); },
    isMuted: function () { return muted; },
    toggle: function () { muted = !muted; QG.store.set("muted", muted); if (!muted) QG.sfx.pop(); return muted; }
  };

  /* ================= TOAST ================= */
  function toastHost() {
    var host = document.querySelector(".toast-host");
    if (!host) { host = h("div.toast-host"); document.body.appendChild(host); }
    return host;
  }
  QG.toast = function (msg, kind, ms) {
    var host = toastHost();
    var t = h("div.toast" + (kind ? ".toast--" + kind : ""), String(msg));
    host.appendChild(t);
    setTimeout(function () {
      t.style.transition = "opacity .25s, transform .25s";
      t.style.opacity = "0"; t.style.transform = "translateY(10px)";
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    }, ms || 1900);
    while (host.children.length > 4) host.removeChild(host.firstChild);
    return t;
  };

  /* ================= MODAL ================= */
  QG.modal = function (opts) {
    opts = opts || {};
    var box = h("div.modal__box");
    if (opts.title) box.appendChild(h("h2", { style: "font-size:clamp(1.3rem,5vw,2rem);text-transform:uppercase;margin-bottom:8px;" }, opts.title));
    if (opts.body) box.appendChild(typeof opts.body === "string" ? h("p", { class: "hand", style: "font-size:1.2rem" }, opts.body) : opts.body);
    var actions = h("div.row.mt16", { style: "justify-content:center" });
    (opts.actions || [{ label: "OK", kind: "lime" }]).forEach(function (a) {
      actions.appendChild(h("button.btn" + (a.kind ? ".btn--" + a.kind : ""), {
        onclick: function () { close(); if (a.onClick) a.onClick(); }
      }, a.label));
    });
    box.appendChild(actions);
    var wrap = h("div.modal", { onclick: function (e) { if (e.target === wrap && opts.dismissable !== false) close(); } }, box);
    function close() { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }
    document.body.appendChild(wrap);
    return { close: close, el: wrap, box: box };
  };

  /* ================= TIMERS ================= */
  QG.wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  QG.loop = function (fn) {
    var raf = 0, last = 0, stopped = false;
    function step(t) {
      if (stopped) return;
      var dt = last ? Math.min(64, t - last) : 16;
      last = t;
      try { fn(dt, t); } catch (e) { console.error(e); }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return function () { stopped = true; cancelAnimationFrame(raf); };
  };
  QG.every = function (ms, fn) {
    var id = setInterval(function () { try { fn(); } catch (e) { console.error(e); } }, ms);
    return function () { clearInterval(id); };
  };
  QG.after = function (ms, fn) { var id = setTimeout(fn, ms); return function () { clearTimeout(id); }; };

  /* ================= CANVAS HELPER ================= */
  QG.canvas = function (parent, opts) {
    opts = opts || {};
    var lw = opts.w || 600, lh = opts.h || 400;
    var el = h("canvas", { style: "display:block;width:100%;aspect-ratio:" + lw + "/" + lh + ";border-radius:8px;" });
    if (opts.class) el.setAttribute("class", opts.class);
    var ctx2d = el.getContext("2d");
    var handle = {
      el: el, ctx: ctx2d, w: lw, h: lh,
      onResize: opts.onResize || null,
      resize: function () {
        var r = el.getBoundingClientRect();
        var cw = Math.max(40, r.width);
        var ch = cw * (lh / lw);
        var dpr = Math.min(2.5, window.devicePixelRatio || 1);
        el.width = Math.round(cw * dpr);
        el.height = Math.round(ch * dpr);
        var s = (cw * dpr) / lw;
        ctx2d.setTransform(s, 0, 0, s, 0, 0);
        handle.scale = s;
        if (handle.onResize) handle.onResize(cw, ch);
      },
      clear: function (color) {
        ctx2d.save(); ctx2d.setTransform(1, 0, 0, 1, 0, 0);
        if (color) { ctx2d.fillStyle = color; ctx2d.fillRect(0, 0, el.width, el.height); }
        else ctx2d.clearRect(0, 0, el.width, el.height);
        ctx2d.restore();
      },
      pt: function (evt) {
        var r = el.getBoundingClientRect();
        var src = evt.touches && evt.touches[0] ? evt.touches[0] : (evt.changedTouches && evt.changedTouches[0] ? evt.changedTouches[0] : evt);
        return { x: (src.clientX - r.left) * (lw / r.width), y: (src.clientY - r.top) * (lh / r.height) };
      },
      on: function (type, fn) {
        var map = { down: "pointerdown", move: "pointermove", up: "pointerup", cancel: "pointercancel", leave: "pointerleave" };
        var ev = map[type] || type;
        var wrapped = function (e) { if (type === "down" || type === "move") e.preventDefault(); fn(handle.pt(e), e); };
        el.addEventListener(ev, wrapped, { passive: false });
        handle._off = handle._off || [];
        handle._off.push(function () { el.removeEventListener(ev, wrapped); });
      },
      destroy: function () {
        (handle._off || []).forEach(function (f) { f(); });
        if (handle._ro) handle._ro.disconnect();
      }
    };
    parent.appendChild(el);
    handle.resize();
    if (window.ResizeObserver) {
      handle._ro = new ResizeObserver(function () { handle.resize(); });
      handle._ro.observe(el);
    } else {
      var onWinResize = function () { handle.resize(); };
      window.addEventListener("resize", onWinResize);
      handle._off = handle._off || [];
      handle._off.push(function () { window.removeEventListener("resize", onWinResize); });
    }
    return handle;
  };

  /* ================= HAND-DRAWN CANVAS KIT ================= */
  function hash1(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function jit(seed, amp) { return (hash1(seed) * 2 - 1) * amp; }

  var D = {
    jit: jit,
    // sketchy straight line
    line: function (c, x1, y1, x2, y2, opt) {
      opt = opt || {};
      var wob = opt.wobble === undefined ? 1.4 : opt.wobble;
      var seed = (x1 * 3.1 + y1 * 7.7 + x2 * 1.3 + y2 * 5.9) + (opt.seed || 0);
      var passes = opt.passes || 1;
      c.save();
      c.lineCap = "round"; c.lineJoin = "round";
      for (var p = 0; p < passes; p++) {
        c.beginPath();
        var seg = 6;
        for (var i = 0; i <= seg; i++) {
          var t = i / seg;
          var x = x1 + (x2 - x1) * t + jit(seed + i * 3.3 + p * 17, wob);
          var y = y1 + (y2 - y1) * t + jit(seed + i * 5.7 + p * 23, wob);
          if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.strokeStyle = p === 0 ? (opt.color || QG.PAL.ink) : (opt.color2 || opt.color || QG.PAL.ink);
        c.globalAlpha = p === 0 ? 1 : 0.5;
        c.lineWidth = opt.width || 3;
        c.stroke();
      }
      c.restore();
    },
    // sketchy filled+stroked rectangle
    rect: function (c, x, y, w, hgt, opt) {
      opt = opt || {};
      var wob = opt.wobble === undefined ? 1.6 : opt.wobble;
      var seed = (x * 2.3 + y * 4.1 + w * 1.7 + hgt * 3.9) + (opt.seed || 0);
      var r = opt.radius || 0;
      c.save();
      c.beginPath();
      var steps = 4;
      var corners = [
        [x + r, y], [x + w - r, y],
        [x + w, y + r], [x + w, y + hgt - r],
        [x + w - r, y + hgt], [x + r, y + hgt],
        [x, y + hgt - r], [x, y + r]
      ];
      c.moveTo(corners[0][0], corners[0][1]);
      for (var i = 0; i < corners.length; i++) {
        var a = corners[i], b = corners[(i + 1) % corners.length];
        var ax = a[0] + jit(seed + i * 2.1, wob), ay = a[1] + jit(seed + i * 3.7, wob);
        var bx = b[0] + jit(seed + i * 5.3, wob), by = b[1] + jit(seed + i * 7.1, wob);
        if (r > 0 && i % 2 === 1) {
          c.quadraticCurveTo((ax + bx) / 2 + (b[0] === a[0] ? (i < 4 ? 1 : -1) * r * 1.1 : 0), (ay + by) / 2 + (b[1] === a[1] ? (i % 4 < 2 ? 1 : -1) * r * 1.1 : 0), bx, by);
        } else {
          for (var s = 1; s <= steps; s++) {
            var t = s / steps;
            c.lineTo(ax + (bx - ax) * t + jit(seed + i * 11 + s, wob), ay + (by - ay) * t + jit(seed + i * 13 + s, wob));
          }
        }
      }
      c.closePath();
      if (opt.fill) { c.fillStyle = opt.fill; c.fill(); }
      if (opt.stroke !== false) {
        c.strokeStyle = opt.color || QG.PAL.ink;
        c.lineWidth = opt.width || 3;
        c.lineJoin = "round";
        c.stroke();
        if (opt.double !== false) {
          c.globalAlpha = 0.4; c.translate(1.2, 1.2); c.stroke(); c.translate(-1.2, -1.2); c.globalAlpha = 1;
        }
      }
      c.restore();
    },
    circle: function (c, cx, cy, r, opt) {
      opt = opt || {};
      var wob = opt.wobble === undefined ? 1.4 : opt.wobble;
      var seed = (cx * 2.9 + cy * 3.7 + r * 5.1) + (opt.seed || 0);
      c.save();
      c.beginPath();
      var seg = Math.max(16, Math.round(r * 1.2));
      for (var i = 0; i <= seg; i++) {
        var a = (i / seg) * Math.PI * 2;
        var rr = r + jit(seed + i * 1.9, wob);
        var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.closePath();
      if (opt.fill) { c.fillStyle = opt.fill; c.fill(); }
      if (opt.stroke !== false) {
        c.strokeStyle = opt.color || QG.PAL.ink; c.lineWidth = opt.width || 3; c.stroke();
        if (opt.double !== false) { c.globalAlpha = 0.4; c.translate(1.1, 1.1); c.stroke(); c.translate(-1.1, -1.1); c.globalAlpha = 1; }
      }
      c.restore();
    },
    blob: function (c, cx, cy, r, opt) {
      opt = opt || {};
      var lobes = opt.lobes || 5, amp = opt.amp === undefined ? 0.22 : opt.amp;
      var seed = (cx * 1.7 + cy * 2.3 + r * 3.1) + (opt.seed || 0);
      c.save();
      c.beginPath();
      var seg = 90;
      for (var i = 0; i <= seg; i++) {
        var a = (i / seg) * Math.PI * 2;
        var rr = r * (1 + amp * Math.sin(a * lobes + seed) + amp * 0.5 * Math.sin(a * (lobes + 3) + seed * 1.7));
        var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.closePath();
      if (opt.fill) { c.fillStyle = opt.fill; c.fill(); }
      if (opt.stroke !== false) { c.strokeStyle = opt.color || QG.PAL.ink; c.lineWidth = opt.width || 3; c.stroke(); }
      c.restore();
    },
    text: function (c, str, x, y, opt) {
      opt = opt || {};
      c.save();
      c.font = (opt.weight || "700") + " " + (opt.size || 16) + "px " + (opt.font || QG.FONT.display);
      c.textAlign = opt.align || "center";
      c.textBaseline = opt.baseline || "middle";
      if (opt.strokeColor) {
        c.lineWidth = opt.strokeWidth || 4; c.strokeStyle = opt.strokeColor;
        c.lineJoin = "round"; c.strokeText(str, x, y);
      }
      c.fillStyle = opt.color || QG.PAL.ink;
      c.fillText(str, x, y);
      c.restore();
    },
    // diagonal hatch = superposition
    hatch: function (c, x, y, w, hgt, opt) {
      opt = opt || {};
      c.save();
      c.beginPath(); c.rect(x, y, w, hgt); c.clip();
      c.strokeStyle = opt.color || QG.PAL.purple;
      c.globalAlpha = opt.alpha === undefined ? 0.5 : opt.alpha;
      c.lineWidth = opt.width || 3;
      var step = opt.step || 8;
      for (var i = -hgt; i < w; i += step) {
        c.beginPath(); c.moveTo(x + i, y + hgt); c.lineTo(x + i + hgt, y); c.stroke();
      }
      c.restore();
    },
    // dashed uncertainty ring
    dashedCircle: function (c, cx, cy, r, opt) {
      opt = opt || {};
      c.save();
      c.beginPath();
      c.setLineDash(opt.dash || [6, 6]);
      c.lineDashOffset = opt.offset || 0;
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.strokeStyle = opt.color || QG.PAL.ink;
      c.lineWidth = opt.width || 3;
      c.stroke();
      c.restore();
    },
    // probability glow behind a cell
    glow: function (c, cx, cy, r, color, alpha) {
      var g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, QG.U.rgba(color, alpha === undefined ? 0.55 : alpha));
      g.addColorStop(1, QG.U.rgba(color, 0));
      c.save(); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill(); c.restore();
    }
  };
  QG.draw = D;

  /* ================= INPUT HELPERS ================= */
  // On-screen D-pad. opts: {up,down,left,right,center labels, onPress(dir, btn)}
  QG.dpad = function (opts) {
    opts = opts || {};
    var wrap = h("div.pad");
    var defs = [
      ["", opts.up || "\u2191", ""],
      [opts.left || "\u2190", opts.center || "", opts.right || "\u2192"],
      ["", opts.down || "\u2193", ""]
    ];
    var names = ["", "up", "", "left", "center", "right", "", "down", ""];
    defs.forEach(function (row, ri) {
      row.forEach(function (txt, ci) {
        if (!txt) { wrap.appendChild(h("div.padbtn.padbtn--spacer")); return; }
        var dir = names[ri * 3 + ci];
        var b = h("button.padbtn", { type: "button", "aria-label": dir }, txt);
        b.addEventListener("click", function () { QG.sfx.tap(); if (opts.onPress) opts.onPress(dir, b); });
        wrap.appendChild(b);
      });
    });
    return wrap;
  };

  // Keyboard arrows/WASD + touch swipe. Returns a detach function.
  QG.steer = function (target, onDir, opts) {
    opts = opts || {};
    var map = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right"
    };
    var kd = function (e) {
      var m = map[e.key];
      if (!m) return;
      if (opts.preventDefault !== false) e.preventDefault();
      onDir(m);
    };
    if (opts.keys !== false) window.addEventListener("keydown", kd);
    var sx = 0, sy = 0, active = false;
    var ts = function (e) { var t = e.touches ? e.touches[0] : e; sx = t.clientX; sy = t.clientY; active = true; };
    var te = function (e) {
      if (!active) return; active = false;
      var t = e.changedTouches ? e.changedTouches[0] : e;
      var dx = t.clientX - sx, dy = t.clientY - sy;
      var thr = opts.threshold || 28;
      if (Math.abs(dx) < thr && Math.abs(dy) < thr) return;
      if (Math.abs(dx) > Math.abs(dy)) onDir(dx > 0 ? "right" : "left");
      else onDir(dy > 0 ? "down" : "up");
    };
    if (target && opts.swipe !== false) {
      target.addEventListener("touchstart", ts, { passive: true });
      target.addEventListener("touchend", te);
    }
    return function () {
      window.removeEventListener("keydown", kd);
      if (target) { target.removeEventListener("touchstart", ts); target.removeEventListener("touchend", te); }
    };
  };

  /* ================= HOVER TILT ================= */
  // Hover feedback is a small lean in a random direction — never a pop or zoom.
  var TILT_SEL = ".card,.btn,.chip,.tile,.pcard,.padbtn,.cell,.feature,.stat,.tag";
  QG.tilt = function (el, range) {
    if (!el || !el.style) return el;
    var r = range === undefined ? 2.3 : range;
    el.style.setProperty("--tilt", (Math.random() * r * 2 - r).toFixed(2) + "deg");
    return el;
  };
  document.addEventListener("pointerenter", function (e) {
    var el = e.target;
    if (!el || el.nodeType !== 1 || typeof el.matches !== "function") return;
    if (!el.matches(TILT_SEL)) return;
    QG.tilt(el);
  }, true);

  /* ================= REGISTRY ================= */
  QG.games = {};
  QG.register = function (id, initFn) { QG.games[id] = initFn; return QG; };

  /* ================= MISC ================= */
  QG.query = function (name) {
    var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
  };
  QG.raf = function (fn) { var id = requestAnimationFrame(fn); return function () { cancelAnimationFrame(id); }; };
  QG.isTouch = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
})();
