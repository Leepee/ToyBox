import type { Cue, ToyMessage } from './types';

/**
 * Runs a single toy inside a sandboxed iframe.
 *
 * Toys are written by educators, so they never run in the page itself:
 * `sandbox="allow-scripts"` (without allow-same-origin) gives the toy an
 * opaque origin. It can run JS and draw anything inside its box, but cannot
 * touch the player page, its cookies, or its storage. The only way out is
 * postMessage, which we validate here.
 */
export class ToyFrame {
  readonly el: HTMLIFrameElement;
  private ready = false;
  private queue: object[] = [];
  private onMessage = (e: MessageEvent) => this.handle(e);

  constructor(
    readonly cue: Cue,
    baseUrl: string,
    private sdkUrl: string,
    private emit: (msg: ToyMessage, cue: Cue) => void,
  ) {
    const f = document.createElement('iframe');
    f.className = 'toy';
    f.title = cue.label ?? cue.id;
    f.setAttribute('sandbox', 'allow-scripts');
    f.setAttribute('allow', '');
    const { x, y, w, h } = cue.rect;
    Object.assign(f.style, { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });

    if (cue.html != null) {
      f.srcdoc = injectSdk(cue.html, this.sdkUrl);
    } else if (cue.toy) {
      f.src = new URL(cue.toy, baseUrl).href;
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
      this.post({ type: 'init', params: this.cue.params ?? {}, cue: { id: this.cue.id, start: this.cue.start, end: this.cue.end } });
      for (const m of this.queue.splice(0)) this.post(m);
    }
    this.emit(msg, this.cue);
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
    default:
      return null;
  }
}

/** Make sure inline toys get the SDK even if the author forgot the script tag. */
export function injectSdk(html: string, sdkUrl: string): string {
  if (/toybox-sdk\.js/.test(html)) return html.replace(/(["'])[^"']*toybox-sdk\.js\1/g, `"${sdkUrl}"`);
  const tag = `<script src="${sdkUrl}"></script>`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + tag) : tag + html;
}
