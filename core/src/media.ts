/**
 * Video sources for the player. Every source looks like a small subset of
 * HTMLVideoElement (currentTime, duration, paused, play, pause, events), so the
 * player, toys and editors don't care where the video comes from.
 *
 *   - FileMedia:    an <video> element (mp4/webm, uploaded or linked)
 *   - YouTubeMedia: YouTube's IFrame Player API (privacy-enhanced youtube-nocookie.com)
 *   - VimeoMedia:   Vimeo's Player.js API (do-not-track)
 *
 * YouTube and Vimeo only report the time a few times a second, so EmbedMedia
 * interpolates between reports with the wall clock while playing.
 */

export type MediaKind = 'file' | 'youtube' | 'vimeo';

export interface PlayerMedia {
  readonly kind: MediaKind;
  /** The element to put in the player's stage. */
  readonly el: HTMLElement;
  currentTime: number;
  readonly duration: number;
  readonly paused: boolean;
  /** 0 until the duration is known, then 1+ (like HTMLMediaElement). */
  readonly readyState: number;
  muted: boolean;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, fn: () => void): void;
  removeEventListener(type: string, fn: () => void): void;
  destroy(): void;
}

export type ParsedVideo =
  | { kind: 'youtube'; id: string; start?: number }
  | { kind: 'vimeo'; id: string; hash?: string }
  | { kind: 'file'; url: string };

/** Works out what kind of video a URL points to. */
export function parseVideoUrl(url: string): ParsedVideo {
  let u: URL;
  try {
    u = new URL(url, location.href);
  } catch {
    return { kind: 'file', url };
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (/^(youtube\.com|youtube-nocookie\.com|youtu\.be)$/.test(host)) {
    const id =
      host === 'youtu.be'
        ? u.pathname.slice(1)
        : u.searchParams.get('v') ?? u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1];
    if (id && /^[\w-]{11}$/.test(id)) {
      const t = u.searchParams.get('t') ?? u.searchParams.get('start');
      const start = t ? parseTime(t) : undefined;
      return { kind: 'youtube', id, ...(start ? { start } : {}) };
    }
  }
  if (/^(vimeo\.com|player\.vimeo\.com)$/.test(host)) {
    const m = u.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([0-9a-f]+))?/);
    if (m) {
      const hash = m[2] ?? u.searchParams.get('h') ?? undefined;
      return { kind: 'vimeo', id: m[1], ...(hash ? { hash } : {}) };
    }
  }
  return { kind: 'file', url: u.href };
}

