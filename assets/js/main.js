/* ==========================================================================
   NEVIN — interaction layer
   Dependency-free. Every module is defensive: a failure in one never blocks
   the others, and each one no-ops when its target element is absent.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var raf = window.requestAnimationFrame.bind(window);

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ---------------------------------------------------------------- loader */
  function loader() {
    var el = $("#loader");
    if (!el) { document.body.classList.remove("is-loading"); return; }

    var bar = $(".loader__bar", el);
    var pct = $(".loader__pct", el);
    var value = 0;
    var settled = false;
    var timer = setInterval(step, 130);

    function paint(v) {
      if (bar) bar.style.width = v + "%";
      if (pct) pct.textContent = String(Math.round(v)).padStart(3, "0") + "%";
    }

    function step() {
      value = Math.min(value + (settled ? 14 : Math.random() * 11 + 4), settled ? 100 : 92);
      paint(value);
      if (value >= 100) { clearInterval(timer); finish(); }
    }

    function finish() {
      paint(100);
      setTimeout(function () {
        el.classList.add("is-done");
        document.body.classList.remove("is-loading");
        document.body.classList.add("is-ready");
        window.dispatchEvent(new CustomEvent("nevin:ready"));
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
      }, reduced ? 0 : 380);
    }

    function settle() { settled = true; }

    if (document.readyState === "complete") settle();
    else window.addEventListener("load", settle, { once: true });
    // Hard ceiling so a stalled asset can never trap the visitor behind the loader.
    setTimeout(settle, 3600);
    paint(0);
  }

  /* -------------------------------------------------------- smooth scroll */
  // Lightweight inertial scroll (Lenis-style) with native fallback.
  function smoothScroll() {
    if (reduced || !fine) return;

    // CSS smooth scrolling would fight the rAF loop below — hand over control.
    root.style.scrollBehavior = "auto";

    var target = window.scrollY;
    var current = target;
    var running = false;

    function max() {
      return Math.max(0, document.body.scrollHeight - window.innerHeight);
    }

    function loop() {
      current = lerp(current, target, 0.11);
      if (Math.abs(target - current) < 0.4) { current = target; running = false; }
      window.scrollTo(0, current);
      if (running) raf(loop);
    }

    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey || document.body.classList.contains("nav-open")) return;
      e.preventDefault();
      target = clamp(target + e.deltaY * (e.deltaMode === 1 ? 18 : 1), 0, max());
      if (!running) { running = true; raf(loop); }
    }, { passive: false });

    // Keep the virtual position honest whenever scrolling happens by any other
    // means (back-to-top, keyboard, scrollbar drag, touch, browser restore).
    // While the loop is idle we simply mirror the real position.
    window.addEventListener("scroll", function () {
      if (!running) { target = current = window.scrollY; }
    }, { passive: true });

    window.addEventListener("resize", function () { target = current = window.scrollY; });

    // Anchor links ride the same easing.
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (!id || id === "#") return;
        var dest = document.querySelector(id);
        if (!dest) return;
        e.preventDefault();
        var offset = (parseFloat(getComputedStyle(root).getPropertyValue("--nav-h")) || 74) + 18;
        target = clamp(dest.getBoundingClientRect().top + window.scrollY - offset, 0, max());
        if (!running) { running = true; raf(loop); }
      });
    });
  }

  /* ------------------------------------------------------------- particles */
  function particles() {
    var canvas = $("#particles");
    if (!canvas || reduced) return;

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, dots = [], hidden = false;
    var palette = ["59,130,246", "168,85,247", "34,211,238"];

    function size() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      var count = clamp(Math.round((w * h) / 26000), 20, 78);
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.8 + 0.5,
          vx: (Math.random() - 0.5) * 0.22,
          vy: -(Math.random() * 0.30 + 0.06),
          a: Math.random() * 0.4 + 0.16,
          c: palette[(Math.random() * palette.length) | 0],
          p: Math.random() * Math.PI * 2
        });
      }
    }

    function frame() {
      if (!hidden) {
        ctx.clearRect(0, 0, w, h);
        for (var i = 0; i < dots.length; i++) {
          var d = dots[i];
          d.p += 0.01;
          d.x += d.vx + Math.sin(d.p) * 0.16;
          d.y += d.vy;
          if (d.y < -12) { d.y = h + 12; d.x = Math.random() * w; }
          if (d.x < -12) d.x = w + 12;
          if (d.x > w + 12) d.x = -12;
          var glow = d.a * (0.7 + Math.sin(d.p * 1.6) * 0.3);
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + d.c + "," + glow.toFixed(3) + ")";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(" + d.c + ",.5)";
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
      raf(frame);
    }

    document.addEventListener("visibilitychange", function () { hidden = document.hidden; });
    window.addEventListener("resize", size);
    size();
    frame();
  }

  /* ------------------------------------------------------ mouse spotlight */
  function spotlight() {
    var el = $("#spotlight");
    if (!el || !fine || reduced) return;

    var x = window.innerWidth / 2, y = window.innerHeight / 2;
    var tx = x, ty = y, on = false;

    window.addEventListener("pointermove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; el.classList.add("is-live"); }
    }, { passive: true });

    (function loop() {
      x = lerp(x, tx, 0.09);
      y = lerp(y, ty, 0.09);
      el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      raf(loop);
    })();
  }

  /* --------------------------------------------------- cursor + trail */
  function cursor() {
    var dot = $("#cursorDot");
    var ring = $("#cursorRing");
    var canvas = $("#cursorTrail");
    if (!dot || !ring || !fine || reduced) return;

    var mx = -100, my = -100, rx = mx, ry = my;
    var hotSel = 'a, button, [data-cursor="hot"], input, textarea, select, summary';

    window.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      document.body.classList.add("cursor-live");
      var hot = e.target instanceof Element && e.target.closest(hotSel);
      ring.classList.toggle("is-hot", !!hot);
    }, { passive: true });

    document.addEventListener("pointerdown", function () { ring.style.scale = "0.82"; });
    document.addEventListener("pointerup", function () { ring.style.scale = "1"; });
    document.addEventListener("pointerleave", function () { document.body.classList.remove("cursor-live"); });

    var ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
    var pts = [];
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function size() {
      if (!canvas) return;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (canvas) { size(); window.addEventListener("resize", size); }

    (function loop() {
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";

      if (ctx) {
        pts.push({ x: rx, y: ry, life: 1 });
        if (pts.length > 22) pts.shift();
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        for (var i = 1; i < pts.length; i++) {
          var p = pts[i], q = pts[i - 1];
          var t = i / pts.length;
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = "rgba(" + Math.round(lerp(34, 168, t)) + "," +
                            Math.round(lerp(211, 85, t)) + "," +
                            Math.round(lerp(238, 247, t)) + "," + (t * 0.42).toFixed(3) + ")";
          ctx.lineWidth = t * 2.6;
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }
      raf(loop);
    })();
  }

  /* ------------------------------------------------------ scroll progress */
  function progress() {
    var bar = $("#progress");
    if (!bar) return;
    var ticking = false;

    function update() {
      var max = document.body.scrollHeight - window.innerHeight;
      var p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; raf(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ------------------------------------------------- nav: stick / spy / menu */
  function nav() {
    var bar = $("#nav");
    var toggle = $("#navToggle");
    var links = $$(".nav__link");
    if (!bar) return;

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      raf(function () {
        bar.classList.toggle("is-stuck", window.scrollY > 24);
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = document.body.classList.toggle("nav-open");
        toggle.setAttribute("aria-expanded", String(open));
      });
      links.forEach(function (l) {
        l.addEventListener("click", function () {
          document.body.classList.remove("nav-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
      window.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
          document.body.classList.remove("nav-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    var sections = links
      .map(function (l) { return document.querySelector(l.getAttribute("href") || ""); })
      .filter(Boolean);

    if (!sections.length || !("IntersectionObserver" in window)) return;

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) {
          l.classList.toggle("is-active", l.getAttribute("href") === "#" + en.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* -------------------------------------------------------- scroll reveal */
  function reveal() {
    var items = $$("[data-reveal]");
    if (!items.length) return;

    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-revealed"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-revealed");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

    items.forEach(function (el, i) {
      var d = el.getAttribute("data-reveal-delay");
      el.style.setProperty("--reveal-delay", (d ? +d : (i % 4) * 70) + "ms");
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------ skill rings */
  function rings() {
    var list = $$("[data-ring]");
    if (!list.length) return;

    list.forEach(function (ring) {
      var bar = $(".ring__bar", ring);
      var out = $(".ring__value b", ring);
      var pct = clamp(parseFloat(ring.getAttribute("data-ring")) || 0, 0, 100);
      var circle = $("circle.ring__bar", ring);
      var r = circle ? parseFloat(circle.getAttribute("r")) : 44;
      var circ = 2 * Math.PI * r;

      ring.style.setProperty("--circ", circ.toFixed(2));
      if (bar) bar.style.strokeDashoffset = circ.toFixed(2);

      function run() {
        if (bar) bar.style.strokeDashoffset = (circ * (1 - pct / 100)).toFixed(2);
        if (!out) return;
        if (reduced) { out.textContent = Math.round(pct); return; }
        var start = performance.now(), dur = 1700;
        (function tick(now) {
          var t = clamp((now - start) / dur, 0, 1);
          var eased = 1 - Math.pow(1 - t, 3);
          out.textContent = Math.round(pct * eased);
          if (t < 1) raf(tick);
        })(start);
      }

      if (reduced || !("IntersectionObserver" in window)) { run(); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          run();
          io.disconnect();
        });
      }, { threshold: 0.4 });
      io.observe(ring);
    });
  }

  /* -------------------------------------------------------------- typing */
  function typing() {
    var el = $("#typed");
    if (!el) return;

    var words;
    try { words = JSON.parse(el.getAttribute("data-words") || "[]"); }
    catch (err) { words = []; }
    if (!words.length) return;

    var out = $(".typed-text", el) || el;

    if (reduced) { out.textContent = words[0]; return; }

    var w = 0, c = 0, deleting = false;

    (function tick() {
      var word = words[w];
      c += deleting ? -1 : 1;
      out.textContent = word.slice(0, c);

      var wait = deleting ? 42 : 78;
      if (!deleting && c === word.length) { deleting = true; wait = 1500; }
      else if (deleting && c === 0) { deleting = false; w = (w + 1) % words.length; wait = 320; }
      setTimeout(tick, wait);
    })();
  }

  /* ----------------------------------------------------------------- tilt */
  function tilt() {
    if (!fine || reduced) return;
    $$("[data-tilt]").forEach(function (card) {
      var maxDeg = parseFloat(card.getAttribute("data-tilt")) || 6;
      var rx = 0, ry = 0, trx = 0, try_ = 0, active = false;

      card.addEventListener("pointerenter", function () { active = true; loop(); });
      card.addEventListener("pointermove", function (e) {
        var b = card.getBoundingClientRect();
        var px = (e.clientX - b.left) / b.width - 0.5;
        var py = (e.clientY - b.top) / b.height - 0.5;
        try_ = px * maxDeg * 2;
        trx = -py * maxDeg * 2;
        card.style.setProperty("--mx", ((px + 0.5) * 100).toFixed(1) + "%");
        card.style.setProperty("--my", ((py + 0.5) * 100).toFixed(1) + "%");
      });
      card.addEventListener("pointerleave", function () { trx = 0; try_ = 0; active = false; });

      function loop() {
        rx = lerp(rx, trx, 0.14);
        ry = lerp(ry, try_, 0.14);
        card.style.transform =
          "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
        if (active || Math.abs(rx) > 0.05 || Math.abs(ry) > 0.05) raf(loop);
        else card.style.transform = "";
      }
    });
  }

  /* ------------------------------------------------------------- magnetic */
  function magnetic() {
    if (!fine || reduced) return;
    $$("[data-magnetic]").forEach(function (el) {
      var pull = parseFloat(el.getAttribute("data-magnetic")) || 0.28;
      el.addEventListener("pointermove", function (e) {
        var b = el.getBoundingClientRect();
        var x = (e.clientX - b.left - b.width / 2) * pull;
        var y = (e.clientY - b.top - b.height / 2) * pull;
        el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* -------------------------------------------------------------- ripple */
  function ripple() {
    $$("[data-ripple]").forEach(function (el) {
      el.addEventListener("pointerdown", function (e) {
        var b = el.getBoundingClientRect();
        var span = document.createElement("span");
        var d = Math.max(b.width, b.height);
        span.className = "ripple";
        span.style.width = span.style.height = d + "px";
        span.style.left = (e.clientX - b.left - d / 2) + "px";
        span.style.top = (e.clientY - b.top - d / 2) + "px";
        el.appendChild(span);
        setTimeout(function () { if (span.parentNode) span.parentNode.removeChild(span); }, 640);
      });
    });
  }

  /* ---------------------------------------------------------- copy email */
  function copyEmail() {
    var btn = $("#copyEmail");
    if (!btn) return;
    var state = $("#copyState");
    var mail = btn.getAttribute("data-email") || "";

    btn.addEventListener("click", function () {
      function done(ok) {
        if (!state) return;
        state.textContent = ok ? "Copied to clipboard" : "Press Ctrl+C to copy";
        state.classList.add("is-on");
        setTimeout(function () { state.classList.remove("is-on"); }, 2400);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(mail).then(function () { done(true); }, function () { done(false); });
      } else {
        var ta = document.createElement("textarea");
        ta.value = mail;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
        document.body.removeChild(ta);
        done(ok);
      }
    });
  }

  /* ------------------------------------------------------------- to top */
  function toTop() {
    var btn = $("#toTop");
    if (!btn) return;
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      raf(function () {
        btn.classList.toggle("is-shown", window.scrollY > window.innerHeight * 0.6);
        ticking = false;
      });
    }, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    });
  }

  /* ------------------------------------------------ reels: play in view */
  function reels() {
    var vids = $$("video[data-autoplay]");
    if (!vids.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.35 });
    vids.forEach(function (v) { io.observe(v); });
  }

  /* ---------------------------------------------------------------- boot */
  function boot() {
    [loader, progress, nav, reveal, rings, typing, tilt, magnetic, ripple,
     copyEmail, toTop, reels, particles, spotlight, cursor, smoothScroll]
      .forEach(function (mod) {
        try { mod(); } catch (err) {
          if (window.console && console.warn) console.warn("[nevin] " + mod.name + " failed:", err);
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
