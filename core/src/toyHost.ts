import type { ToyMessage, ToySpec } from './types';

export interface ToyFrameOptions {
  /** Base URL that relative `toy` file paths resolve against. */
  baseUrl: string;
  /** Absolute URL of toybox-sdk.js, injected into inline toys. */
  sdkUrl: string;
  /** Tells the toy whether there is a video it can pause/seek. */
  hasVideo: boolean;
  /**
   * Add a Content-Security-Policy to inline toys so they can't load outside
   * scripts or send data anywhere (fetch, images, forms…). Default true.
   */
  lockdown?: boolean;
  emit: (msg: ToyMessage, spec: ToySpec) => void;
}

/**
 * Runs a single toy inside a sandboxed iframe.
 *
 * Toys are written by educators, so they never run in the page itself:
 * `sandbox="allow-scripts"` (without allow-same-origin) gives the toy an
 * opaque origin. It can run JS and draw anything inside its box, but cannot
 * touch the host page, its cookies, or its storage. The only way out is
 * postMessage, which we validate here. Callers position `el` themselves.
 */
export class ToyFrame {
  readonly el: HTMLIFrameElement;
  private ready = false;
  private queue: object[] = [];
  private onMessage = (e: MessageEvent) => this.handle(e);

  constructor(
    readonly spec: ToySpec,
    private opts: ToyFrameOptions,
  ) {
    const f = document.createElement('iframe');
    f.className = 'toy';
    f.title = spec.label ?? spec.id;
    f.setAttribute('sandbox', 'allow-scripts');
    f.setAttribute('allow', 'autoplay');
    f.setAttribute('referrerpolicy', 'no-referrer');

    if (spec.html != null) {
      f.srcdoc = prepareToyHtml(spec.html, opts.sdkUrl, opts.lockdown !== false);
    } else if (spec.toy) {
      f.src = new URL(spec.toy, opts.baseUrl).href;
    }
    this.el = f;
    window.addEventListener('message', this.onMessage);
  }

  /** Send a message to the toy (queued until the toy says it's ready). */
  post(msg: object) {
    if (!this.ready) {
      this.queue.push(msg);
      return;
    }
    // Sandboxed frames have an opaque origin, so '*' is the only usable target.
    // We never send anything sensitive to toys.
    this.el.contentWindow?.postMessage({ toybox: 1, ...msg }, '*');
  }

  destroy() {
    window.removeEventListener('message', this.onMessage);
    this.el.remove();
  }

  private handle(e: MessageEvent) {
    if (e.source !== this.el.contentWindow) return; // only listen to *our* iframe
    const d = e.data;
    if (!d || d.toybox !== 1 || typeof d.type !== 'string') return;

    const msg = sanitize(d);
    if (!msg) return;

    if (msg.type === 'ready') {
      this.ready = true;
      const s = this.spec as ToySpec & { start?: number; end?: number };
      this.post({
        type: 'init',
        params: s.params ?? {},
        cue: { id: s.id, start: s.start ?? 0, end: s.end ?? 0 },
        hasVideo: this.opts.hasVideo,
      });
      for (const m of this.queue.splice(0)) this.post(m);
    }
    this.opts.emit(msg, this.spec);
  }
}

function sanitize(d: any): ToyMessage | null {
  switch (d.type) {
    case 'ready':
    case 'pause':
    case 'play':
      return { type: d.type };
    case 'seek':
      return Number.isFinite(d.time) ? { type: 'seek', time: Number(d.time) } : null;
    case 'complete':
      return { type: 'complete', result: d.result };
    case 'log':
      return { type: 'log', data: d.data };
    case 'resize':
      return Number.isFinite(d.height) && d.height > 0 ? { type: 'resize', height: Math.min(Number(d.height), 4000) } : null;
    default:
      return null;
  }
}

/** The policy added to every inline toy: inline code only, no network. */
export function toyCsp(sdkUrl: string) {
  return [
    "default-src 'none'",
    `script-src 'unsafe-inline' ${sdkUrl}`,
    "style-src 'unsafe-inline'",
    'img-src data: blob:',
    'media-src data: blob:',
    'font-src data:',
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
  ].join('; ');
}

/**
 * Get an educator's toy HTML ready to run: point its SDK <script> at the real
 * SDK (adding one if they forgot), and lock it down with a CSP.
 */
export function prepareToyHtml(html: string, sdkUrl: string, lockdown = true): string {
  const sdkTag = `<script src="${sdkUrl}"></script>`;
  let out = /toybox-sdk\.js/.test(html)
    ? html.replace(/(["'])[^"']*toybox-sdk\.js\1/g, `"${sdkUrl}"`)
    : html;
  const head =
    (lockdown ? `<meta http-equiv="Content-Security-Policy" content="${toyCsp(sdkUrl)}">` : '') +
    (/toybox-sdk\.js/.test(html) ? '' : sdkTag);
  if (/<head[^>]*>/i.test(out)) return out.replace(/<head[^>]*>/i, (m) => m + head);
  if (/<html[^>]*>/i.test(out)) return out.replace(/<html[^>]*>/i, (m) => m + '<head>' + head + '</head>');
  return head + out;
}
