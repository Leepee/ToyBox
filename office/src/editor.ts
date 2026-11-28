// The ToyBox PowerPoint add-in: the editor window (an Office dialog).
// The same editor as Moodle and WordPress; "Save to slide" sends the toy back to the slide.
import '../../core/src/player.css';
import '../../moodle/src/styles.css';
import './office.css';
import { mountEditor } from '../../core/src/editor';
import { el } from '../../core/src/hostKit';
import { THEMES } from '../../core/src/theme';
import { parseToyFile, toToyFile } from '../../core/src/toyFile';
import type { EditorToy } from '../../core/src/hostKit';
import type { Aspect } from '../../core/src/types';
import { editorChannel, inOffice, officeReady, type SlideToy } from './channel';
import { EDITOR_STRINGS, UI } from './strings';
import { ask, tell, toast } from './dialogs';

const base = new URL('../', location.href).href;

async function start() {
  const office = inOffice(await officeReady());
  const root = document.getElementById('toybox-editor')!;
  let send: ReturnType<typeof editorChannel>;
  let started = false;
  send = editorChannel(office, (m) => {
    if (m.type === 'init' && !started) {
      started = true;
      build(m.saved);
    }
  });
  send({ type: 'ready' });

  function build(saved: SlideToy | null) {
    let theme = saved?.theme && THEMES[saved.theme] ? saved.theme : 'solent';
    let toys: any[] = saved
      ? [{ id: 'slide', label: saved.toy.label, html: saved.toy.html, params: saved.toy.params ?? {}, start: 0, end: 2, rect: { x: 0, y: 0, w: 100, h: 100 }, required: true }]
      : [];
    let aspect: Aspect = saved?.toy.aspect ?? '16:9';
    let dirty = false;

    const look = el<'select'>('select.form-select.tb-office-look', { 'aria-label': UI.look });
    for (const [id, t] of Object.entries(THEMES)) look.append(el('option', { value: id, text: t.name, selected: id === theme }));
    look.onchange = () => {
      theme = look.value;
      dirty = true;
      mount();
    };
    const cancel = el<'button'>('button.btn.btn-outline-secondary', {
      type: 'button',
      text: UI.cancel,
      onclick: async () => {
        if (dirty && !(await ask(UI.closeconfirm))) return;
        send({ type: 'cancel' });
      },
    });
    const bar = el('div.tb-office-bar', {}, el('label', {}, UI.look + ' ', look), el('span.tb-office-spacer'), cancel);
    const holder = el<'div'>('div.tb-office-editor');
    root.replaceChildren(bar, holder);

    function mount() {
      holder.replaceChildren();
      mountEditor(
        holder,
        {
          mode: 'toy',
          aspect,
          theme,
          videoUrl: null,
          sdkUrl: base + 'toybox-sdk.js',
          pluginUrl: base,
          guideUrl: base + 'toybox-toy-guide.md',
          toys,
          strings: EDITOR_STRINGS,
        },
        {
          save: (list: EditorToy[], a: Aspect) => {
            const toy = parseToyFile(toToyFile(list[0], a));
            dirty = false;
            send({ type: 'save', saved: { toy, theme } });
            return Promise.resolve(list);
          },
          onChange: (list: EditorToy[], a: Aspect) => {
            toys = list;
            aspect = a;
          },
          confirm: (message) => ask(message),
          notify: (message, type) => toast(message, type),
          alert: (title, message) => tell(title, message),
          error: (e) => tell('ToyBox', String((e as Error)?.message ?? e)),
        },
      ).then(() => {
        // Edits mark the editor's own save state; track them for "Cancel".
        holder.addEventListener('input', () => (dirty = true));
        holder.addEventListener('change', () => (dirty = true));
      });
    }
    mount();
  }
}

start();
