import { ToyFrame } from './toyHost';
import { createMedia, type PlayerMedia } from './media';
import { applyTheme, type Theme } from './theme';
import type { CompletionRecord, Cue, Lesson, ToyMessage } from './types';

export interface PlayerOptions {
  /** Absolute URL of toybox-sdk.js, injected into inline toys. */
  sdkUrl?: string;
  onComplete?: (rec: CompletionRecord) => void;
  onLog?: (cue: Cue, data: unknown) => void;
  /** A toy tried to navigate away and was stopped (hosts can log this). */
  onBlocked?: (cue: Cue) => void;
  /** Lock inline toys down with a CSP (no network). Default true. */
  lockdown?: boolean;
  /** Theme for the player controls and the toys (see resolveThemeFonts). */
  theme?: Theme;
}

/**
 * The ToyBox player: a video (file, YouTube or Vimeo) with a transparent overlay
 * layer that mounts toys (sandboxed iframes) while the playhead is inside each
 * cue's time range.
 */
export class ToyBoxPlayer {
  readonly root: HTMLElement;
  /** The current video source (null until a lesson is set). */
  media: PlayerMedia | null = null;
  private mediaSrc = '';
  private stage: HTMLElement;
  private shield: HTMLElement;
  private overlay: HTMLElement;
  private looping = false;
  private markers: HTMLElement;
  private scrub: HTMLInputElement;
  private timeLabel: HTMLElement;
  private playBtn: HTMLButtonElement;
  private muteBtn: HTMLButtonElement;
  private volume: HTMLInputElement;
  private shownMuted: boolean | null = null;

  private cues: Cue[] = [];
  private baseUrl = location.href;
  private active = new Map<string, ToyFrame>();
  private lastTimePost = 0;
  private sdkUrl: string;

  constructor(container: HTMLElement, private opts: PlayerOptions = {}) {
    this.sdkUrl = opts.sdkUrl ?? new URL('toybox-sdk.js', document.baseURI).href;
    container.innerHTML = `
      <div class="tb-player">
        <div class="tb-stage">
          <div class="tb-shield"></div>
          <div class="tb-overlay"></div>
        </div>
        <div class="tb-controls">
          <button class="tb-play" aria-label="Play">▶</button>
          <div class="tb-track">
            <div class="tb-markers"></div>
            <input class="tb-scrub" type="range" min="0" max="1000" value="0" aria-label="Seek" />
          </div>
          <span class="tb-time">0:00 / 0:00</span>
          <button class="tb-mute" aria-label="Mute"></button>
          <input class="tb-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume" />
          <button class="tb-fs" aria-label="Fullscreen">⛶</button>
        </div>
      </div>`;
    const q = <T extends Element>(s: string) => container.querySelector(s) as T;
    this.root = q('.tb-player');
    this.stage = q('.tb-stage');
    this.shield = q('.tb-shield');
    this.overlay = q('.tb-overlay');
    this.markers = q('.tb-markers');
    this.scrub = q('.tb-scrub');
    this.timeLabel = q('.tb-time');
    this.muteBtn = q('.tb-mute');
    this.volume = q('.tb-volume');
    this.playBtn = q('.tb-play');

    if (opts.theme) applyTheme(opts.theme, this.root);
    this.wireControls(q('.tb-fs'));
  }

  /** The video source; kept as `video` for older callers. */
  get video(): PlayerMedia {
    return this.media ?? EMPTY_MEDIA;
  }

  async loadLesson(url: string) {
    const abs = new URL(url, location.href).href;
    const res = await fetch(abs);
    if (!res.ok) throw new Error(`Couldn't load lesson ${url} (${res.status})`);
    const lesson = (await res.json()) as Lesson;
    this.setLesson(lesson, abs);
    return lesson;
  }

  setLesson(lesson: Lesson, baseUrl = location.href) {
    this.baseUrl = baseUrl;
    const src = new URL(lesson.video, baseUrl).href;
    if (this.mediaSrc !== src) this.setMedia(createMedia(src), src);
    if (lesson.poster && this.media?.el instanceof HTMLVideoElement) this.media.el.poster = new URL(lesson.poster, baseUrl).href;
    this.setCues(lesson.cues);
  }

