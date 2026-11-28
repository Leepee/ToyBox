// Small in-page messages and questions: Office add-ins can't use alert() or confirm().
import { el } from '../../core/src/hostKit';

/** A message that fades after a few seconds. */
export function toast(message: string, type = 'info') {
  const t = el<'div'>(`div.tb-office-toast.${type}`, { role: 'status', text: message });
  document.body.append(t);
  setTimeout(() => t.remove(), 5000);
}

/** A yes/no question; resolves true for the first button. */
export function ask(message: string, yes = 'OK', no = 'Cancel', title = ''): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (v: boolean) => {
      wrap.remove();
      resolve(v);
    };
    const ok = el<'button'>('button.btn.btn-primary', { type: 'button', text: yes, onclick: () => done(true) });
    const wrap = el<'div'>(
      'div.tb-office-modal',
      { role: 'dialog', 'aria-modal': 'true', 'aria-label': title || message },
      el(
        'div.tb-office-modal-box',
        {},
        title ? el('h2', { text: title }) : null,
        el('p', { text: message }),
        el('div.tb-office-modal-buttons', {}, no ? el('button.btn.btn-outline-secondary', { type: 'button', text: no, onclick: () => done(false) }) : null, ok),
      ),
    );
    wrap.addEventListener('keydown', (e) => e.key === 'Escape' && done(false));
    document.body.append(wrap);
    ok.focus();
  });
}

/** A message with just an OK button. */
export const tell = (title: string, message: string) => ask(message, 'OK', '', title).then(() => undefined);
