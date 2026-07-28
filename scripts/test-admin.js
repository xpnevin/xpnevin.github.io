/* Admin panel test: boot admin.html in jsdom against a fake GitHub API and
   exercise sign-in, form rendering, editing, repeaters and publish.
   Run with: node scripts/test-admin.js   (requires: npm i jsdom --no-save) */

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let pass = 0;
const failures = [];
const ok = (l, c, e) => c ? pass++ : failures.push(l + (e ? "  →  " + e : ""));
const eq = (l, a, b) => ok(l, a === b, `got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

const b64e = (s) => Buffer.from(s, "utf8").toString("base64");
const b64d = (s) => Buffer.from(s, "base64").toString("utf8");
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 40));

function makeEnv(opts = {}) {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on("jsdomError", (e) => errors.push(e.message));

  const dom = new JSDOM(read("admin.html"), {
    runScripts: "outside-only",
    url: opts.url || "https://xpnevin.github.io/admin.html",
    virtualConsole: vc
  });
  const { window } = dom;

  const store = new Map();
  window.localStorage.clear();

  const calls = [];
  const content = JSON.parse(read("assets/data/content.json"));
  let fileSha = "sha-initial";
  let committed = null;

  window.fetch = (url, init = {}) => {
    const u = String(url);
    const method = init.method || "GET";
    calls.push({ url: u, method, headers: init.headers || {}, body: init.body });

    const json = (status, body) => Promise.resolve({
      ok: status < 400, status,
      json: () => Promise.resolve(body)
    });

    if (opts.failAuth && /\/repos\//.test(u)) return json(401, { message: "Bad credentials" });

    // GET /repos/owner/repo
    if (method === "GET" && /\/repos\/[^/]+\/[^/]+$/.test(u)) {
      return json(200, {
        full_name: "xpnevin/xpnevin.github.io",
        default_branch: opts.branch || "main",
        permissions: { push: opts.noPush ? false : true, pull: true }
      });
    }
    // GET contents
    if (method === "GET" && /\/contents\//.test(u)) {
      if (/content\.json/.test(u)) {
        return json(200, { sha: fileSha, content: b64e(JSON.stringify(content, null, 2)) });
      }
      return json(404, { message: "Not Found" }); // fresh upload path
    }
    // PUT contents
    if (method === "PUT" && /\/contents\//.test(u)) {
      const body = JSON.parse(init.body);
      if (opts.conflict) return json(409, { message: "does not match" });
      committed = { url: u, body };
      fileSha = "sha-next";
      return json(200, { content: { sha: fileSha } });
    }
    return json(404, { message: "unexpected " + method + " " + u });
  };

  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  window.scrollTo = () => {};
  window.confirm = () => true;
  window.prompt = () => opts.prompt || "xpnevin/xpnevin.github.io";

  window.eval(read("assets/js/admin.js"));
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));

  return {
    window, dom, calls, errors, store,
    get committed() { return committed; },
    get fileSha() { return fileSha; }
  };
}

async function signIn(env, token = "ghp_testtoken") {
  const { window } = env;
  window.document.querySelector("#token").value = token;
  window.document.querySelector("#gateForm")
    .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await tick(80);
}

(async function run() {
  /* ---------------------------------------------------------- happy path */
  {
    const env = makeEnv();
    const doc = env.window.document;

    eq("starts locked", doc.body.classList.contains("is-authed"), false);
    await signIn(env);
    eq("authed after sign in", doc.body.classList.contains("is-authed"), true);
    eq("repo label", doc.querySelector("#repoLabel").textContent, "xpnevin/xpnevin.github.io · main");

    // Auth header must be a bearer token, and only ever to api.github.com.
    const authed = env.calls.filter((c) => c.headers.Authorization);
    ok("all calls carry bearer token", authed.length === env.calls.length);
    eq("bearer format", authed[0].headers.Authorization, "Bearer ghp_testtoken");
    ok("only github api contacted", env.calls.every((c) => c.url.startsWith("https://api.github.com/")),
      env.calls.map((c) => c.url).join(" | "));

    // Every pane renders inputs.
    ["hero", "about", "skills", "work", "accounts", "contact", "media"].forEach((p) => {
      const n = doc.querySelectorAll(`#pane-${p} input, #pane-${p} textarea, #pane-${p} select`).length;
      ok(`pane ${p} has fields`, n > 0, `${n} fields`);
    });

    // No leftover duplicate Brand field.
    const contactLabels = Array.from(doc.querySelectorAll("#pane-contact .field__label"))
      .map((l) => l.textContent);
    ok("no duplicate Brand field", !contactLabels.includes("Brand"), contactLabels.join(","));

    eq("clean on load", doc.querySelector("#dirtyBadge").hidden, true);

    /* -------------------------------------------------------- editing */
    const nameInput = Array.from(doc.querySelectorAll("#pane-hero input"))
      .find((i) => i.value === "NEVIN");
    ok("hero name input found", !!nameInput);
    nameInput.value = "EDITED";
    nameInput.dispatchEvent(new env.window.Event("input", { bubbles: true }));
    eq("dirty badge shows", doc.querySelector("#dirtyBadge").hidden, false);

    /* ------------------------------------------------------ repeaters */
    const statsCard = Array.from(doc.querySelectorAll("#pane-hero .card"))
      .find((c) => /Stat strip/.test(c.textContent));
    const before = statsCard.querySelectorAll(".rep__item").length;
    eq("3 stats initially", before, 3);

    statsCard.querySelector(".rep__add").dispatchEvent(new env.window.Event("click", { bubbles: true }));
    eq("add stat", statsCard.querySelectorAll(".rep__item").length, before + 1);

    // First item cannot move up; last cannot move down.
    const items = () => Array.from(statsCard.querySelectorAll(".rep__item"));
    eq("first up disabled", items()[0].querySelectorAll(".icon-btn")[0].disabled, true);
    eq("last down disabled",
      items()[items().length - 1].querySelectorAll(".icon-btn")[1].disabled, true);

    // Reorder: swap first two, verify by reading the rendered input values.
    const firstVal = () => items()[0].querySelector("input").value;
    const secondVal = () => items()[1].querySelector("input").value;
    const a = firstVal(), b = secondVal();
    items()[1].querySelectorAll(".icon-btn")[0].dispatchEvent(new env.window.Event("click", { bubbles: true }));
    eq("moved up swaps order", firstVal(), b);
    eq("moved up swaps order (2)", secondVal(), a);

    // Delete the one we added.
    const n1 = items().length;
    items()[n1 - 1].querySelectorAll(".icon-btn")[2].dispatchEvent(new env.window.Event("click", { bubbles: true }));
    eq("delete stat", items().length, n1 - 1);

    /* -------------------------------------------------------- publish */
    doc.querySelector("#publish").dispatchEvent(new env.window.Event("click", { bubbles: true }));
    await tick(80);

    ok("commit happened", !!env.committed);
    const sent = env.committed.body;
    eq("commits to correct path", env.committed.url.endsWith("/contents/assets/data/content.json"), true);
    eq("commit branch", sent.branch, "main");
    eq("sends prior sha", sent.sha, "sha-initial");
    ok("commit message present", typeof sent.message === "string" && sent.message.length > 0);

    const round = JSON.parse(b64d(sent.content));
    eq("edit persisted in commit", round.hero.name, "EDITED");
    eq("reorder persisted", round.hero.stats[0].label, "Edit suites");
    eq("stat count persisted", round.hero.stats.length, 3);
    ok("no brand key written", !("brand" in round.footer), JSON.stringify(round.footer));
    ok("valid json committed", typeof round === "object");
    eq("badge cleared after publish", doc.querySelector("#dirtyBadge").hidden, true);

    // Unicode survives the base64 round trip.
    ok("unicode preserved", /❤/.test(round.footer.credit), round.footer.credit);
    ok("em dash preserved", /–|—/.test(JSON.stringify(round)));

    eq("no jsdom errors", env.errors.length, 0, env.errors.join("; "));
  }

  /* -------------------------------------------------------- token storage */
  {
    const env = makeEnv();
    await signIn(env, "ghp_remembered");
    eq("token remembered when checked",
      env.window.localStorage.getItem("nevin.admin.token"), "ghp_remembered");

    // Sign out must purge it.
    env.window.document.querySelector("#signout")
      .dispatchEvent(new env.window.Event("click", { bubbles: true }));
    await tick();
    eq("token cleared on sign out", env.window.localStorage.getItem("nevin.admin.token"), null);
    eq("locked after sign out", env.window.document.body.classList.contains("is-authed"), false);
  }

  {
    const env = makeEnv();
    env.window.document.querySelector("#remember").checked = false;
    await signIn(env, "ghp_nosave");
    eq("token not stored when unchecked",
      env.window.localStorage.getItem("nevin.admin.token"), null);
    eq("still authed", env.window.document.body.classList.contains("is-authed"), true);
  }

  /* ------------------------------------------------------------- failures */
  {
    const env = makeEnv({ failAuth: true });
    await signIn(env, "bad");
    eq("bad token stays locked", env.window.document.body.classList.contains("is-authed"), false);
    ok("bad token message shown",
      /rejected/i.test(env.window.document.querySelector("#gateStatus").textContent),
      env.window.document.querySelector("#gateStatus").textContent);
    eq("bad token not stored", env.window.localStorage.getItem("nevin.admin.token"), null);
  }

  {
    const env = makeEnv({ noPush: true });
    await signIn(env);
    eq("read-only token refused", env.window.document.body.classList.contains("is-authed"), false);
    ok("read-only message mentions permission",
      /Contents/i.test(env.window.document.querySelector("#gateStatus").textContent),
      env.window.document.querySelector("#gateStatus").textContent);
  }

  {
    const env = makeEnv({ conflict: true });
    await signIn(env);
    env.window.document.querySelector("#publish")
      .dispatchEvent(new env.window.Event("click", { bubbles: true }));
    await tick(80);
    ok("conflict surfaced to user",
      /reload/i.test(env.window.document.querySelector("#toast").textContent),
      env.window.document.querySelector("#toast").textContent);
    eq("publish re-enabled after failure",
      env.window.document.querySelector("#publish").disabled, false);
  }

  /* ------------------------------------------------- non-default branch */
  {
    const env = makeEnv({ branch: "trunk" });
    await signIn(env);
    env.window.document.querySelector("#publish")
      .dispatchEvent(new env.window.Event("click", { bubbles: true }));
    await tick(80);
    eq("commits to repo default branch", env.committed.body.branch, "trunk");
  }

  /* ------------------------------------------------------ repo detection */
  {
    // Project page: https://owner.github.io/reponame/admin.html
    const env = makeEnv({ url: "https://someone.github.io/myproject/admin.html" });
    await signIn(env);
    const repoCall = env.calls.find((c) => /\/repos\/[^/]+\/[^/]+$/.test(c.url));
    ok("project page repo detected", repoCall.url.endsWith("/repos/someone/myproject"), repoCall.url);
  }
  {
    // User page: https://owner.github.io/admin.html
    const env = makeEnv({ url: "https://someone.github.io/admin.html" });
    await signIn(env);
    const repoCall = env.calls.find((c) => /\/repos\/[^/]+\/[^/]+$/.test(c.url));
    ok("user page repo detected", repoCall.url.endsWith("/repos/someone/someone.github.io"), repoCall.url);
  }
  {
    // Local preview falls back to the prompt.
    const env = makeEnv({ url: "http://localhost:8080/admin.html", prompt: "acme/site" });
    await signIn(env);
    const repoCall = env.calls.find((c) => /\/repos\/[^/]+\/[^/]+$/.test(c.url));
    ok("local prompt repo used", repoCall.url.endsWith("/repos/acme/site"), repoCall.url);
  }

  console.log(`\n  ${pass} passed, ${failures.length} failed\n`);
  if (failures.length) {
    failures.forEach((f) => console.log("  ✗ " + f));
    console.log("");
    process.exit(1);
  }
  console.log("  All admin assertions passed.\n");
})();
