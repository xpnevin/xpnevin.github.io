/* ==========================================================================
   NEVIN — studio assistant
   A tiny, dependency-free chat client for one OpenAI-compatible endpoint.
   The provider key lives in this browser's localStorage; nothing secret is
   ever part of the repository. Each module is isolated in its own try/catch
   so one failure cannot take the page down.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;

  var STORE_KEY = "nevin-assistant-v1";
  var THEME_KEY = "nevin-theme";
  var MAX_HISTORY = 12;
  var MAX_TOKENS = 800;

  var SYSTEM_PROMPT = [
    "You are the studio assistant on Nevin Manoj's site (NEVIN).",
    "Nevin is one person offering video editing, video recording and photography: clean cuts and pacing, colour correction, balanced sound, carefully framed footage, and thoughtfully composed photographs with a clean finish.",
    "Help visitors think through what they need, shape a rough idea into a clear brief, and understand the process: tell the brief (service, date, deadline, references), then shoot and cut, then receive the finished file digitally.",
    "Be warm, plain-spoken and brief — usually under 120 words unless asked for detail. Use short paragraphs or a short list.",
    "Never invent prices, availability or delivery dates: quotes are agreed per project, so point people to the enquiry form or xpnevin@gmail.com.",
    "Never claim to be Nevin or a human. If asked what you are, say you are an AI assistant on the site.",
    "If a request is unrelated to video, photography or the studio, answer briefly and steer back to the work."
  ].join(" ");

  /* Prices, models and endpoints change; these presets are starting points. */
  var PRESETS = {
    openai: { base: "https://api.openai.com/v1", model: "gpt-4o-mini" },
    openrouter: { base: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini" },
    groq: { base: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
    zai: { base: "https://api.z.ai/api/paas/v4", model: "glm-4-flash" },
    custom: { base: "", model: "" }
  };

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  function readStore() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) { return {}; }
  }

  function writeStore(value) {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(value));
      return true;
    } catch (err) { return false; }
  }

  /* ------------------------------------------------------------------ state */
  var store = readStore();
  var state = {
    config: {
      provider: store.provider || "openai",
      base: store.base || PRESETS.openai.base,
      model: store.model || PRESETS.openai.model,
      key: store.key || ""
    },
    messages: [],
    busy: false,
    controller: null
  };

  var els = {
    log: $("#log"),
    logEmpty: $("#logEmpty"),
    turnCount: $("#turnCount"),
    status: $("#status"),
    composer: $("#composer"),
    input: $("#input"),
    sendBtn: $("#sendBtn"),
    stopBtn: $("#stopBtn"),
    clearBtn: $("#clearBtn"),
    starter: $("#starter"),
    connBadge: $("#connBadge"),
    connText: $("#connText"),
    railModel: $("#railModel"),
    railEndpoint: $("#railEndpoint"),
    railConnect: $("#railConnect"),
    settingsBtn: $("#settingsBtn"),
    settings: $("#settings"),
    settingsForm: $("#settingsForm"),
    settingsStatus: $("#settingsStatus"),
    provider: $("#provider"),
    baseUrl: $("#baseUrl"),
    modelName: $("#modelName"),
    apiKey: $("#apiKey"),
    forgetBtn: $("#forgetBtn"),
    themeToggle: $("#themeToggle"),
    console: $(".console"),
    recLabel: $(".console__rec")
  };

  function setStatus(text, kind) {
    if (!els.status) return;
    els.status.textContent = text || "";
    if (kind) els.status.setAttribute("data-state", kind);
    else els.status.removeAttribute("data-state");
  }

  function setSettingsStatus(text, kind) {
    if (!els.settingsStatus) return;
    els.settingsStatus.textContent = text || "";
    if (kind) els.settingsStatus.setAttribute("data-state", kind);
    else els.settingsStatus.removeAttribute("data-state");
  }

  function hasKey() { return Boolean(state.config.key && state.config.base && state.config.model); }

  function paintConnection() {
    var ready = hasKey();
    if (els.connBadge) els.connBadge.setAttribute("data-state", ready ? "connected" : "idle");
    if (els.connText) els.connText.textContent = ready ? "Connected" : "No model connected";
    if (els.railModel) els.railModel.textContent = ready ? state.config.model : "Not set";
    if (els.railEndpoint) {
      els.railEndpoint.textContent = ready
        ? state.config.base.replace(/^https?:\/\//, "")
        : "No key in this browser";
    }
  }

  function countLabel() {
    var n = state.messages.length;
    if (els.turnCount) els.turnCount.textContent = n === 1 ? "1 message" : n + " messages";
  }

  /* --------------------------------------------------------------- markdown */
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function inline(text) {
    return text
      .replace(/`([^`]+)`/g, function (_, code) { return "<code>" + code + "</code>"; })
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/(^|[\s(])_([^_\n]+)_/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function listBlock(lines, ordered) {
    var items = [];
    for (var i = 0; i < lines.length; i++) {
      var match = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/.exec(lines[i]);
      if (match) items.push(match[1]);
      else if (items.length) items[items.length - 1] += " " + lines[i].trim();
    }
    if (!items.length) return "";
    var tag = ordered ? "ol" : "ul";
    var inner = items.map(function (item) { return "<li>" + inline(item) + "</li>"; }).join("");
    return "<" + tag + ">" + inner + "</" + tag + ">";
  }

  function block(src) {
    var out = "";
    var chunks = src.split(/\n{2,}/);
    for (var i = 0; i < chunks.length; i++) {
      var chunk = chunks[i].replace(/^\n+|\n+$/g, "");
      if (!chunk) continue;
      var lines = chunk.split("\n");
      var first = lines[0];

      if (/^\s*(?:[-*+]|\d+\.)\s+/.test(first)) {
        out += listBlock(lines, /^\s*\d+\./.test(first));
      } else if (/^#{1,6}\s+/.test(first)) {
        out += '<p class="md-h">' + inline(chunk.replace(/^#{1,6}\s+/, "")) + "</p>";
      } else {
        out += "<p>" + inline(chunk).replace(/\n/g, "<br>") + "</p>";
      }
    }
    return out;
  }

  function renderMarkdown(source) {
    var text = escapeHtml(source || "");
    var html = "";
    var fence = /```([a-z0-9+#.-]*)\n?([\s\S]*?)```/gi;
    var last = 0;
    var match;

    while ((match = fence.exec(text))) {
      html += block(text.slice(last, match.index));
      html += '<pre class="code"><code>' + match[2].replace(/^\n+|\n+$/g, "") + "</code></pre>";
      last = fence.lastIndex;
    }
    html += block(text.slice(last));
    return html;
  }

  /* ------------------------------------------------------------------- log */
  function scrollToEnd(force) {
    if (!els.log) return;
    var gap = els.log.scrollHeight - els.log.scrollTop - els.log.clientHeight;
    if (force || gap < 140) els.log.scrollTop = els.log.scrollHeight;
  }

  function hideEmpty() {
    if (els.logEmpty && els.logEmpty.parentNode) els.logEmpty.parentNode.removeChild(els.logEmpty);
  }

  function showEmpty() {
    if (!els.log || !els.logEmpty) return;
    els.log.innerHTML = "";
    els.log.appendChild(els.logEmpty);
  }

  function timeNow() {
    try {
      return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (err) { return ""; }
  }

  function addMessage(role, text) {
    hideEmpty();

    var article = doc.createElement("article");
    article.className = "msg msg--" + (role === "user" ? "user" : role === "error" ? "error" : "ai");

    var meta = doc.createElement("div");
    meta.className = "msg__meta mono";

    var who = doc.createElement("span");
    who.textContent = role === "user" ? "You" : role === "error" ? "Note" : "Assistant";

    var time = doc.createElement("time");
    time.textContent = timeNow();

    meta.appendChild(who);
    meta.appendChild(time);

    var body = doc.createElement("div");
    body.className = "msg__body";

    if (role === "user") {
      body.textContent = text;
    } else if (role === "error") {
      body.textContent = text;
    } else {
      body.innerHTML = renderMarkdown(text);
    }

    article.appendChild(meta);
    article.appendChild(body);
    els.log.appendChild(article);
    scrollToEnd(true);

    return body;
  }

  function addPending() {
    var body = addMessage("ai", "");
    body.innerHTML = '<span class="msg__dots" aria-hidden="true"><i></i><i></i><i></i></span>';
    return body;
  }

  function setBusy(busy) {
    state.busy = busy;
    if (els.sendBtn) els.sendBtn.disabled = busy;
    if (els.stopBtn) els.stopBtn.hidden = !busy;
    if (els.input) els.input.disabled = false;
    if (els.console) els.console.classList.toggle("is-live", busy);
    if (els.recLabel) els.recLabel.innerHTML = '<i aria-hidden="true"></i>' + (busy ? "Live" : "Standing by");
  }

  /* ------------------------------------------------------------------ calls */
  function describeStatus(status, detail) {
    if (status === 401 || status === 403) {
      return "That key was rejected. Check the key, and that this model is allowed on it.";
    }
    if (status === 404) {
      return "The provider didn't recognise that base URL or model name.";
    }
    if (status === 422 || status === 400) {
      return "The provider didn't accept the request" + (detail ? " — " + detail : ".") +
        " The model name is the usual cause.";
    }
    if (status === 429) {
      return "The provider is rate-limiting this key. Wait a moment and send again.";
    }
    if (status >= 500) {
      return "The provider had a server error. Try again shortly.";
    }
    return "The provider replied with " + status + (detail ? " — " + detail : ".");
  }

  function endpoint() {
    return state.config.base.replace(/\/+$/, "") + "/chat/completions";
  }

  function errorDetail(payload) {
    try {
      var data = JSON.parse(payload);
      if (data && data.error && data.error.message) return String(data.error.message).slice(0, 220);
      if (data && data.message) return String(data.message).slice(0, 220);
      if (data && data.error && typeof data.error === "string") return data.error.slice(0, 220);
    } catch (err) { /* not JSON, fall through */ }
    return String(payload || "").replace(/\s+/g, " ").slice(0, 220);
  }

  async function streamCompletion(messages, onDelta, signal) {
    var res = await fetch(endpoint(), {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + state.config.key
      },
      body: JSON.stringify({
        model: state.config.model,
        messages: messages,
        stream: true,
        max_tokens: MAX_TOKENS
      }),
      signal: signal
    });

    if (!res.ok) {
      var failure = await res.text();
      throw new Error(describeStatus(res.status, errorDetail(failure)));
    }

    var isStream = (res.headers.get("content-type") || "").indexOf("text/event-stream") !== -1;

    if (!isStream) {
      var data = await res.json();
      var choice = data && data.choices && data.choices[0];
      var whole = choice && ((choice.message && choice.message.content) || choice.text);
      if (!whole) throw new Error("The provider replied without any text.");
      onDelta(whole);
      return whole;
    }

    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";
    var full = "";

    while (true) {
      var step = await reader.read();
      if (step.done) break;
      buffer += decoder.decode(step.value, { stream: true });

      var lines = buffer.split("\n");
      buffer = lines.pop();

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line.charAt(0) === ":") continue;
        if (line.indexOf("data:") !== 0) continue;

        var payload = line.slice(5).trim();
        if (payload === "[DONE]") { lines = []; break; }

        var parsed;
        try { parsed = JSON.parse(payload); } catch (err) { continue; }
        if (parsed && parsed.error) throw new Error(describeStatus(0, errorDetail(payload)));

        var pick = parsed && parsed.choices && parsed.choices[0];
        if (!pick) continue;
        var delta = (pick.delta && pick.delta.content) || (pick.message && pick.message.content) || "";
        if (delta) {
          full += delta;
          onDelta(full);
        }
      }
    }

    if (!full) throw new Error("The provider ended the reply without sending any text.");
    return full;
  }

  async function send(text) {
    if (state.busy) return;

    if (!hasKey()) {
      setStatus("Add a key first — the connection panel is just below the chat.", "error");
      openSettings(true);
      return;
    }

    state.messages.push({ role: "user", content: text });
    addMessage("user", text);
    countLabel();

    var body = addPending();
    var payload = [{ role: "system", content: SYSTEM_PROMPT }]
      .concat(state.messages.slice(-MAX_HISTORY));

    state.controller = new AbortController();
    setBusy(true);
    setStatus("Waiting for " + state.config.model + "…");

    try {
      await streamCompletion(payload, function (partial) {
        body.innerHTML = renderMarkdown(partial);
        scrollToEnd(false);
      }, state.controller.signal);

      var final = body.textContent.trim();
      if (final) {
        state.messages.push({ role: "assistant", content: final });
        countLabel();
      }
      setStatus("Reply from " + state.config.model + " · " + timeNow(), "ok");
    } catch (err) {
      var aborted = err && (err.name === "AbortError");
      if (aborted) {
        body.innerHTML = renderMarkdown("_Stopped._");
        setStatus("Stopped before the reply finished.");
      } else {
        if (body.parentNode) body.parentNode.parentNode.removeChild(body.parentNode);
        var message = err && err.message ? err.message : "Something went wrong.";
        if (err instanceof TypeError) {
          message = "Couldn't reach the provider. Some providers block calls straight from a browser (CORS) — OpenRouter and Groq usually allow it.";
        }
        addMessage("error", message);
        setStatus(message, "error");
        /* Drop the unanswered turn so a retry does not stack up context. */
        state.messages.pop();
        countLabel();
      }
    } finally {
      state.controller = null;
      setBusy(false);
      if (els.input) els.input.focus();
    }
  }

  /* ---------------------------------------------------------------- actions */
  function openSettings(focusKey) {
    if (!els.settings) return;
    els.settings.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(function () {
      if (focusKey && els.apiKey) els.apiKey.focus();
    }, 320);
  }

  function autoGrow() {
    if (!els.input) return;
    els.input.style.height = "auto";
    els.input.style.height = Math.min(els.input.scrollHeight, 176) + "px";
  }

  function resetChat() {
    state.messages = [];
    countLabel();
    showEmpty();
    setStatus("");
    if (els.input) {
      els.input.value = "";
      els.input.style.height = "auto";
      els.input.focus();
    }
  }

  /* ---------------------------------------------------------------- modules */
  /* Two frames after first paint, so the hidden initial states never flash
     and the entrance animations always start from zero. */
  function loaded() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { doc.body.classList.add("is-loaded"); });
    });
  }

  function chatForm() {
    if (!els.composer || !els.input) return;

    els.composer.addEventListener("submit", function (event) {
      event.preventDefault();
      var text = els.input.value.trim();
      if (!text) return;
      els.input.value = "";
      autoGrow();
      send(text);
    });

    els.input.addEventListener("input", autoGrow);

    els.input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        els.composer.requestSubmit ? els.composer.requestSubmit() : els.composer.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });

    if (els.starter) {
      els.starter.addEventListener("click", function (event) {
        var chip = event.target.closest(".starter__chip");
        if (!chip) return;
        var prompt = chip.getAttribute("data-prompt") || chip.textContent;
        els.input.value = prompt;
        autoGrow();
        els.input.focus();
      });
    }

    if (els.stopBtn) {
      els.stopBtn.addEventListener("click", function () {
        if (state.controller) state.controller.abort();
      });
    }

    if (els.clearBtn) els.clearBtn.addEventListener("click", resetChat);
  }

  function connectionForm() {
    if (!els.settingsForm) return;

    if (els.provider) els.provider.value = state.config.provider;
    if (els.baseUrl) els.baseUrl.value = state.config.base;
    if (els.modelName) els.modelName.value = state.config.model;
    if (els.apiKey) els.apiKey.value = state.config.key;

    if (els.provider) {
      els.provider.addEventListener("change", function () {
        var preset = PRESETS[els.provider.value];
        if (!preset || els.provider.value === "custom") return;
        els.baseUrl.value = preset.base;
        els.modelName.value = preset.model;
      });
    }

    els.settingsForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var base = els.baseUrl.value.trim();
      var model = els.modelName.value.trim();
      var key = els.apiKey.value.trim();

      if (!base || !model) {
        setSettingsStatus("A base URL and a model name are both needed.", "error");
        return;
      }
      if (!/^https?:\/\//i.test(base)) {
        setSettingsStatus("The base URL should start with https://", "error");
        return;
      }
      if (!key) {
        setSettingsStatus("Paste the provider key as well.", "error");
        return;
      }

      state.config = { provider: els.provider.value, base: base, model: model, key: key };
      var saved = writeStore(state.config);

      paintConnection();
      setSettingsStatus(
        saved ? "Saved in this browser · " + model : "Couldn't save here (storage is blocked). It will work for this visit only.",
        saved ? "ok" : "error"
      );
      setStatus("Connected to " + model + ". Ask away.", "ok");
      if (els.input) els.input.focus();
    });

    if (els.forgetBtn) {
      els.forgetBtn.addEventListener("click", function () {
        state.config.key = "";
        writeStore({ provider: state.config.provider, base: state.config.base, model: state.config.model, key: "" });
        if (els.apiKey) els.apiKey.value = "";
        paintConnection();
        setSettingsStatus("Key removed from this browser.", "ok");
        setStatus("No model connected.");
      });
    }

    if (els.settingsBtn) els.settingsBtn.addEventListener("click", function () { openSettings(false); });
    if (els.railConnect) els.railConnect.addEventListener("click", function () { openSettings(true); });
  }

  function theme() {
    if (!els.themeToggle) return;
    var meta = doc.getElementById("themeColor");

    function paint(isDark) {
      els.themeToggle.setAttribute("aria-pressed", isDark ? "true" : "false");
      els.themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
      if (meta) meta.setAttribute("content", isDark ? "#0b0c0e" : "#f3eee4");
    }

    paint(root.getAttribute("data-theme") !== "light");

    els.themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      paint(next === "dark");
      try { window.localStorage.setItem(THEME_KEY, next); } catch (err) { /* storage may be denied */ }
    });
  }

  function footerYear() {
    var year = doc.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function boot() {
    var modules = [loaded, chatForm, connectionForm, theme, footerYear];
    for (var i = 0; i < modules.length; i++) {
      try { modules[i](); } catch (err) { /* one module cannot break the rest */ }
    }
    try {
      paintConnection();
      countLabel();
      if (hasKey()) setSettingsStatus("Saved in this browser · " + state.config.model, "ok");
    } catch (err) { /* the page still renders */ }
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
