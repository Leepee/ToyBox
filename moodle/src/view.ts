import Ajax from 'core/ajax';
import Notification from 'core/notification';
import { add as addToast } from 'core/toast';
import { ToyBoxPlayer, fmt } from '../../core/src/player';
import { StandaloneToy } from '../../core/src/standalone';
import { el, fromServer, loadTheme, readConfig, type Aspect, type MoodleToy } from './shared';

interface ViewConfig {
  cmid: number;
  mode: 'video' | 'toy';
  aspect: Aspect;
  theme: string;
  /** Shown on the course page: load when scrolled into view, and log the view. */
  inline: boolean;
  videoUrl: string | null;
  sdkUrl: string;
  toys: any[];
  finished: number[];
  canSubmit: boolean;
  activityComplete: boolean;
  strings: Record<string, string>;
}

/** All players on the page, so starting one video can pause the others. */
const players = new Set<ToyBoxPlayer>();

/** Starts one ToyBox (kept for callers that pass a selector). */
export const init = (selector: string) => {
  const root = document.querySelector<HTMLElement>(selector);
  if (root) setup(root);
};

let watching = false;

/**
 * Starts every ToyBox on the page, and any added later (the course page
 * re-renders activities when teachers move or edit them).
 */
export const initAll = () => {
  const scan = () => document.querySelectorAll<HTMLElement>('[data-region="mod-toybox"]').forEach(setup);
  scan();
  if (watching) return;
  watching = true;
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
};

function setup(root: HTMLElement) {
  if (root.dataset.tbStarted || !root.querySelector('script.mod-toybox-config')) return;
  root.dataset.tbStarted = '1';
  const cfg = readConfig<ViewConfig>(root);
  if (!cfg.inline || !('IntersectionObserver' in window)) {
    start(root, cfg);
    return;
  }
  // On the course page: only build the player when it's (nearly) on screen.
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      start(root, cfg);
      Promise.resolve(Ajax.call([{ methodname: 'mod_toybox_view_toybox', args: { cmid: cfg.cmid } }])[0]).catch(() => {});
    },
    { rootMargin: '300px 0px' },
  );
  io.observe(root);
}

/**
 * The student view: plays the video with its toys, or shows the single toy,
 * and saves each finished toy so Moodle completion can tick over.
 */
async function start(root: HTMLElement, cfg: ViewConfig) {
  const theme = await loadTheme(cfg.theme, cfg.sdkUrl);
  const toys = fromServer(cfg.toys);
  const finished = new Set(cfg.finished.map(String));
  let activityComplete = cfg.activityComplete;
  const mount = root.querySelector<HTMLElement>('.mod-toybox-stage')!;

  const save = (toyId: string, result: unknown) => {
    if (!cfg.canSubmit || !/^\d+$/.test(toyId)) return;
    // Moodle's Ajax returns jQuery promises; wrap them to get a native Promise.
    Promise.resolve(
      Ajax.call([
        {
          methodname: 'mod_toybox_record_result',
          args: { cmid: cfg.cmid, toyid: Number(toyId), result: JSON.stringify(result ?? null) },
        },
      ])[0],
    )
      .then((r: { activitycomplete: boolean }) => {
        if (r.activitycomplete && !activityComplete) {
          activityComplete = true;
          addToast(cfg.strings.activitycomplete, { type: 'success' });
        }
      })
      .catch(Notification.exception);
  };

  // A toy that tried to open another web page was stopped: note it in the logs.
  const blocked = (toyId: string) => {
    if (!/^\d+$/.test(toyId)) return;
    Promise.resolve(
      Ajax.call([{ methodname: 'mod_toybox_report_blocked', args: { cmid: cfg.cmid, toyid: Number(toyId) } }])[0],
    ).catch(() => {});
  };

  if (cfg.mode === 'toy') {
    const toy = toys[0];
    if (!toy) return;
    const status = el<'p'>('p.mod-toybox-status', { 'aria-live': 'polite' });
    const host = new StandaloneToy(mount, {
      sdkUrl: cfg.sdkUrl,
      theme,
      aspect: cfg.aspect,
      onComplete: (rec) => {
        finished.add(toy.id);
        status.textContent = '✓ ' + cfg.strings.finished;
        save(toy.id, rec.result);
      },
      onBlocked: () => blocked(toy.id),
    });
    host.show(toy, cfg.aspect);
    if (finished.has(toy.id)) status.textContent = '✓ ' + cfg.strings.finished;
    root.append(status);
    return;
  }

  // ---- video with toys
  if (!cfg.videoUrl) return;
  const list = el<'ul'>('ul.mod-toybox-progress');
  const renderList = () => {
    list.replaceChildren(
      ...toys.map((t: MoodleToy) =>
        el(
          'li',
          { class: finished.has(t.id) ? 'done' : '' },
          el(
            'button',
            { type: 'button', onclick: () => player.seek(t.start), title: cfg.strings.jumpto },
            el('span.t', { text: fmt(t.start) }),
            t.label || cfg.strings.untitled,
            t.required ? null : el('span.opt', { text: cfg.strings.optional }),
          ),
        ),
      ),
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
    onBlocked: (cue) => blocked(cue.id),
  });
  player.setLesson({ title: '', video: cfg.videoUrl, cues: toys }, location.href);
  players.add(player);
  player.media?.addEventListener('play', () => {
    for (const other of players) if (other !== player) other.pause();
  });
  if (toys.length) {
    root.append(el('h3.mod-toybox-progress-title', { text: cfg.strings.toysinthisvideo }), list);
    renderList();
  }
}
