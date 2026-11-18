/* Local profile and preferences. No server, no account, no tracking.
   Values are stored in localStorage on this device only. */
(function () {
  "use strict";
  var KEY = "mg_epc_prefs_v1";
  var DEFAULTS = {
    theme: "dark",
    density: "comfortable",
    motion: "on",
    profile: { name: "", organisation: "", role: "", email: "", cohort: "", facilitatorName: "" },
    simulation: {
      defaultDifficulty: "normal",
      showHints: true,
      confirmAdvance: false,
      eventAlerts: true,
      weeklyDigest: false
    },
    updatedAt: null
  };
  var data = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function merge(base, extra) {
    var out = clone(base);
    if (!extra || typeof extra !== "object") return out;
    Object.keys(out).forEach(function (k) {
      if (extra[k] === undefined) return;
      if (out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) out[k] = merge(out[k], extra[k]);
      else out[k] = extra[k];
    });
    return out;
  }

  function load() {
    if (data) return data;
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (err) {}
    var parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch (err) {}
    data = merge(DEFAULTS, parsed);
    return data;
  }

  function save() {
    load();
    data.updatedAt = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (err) {}
    try { document.dispatchEvent(new CustomEvent("mg:prefs", { detail: data })); } catch (err) {}
    return data;
  }

  function get() { return load(); }

  function update(patch) {
    load();
    data = merge(data, patch || {});
    save();
    apply();
    return data;
  }

  function setPath(path, value) {
    load();
    var parts = String(path || "").split(".");
    var obj = data;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]] || typeof obj[parts[i]] !== "object") obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    save();
    apply();
    return data;
  }

  function getPath(path, fallback) {
    load();
    var obj = data;
    var parts = String(path || "").split(".");
    for (var i = 0; i < parts.length; i++) {
      if (!obj || obj[parts[i]] === undefined) return fallback;
      obj = obj[parts[i]];
    }
    return obj === undefined ? fallback : obj;
  }

  function systemTheme() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } catch (err) { return "dark"; }
  }

  function resolvedTheme(choice) {
    choice = choice || load().theme;
    return choice === "system" ? systemTheme() : (choice === "light" ? "light" : "dark");
  }

  function applyTheme() {
    var choice = load().theme;
    var theme = resolvedTheme(choice);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-theme-choice", choice);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f5f8f3" : "#06110c");
  }

  function apply() {
    load();
    applyTheme();
    document.documentElement.setAttribute("data-density", data.density === "compact" ? "compact" : "comfortable");
    document.documentElement.setAttribute("data-motion", data.motion === "off" ? "off" : "on");
  }

  function setTheme(choice) {
    if (["dark", "light", "system"].indexOf(choice) < 0) choice = "dark";
    load().theme = choice;
    save();
    applyTheme();
    return choice;
  }

  function initials(name) {
    var value = String(name || "").trim();
    if (!value) return "MG";
    var parts = value.split(/\s+/).filter(Boolean);
    if (!parts.length) return "MG";
    return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : "")).toUpperCase();
  }

  function displayName() {
    var p = load().profile;
    return String(p.name || "").trim() || "Guest player";
  }

  function profileLine() {
    var p = load().profile;
    var bits = [];
    if (p.role) bits.push(p.role);
    if (p.organisation) bits.push(p.organisation);
    return bits.join(" · ") || "Local profile";
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (err) {}
    data = null;
    apply();
  }

  try {
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: light)");
      var onChange = function () { if (load().theme === "system") applyTheme(); };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  } catch (err) {}

  MG.prefs = {
    KEY: KEY,
    defaults: function () { return clone(DEFAULTS); },
    get: get,
    save: save,
    update: update,
    setPath: setPath,
    getPath: getPath,
    setTheme: setTheme,
    resolvedTheme: resolvedTheme,
    apply: apply,
    initials: initials,
    displayName: displayName,
    profileLine: profileLine,
    clear: clear
  };

  apply();
})();
