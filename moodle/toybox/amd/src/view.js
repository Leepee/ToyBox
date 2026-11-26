// This file is part of the ToyBox activity for Moodle (mod_toybox). GPL v3 or later.
// GENERATED from moodle/src/view.ts and core/src by scripts/build-moodle.mjs. Do not edit by hand.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// moodle/src/view.ts
import Ajax from "core/ajax";
import Notification from "core/notification";
import { add as addToast } from "core/toast";

// core/src/toyHost.ts
var ToyFrame = class {
  constructor(spec, opts) {
    this.spec = spec;
    this.opts = opts;
    __publicField(this, "el");
    __publicField(this, "ready", false);
    __publicField(this, "queue", []);
    __publicField(this, "onMessage", (e) => this.handle(e));
    var _a;
    const f = document.createElement("iframe");
    f.className = "toy";
    f.title = (_a = spec.label) != null ? _a : spec.id;
    f.setAttribute("sandbox", "allow-scripts");
    f.setAttribute("allow", "autoplay");
    f.setAttribute("referrerpolicy", "no-referrer");
    if (spec.html != null) {
      f.srcdoc = prepareToyHtml(spec.html, opts.sdkUrl, opts.lockdown !== false);
    } else if (spec.toy) {
      f.src = new URL(spec.toy, opts.baseUrl).href;
    }
    this.el = f;
    window.addEventListener("message", this.onMessage);
  }
  /** Send a message to the toy (queued until the toy says it's ready). */
  post(msg) {
    var _a;
    if (!this.ready) {
      this.queue.push(msg);
      return;
    }
    (_a = this.el.contentWindow) == null ? void 0 : _a.postMessage({ toybox: 1, ...msg }, "*");
  }
  destroy() {
    window.removeEventListener("message", this.onMessage);
    this.el.remove();
  }
  handle(e) {
    var _a, _b, _c;
    if (e.source !== this.el.contentWindow) return;
    const d = e.data;
    if (!d || d.toybox !== 1 || typeof d.type !== "string") return;
    const msg = sanitize(d);
    if (!msg) return;
    if (msg.type === "ready") {
      this.ready = true;
      const s = this.spec;
      this.post({
        type: "init",
        params: (_a = s.params) != null ? _a : {},
        cue: { id: s.id, start: (_b = s.start) != null ? _b : 0, end: (_c = s.end) != null ? _c : 0 },
        hasVideo: this.opts.hasVideo,
        theme: this.opts.theme
      });
      for (const m of this.queue.splice(0)) this.post(m);
    }
    this.opts.emit(msg, this.spec);
  }
};
function sanitize(d) {
  switch (d.type) {
    case "ready":
    case "pause":
    case "play":
      return { type: d.type };
    case "seek":
      return Number.isFinite(d.time) ? { type: "seek", time: Number(d.time) } : null;
    case "complete":
      return { type: "complete", result: d.result };
    case "log":
      return { type: "log", data: d.data };
    case "resize":
      return Number.isFinite(d.height) && d.height > 0 ? { type: "resize", height: Math.min(Number(d.height), 4e3) } : null;
    default:
      return null;
  }
}
function toyCsp(sdkUrl) {
  return [
    "default-src 'none'",
    `script-src 'unsafe-inline' ${sdkUrl}`,
    "style-src 'unsafe-inline'",
    "img-src data: blob:",
    "media-src data: blob:",
    "font-src data:",
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'"
  ].join("; ");
}
function prepareToyHtml(html, sdkUrl, lockdown = true) {
  const sdkTag = `<script src="${sdkUrl}"><\/script>`;
  let out = /toybox-sdk\.js/.test(html) ? html.replace(/(["'])[^"']*toybox-sdk\.js\1/g, `"${sdkUrl}"`) : html;
  const head = (lockdown ? `<meta http-equiv="Content-Security-Policy" content="${toyCsp(sdkUrl)}">` : "") + (/toybox-sdk\.js/.test(html) ? "" : sdkTag);
  if (/<head[^>]*>/i.test(out)) return out.replace(/<head[^>]*>/i, (m) => m + head);
  if (/<html[^>]*>/i.test(out)) return out.replace(/<html[^>]*>/i, (m) => m + "<head>" + head + "</head>");
  return head + out;
}

// core/src/theme.ts
var THEMES = {
  toybox: {
    id: "toybox",
    name: "ToyBox (dark)",
    mode: "dark",
    font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    page: "#0b0f17",
    surface: "#0b1020",
    surfaceAlt: "#070b17",
    text: "#e5e7eb",
    muted: "#94a3b8",
    border: "rgba(255, 255, 255, 0.15)",
    grid: "#1a223c",
    primary: "#1e3a8a",
    onPrimary: "#ffffff",
    accent: "#f59e0b",
    link: "#7aa2ff",
    success: "#4ade80",
    warning: "#f59e0b",
    danger: "#f87171",
    palette: ["#f59e0b", "#22d3ee", "#f472b6", "#a78bfa", "#4ade80", "#60a5fa"],
    radius: "16px",
    buttonRadius: "999px",
    shadow: "0 12px 40px rgba(0, 0, 0, 0.65)",
    band: "#121826",
    onBand: "#e5e7eb",
    promptNotes: "Dark, playful lab style: deep navy cards, light text, bright accent colours for data, rounded pill buttons."
  },
  solent: {
    id: "solent",
    name: "Solent University",
    mode: "light",
    font: '"PT Sans", "Open Sans", Calibri, "Trebuchet MS", sans-serif',
    fontFaces: [
      { family: "PT Sans", weight: "400", url: "fonts/pt-sans-400.woff2" },
      { family: "PT Sans", weight: "700", url: "fonts/pt-sans-700.woff2" }
    ],
    page: "#ced4da",
    surface: "#ffffff",
    surfaceAlt: "#f8f9fa",
    text: "#1d2125",
    muted: "#6a737b",
    border: "#dee2e6",
    grid: "#e9ecef",
    primary: "#425b6c",
    onPrimary: "#ffffff",
    accent: "#b0111f",
    link: "#175d82",
    success: "#357a32",
    warning: "#b45309",
    danger: "#ca3120",
    // Solent brand colours that stay readable on white.
    palette: ["#b0111f", "#175d82", "#1c8276", "#9243f4", "#ff4d00", "#3f4254"],
    radius: "8px",
    buttonRadius: "8px",
    shadow: "0 2px 8px rgba(63, 66, 84, 0.18)",
    band: "#3f4254",
    onBand: "#f8f9fa",
    promptNotes: [
      "Match Solent University (Solent Online Learning):",
      "- Clean, light and accessible. White cards with a 1px light-grey border and 8px corners; plenty of white space.",
      "- PT Sans for everything. Headings bold and in sentence case; body text plain, friendly UK English.",
      "- Navy (#3F4254) for headings, title bands and strong text. Slate blue (#425B6C) buttons with white text.",
      "- Solent red (#B0111F) is the brand highlight: use it sparingly for the one thing to notice (a target, a key number, a focus ring), never for big backgrounds.",
      "- For several data series use the palette in order: red, sea blue (#175D82), teal (#1C8276), purple, orange, navy.",
      "- No gradients, glows, neon or emoji-heavy decoration. Simple line icons only."
    ].join("\n")
  }
};
function themeVars(t) {
  const v = {
    "--tb-font": t.font,
    "--tb-page": t.page,
    "--tb-surface": t.surface,
    "--tb-surface-alt": t.surfaceAlt,
    "--tb-text": t.text,
    "--tb-muted": t.muted,
    "--tb-border": t.border,
    "--tb-grid": t.grid,
    "--tb-primary": t.primary,
    "--tb-on-primary": t.onPrimary,
    "--tb-accent": t.accent,
    "--tb-link": t.link,
    "--tb-success": t.success,
    "--tb-warning": t.warning,
    "--tb-danger": t.danger,
    "--tb-radius": t.radius,
    "--tb-button-radius": t.buttonRadius,
    "--tb-shadow": t.shadow,
    "--tb-band": t.band,
    "--tb-on-band": t.onBand
  };
  t.palette.forEach((c, i) => v[`--tb-c${i + 1}`] = c);
  return v;
}
function applyTheme(t, el2 = document.documentElement) {
  var _a, _b;
  for (const [k, val] of Object.entries(themeVars(t))) el2.style.setProperty(k, val);
  el2.dataset.tbTheme = t.id;
  el2.dataset.tbMode = t.mode;
  el2.style.colorScheme = t.mode;
  if (((_a = t.fontFaces) == null ? void 0 : _a.length) && el2 === document.documentElement) {
    const id = "tb-theme-fonts";
    (_b = document.getElementById(id)) == null ? void 0 : _b.remove();
    const style = document.createElement("style");
    style.id = id;
    style.textContent = t.fontFaces.map((f) => {
      var _a2;
      return `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:${(_a2 = f.style) != null ? _a2 : "normal"};font-display:swap;src:url("${f.url}")}`;
    }).join("\n");
    document.head.appendChild(style);
  }
}
var fontCache = /* @__PURE__ */ new Map();
async function resolveThemeFonts(t, baseUrl) {
  var _a;
  if (!((_a = t.fontFaces) == null ? void 0 : _a.length)) return t;
  const faces = await Promise.all(
    t.fontFaces.map(async (f) => {
      if (f.url.startsWith("data:")) return f;
      const abs = new URL(f.url, baseUrl).href;
      if (!fontCache.has(abs)) {
        fontCache.set(
          abs,
          fetch(abs).then((r) => r.ok ? r.blob() : Promise.reject()).then(
            (blob) => new Promise((res, rej) => {
              const fr = new FileReader();
              fr.onload = () => res(String(fr.result));
              fr.onerror = rej;
              fr.readAsDataURL(blob);
            })
          ).catch(() => null)
        );
      }
      const data = await fontCache.get(abs);
      return data ? { ...f, url: data } : null;
    })
  );
  return { ...t, fontFaces: faces.filter(Boolean) };
}
function toHex(c) {
  const m = c.trim().match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i);
  if (!m) return c.trim();
  if (m[4] !== void 0 && parseFloat(m[4]) < (m[4].endsWith("%") ? 100 : 1)) return c.trim();
  return "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
}
function themeFromPage(base = THEMES.toybox) {
  var _a, _b;
  const root = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  const v = (...names) => {
    var _a2;
    return (_a2 = names.map((n) => root.getPropertyValue(n).trim()).find(Boolean)) != null ? _a2 : "";
  };
  const probe = (cls, prop) => {
    const el2 = document.createElement(cls.startsWith("a") ? "a" : "div");
    el2.className = cls.replace(/^a\./, "");
    if (cls.startsWith("a")) el2.setAttribute("href", "#");
    el2.style.position = "absolute";
    el2.style.visibility = "hidden";
    document.body.appendChild(el2);
    const out = getComputedStyle(el2).getPropertyValue(prop);
    el2.remove();
    return out;
  };
  const primary = toHex(v("--bs-primary", "--primary") || probe("btn btn-primary", "background-color") || base.primary);
  const family = body.fontFamily.split(",")[0].replace(/["']/g, "").trim();
  const faces = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const r of Array.from(rules)) {
      if (!(r instanceof CSSFontFaceRule)) continue;
      const fam = r.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
      const src = (_a = r.style.getPropertyValue("src").match(/url\(["']?([^"')]+)["']?\)/)) == null ? void 0 : _a[1];
      if (fam === family && src && faces.length < 4) {
        const url = new URL(src, (_b = sheet.href) != null ? _b : location.href);
        if (url.origin === location.origin) faces.push({ family: fam, weight: r.style.getPropertyValue("font-weight") || "400", url: url.href });
      }
    }
  }
  const text = toHex(body.color || base.text);
  const pageBg = body.backgroundColor && body.backgroundColor !== "rgba(0, 0, 0, 0)" ? body.backgroundColor : "#ffffff";
  const success = toHex(v("--bs-success", "--success") || base.success);
  const info = toHex(v("--bs-info", "--info") || base.link);
  const danger = toHex(v("--bs-danger", "--danger") || base.danger);
  const warning = toHex(v("--bs-warning", "--warning") || base.warning);
  const link = toHex(probe("a.", "color") || primary);
  const palette = [];
  for (const c of [primary, danger, success, info, warning, link, ...base.palette].map(toHex)) {
    if (!palette.some((p) => p.toLowerCase() === c.toLowerCase()) && palette.length < 6) palette.push(c);
  }
  return {
    id: "site",
    name: "This site",
    mode: "light",
    font: body.fontFamily || base.font,
    fontFaces: faces,
    page: v("--bs-gray-200", "--gray-200") || "#e9ecef",
    surface: toHex(pageBg),
    surfaceAlt: v("--bs-light", "--light") || "#f8f9fa",
    text,
    muted: v("--bs-secondary-color", "--bs-gray-600", "--gray-600") || "#6c757d",
    border: v("--bs-border-color", "--gray-300") || "#dee2e6",
    grid: v("--bs-gray-200", "--gray-200") || "#e9ecef",
    primary,
    onPrimary: toHex(probe("btn btn-primary", "color") || "#ffffff"),
    accent: danger,
    link,
    success,
    warning,
    danger,
    palette,
    radius: v("--bs-border-radius-lg", "--bs-border-radius") || "8px",
    buttonRadius: v("--bs-border-radius") || "6px",
    shadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    band: v("--bs-dark", "--dark") || "#343a40",
    onBand: "#ffffff",
    promptNotes: `Match this learning site: font ${family || "system"}, buttons in ${primary} with ${"white"} text, text ${text}, links ${link}. Light, clean cards with rounded corners. Use the brand colour sparingly for highlights.`
  };
}

// core/src/player.ts
var ToyBoxPlayer = class {
  constructor(container, opts = {}) {
    this.opts = opts;
    __publicField(this, "root");
    __publicField(this, "video");
    __publicField(this, "overlay");
    __publicField(this, "markers");
    __publicField(this, "scrub");
    __publicField(this, "timeLabel");
    __publicField(this, "playBtn");
    __publicField(this, "cues", []);
    __publicField(this, "baseUrl", location.href);
    __publicField(this, "active", /* @__PURE__ */ new Map());
    __publicField(this, "lastTimePost", 0);
    __publicField(this, "sdkUrl");
    var _a;
    this.sdkUrl = (_a = opts.sdkUrl) != null ? _a : new URL("toybox-sdk.js", document.baseURI).href;
    container.innerHTML = `
      <div class="tb-player">
        <div class="tb-stage">
          <video playsinline preload="auto"></video>
          <div class="tb-overlay"></div>
        </div>
        <div class="tb-controls">
          <button class="tb-play" aria-label="Play">\u25B6</button>
          <div class="tb-track">
            <div class="tb-markers"></div>
            <input class="tb-scrub" type="range" min="0" max="1000" value="0" aria-label="Seek" />
          </div>
          <span class="tb-time">0:00 / 0:00</span>
          <button class="tb-fs" aria-label="Fullscreen">\u26F6</button>
        </div>
      </div>`;
    const q = (s) => container.querySelector(s);
    this.root = q(".tb-player");
    this.video = q("video");
    this.overlay = q(".tb-overlay");
    this.markers = q(".tb-markers");
    this.scrub = q(".tb-scrub");
    this.timeLabel = q(".tb-time");
    this.playBtn = q(".tb-play");
    if (opts.theme) applyTheme(opts.theme, this.root);
    this.wireControls(q(".tb-fs"));
    this.startClock();
  }
  async loadLesson(url) {
    const abs = new URL(url, location.href).href;
    const res = await fetch(abs);
    if (!res.ok) throw new Error(`Couldn't load lesson ${url} (${res.status})`);
    const lesson = await res.json();
    this.setLesson(lesson, abs);
    return lesson;
  }
  setLesson(lesson, baseUrl = location.href) {
    this.baseUrl = baseUrl;
    const src = new URL(lesson.video, baseUrl).href;
    if (this.video.src !== src) this.video.src = src;
    if (lesson.poster) this.video.poster = new URL(lesson.poster, baseUrl).href;
    this.setCues(lesson.cues);
  }
  /** Replace the cue list (used live by the playground). */
  /** Switch theme: restyles the controls and reloads visible toys with the new theme. */
  setTheme(theme) {
    this.opts.theme = theme;
    applyTheme(theme, this.root);
    this.setCues(this.cues);
  }
  setCues(cues) {
    for (const t of this.active.values()) t.destroy();
    this.active.clear();
    this.cues = [...cues].sort((a, b) => a.start - b.start);
    this.renderMarkers();
    this.sync();
  }
  play() {
    return this.video.play().catch(() => {
    });
  }
  pause() {
    this.video.pause();
  }
  seek(t) {
    const d = this.video.duration || Infinity;
    this.video.currentTime = Math.max(0, Math.min(t, d));
  }
  // ---- internals -------------------------------------------------------
  startClock() {
    const v = this.video;
    if (v.requestVideoFrameCallback) {
      const loop = () => {
        this.sync();
        v.requestVideoFrameCallback(loop);
      };
      v.requestVideoFrameCallback(loop);
      for (const ev of ["seeked", "pause", "loadedmetadata", "timeupdate"]) v.addEventListener(ev, () => this.sync());
    } else {
      const loop = () => {
        this.sync();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }
  sync() {
    const t = this.video.currentTime;
    for (const cue of this.cues) {
      const inside = t >= cue.start && t < cue.end;
      const mounted = this.active.get(cue.id);
      if (inside && !mounted) this.mount(cue);
      else if (!inside && mounted) {
        mounted.destroy();
        this.active.delete(cue.id);
      }
    }
    const now = performance.now();
    if (now - this.lastTimePost > 250) {
      this.lastTimePost = now;
      for (const toy of this.active.values()) {
        toy.post({ type: "time", time: t, duration: this.video.duration || 0, paused: this.video.paused });
      }
    }
    this.renderControls();
  }
  mount(cue) {
    const toy = new ToyFrame(cue, {
      baseUrl: this.baseUrl,
      sdkUrl: this.sdkUrl,
      hasVideo: true,
      lockdown: this.opts.lockdown,
      theme: this.opts.theme,
      emit: (m) => this.onToyMessage(m, cue)
    });
    const { x, y, w, h } = cue.rect;
    Object.assign(toy.el.style, { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });
    this.overlay.appendChild(toy.el);
    this.active.set(cue.id, toy);
    if (cue.pause && !this.video.paused) this.video.pause();
  }
  onToyMessage(msg, cue) {
    var _a, _b, _c, _d;
    switch (msg.type) {
      case "pause":
        this.pause();
        break;
      case "play":
        this.play();
        break;
      case "seek":
        this.seek(msg.time);
        break;
      case "complete":
        (_b = (_a = this.opts).onComplete) == null ? void 0 : _b.call(_a, { cueId: cue.id, label: cue.label, at: this.video.currentTime, result: msg.result });
        if (cue.resumeOnComplete) this.play();
        break;
      case "log":
        (_d = (_c = this.opts).onLog) == null ? void 0 : _d.call(_c, cue, msg.data);
        break;
    }
  }
  wireControls(fsBtn) {
    const v = this.video;
    this.playBtn.onclick = () => v.paused ? this.play() : this.pause();
    v.addEventListener("click", () => v.paused ? this.play() : this.pause());
    this.scrub.oninput = () => {
      if (v.duration) this.seek(Number(this.scrub.value) / 1e3 * v.duration);
    };
    v.addEventListener("loadedmetadata", () => this.renderMarkers());
    fsBtn.onclick = () => {
      var _a, _b;
      if (document.fullscreenElement) document.exitFullscreen();
      else (_b = (_a = this.root).requestFullscreen) == null ? void 0 : _b.call(_a);
    };
    this.root.tabIndex = 0;
    this.root.addEventListener("keydown", (e) => {
      if (e.target !== this.root) return;
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        v.paused ? this.play() : this.pause();
      } else if (e.key === "ArrowRight") this.seek(v.currentTime + 5);
      else if (e.key === "ArrowLeft") this.seek(v.currentTime - 5);
    });
  }
  renderControls() {
    const v = this.video;
    this.playBtn.textContent = v.paused ? "\u25B6" : "\u275A\u275A";
    this.playBtn.setAttribute("aria-label", v.paused ? "Play" : "Pause");
    if (v.duration && document.activeElement !== this.scrub) {
      this.scrub.value = String(Math.round(v.currentTime / v.duration * 1e3));
    }
    this.timeLabel.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration || 0)}`;
  }
  renderMarkers() {
    var _a;
    const d = this.video.duration;
    this.markers.innerHTML = "";
    if (!d) return;
    for (const c of this.cues) {
      const m = document.createElement("button");
      m.className = "tb-marker" + (c.pause ? " tb-marker--pause" : "");
      m.style.left = `${c.start / d * 100}%`;
      m.style.width = `${Math.max(0.3, Math.min(c.end, d) - c.start) / d * 100}%`;
      m.title = `${fmt(c.start)} \xB7 ${(_a = c.label) != null ? _a : c.id}`;
      m.onclick = () => this.seek(c.start);
      this.markers.appendChild(m);
    }
  }
};
function fmt(s) {
  if (!Number.isFinite(s)) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// core/src/standalone.ts
var RATIOS = {
  "16:9": "16 / 9",
  "4:3": "4 / 3",
  "1:1": "1 / 1",
  "3:4": "3 / 4"
};
var StandaloneToy = class {
  constructor(container, opts) {
    this.opts = opts;
    __publicField(this, "root");
    __publicField(this, "frame", null);
    this.root = document.createElement("div");
    this.root.className = "tb-standalone";
    container.replaceChildren(this.root);
  }
  /** Show (or replace) the toy. */
  show(spec, aspect = ((_a) => (_a = this.opts.aspect) != null ? _a : "16:9")()) {
    var _a2, _b;
    (_a2 = this.frame) == null ? void 0 : _a2.destroy();
    this.root.classList.toggle("tb-auto", aspect === "auto");
    this.root.style.aspectRatio = aspect === "auto" ? "" : RATIOS[aspect];
    const frame = new ToyFrame(spec, {
      baseUrl: (_b = this.opts.baseUrl) != null ? _b : location.href,
      sdkUrl: this.opts.sdkUrl,
      hasVideo: false,
      lockdown: this.opts.lockdown,
      theme: this.opts.theme,
      emit: (msg) => {
        var _a3, _b2, _c, _d;
        if (msg.type === "complete") (_b2 = (_a3 = this.opts).onComplete) == null ? void 0 : _b2.call(_a3, { cueId: spec.id, label: spec.label, at: 0, result: msg.result });
        else if (msg.type === "log") (_d = (_c = this.opts).onLog) == null ? void 0 : _d.call(_c, spec, msg.data);
        else if (msg.type === "resize" && aspect === "auto") frame.el.style.height = `${Math.ceil(msg.height)}px`;
      }
    });
    if (aspect === "auto") frame.el.style.height = "320px";
    this.root.appendChild(frame.el);
    this.frame = frame;
  }
  /** Use a different theme from the next show(). */
  setTheme(theme) {
    this.opts.theme = theme;
  }
  destroy() {
    var _a;
    (_a = this.frame) == null ? void 0 : _a.destroy();
    this.root.remove();
  }
};

// moodle/src/shared.ts
function readConfig(root) {
  var _a;
  const el2 = root.querySelector("script.mod-toybox-config");
  return JSON.parse((_a = el2 == null ? void 0 : el2.textContent) != null ? _a : "{}");
}
function fromServer(toys) {
  return toys.map((t) => {
    var _a;
    return { ...t, id: String(t.id), params: (_a = t.params) != null ? _a : {} };
  });
}
async function loadTheme(id, sdkUrl) {
  if (id === "auto" || !THEMES[id]) return resolveThemeFonts(themeFromPage(THEMES.solent), location.href);
  return resolveThemeFonts(THEMES[id], sdkUrl);
}
function el(tag, attrs = {}, ...kids) {
  const [name, ...classes] = tag.split(".");
  const node = document.createElement(name);
  if (classes.length) node.className = classes.join(" ");
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "text") node.textContent = String(v);
    else if (k.startsWith("on") && typeof v === "function") node[k] = v;
    else if (k in node && typeof v !== "string") node[k] = v;
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const kid of kids) if (kid != null && kid !== false) node.append(kid);
  return node;
}

// moodle/src/view.ts
var init = async (selector) => {
  const root = document.querySelector(selector);
  if (!root) return;
  const cfg = readConfig(root);
  const theme = await loadTheme(cfg.theme, cfg.sdkUrl);
  const toys = fromServer(cfg.toys);
  const finished = new Set(cfg.finished.map(String));
  let activityComplete = cfg.activityComplete;
  const mount = root.querySelector(".mod-toybox-stage");
  const save = (toyId, result) => {
    if (!cfg.canSubmit || !/^\d+$/.test(toyId)) return;
    Promise.resolve(
      Ajax.call([
        {
          methodname: "mod_toybox_record_result",
          args: { cmid: cfg.cmid, toyid: Number(toyId), result: JSON.stringify(result != null ? result : null) }
        }
      ])[0]
    ).then((r) => {
      if (r.activitycomplete && !activityComplete) {
        activityComplete = true;
        addToast(cfg.strings.activitycomplete, { type: "success" });
      }
    }).catch(Notification.exception);
  };
  if (cfg.mode === "toy") {
    const toy = toys[0];
    if (!toy) return;
    const status = el("p.mod-toybox-status", { "aria-live": "polite" });
    const host = new StandaloneToy(mount, {
      sdkUrl: cfg.sdkUrl,
      theme,
      aspect: cfg.aspect,
      onComplete: (rec) => {
        finished.add(toy.id);
        status.textContent = "\u2713 " + cfg.strings.finished;
        save(toy.id, rec.result);
      }
    });
    host.show(toy, cfg.aspect);
    if (finished.has(toy.id)) status.textContent = "\u2713 " + cfg.strings.finished;
    root.append(status);
    return;
  }
  if (!cfg.videoUrl) return;
  const list = el("ul.mod-toybox-progress");
  const renderList = () => {
    list.replaceChildren(
      ...toys.map(
        (t) => el(
          "li",
          { class: finished.has(t.id) ? "done" : "" },
          el(
            "button",
            { type: "button", onclick: () => player.seek(t.start), title: cfg.strings.jumpto },
            el("span.t", { text: fmt(t.start) }),
            t.label || cfg.strings.untitled,
            t.required ? null : el("span.opt", { text: cfg.strings.optional })
          )
        )
      )
    );
  };
  const player = new ToyBoxPlayer(mount, {
    sdkUrl: cfg.sdkUrl,
    theme,
    onComplete: (rec) => {
      finished.add(rec.cueId);
      renderList();
      save(rec.cueId, rec.result);
    }
  });
  player.setLesson({ title: "", video: cfg.videoUrl, cues: toys }, location.href);
  if (toys.length) {
    root.append(el("h3.mod-toybox-progress-title", { text: cfg.strings.toysinthisvideo }), list);
    renderList();
  }
};
export {
  init
};
