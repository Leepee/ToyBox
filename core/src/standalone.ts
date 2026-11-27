import { ToyFrame } from './toyHost';
import { blockedNotice } from './player';
import type { Theme } from './theme';
import type { Aspect, CompletionRecord, ToySpec } from './types';

export interface StandaloneOptions {
  sdkUrl: string;
  baseUrl?: string;
  /** Box shape. 'auto' lets the toy set its own height via the SDK. */
  aspect?: Aspect;
  lockdown?: boolean;
  theme?: Theme;
  onComplete?: (rec: CompletionRecord) => void;
  onLog?: (spec: ToySpec, data: unknown) => void;
  /** The toy tried to navigate away and was stopped (hosts can log this). */
  onBlocked?: (spec: ToySpec) => void;
}

const RATIOS: Record<Exclude<Aspect, 'auto'>, string> = {
  '16:9': '16 / 9',
  '4:3': '4 / 3',
  '1:1': '1 / 1',
  '3:4': '3 / 4',
};

/**
 * A single toy on its own: no video behind it.
 * The toy is told `hasVideo: false`, so pause/play/seek do nothing and toys
 * can hide video-only buttons such as "Rewatch".
 */
export class StandaloneToy {
  readonly root: HTMLElement;
  private frame: ToyFrame | null = null;

  constructor(
    container: HTMLElement,
    private opts: StandaloneOptions,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'tb-standalone';
    container.replaceChildren(this.root);
  }

  /** Show (or replace) the toy. */
  show(spec: ToySpec, aspect: Aspect = this.opts.aspect ?? '16:9') {
    this.frame?.destroy();
    this.root.classList.toggle('tb-auto', aspect === 'auto');
    this.root.style.aspectRatio = aspect === 'auto' ? '' : RATIOS[aspect];
    const frame = new ToyFrame(spec, {
      baseUrl: this.opts.baseUrl ?? location.href,
      sdkUrl: this.opts.sdkUrl,
      hasVideo: false,
      lockdown: this.opts.lockdown,
      theme: this.opts.theme,
      emit: (msg) => {
        if (msg.type === 'complete') this.opts.onComplete?.({ cueId: spec.id, label: spec.label, at: 0, result: msg.result });
        else if (msg.type === 'log') this.opts.onLog?.(spec, msg.data);
        else if (msg.type === 'resize' && aspect === 'auto') frame.el.style.height = `${Math.ceil(msg.height)}px`;
        else if (msg.type === 'navigated') {
          frame.el.replaceWith(blockedNotice());
          this.opts.onBlocked?.(spec);
        }
      },
    });
    if (aspect === 'auto') frame.el.style.height = '320px'; // until the toy reports its size
    this.root.appendChild(frame.el);
    this.frame = frame;
  }

  /** Use a different theme from the next show(). */
  setTheme(theme: Theme) {
    this.opts.theme = theme;
  }

  destroy() {
    this.frame?.destroy();
    this.root.remove();
  }
}
