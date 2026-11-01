import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const base=resolve(root,'learning-machines/attention-and-memory');
const pin=JSON.parse(readFileSync(resolve(base,'mechanics-pin.json')));
assert.match(pin.commit,/^[a-f0-9]{40}$/);
assert.equal(createHash('sha256').update(readFileSync(resolve(base,'mechanics.mjs'))).digest('hex'),pin.sha256);
for(const file of ['learning-machines/index.html','learning-machines/attention-and-memory/index.html']) {
 const path=resolve(root,file), html=readFileSync(path,'utf8');
 for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const url=match[1]; if(/^(?:https?:|#|mailto:)/.test(url)) continue;
  const target=resolve(dirname(path),url.split('?')[0]);assert.ok(existsSync(target),'Missing link '+file+' → '+url);
 }
}
const {growth,illustrate,architecture}=await import('../learning-machines/attention-and-memory/mechanics.mjs');
assert.equal(growth(262144).recurrent,64);assert.equal(illustrate(6).state.door,'yellow');assert.equal(architecture(true).length,64);
const home=readFileSync(resolve(root,'index.html'),'utf8');
const cards=[...home.matchAll(/<h2><a class="project-card__link"[^>]*>([^<]+)<\/a><\/h2>/g)].map(match=>match[1]);
assert.deepEqual(cards,['Museum of Other Realities','Mysterious Modular Device','Learning Machines','Fischer Price Revolutionary Device','Market River','Great Circle','Verbosele','Focus Speed Reader','The Spoon App']);
const page=readFileSync(resolve(base,'index.html'),'utf8');
assert.ok(page.includes(pin.repository+'/tree/'+pin.commit+'/experiments/attention-memory'),'Experiment link must match mechanics pin');
assert.ok(page.includes(pin.repository+'/commit/'+pin.commit),'Commit link must match mechanics pin');
console.log('PASS: pin integrity, companion links/assets, module import, home entry, pinned source links');
