/* ==========================================================================
   NEVIN — admin panel
   A backend with no server: GitHub itself is the database and the API.

   The panel reads assets/data/content.json through the GitHub Contents API,
   renders a form over it, and commits the edited JSON back. Pushing to the
   default branch triggers the existing Pages workflow, so publishing from
   here redeploys the live site.

   The token never leaves the browser except in an Authorization header sent
   straight to api.github.com.
   ========================================================================== */
(function () {
  "use strict";

  var API = "https://api.github.com";
  var FILE = "assets/data/content.json";
  var KEY_TOKEN = "nevin.admin.token";
  var KEY_REPO = "nevin.admin.repo";

  var state = {
    token: "",
    owner: "",
    repo: "",
    branch: "main",
    sha: "",
    data: null,
    dirty: false
  };

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ------------------------------------------------------------- utilities */

  function el(tag, cls, txt) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (txt != null) node.textContent = txt;
    return node;
  }

  function icon(path) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", path);
    svg.appendChild(p);
    return svg;
  }

  var ICONS = {
    up: "M12 19V5M5 12l7-7 7 7",
    down: "M12 5v14M19 12l-7 7-7-7",
    trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
    plus: "M12 5v14M5 12h14"
  };

  var toastTimer;
  function toast(msg, kind) {
    var box = $("#toast");
    box.textContent = msg;
    box.className = "toast is-on" + (kind ? " is-" + kind : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.className = "toast"; }, 3600);
  }

  function status(node, msg, kind, busy) {
    node.className = "status" + (kind ? " is-" + kind : "");
    node.textContent = "";
    if (busy) node.appendChild(el("span", "spinner"));
    else if (kind) node.appendChild(el("span", "dot"));
    node.appendChild(document.createTextNode(msg));
  }

  function markDirty() {
    state.dirty = true;
    $("#dirtyBadge").hidden = false;
  }

  function markClean() {
    state.dirty = false;
    $("#dirtyBadge").hidden = true;
  }

  // UTF-8 safe base64 both ways — the content has em dashes and a heart glyph.
  function toB64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function fromB64(b64) {
    var bin = atob(String(b64).replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function slug(name) {
    return String(name)
      .toLowerCase()
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file";
  }

  /* ------------------------------------------------------------ github api */

  function api(path, options) {
    options = options || {};
    return fetch(API + path, {
      method: options.method || "GET",
      headers: {
        "Authorization": "Bearer " + state.token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    }).then(function (r) {
      if (r.status === 204) return null;
      return r.json().then(function (body) {
        if (!r.ok) {
          var err = new Error(body && body.message ? body.message : "HTTP " + r.status);
          err.status = r.status;
          throw err;
        }
        return body;
      });
    });
  }

  // Work out which repo we are editing. On *.github.io the hostname says it;
  // anywhere else (local preview) we ask once and remember.
  function resolveRepo() {
    var host = location.hostname;
    var saved = localStorage.getItem(KEY_REPO);

    if (/\.github\.io$/i.test(host)) {
      var owner = host.replace(/\.github\.io$/i, "");
      var parts = location.pathname.split("/").filter(Boolean);
      // Project pages live at /<repo>/…, user pages at the root.
      var repo = parts.length && !/\.html?$/i.test(parts[0]) ? parts[0] : host;
      return { owner: owner, repo: repo };
    }

    if (saved) {
      try { return JSON.parse(saved); } catch (err) { /* fall through */ }
    }

    var typed = window.prompt("Repository to edit (owner/repo):", "xpnevin/xpnevin.github.io");
    if (!typed || typed.indexOf("/") === -1) return null;
    var bits = typed.split("/");
    var out = { owner: bits[0].trim(), repo: bits[1].trim() };
    localStorage.setItem(KEY_REPO, JSON.stringify(out));
    return out;
  }

  function loadContent() {
    var path = "/repos/" + state.owner + "/" + state.repo + "/contents/" +
               FILE + "?ref=" + encodeURIComponent(state.branch);

    return api(path).then(function (file) {
      state.sha = file.sha;
      state.data = JSON.parse(fromB64(file.content));
    }).catch(function (err) {
      // A missing file is fine on a fresh install — start from the shipped copy.
      if (err.status !== 404) throw err;
      state.sha = "";
      return fetch(FILE, { cache: "no-cache" })
        .then(function (r) { return r.json(); })
        .then(function (json) { state.data = json; });
    });
  }

  function putFile(path, base64, message, sha) {
    var body = {
      message: message,
      content: base64,
      branch: state.branch
    };
    if (sha) body.sha = sha;
    return api("/repos/" + state.owner + "/" + state.repo + "/contents/" + path, {
      method: "PUT",
      body: body
    });
  }

  /* --------------------------------------------------------------- fields */

  function field(label, value, onInput, opts) {
    opts = opts || {};
    var wrap = el("div", "field");
    if (label) {
      var lab = el("label", "field__label", label);
      wrap.appendChild(lab);
    }
    var input = document.createElement(opts.multiline ? "textarea" : "input");
    input.className = opts.multiline ? "textarea" : "input";
    if (!opts.multiline) input.type = opts.type || "text";
    if (opts.placeholder) input.placeholder = opts.placeholder;
    input.value = value == null ? "" : value;
    input.addEventListener("input", function () {
      onInput(input.value);
      markDirty();
    });
    wrap.appendChild(input);
    if (opts.hint) wrap.appendChild(el("p", "card__hint", opts.hint));
    return wrap;
  }

  function colorField(label, value, onInput) {
    var wrap = el("div", "field");
    wrap.appendChild(el("label", "field__label", label));
    var input = document.createElement("input");
    input.type = "color";
    input.className = "swatch";
    input.value = value || "#3b82f6";
    input.addEventListener("input", function () {
      onInput(input.value);
      markDirty();
    });
    wrap.appendChild(input);
    return wrap;
  }

  function rangeField(label, value, onInput) {
    var wrap = el("div", "field");
    var lab = el("label", "field__label", label + " — " + value + "%");
    wrap.appendChild(lab);
    var input = document.createElement("input");
    input.type = "range";
    input.className = "range";
    input.min = "0";
    input.max = "100";
    input.value = value;
    input.addEventListener("input", function () {
      lab.textContent = label + " — " + input.value + "%";
      onInput(Number(input.value));
      markDirty();
    });
    wrap.appendChild(input);
    return wrap;
  }

  function checkField(label, value, onInput) {
    var wrap = el("div", "field");
    var line = el("label", "checkline");
    var input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!value;
    input.addEventListener("change", function () {
      onInput(input.checked);
      markDirty();
    });
    line.appendChild(input);
    line.appendChild(document.createTextNode(label));
    wrap.appendChild(line);
    return wrap;
  }

  function card(title, hint) {
    var box = el("section", "card");
    var head = el("div", "card__head");
    head.appendChild(el("h2", "card__title", title));
    box.appendChild(head);
    if (hint) box.appendChild(el("p", "card__hint", hint));
    return box;
  }

  function row() {
    var div = el("div", "grid-2");
    Array.prototype.slice.call(arguments).forEach(function (child) {
      if (child) div.appendChild(child);
    });
    return div;
  }

  /* ------------------------------------------------------------- repeater */

  // Generic list editor: reorder, delete, add. `render` fills one item body,
  // `blank` returns a fresh entry.
  function repeater(list, render, blank, addLabel) {
    var host = el("div");

    function draw() {
      host.textContent = "";

      list.forEach(function (item, i) {
        var box = el("div", "rep__item");
        var tools = el("div", "rep__tools");

        var up = el("button", "icon-btn");
        up.type = "button";
        up.title = "Move up";
        up.disabled = i === 0;
        up.appendChild(icon(ICONS.up));
        up.addEventListener("click", function () {
          list.splice(i - 1, 0, list.splice(i, 1)[0]);
          markDirty();
          draw();
        });

        var down = el("button", "icon-btn");
        down.type = "button";
        down.title = "Move down";
        down.disabled = i === list.length - 1;
        down.appendChild(icon(ICONS.down));
        down.addEventListener("click", function () {
          list.splice(i + 1, 0, list.splice(i, 1)[0]);
          markDirty();
          draw();
        });

        var del = el("button", "icon-btn icon-btn--bad");
        del.type = "button";
        del.title = "Delete";
        del.appendChild(icon(ICONS.trash));
        del.addEventListener("click", function () {
          list.splice(i, 1);
          markDirty();
          draw();
        });

        tools.appendChild(up);
        tools.appendChild(down);
        tools.appendChild(del);
        box.appendChild(tools);
        render(box, item, i);
        host.appendChild(box);
      });

      var add = el("button", "rep__add");
      add.type = "button";
      add.appendChild(icon(ICONS.plus));
      add.appendChild(document.createTextNode(addLabel || "Add item"));
      add.addEventListener("click", function () {
        list.push(blank());
        markDirty();
        draw();
      });
      host.appendChild(add);
    }

    draw();
    return host;
  }

  // Repeater over an array of plain strings.
  function stringRepeater(list, label, addLabel, multiline) {
    return repeater(list, function (box, _item, i) {
      box.appendChild(field(label + " " + (i + 1), list[i], function (v) {
        list[i] = v;
      }, { multiline: !!multiline }));
    }, function () { return ""; }, addLabel);
  }

  function headFields(box, obj) {
    box.appendChild(field("Eyebrow", obj.eyebrow, function (v) { obj.eyebrow = v; }));
    box.appendChild(field("Title", obj.title, function (v) { obj.title = v; },
      { hint: "Wrap words in *asterisks* for the gradient highlight." }));
    if ("lede" in obj) {
      box.appendChild(field("Intro line", obj.lede, function (v) { obj.lede = v; }, { multiline: true }));
    }
  }

  /* ---------------------------------------------------------------- panes */

  function paneHero() {
    var d = state.data.hero;
    var pane = $("#pane-hero");
    pane.textContent = "";

    var main = card("Hero", "The first screen visitors see.");
    main.appendChild(field("Badge", d.badge, function (v) { d.badge = v; }));
    main.appendChild(field("Name", d.name, function (v) { d.name = v; }));
    main.appendChild(field("Intro paragraph", d.lede, function (v) { d.lede = v; }, { multiline: true }));
    pane.appendChild(main);

    var typing = card("Typing headline", "Each line is typed out then deleted, in order.");
    typing.appendChild(stringRepeater(d.words, "Line", "Add line"));
    pane.appendChild(typing);

    var stats = card("Stat strip", "The three figures under the buttons.");
    stats.appendChild(repeater(d.stats, function (box, item) {
      box.appendChild(row(
        field("Number", item.num, function (v) { item.num = v; }),
        field("Label", item.label, function (v) { item.label = v; })
      ));
    }, function () { return { num: "0", label: "New stat" }; }, "Add stat"));
    pane.appendChild(stats);
  }

  function paneAbout() {
    var d = state.data.about;
    var pane = $("#pane-about");
    pane.textContent = "";

    var head = card("Section heading");
    headFields(head, d);
    pane.appendChild(head);

    var body = card("Paragraphs", "Use **double asterisks** to bold a phrase.");
    body.appendChild(stringRepeater(d.paras, "Paragraph", "Add paragraph", true));
    pane.appendChild(body);

    var chips = card("Tags", "The pill row under the paragraphs.");
    chips.appendChild(stringRepeater(d.chips, "Tag", "Add tag"));
    pane.appendChild(chips);

    var glance = card("At a glance panel");
    glance.appendChild(field("Panel title", d.glanceTitle, function (v) { d.glanceTitle = v; }));
    glance.appendChild(repeater(d.glance, function (box, item) {
      box.appendChild(row(
        field("Label", item.k, function (v) { item.k = v; }),
        field("Value", item.v, function (v) { item.v = v; })
      ));
    }, function () { return { k: "Label", v: "Value" }; }, "Add row"));
    pane.appendChild(glance);

    var kit = card("Toolkit panel");
    kit.appendChild(field("Panel title", d.toolkitTitle, function (v) { d.toolkitTitle = v; }));
    kit.appendChild(stringRepeater(d.toolkit, "Tool", "Add tool"));
    pane.appendChild(kit);
  }

  function paneSkills() {
    var d = state.data.skills;
    var pane = $("#pane-skills");
    pane.textContent = "";

    var head = card("Section heading");
    headFields(head, d);
    pane.appendChild(head);

    var list = card("Skill rings", "The percentage drives both the arc and the counter.");
    list.appendChild(repeater(d.items, function (box, item) {
      box.appendChild(field("Name", item.name, function (v) { item.name = v; }));
      box.appendChild(rangeField("Proficiency", Number(item.percent) || 0, function (v) { item.percent = v; }));
      box.appendChild(field("Note", item.note, function (v) { item.note = v; }));
      box.appendChild(row(
        colorField("Arc start", item.from, function (v) { item.from = v; }),
        colorField("Arc end", item.to, function (v) { item.to = v; })
      ));
    }, function () {
      return { name: "New skill", percent: 50, note: "", from: "#22d3ee", to: "#a855f7" };
    }, "Add skill"));
    pane.appendChild(list);
  }

  function paneWork() {
    var d = state.data.work;
    var pane = $("#pane-work");
    pane.textContent = "";

    var head = card("Section heading");
    headFields(head, d);
    pane.appendChild(head);

    var reels = card("Motion reels", "Upload files in the Media tab, then paste the path here.");
    reels.appendChild(repeater(d.reels, function (box, item) {
      box.appendChild(row(
        field("Title", item.title, function (v) { item.title = v; }),
        field("Tag", item.tag, function (v) { item.tag = v; })
      ));
      box.appendChild(field("Video path", item.src, function (v) { item.src = v; },
        { placeholder: "assets/videos/reel-01.mp4" }));
      box.appendChild(field("Poster image", item.poster, function (v) { item.poster = v; },
        { placeholder: "assets/photos/london-eye.jpg" }));
    }, function () {
      return { src: "", poster: "", title: "New reel", tag: "Cinematic" };
    }, "Add reel"));
    pane.appendChild(reels);

    var gallery = card("Photo gallery", "Alt text matters for search and screen readers.");
    gallery.appendChild(repeater(d.gallery, function (box, item) {
      box.appendChild(field("Image path", item.src, function (v) { item.src = v; },
        { placeholder: "assets/photos/example.jpg" }));
      box.appendChild(field("Alt text", item.alt, function (v) { item.alt = v; }));
    }, function () { return { src: "", alt: "" }; }, "Add photo"));
    pane.appendChild(gallery);
  }

  function paneAccounts() {
    var d = state.data.accounts;
    var pane = $("#pane-accounts");
    pane.textContent = "";

    var head = card("Section heading");
    headFields(head, d);
    pane.appendChild(head);

    var list = card("Accounts");
    list.appendChild(repeater(d.items, function (box, item) {
      box.appendChild(row(
        field("Role", item.role, function (v) { item.role = v; }),
        field("Handle", item.handle, function (v) { item.handle = v; })
      ));
      box.appendChild(field("Description", item.desc, function (v) { item.desc = v; }, { multiline: true }));
      box.appendChild(field("Link", item.url, function (v) { item.url = v; }, { type: "url" }));
      box.appendChild(checkField("Show in the footer icon row", item.footer !== false,
        function (v) { item.footer = v; }));
    }, function () {
      return { role: "New account", handle: "@handle", desc: "", url: "", footer: true };
    }, "Add account"));
    pane.appendChild(list);
  }

  function paneContact() {
    var d = state.data.contact;
    var f = state.data.footer;
    var pane = $("#pane-contact");
    pane.textContent = "";

    var head = card("Section heading");
    headFields(head, d);
    pane.appendChild(head);

    var details = card("Details", "Changing the email updates every mailto link and the copy button.");
    details.appendChild(field("Email", d.email, function (v) { d.email = v; }, { type: "email" }));
    details.appendChild(field("Turnaround title", d.turnaroundTitle, function (v) { d.turnaroundTitle = v; }));
    details.appendChild(repeater(d.turnaround, function (box, item) {
      box.appendChild(row(
        field("Label", item.k, function (v) { item.k = v; }),
        field("Value", item.v, function (v) { item.v = v; })
      ));
    }, function () { return { k: "Label", v: "Value" }; }, "Add row"));
    pane.appendChild(details);

    var form = card("Commission form", "Any embeddable form URL works.");
    form.appendChild(field("Form label", d.formLabel, function (v) { d.formLabel = v; }));
    form.appendChild(field("Form URL", d.formUrl, function (v) { d.formUrl = v; }, { type: "url" }));
    pane.appendChild(form);

    var foot = card("Footer", "The footer wordmark follows the hero name.");
    foot.appendChild(field("Tagline", f.tagline, function (v) { f.tagline = v; }));
    foot.appendChild(field("Credit line", f.credit, function (v) { f.credit = v; }));
    pane.appendChild(foot);
  }

  /* ----------------------------------------------------------- media pane */

  function paneMedia() {
    var pane = $("#pane-media");
    pane.textContent = "";

    var box = card("Upload media",
      "Files commit straight into the repo. Keep uploads under about 20 MB — " +
      "the GitHub Contents API rejects large payloads.");

    var target = el("div", "field");
    target.appendChild(el("label", "field__label", "Destination"));
    var select = el("select", "select");
    [
      ["assets/photos/", "Photos — assets/photos/"],
      ["assets/videos/", "Videos — assets/videos/"]
    ].forEach(function (opt) {
      var o = document.createElement("option");
      o.value = opt[0];
      o.textContent = opt[1];
      select.appendChild(o);
    });
    target.appendChild(select);
    box.appendChild(target);

    var pick = el("div", "field");
    pick.appendChild(el("label", "field__label", "File"));
    var input = document.createElement("input");
    input.type = "file";
    input.className = "input";
    input.accept = "image/*,video/*";
    pick.appendChild(input);
    box.appendChild(pick);

    var btn = el("button", "abtn abtn--primary");
    btn.type = "button";
    btn.textContent = "Upload to repository";
    box.appendChild(btn);

    var out = el("p", "status");
    out.style.marginTop = ".9rem";
    box.appendChild(out);

    var result = el("div");
    box.appendChild(result);

    btn.addEventListener("click", function () {
      var file = input.files && input.files[0];
      if (!file) { status(out, "Choose a file first.", "warn"); return; }

      if (file.size > 22 * 1024 * 1024) {
        status(out, "That file is " + (file.size / 1048576).toFixed(1) +
          " MB — too large to commit through the API.", "bad");
        return;
      }

      var ext = (file.name.match(/\.[a-z0-9]+$/i) || [".bin"])[0].toLowerCase();
      var path = select.value + slug(file.name) + ext;

      btn.disabled = true;
      status(out, "Uploading " + path + "…", null, true);

      var reader = new FileReader();
      reader.onerror = function () {
        btn.disabled = false;
        status(out, "Could not read that file.", "bad");
      };
      reader.onload = function () {
        var base64 = String(reader.result).split(",")[1];

        // An existing path needs its blob sha to overwrite.
        api("/repos/" + state.owner + "/" + state.repo + "/contents/" + path +
            "?ref=" + encodeURIComponent(state.branch))
          .then(function (f) { return f.sha; })
          .catch(function () { return ""; })
          .then(function (sha) {
            return putFile(path, base64, "Upload " + path + " via admin", sha);
          })
          .then(function () {
            btn.disabled = false;
            status(out, "Uploaded.", "ok");
            toast("Uploaded " + path, "ok");
            result.textContent = "";
            result.appendChild(field("Path — copy this into Work", path, function () {}));
            input.value = "";
          })
          .catch(function (err) {
            btn.disabled = false;
            status(out, err.message || "Upload failed.", "bad");
          });
      };
      reader.readAsDataURL(file);
    });

    pane.appendChild(box);

    var raw = card("Raw JSON", "The exact file that will be committed.");
    var pre = el("textarea", "textarea");
    pre.readOnly = true;
    pre.style.minHeight = "260px";
    pre.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
    pre.style.fontSize = ".8rem";
    pre.value = JSON.stringify(state.data, null, 2);
    raw.appendChild(pre);

    var refresh = el("button", "abtn");
    refresh.type = "button";
    refresh.textContent = "Refresh preview";
    refresh.addEventListener("click", function () {
      pre.value = JSON.stringify(state.data, null, 2);
    });
    raw.appendChild(refresh);
    pane.appendChild(raw);
  }

  function renderAll() {
    [paneHero, paneAbout, paneSkills, paneWork, paneAccounts, paneContact, paneMedia]
      .forEach(function (fn) {
        try { fn(); } catch (err) {
          if (window.console) console.error("[admin] " + fn.name + " failed:", err);
        }
      });
  }

  /* -------------------------------------------------------------- publish */

  function publish() {
    var btn = $("#publish");
    btn.disabled = true;
    toast("Publishing…");

    var json = JSON.stringify(state.data, null, 2) + "\n";

    putFile(FILE, toB64(json), "Update site content via admin", state.sha)
      .then(function (res) {
        state.sha = res.content.sha;
        markClean();
        btn.disabled = false;
        toast("Published — Pages will rebuild in about a minute.", "ok");
      })
      .catch(function (err) {
        btn.disabled = false;
        if (err.status === 409) {
          toast("The file changed on GitHub. Reload before publishing again.", "bad");
        } else {
          toast(err.message || "Publish failed.", "bad");
        }
      });
  }

  /* ----------------------------------------------------------------- auth */

  function unlock(token, remember) {
    var out = $("#gateStatus");
    status(out, "Checking token…", null, true);

    var where = resolveRepo();
    if (!where) { status(out, "No repository selected.", "bad"); return; }

    state.token = token;
    state.owner = where.owner;
    state.repo = where.repo;

    api("/repos/" + state.owner + "/" + state.repo)
      .then(function (repo) {
        if (!repo.permissions || !repo.permissions.push) {
          throw new Error("This token cannot write to " + repo.full_name +
                          ". Give it Contents: Read and write.");
        }
        state.branch = repo.default_branch || "main";
        $("#repoLabel").textContent = repo.full_name + " · " + state.branch;
        return loadContent();
      })
      .then(function () {
        if (remember) localStorage.setItem(KEY_TOKEN, token);
        else localStorage.removeItem(KEY_TOKEN);

        renderAll();
        markClean();
        document.body.classList.add("is-authed");
        status(out, "", null);
        toast("Signed in to " + state.owner + "/" + state.repo, "ok");
      })
      .catch(function (err) {
        state.token = "";
        var msg = err.status === 401 ? "That token was rejected."
                : err.status === 404 ? "Repository not found, or the token has no access to it."
                : err.message || "Sign-in failed.";
        status(out, msg, "bad");
      });
  }

  function signout() {
    if (state.dirty && !window.confirm("You have unpublished changes. Sign out anyway?")) return;
    localStorage.removeItem(KEY_TOKEN);
    state.token = "";
    state.data = null;
    markClean();
    document.body.classList.remove("is-authed");
    $("#token").value = "";
  }

  /* ----------------------------------------------------------------- boot */

  function boot() {
    $("#gateForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var token = $("#token").value.trim();
      if (!token) return;
      unlock(token, $("#remember").checked);
    });

    $("#publish").addEventListener("click", publish);
    $("#signout").addEventListener("click", signout);

    $$(".side__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".side__btn").forEach(function (b) { b.classList.remove("is-active"); });
        $$(".pane").forEach(function (p) { p.classList.remove("is-active"); });
        btn.classList.add("is-active");
        var pane = $("#pane-" + btn.getAttribute("data-pane"));
        if (pane) pane.classList.add("is-active");
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    // Ctrl/Cmd+S publishes.
    window.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        if (!document.body.classList.contains("is-authed")) return;
        e.preventDefault();
        publish();
      }
    });

    window.addEventListener("beforeunload", function (e) {
      if (!state.dirty) return;
      e.preventDefault();
      e.returnValue = "";
    });

    var saved = localStorage.getItem(KEY_TOKEN);
    if (saved) {
      $("#token").value = saved;
      unlock(saved, true);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
