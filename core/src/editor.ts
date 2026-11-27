// The ToyBox toy editor, shared by the Moodle and WordPress plugins (see EditorHost).
import { ToyBoxPlayer, fmt } from './player';
import { StandaloneToy } from './standalone';
import { lintToy } from './lint';
import { buildAiPrompt, guideWithTheme } from './aiPrompt';
import { EXAMPLES, STARTER } from './examples';
import { parseVideoUrl } from './media';
import { el, fromServer, loadTheme, type EditorToy } from './hostKit';
import type { Aspect } from './types';
import type { SiteTokens } from './theme';

export interface EditorConfig {
  mode: 'video' | 'toy';
  aspect: Aspect;
  theme: string;
  /** The site's colours/fonts, when the host knows them (WordPress); see SiteTokens. */
  site?: SiteTokens | null;
  videoUrl: string | null;
  sdkUrl: string;
  /** Base URL that 'toys/x.html' example paths resolve against (the plugin folder). */
  pluginUrl: string;
  guideUrl: string;
  toys: any[];
  strings: Record<string, string>;
  /** The site only allows the bundled example toys: code can't be typed in or generated. */
  codeLocked?: boolean;
}

/** One saved version of a toy's code. */
export interface ToyVersion {
  id: number;
  timestr: string;
  who: string;
  hash: string;
}

/** What the page around the editor provides (Moodle and WordPress differ here). */
export interface EditorHost {
  /** Save the toys; resolve with them as stored (with host ids). Omit when the page's own form saves (WordPress). */
  save?: (toys: EditorToy[], aspect: Aspect) => Promise<any[]>;
  /** Called after every change (WordPress copies the toys into its form). */
  onChange?: (toys: EditorToy[], aspect: Aspect) => void;
  notify: (message: string, type?: 'success' | 'info' | 'warning' | 'danger') => void;
  alert: (title: string, message: string) => void;
  error: (e: unknown) => void;
  /** Earlier versions of a saved toy, newest first (hosts that keep history). */
  history?: (toyId: string) => Promise<ToyVersion[]>;
  /** The code of one earlier version. */
  loadVersion?: (toyId: string, versionId: number) => Promise<string>;
}

let newCounter = 0;
const newId = () => `toy-${Date.now().toString(36)}-${++newCounter}`;

/**
 * The toy editor: code on the left, the real video (or the toy on its own) on the right.
 */
