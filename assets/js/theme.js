/* Shared, early theme restoration. The new identity opens in paper/light mode;
   an explicit visitor preference always wins, including on the assistant page. */
(function () {
  "use strict";
  var root = document.documentElement;
  var key = "nevin-theme";
  var saved;
  try {
    saved = window.localStorage.getItem(key);
  } catch (error) {
    /* Storage is optional. */
  }
  root.classList.add("js");

  function apply(value) {
    var dark = value === "dark";
    root.setAttribute("data-theme", dark ? "dark" : "light");
    var meta = document.getElementById("themeColor");
    if (meta) meta.setAttribute("content", dark ? "#171915" : "#f5f3ee");
    var toggle = document.getElementById("themeToggle");
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(dark));
      toggle.setAttribute(
        "aria-label",
        dark ? "Switch to light mode" : "Switch to dark mode",
      );
      toggle.setAttribute(
        "title",
        dark ? "Switch to light mode" : "Switch to dark mode",
      );
    }
  }

  apply(saved === "dark" ? "dark" : "light");
  document.addEventListener(
    "DOMContentLoaded",
    function () {
      apply(root.getAttribute("data-theme"));
      var toggle = document.getElementById("themeToggle");
      if (toggle)
        toggle.addEventListener("click", function () {
          var next =
            root.getAttribute("data-theme") === "dark" ? "light" : "dark";
          apply(next);
          try {
            window.localStorage.setItem(key, next);
          } catch (error) {
            /* Works for this visit. */
          }
        });
      var year = document.getElementById("year");
      if (year) year.textContent = String(new Date().getFullYear());
    },
    { once: true },
  );
  window.addEventListener("storage", function (event) {
    if (event.key === key) apply(event.newValue);
  });
})();
