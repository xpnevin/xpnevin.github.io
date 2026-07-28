/* ==========================================================================
   NEVIN — content hydration
   Reads assets/data/content.json and rewrites the page from it, then boots
   main.js. The HTML shipped in index.html stays as the no-JS / offline
   fallback, so a failed fetch simply leaves the built-in copy on screen.
   ========================================================================== */
(function () {
  "use strict";

  var SOURCE = "assets/data/content.json";
  var BOOT = "assets/js/main.js";
  var TIMEOUT = 2500;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* --------------------------------------------------------------- helpers */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Minimal inline markup: **bold** and *emphasis*. Everything else escaped.
  function rich(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  function text(el, value) {
    if (el && value != null) el.textContent = value;
  }

  function html(el, value) {
    if (el && value != null) el.innerHTML = rich(value);
  }

  function attr(el, name, value) {
    if (el && value != null) el.setAttribute(name, value);
  }

  // Rebuild a list container from `items`, cloning the first child as template.
  function rebuild(container, items, fill) {
    if (!container || !Array.isArray(items)) return;
    var template = container.firstElementChild;
    if (!template) return;

    var frag = document.createDocumentFragment();
    items.forEach(function (item, i) {
      var node = template.cloneNode(true);
      try { fill(node, item, i); } catch (err) { /* skip a bad row, keep the rest */ }
      frag.appendChild(node);
    });
    container.textContent = "";
    container.appendChild(frag);
  }

  // Stagger reveal delays after a rebuild so animation still cascades.
  function stagger(container, step) {
    $$("[data-reveal]", container).forEach(function (el, i) {
      el.setAttribute("data-reveal-delay", String(i * (step || 80)));
    });
  }

  function factlist(container, rows) {
    rebuild(container, rows, function (node, row) {
      text($(".k", node), row.k);
      text($(".v", node), row.v);
    });
  }

  function chiplist(container, chips) {
    rebuild(container, chips, function (node, chip) {
      node.textContent = chip;
    });
  }

  function sectionHead(id, data) {
    if (!data) return;
    var head = $("#" + id + " .section__head");
    if (!head) return;
    text($(".eyebrow", head), data.eyebrow);
    html($(".section__title", head), data.title);
    var lede = $(".section__lede", head);
    if (lede && data.lede != null) lede.textContent = data.lede;
  }

  /* ---------------------------------------------------------------- blocks */

  function hero(d) {
    if (!d) return;
    text($(".hero__badge"), d.badge);
    text($(".hero__name"), d.name);
    text($(".footer__brand"), d.name);

    var typed = $("#typed");
    if (typed && Array.isArray(d.words) && d.words.length) {
      typed.setAttribute("data-words", JSON.stringify(d.words));
      text($(".typed-text", typed), d.words[0]);
    }

    text($(".hero__lede"), d.lede);

    rebuild($(".hero__stats"), d.stats, function (node, stat) {
      text($(".stat__num", node), stat.num);
      text($(".stat__label", node), stat.label);
    });
  }

  function about(d) {
    if (!d) return;
    sectionHead("about", d);

    var card = $(".about__card");
    if (card && Array.isArray(d.paras)) {
      var chips = $(".chiplist", card);
      $$("p", card).forEach(function (p) { p.remove(); });
      d.paras.slice().reverse().forEach(function (copy) {
        var p = document.createElement("p");
        p.innerHTML = rich(copy);
        card.insertBefore(p, card.firstChild);
      });
      chiplist(chips, d.chips);
    }

    var panels = $$(".about__panel");
    if (panels[0]) {
      text($("h3", panels[0]), d.glanceTitle);
      factlist($(".factlist", panels[0]), d.glance);
    }
    if (panels[1]) {
      text($("h3", panels[1]), d.toolkitTitle);
      chiplist($(".chiplist", panels[1]), d.toolkit);
    }
  }

  function skills(d) {
    if (!d) return;
    sectionHead("skills", d);

    rebuild($(".skills__grid"), d.items, function (node, item, i) {
      var ring = $(".ring", node);
      var pct = Math.max(0, Math.min(100, Number(item.percent) || 0));

      if (ring) {
        ring.setAttribute("data-ring", String(pct));
        ring.setAttribute("aria-label", (item.name || "") + " proficiency: " + pct + " percent");

        // Each ring needs its own gradient id or they all share the first one.
        var id = "ringgrad" + i;
        var grad = $("linearGradient", ring);
        if (grad) {
          grad.setAttribute("id", id);
          var stops = $$("stop", grad);
          if (stops[0] && item.from) stops[0].setAttribute("stop-color", item.from);
          if (stops[1] && item.to) stops[1].setAttribute("stop-color", item.to);
        }
        attr($("circle.ring__bar", ring), "stroke", "url(#" + id + ")");
        text($(".ring__value b", ring), "0");
      }

      text($(".skill__name", node), item.name);
      text($(".skill__note", node), item.note);
    });

    stagger($(".skills__grid"), 90);
  }

  function work(d) {
    if (!d) return;
    sectionHead("work", d);

    rebuild($(".work__reels"), d.reels, function (node, reel) {
      var video = $("video", node);
      if (video) {
        attr(video, "poster", reel.poster);
        var src = $("source", video);
        if (src && reel.src) src.setAttribute("src", reel.src);
      }
      text($(".reel__meta h3", node), reel.title);
      text($(".reel__meta span", node), reel.tag);
    });
    stagger($(".work__reels"), 110);

    rebuild($(".work__gallery"), d.gallery, function (node, shot) {
      var img = $("img", node);
      attr(img, "src", shot.src);
      attr(img, "alt", shot.alt || "");
    });
    stagger($(".work__gallery"), 70);
  }

  function accounts(d) {
    if (!d) return;
    sectionHead("accounts", d);

    rebuild($(".accounts__grid"), d.items, function (node, acc) {
      text($(".account__role", node), acc.role);
      text($(".account__handle", node), acc.handle);
      text($(".account__desc", node), acc.desc);
      attr($(".account__link", node), "href", acc.url);
    });
    stagger($(".accounts__grid"), 90);

    // Footer socials mirror the accounts flagged for it, plus the mail link.
    var socials = $(".footer__socials");
    if (!socials || !Array.isArray(d.items)) return;
    var mail = socials.lastElementChild;
    var shown = d.items.filter(function (a) { return a.footer !== false; });

    rebuild(socials, shown, function (node, acc) {
      attr(node, "href", acc.url);
      attr(node, "aria-label", "Instagram — " + (acc.handle || ""));
    });
    if (mail) socials.appendChild(mail);
  }

  function contact(d) {
    if (!d) return;
    sectionHead("contact", d);

    if (d.email) {
      var mailto = "mailto:" + d.email;
      text($(".contact__email"), d.email);
      attr($(".contact__email"), "href", mailto);
      $$('.footer__socials a[href^="mailto:"]').forEach(function (a) {
        a.setAttribute("href", mailto);
      });
      $$('#contact a[href^="mailto:"]').forEach(function (a) {
        a.setAttribute("href", mailto);
      });
      attr($("#copyEmail"), "data-email", d.email);
    }

    var labels = $$("#contact .contact__label");
    if (labels[1]) labels[1].textContent = d.turnaroundTitle || labels[1].textContent;
    factlist($("#contact .contact__card .factlist"), d.turnaround);

    var hint = $(".form-shell__hint");
    if (hint) {
      text($("span", hint), d.formLabel);
      attr($("a", hint), "href", d.formUrl);
    }
    if (d.formUrl) {
      var frame = $(".form-shell iframe");
      if (frame) {
        var sep = d.formUrl.indexOf("?") === -1 ? "?" : "&";
        frame.setAttribute("src", d.formUrl + sep + "embedded=true");
      }
    }
  }

  // The footer wordmark mirrors hero.name — one field, one source of truth.
  function footer(d) {
    if (!d) return;
    var notes = $$(".footer__note");
    if (notes[0]) notes[0].textContent = d.tagline || notes[0].textContent;
    if (notes[1] && d.credit) {
      notes[1].innerHTML = esc(d.credit).replace(/❤/, '<span class="heart">❤</span>');
    }
  }

  /* ------------------------------------------------------------------ boot */

  function apply(data) {
    [
      [hero, data.hero], [about, data.about], [skills, data.skills],
      [work, data.work], [accounts, data.accounts], [contact, data.contact],
      [footer, data.footer]
    ].forEach(function (pair) {
      try { pair[0](pair[1]); } catch (err) {
        if (window.console && console.warn) console.warn("[nevin] hydrate failed:", err);
      }
    });
  }

  function start() {
    var script = document.createElement("script");
    script.src = BOOT;
    document.body.appendChild(script);
  }

  function load() {
    if (!window.fetch) { start(); return; }

    var done = false;
    function finish(data) {
      if (done) return;
      done = true;
      if (data) apply(data);
      start();
    }

    // main.js must boot even if the JSON is slow, missing or malformed.
    setTimeout(function () { finish(null); }, TIMEOUT);

    fetch(SOURCE, { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(finish)
      .catch(function () { finish(null); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load, { once: true });
  } else {
    load();
  }
})();