export async function mountEditor(root: Element, cfg: EditorConfig, host: EditorHost) {
  const theme = await loadTheme(cfg.theme, cfg.sdkUrl, cfg.site);
  const S = cfg.strings;
  const isVideo = cfg.mode === 'video';
  let toys: EditorToy[] = fromServer(cfg.toys);
  let current = 0;
  let aspect: Aspect = cfg.aspect;
  let dirty = false;
  const locked = !!cfg.codeLocked;
  const historyCache = new Map<string, Promise<ToyVersion[]>>();

  const blankToy = (): EditorToy => ({
    id: newId(),
    label: isVideo ? `${S.toy} ${toys.length + 1}` : S.toy,
    html: locked ? '' : STARTER,
    params: { ...EXAMPLES[0].params },
    start: Math.floor(player?.video.currentTime ?? 0),
    end: Math.floor(player?.video.currentTime ?? 0) + 2,
    rect: { x: 20, y: 12, w: 60, h: 62 },
    pause: true,
    resumeOnComplete: true,
    required: true,
  });

  // ---------- layout
  const status = el<'span'>('span.mod-toybox-savestate', { text: S.allsaved });
  const saveBtn = el<'button'>('button.btn.btn-primary', { type: 'button', text: S.savechanges });
  const tabs = el<'div'>('div.mod-toybox-tabs', { role: 'tablist' });
  const fields = el<'div'>('div.mod-toybox-fields');
  const stage = el<'div'>('div.mod-toybox-preview');
  const lintList = el<'ul'>('ul.mod-toybox-lint');
  const out = el<'pre'>('pre.mod-toybox-out', { text: S.messageshelp });
  root.append(
    ...(host.save ? [el('div.mod-toybox-editbar', {}, saveBtn, status)] : []),
    ...(isVideo ? [tabs] : []),
    el(
      'div.mod-toybox-editor',
      {},
      fields,
      el(
        'div.mod-toybox-side',
        {},
        stage,
        el('div.mod-toybox-panel', {}, el('h4', { text: S.checker }), lintList),
        el('div.mod-toybox-panel', {}, el('h4', { text: S.messages }), out),
      ),
    ),
  );

  const log: string[] = [];
  const print = (s: string) => {
    log.unshift(s);
    out.textContent = log.slice(0, 30).join('\n');
  };

  // ---------- preview
  let player: ToyBoxPlayer | null = null;
  let standalone: StandaloneToy | null = null;
  if (isVideo) {
    player = new ToyBoxPlayer(stage, {
      sdkUrl: cfg.sdkUrl,
      theme,
      onComplete: (r) => print(`${fmt(r.at)}  complete  ${JSON.stringify(r.result)}`),
      onLog: (_c, d) => print(`log  ${JSON.stringify(d)}`),
    });
    if (cfg.videoUrl) {
      player.setLesson({ title: '', video: cfg.videoUrl, cues: [] }, location.href);
      // Gently steer teachers towards uploaded video.
      if (parseVideoUrl(cfg.videoUrl).kind !== 'file') stage.prepend(el('div.alert.alert-info.small', { text: S.onlinevideo }));
    }
    else stage.prepend(el('div.alert.alert-warning', { text: S.novideo }));
  } else {
    standalone = new StandaloneToy(stage, {
      sdkUrl: cfg.sdkUrl,
      theme,
      onComplete: (r) => print(`complete  ${JSON.stringify(r.result)}`),
      onLog: (_s, d) => print(`log  ${JSON.stringify(d)}`),
    });
  }
  if (!toys.length) toys.push(blankToy());

  function markDirty() {
    host.onChange?.(toys, aspect);
    dirty = true;
    status.textContent = S.unsaved;
    status.classList.add('unsaved');
  }

  function preview() {
    const t = toys[current];
    if (!t) return;
    renderLint();
    if (standalone) {
      standalone.show(t, aspect);
    } else if (player) {
      player.setCues([t]);
      player.seek(Math.max(0, t.start - 0.75));
      player.play();
    }
    print(`--- ${S.previewing}: ${t.label || S.untitled}`);
  }

  function renderLint() {
    const t = toys[current];
    const issues = lintToy(t?.html ?? '', { mode: cfg.mode, autoHeight: aspect === 'auto' });
    lintList.replaceChildren(
      ...(issues.length
        ? issues.map((i) => el('li', { class: i.level, text: i.message }))
        : [el('li.ok', { text: '✓ ' + S.noproblems })]),
    );
  }

  // ---------- toy tabs (video mode)
  function renderTabs() {
    if (!isVideo) return;
    const sorted = toys.map((t, i) => ({ t, i })).sort((a, b) => a.t.start - b.t.start);
    tabs.replaceChildren(
      ...sorted.map(({ t, i }) =>
        el(
          'button',
          {
            type: 'button',
            role: 'tab',
            class: 'btn ' + (i === current ? 'btn-primary' : 'btn-outline-secondary'),
            'aria-selected': String(i === current),
            onclick: () => select(i),
          },
          el('span.t', { text: fmt(t.start) }),
          t.label || S.untitled,
        ),
      ),
      el('button.btn.btn-outline-primary', {
        type: 'button',
        text: '+ ' + S.addtoy,
        onclick: () => {
          toys.push(blankToy());
          markDirty();
          select(toys.length - 1);
        },
      }),
    );
  }

  function select(i: number) {
    current = i;
    renderTabs();
    renderFields();
    preview();
  }

  // ---------- fields for the current toy
  function renderFields() {
    const t = toys[current];
    const input = (key: string, label: string, type: string, value: any, onchange: (v: string, e: HTMLInputElement) => void, extra: Record<string, any> = {}) => {
      const id = `mod-toybox-f-${key}`;
      const inp = el<'input'>('input.form-control', { id, type, value: String(value), ...extra });
      inp.oninput = () => {
        onchange(inp.value, inp);
        markDirty();
      };
      return el('div.mod-toybox-field', {}, el('label', { for: id, text: label }), inp);
    };
    const check = (key: string, label: string, value: boolean, onchange: (v: boolean) => void) => {
      const id = `mod-toybox-c-${key}`;
      const inp = el<'input'>('input.form-check-input', { id, type: 'checkbox', checked: value });
      inp.onchange = () => {
        onchange(inp.checked);
        markDirty();
      };
      return el('div.form-check', {}, inp, el('label.form-check-label', { for: id, text: label }));
    };

    const html = el<'textarea'>('textarea.form-control.mod-toybox-code', {
      id: 'mod-toybox-html',
      spellcheck: 'false',
      wrap: 'off',
      rows: 18,
      readonly: locked,
    });
    html.value = t.html ?? '';
    let lintTimer = 0;
    html.oninput = () => {
      t.html = html.value;
      markDirty();
      clearTimeout(lintTimer);
      lintTimer = window.setTimeout(renderLint, 400);
    };
    html.onkeydown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        html.setRangeText('  ', html.selectionStart, html.selectionEnd, 'end');
      }
    };

    const paramsErr = el<'div'>('div.invalid-feedback.d-block');
    const params = el<'textarea'>('textarea.form-control.mod-toybox-code', { id: 'mod-toybox-params', spellcheck: 'false', rows: 5 });
    params.value = JSON.stringify(t.params ?? {}, null, 2);
    params.oninput = () => {
      markDirty();
      try {
        t.params = JSON.parse(params.value || '{}');
        paramsErr.textContent = '';
        params.classList.remove('is-invalid');
      } catch (e) {
        paramsErr.textContent = `${S.badjson}: ${(e as Error).message}`;
        params.classList.add('is-invalid');
      }
    };

    const examples = el<'select'>('select.custom-select.form-select', { 'aria-label': S.startfrom });
    examples.append(el('option', { value: '', text: S.startfrom + '…' }));
    for (const ex of EXAMPLES) {
      if (!(locked && ex.file === 'starter')) examples.append(el('option', { value: ex.file, text: ex.name }));
    }
    examples.onchange = async () => {
      const ex = EXAMPLES.find((e) => e.file === examples.value);
      if (!ex) return;
      if (t.html?.trim() && t.html !== STARTER && !window.confirm(S.replacecode)) {
        examples.value = '';
        return;
      }
      t.html = ex.file === 'starter' ? STARTER : await (await fetch(cfg.pluginUrl + ex.file)).text();
      t.params = { ...ex.params };
      if (isVideo) {
        t.rect = { ...ex.rect };
        t.pause = ex.pause;
        t.resumeOnComplete = ex.pause;
      }
      if (!t.label || t.label.startsWith(S.toy)) t.label = ex.name;
      markDirty();
      renderTabs();
      renderFields();
      preview();
    };

    // Earlier versions of this toy's code (saved toys only).
    let historySel: HTMLSelectElement | null = null;
    if (host.history && host.loadVersion && /^\d+$/.test(t.id)) {
      const sel = (historySel = el<'select'>('select.custom-select.form-select', { 'aria-label': S.history }));
      sel.append(el('option', { value: '', text: S.history + '…' }));
      if (!historyCache.has(t.id)) historyCache.set(t.id, host.history(t.id).catch(() => []));
      historyCache.get(t.id)!.then((versions) => {
        if (!versions.length) sel.append(el('option', { value: '', disabled: true, text: S.historyempty }));
        for (const v of versions) {
          sel.append(el('option', { value: String(v.id), text: `${v.timestr}${v.who ? ' · ' + v.who : ''} · ${v.hash}` }));
        }
      });
      sel.onchange = async () => {
        const vid = Number(sel.value);
        if (!vid) return;
        if (!window.confirm(S.restoreversionconfirm)) {
          sel.value = '';
          return;
        }
        try {
          t.html = await host.loadVersion!(t.id, vid);
          markDirty();
          renderFields();
          preview();
        } catch (e) {
          host.error(e);
        }
      };
    }

    const aiBtn = el<'button'>('button.btn.btn-outline-primary', { type: 'button', text: '✨ ' + S.copyaiprompt, title: S.copyaiprompt_help });
    aiBtn.onclick = async () => {
      try {
        const guide = await (await fetch(cfg.guideUrl)).text();
        const fresh = !t.html?.trim() || t.html.trim() === STARTER.trim();
        const prompt = buildAiPrompt(guide, {
          mode: cfg.mode,
          aspect,
          rect: t.rect,
          start: t.start,
          end: t.end,
          pause: t.pause,
          params: fresh ? undefined : t.params,
          existingHtml: fresh ? undefined : t.html,
          issues: fresh ? undefined : lintToy(t.html ?? '', { mode: cfg.mode, autoHeight: aspect === 'auto' }),
        }, theme);
        await navigator.clipboard.writeText(prompt);
        host.notify(S.promptcopied, 'success');
      } catch (e) {
        host.alert(S.copyaiprompt, S.promptfailed);
      }
    };

    const rows: (Node | null)[] = [
      el(
        'div.mod-toybox-row',
        {},
        input('label', S.toylabel, 'text', t.label ?? '', (v) => {
          t.label = v;
          renderTabs();
        }, { maxlength: 255 }),
      ),
    ];

    if (isVideo) {
      const startHere = el<'button'>('button.btn.btn-sm.btn-outline-secondary', {
        type: 'button',
        text: '⏱ ' + S.starthere,
        title: S.starthere_help,
        onclick: () => {
          const now = Math.round((player?.video.currentTime ?? 0) * 10) / 10;
          const len = Math.max(0.5, t.end - t.start);
          t.start = now;
          t.end = Math.round((now + len) * 10) / 10;
          markDirty();
          renderTabs();
          renderFields();
        },
      });
      rows.push(
        el(
          'div.mod-toybox-row.mod-toybox-grid',
          {},
          input('start', S.start, 'number', t.start, (v) => {
            t.start = Number(v);
            renderTabs();
          }, { step: '0.1', min: '0' }),
          input('end', S.end, 'number', t.end, (v) => (t.end = Number(v)), { step: '0.1', min: '0' }),
          el('div.mod-toybox-field.align-self-end', {}, startHere),
        ),
        el(
          'div.mod-toybox-row.mod-toybox-grid4',
          {},
          input('x', S.posx, 'number', t.rect.x, (v) => (t.rect.x = Number(v)), { min: '0', max: '100' }),
          input('y', S.posy, 'number', t.rect.y, (v) => (t.rect.y = Number(v)), { min: '0', max: '100' }),
          input('w', S.width, 'number', t.rect.w, (v) => (t.rect.w = Number(v)), { min: '5', max: '100' }),
          input('h', S.height, 'number', t.rect.h, (v) => (t.rect.h = Number(v)), { min: '5', max: '100' }),
        ),
        el(
          'div.mod-toybox-row.mod-toybox-checks',
          {},
          check('pause', S.pausevideo, !!t.pause, (v) => (t.pause = v)),
          check('resume', S.resumeoncomplete, !!t.resumeOnComplete, (v) => (t.resumeOnComplete = v)),
          check('required', S.requiredtoy, !!t.required, (v) => {
            t.required = v;
            renderTabs();
          }),
        ),
      );
    } else {
      const shape = el<'select'>('select.custom-select.form-select', { id: 'mod-toybox-aspect' });
      for (const [v, label] of [
        ['16:9', S.aspect169],
        ['4:3', S.aspect43],
        ['1:1', S.aspect11],
        ['3:4', S.aspect34],
        ['auto', S.aspectauto],
      ])
        shape.append(el('option', { value: v, text: label, selected: v === aspect }));
      shape.onchange = () => {
        aspect = shape.value as Aspect;
        markDirty();
        preview();
      };
      rows.push(
        el(
          'div.mod-toybox-row.mod-toybox-grid',
          {},
          el('div.mod-toybox-field', {}, el('label', { for: 'mod-toybox-aspect', text: S.shape }), shape),
          el('div.mod-toybox-field.align-self-end', {}, check('required', S.requiredtoy, !!t.required, (v) => (t.required = v))),
        ),
      );
    }

    rows.push(
      el(
        'div.mod-toybox-row.mod-toybox-ai',
        {},
        ...(locked
          ? [el('div.alert.alert-info.small.w-100.mb-0', { text: S.codelocked })]
          : [el('strong', { text: S.makewithai }), aiBtn]),
        locked ? null : el('button.btn.btn-outline-secondary', {
          type: 'button',
          text: S.downloadguide,
          title: S.downloadguide_help,
          onclick: async () => {
            const guide = guideWithTheme(await (await fetch(cfg.guideUrl)).text(), theme);
            const a = el<'a'>('a', { href: URL.createObjectURL(new Blob([guide], { type: 'text/markdown' })), download: 'toybox-toy-guide.md' });
            document.body.append(a);
            a.click();
            setTimeout(() => a.remove(), 1000);
          },
        }),
        examples,
        historySel,
      ),
      el('div.mod-toybox-field', {}, el('label', { for: 'mod-toybox-html', text: S.toycode }), html),
      el('div.mod-toybox-field', {}, el('label', { for: 'mod-toybox-params', text: S.toyparams }), params, paramsErr),
      el(
        'div.mod-toybox-row',
        {},
        el('button.btn.btn-secondary', { type: 'button', text: '▶ ' + S.preview, onclick: preview }),
        isVideo
          ? el('button.btn.btn-outline-danger', {
              type: 'button',
              text: S.deletetoy,
              onclick: () => {
                if (!window.confirm(S.deletetoyconfirm)) return;
                toys.splice(current, 1);
                if (!toys.length) toys.push(blankToy());
                markDirty();
                select(Math.min(current, toys.length - 1));
              },
            })
          : null,
      ),
    );
    fields.replaceChildren(...rows.filter(Boolean) as Node[]);
  }

  // ---------- save
  saveBtn.onclick = () => {
    if (!host.save) return;
    const bad = toys.findIndex((t) => typeof t.params !== 'object');
    if (bad >= 0) return select(bad);
    saveBtn.disabled = true;
    host
      .save(toys, aspect)
      .then((saved) => {
        const keepIndex = current;
        toys = fromServer(saved);
        historyCache.clear();
        if (!toys.length) toys.push(blankToy());
        current = Math.min(keepIndex, toys.length - 1);
        dirty = false;
        status.textContent = S.allsaved;
        status.classList.remove('unsaved');
        renderTabs();
        renderFields();
        host.notify(S.saved, 'success');
      })
      .catch(host.error)
      .finally(() => (saveBtn.disabled = false));
  };

  window.addEventListener('beforeunload', (e) => {
    if (dirty && host.save) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      preview();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 's' && host.save) {
      e.preventDefault();
      saveBtn.click();
    }
  });

  select(0);
  // Let form-based hosts (WordPress) hold the toys from the start, including a new blank one.
  host.onChange?.(toys, aspect);
}
