// This file is part of the ToyBox activity for Moodle (mod_toybox). GPL v3 or later.
// GENERATED from moodle/src/editor.ts and core/src by scripts/build-moodle.mjs. Do not edit by hand.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// moodle/src/editor.ts
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

// core/src/media.ts
function parseVideoUrl(url) {
  var _a, _b, _c, _d, _e;
  let u;
  try {
    u = new URL(url, location.href);
  } catch {
    return { kind: "file", url };
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (/^(youtube\.com|youtube-nocookie\.com|youtu\.be)$/.test(host)) {
    const id = host === "youtu.be" ? u.pathname.slice(1) : (_b = u.searchParams.get("v")) != null ? _b : (_a = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)) == null ? void 0 : _a[1];
    if (id && /^[\w-]{11}$/.test(id)) {
      const t = (_c = u.searchParams.get("t")) != null ? _c : u.searchParams.get("start");
      const start = t ? parseTime(t) : void 0;
      return { kind: "youtube", id, ...start ? { start } : {} };
    }
  }
  if (/^(vimeo\.com|player\.vimeo\.com)$/.test(host)) {
    const m = u.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([0-9a-f]+))?/);
    if (m) {
      const hash = (_e = (_d = m[2]) != null ? _d : u.searchParams.get("h")) != null ? _e : void 0;
      return { kind: "vimeo", id: m[1], ...hash ? { hash } : {} };
    }
  }
  return { kind: "file", url: u.href };
}
function parseTime(t) {
  var _a, _b, _c;
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  return m ? Number((_a = m[1]) != null ? _a : 0) * 3600 + Number((_b = m[2]) != null ? _b : 0) * 60 + Number((_c = m[3]) != null ? _c : 0) : 0;
}
function createMedia(url) {
  const v = parseVideoUrl(url);
  if (v.kind === "youtube") return new YouTubeMedia(v.id);
  if (v.kind === "vimeo") return new VimeoMedia(v.id, v.hash);
  return new FileMedia(v.url);
}
var FileMedia = class {
  constructor(src) {
    __publicField(this, "kind", "file");
    __publicField(this, "el");
    const v = document.createElement("video");
    v.className = "tb-media";
    v.playsInline = true;
    v.preload = "auto";
    v.src = src;
    this.el = v;
  }
  get currentTime() {
    return this.el.currentTime;
  }
  set currentTime(t) {
    this.el.currentTime = t;
  }
  get duration() {
    return this.el.duration;
  }
  get paused() {
    return this.el.paused;
  }
  get readyState() {
    return this.el.readyState;
  }
  get muted() {
    return this.el.muted;
  }
  set muted(m) {
    this.el.muted = m;
  }
  play() {
    return this.el.play().catch(() => {
    });
  }
  pause() {
    this.el.pause();
  }
  addEventListener(type, fn) {
    this.el.addEventListener(type, fn);
  }
  removeEventListener(type, fn) {
    this.el.removeEventListener(type, fn);
  }
  destroy() {
    this.el.removeAttribute("src");
    this.el.load();
    this.el.remove();
  }
};
var EmbedMedia = class {
  constructor() {
    __publicField(this, "el");
    __publicField(this, "target");
    __publicField(this, "events", new EventTarget());
    __publicField(this, "listeners", /* @__PURE__ */ new Map());
    __publicField(this, "time", 0);
    __publicField(this, "stamp", 0);
    __publicField(this, "playing", false);
    __publicField(this, "stalled", false);
    __publicField(this, "dur", NaN);
    __publicField(this, "ready", false);
    __publicField(this, "isMuted", false);
    this.el = document.createElement("div");
    this.el.className = "tb-media tb-embed";
    this.target = document.createElement("div");
    this.el.appendChild(this.target);
  }
  get currentTime() {
    if (!this.playing || this.stalled) return this.time;
    const t = this.time + (performance.now() - this.stamp) / 1e3;
    return Number.isFinite(this.dur) ? Math.min(t, this.dur) : t;
  }
  set currentTime(t) {
    this.report(t);
    this.seekTo(t);
  }
  get duration() {
    return this.dur;
  }
  get paused() {
    return !this.playing;
  }
  get readyState() {
    return this.ready && Number.isFinite(this.dur) ? 1 : 0;
  }
  get muted() {
    return this.isMuted;
  }
  set muted(m) {
    this.isMuted = m;
    this.setMuted(m);
  }
  play() {
    this.doPlay();
    return Promise.resolve();
  }
  pause() {
    if (this.playing) {
      this.report(this.currentTime);
      this.playing = false;
      this.emit("pause");
    }
    this.doPause();
  }
  addEventListener(type, fn) {
    const l = () => fn();
    this.listeners.set(fn, l);
    this.events.addEventListener(type, l);
  }
  removeEventListener(type, fn) {
    const l = this.listeners.get(fn);
    if (l) this.events.removeEventListener(type, l);
  }
  destroy() {
    this.el.remove();
  }
  // ---- for subclasses
  emit(type) {
    this.events.dispatchEvent(new Event(type));
  }
  /** The provider told us the time. */
  report(t) {
    this.time = t;
    this.stamp = performance.now();
  }
  setPlaying(p) {
    if (p === this.playing) return;
    this.report(this.currentTime);
    this.playing = p;
    this.emit(p ? "play" : "pause");
  }
  setStalled(s) {
    if (s === this.stalled) return;
    this.report(this.currentTime);
    this.stalled = s;
  }
  setDuration(d) {
    if (!(d > 0) || d === this.dur) return;
    this.dur = d;
    this.emit("durationchange");
    if (this.ready) this.emit("loadedmetadata");
  }
  markReady() {
    this.ready = true;
    if (Number.isFinite(this.dur)) this.emit("loadedmetadata");
  }
};
var scripts = /* @__PURE__ */ new Map();
function loadScript(src) {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Couldn't load ${src}`));
        document.head.appendChild(s);
      })
    );
  }
  return scripts.get(src);
}
var ytReady = null;
function loadYouTubeApi() {
  var _a;
  const w = window;
  if ((_a = w.YT) == null ? void 0 : _a.Player) return Promise.resolve(w.YT);
  ytReady != null ? ytReady : ytReady = new Promise((resolve, reject) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev == null ? void 0 : prev();
      resolve(w.YT);
    };
    loadScript("https://www.youtube.com/iframe_api").catch(reject);
  });
  return ytReady;
}
var YouTubeMedia = class extends EmbedMedia {
  constructor(videoId) {
    super();
    this.videoId = videoId;
    __publicField(this, "kind", "youtube");
    __publicField(this, "yt", null);
    __publicField(this, "poll", 0);
    __publicField(this, "pending", []);
    loadYouTubeApi().then((YT) => {
      this.yt = new YT.Player(this.target, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,
          // ToyBox draws its own controls
          disablekb: 1,
          fs: 0,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          modestbranding: 1,
          enablejsapi: 1,
          origin: location.origin
        },
        events: {
          onReady: () => {
            var _a, _b, _c;
            this.setDuration((_c = (_b = (_a = this.yt).getDuration) == null ? void 0 : _b.call(_a)) != null ? _c : NaN);
            this.markReady();
            for (const fn of this.pending.splice(0)) fn();
          },
          onStateChange: (e) => this.onState(e.data)
        }
      });
    }).catch(() => this.emit("error"));
  }
  call(fn) {
    if (this.ready) fn();
    else this.pending.push(fn);
  }
  onState(s) {
    var _a, _b, _c;
    this.setDuration((_c = (_b = (_a = this.yt).getDuration) == null ? void 0 : _b.call(_a)) != null ? _c : NaN);
    if (s === 1 || s === 3) {
      this.report(this.yt.getCurrentTime());
      this.setStalled(s === 3);
      this.setPlaying(true);
      this.startPolling();
    } else if (s === 2 || s === 0) {
      this.report(this.yt.getCurrentTime());
      this.setPlaying(false);
      this.stopPolling();
      if (s === 0) this.emit("ended");
    }
  }
  startPolling() {
    if (this.poll) return;
    this.poll = window.setInterval(() => {
      var _a;
      if (!((_a = this.yt) == null ? void 0 : _a.getCurrentTime)) return;
      this.report(this.yt.getCurrentTime());
      this.emit("timeupdate");
    }, 250);
  }
  stopPolling() {
    clearInterval(this.poll);
    this.poll = 0;
  }
  seekTo(t) {
    this.call(() => {
      this.yt.seekTo(t, true);
      setTimeout(() => this.emit("seeked"), 150);
    });
  }
  doPlay() {
    this.call(() => this.yt.playVideo());
  }
  doPause() {
    this.call(() => this.yt.pauseVideo());
  }
  setMuted(m) {
    this.call(() => m ? this.yt.mute() : this.yt.unMute());
  }
  destroy() {
    var _a;
    this.stopPolling();
    try {
      (_a = this.yt) == null ? void 0 : _a.destroy();
    } catch {
    }
    super.destroy();
  }
};
var VIMEO_API = "https://player.vimeo.com/api/player.js";
var vimeoReady = null;
function loadVimeoApi() {
  var _a;
  const w = window;
  if ((_a = w.Vimeo) == null ? void 0 : _a.Player) return Promise.resolve(w.Vimeo.Player);
  vimeoReady != null ? vimeoReady : vimeoReady = typeof w.define === "function" && w.define.amd && typeof w.require === "function" ? new Promise((resolve, reject) => w.require([VIMEO_API], (Player) => {
    var _a2;
    return resolve(Player != null ? Player : (_a2 = w.Vimeo) == null ? void 0 : _a2.Player);
  }, reject)) : loadScript(VIMEO_API).then(() => w.Vimeo.Player);
  return vimeoReady;
}
var VimeoMedia = class extends EmbedMedia {
  constructor(videoId, hash) {
    super();
    this.videoId = videoId;
    this.hash = hash;
    __publicField(this, "kind", "vimeo");
    __publicField(this, "vp", null);
    __publicField(this, "pending", []);
    loadVimeoApi().then((VimeoPlayer) => {
      const opts = { controls: false, dnt: true, playsinline: true, title: false, byline: false, portrait: false };
      if (hash) opts.url = `https://vimeo.com/${videoId}/${hash}`;
      else opts.id = Number(videoId);
      this.vp = new VimeoPlayer(this.target, opts);
      this.vp.on("loaded", () => {
        this.vp.getDuration().then((d) => {
          this.setDuration(d);
          this.markReady();
          for (const fn of this.pending.splice(0)) fn();
        });
      });
      this.vp.on("play", (d) => {
        var _a;
        this.report((_a = d == null ? void 0 : d.seconds) != null ? _a : this.currentTime);
        this.setPlaying(true);
      });
      this.vp.on("pause", (d) => {
        var _a;
        this.report((_a = d == null ? void 0 : d.seconds) != null ? _a : this.currentTime);
        this.setPlaying(false);
      });
      this.vp.on("ended", () => {
        this.setPlaying(false);
        this.emit("ended");
      });
      this.vp.on("timeupdate", (d) => {
        this.report(d.seconds);
        this.setDuration(d.duration);
        this.emit("timeupdate");
      });
      this.vp.on("seeked", (d) => {
        this.report(d.seconds);
        this.emit("seeked");
      });
      this.vp.on("bufferstart", () => this.setStalled(true));
      this.vp.on("bufferend", () => this.setStalled(false));
    }).catch(() => this.emit("error"));
  }
  call(fn) {
    if (this.ready) fn();
    else this.pending.push(fn);
  }
  seekTo(t) {
    this.call(() => this.vp.setCurrentTime(t).catch(() => {
    }));
  }
  doPlay() {
    this.call(() => this.vp.play().catch(() => {
    }));
  }
  doPause() {
    this.call(() => this.vp.pause().catch(() => {
    }));
  }
  setMuted(m) {
    this.call(() => this.vp.setMuted(m).catch(() => {
    }));
  }
  destroy() {
    var _a;
    (_a = this.vp) == null ? void 0 : _a.destroy().catch(() => {
    });
    super.destroy();
  }
};

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
function themePromptSection(t) {
  const vars = themeVars(t);
  return [
    "## Look and feel",
    t.promptNotes,
    "",
    "Use the ToyBox theme variables (already set for you inside the toy) instead of hard-coded colours, with these values as fallbacks:",
    "```css",
    ...Object.entries(vars).map(([k, v]) => `${k}: ${v};`),
    "```"
  ].join("\n");
}

