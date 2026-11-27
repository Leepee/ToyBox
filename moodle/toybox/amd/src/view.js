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
    /** True once the toy was stopped for navigating away. */
    __publicField(this, "stopped", false);
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
    let loads = 0;
    f.addEventListener("load", () => {
      if (++loads > 1 && !this.stopped) {
        this.stopped = true;
        f.removeAttribute("src");
        f.srcdoc = "";
        this.opts.emit({ type: "navigated" }, this.spec);
      }
    });
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
  const usesSdk = /toybox-sdk\.js/.test(html);
  const body = (usesSdk ? html.replace(/(["'])[^"']*toybox-sdk\.js\1/g, `"${sdkUrl}"`) : html).replace(/^\s*<!doctype[^>]*>/i, "");
  const start2 = '<!doctype html><meta charset="utf-8">' + (lockdown ? `<meta http-equiv="Content-Security-Policy" content="${toyCsp(sdkUrl)}">` : "") + (usesSdk ? "" : `<script src="${sdkUrl}"><\/script>`);
  return start2 + body;
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
      const start2 = t ? parseTime(t) : void 0;
      return { kind: "youtube", id, ...start2 ? { start: start2 } : {} };
    }
  }
  if (/^(vimeo\.com|player\.vimeo\.com)$/.test(host)) {
    const m = u.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([0-9a-f]+))?/);
    if (m) {
      const hash = (_e = (_d = m[2]) != null ? _d : u.searchParams.get("h")) != null ? _e : void 0;
      return { kind: "vimeo", id: m[1], ...hash ? { hash } : {} };
    }
  }
  const pid = u.searchParams.get("id");
  if (/\/Panopto\/Pages\/(Viewer|Embed)\.aspx$/i.test(u.pathname) && pid && /^[0-9a-f-]{36}$/i.test(pid)) {
    return { kind: "panopto", server: u.host, id: pid };
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
  if (v.kind === "panopto") return new PanoptoMedia(v.server, v.id);
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
  get volume() {
    return this.el.volume;
  }
  set volume(v) {
    this.el.volume = Math.min(1, Math.max(0, v));
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
    /** True once the viewer muted it themselves (so playback doesn't unmute it again). */
    __publicField(this, "userMuted", false);
    __publicField(this, "vol", 1);
    /** True once the viewer set the volume themselves. */
    __publicField(this, "userVolume", false);
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
    this.userMuted = m;
    this.syncMuted(m);
    this.setMuted(m);
  }
  get volume() {
    return this.vol;
  }
  set volume(v) {
    this.userVolume = true;
    this.syncVolume(Math.min(1, Math.max(0, v)));
    this.applyVolume(this.vol);
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
  /** The provider told us whether it's muted (e.g. a browser forced muted playback). */
  syncMuted(m) {
    if (m === this.isMuted) return;
    this.isMuted = m;
    this.emit("volumechange");
  }
  /** The provider told us its volume (0–1). */
  syncVolume(v) {
    if (!Number.isFinite(v) || Math.abs(v - this.vol) < 1e-3) return;
    this.vol = v;
    this.emit("volumechange");
  }
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
function parseMessage(data) {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
var FrameMedia = class extends EmbedMedia {
  constructor(origin, src) {
    super();
    this.origin = origin;
    __publicField(this, "frame");
    __publicField(this, "onMessage", (e) => {
      if (e.source !== this.frame.contentWindow || e.origin !== this.origin) return;
      const d = parseMessage(e.data);
      if (d && typeof d === "object") this.receive(d);
    });
    const f = this.frame = document.createElement("iframe");
    f.src = src;
    f.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
    f.setAttribute("allowfullscreen", "");
    f.width = "100%";
    f.height = "100%";
    f.style.border = "0";
    this.target.appendChild(f);
    window.addEventListener("message", this.onMessage);
  }
  /** Post to the player frame (only ever to the player's own site). */
  post(msg, asString = true) {
    var _a;
    (_a = this.frame.contentWindow) == null ? void 0 : _a.postMessage(asString ? JSON.stringify(msg) : msg, this.origin);
  }
  destroy() {
    window.removeEventListener("message", this.onMessage);
    super.destroy();
  }
};
var YT_ORIGIN = "https://www.youtube-nocookie.com";
var YouTubeMedia = class extends FrameMedia {
  constructor(videoId) {
    const q = new URLSearchParams({
      enablejsapi: "1",
      controls: "0",
      // ToyBox draws its own controls
      disablekb: "1",
      fs: "0",
      rel: "0",
      playsinline: "1",
      iv_load_policy: "3",
      modestbranding: "1",
      origin: location.origin
    });
    super(YT_ORIGIN, `${YT_ORIGIN}/embed/${encodeURIComponent(videoId)}?${q}`);
    this.videoId = videoId;
    __publicField(this, "kind", "youtube");
    __publicField(this, "hello", 0);
    __publicField(this, "pending", []);
    __publicField(this, "state", -1);
    __publicField(this, "vol100", 100);
    const listen = () => this.post({ event: "listening", id: 1, channel: "widget" });
    this.frame.addEventListener("load", () => {
      listen();
      if (!this.hello) this.hello = window.setInterval(listen, 250);
    });
  }
  command(func, args = []) {
    const send = () => this.post({ event: "command", func, args, id: 1, channel: "widget" });
    if (this.ready) send();
    else this.pending.push(send);
  }
  receive(d) {
    var _a;
    if (d.event === "onReady" || d.event === "initialDelivery") {
      clearInterval(this.hello);
      this.hello = -1;
    }
    if (d.event === "initialDelivery" || d.event === "infoDelivery") this.info((_a = d.info) != null ? _a : {});
    if (d.event === "onReady" && !this.ready) {
      this.post({ event: "command", func: "addEventListener", args: ["onStateChange"], id: 1, channel: "widget" });
      this.markReady();
      for (const fn of this.pending.splice(0)) fn();
    }
    if (d.event === "onStateChange" && typeof d.info === "number") this.onState(d.info);
  }
  info(i) {
    if (typeof i.duration === "number") this.setDuration(i.duration);
    if (typeof i.muted === "boolean") this.syncMuted(i.muted);
    if (typeof i.volume === "number") {
      this.vol100 = i.volume;
      this.syncVolume(i.volume / 100);
    }
    if (typeof i.playerState === "number" && i.playerState !== this.state) this.onState(i.playerState);
    if (typeof i.currentTime === "number") {
      this.report(i.currentTime);
      if (this.state === 1) this.emit("timeupdate");
    }
  }
  onState(s) {
    this.state = s;
    if (s === 1 || s === 3) {
      this.setStalled(s === 3);
      this.setPlaying(true);
    } else if (s === 2 || s === 0) {
      this.setPlaying(false);
      if (s === 0) this.emit("ended");
    }
  }
  seekTo(t) {
    this.command("seekTo", [t, true]);
    setTimeout(() => this.emit("seeked"), 150);
  }
  doPlay() {
    this.command("playVideo");
    if (!this.userMuted) this.command("unMute");
    if (!this.userVolume && this.vol100 === 0) this.command("setVolume", [100]);
  }
  applyVolume(v) {
    this.command("setVolume", [Math.round(v * 100)]);
  }
  doPause() {
    this.command("pauseVideo");
  }
  setMuted(m) {
    this.command(m ? "mute" : "unMute");
  }
  destroy() {
    clearInterval(this.hello);
    super.destroy();
  }
};
var VIMEO_ORIGIN = "https://player.vimeo.com";
var VIMEO_EVENTS = ["play", "pause", "ended", "timeupdate", "seeked", "bufferstart", "bufferend", "volumechange"];
var VimeoMedia = class extends FrameMedia {
  constructor(videoId, hash) {
    const q = new URLSearchParams({
      ...hash ? { h: hash } : {},
      api: "1",
      controls: "0",
      dnt: "1",
      playsinline: "1",
      title: "0",
      byline: "0",
      portrait: "0"
    });
    super(VIMEO_ORIGIN, `${VIMEO_ORIGIN}/video/${encodeURIComponent(videoId)}?${q}`);
    this.videoId = videoId;
    this.hash = hash;
    __publicField(this, "kind", "vimeo");
    __publicField(this, "pending", []);
    __publicField(this, "gotReady", false);
  }
  send(method, value) {
    this.post(value === void 0 ? { method } : { method, value }, false);
  }
  call(method, value) {
    const go = () => this.send(method, value);
    if (this.ready) go();
    else this.pending.push(go);
  }
  receive(d) {
    var _a;
    if (d.event === "ready" && !this.gotReady) {
      this.gotReady = true;
      for (const ev of VIMEO_EVENTS) this.send("addEventListener", ev);
      this.send("getDuration");
      this.send("getVolume");
      this.send("getMuted");
      return;
    }
    if (d.method === "getDuration" && typeof d.value === "number") {
      this.setDuration(d.value);
      if (!this.ready) {
        this.markReady();
        for (const fn of this.pending.splice(0)) fn();
      }
    } else if (d.method === "getVolume" && typeof d.value === "number") {
      this.syncVolume(d.value);
    } else if (d.method === "getMuted" && typeof d.value === "boolean") {
      this.syncMuted(d.value);
    }
    const data = (_a = d.data) != null ? _a : {};
    switch (d.event) {
      case "play":
        if (typeof data.seconds === "number") this.report(data.seconds);
        this.setPlaying(true);
        break;
      case "pause":
        if (typeof data.seconds === "number") this.report(data.seconds);
        this.setPlaying(false);
        break;
      case "ended":
        this.setPlaying(false);
        this.emit("ended");
        break;
      case "timeupdate":
        if (typeof data.seconds === "number") this.report(data.seconds);
        if (typeof data.duration === "number") this.setDuration(data.duration);
        this.emit("timeupdate");
        break;
      case "seeked":
        if (typeof data.seconds === "number") this.report(data.seconds);
        this.emit("seeked");
        break;
      case "bufferstart":
        this.setStalled(true);
        break;
      case "bufferend":
        this.setStalled(false);
        break;
      case "volumechange":
        if (typeof data.volume === "number") this.syncVolume(data.volume);
        if (typeof data.muted === "boolean") this.syncMuted(data.muted);
        break;
    }
  }
  seekTo(t) {
    this.call("setCurrentTime", t);
  }
  doPlay() {
    this.call("play");
    if (!this.userMuted) this.call("setMuted", false);
    if (!this.userVolume && this.volume === 0) this.call("setVolume", 1);
  }
  applyVolume(v) {
    this.call("setVolume", v);
  }
  doPause() {
    this.call("pause");
  }
  setMuted(m) {
    this.call("setMuted", m);
  }
};
var panoptoCount = 0;
var PanoptoMedia = class extends FrameMedia {
  constructor(server, sessionId) {
    const embedId = `tb-panopto-${++panoptoCount}`;
    const q = new URLSearchParams({
      id: sessionId,
      remoteEmbed: "true",
      remoteHost: location.origin,
      embedApiId: embedId,
      // Keep Panopto's own UI out of the way: ToyBox draws the controls.
      interactivity: "none",
      showtitle: "false",
      showbrand: "false",
      offerviewer: "false",
      autoplay: "false"
    });
    super(`https://${server}`, `https://${server}/Panopto/Pages/Embed.aspx?${q}`);
    this.server = server;
    this.sessionId = sessionId;
    __publicField(this, "kind", "panopto");
    __publicField(this, "embedId");
    __publicField(this, "iframeReady", false);
    __publicField(this, "loaded", false);
    __publicField(this, "beforeIframe", []);
    __publicField(this, "afterLoad", []);
    __publicField(this, "pendingSeek", null);
    __publicField(this, "lastReported", -1);
    __publicField(this, "remote", { volume: 1, isMuted: false, isPaused: true, isFinished: false });
    this.embedId = embedId;
  }
  send(msg, data = "") {
    this.post({ msg, source: "PanoptoEmbed", id: this.embedId, data });
  }
  /** Runs once the iframe can take commands. */
  whenIframe(fn) {
    if (this.iframeReady) fn();
    else this.beforeIframe.push(fn);
  }
  /** Runs once the video itself has loaded (after the first play). */
  whenLoaded(fn) {
    if (this.ready) fn();
    else this.afterLoad.push(fn);
  }
  receive(d) {
    var _a;
    if (d.source !== "PanoptoEmbed" || d.id !== this.embedId && d.id !== "*") return;
    switch (d.msg) {
      case "embedIframeReady":
        this.iframeReady = true;
        for (const fn of this.beforeIframe.splice(0)) fn();
        break;
      case "iframeError":
        this.emit("error");
        break;
      case "iframeLoginShown":
        this.emit("login");
        break;
      case "iframeState":
        this.onIframeState((_a = d.data) != null ? _a : {});
        break;
    }
  }
  onIframeState(p) {
    this.remote = { volume: p.volume, isMuted: p.isMuted, isPaused: p.isPaused, isFinished: p.isFinished };
    if (typeof p.duration === "number") this.setDuration(p.duration);
    if (typeof p.isMuted === "boolean") this.syncMuted(p.isMuted);
    if (typeof p.volume === "number") this.syncVolume(p.volume);
    if (typeof p.currentTime === "number" && p.currentTime !== this.lastReported) {
      this.lastReported = p.currentTime;
      this.report(p.currentTime);
    }
    if (p.trigger !== "iframeStateUpdate") {
      if (!p.isPaused) this.emit("timeupdate");
      return;
    }
    if (!this.ready) this.onLoaded();
    if (p.isFinished) {
      this.setPlaying(false);
      this.emit("ended");
    } else {
      this.setPlaying(!p.isPaused);
    }
  }
  onLoaded() {
    this.markReady();
    if (this.pendingSeek !== null) {
      this.send("iframeSeek", this.pendingSeek);
      this.lastReported = -1;
      this.pendingSeek = null;
    }
    this.send(this.userMuted ? "iframeMute" : "iframeUnmute");
    if (this.userVolume) this.send("iframeVolume", this.volume);
    else if (this.remote.volume === 0) this.send("iframeVolume", 1);
    for (const fn of this.afterLoad.splice(0)) fn();
  }
  seekTo(t) {
    if (!this.ready) {
      this.pendingSeek = t;
      setTimeout(() => this.emit("seeked"), 0);
      return;
    }
    this.send("iframeSeek", t);
    this.lastReported = -1;
    setTimeout(() => this.emit("seeked"), 200);
  }
  doPlay() {
    this.whenIframe(() => {
      if (!this.loaded) {
        this.loaded = true;
        this.send("iframeLoad");
        return;
      }
      this.send("iframePlay");
      if (!this.userMuted) this.send("iframeUnmute");
    });
  }
  doPause() {
    if (this.loaded) this.whenLoaded(() => this.send("iframePause"));
  }
  setMuted(m) {
    this.whenLoaded(() => this.send(m ? "iframeMute" : "iframeUnmute"));
  }
  applyVolume(v) {
    this.whenLoaded(() => this.send("iframeVolume", v));
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
function rgbOf(c) {
  const h = toHex(c);
  let m = h.match(/^#([0-9a-f]{3})$/i);
  if (m) return [0, 1, 2].map((i) => parseInt(m[1][i] + m[1][i], 16));
  m = h.match(/^#([0-9a-f]{6})/i);
  return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null;
}
function luminance(c) {
  const rgb = rgbOf(c);
  if (!rgb) return 1;
  const [r, g, b] = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
function colourDistance(a, b) {
  const x = rgbOf(a), y = rgbOf(b);
  if (!x || !y) return 999;
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}
var usable = (c) => !!c && !/^transparent$|rgba\([^)]*,\s*0\)$/i.test(c.trim()) && !!rgbOf(c);
function themeFromTokens(t, base = THEMES.solent) {
  var _a, _b, _c, _d, _e, _f;
  const surface = usable(t.background) ? toHex(t.background) : "#ffffff";
  const dark = luminance(surface) < 0.35;
  const fallback = dark ? THEMES.toybox : THEMES.solent;
  const pick = (c, min, alt) => usable(c) && contrast(toHex(c), surface) >= min ? toHex(c) : alt;
  const text = pick(t.text, 4.5, dark ? "#f1f5f9" : "#1d2125");
  const primary = usable(t.primary) ? toHex(t.primary) : fallback.primary;
  const onPrimary = usable(t.onPrimary) && contrast(toHex(t.onPrimary), primary) >= 4.5 ? toHex(t.onPrimary) : contrast("#ffffff", primary) >= contrast("#111111", primary) ? "#ffffff" : "#111111";
  const link = pick(t.link, 4.5, pick(primary, 4.5, text));
  const danger = pick(t.danger, 3, fallback.danger);
  const success = pick(t.success, 3, fallback.success);
  const warning = pick(t.warning, 3, fallback.warning);
  const palette = [];
  for (const c of [...(_a = t.accents) != null ? _a : [], primary, link, danger, success, ...fallback.palette, ...base.palette]) {
    if (!usable(c)) continue;
    const hex = toHex(c);
    if (contrast(hex, surface) < 3) continue;
    if (palette.some((p) => colourDistance(p, hex) < 60)) continue;
    if (palette.length < 6) palette.push(hex);
  }
  for (let i = 0; palette.length < 6 && i < 12; i++) palette.push((_b = palette[i % Math.max(1, palette.length)]) != null ? _b : text);
  const accent = (_c = palette.find((c) => c.toLowerCase() !== primary.toLowerCase())) != null ? _c : danger;
  const family = ((_d = t.font) != null ? _d : "").split(",")[0].replace(/["']/g, "").trim();
  return {
    id: "site",
    name: (_e = t.name) != null ? _e : "This site",
    mode: dark ? "dark" : "light",
    font: t.font || fallback.font,
    fontFaces: (_f = t.fontFaces) != null ? _f : [],
    page: dark ? "#0b0f17" : "#e9ecef",
    surface,
    surfaceAlt: usable(t.surfaceAlt) ? toHex(t.surfaceAlt) : dark ? "#111827" : "#f8f9fa",
    text,
    muted: pick(t.muted, 4.5, dark ? "#94a3b8" : "#5f6670"),
    border: usable(t.border) ? toHex(t.border) : dark ? "rgba(255, 255, 255, 0.15)" : "#dee2e6",
    grid: dark ? "#1f2937" : "#e9ecef",
    primary,
    onPrimary,
    accent,
    link,
    success,
    warning,
    danger,
    palette,
    radius: t.radius || "8px",
    buttonRadius: t.buttonRadius || t.radius || "6px",
    shadow: dark ? "0 8px 30px rgba(0, 0, 0, 0.5)" : "0 2px 8px rgba(0, 0, 0, 0.15)",
    band: usable(t.band) ? toHex(t.band) : dark ? "#111827" : "#343a40",
    onBand: "#ffffff",
    promptNotes: `Match this site's look: font ${family || "the system font"}, main buttons ${primary} with ${onPrimary} text, text ${text} on ${surface}, links ${link}, brand highlight ${accent}. Clean cards with rounded corners. Use the highlight colour sparingly.`
  };
}
function themeFromPage(base = THEMES.solent) {
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
  const bodyBg = body.backgroundColor;
  return themeFromTokens(
    {
      font: body.fontFamily,
      fontFaces: faces,
      text: body.color,
      background: usable(bodyBg) ? bodyBg : "#ffffff",
      // Bootstrap (Moodle) first, then WordPress block-theme presets.
      primary: v("--bs-primary", "--primary", "--wp--preset--color--primary") || probe("btn btn-primary", "background-color"),
      onPrimary: probe("btn btn-primary", "color"),
      link: probe("a.", "color"),
      accents: [v("--bs-primary", "--primary"), v("--bs-info", "--info")].filter(Boolean),
      success: v("--bs-success", "--success"),
      warning: v("--bs-warning", "--warning"),
      danger: v("--bs-danger", "--danger"),
      muted: v("--bs-secondary-color", "--bs-gray-600", "--gray-600"),
      border: v("--bs-border-color", "--gray-300"),
      surfaceAlt: v("--bs-light", "--light"),
      radius: v("--bs-border-radius-lg", "--bs-border-radius"),
      buttonRadius: v("--bs-border-radius"),
      band: v("--bs-dark", "--dark")
    },
    base
  );
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
    __publicField(this, "muteBtn");
    __publicField(this, "volume");
    __publicField(this, "shownMuted", null);
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
          <button class="tb-mute" aria-label="Mute"></button>
          <input class="tb-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume" />
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
    this.muteBtn = q(".tb-mute");
    this.volume = q(".tb-volume");
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
    for (const ev of ["seeked", "pause", "loadedmetadata", "durationchange", "timeupdate", "ended", "volumechange"]) media.addEventListener(ev, () => this.sync());
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
    var _a, _b, _c, _d, _e, _f, _g, _h;
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
      case "navigated": {
        const toy = this.active.get(cue.id);
        if (toy) {
          const note = blockedNotice();
          Object.assign(note.style, { left: toy.el.style.left, top: toy.el.style.top, width: toy.el.style.width, height: toy.el.style.height });
          toy.el.replaceWith(note);
        }
        (_h = (_g = this.opts).onBlocked) == null ? void 0 : _h.call(_g, cue);
        break;
      }
    }
  }
  wireControls(fsBtn) {
    const toggle = () => this.video.paused ? this.play() : this.pause();
    this.playBtn.onclick = toggle;
    this.muteBtn.onclick = () => {
      const m = this.media;
      if (!m) return;
      if (m.muted || m.volume < 0.05) {
        if (m.volume < 0.05) m.volume = 1;
        m.muted = false;
      } else m.muted = true;
      this.renderControls();
    };
    this.volume.oninput = () => {
      const m = this.media;
      if (!m) return;
      m.volume = Number(this.volume.value);
      if (m.volume > 0 && m.muted) m.muted = false;
      this.renderControls();
    };
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
    if (document.activeElement !== this.volume) this.volume.value = String(v.muted ? 0 : v.volume);
    const silent = v.muted || v.volume < 0.05;
    if (this.shownMuted !== silent) {
      this.shownMuted = silent;
      this.muteBtn.innerHTML = silent ? ICON_MUTED : ICON_SOUND;
      this.muteBtn.setAttribute("aria-label", silent ? "Unmute" : "Mute");
      this.muteBtn.classList.toggle("tb-muted", silent);
    }
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
var svg = (path) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${path}</svg>`;
var ICON_SOUND = svg('<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>');
var ICON_MUTED = svg('<path d="M17 9l5 6M22 9l-5 6"/>');
function blockedNotice() {
  const n = document.createElement("div");
  n.className = "tb-blocked";
  n.setAttribute("role", "alert");
  n.textContent = "This toy tried to open another web page, so ToyBox stopped it.";
  return n;
}
var EMPTY_MEDIA = {
  kind: "file",
  el: document.createElement("div"),
  currentTime: 0,
  duration: NaN,
  paused: true,
  readyState: 0,
  muted: false,
  volume: 1,
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
        var _a3, _b2, _c, _d, _e, _f;
        if (msg.type === "complete") (_b2 = (_a3 = this.opts).onComplete) == null ? void 0 : _b2.call(_a3, { cueId: spec.id, label: spec.label, at: 0, result: msg.result });
        else if (msg.type === "log") (_d = (_c = this.opts).onLog) == null ? void 0 : _d.call(_c, spec, msg.data);
        else if (msg.type === "resize" && aspect === "auto") frame.el.style.height = `${Math.ceil(msg.height)}px`;
        else if (msg.type === "navigated") {
          frame.el.replaceWith(blockedNotice());
          (_f = (_e = this.opts).onBlocked) == null ? void 0 : _f.call(_e, spec);
        }
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

// core/src/hostKit.ts
function readConfig(root, selector = "script.mod-toybox-config") {
  var _a;
  const el2 = root.querySelector(selector);
  return JSON.parse((_a = el2 == null ? void 0 : el2.textContent) != null ? _a : "{}");
}
function fromServer(toys) {
  return toys.map((t) => {
    var _a;
    return { ...t, id: String(t.id), params: (_a = t.params) != null ? _a : {} };
  });
}
async function loadTheme(id, sdkUrl, site) {
  if ((id === "auto" || !THEMES[id]) && site) return resolveThemeFonts(themeFromTokens(site), location.href);
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
var players = /* @__PURE__ */ new Set();
var init = (selector) => {
  const root = document.querySelector(selector);
  if (root) setup(root);
};
var watching = false;
var initAll = () => {
  const scan = () => document.querySelectorAll('[data-region="mod-toybox"]').forEach(setup);
  scan();
  if (watching) return;
  watching = true;
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
};
function setup(root) {
  if (root.dataset.tbStarted || !root.querySelector("script.mod-toybox-config")) return;
  root.dataset.tbStarted = "1";
  const cfg = readConfig(root);
  if (!cfg.inline || !("IntersectionObserver" in window)) {
    start(root, cfg);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      start(root, cfg);
      Promise.resolve(Ajax.call([{ methodname: "mod_toybox_view_toybox", args: { cmid: cfg.cmid } }])[0]).catch(() => {
      });
    },
    { rootMargin: "300px 0px" }
  );
  io.observe(root);
}
async function start(root, cfg) {
  var _a;
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
  const blocked = (toyId) => {
    if (!/^\d+$/.test(toyId)) return;
    Promise.resolve(
      Ajax.call([{ methodname: "mod_toybox_report_blocked", args: { cmid: cfg.cmid, toyid: Number(toyId) } }])[0]
    ).catch(() => {
    });
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
      },
      onBlocked: () => blocked(toy.id)
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
    },
    onBlocked: (cue) => blocked(cue.id)
  });
  player.setLesson({ title: "", video: cfg.videoUrl, cues: toys }, location.href);
  players.add(player);
  (_a = player.media) == null ? void 0 : _a.addEventListener("play", () => {
    for (const other of players) if (other !== player) other.pause();
  });
  if (toys.length) {
    root.append(el("h3.mod-toybox-progress-title", { text: cfg.strings.toysinthisvideo }), list);
    renderList();
  }
}
export {
  init,
  initAll
};
