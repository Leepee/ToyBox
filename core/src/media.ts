/**
 * Video sources for the player. Every source looks like a small subset of
 * HTMLVideoElement (currentTime, duration, paused, play, pause, events), so the
 * player, toys and editors don't care where the video comes from.
 *
 *   - FileMedia:    an <video> element (mp4/webm, uploaded or linked)
 *   - YouTubeMedia: YouTube's IFrame Player API (privacy-enhanced youtube-nocookie.com)
 *   - VimeoMedia:   Vimeo's Player.js API (do-not-track)
 *   - PanoptoMedia: Panopto's Embed API (viewers need access to the Panopto session)
 *
 * YouTube and Vimeo only report the time a few times a second, so EmbedMedia
 * interpolates between reports with the wall clock while playing.
 */

export type MediaKind = 'file' | 'youtube' | 'vimeo' | 'panopto';

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
  /** 0 (silent) to 1 (full). */
  volume: number;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, fn: () => void): void;
  removeEventListener(type: string, fn: () => void): void;
  destroy(): void;
}

export type ParsedVideo =
  | { kind: 'youtube'; id: string; start?: number }
  | { kind: 'vimeo'; id: string; hash?: string }
  | { kind: 'panopto'; server: string; id: string }
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
  // Panopto: https://<server>/Panopto/Pages/Viewer.aspx?id=<guid> (or Embed.aspx)
  const pid = u.searchParams.get('id');
  if (/\/Panopto\/Pages\/(Viewer|Embed)\.aspx$/i.test(u.pathname) && pid && /^[0-9a-f-]{36}$/i.test(pid)) {
    return { kind: 'panopto', server: u.host, id: pid };
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
  if (v.kind === 'panopto') return new PanoptoMedia(v.server, v.id);
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
  get volume() {
    return this.el.volume;
  }
  set volume(v: number) {
    this.el.volume = Math.min(1, Math.max(0, v));
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
  /** True once the viewer muted it themselves (so playback doesn't unmute it again). */
  protected userMuted = false;
  private vol = 1;
  /** True once the viewer set the volume themselves. */
  protected userVolume = false;

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
    this.userMuted = m;
    this.syncMuted(m);
    this.setMuted(m);
  }
  get volume() {
    return this.vol;
  }
  set volume(v: number) {
    this.userVolume = true;
    this.syncVolume(Math.min(1, Math.max(0, v)));
    this.applyVolume(this.vol);
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
  /** The provider told us whether it's muted (e.g. a browser forced muted playback). */
  protected syncMuted(m: boolean) {
    if (m === this.isMuted) return;
    this.isMuted = m;
    this.emit('volumechange');
  }
  /** The provider told us its volume (0–1). */
  protected syncVolume(v: number) {
    if (!Number.isFinite(v) || Math.abs(v - this.vol) < 0.001) return;
    this.vol = v;
    this.emit('volumechange');
  }
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
  protected abstract applyVolume(v: number): void;
}

// ---------------------------------------------------------------------------
// YouTube, Vimeo and Panopto are driven by talking to their player frames with
// postMessage, the same messages their own API scripts send. So none of their
// scripts ever run in the host page (a Moodle or WordPress page with the
// viewer's session); their code stays inside their own cross-origin frames.

/** Parse a message that may arrive as a JSON string or an object. */
function parseMessage(data: unknown): any {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/** An embedded player in a cross-origin iframe, controlled by messages. */
abstract class FrameMedia extends EmbedMedia {
  protected frame: HTMLIFrameElement;
  private onMessage = (e: MessageEvent) => {
    // Only this player's own frame, from the site it should come from.
    if (e.source !== this.frame.contentWindow || e.origin !== this.origin) return;
    const d = parseMessage(e.data);
    if (d && typeof d === 'object') this.receive(d);
  };

  constructor(
    protected readonly origin: string,
    src: string,
  ) {
    super();
    const f = (this.frame = document.createElement('iframe'));
    f.src = src;
    f.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    f.setAttribute('allowfullscreen', '');
    f.width = '100%';
    f.height = '100%';
    f.style.border = '0';
    this.target.appendChild(f);
    window.addEventListener('message', this.onMessage);
  }

  /** Post to the player frame (only ever to the player's own site). */
  protected post(msg: unknown, asString = true) {
    this.frame.contentWindow?.postMessage(asString ? JSON.stringify(msg) : msg, this.origin);
  }
  protected abstract receive(d: any): void;

  destroy() {
    window.removeEventListener('message', this.onMessage);
    super.destroy();
  }
}

// ---------------------------------------------------------------------------

const YT_ORIGIN = 'https://www.youtube-nocookie.com';

/** A YouTube video (privacy-enhanced mode), through the IFrame API's message channel. */
export class YouTubeMedia extends FrameMedia {
  readonly kind = 'youtube' as const;
  private hello = 0;
  private pending: (() => void)[] = [];
  private state = -1;
  private vol100 = 100;

  constructor(readonly videoId: string) {
    const q = new URLSearchParams({
      enablejsapi: '1',
      controls: '0', // ToyBox draws its own controls
      disablekb: '1',
      fs: '0',
      rel: '0',
      playsinline: '1',
      iv_load_policy: '3',
      modestbranding: '1',
      origin: location.origin,
    });
    super(YT_ORIGIN, `${YT_ORIGIN}/embed/${encodeURIComponent(videoId)}?${q}`);
    // Say hello until the player answers (it ignores messages sent before it has loaded).
    const listen = () => this.post({ event: 'listening', id: 1, channel: 'widget' });
    this.frame.addEventListener('load', () => {
      listen();
      if (!this.hello) this.hello = window.setInterval(listen, 250);
    });
  }

  private command(func: string, args: unknown[] = []) {
    const send = () => this.post({ event: 'command', func, args, id: 1, channel: 'widget' });
    if (this.ready) send();
    else this.pending.push(send);
  }

  protected receive(d: any) {
    if (d.event === 'onReady' || d.event === 'initialDelivery') {
      clearInterval(this.hello);
      this.hello = -1;
    }
    if (d.event === 'initialDelivery' || d.event === 'infoDelivery') this.info(d.info ?? {});
    if (d.event === 'onReady' && !this.ready) {
      this.post({ event: 'command', func: 'addEventListener', args: ['onStateChange'], id: 1, channel: 'widget' });
      this.markReady();
      for (const fn of this.pending.splice(0)) fn();
    }
    if (d.event === 'onStateChange' && typeof d.info === 'number') this.onState(d.info);
  }

  private info(i: any) {
    if (typeof i.duration === 'number') this.setDuration(i.duration);
    if (typeof i.muted === 'boolean') this.syncMuted(i.muted);
    if (typeof i.volume === 'number') {
      this.vol100 = i.volume;
      this.syncVolume(i.volume / 100);
    }
    if (typeof i.playerState === 'number' && i.playerState !== this.state) this.onState(i.playerState);
    if (typeof i.currentTime === 'number') {
      this.report(i.currentTime);
      if (this.state === 1) this.emit('timeupdate');
    }
  }

  private onState(s: number) {
    // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    this.state = s;
    if (s === 1 || s === 3) {
      this.setStalled(s === 3);
      this.setPlaying(true);
    } else if (s === 2 || s === 0) {
      this.setPlaying(false);
      if (s === 0) this.emit('ended');
    }
  }

  protected seekTo(t: number) {
    this.command('seekTo', [t, true]);
    // YouTube has no "seeked" event; give it a moment to land.
    setTimeout(() => this.emit('seeked'), 150);
  }
  protected doPlay() {
    this.command('playVideo');
    if (!this.userMuted) this.command('unMute');
    // A volume of 0 left over from elsewhere is never what the viewer wants.
    if (!this.userVolume && this.vol100 === 0) this.command('setVolume', [100]);
  }
  protected applyVolume(v: number) {
    this.command('setVolume', [Math.round(v * 100)]);
  }
  protected doPause() {
    this.command('pauseVideo');
  }
  protected setMuted(m: boolean) {
    this.command(m ? 'mute' : 'unMute');
  }
  destroy() {
    clearInterval(this.hello);
    super.destroy();
  }
}

// ---------------------------------------------------------------------------

const VIMEO_ORIGIN = 'https://player.vimeo.com';
const VIMEO_EVENTS = ['play', 'pause', 'ended', 'timeupdate', 'seeked', 'bufferstart', 'bufferend', 'volumechange'];

/** A Vimeo video, through the message channel Vimeo's Player.js uses. */
export class VimeoMedia extends FrameMedia {
  readonly kind = 'vimeo' as const;
  private pending: (() => void)[] = [];
  private gotReady = false;

  constructor(
    readonly videoId: string,
    readonly hash?: string,
  ) {
    const q = new URLSearchParams({
      ...(hash ? { h: hash } : {}),
      api: '1',
      controls: '0',
      dnt: '1',
      playsinline: '1',
      title: '0',
      byline: '0',
      portrait: '0',
    });
    super(VIMEO_ORIGIN, `${VIMEO_ORIGIN}/video/${encodeURIComponent(videoId)}?${q}`);
  }

  private send(method: string, value?: unknown) {
    this.post(value === undefined ? { method } : { method, value }, false);
  }
  private call(method: string, value?: unknown) {
    const go = () => this.send(method, value);
    if (this.ready) go();
    else this.pending.push(go);
  }

  protected receive(d: any) {
    if (d.event === 'ready' && !this.gotReady) {
      this.gotReady = true;
      for (const ev of VIMEO_EVENTS) this.send('addEventListener', ev);
      this.send('getDuration');
      this.send('getVolume');
      this.send('getMuted');
      return;
    }
    // Answers to get… calls.
    if (d.method === 'getDuration' && typeof d.value === 'number') {
      this.setDuration(d.value);
      if (!this.ready) {
        this.markReady();
        for (const fn of this.pending.splice(0)) fn();
      }
    } else if (d.method === 'getVolume' && typeof d.value === 'number') {
      this.syncVolume(d.value);
    } else if (d.method === 'getMuted' && typeof d.value === 'boolean') {
      this.syncMuted(d.value);
    }
    const data = d.data ?? {};
    switch (d.event) {
      case 'play':
        if (typeof data.seconds === 'number') this.report(data.seconds);
        this.setPlaying(true);
        break;
      case 'pause':
        if (typeof data.seconds === 'number') this.report(data.seconds);
        this.setPlaying(false);
        break;
      case 'ended':
        this.setPlaying(false);
        this.emit('ended');
        break;
      case 'timeupdate':
        if (typeof data.seconds === 'number') this.report(data.seconds);
        if (typeof data.duration === 'number') this.setDuration(data.duration);
        this.emit('timeupdate');
        break;
      case 'seeked':
        if (typeof data.seconds === 'number') this.report(data.seconds);
        this.emit('seeked');
        break;
      case 'bufferstart':
        this.setStalled(true);
        break;
      case 'bufferend':
        this.setStalled(false);
        break;
      case 'volumechange':
        if (typeof data.volume === 'number') this.syncVolume(data.volume);
        if (typeof data.muted === 'boolean') this.syncMuted(data.muted);
        break;
    }
  }

  protected seekTo(t: number) {
    this.call('setCurrentTime', t);
  }
  protected doPlay() {
    this.call('play');
    if (!this.userMuted) this.call('setMuted', false);
    // A volume of 0 left over from elsewhere is never what the viewer wants.
    if (!this.userVolume && this.volume === 0) this.call('setVolume', 1);
  }
  protected applyVolume(v: number) {
    this.call('setVolume', v);
  }
  protected doPause() {
    this.call('pause');
  }
  protected setMuted(m: boolean) {
    this.call('setMuted', m);
  }
}

// ---------------------------------------------------------------------------

let panoptoCount = 0;

/**
 * A Panopto session, through the message channel Panopto's Embed API uses.
 *
 * Panopto's "load" starts playback immediately, and playback that doesn't
 * come from a click is forced to start muted. So the video is only loaded when
 * the viewer first presses play: nothing streams before then, and that first
 * play is a real click, so it has sound. Seeks before then are remembered.
 */
export class PanoptoMedia extends FrameMedia {
  readonly kind = 'panopto' as const;
  private readonly embedId: string;
  private iframeReady = false;
  private loaded = false;
  private beforeIframe: (() => void)[] = [];
  private afterLoad: (() => void)[] = [];
  private pendingSeek: number | null = null;
  private lastReported = -1;
  private remote = { volume: 1, isMuted: false, isPaused: true, isFinished: false };

  constructor(
    readonly server: string,
    readonly sessionId: string,
  ) {
    const embedId = `tb-panopto-${++panoptoCount}`;
    const q = new URLSearchParams({
      id: sessionId,
      remoteEmbed: 'true',
      remoteHost: location.origin,
      embedApiId: embedId,
      // Keep Panopto's own UI out of the way: ToyBox draws the controls.
      interactivity: 'none',
      showtitle: 'false',
      showbrand: 'false',
      offerviewer: 'false',
      autoplay: 'false',
    });
    super(`https://${server}`, `https://${server}/Panopto/Pages/Embed.aspx?${q}`);
    this.embedId = embedId;
  }

  private send(msg: string, data: unknown = '') {
    this.post({ msg, source: 'PanoptoEmbed', id: this.embedId, data });
  }
  /** Runs once the iframe can take commands. */
  private whenIframe(fn: () => void) {
    if (this.iframeReady) fn();
    else this.beforeIframe.push(fn);
  }
  /** Runs once the video itself has loaded (after the first play). */
  private whenLoaded(fn: () => void) {
    if (this.ready) fn();
    else this.afterLoad.push(fn);
  }

  protected receive(d: any) {
    if (d.source !== 'PanoptoEmbed' || (d.id !== this.embedId && d.id !== '*')) return;
    switch (d.msg) {
      case 'embedIframeReady':
        this.iframeReady = true;
        for (const fn of this.beforeIframe.splice(0)) fn();
        break;
      case 'iframeError':
        this.emit('error');
        break;
      case 'iframeLoginShown':
        this.emit('login');
        break;
      case 'iframeState':
        this.onIframeState(d.data ?? {});
        break;
    }
  }

  private onIframeState(p: any) {
    this.remote = { volume: p.volume, isMuted: p.isMuted, isPaused: p.isPaused, isFinished: p.isFinished };
    if (typeof p.duration === 'number') this.setDuration(p.duration);
    if (typeof p.isMuted === 'boolean') this.syncMuted(p.isMuted);
    if (typeof p.volume === 'number') this.syncVolume(p.volume);
    // Take Panopto's time only when it has actually changed.
    if (typeof p.currentTime === 'number' && p.currentTime !== this.lastReported) {
      this.lastReported = p.currentTime;
      this.report(p.currentTime);
    }
    if (p.trigger !== 'iframeStateUpdate') {
      if (!p.isPaused) this.emit('timeupdate');
      return;
    }
    if (!this.ready) this.onLoaded();
    if (p.isFinished) {
      this.setPlaying(false);
      this.emit('ended');
    } else {
      this.setPlaying(!p.isPaused);
    }
  }

  private onLoaded() {
    this.markReady();
    if (this.pendingSeek !== null) {
      this.send('iframeSeek', this.pendingSeek);
      this.lastReported = -1;
      this.pendingSeek = null;
    }
    this.send(this.userMuted ? 'iframeMute' : 'iframeUnmute');
    // Panopto remembers each viewer's volume; a leftover 0 is never wanted.
    if (this.userVolume) this.send('iframeVolume', this.volume);
    else if (this.remote.volume === 0) this.send('iframeVolume', 1);
    for (const fn of this.afterLoad.splice(0)) fn();
  }

  protected seekTo(t: number) {
    if (!this.ready) {
      // Not loaded yet: jump there when it loads.
      this.pendingSeek = t;
      setTimeout(() => this.emit('seeked'), 0);
      return;
    }
    this.send('iframeSeek', t);
    this.lastReported = -1;
    setTimeout(() => this.emit('seeked'), 200);
  }
  protected doPlay() {
    this.whenIframe(() => {
      if (!this.loaded) {
        this.loaded = true;
        this.send('iframeLoad'); // loads and starts playing
        return;
      }
      this.send('iframePlay');
      if (!this.userMuted) this.send('iframeUnmute');
    });
  }
  protected doPause() {
    if (this.loaded) this.whenLoaded(() => this.send('iframePause'));
  }
  protected setMuted(m: boolean) {
    this.whenLoaded(() => this.send(m ? 'iframeMute' : 'iframeUnmute'));
  }
  protected applyVolume(v: number) {
    this.whenLoaded(() => this.send('iframeVolume', v));
  }
}
