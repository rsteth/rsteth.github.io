// Keeps the token study readable without JavaScript: renders the default worked example from the
// pinned mechanics into index.html. `--check` fails if the committed page is stale.
import { readFileSync, writeFileSync } from 'node:fs';
import * as R from '../learning-machines/tokens/render.mjs';

const url = new URL('../learning-machines/tokens/index.html', import.meta.url);
const m = R.model(), live = false, { state } = m;
const parts = {
  pieces: `<p class="panel-label">TEXT SO FAR</p><p class="text-box">${R.esc(state.text)}</p>`
    + R.piecesHTML(state.pieces, state.ids, { selected: 1, act: 'piece', live }) + R.switcherHTML(m, { live }) + R.pendingNote(state.pieces, state.ids),
  split: R.splitHTML(0, { live }),
  card: R.cardHTML(m, 1),
  listen: R.listenHTML(m, { live }),
  pathchips: R.pathChipsHTML(m, { live }),
  pathsvg: R.pathSVG(m),
  caption: R.captionFor('end', m),
  pathswitch: R.switcherHTML(m, { live }),
  scores: R.scoresHTML(m),
  ribbon: R.ribbonHTML(m),
  status: R.statusText(m, []),
  append: R.appendHTML(m, [])
};
const html = readFileSync(url, 'utf8');
let result = html;
for (const [name, content] of Object.entries(parts)) {
  const pattern = new RegExp(`<!--R:${name}-->[\\s\\S]*?<!--/R:${name}-->`);
  if (!pattern.test(result)) throw new Error(`Missing marker ${name}`);
  result = result.replace(pattern, () => `<!--R:${name}-->${content}<!--/R:${name}-->`);
}
if (process.argv.includes('--check')) { if (result !== html) throw new Error('Stale token study: run node scripts/render-token-study.mjs'); }
else writeFileSync(url, result);
console.log(`PASS: ${Object.keys(parts).length} static blocks match the pinned mechanics`);