// core/src/player.ts
var ToyBoxPlayer = class {
  constructor(container, opts = {}) {
    this.opts = opts;
    __publicField(this, "root");
    /** The current video source (null until a lesson is set). */
    __publicField(this, "media", null);
    __publicField(this, "mediaSrc", "");
    __publicField(this, "stage");
    __publicField(this, "shield");
    __publicField(this, "overlay");
    __publicField(this, "looping", false);
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
          <div class="tb-shield"></div>
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
    this.stage = q(".tb-stage");
    this.shield = q(".tb-shield");
    this.overlay = q(".tb-overlay");
    this.markers = q(".tb-markers");
    this.scrub = q(".tb-scrub");
    this.timeLabel = q(".tb-time");
    this.playBtn = q(".tb-play");
    if (opts.theme) applyTheme(opts.theme, this.root);
    this.wireControls(q(".tb-fs"));
  }
  /** The video source; kept as `video` for older callers. */
  get video() {
    var _a;
    return (_a = this.media) != null ? _a : EMPTY_MEDIA;
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
    var _a;
    this.baseUrl = baseUrl;
    const src = new URL(lesson.video, baseUrl).href;
    if (this.mediaSrc !== src) this.setMedia(createMedia(src), src);
    if (lesson.poster && ((_a = this.media) == null ? void 0 : _a.el) instanceof HTMLVideoElement) this.media.el.poster = new URL(lesson.poster, baseUrl).href;
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
    var _a, _b;
    return (_b = (_a = this.media) == null ? void 0 : _a.play()) != null ? _b : Promise.resolve();
  }
  pause() {
    var _a;
    (_a = this.media) == null ? void 0 : _a.pause();
  }
  seek(t) {
    if (!this.media) return;
    const d = this.media.duration || Infinity;
    this.media.currentTime = Math.max(0, Math.min(t, d));
    this.sync();
  }
  /** Stop and remove the video and toys (e.g. when the player leaves the page). */
  destroy() {
    var _a;
    for (const t of this.active.values()) t.destroy();
    this.active.clear();
    (_a = this.media) == null ? void 0 : _a.destroy();
    this.media = null;
    this.root.remove();
  }
  // ---- internals -------------------------------------------------------
  setMedia(media, src) {
    var _a;
    (_a = this.media) == null ? void 0 : _a.destroy();
    this.media = media;
    this.mediaSrc = src;
    this.root.dataset.media = media.kind;
    this.stage.insertBefore(media.el, this.shield);
    for (const ev of ["seeked", "pause", "loadedmetadata", "durationchange", "timeupdate", "ended"]) media.addEventListener(ev, () => this.sync());
    media.addEventListener("loadedmetadata", () => this.renderMarkers());
    media.addEventListener("durationchange", () => this.renderMarkers());
    media.addEventListener("play", () => this.startLoop());
    if (!media.paused) this.startLoop();
    this.sync();
  }
  /**
   * Runs sync() every frame while the video plays (and stops when it pauses, so
   * idle players on a course page cost nothing). Uses requestVideoFrameCallback
   * for video files, so toys appear on the exact frame.
   */
  startLoop() {
    var _a;
    if (this.looping) return;
    this.looping = true;
    const v = (_a = this.media) == null ? void 0 : _a.el;
    const next = (fn) => (v == null ? void 0 : v.requestVideoFrameCallback) ? v.requestVideoFrameCallback(fn) : requestAnimationFrame(fn);
    const tick = () => {
      this.sync();
      if (this.media && !this.media.paused) next(tick);
      else this.looping = false;
    };
    next(tick);
  }
  sync() {
    const m = this.media;
    if (!m) return;
    const t = m.currentTime;
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
        toy.post({ type: "time", time: t, duration: m.duration || 0, paused: m.paused });
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
    if (cue.pause && this.media && !this.media.paused) this.media.pause();
  }
  onToyMessage(msg, cue) {
    var _a, _b, _c, _d, _e, _f;
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
        (_d = (_c = this.opts).onComplete) == null ? void 0 : _d.call(_c, { cueId: cue.id, label: cue.label, at: (_b = (_a = this.media) == null ? void 0 : _a.currentTime) != null ? _b : 0, result: msg.result });
        if (cue.resumeOnComplete) this.play();
        break;
      case "log":
        (_f = (_e = this.opts).onLog) == null ? void 0 : _f.call(_e, cue, msg.data);
        break;
    }
  }
  wireControls(fsBtn) {
    const toggle = () => this.video.paused ? this.play() : this.pause();
    this.playBtn.onclick = toggle;
    this.shield.addEventListener("click", toggle);
    this.scrub.oninput = () => {
      if (this.video.duration) this.seek(Number(this.scrub.value) / 1e3 * this.video.duration);
    };
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
        toggle();
      } else if (e.key === "ArrowRight") this.seek(this.video.currentTime + 5);
      else if (e.key === "ArrowLeft") this.seek(this.video.currentTime - 5);
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
var EMPTY_MEDIA = {
  kind: "file",
  el: document.createElement("div"),
  currentTime: 0,
  duration: NaN,
  paused: true,
  readyState: 0,
  muted: false,
  play: () => Promise.resolve(),
  pause: () => {
  },
  addEventListener: () => {
  },
  removeEventListener: () => {
  },
  destroy: () => {
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

// core/src/lint.ts
function lintToy(html, ctx = {}) {
  var _a;
  const out = [];
  const add = (level, message) => out.push({ level, message });
  const code = html != null ? html : "";
  if (!code.trim()) {
    add("error", "The toy is empty.");
    return out;
  }
  const kb = new Blob([code]).size / 1024;
  if (kb > 1024) add("error", `The toy is ${Math.round(kb)} KB. Keep it under 1 MB (embed fewer or smaller images).`);
  else if (kb > 300) add("warning", `The toy is ${Math.round(kb)} KB, which is large. It may be slow to load.`);
  if (!/<script/i.test(code)) add("warning", "There is no <script>, so the toy can\u2019t be interactive or report completion.");
  if (!/ToyBox\s*\./.test(code)) {
    add("warning", "The toy doesn\u2019t use the ToyBox SDK, so it can\u2019t receive settings or report that the learner finished.");
  } else {
    if (!/ToyBox\s*\.\s*complete\s*\(/.test(code))
      add("warning", "The toy never calls ToyBox.complete(\u2026), so it can\u2019t count towards activity completion.");
    if (!/ToyBox\s*\.\s*onInit\s*\(/.test(code))
      add("tip", "Wrap your setup in ToyBox.onInit(function (params) { \u2026 }) so educators can change its settings.");
  }
  const external = [...code.matchAll(/\b(?:src|href)\s*=\s*["'](https?:)?\/\/([^"'/]+)[^"']*["']/gi)].filter((m) => !/toybox-sdk\.js/.test(m[0])).map((m) => m[2]);
  if (external.length)
    add("error", `It loads files from the internet (${[...new Set(external)].join(", ")}). Toys can\u2019t do that: put the code/CSS inline and images as data: URLs.`);
  if (/@import\s+url\(\s*["']?https?:/i.test(code) || /url\(\s*["']?https?:/i.test(code))
    add("error", "Its CSS loads something from the internet (e.g. a web font). That\u2019s blocked; use system fonts.");
  if (/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/.test(code))
    add("error", "It tries to use the network (fetch / XMLHttpRequest / WebSocket). Toys run offline, so this is blocked.");
  if (/\b(alert|confirm|prompt)\s*\(/.test(code))
    add("error", "alert() / confirm() / prompt() pop-ups are blocked. Show messages inside the toy instead.");
  if (/\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/.test(code))
    add("error", "Browser storage (localStorage, cookies\u2026) isn\u2019t available to toys and will throw an error.");
  if (/\b(window\.top|parent\.document|top\.location|window\.open)\b/.test(code))
    add("error", "Toys can\u2019t reach the page around them or open windows.");
  if (/<form\b/i.test(code) && /\baction\s*=/i.test(code))
    add("warning", "Forms can\u2019t be submitted. Handle button clicks in JavaScript instead.");
  if (ctx.mode === "toy" && ctx.autoHeight && /100vh/.test(code))
    add("warning", "With \u201Cfit content\u201D sizing, don\u2019t use 100vh heights. Let the content set the height, or pick a fixed shape.");
  const hexes = new Set(((_a = code.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)) != null ? _a : []).map((h) => h.toLowerCase()));
  if (hexes.size >= 4 && !/var\(--tb-/.test(code))
    add("tip", `It uses ${hexes.size} fixed colours. Use the theme variables (var(--tb-primary), var(--tb-surface)\u2026 and ToyBox.color() on a canvas) so it matches your institution's look.`);
  if (/\b(width|height)\s*:\s*(\d{4,})px/.test(code))
    add("tip", "Some sizes are very large fixed pixels. Use %, vw/vh or flex/grid so the toy fits any screen.");
  return out;
}

// core/src/aiPrompt.ts
function guideWithTheme(guide, theme) {
  if (!theme) return guide;
  return `${guide.trim()}

---

# This institution's style (${theme.name})

${themePromptSection(theme).replace(/^## Look and feel\n/, "")}
`;
}
var mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
function buildAiPrompt(guide, ctx, theme) {
  var _a, _b, _c;
  const facts = [];
  if (ctx.mode === "toy") {
    facts.push("- Mode: **toy only** (no video). `ToyBox.hasVideo` will be false.");
    facts.push(
      ctx.aspect === "auto" ? "- Size: **fit content**. The page width is fixed by the course page; the height follows your content. Do not use 100vh." : `- Size: a **${(_a = ctx.aspect) != null ? _a : "16:9"}** box that scales with the screen. Fill it (height: 100vh is fine).`
    );
  } else {
    facts.push("- Mode: **on top of a video**. `ToyBox.hasVideo` will be true.");
    if (ctx.rect)
      facts.push(`- Box: ${ctx.rect.w}% \xD7 ${ctx.rect.h}% of the video frame (16:9), at ${ctx.rect.x}% from the left and ${ctx.rect.y}% from the top.`);
    if (ctx.start != null) facts.push(`- Appears at ${mmss(ctx.start)}${ctx.end != null ? `, until ${mmss(ctx.end)}` : ""}.`);
    facts.push(ctx.pause ? "- The video pauses while the toy is shown, and resumes when it calls ToyBox.complete()." : "- The video keeps playing while the toy is shown (keep it light and glanceable).");
  }
  if (ctx.params && Object.keys(ctx.params).length)
    facts.push("- Current settings (params):\n```json\n" + JSON.stringify(ctx.params, null, 2) + "\n```");
  let ask;
  if ((_b = ctx.existingHtml) == null ? void 0 : _b.trim()) {
    ask = [
      "## My current toy",
      "```html",
      ctx.existingHtml.trim(),
      "```",
      ((_c = ctx.issues) == null ? void 0 : _c.length) ? "\nThe ToyBox checker reported:\n" + ctx.issues.map((i) => `- (${i.level}) ${i.message}`).join("\n") : "",
      "",
      "## What I want changed",
      "[Describe what to fix or improve. If the checker found problems, ask for those to be fixed.]"
    ].join("\n");
  } else {
    ask = [
      "## What I want",
      "- Subject and level: [e.g. GCSE physics, first-year undergraduate statistics]",
      "- The idea the learner should *feel* by playing: [e.g. \u201Cdoubling the frequency halves the period\u201D]",
      "- What the learner does: [drag, slide, sort, build, predict, draw\u2026]",
      "- How it ends (what counts as done): [e.g. \u201Cmatches the target wave\u201D, \u201Canswers 3 questions\u201D]",
      "- Anything to avoid or include: [vocabulary, colours, accessibility needs]"
    ].join("\n");
  }
  return `${guide.trim()}

---

# My request

## This toy
${facts.join("\n")}
${theme ? "\n" + themePromptSection(theme) + "\n" : ""}
${ask}

Please reply with the complete toy as **one HTML file** in a single code block, then the settings JSON (params) in a second code block, then 2\u20133 sentences on how a learner uses it.
`;
}

// core/src/examples.ts
var STARTER = `<!doctype html>
<html>
<head>
  <script src="toybox-sdk.js"><\/script>
  <style>
    /* The --tb-\u2026 variables come from the ToyBox theme (your institution's colours and font). */
    body { margin: 0; font-family: var(--tb-font); color: var(--tb-text); }
    .card { height: 100vh; box-sizing: border-box; padding: 5%; background: var(--tb-surface);
            border: 1px solid var(--tb-border); border-radius: var(--tb-radius);
            display: flex; flex-direction: column; justify-content: center; gap: 6%; }
    h1 { margin: 0; font-size: 6vw; }
    input { width: 100%; accent-color: var(--tb-accent); }
    .ends { display: flex; justify-content: space-between; font-weight: 700; }
    button { align-self: start; padding: .5em 1.2em; border: 0; border-radius: var(--tb-button-radius);
             background: var(--tb-primary); color: var(--tb-on-primary); font: inherit; }
  </style>
</head>
<body>
  <div class="card">
    <h1 id="q"></h1>
    <input id="s" type="range" min="0" max="1" step="0.01" value="0.5" />
    <div class="ends"><span>0</span><span>1</span></div>
    <button id="go">Lock it in</button>
    <div id="fb"></div>
  </div>
  <script>
    // 1. Read the educator's params
    ToyBox.onInit(function (p) {
      document.getElementById('q').textContent = 'Where is ' + p.label + ' on the number line?';

      // 2. React to the learner
      document.getElementById('go').onclick = function () {
        var guess = Number(document.getElementById('s').value);
        var off = Math.abs(guess - p.value);
        document.getElementById('fb').textContent =
          off < 0.05 ? 'Spot on!' : 'You were ' + Math.round(off * 100) + '% away.';

        // 3. Tell the player you're done (it logs the result, and resumes the video)
        setTimeout(function () { ToyBox.complete({ guess: guess, error: off }); }, 1200);
      };
    });
  <\/script>
</body>
</html>`;
var BOX = { x: 20, y: 12, w: 60, h: 62 };
var EXAMPLES = [
  { file: "starter", name: "Blank starter (number line)", params: { label: "1/3", value: 0.3333 }, rect: BOX, pause: true },
  { file: "toys/wave-lab.html", name: "Wave Lab", params: { amplitude: 0.3, frequency: 1, target: { amplitude: 0.8, frequency: 3 } }, rect: { x: 6, y: 5, w: 88, h: 86 }, pause: true },
  { file: "toys/phase-lab.html", name: "Phase Lab", params: { frequency: 2, phase: 30, goal: "cancel" }, rect: { x: 8, y: 6, w: 84, h: 84 }, pause: true },
  { file: "toys/fourier-lab.html", name: "Fourier Lab", params: { harmonics: 12, startPreset: "square" }, rect: { x: 3, y: 3, w: 94, h: 91 }, pause: true },
  { file: "toys/fraction-builder.html", name: "Fraction builder", params: { numerator: 2, denominator: 5 }, rect: BOX, pause: true },
  {
    file: "toys/quiz.html",
    name: "Quiz",
    params: { question: "Which is bigger?", options: ["3/4", "5/8"], answer: 0, explain: "3/4 = 6/8.", rewatchAt: 0 },
    rect: { x: 22, y: 20, w: 56, h: 58 },
    pause: true
  },
  {
    file: "toys/fact-card.html",
    name: "Fact card",
    params: { emoji: "\u{1F355}", text: "8 slices? Each is 1/8 of the pizza.", more: "Eat 2 and you had 2/8 = 1/4." },
    rect: { x: 66, y: 5, w: 31, h: 24 },
    pause: false
  }
];

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

// moodle/src/editor.ts
var newCounter = 0;
var init = async (selector) => {
  const root = document.querySelector(selector);
  if (!root) return;
  const cfg = readConfig(root);
  const theme = await loadTheme(cfg.theme, cfg.sdkUrl);
  const S = cfg.strings;
  const isVideo = cfg.mode === "video";
  let toys = fromServer(cfg.toys);
  let current = 0;
  let aspect = cfg.aspect;
  let dirty = false;
  const blankToy = () => {
    var _a, _b;
    return {
      id: `new-${++newCounter}`,
      label: isVideo ? `${S.toy} ${toys.length + 1}` : S.toy,
      html: STARTER,
      params: { ...EXAMPLES[0].params },
      start: Math.floor((_a = player == null ? void 0 : player.video.currentTime) != null ? _a : 0),
      end: Math.floor((_b = player == null ? void 0 : player.video.currentTime) != null ? _b : 0) + 2,
      rect: { x: 20, y: 12, w: 60, h: 62 },
      pause: true,
      resumeOnComplete: true,
      required: true
    };
  };
  const status = el("span.mod-toybox-savestate", { text: S.allsaved });
  const saveBtn = el("button.btn.btn-primary", { type: "button", text: S.savechanges });
  const tabs = el("div.mod-toybox-tabs", { role: "tablist" });
  const fields = el("div.mod-toybox-fields");
  const stage = el("div.mod-toybox-preview");
  const lintList = el("ul.mod-toybox-lint");
  const out = el("pre.mod-toybox-out", { text: S.messageshelp });
  root.append(
    el("div.mod-toybox-editbar", {}, saveBtn, status),
    ...isVideo ? [tabs] : [],
    el(
      "div.mod-toybox-editor",
      {},
      fields,
      el(
        "div.mod-toybox-side",
        {},
        stage,
        el("div.mod-toybox-panel", {}, el("h4", { text: S.checker }), lintList),
        el("div.mod-toybox-panel", {}, el("h4", { text: S.messages }), out)
      )
    )
  );
  const log = [];
  const print = (s) => {
    log.unshift(s);
    out.textContent = log.slice(0, 30).join("\n");
  };
  let player = null;
  let standalone = null;
  if (isVideo) {
    player = new ToyBoxPlayer(stage, {
      sdkUrl: cfg.sdkUrl,
      theme,
      onComplete: (r) => print(`${fmt(r.at)}  complete  ${JSON.stringify(r.result)}`),
      onLog: (_c, d) => print(`log  ${JSON.stringify(d)}`)
    });
    if (cfg.videoUrl) {
      player.setLesson({ title: "", video: cfg.videoUrl, cues: [] }, location.href);
      if (parseVideoUrl(cfg.videoUrl).kind !== "file") stage.prepend(el("div.alert.alert-info.small", { text: S.onlinevideo }));
    } else stage.prepend(el("div.alert.alert-warning", { text: S.novideo }));
  } else {
    standalone = new StandaloneToy(stage, {
      sdkUrl: cfg.sdkUrl,
      theme,
      onComplete: (r) => print(`complete  ${JSON.stringify(r.result)}`),
      onLog: (_s, d) => print(`log  ${JSON.stringify(d)}`)
    });
  }
  if (!toys.length) toys.push(blankToy());
  function markDirty() {
    dirty = true;
    status.textContent = S.unsaved;
    status.classList.add("unsaved");
  }
  function preview() {
    const t = toys[current];
    if (!t) return;
    renderLint();
    if (standalone) {
      standalone.show(t, aspect);
    } else if (player) {
      player.setCues([t]);
      player.seek(Math.max(0, t.start - 0.75));
      player.play();
    }
    print(`--- ${S.previewing}: ${t.label || S.untitled}`);
  }
  function renderLint() {
    var _a;
    const t = toys[current];
    const issues = lintToy((_a = t == null ? void 0 : t.html) != null ? _a : "", { mode: cfg.mode, autoHeight: aspect === "auto" });
    lintList.replaceChildren(
      ...issues.length ? issues.map((i) => el("li", { class: i.level, text: i.message })) : [el("li.ok", { text: "\u2713 " + S.noproblems })]
    );
  }
  function renderTabs() {
    if (!isVideo) return;
    const sorted = toys.map((t, i) => ({ t, i })).sort((a, b) => a.t.start - b.t.start);
    tabs.replaceChildren(
      ...sorted.map(
        ({ t, i }) => el(
          "button",
          {
            type: "button",
            role: "tab",
            class: "btn " + (i === current ? "btn-primary" : "btn-outline-secondary"),
            "aria-selected": String(i === current),
            onclick: () => select(i)
          },
          el("span.t", { text: fmt(t.start) }),
          t.label || S.untitled
        )
      ),
      el("button.btn.btn-outline-primary", {
        type: "button",
        text: "+ " + S.addtoy,
        onclick: () => {
          toys.push(blankToy());
          markDirty();
          select(toys.length - 1);
        }
      })
    );
  }
  function select(i) {
    current = i;
    renderTabs();
    renderFields();
    preview();
  }
  function renderFields() {
    var _a, _b, _c;
    const t = toys[current];
    const input = (key, label, type, value, onchange, extra = {}) => {
      const id = `mod-toybox-f-${key}`;
      const inp = el("input.form-control", { id, type, value: String(value), ...extra });
      inp.oninput = () => {
        onchange(inp.value, inp);
        markDirty();
      };
      return el("div.mod-toybox-field", {}, el("label", { for: id, text: label }), inp);
    };
    const check = (key, label, value, onchange) => {
      const id = `mod-toybox-c-${key}`;
      const inp = el("input.form-check-input", { id, type: "checkbox", checked: value });
      inp.onchange = () => {
        onchange(inp.checked);
        markDirty();
      };
      return el("div.form-check", {}, inp, el("label.form-check-label", { for: id, text: label }));
    };
    const html = el("textarea.form-control.mod-toybox-code", {
      id: "mod-toybox-html",
      spellcheck: "false",
      wrap: "off",
      rows: 18
    });
    html.value = (_a = t.html) != null ? _a : "";
    let lintTimer = 0;
    html.oninput = () => {
      t.html = html.value;
      markDirty();
      clearTimeout(lintTimer);
      lintTimer = window.setTimeout(renderLint, 400);
    };
    html.onkeydown = (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        html.setRangeText("  ", html.selectionStart, html.selectionEnd, "end");
      }
    };
    const paramsErr = el("div.invalid-feedback.d-block");
    const params = el("textarea.form-control.mod-toybox-code", { id: "mod-toybox-params", spellcheck: "false", rows: 5 });
    params.value = JSON.stringify((_b = t.params) != null ? _b : {}, null, 2);
    params.oninput = () => {
      markDirty();
      try {
        t.params = JSON.parse(params.value || "{}");
        paramsErr.textContent = "";
        params.classList.remove("is-invalid");
      } catch (e) {
        paramsErr.textContent = `${S.badjson}: ${e.message}`;
        params.classList.add("is-invalid");
      }
    };
    const examples = el("select.custom-select.form-select", { "aria-label": S.startfrom });
    examples.append(el("option", { value: "", text: S.startfrom + "\u2026" }));
    for (const ex of EXAMPLES) examples.append(el("option", { value: ex.file, text: ex.name }));
    examples.onchange = async () => {
      var _a2;
      const ex = EXAMPLES.find((e) => e.file === examples.value);
      if (!ex) return;
      if (((_a2 = t.html) == null ? void 0 : _a2.trim()) && t.html !== STARTER && !window.confirm(S.replacecode)) {
        examples.value = "";
        return;
      }
      t.html = ex.file === "starter" ? STARTER : await (await fetch(cfg.pluginUrl + ex.file)).text();
      t.params = { ...ex.params };
      if (isVideo) {
        t.rect = { ...ex.rect };
        t.pause = ex.pause;
        t.resumeOnComplete = ex.pause;
      }
      if (!t.label || t.label.startsWith(S.toy)) t.label = ex.name;
      markDirty();
      renderTabs();
      renderFields();
      preview();
    };
    const aiBtn = el("button.btn.btn-outline-primary", { type: "button", text: "\u2728 " + S.copyaiprompt, title: S.copyaiprompt_help });
    aiBtn.onclick = async () => {
      var _a2, _b2;
      try {
        const guide = await (await fetch(cfg.guideUrl)).text();
        const fresh = !((_a2 = t.html) == null ? void 0 : _a2.trim()) || t.html.trim() === STARTER.trim();
        const prompt = buildAiPrompt(guide, {
          mode: cfg.mode,
          aspect,
          rect: t.rect,
          start: t.start,
          end: t.end,
          pause: t.pause,
          params: fresh ? void 0 : t.params,
          existingHtml: fresh ? void 0 : t.html,
          issues: fresh ? void 0 : lintToy((_b2 = t.html) != null ? _b2 : "", { mode: cfg.mode, autoHeight: aspect === "auto" })
        }, theme);
        await navigator.clipboard.writeText(prompt);
        addToast(S.promptcopied, { type: "success" });
      } catch (e) {
        Notification.alert(S.copyaiprompt, S.promptfailed);
      }
    };
    const rows = [
      el(
        "div.mod-toybox-row",
        {},
        input("label", S.toylabel, "text", (_c = t.label) != null ? _c : "", (v) => {
          t.label = v;
          renderTabs();
        }, { maxlength: 255 })
      )
    ];
    if (isVideo) {
      const startHere = el("button.btn.btn-sm.btn-outline-secondary", {
        type: "button",
        text: "\u23F1 " + S.starthere,
        title: S.starthere_help,
        onclick: () => {
          var _a2;
          const now = Math.round(((_a2 = player == null ? void 0 : player.video.currentTime) != null ? _a2 : 0) * 10) / 10;
          const len = Math.max(0.5, t.end - t.start);
          t.start = now;
          t.end = Math.round((now + len) * 10) / 10;
          markDirty();
          renderTabs();
          renderFields();
        }
      });
      rows.push(
        el(
          "div.mod-toybox-row.mod-toybox-grid",
          {},
          input("start", S.start, "number", t.start, (v) => {
            t.start = Number(v);
            renderTabs();
          }, { step: "0.1", min: "0" }),
          input("end", S.end, "number", t.end, (v) => t.end = Number(v), { step: "0.1", min: "0" }),
          el("div.mod-toybox-field.align-self-end", {}, startHere)
        ),
        el(
          "div.mod-toybox-row.mod-toybox-grid4",
          {},
          input("x", S.posx, "number", t.rect.x, (v) => t.rect.x = Number(v), { min: "0", max: "100" }),
          input("y", S.posy, "number", t.rect.y, (v) => t.rect.y = Number(v), { min: "0", max: "100" }),
          input("w", S.width, "number", t.rect.w, (v) => t.rect.w = Number(v), { min: "5", max: "100" }),
          input("h", S.height, "number", t.rect.h, (v) => t.rect.h = Number(v), { min: "5", max: "100" })
        ),
        el(
          "div.mod-toybox-row.mod-toybox-checks",
          {},
          check("pause", S.pausevideo, !!t.pause, (v) => t.pause = v),
          check("resume", S.resumeoncomplete, !!t.resumeOnComplete, (v) => t.resumeOnComplete = v),
          check("required", S.requiredtoy, !!t.required, (v) => {
            t.required = v;
            renderTabs();
          })
        )
      );
    } else {
      const shape = el("select.custom-select.form-select", { id: "mod-toybox-aspect" });
      for (const [v, label] of [
        ["16:9", S.aspect169],
        ["4:3", S.aspect43],
        ["1:1", S.aspect11],
        ["3:4", S.aspect34],
        ["auto", S.aspectauto]
      ])
        shape.append(el("option", { value: v, text: label, selected: v === aspect }));
      shape.onchange = () => {
        aspect = shape.value;
        markDirty();
        preview();
      };
      rows.push(
        el(
          "div.mod-toybox-row.mod-toybox-grid",
          {},
          el("div.mod-toybox-field", {}, el("label", { for: "mod-toybox-aspect", text: S.shape }), shape),
          el("div.mod-toybox-field.align-self-end", {}, check("required", S.requiredtoy, !!t.required, (v) => t.required = v))
        )
      );
    }
    rows.push(
      el(
        "div.mod-toybox-row.mod-toybox-ai",
        {},
        el("strong", { text: S.makewithai }),
        aiBtn,
        el("button.btn.btn-outline-secondary", {
          type: "button",
          text: S.downloadguide,
          title: S.downloadguide_help,
          onclick: async () => {
            const guide = guideWithTheme(await (await fetch(cfg.guideUrl)).text(), theme);
            const a = el("a", { href: URL.createObjectURL(new Blob([guide], { type: "text/markdown" })), download: "toybox-toy-guide.md" });
            document.body.append(a);
            a.click();
            setTimeout(() => a.remove(), 1e3);
          }
        }),
        examples
      ),
      el("div.mod-toybox-field", {}, el("label", { for: "mod-toybox-html", text: S.toycode }), html),
      el("div.mod-toybox-field", {}, el("label", { for: "mod-toybox-params", text: S.toyparams }), params, paramsErr),
      el(
        "div.mod-toybox-row",
        {},
        el("button.btn.btn-secondary", { type: "button", text: "\u25B6 " + S.preview, onclick: preview }),
        isVideo ? el("button.btn.btn-outline-danger", {
          type: "button",
          text: S.deletetoy,
          onclick: () => {
            if (!window.confirm(S.deletetoyconfirm)) return;
            toys.splice(current, 1);
            if (!toys.length) toys.push(blankToy());
            markDirty();
            select(Math.min(current, toys.length - 1));
          }
        }) : null
      )
    );
    fields.replaceChildren(...rows.filter(Boolean));
  }
  saveBtn.onclick = () => {
    const bad = toys.findIndex((t) => typeof t.params !== "object");
    if (bad >= 0) return select(bad);
    saveBtn.disabled = true;
    const payload = toys.map((t) => ({ ...t, id: /^\d+$/.test(t.id) ? Number(t.id) : 0 }));
    Promise.resolve(Ajax.call([{ methodname: "mod_toybox_save_toys", args: { cmid: cfg.cmid, aspect, toys: JSON.stringify(payload) } }])[0]).then((r) => {
      const keepIndex = current;
      toys = fromServer(JSON.parse(r.toys));
      if (!toys.length) toys.push(blankToy());
      current = Math.min(keepIndex, toys.length - 1);
      dirty = false;
      status.textContent = S.allsaved;
      status.classList.remove("unsaved");
      renderTabs();
      addToast(S.saved, { type: "success" });
    }).catch(Notification.exception).finally(() => saveBtn.disabled = false);
  };
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      preview();
    } else if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      saveBtn.click();
    }
  });
  select(0);
};
export {
  init
};
