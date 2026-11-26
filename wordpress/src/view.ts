// WordPress front end: starts every ToyBox on the page when it scrolls into view.
import { ToyBoxPlayer, fmt } from '../../core/src/player';
import { StandaloneToy } from '../../core/src/standalone';
import { el, fromServer, loadTheme, readConfig } from '../../core/src/hostKit';
import type { Aspect } from '../../core/src/types';
import type { SiteTokens } from '../../core/src/theme';

interface ViewConfig {
  mode: 'video' | 'toy';
  aspect: Aspect;
  theme: string;
  site?: SiteTokens | null;
  videoUrl: string | null;
  sdkUrl: string;
  toys: any[];
  strings: Record<string, string>;
}

const players = new Set<ToyBoxPlayer>();

async function start(root: HTMLElement, cfg: ViewConfig) {
  const theme = await loadTheme(cfg.theme, cfg.sdkUrl, cfg.site);
  const toys = fromServer(cfg.toys);
  const stage = root.querySelector<HTMLElement>('.toybox-stage')!;

  if (cfg.mode === 'toy') {
    const status = el<'p'>('p.toybox-status', { 'aria-live': 'polite' });
    const host = new StandaloneToy(stage, {
      sdkUrl: cfg.sdkUrl,
      theme,
      aspect: cfg.aspect,
      onComplete: () => (status.textContent = '✓ ' + cfg.strings.finished),
    });
    host.show(toys[0], cfg.aspect);
    root.append(status);
    return;
  }
  if (!cfg.videoUrl) return;
  const done = new Set<string>();
  const list = el<'ul'>('ul.toybox-progress');
  const render = () =>
    list.replaceChildren(
      ...toys.map((t) =>
        el(
          'li',
          { class: done.has(t.id) ? 'done' : '' },
          el('button', { type: 'button', title: cfg.strings.jumpto, onclick: () => player.seek(t.start) }, el('span.t', { text: fmt(t.start) }), t.label || cfg.strings.untitled),
        ),
      ),
    );
  const player = new ToyBoxPlayer(stage, {
    sdkUrl: cfg.sdkUrl,
    theme,
    onComplete: (rec) => {
      done.add(rec.cueId);
      render();
    },
  });
  player.setLesson({ title: '', video: cfg.videoUrl, cues: toys }, location.href);
  players.add(player);
  player.media?.addEventListener('play', () => {
    for (const other of players) if (other !== player) other.pause();
  });
  if (toys.length > 1) {
    root.append(el('p.toybox-progress-title', { text: cfg.strings.toysinthisvideo }), list);
    render();
  }
}

function setup(root: HTMLElement) {
  if (root.dataset.tbStarted) return;
  root.dataset.tbStarted = '1';
  const cfg = readConfig<ViewConfig>(root, 'script.toybox-config');
  if (!('IntersectionObserver' in window)) return void start(root, cfg);
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      start(root, cfg);
    },
    { rootMargin: '300px 0px' },
  );
  io.observe(root);
}

const scan = () => document.querySelectorAll<HTMLElement>('[data-region="toybox"]').forEach(setup);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
else scan();
