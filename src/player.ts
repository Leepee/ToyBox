import { ToyFrame } from './toyHost';
import type { CompletionRecord, Cue, Lesson, ToyMessage } from './types';

export interface PlayerOptions {
  /** Absolute URL of toybox-sdk.js, injected into inline toys. */
  sdkUrl?: string;
  onComplete?: (rec: CompletionRecord) => void;
  onLog?: (cue: Cue, data: unknown) => void;
}

/**
 * The ToyBox player: a <video> with a transparent overlay layer that mounts
 * toys (sandboxed iframes) while the playhead is inside each cue's time range.
 */
export class ToyBoxPlayer {
  readonly root: HTMLElement;
  readonly video: HTMLVideoElement;
  private overlay: HTMLElement;
  private markers: HTMLElement;
  private scrub: HTMLInputElement;
  private timeLabel: HTMLElement;
  private playBtn: HTMLButtonElement;

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
          <video playsinline preload="auto"></video>
          <div class="tb-overlay"></div>
        </div>
        <div class="tb-controls">
          <button class="tb-play" aria-label="Play">▶</button>
          <div class="tb-track">
            <div class="tb-markers"></div>
            <input class="tb-scrub" type="range" min="0" max="1000" value="0" aria-label="Seek" />
          </div>
          <span class="tb-time">0:00 / 0:00</span>
          <button class="tb-fs" aria-label="Fullscreen">⛶</button>
        </div>
      </div>`;
    const q = <T extends Element>(s: string) => container.querySelector(s) as T;
    this.root = q('.tb-player');
    this.video = q('video');
    this.overlay = q('.tb-overlay');
    this.markers = q('.tb-markers');
    this.scrub = q('.tb-scrub');
    this.timeLabel = q('.tb-time');
    this.playBtn = q('.tb-play');

    this.wireControls(q('.tb-fs'));
    this.startClock();
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
    if (this.video.src !== src) this.video.src = src;
    if (lesson.poster) this.video.poster = new URL(lesson.poster, baseUrl).href;
    this.setCues(lesson.cues);
  }

  /** Replace the cue list (used live by the playground). */
  setCues(cues: Cue[]) {
    for (const t of this.active.values()) t.destroy();
    this.active.clear();
    this.cues = [...cues].sort((a, b) => a.start - b.start);
    this.renderMarkers();
    this.sync();
  }

  play() {
    return this.video.play().catch(() => {});
  }
  pause() {
    this.video.pause();
  }
  seek(t: number) {
    const d = this.video.duration || Infinity;
    this.video.currentTime = Math.max(0, Math.min(t, d));
  }

  // ---- internals -------------------------------------------------------

  private startClock() {
    // requestVideoFrameCallback fires once per presented frame, so toys appear
    // on the exact frame. Fall back to requestAnimationFrame where unsupported.
    const v = this.video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
    };
    if (v.requestVideoFrameCallback) {
      const loop = () => {
        this.sync();
        v.requestVideoFrameCallback!(loop);
      };
      v.requestVideoFrameCallback(loop);
      // rVFC doesn't fire while paused, so also sync on these events.
      for (const ev of ['seeked', 'pause', 'loadedmetadata', 'timeupdate']) v.addEventListener(ev, () => this.sync());
    } else {
      const loop = () => {
        this.sync();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  private sync() {
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

    // Tell live toys the time ~4x/second (cheap, and enough for most toys).
    const now = performance.now();
    if (now - this.lastTimePost > 250) {
      this.lastTimePost = now;
      for (const toy of this.active.values()) {
        toy.post({ type: 'time', time: t, duration: this.video.duration || 0, paused: this.video.paused });
      }
    }
    this.renderControls();
  }

  private mount(cue: Cue) {
    const toy = new ToyFrame(cue, this.baseUrl, this.sdkUrl, (m, c) => this.onToyMessage(m, c));
    this.overlay.appendChild(toy.el);
    this.active.set(cue.id, toy);
    if (cue.pause && !this.video.paused) this.video.pause();
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
        this.opts.onComplete?.({ cueId: cue.id, label: cue.label, at: this.video.currentTime, result: msg.result });
        if (cue.resumeOnComplete) this.play();
        break;
      case 'log':
        this.opts.onLog?.(cue, msg.data);
        break;
    }
  }

  private wireControls(fsBtn: HTMLButtonElement) {
    const v = this.video;
    this.playBtn.onclick = () => (v.paused ? this.play() : this.pause());
    v.addEventListener('click', () => (v.paused ? this.play() : this.pause()));
    this.scrub.oninput = () => {
      if (v.duration) this.seek((Number(this.scrub.value) / 1000) * v.duration);
    };
    v.addEventListener('loadedmetadata', () => this.renderMarkers());
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
        v.paused ? this.play() : this.pause();
      } else if (e.key === 'ArrowRight') this.seek(v.currentTime + 5);
      else if (e.key === 'ArrowLeft') this.seek(v.currentTime - 5);
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

export function fmt(s: number) {
  if (!Number.isFinite(s)) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}
