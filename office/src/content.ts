// The ToyBox PowerPoint add-in: the box on the slide.
// Shows the slide's toy (interactive in the slide show), and opens the editor
// window to make or change it. The toy is saved inside the presentation.
import '../../core/src/player.css';
import './office.css';
import { StandaloneToy } from '../../core/src/standalone';
import { EXAMPLES } from '../../core/src/examples';
import { el, loadTheme } from '../../core/src/hostKit';
import { parseToyFile } from '../../core/src/toyFile';
import { THEMES } from '../../core/src/theme';
import { inOffice, officeReady, readMessage, type ChannelMessage, type SlideToy } from './channel';
import { UI } from './strings';

declare const Office: any;

const KEY = 'toybox';
const base = new URL('../', location.href).href;
const sdkUrl = base + 'toybox-sdk.js';
export const DEFAULT_THEME = 'solent';

/** Where the slide's toy is kept: the presentation (in PowerPoint) or this browser (trying it out). */
interface Store {
  load(): SlideToy | null;
  save(s: SlideToy): Promise<void>;
}

const valid = (v: any): SlideToy | null => {
  try {
    if (!v || typeof v !== 'object') return null;
    return { toy: parseToyFile(JSON.stringify(v.toy)), theme: THEMES[v.theme] ? v.theme : DEFAULT_THEME };
  } catch {
    return null;
  }
};

const officeStore = (): Store => ({
  load: () => valid(Office.context.document.settings.get(KEY)),
  save: (s) =>
    new Promise((resolve, reject) => {
      Office.context.document.settings.set(KEY, s);
      Office.context.document.settings.saveAsync((r: any) => (r.status === 'failed' ? reject(r.error) : resolve()));
    }),
});

const browserStore = (): Store => ({
  load: () => {
    try {
      return valid(JSON.parse(localStorage.getItem('toybox-office') ?? 'null'));
    } catch {
      return null;
    }
  },
  save: async (s) => {
    try {
      localStorage.setItem('toybox-office', JSON.stringify(s));
    } catch {
      /* fine: it only lasts for this visit */
    }
  },
});

async function start() {
  const info = await officeReady();
  const office = inOffice(info);
  const store = office ? officeStore() : browserStore();
  const root = document.getElementById('toybox-slide')!;
  let saved = store.load();
  let editing = true; // false in the slide show

  const editBtn = el<'button'>('button.tb-office-edit', { type: 'button', text: '✎ ' + UI.edittoy, onclick: () => openEditor() });

  async function render() {
    root.replaceChildren();
    if (!saved) return renderWelcome();
    const theme = await loadTheme(saved.theme, sdkUrl);
    const stage = el<'div'>('div.tb-office-stage');
    root.append(stage, editBtn);
    new StandaloneToy(stage, { sdkUrl, theme, aspect: '16:9' }).show({ id: 'slide', label: saved.toy.label, html: saved.toy.html, params: saved.toy.params }, '16:9');
    editBtn.hidden = !editing;
  }

  function renderWelcome() {
    const examples = el<'div'>('div.tb-office-examples');
    for (const ex of EXAMPLES) {
      if (ex.file === 'starter') continue;
      examples.append(
        el('button.tb-office-btn', {
          type: 'button',
          text: ex.name,
          onclick: async () => {
            const html = await (await fetch(base + ex.file)).text();
            await put({ toy: { toybox: 1, label: ex.name, html, params: { ...ex.params } }, theme: saved?.theme ?? DEFAULT_THEME });
          },
        }),
      );
    }
    const file = el<'input'>('input', { type: 'file', accept: '.json,application/json', hidden: true });
    file.onchange = async () => {
      const f = file.files?.[0];
      file.value = '';
      if (!f) return;
      try {
        await put({ toy: parseToyFile(await f.text()), theme: saved?.theme ?? DEFAULT_THEME });
      } catch {
        status.textContent = EDITOR_BAD;
      }
    };
    const status = el<'p'>('p.tb-office-status', { 'aria-live': 'polite' });
    root.append(
      el(
        'div.tb-office-welcome',
        {},
        el('h1', { text: UI.welcome }),
        el('p', { text: UI.welcomehelp }),
        examples,
        el(
          'div.tb-office-actions',
          {},
          el('button.tb-office-btn.primary', { type: 'button', text: '✨ ' + UI.maketoy, onclick: () => openEditor() }),
          el('button.tb-office-btn', { type: 'button', text: '⬆ ' + UI.importfile, title: UI.importhelp, onclick: () => file.click() }),
          file,
        ),
        status,
      ),
    );
  }

  async function put(s: SlideToy) {
    saved = s;
    await store.save(s);
    await render();
  }

  // ---- the editor window
  function openEditor() {
    const url = new URL('editor.html', location.href).href;
    const handle = async (m: ChannelMessage | null, reply: (m: ChannelMessage) => void, close: () => void) => {
      if (!m) return;
      if (m.type === 'ready') reply({ type: 'init', saved });
      else if (m.type === 'save') {
        const v = valid(m.saved);
        if (v) await put(v);
        close();
      } else if (m.type === 'cancel') close();
    };

    if (office && Office.context.ui?.displayDialogAsync) {
      if (!Office.context.requirements?.isSetSupported?.('DialogApi', '1.2')) {
        root.append(el('p.tb-office-status', { text: UI.needsupdate }));
        return;
      }
      Office.context.ui.displayDialogAsync(url, { height: 88, width: 85, displayInIframe: true }, (r: any) => {
        if (r.status === 'failed') return;
        const dialog = r.value;
        dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg: { message: string }) =>
          handle(readMessage(arg.message), (m) => dialog.messageChild(JSON.stringify(m)), () => dialog.close()),
        );
      });
      return;
    }

    // In a browser: the editor in a frame over the page.
    const frame = el<'iframe'>('iframe.tb-office-overlay', { src: url, title: UI.maketoy });
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frame.contentWindow) return;
      handle(
        readMessage(e.data),
        (m) => frame.contentWindow?.postMessage(JSON.stringify(m), location.origin),
        () => {
          window.removeEventListener('message', onMsg);
          frame.remove();
        },
      );
    };
    window.addEventListener('message', onMsg);
    document.body.append(frame);
  }

  // Hide the edit button in the slide show.
  if (office && Office.context.document.getActiveViewAsync) {
    const setView = (v: string) => {
      editing = v !== 'read';
      editBtn.hidden = !editing || !saved;
    };
    Office.context.document.getActiveViewAsync((r: any) => setView(r.value));
    Office.context.document.addHandlerAsync?.(Office.EventType.ActiveViewChanged, (e: any) => setView(e.activeView));
  }

  await render();
}

const EDITOR_BAD = "That isn't a ToyBox toy file.";

start();
