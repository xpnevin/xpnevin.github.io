/* NEVIN — Corrra rebuild — minimal interactions */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Mobile menu */
  (function () {
    var btn = $("#menuToggle");
    var nav = $("#mobileNav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      btn.setAttribute("aria-expanded", String(open));
      if (open) { nav.hidden = false; } else { nav.hidden = true; }
    });
    $$("a", nav).forEach(function (a) {
      a.addEventListener("click", function () {
        document.body.classList.remove("menu-open");
        btn.setAttribute("aria-expanded", "false");
        nav.hidden = true;
      });
    });
  })();

  /* Reveal on scroll */
  (function () {
    var els = $$("[data-reveal]");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-revealed"); });
      return;
    }
    // Respect delay attribute
    els.forEach(function (el) {
      var d = el.getAttribute("data-reveal-delay");
      if (d) el.style.setProperty("--delay", d + "ms");
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-revealed");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* Copy email */
  (function () {
    var btn = $("#copyEmail");
    var state = $("#copyState");
    if (!btn) return;
    var email = btn.getAttribute("data-email") || "xpnevin@gmail.com";
    btn.addEventListener("click", function () {
      var done = function () {
        if (state) {
          state.textContent = "Copied to clipboard ✓";
          state.classList.add("is-on");
          setTimeout(function () { state.classList.remove("is-on"); }, 2200);
        }
        var old = btn.textContent;
        btn.textContent = "Copied ✓";
        setTimeout(function () { btn.textContent = old; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done, function () { fallback(); });
      } else { fallback(); }
      function fallback () {
        var t = document.createElement("textarea");
        t.value = email; t.setAttribute("readonly", "");
        t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t); t.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        t.remove();
      }
    });
  })();

  /* Video autoplay on view + play toggle */
  (function () {
    var videos = $$("video[data-autoplay]");
    if (!videos.length) return;

    videos.forEach(function (v) {
      // Start muted, loop already set
      v.muted = true;
      // Keep poster until user interacts
      var card = v.closest(".reel-card");
      var playBtn = card ? $(".reel-card__play", card) : null;
      if (playBtn) {
        playBtn.addEventListener("click", function () {
          if (v.paused) {
            v.play().catch(function () {});
            playBtn.style.opacity = "0";
            playBtn.style.pointerEvents = "none";
          } else {
            v.pause();
            playBtn.style.opacity = "";
            playBtn.style.pointerEvents = "";
          }
        });
        v.addEventListener("click", function () {
          if (v.paused) { v.play().catch(function () {}); playBtn.style.opacity = "0"; }
          else { v.pause(); playBtn.style.opacity = ""; }
        });
        v.addEventListener("play", function () {
          playBtn.style.opacity = "0";
          playBtn.style.pointerEvents = "none";
        });
        v.addEventListener("pause", function () {
          playBtn.style.opacity = "";
          playBtn.style.pointerEvents = "";
        });
      }
    });

    if (!("IntersectionObserver" in window)) {
      videos.forEach(function (v) { v.play().catch(function () {}); });
      return;
    }
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          // Don't force play if user paused — just attempt
          // Use a small timeout to avoid autoplay block
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.45 });
    videos.forEach(function (v) { vio.observe(v); });
  })();

  /* Back to top */
  (function () {
    var btn = $("#toTop");
    if (!btn) return;
    var onScroll = function () {
      if (window.scrollY > 600) btn.classList.add("is-shown");
      else btn.classList.remove("is-shown");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  })();

  /* Topbar shadow on scroll */
  (function () {
    var bar = $("#topbar");
    if (!bar) return;
    var onScroll = function () {
      if (window.scrollY > 8) bar.style.boxShadow = "0 1px 0 rgba(0,0,0,.06)";
      else bar.style.boxShadow = "none";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  })();

})();
