/* ==========================================================================
   NEVIN — interaction layer
   Dependency-free. Every module is isolated in its own try/catch, so one
   failure cannot take the page down. Nothing here hides content: CSS only
   opts into the reveal animation when .js is present on <html>.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var body = doc.body;
  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = reduceQuery.matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var raf = window.requestAnimationFrame.bind(window);

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ------------------------------------------------- shared scroll pipeline */
  /* One scroll listener, one rAF per frame, shared by every module below. */
  var scrollFns = [];
  var scrollQueued = false;

  function onScroll(fn) { scrollFns.push(fn); }

  function flush() {
    scrollQueued = false;
    var y = window.pageYOffset;
    for (var i = 0; i < scrollFns.length; i++) {
      try { scrollFns[i](y); } catch (err) { /* one module cannot break the rest */ }
    }
  }

  function requestScroll() {
    if (!scrollQueued) { scrollQueued = true; raf(flush); }
  }

  /* Same idea for pointer moves: at most one read/write per frame. */
  function onPointerFrame(el, fn) {
    var queued = false;
    var last = null;

    el.addEventListener("pointermove", function (e) {
      last = e;
      if (queued) return;
      queued = true;
      raf(function () { queued = false; fn(last); });
    }, { passive: true });
  }

  window.addEventListener("scroll", requestScroll, { passive: true });
  window.addEventListener("resize", requestScroll, { passive: true });

  /* ------------------------------------------- top bar, progress, back to top */
  function chrome() {
    var bar = $("#topbar");
    var fill = $("#progressFill");
    var top = $("#toTop");

    function maxScroll() {
      return Math.max(1, doc.documentElement.scrollHeight - window.innerHeight);
    }

    onScroll(function (y) {
      /* Read first, then write: measuring after a class change would force a
         synchronous layout on every scroll frame. */
      var max = maxScroll();
      var vh = window.innerHeight;

      if (bar) bar.classList.toggle("is-stuck", y > 8);
      if (fill) fill.style.transform = "scaleX(" + Math.min(1, y / max).toFixed(4) + ")";
      if (top) top.classList.toggle("is-shown", y > vh * 0.7);
    });

    if (top) {
      top.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      });
    }

    requestScroll();
  }

  /* ------------------------------------------------------- active nav link */
  function spy() {
    var links = $$(".nav__link");
    if (!links.length || !("IntersectionObserver" in window)) return;

    var byId = {};
    var sections = [];

    links.forEach(function (link) {
      var el = $(link.getAttribute("href"));
      if (el) { byId[el.id] = link; sections.push(el); }
    });
    if (!sections.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var active = byId[entry.target.id];
        if (!active) return;
        links.forEach(function (l) { l.removeAttribute("aria-current"); });
        active.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

    sections.forEach(function (s) { io.observe(s); });

    onScroll(function (y) {
      if (y < 240) links.forEach(function (l) { l.removeAttribute("aria-current"); });
    });
  }

  /* ------------------------------------------------------------ mobile menu */
  function menu() {
    var btn = $("#burger");
    var nav = $("#nav");
    if (!btn || !nav) return;

    var links = $$(".nav__link", nav);
    var topbar = $(".topbar");
    var isMobile = window.matchMedia("(max-width: 820px)");

    /* Only what a sighted keyboard user can actually see, in DOM order:
       brand, nav links, the header CTA and the burger itself. */
    function focusables() {
      if (!topbar) return [btn];
      return $$("a[href], button", topbar).filter(function (el) {
        return el.offsetParent !== null;
      });
    }

    function setOpen(open) {
      body.classList.toggle("nav-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (open && links[0]) links[0].focus();
    }

    btn.addEventListener("click", function () {
      setOpen(!body.classList.contains("nav-open"));
    });

    links.forEach(function (link) {
      link.addEventListener("click", function () {
        if (body.classList.contains("nav-open")) setOpen(false);
      });
    });

    doc.addEventListener("keydown", function (e) {
      if (!body.classList.contains("nav-open")) return;

      if (e.key === "Escape") {
        setOpen(false);
        btn.focus();
        return;
      }

      if (e.key === "Tab") {
        var items = focusables();
        if (items.length < 2) return;
        var first = items[0];
        var last = items[items.length - 1];

        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    var onChange = function (e) {
      if (!e.matches && body.classList.contains("nav-open")) setOpen(false);
    };
    if (isMobile.addEventListener) isMobile.addEventListener("change", onChange);
    else if (isMobile.addListener) isMobile.addListener(onChange);
  }

  /* --------------------------------------------------------- scroll reveal */
  function reveal() {
    var items = $$("[data-reveal]");
    if (!items.length) return;

    items.forEach(function (el) {
      var delay = el.getAttribute("data-d");
      if (delay) el.style.setProperty("--d", delay + "ms");
    });

    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        obs.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

    items.forEach(function (el) { io.observe(el); });

    /* One-shot safety net: anything already on screen at load is shown.
       Deliberately not a timer that reveals the whole document. */
    function settle() {
      items.forEach(function (el) {
        if (el.classList.contains("is-in")) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-in");
      });
    }

    if (doc.readyState === "complete") setTimeout(settle, 200);
    else window.addEventListener("load", function () { setTimeout(settle, 200); }, { once: true });
  }

  /* ------------------------------------------------------------- counters */
  function counters() {
    var nums = $$("[data-count]");
    if (!nums.length) return;

    function finalValue(el) { el.textContent = el.getAttribute("data-count"); }

    if (reduced || !("IntersectionObserver" in window)) {
      nums.forEach(finalValue);
      return;
    }

    function countUp(el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      var start = null;
      var duration = 900;

      function step(now) {
        if (start === null) start = now;
        var p = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased));
        if (p < 1) raf(step);
        else finalValue(el);
      }
      raf(step);
    }

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        countUp(entry.target);
      });
    }, { threshold: 0.6 });

    nums.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------- copy address */
  function copyEmail() {
    var btn = $("#copyEmail");
    if (!btn) return;

    var state = $("#copyState");
    var mail = btn.getAttribute("data-email") || "";
    var timer;

    function say(message) {
      if (!state) return;
      state.textContent = message;
      state.classList.add("is-on");
      clearTimeout(timer);
      timer = setTimeout(function () { state.classList.remove("is-on"); }, 4000);
    }

    function manualFallback() {
      /* Keep the field alive and selected so the keyboard shortcut really works. */
      var field = doc.createElement("textarea");
      field.value = mail;
      field.setAttribute("readonly", "");
      field.setAttribute("aria-hidden", "true");
      field.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0";
      doc.body.appendChild(field);
      field.select();
      if (field.setSelectionRange) field.setSelectionRange(0, mail.length);

      var copied = false;
      try { copied = doc.execCommand("copy"); } catch (err) { copied = false; }

      if (copied) {
        doc.body.removeChild(field);
        say("Copied — " + mail);
      } else {
        say("Your browser blocked the copy — the address is selected, press Ctrl / ⌘ + C");
        setTimeout(function () { if (field.parentNode) field.parentNode.removeChild(field); }, 8000);
      }
    }

    btn.addEventListener("click", function () {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(mail).then(function () {
          say("Copied — " + mail);
        }, manualFallback);
      } else {
        manualFallback();
      }
    });
  }

  /* ---------------------------------------------------------- magnetic CTA */
  function magnetic() {
    if (!fine || reduced) return;

    $$("[data-magnetic]").forEach(function (el) {
      var strength = parseFloat(el.getAttribute("data-magnetic")) || 0.28;

      onPointerFrame(el, function (e) {
        var b = el.getBoundingClientRect();
        var dx = (e.clientX - (b.left + b.width / 2)) * strength;
        var dy = (e.clientY - (b.top + b.height / 2)) * strength;
        el.style.transform = "translate3d(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px,0)";
      });

      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ------------------------------------------------------- card light sweep */
  function cardGlow() {
    if (!fine || reduced) return;

    $$(".card, .account").forEach(function (card) {
      onPointerFrame(card, function (e) {
        var b = card.getBoundingClientRect();
        card.style.setProperty("--mx", (((e.clientX - b.left) / b.width) * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (((e.clientY - b.top) / b.height) * 100).toFixed(1) + "%");
      });
    });
  }

  /* ----------------------------------------------------------------- ripple */
  function ripple() {
    $$("[data-ripple]").forEach(function (el) {
      el.addEventListener("pointerdown", function (e) {
        var b = el.getBoundingClientRect();
        var size = Math.max(b.width, b.height);
        var dot = doc.createElement("span");

        dot.className = "ripple";
        dot.style.width = dot.style.height = size + "px";
        dot.style.left = (e.clientX - b.left - size / 2) + "px";
        dot.style.top = (e.clientY - b.top - size / 2) + "px";
        el.appendChild(dot);

        setTimeout(function () { if (dot.parentNode) dot.parentNode.removeChild(dot); }, 650);
      });
    });
  }

  /* -------------------------------------------------------------- timecode */
  function timecode() {
    var cells = [$("#tcBar"), $("#tcSeq"), $("#tcFoot")].filter(Boolean);
    if (!cells.length) return;

    var fps = 24;
    var started = performance.now();

    function pad(n) { return n < 10 ? "0" + n : String(n); }

    function paint() {
      var t = (performance.now() - started) / 1000;
      var stamp = pad(Math.floor(t / 3600) % 24) + ":" +
                  pad(Math.floor(t / 60) % 60) + ":" +
                  pad(Math.floor(t) % 60) + ":" +
                  pad(Math.floor(t * fps) % fps);
      for (var i = 0; i < cells.length; i++) cells[i].textContent = stamp;
    }

    paint();
    if (reduced) return; /* a still readout is fine for the motion-sensitive */

    /* 4 Hz is enough for a decorative clock and costs almost nothing. */
    window.setInterval(function () { if (!doc.hidden) paint(); }, 250);
  }

  /* ------------------------------------------------------------------- year */
  function year() {
    var el = $("#year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------------------------- boot */
  function boot() {
    [chrome, spy, menu, reveal, counters, copyEmail, magnetic,
     cardGlow, ripple, timecode, year].forEach(function (module) {
      try { module(); } catch (err) {
        if (window.console && console.warn) console.warn("[nevin] " + module.name + " failed:", err);
      }
    });
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
