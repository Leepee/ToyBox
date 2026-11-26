// Copies the shared runtime files (SDK, example toys, toy guide) from core/
// into the demo site and the Moodle plugin, so there's one source of truth.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const r = (p) => resolve(root, p);
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['demo', 'moodle', 'wordpress'];

function copy(from, to) {
  rmSync(r(to), { recursive: true, force: true });
  mkdirSync(dirname(r(to)), { recursive: true });
  cpSync(r(from), r(to), { recursive: true });
}

if (targets.includes('demo')) {
  copy('core/public/toybox-sdk.js', 'demo/public/toybox-sdk.js');
  copy('core/public/toys', 'demo/public/toys');
  copy('core/public/fonts', 'demo/public/fonts');
  copy('core/guide/toybox-toy-guide.md', 'demo/public/toybox-toy-guide.md');
}
if (targets.includes('moodle')) {
  copy('core/public/toybox-sdk.js', 'moodle/toybox/sdk/toybox-sdk.js');
  copy('core/public/toys', 'moodle/toybox/toys');
  copy('core/public/fonts', 'moodle/toybox/sdk/fonts');
  copy('core/guide/toybox-toy-guide.md', 'moodle/toybox/guide/toybox-toy-guide.md');
}
if (targets.includes('wordpress')) {
  copy('core/public/toybox-sdk.js', 'wordpress/toybox/assets/sdk/toybox-sdk.js');
  copy('core/public/fonts', 'wordpress/toybox/assets/sdk/fonts');
  copy('core/public/toys', 'wordpress/toybox/assets/toys');
  copy('core/guide/toybox-toy-guide.md', 'wordpress/toybox/assets/guide/toybox-toy-guide.md');
}
console.log('synced core →', targets.join(', '));
