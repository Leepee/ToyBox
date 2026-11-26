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
        hasVideo: this.opts.hasVideo
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
var init = (selector) => {
  const root = document.querySelector(selector);
  if (!root) return;
  const cfg = readConfig(root);
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
