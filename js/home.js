/* ============================================================
   QUANTUM ARCADE — home.js
   Renders the 40 cards, filtering, parallax hero, live
   wavefunction canvas and theme switching.
   ============================================================ */
(function () {
  "use strict";
  var QG = window.QG;
  var h = QG.h, PAL = QG.PAL;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- THEME ---------------- */
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    QG.store.set("theme", t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "dark" ? "#101018" : "#fffdf4");
  }
  var saved = QG.store.get("theme", null);
  setTheme(saved || "light");
  var tb = document.getElementById("themeBtn");
  if (tb) tb.addEventListener("click", function () {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
    QG.sfx.click();
  });

  /* ---------------- PARALLAX ---------------- */
  var layers = Array.prototype.slice.call(document.querySelectorAll("[data-depth]"));
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var scrollY = window.scrollY || 0;

  if (!reduce) {
    window.addEventListener("pointermove", function (e) {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }
  window.addEventListener("scroll", function () { scrollY = window.scrollY || window.pageYOffset || 0; }, { passive: true });

  var heroEl = document.querySelector(".hero");
  function parallaxFrame() {
    pointer.x += (pointer.tx - pointer.x) * 0.07;
    pointer.y += (pointer.ty - pointer.y) * 0.07;
    var heroBottom = heroEl ? heroEl.offsetTop + heroEl.offsetHeight : 900;
    if (scrollY < heroBottom + 200) {
      for (var i = 0; i < layers.length; i++) {
        var el = layers[i];
        var d = parseFloat(el.getAttribute("data-depth")) || 0;
        var sy = -scrollY * d;
        var px = pointer.x * d * 46;
        var py = pointer.y * d * 46;
        el.style.transform = "translate3d(" + px.toFixed(2) + "px," + (sy + py).toFixed(2) + "px,0)";
      }
    }
    raf = requestAnimationFrame(parallaxFrame);
  }
  var raf = requestAnimationFrame(parallaxFrame);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { cancelAnimationFrame(raf); }
    else { raf = requestAnimationFrame(parallaxFrame); }
  });

  /* ---------------- HERO WAVEFUNCTION CANVAS ---------------- */
  (function heroWave() {
    var host = document.querySelector(".hero__wave");
    if (!host) return;
    var cv = QG.canvas(host, { w: 1200, h: 210 });
    var ctx = cv.ctx;
    var colors = [PAL.cyan, PAL.magenta, PAL.lime, PAL.purple, PAL.yellow];
    var N = 110;

    function frame() {
      ctx.clearRect(0, 0, cv.w, cv.h);
      var t = performance.now() / 1000;

      // centre axis (hand-drawn dashes)
      ctx.save();
      ctx.setLineDash([8, 9]);
      ctx.strokeStyle = PAL.ink;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, cv.h / 2); ctx.lineTo(cv.w, cv.h / 2); ctx.stroke();
      ctx.restore();

      for (var k = 0; k < 3; k++) {
        ctx.beginPath();
        for (var i = 0; i <= N; i++) {
          var u = i / N;
          var x = u * cv.w;
          var env = Math.exp(-Math.pow((u - 0.5) * 3.1, 2));
          var y = cv.h / 2 +
            Math.sin(i * 0.34 + t * (1.15 + k * 0.45) + k * 1.9) * env * cv.h * 0.40 +
            QG.draw.jit(k * 211 + i * 3, 1.8);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = colors[k % colors.length];
        ctx.lineWidth = k === 0 ? 5.5 : 3;
        ctx.globalAlpha = k === 0 ? 1 : 0.5;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // travelling probability packets
      for (var p = 0; p < 5; p++) {
        var uu = ((t * (0.09 + p * 0.021) + p * 0.2) % 1);
        var xx = uu * cv.w;
        var env2 = Math.exp(-Math.pow((uu - 0.5) * 3.1, 2));
        var yy = cv.h / 2 + Math.sin(uu * N * 0.34 + t * (1.15) ) * env2 * cv.h * 0.40;
        QG.draw.circle(ctx, xx, yy, 5 + env2 * 5, { fill: colors[(p + 1) % colors.length], color: PAL.ink, width: 2.6, double: false, wobble: 1 });
      }
    }
    if (reduce) { frame(); } else { QG.loop(frame); }
  })();

  /* ---------------- CARD GRID ---------------- */
  var grid = document.getElementById("grid");
  var filtersEl = document.getElementById("filters");
  var searchEl = document.getElementById("search");
  var sortBtn = document.getElementById("sortBtn");
  var state = { cat: "All", q: "", sort: "num" };

  // filter chips
  QG.CATS.forEach(function (cat) {
    var n = cat === "All" ? QG.GAMES.length : QG.GAMES.filter(function (g) { return g.cat === cat; }).length;
    var chip = h("button.chip", {
      type: "button", "aria-pressed": cat === "All" ? "true" : "false",
      "data-cat": cat
    }, cat + " ", h("span", { style: "opacity:.6" }, n));
    chip.addEventListener("click", function () {
      state.cat = cat;
      Array.prototype.forEach.call(filtersEl.children, function (c) {
        c.setAttribute("aria-pressed", c === chip ? "true" : "false");
      });
      render();
      QG.sfx.tap();
    });
    filtersEl.appendChild(chip);
  });

  if (searchEl) searchEl.addEventListener("input", function () { state.q = searchEl.value.trim().toLowerCase(); render(); });
  if (sortBtn) sortBtn.addEventListener("click", function () {
    state.sort = state.sort === "num" ? "az" : (state.sort === "az" ? "diff" : "num");
    sortBtn.innerHTML = state.sort === "num" ? "&#8645; 1-40" : (state.sort === "az" ? "&#8645; A-Z" : "&#8645; Hard first");
    render(); QG.sfx.tap();
  });

  function diffDots(n) {
    var f = h("span.card__diff", { title: "Difficulty " + n + "/3", "aria-label": "Difficulty " + n + " of 3" });
    for (var i = 0; i < 3; i++) f.appendChild(h("i", { class: i < n ? "on" : "" }));
    return f;
  }

  function makeCard(g) {
    var hex = QG.accentHex(g);
    var best = QG.store.get("best:" + g.id, null);
    var card = h("article.card", { style: "--accent:" + hex, "data-id": g.id });

    var top = h("div.card__top",
      h("span.card__no", String(g.num).padStart(2, "0")),
      h("span.card__emoji", { "aria-hidden": "true" }, g.emoji)
    );
    card.appendChild(top);
    card.appendChild(h("h3.card__title", g.title));

    var tags = h("div.card__tags");
    tags.appendChild(h("span.tag.tag--q", g.cat));
    if (g.inTag) tags.appendChild(h("span.tag.tag--in", "\u{1F1EE}\u{1F1F3} India"));
    if (best) tags.appendChild(h("span.tag", "best " + best));
    card.appendChild(tags);

    card.appendChild(h("p.card__desc", g.desc));

    var foot = h("div.card__foot", diffDots(g.diff));
    foot.appendChild(h("a.card__play.btn.btn--sm", {
      href: "game.html?g=" + g.id,
      style: "--btn-bg:" + hex + (needsDarkText(hex) ? ";color:#0d0d12" : ";color:#fff")
    }, "PLAY \u25B6"));
    card.appendChild(foot);

    if (g.num === 16 || g.num === 40) card.appendChild(h("span.card__stripe", "HOT"));
    return card;
  }
  function needsDarkText(hex) {
    var c = QG.U.hexToRgb(hex);
    var l = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
    return l > 0.6;
  }

  var io = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        var el = en.target;
        var idx = parseInt(el.getAttribute("data-i") || "0", 10);
        setTimeout(function () { el.classList.add("in"); }, Math.min(idx * 26, 400));
        io.unobserve(el);
      }
    });
  }, { rootMargin: "0px 0px -40px 0px", threshold: 0.05 }) : null;

  function render() {
    var list = QG.GAMES.filter(function (g) {
      if (state.cat !== "All" && g.cat !== state.cat) return false;
      if (!state.q) return true;
      return (g.title + " " + g.desc + " " + g.cat + " " + (g.tags || []).join(" ") + " " + g.id).toLowerCase().indexOf(state.q) !== -1;
    });
    if (state.sort === "az") list = list.slice().sort(function (a, b) { return a.title.localeCompare(b.title); });
    else if (state.sort === "diff") list = list.slice().sort(function (a, b) { return b.diff - a.diff || a.num - b.num; });

    QG.clear(grid);
    if (!list.length) {
      grid.appendChild(h("div.empty", "No games match that. Try \u201Cchess\u201D or \u201Cludo\u201D."));
      return;
    }
    list.forEach(function (g, i) {
      var c = makeCard(g);
      c.setAttribute("data-i", String(i));
      grid.appendChild(c);
      if (io) io.observe(c); else c.classList.add("in");
    });
  }
  render();

  /* ---------------- RANDOM ---------------- */
  var rb = document.getElementById("randomBtn");
  if (rb) rb.addEventListener("click", function () {
    QG.sfx.pop();
    var g = QG.GAMES[Math.floor(Math.random() * QG.GAMES.length)];
    QG.toast("Collapsing to: " + g.title, "quantum", 1100);
    setTimeout(function () { location.href = "game.html?g=" + g.id; }, 550);
  });

  /* ---------------- SMOOTH ANCHORS ---------------- */
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), function (a) {
    a.addEventListener("click", function (e) {
      var t = document.querySelector(a.getAttribute("href"));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });
})();