  /** Replace the cue list (used live by the playground). */
  /** Switch theme: restyles the controls and reloads visible toys with the new theme. */
  setTheme(theme: Theme) {
    this.opts.theme = theme;
    applyTheme(theme, this.root);
    this.setCues(this.cues);
  }

  setCues(cues: Cue[]) {
    for (const t of this.active.values()) t.destroy();
    this.active.clear();
    this.cues = [...cues].sort((a, b) => a.start - b.start);
    this.renderMarkers();
    this.sync();
  }

  play() {
    return this.media?.play() ?? Promise.resolve();
  }
  pause() {
    this.media?.pause();
  }
  seek(t: number) {
    if (!this.media) return;
    const d = this.media.duration || Infinity;
    this.media.currentTime = Math.max(0, Math.min(t, d));
    this.sync();
  }

  /** Stop and remove the video and toys (e.g. when the player leaves the page). */
  destroy() {
    for (const t of this.active.values()) t.destroy();
    this.active.clear();
    this.media?.destroy();
    this.media = null;
    this.root.remove();
  }

  // ---- internals -------------------------------------------------------

  private setMedia(media: PlayerMedia, src: string) {
    this.media?.destroy();
    this.media = media;
    this.mediaSrc = src;
    this.root.dataset.media = media.kind;
    this.stage.insertBefore(media.el, this.shield);
    for (const ev of ['seeked', 'pause', 'loadedmetadata', 'durationchange', 'timeupdate', 'ended', 'volumechange']) media.addEventListener(ev, () => this.sync());
    media.addEventListener('loadedmetadata', () => this.renderMarkers());
    media.addEventListener('durationchange', () => this.renderMarkers());
    media.addEventListener('play', () => this.startLoop());
    if (!media.paused) this.startLoop();
    this.sync();
  }

  /**
   * Runs sync() every frame while the video plays (and stops when it pauses, so
   * idle players on a course page cost nothing). Uses requestVideoFrameCallback
   * for video files, so toys appear on the exact frame.
   */
  private startLoop() {
    if (this.looping) return;
    this.looping = true;
    const v = this.media?.el as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
    const next = (fn: () => void) => (v?.requestVideoFrameCallback ? v.requestVideoFrameCallback(fn) : requestAnimationFrame(fn));
    const tick = () => {
      this.sync();
      if (this.media && !this.media.paused) next(tick);
      else this.looping = false;
    };
    next(tick);
  }

  private sync() {
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

    // Tell live toys the time ~4x/second (cheap, and enough for most toys).
    const now = performance.now();
    if (now - this.lastTimePost > 250) {
      this.lastTimePost = now;
      for (const toy of this.active.values()) {
        toy.post({ type: 'time', time: t, duration: m.duration || 0, paused: m.paused });
      }
    }
    this.renderControls();
  }

  private mount(cue: Cue) {
    const toy = new ToyFrame(cue, {
      baseUrl: this.baseUrl,
      sdkUrl: this.sdkUrl,
      hasVideo: true,
      lockdown: this.opts.lockdown,
      theme: this.opts.theme,
      emit: (m) => this.onToyMessage(m, cue),
    });
    const { x, y, w, h } = cue.rect;
    Object.assign(toy.el.style, { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });
    this.overlay.appendChild(toy.el);
    this.active.set(cue.id, toy);
    if (cue.pause && this.media && !this.media.paused) this.media.pause();
  }

  private onToyMessage(msg: ToyMessage, cue: Cue) {
    switch (msg.type) {
      case 'pause':
        this.pause();
        break;
      case 'play':
        this.play();
        break;
      case 'seek':
        this.seek(msg.time);
        break;
      case 'complete':
        this.opts.onComplete?.({ cueId: cue.id, label: cue.label, at: this.media?.currentTime ?? 0, result: msg.result });
        if (cue.resumeOnComplete) this.play();
        break;
      case 'log':
        this.opts.onLog?.(cue, msg.data);
        break;
      case 'navigated': {
        const toy = this.active.get(cue.id);
        if (toy) {
          const note = blockedNotice();
          Object.assign(note.style, { left: toy.el.style.left, top: toy.el.style.top, width: toy.el.style.width, height: toy.el.style.height });
          toy.el.replaceWith(note);
        }
        this.opts.onBlocked?.(cue);
        break;
      }
    }
  }