function parseTime(t: string): number {
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

/** Creates the right media object for a URL. */
export function createMedia(url: string): PlayerMedia {
  const v = parseVideoUrl(url);
  if (v.kind === 'youtube') return new YouTubeMedia(v.id);
  if (v.kind === 'vimeo') return new VimeoMedia(v.id, v.hash);
  return new FileMedia(v.url);
}

// ---------------------------------------------------------------------------

/** A plain video file in a <video> element. */
export class FileMedia implements PlayerMedia {
  readonly kind = 'file' as const;
  readonly el: HTMLVideoElement;

  constructor(src: string) {
    const v = document.createElement('video');
    v.className = 'tb-media';
    v.playsInline = true;
    v.preload = 'auto';
    v.src = src;
    this.el = v;
  }
  get currentTime() {
    return this.el.currentTime;
  }
  set currentTime(t: number) {
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
  set muted(m: boolean) {
    this.el.muted = m;
  }
  play() {
    return this.el.play().catch(() => {});
  }
  pause() {
    this.el.pause();
  }
  addEventListener(type: string, fn: () => void) {
    this.el.addEventListener(type, fn);
  }
  removeEventListener(type: string, fn: () => void) {
    this.el.removeEventListener(type, fn);
  }
  destroy() {
    this.el.removeAttribute('src');
    this.el.load();
    this.el.remove();
  }
}

// ---------------------------------------------------------------------------

/** Shared clock + events for embedded players that report time intermittently. */
abstract class EmbedMedia implements PlayerMedia {
  abstract readonly kind: MediaKind;
  readonly el: HTMLDivElement;
  protected target: HTMLDivElement;
  private events = new EventTarget();
  private listeners = new Map<() => void, EventListener>();
  private time = 0;
  private stamp = 0;
  private playing = false;
  private stalled = false;
  protected dur = NaN;
  protected ready = false;
  private isMuted = false;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'tb-media tb-embed';
    this.target = document.createElement('div');
    this.el.appendChild(this.target);
  }

  get currentTime() {
    if (!this.playing || this.stalled) return this.time;
    const t = this.time + (performance.now() - this.stamp) / 1000;
    return Number.isFinite(this.dur) ? Math.min(t, this.dur) : t;
  }
  set currentTime(t: number) {
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
  set muted(m: boolean) {
    this.isMuted = m;
    this.setMuted(m);
  }
  play() {
    this.doPlay();
    return Promise.resolve();
  }
  pause() {
    // Stop the clock straight away so a toy that pauses the video sees it stop now.
    if (this.playing) {
      this.report(this.currentTime);
      this.playing = false;
      this.emit('pause');
    }
    this.doPause();
  }
  addEventListener(type: string, fn: () => void) {
    const l = () => fn();
    this.listeners.set(fn, l);
    this.events.addEventListener(type, l);
  }
  removeEventListener(type: string, fn: () => void) {
    const l = this.listeners.get(fn);
    if (l) this.events.removeEventListener(type, l);
  }
  destroy() {
    this.el.remove();
  }

  // ---- for subclasses
  protected emit(type: string) {
    this.events.dispatchEvent(new Event(type));
  }
  /** The provider told us the time. */
  protected report(t: number) {
    this.time = t;
    this.stamp = performance.now();
  }
  protected setPlaying(p: boolean) {
    if (p === this.playing) return;
    this.report(this.currentTime);
    this.playing = p;
    this.emit(p ? 'play' : 'pause');
  }
  protected setStalled(s: boolean) {
    if (s === this.stalled) return;
    this.report(this.currentTime);
    this.stalled = s;
  }
  protected setDuration(d: number) {
    if (!(d > 0) || d === this.dur) return;
    this.dur = d;
    this.emit('durationchange');
    if (this.ready) this.emit('loadedmetadata');
  }
  protected markReady() {
    this.ready = true;
    if (Number.isFinite(this.dur)) this.emit('loadedmetadata');
  }
  protected abstract seekTo(t: number): void;
  protected abstract doPlay(): void;
  protected abstract doPause(): void;
  protected abstract setMuted(m: boolean): void;
}

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Couldn't load ${src}`));
        document.head.appendChild(s);
      }),
    );
  }
  return scripts.get(src)!;
}

// ---------------------------------------------------------------------------

let ytReady: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  ytReady ??= new Promise((resolve, reject) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT);
    };
    loadScript('https://www.youtube.com/iframe_api').catch(reject);
  });
  return ytReady;
}

/** A YouTube video, controlled through the IFrame Player API. */
export class YouTubeMedia extends EmbedMedia {
  readonly kind = 'youtube' as const;
  private yt: any = null;
  private poll = 0;
  private pending: (() => void)[] = [];

