/* ============================================================
   QUANTUM ARCADE — quantum.js
   A tiny but real quantum computing engine for games.
   Complex amplitudes, single-qubit gates, CNOT/CZ/SWAP,
   measurement + collapse, n-qubit state vectors, Bloch sphere.
   ============================================================ */
(function () {
  "use strict";
  var QG = (window.QG = window.QG || {});

  /* ---------------- Complex arithmetic ---------------- */
  var C = {
    c: function (re, im) { return { re: re || 0, im: im || 0 }; },
    add: function (a, b) { return { re: a.re + b.re, im: a.im + b.im }; },
    sub: function (a, b) { return { re: a.re - b.re, im: a.im - b.im }; },
    mul: function (a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; },
    scale: function (a, s) { return { re: a.re * s, im: a.im * s }; },
    abs2: function (a) { return a.re * a.re + a.im * a.im; },
    abs: function (a) { return Math.sqrt(a.re * a.re + a.im * a.im); },
    conj: function (a) { return { re: a.re, im: -a.im }; },
    arg: function (a) { return Math.atan2(a.im, a.re); },
    expi: function (t) { return { re: Math.cos(t), im: Math.sin(t) }; },
    re: function (x) { return { re: x, im: 0 }; },
    eq: function (a, b, e) { e = e || 1e-9; return Math.abs(a.re - b.re) < e && Math.abs(a.im - b.im) < e; }
  };

  var S = 1 / Math.SQRT2; // 1/sqrt(2)

  /* ---------------- Single-qubit gates ---------------- */
  function m(a, b, c, d) {
    return [[C.c(a, b), C.c(c, d)], [C.c(0, 0), C.c(0, 0)]];
  }
  var GATES = {
    I: [C.c(1), C.c(0), C.c(0), C.c(1)],
    X: [C.c(0), C.c(1), C.c(1), C.c(0)],
    Y: [C.c(0), C.c(0, -1), C.c(0, 1), C.c(0)],
    Z: [C.c(1), C.c(0), C.c(0), C.c(-1)],
    H: [C.c(S), C.c(S), C.c(S), C.c(-S)],
    S: [C.c(1), C.c(0), C.c(0), C.c(0, 1)],
    SDG: [C.c(1), C.c(0), C.c(0), C.c(0, -1)],
    T: [C.c(1), C.c(0), C.c(0), C.expi(Math.PI / 4)],
    TDG: [C.c(1), C.c(0), C.c(0), C.expi(-Math.PI / 4)],
    SX: [C.c(0.5, 0.5), C.c(0.5, -0.5), C.c(0.5, -0.5), C.c(0.5, 0.5)],
    V: [C.c(S), C.c(0, -S), C.c(0, -S), C.c(S)]
  };

  // apply a 2x2 (flat [a,b,c,d]) gate to a 2-component amplitude pair
  function apply2(g, a, b) {
    return [
      C.add(C.mul(g[0], a), C.mul(g[1], b)),
      C.add(C.mul(g[2], a), C.mul(g[3], b))
    ];
  }

  function norm2(a, b) {
    var n = Math.sqrt(C.abs2(a) + C.abs2(b));
    if (n < 1e-12) return [C.c(1), C.c(0)];
    return [C.scale(a, 1 / n), C.scale(b, 1 / n)];
  }

  /* ---------------- Qubit ---------------- */
  function Qubit(alpha, beta) {
    this.a = alpha || C.c(1);
    this.b = beta || C.c(0);
    var n = norm2(this.a, this.b);
    this.a = n[0]; this.b = n[1];
  }
  Qubit.prototype.clone = function () { return new Qubit(C.c(this.a.re, this.a.im), C.c(this.b.re, this.b.im)); };
  Object.defineProperty(Qubit.prototype, "p0", { get: function () { return C.abs2(this.a); } });
  Object.defineProperty(Qubit.prototype, "p1", { get: function () { return C.abs2(this.b); } });
  Qubit.prototype.apply = function (g) {
    var n = apply2(g, this.a, this.b); this.a = n[0]; this.b = n[1]; return this;
  };
  // partial / weak measurement: strength 0..1 (1 = full projective collapse)
  Qubit.prototype.measure = function (rnd) {
    rnd = rnd === undefined ? Math.random() : rnd;
    var out = rnd < this.p0 ? 0 : 1;
    this.a = out === 0 ? C.c(1) : C.c(0);
    this.b = out === 1 ? C.c(1) : C.c(0);
    return out;
  };
  Qubit.prototype.phase = function () { return C.arg(this.a) - C.arg(this.b); };
  Qubit.prototype.dirac = function (dp) {
    dp = dp === undefined ? 2 : dp;
    var f = function (z) {
      var m = C.abs(z);
      if (m < 1e-6) return null;
      var ph = C.arg(z);
      var sign = ph < -Math.PI / 2 + 1e-9 || ph > Math.PI / 2 - 1e-9 ? "-" : "";
      var phs = Math.abs(ph) < 1e-6 ? "" : (Math.abs(Math.abs(ph) - Math.PI) < 1e-6 ? "" : "e^{" + (ph / Math.PI).toFixed(2) + "i pi}");
      return sign + m.toFixed(dp) + phs;
    };
    var a = f(this.a), b = f(this.b), parts = [];
    if (a) parts.push(a + "|0>");
    if (b) parts.push(b + "|1>");
    return parts.length ? parts.join(" + ") : "0";
  };
  // Bloch vector (x,y,z) — useful for visualising a single qubit
  Qubit.prototype.bloch = function () {
    var a = this.a, b = this.b;
    var x = 2 * (a.re * b.re + a.im * b.im);
    var y = 2 * (a.re * b.im - a.im * b.re);
    var z = C.abs2(a) - C.abs2(b);
    return { x: x, y: y, z: z, theta: Math.acos(Math.max(-1, Math.min(1, z))), phi: Math.atan2(y, x) };
  };

  /* ---------------- Multi-qubit register (state vector) ---------------- */
  function QReg(n) {
    this.n = n;
    this.size = 1 << n;
    this.amp = new Array(this.size);
    for (var i = 0; i < this.size; i++) this.amp[i] = C.c(0);
    this.amp[0] = C.c(1);
  }
  QReg.prototype.setBasis = function (idx) {
    for (var i = 0; i < this.size; i++) this.amp[i] = C.c(0);
    this.amp[idx & (this.size - 1)] = C.c(1);
    return this;
  };
  QReg.prototype.copy = function () {
    var r = new QReg(this.n);
    for (var i = 0; i < this.size; i++) r.amp[i] = C.c(this.amp[i].re, this.amp[i].im);
    return r;
  };
  QReg.prototype.normalize = function () {
    var s = 0;
    for (var i = 0; i < this.size; i++) s += C.abs2(this.amp[i]);
    s = Math.sqrt(s);
    if (s < 1e-12) return this;
    for (var j = 0; j < this.size; j++) this.amp[j] = C.scale(this.amp[j], 1 / s);
    return this;
  };
  QReg.prototype.apply1 = function (q, g) {
    var bit = 1 << q;
    for (var i = 0; i < this.size; i++) {
      if (i & bit) continue;
      var j = i | bit;
      var r = apply2(g, this.amp[i], this.amp[j]);
      this.amp[i] = r[0]; this.amp[j] = r[1];
    }
    return this.normalize();
  };
  QReg.prototype.cnot = function (ctrl, targ) {
    var cb = 1 << ctrl, tb = 1 << targ;
    for (var i = 0; i < this.size; i++) {
      if (!(i & cb) || (i & tb)) continue;
      var j = i | tb;
      var t = this.amp[i]; this.amp[i] = this.amp[j]; this.amp[j] = t;
    }
    return this;
  };
  QReg.prototype.cz = function (a, b) {
    var ab = 1 << a, bb = 1 << b;
    for (var i = 0; i < this.size; i++) if ((i & ab) && (i & bb)) this.amp[i] = C.scale(this.amp[i], -1);
    return this;
  };
  QReg.prototype.swap = function (a, b) {
    if (a === b) return this;
    var ab = 1 << a, bb = 1 << b;
    for (var i = 0; i < this.size; i++) {
      var x = (i & ab) ? 1 : 0, y = (i & bb) ? 1 : 0;
      if (x === y) continue;
      var j = (i ^ ab) ^ bb;
      if (i < j) { var t = this.amp[i]; this.amp[i] = this.amp[j]; this.amp[j] = t; }
    }
    return this;
  };
  QReg.prototype.p1 = function (q) {
    var bit = 1 << q, s = 0;
    for (var i = 0; i < this.size; i++) if (i & bit) s += C.abs2(this.amp[i]);
    return s;
  };
  QReg.prototype.measure = function (q, rnd) {
    rnd = rnd === undefined ? Math.random() : rnd;
    var bit = 1 << q, out = rnd < this.p1(q) ? 1 : 0, s = 0, i;
    for (i = 0; i < this.size; i++) {
      var match = out ? (i & bit) : !(i & bit);
      if (!match) this.amp[i] = C.c(0); else s += C.abs2(this.amp[i]);
    }
    s = Math.sqrt(s) || 1;
    for (i = 0; i < this.size; i++) this.amp[i] = C.scale(this.amp[i], 1 / s);
    return out;
  };
  QReg.prototype.probs = function () {
    var out = [];
    for (var i = 0; i < this.size; i++) {
      var p = C.abs2(this.amp[i]);
      if (p > 1e-9) out.push({ idx: i, p: p });
    }
    return out.sort(function (a, b) { return b.p - a.p; });
  };
  QReg.prototype.sample = function (rnd) {
    rnd = rnd === undefined ? Math.random() : rnd;
    var r = rnd, acc = 0;
    for (var i = 0; i < this.size; i++) {
      acc += C.abs2(this.amp[i]);
      if (r <= acc + 1e-12) return i;
    }
    return this.size - 1;
  };
  QReg.prototype.measureAll = function (rnd) { return this.sample(rnd); };
  QReg.prototype.dirac = function (dp) {
    dp = dp === undefined ? 2 : dp;
    var parts = [], p = this.probs();
    for (var k = 0; k < p.length && k < 8; k++) {
      var bits = p[k].idx.toString(2);
      while (bits.length < this.n) bits = "0" + bits;
      parts.push(Math.sqrt(p[k].p).toFixed(dp) + "|" + bits + ">");
    }
    if (p.length > 8) parts.push("...");
    return parts.join(" + ");
  };
  // Bell / GHZ helpers
  QReg.bell = function (which) {
    var r = new QReg(2);
    r.apply1(0, GATES.H);
    if (which === 1) r.apply1(0, GATES.X);
    if (which === 2) r.apply1(0, GATES.Z);
    if (which === 3) { r.apply1(0, GATES.X); r.apply1(0, GATES.Z); }
    r.cnot(0, 1);
    return r;
  };
  QReg.ghz = function (n) {
    var r = new QReg(n);
    r.apply1(0, GATES.H);
    for (var i = 1; i < n; i++) r.cnot(0, i);
    return r;
  };

  /* ---------------- Probability distributions (classical-facing) ---------------- */
  function dist(weights) {
    var tot = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    return weights.map(function (w) { return w / tot; });
  }
  function sampleDist(p, rnd) {
    rnd = rnd === undefined ? Math.random() : rnd;
    var acc = 0;
    for (var i = 0; i < p.length; i++) { acc += p[i]; if (rnd <= acc + 1e-12) return i; }
    return p.length - 1;
  }
  // "quantum die": collapse a distribution but keep a ghost of the runner-up
  function quantumPick(labels, weights, rnd) {
    var p = dist(weights);
    var i = sampleDist(p, rnd);
    var order = p.map(function (v, k) { return { k: k, v: v }; }).sort(function (a, b) { return b.v - a.v; });
    return { index: i, label: labels[i], probs: p, order: order, certainty: p[i] };
  }

  /* ---------------- Utility ---------------- */
  var U = {
    int: function (n) { return Math.floor(Math.random() * n); },
    range: function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    chance: function (p) { return Math.random() < p; },
    shuffle: function (arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    },
    clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    sum: function (a) { return a.reduce(function (x, y) { return x + y; }, 0); },
    rangeArr: function (n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; },
    // weights that decay with distance — a "quantum smear" around a classical target
    smear: function (n, centre, spread) {
      var w = [];
      for (var i = 0; i < n; i++) {
        var d = Math.abs(i - centre);
        w.push(Math.exp(-(d * d) / (2 * spread * spread)));
      }
      return w;
    },
    fmtPct: function (p, dp) { return (p * 100).toFixed(dp === undefined ? 0 : dp) + "%"; },
    // hex colour helpers (games tint canvases)
    hexToRgb: function (h) {
      h = h.replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var v = parseInt(h, 16);
      return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
    },
    rgba: function (h, a) {
      var c = U.hexToRgb(h);
      return "rgba(" + c.r + "," + c.g + "," + c.b + "," + a + ")";
    }
  };

  QG.C = C;
  QG.GATES = GATES;
  QG.Qubit = Qubit;
  QG.QReg = QReg;
  QG.apply2 = apply2;
  QG.dist = dist;
  QG.sampleDist = sampleDist;
  QG.quantumPick = quantumPick;
  QG.U = U;
})();
