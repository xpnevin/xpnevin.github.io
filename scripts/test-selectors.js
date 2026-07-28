/* Cross-reference audit.
   1. Every selector content.js queries must exist in index.html.
   2. Every CSS class used by admin.html / admin.js must be defined in CSS.
   3. Every media path referenced by content.json must exist on disk.
   Run with: node scripts/test-selectors.js */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let pass = 0;
const failures = [];
const ok = (l, c, e) => c ? pass++ : failures.push(l + (e ? "  →  " + e : ""));

/* ---- 1. content.js selectors resolve against index.html ------------------ */
{
  const doc = new JSDOM(read("index.html")).window.document;
  const src = read("assets/js/content.js");

  // Pull the literal selectors passed to $() and $$(). Skip any that are
  // string-concatenated at runtime — those are covered explicitly below.
  const selectors = new Set();
  const re = /\$\$?\(\s*"([^"]+)"\s*(\)|,)/g;
  let m;
  while ((m = re.exec(src))) selectors.add(m[1]);

  // Built at runtime from a section id.
  ["about", "skills", "work", "accounts", "contact"].forEach((id) => {
    selectors.add(`#${id} .section__head`);
  });

  const skip = new Set(["[data-reveal]"]); // presence varies after rebuild
  selectors.forEach((sel) => {
    if (skip.has(sel)) return;
    let found;
    try { found = doc.querySelector(sel); } catch (err) {
      failures.push(`invalid selector ${sel}: ${err.message}`);
      return;
    }
    ok(`selector resolves: ${sel}`, !!found);
  });

  // Structural expectations the hydrator relies on.
  ok("about card has a chiplist", !!doc.querySelector(".about__card .chiplist"));
  ok("two about panels", doc.querySelectorAll(".about__panel").length === 2,
    String(doc.querySelectorAll(".about__panel").length));
  ok("contact card has a factlist", !!doc.querySelector("#contact .contact__card .factlist"));
  ok("two contact labels", doc.querySelectorAll("#contact .contact__label").length === 2,
    String(doc.querySelectorAll("#contact .contact__label").length));
  ok("footer has 2 notes", doc.querySelectorAll(".footer__note").length === 2);
  ok("footer socials end with mailto",
    (doc.querySelector(".footer__socials").lastElementChild.getAttribute("href") || "")
      .startsWith("mailto:"));
  ok("skills grid template has a linearGradient",
    !!doc.querySelector(".skills__grid .skill linearGradient"));
  ok("reel template has a source", !!doc.querySelector(".work__reels source"));
  ok("gallery template has an img", !!doc.querySelector(".work__gallery img"));
  ok("index loads content.js", /assets\/js\/content\.js/.test(read("index.html")));
  ok("index no longer loads main.js directly",
    !/<script[^>]+assets\/js\/main\.js/.test(read("index.html")));
}

/* ---- 2. admin classes are defined --------------------------------------- */
{
  const css = read("assets/css/admin.css") + read("assets/css/style.css");
  const defined = new Set();
  const re = /\.(-?[_a-zA-Z][\w-]*)/g;
  let m;
  while ((m = re.exec(css))) defined.add(m[1]);

  const used = new Set();
  const html = read("admin.html");
  let h;
  const hre = /class="([^"]+)"/g;
  while ((h = hre.exec(html))) h[1].split(/\s+/).filter(Boolean).forEach((c) => used.add(c));

  // Classes created by admin.js via el(tag, cls).
  const js = read("assets/js/admin.js");
  const jre = /el\(\s*"[a-z]+"\s*,\s*"([^"]+)"/g;
  let j;
  while ((j = jre.exec(js))) j[1].split(/\s+/).filter(Boolean).forEach((c) => used.add(c));
  // Classes assigned via .className = "…"
  const cre = /className\s*=\s*"([^"]+)"/g;
  let c2;
  while ((c2 = cre.exec(js))) c2[1].split(/\s+/).filter(Boolean).forEach((c) => used.add(c));

  const ignore = new Set(["is-", "admin"]);
  used.forEach((cls) => {
    if (ignore.has(cls)) return;
    ok(`css defined: .${cls}`, defined.has(cls));
  });

  // State classes toggled at runtime must have rules too.
  ["is-active", "is-authed", "is-on", "is-ok", "is-bad", "is-warn"].forEach((cls) => {
    ok(`state class styled: .${cls}`, defined.has(cls));
  });
}

/* ---- 3. content.json paths exist ---------------------------------------- */
{
  const data = JSON.parse(read("assets/data/content.json"));
  const paths = [];
  data.work.reels.forEach((r) => { paths.push(r.src); paths.push(r.poster); });
  data.work.gallery.forEach((g) => paths.push(g.src));

  paths.filter(Boolean).forEach((p) => {
    ok(`asset exists: ${p}`, fs.existsSync(path.join(ROOT, p)));
  });

  // Data shape the admin form assumes.
  ok("hero.words is an array", Array.isArray(data.hero.words));
  ok("skills have numeric percent",
    data.skills.items.every((s) => typeof s.percent === "number"));
  ok("skills have colours",
    data.skills.items.every((s) => /^#[0-9a-f]{6}$/i.test(s.from) && /^#[0-9a-f]{6}$/i.test(s.to)));
  ok("accounts have urls", data.accounts.items.every((a) => /^https?:\/\//.test(a.url)));
  ok("contact email looks valid", /@/.test(data.contact.email));
  ok("no footer.brand key", !("brand" in data.footer));

  // Admin panes must cover every top-level content key.
  const adminHtml = read("admin.html");
  const panes = new Set(
    Array.from(adminHtml.matchAll(/data-pane="([^"]+)"/g)).map((m) => m[1])
  );
  ["hero", "about", "skills", "work", "accounts", "contact"].forEach((k) => {
    ok(`pane exists for ${k}`, panes.has(k));
  });
  ok("footer editable inside contact pane", /Footer/.test(read("assets/js/admin.js")));
  ok("admin.html is noindex", /noindex/.test(adminHtml));
}

console.log(`\n  ${pass} passed, ${failures.length} failed\n`);
if (failures.length) {
  failures.forEach((f) => console.log("  ✗ " + f));
  console.log("");
  process.exit(1);
}
console.log("  All cross-reference checks passed.\n");
