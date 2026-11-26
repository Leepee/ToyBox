// WordPress Toy edit screen: the shared ToyBox editor, saved by WordPress's own Update button.
import { mountEditor, type EditorConfig } from '../../core/src/editor';
import { readConfig } from '../../core/src/hostKit';

declare const wp: any;

function notice(message: string, type = 'info') {
  const n = document.createElement('div');
  n.className = `notice notice-${type === 'danger' ? 'error' : type} is-dismissible`;
  n.innerHTML = '<p></p>';
  n.querySelector('p')!.textContent = message;
  (document.querySelector('.wrap h1, .wrap .wp-heading-inline')?.parentElement ?? document.body).prepend(n);
  setTimeout(() => n.remove(), 8000);
}

function start() {
  const root = document.getElementById('toybox-editor-root');
  if (!root) return;
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const toysField = $<HTMLInputElement>('toybox-toys');
  const aspectField = $<HTMLInputElement>('toybox-aspect');
  const mode = $<HTMLSelectElement>('toybox-mode');
  const video = $<HTMLInputElement>('toybox-video');
  const videoFields = $('toybox-video-fields');
  const base = readConfig<EditorConfig>(root, 'script.toybox-config');

  // (Re)build the editor from the current form values.
  const mount = () => {
    root.querySelectorAll(':scope > :not(script)').forEach((n) => n.remove());
    const isVideo = mode.value === 'video';
    let toys: any[] = [];
    try {
      toys = JSON.parse(toysField.value || '[]');
    } catch {
      /* keep empty */
    }
    const cfg: EditorConfig = {
      ...base,
      mode: isVideo ? 'video' : 'toy',
      aspect: (aspectField.value || base.aspect) as EditorConfig['aspect'],
      videoUrl: isVideo && video.value.trim() ? video.value.trim() : null,
      toys: isVideo ? toys : toys.slice(0, 1),
    };
    mountEditor(root, cfg, {
      onChange: (list, aspect) => {
        toysField.value = JSON.stringify(list);
        aspectField.value = aspect;
      },
      notify: (m, type) => notice(m, type === 'success' ? 'success' : type),
      alert: (_title, m) => window.alert(m),
      error: (e) => notice(String((e as Error)?.message ?? e), 'danger'),
    });
  };

  mode.addEventListener('change', () => {
    videoFields.hidden = mode.value !== 'video';
    mount();
  });
  video.addEventListener('change', mount);
  $('toybox-pick-video')?.addEventListener('click', () => {
    const frame = wp.media({ title: 'Choose a video', library: { type: 'video' }, multiple: false, button: { text: 'Use this video' } });
    frame.on('select', () => {
      video.value = frame.state().get('selection').first().toJSON().url;
      mount();
    });
    frame.open();
    frame.content.mode('browse'); // open on the Media Library, not "Upload files"
  });
  mount();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
