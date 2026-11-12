/* NEVIN — small, purposeful interactions. Static, dependency-free, progressively enhanced. */
(function () {
  "use strict";
  var doc = document;
  var $ = function (selector, context) {
    return (context || doc).querySelector(selector);
  };
  var $$ = function (selector, context) {
    return Array.from((context || doc).querySelectorAll(selector));
  };
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var scrollBehavior = function () {
    return reducedMotion.matches ? "auto" : "smooth";
  };

  function pageChrome() {
    var fill = $("#progressFill");
    var queued = false;
    var limit = 1;
    function measure() {
      limit = Math.max(
        1,
        doc.documentElement.scrollHeight - window.innerHeight,
      );
      paint();
    }
    function paint() {
      queued = false;
      if (fill)
        fill.style.transform =
          "scaleX(" + Math.min(1, Math.max(0, window.scrollY / limit)) + ")";
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!queued) {
          queued = true;
          window.requestAnimationFrame(paint);
        }
      },
      { passive: true },
    );
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("load", measure, { once: true });
    if ("ResizeObserver" in window)
      new ResizeObserver(measure).observe(doc.body);
    measure();

    if (!("IntersectionObserver" in window)) return;
    var links = $$(".nav__link");
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (link) {
            if (link.hash === "#" + entry.target.id)
              link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: 0 },
    );
    $$("main > section[id]").forEach(function (section) {
      observer.observe(section);
    });
  }

  function mobileMenu() {
    var button = $("#burger");
    var nav = $("#nav");
    var header = $("#topbar");
    if (!button || !nav) return;
    var media = window.matchMedia("(max-width: 900px)");
    var main = $("main");
    var footer = $(".footer");

    function setOpen(open, restoreFocus) {
      doc.body.classList.toggle("nav-open", open);
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (main) main.inert = open;
      if (footer) footer.inert = open;
      if (open) $("a", nav).focus();
      else if (restoreFocus) button.focus();
    }
    button.addEventListener("click", function () {
      setOpen(button.getAttribute("aria-expanded") !== "true", true);
    });
    $$("a", header).forEach(function (link) {
      link.addEventListener("click", function () {
        if (!doc.body.classList.contains("nav-open")) return;
        setOpen(false, false);
        if (link.hash) {
          var target = doc.getElementById(link.hash.slice(1));
          if (target) {
            target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
          }
        }
      });
    });
    doc.addEventListener("keydown", function (event) {
      if (!doc.body.classList.contains("nav-open")) return;
      if (event.key === "Escape") {
        setOpen(false, true);
        return;
      }
      if (event.key !== "Tab") return;
      var items = $$("a[href], button:not(:disabled)", header).filter(
        function (element) {
          return element.getClientRects().length > 0;
        },
      );
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    var resize = function () {
      if (!media.matches) setOpen(false, false);
    };
    if (media.addEventListener) media.addEventListener("change", resize);
    else media.addListener(resize);
  }

  function reveals() {
    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -20px 0px" },
    );
    $$("[data-reveal]").forEach(function (element) {
      observer.observe(element);
    });
  }

  function services() {
    var items = $$(".service");
    items.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (item.open)
          items.forEach(function (other) {
            if (other !== item) other.open = false;
          });
      });
    });
    $$("[data-service]").forEach(function (link) {
      link.addEventListener("click", function () {
        var select = $("#commissionService");
        if (select) {
          select.value = link.dataset.service;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    });
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        /* Try the legacy fallback. */
      }
    }
    var field = doc.createElement("textarea");
    var focused = doc.activeElement;
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    doc.body.appendChild(field);
    field.select();
    var copied = false;
    try {
      copied = doc.execCommand("copy");
    } catch (error) {
      /* A manual copy remains possible. */
    }
    field.remove();
    if (focused && focused.focus) focused.focus({ preventScroll: true });
    return copied;
  }

  function contact() {
    var copy = $("#copyEmail");
    if (copy)
      copy.addEventListener("click", async function () {
        var ok = await copyText(copy.dataset.email);
        $("#copyState").textContent = ok
          ? "Copied. Good things start with a hello."
          : "Copy isn’t available here. Select xpnevin@gmail.com to copy it manually.";
      });

    var form = $("#commissionForm");
    if (!form) return;
    var date = $("#commissionDate");
    var today = new Date();
    date.min =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");
    var preview = $("#enquiryPreview");
    var status = $("#commissionFormStatus");
    var draft = "";
    var defaultStatus = status.textContent;
    function invalidateDraft() {
      if (preview.hidden) return;
      preview.hidden = true;
      draft = "";
      status.textContent =
        "Your details changed. Prepare your enquiry again to update the draft.";
    }
    form.addEventListener("input", invalidateDraft);
    form.addEventListener("change", invalidateDraft);
    form.addEventListener("reset", function () {
      preview.hidden = true;
      draft = "";
      status.textContent = defaultStatus;
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      var service = $("#commissionService").value;
      var name = $("#commissionName").value.trim();
      var details = $("#commissionDetails").value.trim();
      var dateLabel = new Date(date.value + "T12:00:00").toLocaleDateString(
        "en-GB",
        { day: "numeric", month: "long", year: "numeric" },
      );
      var lines = [
        "Hi Nevin,",
        "",
        "I’d like to enquire about " + service + ".",
        "Preferred date or deadline: " + dateLabel,
      ];
      if (name) lines.push("Name: " + name);
      lines.push(
        "",
        "Project details:",
        details || "I can share more information in reply.",
        "",
        "Thanks," + (name ? "\n" + name : ""),
      );
      draft = lines.join("\n");
      $("#enquiryText").textContent = draft;
      var link = $("#enquiryEmail");
      link.href =
        "mailto:xpnevin@gmail.com?subject=" +
        encodeURIComponent("Project enquiry — " + service) +
        "&body=" +
        encodeURIComponent(draft);
      preview.hidden = false;
      status.textContent =
        "Your draft is ready below. Open your email app to review and send, or copy the enquiry. Nothing has been sent yet.";
      link.focus({ preventScroll: true });
      preview.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
    });
    $("#copyBrief").addEventListener("click", async function () {
      if (!draft) return;
      var ok = await copyText(draft);
      status.textContent = ok
        ? "Enquiry copied. Paste it into an email to xpnevin@gmail.com when you’re ready."
        : "Copy isn’t available here. Select the draft text above to copy it manually.";
    });
  }

  function colourLab() {
    var lab = $("#colourLab");
    if (!lab) return;
    var labels = {
      cinema: "01 — CINEMA",
      golden: "02 — GOLDEN",
      cobalt: "03 — COBALT",
      mono: "04 — MONO",
    };
    var choices = $$("[data-look-choice]", lab);
    var intensity = $("#labIntensity");
    var compare = $("#labCompare");
    var comparison = $("#labComparison");
    function setLook(look, announce) {
      if (!Object.prototype.hasOwnProperty.call(labels, look)) return;
      lab.dataset.look = look;
      choices.forEach(function (choice) {
        choice.setAttribute(
          "aria-pressed",
          String(choice.dataset.lookChoice === look),
        );
      });
      $("#labLookBadge").textContent = labels[look];
      if (announce)
        $("#labStatus").textContent =
          look.charAt(0).toUpperCase() + look.slice(1) + " look selected.";
    }
    function setIntensity() {
      var value = Math.max(0, Math.min(100, Number(intensity.value)));
      lab.style.setProperty("--intensity", String(value / 100));
      $("#labIntensityValue").textContent = value + "%";
    }
    function setCompare() {
      var value = Math.max(0, Math.min(100, Number(compare.value)));
      comparison.style.setProperty("--split", value + "%");
      compare.setAttribute(
        "aria-valuetext",
        value + " percent original, " + (100 - value) + " percent graded",
      );
    }
    choices.forEach(function (choice) {
      choice.addEventListener("click", function () {
        setLook(choice.dataset.lookChoice, true);
      });
    });
    intensity.addEventListener("input", setIntensity);
    compare.addEventListener("input", setCompare);
    var pointer = null;
    function pointerValue(event) {
      var rect = compare.getBoundingClientRect();
      compare.value = String(
        Math.round(
          Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) *
            100,
        ),
      );
      setCompare();
    }
    compare.addEventListener("pointerdown", function (event) {
      if (
        !event.isPrimary ||
        (event.pointerType === "mouse" && event.button !== 0)
      )
        return;
      event.preventDefault();
      pointer = event.pointerId;
      compare.focus({ preventScroll: true });
      compare.setPointerCapture(pointer);
      pointerValue(event);
    });
    compare.addEventListener("pointermove", function (event) {
      if (event.pointerId === pointer) pointerValue(event);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(
      function (type) {
        compare.addEventListener(type, function () {
          pointer = null;
        });
      },
    );
    $("#labReset").addEventListener("click", function () {
      setLook("cinema", false);
      intensity.value = "75";
      compare.value = "50";
      setIntensity();
      setCompare();
      $("#labStatus").textContent =
        "Fresh start. Cinema look, 75 percent strength.";
    });
    setLook(lab.dataset.look, false);
    setIntensity();
    setCompare();
  }

  function visualNotebook() {
    var dialog = $("#studyDialog");
    var triggers = $$("[data-gallery]");
    if (!dialog || typeof dialog.showModal !== "function") {
      triggers.forEach(function (button) {
        button.hidden = true;
      });
      return;
    }
    var studies = [
      {
        src: "assets/img/coast-study.webp",
        title: "The long way home.",
        alt: "A winding road across a golden coastal headland above deep blue ocean.",
        description:
          "Light, land and a little wanderlust. An AI-generated art-direction study, not client work.",
        width: 1568,
        height: 665,
      },
      {
        src: "assets/img/night-study.webp",
        title: "After the rain.",
        alt: "A lone figure with an umbrella on a blue city street, with reflections of red neon.",
        description:
          "Blue hour, red light, quiet motion. An AI-generated art-direction study, not client work.",
        width: 1200,
        height: 896,
      },
      {
        src: "assets/img/light-study.webp",
        title: "A study in sunlight.",
        alt: "Sculptural terracotta stairs and a blue door, lit by warm Mediterranean sunshine.",
        description:
          "Warmth, shape and the space between. An AI-generated art-direction study, not client work.",
        width: 1200,
        height: 896,
      },
    ];
    var current = 0;
    var trigger = null;
    var overflow = "";
    var image = $("#studyImage");
    $("#studyCount").setAttribute("aria-live", "polite");
    function paint(index) {
      current = (index + studies.length) % studies.length;
      var study = studies[current];
      image.src = study.src;
      image.alt = study.alt;
      image.width = study.width;
      image.height = study.height;
      $("#studyTitle").textContent = study.title;
      $("#studyDescription").textContent = study.description;
      $("#studyCount").textContent =
        String(current + 1).padStart(2, "0") + " / 03";
    }
    triggers.forEach(function (button) {
      button.addEventListener("click", function () {
        trigger = button;
        paint(Number(button.dataset.gallery));
        overflow = doc.body.style.overflow;
        doc.body.style.overflow = "hidden";
        dialog.showModal();
      });
    });
    $("#studyClose").addEventListener("click", function () {
      dialog.close();
    });
    $("#studyPrev").addEventListener("click", function () {
      paint(current - 1);
    });
    $("#studyNext").addEventListener("click", function () {
      paint(current + 1);
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        paint(current - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        paint(current + 1);
      }
    });
    dialog.addEventListener("close", function () {
      doc.body.style.overflow = overflow;
      if (trigger) trigger.focus({ preventScroll: true });
    });
  }

  [
    pageChrome,
    mobileMenu,
    reveals,
    services,
    contact,
    colourLab,
    visualNotebook,
  ].forEach(function (init) {
    try {
      init();
    } catch (error) {
      console.warn("[nevin] " + init.name + " could not start:", error);
    }
  });
})();