  constructor(readonly videoId: string) {
    super();
    loadYouTubeApi()
      .then((YT) => {
        this.yt = new YT.Player(this.target, {
          host: 'https://www.youtube-nocookie.com',
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            controls: 0, // ToyBox draws its own controls
            disablekb: 1,
            fs: 0,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            modestbranding: 1,
            enablejsapi: 1,
            origin: location.origin,
          },
          events: {
            onReady: () => {
              this.setDuration(this.yt.getDuration?.() ?? NaN);
              this.markReady();
              for (const fn of this.pending.splice(0)) fn();
            },
            onStateChange: (e: { data: number }) => this.onState(e.data),
          },
        });
      })
      .catch(() => this.emit('error'));
  }

  private call(fn: () => void) {
    if (this.ready) fn();
    else this.pending.push(fn);
  }

  private onState(s: number) {
    // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    this.setDuration(this.yt.getDuration?.() ?? NaN);
    if (s === 1 || s === 3) {
      this.report(this.yt.getCurrentTime());
      this.setStalled(s === 3);
      this.setPlaying(true);
      this.startPolling();
    } else if (s === 2 || s === 0) {
      this.report(this.yt.getCurrentTime());
      this.setPlaying(false);
      this.stopPolling();
      if (s === 0) this.emit('ended');
    }
  }

  private startPolling() {
    if (this.poll) return;
    this.poll = window.setInterval(() => {
      if (!this.yt?.getCurrentTime) return;
      this.report(this.yt.getCurrentTime());
      this.emit('timeupdate');
    }, 250);
  }
  private stopPolling() {
    clearInterval(this.poll);
    this.poll = 0;
  }

  protected seekTo(t: number) {
    this.call(() => {
      this.yt.seekTo(t, true);
      // YouTube has no "seeked" event; give it a moment to land.
      setTimeout(() => this.emit('seeked'), 150);
    });
  }
  protected doPlay() {
    this.call(() => this.yt.playVideo());
  }
  protected doPause() {
    this.call(() => this.yt.pauseVideo());
  }
  protected setMuted(m: boolean) {
    this.call(() => (m ? this.yt.mute() : this.yt.unMute()));
  }
  destroy() {
    this.stopPolling();
    try {
      this.yt?.destroy();
    } catch {
      /* already gone */
    }
    super.destroy();
  }
}

// ---------------------------------------------------------------------------

/** A Vimeo video, controlled through Vimeo's Player.js API. */
export class VimeoMedia extends EmbedMedia {
  readonly kind = 'vimeo' as const;
  private vp: any = null;
  private pending: (() => void)[] = [];

  constructor(
    readonly videoId: string,
    readonly hash?: string,
  ) {
    super();
    loadScript('https://player.vimeo.com/api/player.js')
      .then(() => {
        const Vimeo = (window as any).Vimeo;
        const opts: Record<string, unknown> = { controls: false, dnt: true, playsinline: true, title: false, byline: false, portrait: false };
        if (hash) opts.url = `https://vimeo.com/${videoId}/${hash}`;
        else opts.id = Number(videoId);
        this.vp = new Vimeo.Player(this.target, opts);
        this.vp.on('loaded', () => {
          this.vp.getDuration().then((d: number) => {
            this.setDuration(d);
            this.markReady();
            for (const fn of this.pending.splice(0)) fn();
          });
        });
        this.vp.on('play', (d: { seconds: number }) => {
          this.report(d?.seconds ?? this.currentTime);
          this.setPlaying(true);
        });
        this.vp.on('pause', (d: { seconds: number }) => {
          this.report(d?.seconds ?? this.currentTime);
          this.setPlaying(false);
        });
        this.vp.on('ended', () => {
          this.setPlaying(false);
          this.emit('ended');
        });
        this.vp.on('timeupdate', (d: { seconds: number; duration: number }) => {
          this.report(d.seconds);
          this.setDuration(d.duration);
          this.emit('timeupdate');
        });
        this.vp.on('seeked', (d: { seconds: number }) => {
          this.report(d.seconds);
          this.emit('seeked');
        });
        this.vp.on('bufferstart', () => this.setStalled(true));
        this.vp.on('bufferend', () => this.setStalled(false));
      })
      .catch(() => this.emit('error'));
  }

  private call(fn: () => void) {
    if (this.ready) fn();
    else this.pending.push(fn);
  }
  protected seekTo(t: number) {
    this.call(() => this.vp.setCurrentTime(t).catch(() => {}));
  }
  protected doPlay() {
    this.call(() => this.vp.play().catch(() => {}));
  }
  protected doPause() {
    this.call(() => this.vp.pause().catch(() => {}));
  }
  protected setMuted(m: boolean) {
    this.call(() => this.vp.setMuted(m).catch(() => {}));
  }
  destroy() {
    this.vp?.destroy().catch(() => {});
    super.destroy();
  }
}
