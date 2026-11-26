import Ajax from 'core/ajax';
import Notification from 'core/notification';
import { add as addToast } from 'core/toast';
import { mountEditor, type EditorConfig } from '../../core/src/editor';
import { readConfig } from '../../core/src/hostKit';

/**
 * Moodle's "Edit toys" page: the shared editor, saving through the
 * mod_toybox_save_toys web service.
 */
export const init = async (selector: string) => {
  const root = document.querySelector(selector);
  if (!root) return;
  const cfg = readConfig<EditorConfig & { cmid: number }>(root);
  await mountEditor(root, cfg, {
    save: (toys, aspect) => {
      // Moodle ids are numbers; anything else is a new toy.
      const payload = toys.map((t) => ({ ...t, id: /^\d+$/.test(t.id) ? Number(t.id) : 0 }));
      // Moodle's Ajax returns jQuery promises; wrap to get a native Promise.
      return Promise.resolve(
        Ajax.call([{ methodname: 'mod_toybox_save_toys', args: { cmid: cfg.cmid, aspect, toys: JSON.stringify(payload) } }])[0],
      ).then((r: { toys: string }) => JSON.parse(r.toys));
    },
    notify: (message, type = 'info') => addToast(message, { type }),
    alert: (title, message) => Notification.alert(title, message),
    error: (e) => Notification.exception(e),
  });
};
