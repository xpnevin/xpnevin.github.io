/* Hydration test: load index.html in jsdom, run content.js against a mutated
   copy of content.json, and assert the DOM reflects the data.
   Run with: node scripts/test-hydration.js   (requires: npm i jsdom --no-save) */

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let pass = 0;
const failures = [];

function ok(label, cond, extra) {
  if (cond) { pass++; return; }
  failures.push(label + (extra ? "  →  " + extra : ""));
}

function eq(label, actual, expected) {
  ok(label, actual === expected, `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

(async function run() {
  const base = JSON.parse(read("assets/data/content.json"));

  // Mutate every area so we can prove each binding is live, not just the
  // static HTML happening to match.
  const data = JSON.parse(JSON.stringify(base));
  data.hero.name = "TESTNAME";
  data.hero.badge = "Badge changed";
  data.hero.lede = "Lede changed";
  data.hero.words = ["Alpha", "Beta"];
  data.hero.stats = [{ num: "9", label: "Nine" }];
  data.about.title = "Plain *fancy* end";
  data.about.paras = ["One **bold** here", "Two", "Three", "Four"];
  data.about.chips = ["c1", "c2"];
  data.about.glance = [{ k: "GK", v: "GV" }];
  data.about.toolkit = ["t1"];
  data.skills.items = [
    { name: "SkillA", percent: 33, note: "na", from: "#111111", to: "#222222" },
    { name: "SkillB", percent: 77, note: "nb", from: "#333333", to: "#444444" }
  ];
  data.work.reels = [{ src: "assets/videos/x.mp4", poster: "assets/photos/p.jpg", title: "R1", tag: "T1" }];
  data.work.gallery = [
    { src: "assets/photos/a.jpg", alt: "alt a" },
    { src: "assets/photos/b.jpg", alt: "alt b" },
    { src: "assets/photos/c.jpg", alt: "alt c" }
  ];
  data.accounts.items = [
    { role: "R1", handle: "@h1", desc: "d1", url: "https://example.com/1", footer: true },
    { role: "R2", handle: "@h2", desc: "d2", url: "https://example.com/2", footer: false }
  ];
  data.contact.email = "changed@example.com";
  data.contact.turnaround = [{ k: "TK", v: "TV" }];
  data.contact.formUrl = "https://forms.example.com/view";
  data.contact.formLabel = "My form";
  delete data.footer.brand;
  data.footer.tagline = "Tagline changed";
  data.footer.credit = "Made with ❤ by Tester";

  const virtualConsole = new VirtualConsole();
  const warnings = [];
  virtualConsole.on("jsdomError", (e) => warnings.push("jsdomError: " + e.message));

  const dom = new JSDOM(read("index.html"), {
    runScripts: "outside-only",
    pretendToBeVisual: true,
    url: "https://xpnevin.github.io/",
    virtualConsole
  });

  const { window } = dom;

  // Stub the platform bits content.js touches.
  window.fetch = (url) => {
    if (String(url).includes("content.json")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
    }
    return Promise.reject(new Error("unexpected fetch " + url));
  };
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));

  // Let content.js append main.js without actually executing it — we are
  // testing hydration here, and main.js only decorates.
  let bootRequested = false;
  const realAppend = window.document.body.appendChild.bind(window.document.body);
  window.document.body.appendChild = function (node) {
    if (node && node.tagName === "SCRIPT" && /main\.js/.test(node.src || "")) {
      bootRequested = true;
      return node;
    }
    return realAppend(node);
  };

  window.eval(read("assets/js/content.js"));
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  await new Promise((r) => setTimeout(r, 60));

  const doc = window.document;
  const $ = (s) => doc.querySelector(s);
  const $$ = (s) => Array.from(doc.querySelectorAll(s));
  const txt = (s) => { const n = $(s); return n ? n.textContent.trim() : null; };

  // ---- hero
  eq("hero name", txt(".hero__name"), "TESTNAME");
  eq("hero badge", txt(".hero__badge"), "Badge changed");
  eq("hero lede", txt(".hero__lede"), "Lede changed");
  eq("typed words attr", $("#typed").getAttribute("data-words"), JSON.stringify(["Alpha", "Beta"]));
  eq("typed initial text", txt("#typed .typed-text"), "Alpha");
  eq("stats count", $$(".hero__stats .stat").length, 1);
  eq("stat num", txt(".hero__stats .stat__num"), "9");
  eq("stat label", txt(".hero__stats .stat__label"), "Nine");

  // ---- about
  eq("about title html", $("#about .section__title").innerHTML.trim(), "Plain <em>fancy</em> end");
  const paras = $$(".about__card p");
  eq("about para count", paras.length, 4);
  eq("about para order", paras.map((p) => p.textContent.trim()).join("|"),
     "One bold here|Two|Three|Four");
  eq("about bold rendered", paras[0].innerHTML.trim(), "One <strong>bold</strong> here");
  ok("chips before paragraphs? no — chiplist stays last",
     $$(".about__card > *").pop().classList.contains("chiplist"),
     "last child is " + $$(".about__card > *").pop().className);
  eq("about chips", $$(".about__card .chiplist .chip").map((c) => c.textContent).join(","), "c1,c2");
  eq("glance rows", $$(".about__panel .factlist li").length, 1);
  eq("glance k", txt(".about__panel .factlist .k"), "GK");
  eq("toolkit chips", $$(".about__panel:last-of-type .chiplist .chip").map((c) => c.textContent).join(","), "t1");

  // ---- skills
  const skills = $$(".skills__grid .skill");
  eq("skill count", skills.length, 2);
  eq("skill 1 name", skills[0].querySelector(".skill__name").textContent, "SkillA");
  eq("skill 1 ring", skills[0].querySelector(".ring").getAttribute("data-ring"), "33");
  eq("skill 2 ring", skills[1].querySelector(".ring").getAttribute("data-ring"), "77");
  // Unique gradient ids are the subtle one — duplicates make every ring cyan.
  const gradIds = skills.map((s) => s.querySelector("linearGradient").id);
  eq("gradient ids unique", new Set(gradIds).size, 2);
  eq("skill 1 stroke ref", skills[0].querySelector("circle.ring__bar").getAttribute("stroke"),
     `url(#${gradIds[0]})`);
  eq("skill 2 stroke ref", skills[1].querySelector("circle.ring__bar").getAttribute("stroke"),
     `url(#${gradIds[1]})`);
  eq("skill 1 stop colour", skills[0].querySelectorAll("stop")[0].getAttribute("stop-color"), "#111111");
  eq("skill 2 stop colour", skills[1].querySelectorAll("stop")[1].getAttribute("stop-color"), "#444444");
  eq("aria label", skills[1].querySelector(".ring").getAttribute("aria-label"),
     "SkillB proficiency: 77 percent");

  // ---- work
  eq("reel count", $$(".work__reels .reel").length, 1);
  eq("reel source", $(".work__reels source").getAttribute("src"), "assets/videos/x.mp4");
  eq("reel poster", $(".work__reels video").getAttribute("poster"), "assets/photos/p.jpg");
  eq("reel title", txt(".work__reels .reel__meta h3"), "R1");
  eq("gallery count", $$(".work__gallery .shot").length, 3);
  eq("gallery 3 src", $$(".work__gallery img")[2].getAttribute("src"), "assets/photos/c.jpg");
  eq("gallery 3 alt", $$(".work__gallery img")[2].getAttribute("alt"), "alt c");

  // ---- accounts
  eq("account count", $$(".accounts__grid .account").length, 2);
  eq("account handle", txt(".accounts__grid .account__handle"), "@h1");
  eq("account link", $(".accounts__grid .account__link").getAttribute("href"), "https://example.com/1");
  // Only footer:true accounts appear, and the mail icon must survive at the end.
  const socials = $$(".footer__socials a");
  eq("footer socials count", socials.length, 2);
  eq("footer social 1", socials[0].getAttribute("href"), "https://example.com/1");
  ok("footer mail last", socials[1].getAttribute("href").startsWith("mailto:"),
     socials[1].getAttribute("href"));

  // ---- contact
  eq("contact email text", txt(".contact__email"), "changed@example.com");
  eq("contact email href", $(".contact__email").getAttribute("href"), "mailto:changed@example.com");
  eq("copy button data", $("#copyEmail").getAttribute("data-email"), "changed@example.com");
  eq("footer mail href", socials[1].getAttribute("href"), "mailto:changed@example.com");
  eq("email button href", $('#contact a.btn[href^="mailto:"]').getAttribute("href"),
     "mailto:changed@example.com");
  eq("turnaround rows", $$("#contact .contact__card .factlist li").length, 1);
  eq("turnaround k", txt("#contact .contact__card .factlist .k"), "TK");
  eq("iframe embedded", $(".form-shell iframe").getAttribute("src"),
     "https://forms.example.com/view?embedded=true");
  eq("form hint label", txt(".form-shell__hint span"), "My form");
  eq("form hint link", $(".form-shell__hint a").getAttribute("href"), "https://forms.example.com/view");

  // ---- footer
  // Footer wordmark mirrors hero.name rather than a second field.
  eq("footer brand follows hero name", txt(".footer__brand"), "TESTNAME");
  eq("footer tagline", $$(".footer__note")[0].textContent.trim(), "Tagline changed");
  ok("footer heart wrapped", /<span class="heart">❤<\/span>/.test($$(".footer__note")[1].innerHTML),
     $$(".footer__note")[1].innerHTML);

  // ---- safety
  ok("main.js boot requested", bootRequested);
  ok("no jsdom errors", warnings.length === 0, warnings.join("; "));

  // XSS: content is data, but it is committed by a token holder — still, no
  // raw HTML should ever execute from a value.
  const dom2 = new JSDOM(read("index.html"), {
    runScripts: "outside-only", url: "https://xpnevin.github.io/", virtualConsole
  });
  const evil = JSON.parse(JSON.stringify(base));
  evil.hero.name = '<img src=x onerror="window.__pwned=1">';
  evil.about.paras = ['<script>window.__pwned=1<\/script>'];
  dom2.window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(evil) });
  dom2.window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  dom2.window.document.body.appendChild = function (n) { return n; };
  dom2.window.eval(read("assets/js/content.js"));
  dom2.window.document.dispatchEvent(new dom2.window.Event("DOMContentLoaded"));
  await new Promise((r) => setTimeout(r, 60));
  ok("no script injected via paragraphs", !dom2.window.__pwned);
  eq("markup escaped in name", dom2.window.document.querySelector(".hero__name").children.length, 0);
  eq("no img element created", dom2.window.document.querySelectorAll(".about__card img").length, 0);

  console.log(`\n  ${pass} passed, ${failures.length} failed\n`);
  if (failures.length) {
    failures.forEach((f) => console.log("  ✗ " + f));
    console.log("");
    process.exit(1);
  }
  console.log("  All hydration assertions passed.\n");
})();