  private wireControls(fsBtn: HTMLButtonElement) {
    const toggle = () => (this.video.paused ? this.play() : this.pause());
    this.playBtn.onclick = toggle;
    this.muteBtn.onclick = () => {
      const m = this.media;
      if (!m) return;
      // Volume 0 counts as muted: the button always means "make it audible" when silent.
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
    // A click-catcher over the video: toggles play, and stops YouTube/Vimeo
    // grabbing clicks (and their own UI) under ToyBox's controls.
    this.shield.addEventListener('click', toggle);
    this.scrub.oninput = () => {
      if (this.video.duration) this.seek((Number(this.scrub.value) / 1000) * this.video.duration);
    };
    // Fullscreen the whole player (not just <video>) so toys come along.
    fsBtn.onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else this.root.requestFullscreen?.();
    };
    this.root.tabIndex = 0;
    this.root.addEventListener('keydown', (e) => {
      if (e.target !== this.root) return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowRight') this.seek(this.video.currentTime + 5);
      else if (e.key === 'ArrowLeft') this.seek(this.video.currentTime - 5);
    });
  }

  private renderControls() {
    const v = this.video;
    this.playBtn.textContent = v.paused ? '▶' : '❚❚';
    this.playBtn.setAttribute('aria-label', v.paused ? 'Play' : 'Pause');
    if (v.duration && document.activeElement !== this.scrub) {
      this.scrub.value = String(Math.round((v.currentTime / v.duration) * 1000));
    }
    this.timeLabel.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration || 0)}`;
    if (document.activeElement !== this.volume) this.volume.value = String(v.muted ? 0 : v.volume);
    const silent = v.muted || v.volume < 0.05;
    if (this.shownMuted !== silent) {
      this.shownMuted = silent;
      this.muteBtn.innerHTML = silent ? ICON_MUTED : ICON_SOUND;
      this.muteBtn.setAttribute('aria-label', silent ? 'Unmute' : 'Mute');
      this.muteBtn.classList.toggle('tb-muted', silent);
    }
  }

  private renderMarkers() {
    const d = this.video.duration;
    this.markers.innerHTML = '';
    if (!d) return;
    for (const c of this.cues) {
      const m = document.createElement('button');
      m.className = 'tb-marker' + (c.pause ? ' tb-marker--pause' : '');
      m.style.left = `${(c.start / d) * 100}%`;
      m.style.width = `${(Math.max(0.3, Math.min(c.end, d) - c.start) / d) * 100}%`;
      m.title = `${fmt(c.start)} · ${c.label ?? c.id}`;
      m.onclick = () => this.seek(c.start);
      this.markers.appendChild(m);
    }
  }
}

const svg = (path: string) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${path}</svg>`;
const ICON_SOUND = svg('<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>');
const ICON_MUTED = svg('<path d="M17 9l5 6M22 9l-5 6"/>');

/** Shown where a toy was stopped for trying to open another web page. */
export function blockedNotice(): HTMLElement {
  const n = document.createElement('div');
  n.className = 'tb-blocked';
  n.setAttribute('role', 'alert');
  n.textContent = 'This toy tried to open another web page, so ToyBox stopped it.';
  return n;
}

/** Stand-in used before a lesson (and its video) is set. */
const EMPTY_MEDIA: PlayerMedia = {
  kind: 'file',
  el: document.createElement('div'),
  currentTime: 0,
  duration: NaN,
  paused: true,
  readyState: 0,
  muted: false,
  volume: 1,
  play: () => Promise.resolve(),
  pause: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  destroy: () => {},
};

export function fmt(s: number) {
  if (!Number.isFinite(s)) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}
