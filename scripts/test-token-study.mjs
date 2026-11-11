import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as M from '../learning-machines/tokens/mechanics.mjs';
import * as R from '../learning-machines/tokens/render.mjs';
const base=new URL('../learning-machines/tokens/',import.meta.url),read=f=>readFileSync(new URL(f,base),'utf8');
const count=(text,part)=>text.split(part).length-1;

// Provenance: the vendored mechanics and fixture are exactly the pinned commit's bytes.
const pin=JSON.parse(read('mechanics-pin.json'));
assert.match(pin.commit,/^[a-f0-9]{40}$/);assert.equal(pin.repository,'https://github.com/rsteth/learning-machines');
for(const f of pin.files)assert.equal(createHash('sha256').update(read(f.file)).digest('hex'),f.sha256,f.file+' matches its pin');
assert.equal(createHash('sha256').update(read(pin.licenseFile)).digest('hex'),pin.licenseSha256);
const html=read('index.html'),page=read('page.mjs'),render=read('render.mjs'),css=read('notes.css');
assert.ok(!html.includes('PIN_COMMIT'));
assert.ok(html.includes('/tree/'+pin.commit+'/experiments/tokens'));assert.ok(html.includes('/commit/'+pin.commit));
for(const f of ['regenerate_fixture.py','fixture.mjs'])assert.ok(html.includes('/blob/'+pin.commit+'/experiments/tokens/'+f),'provenance link '+f);
assert.ok(html.includes('<strong>'+M.FIXTURE.package+' '+M.FIXTURE.version+'</strong>')&&html.includes('<strong>'+M.FIXTURE.encoding+'</strong>'),'provenance matches fixture metadata');
assert.ok(html.includes('Pinned to commit <code>'+pin.commit.slice(0,7)+'</code>'));

// Real token IDs only: every model piece is in the fixture and nothing is marked pending.
for(const piece of Object.keys(M.PIECES)){assert.notEqual(M.idFor(piece),null,piece);assert.equal(M.decode([M.idFor(piece)]),piece);}
assert.ok(!html.includes('ID pending'));
for(const text of ['cl100k_base','tiktoken 0.14.0','unhappiness','00 / tokens','ID 791','ID 8415','ID 7731','ID 389','ID 279'])assert.ok(html.includes(text),text);

// The static page is the pinned mechanics' default example, byte for byte.
execFileSync(process.execPath,[fileURLToPath(new URL('./render-token-study.mjs',import.meta.url)),'--check']);
const m=R.model();
assert.equal(m.top.piece,' mat');
for(const item of m.distribution)assert.ok(html.includes('<small>'+R.pct(item.probability)+'</small>'),'probability on the strip comes from the mechanics');
for(const candidate of m.scores.candidates)assert.ok(html.includes('<b>'+candidate.score.toFixed(2)+'</b>'),'score for '+candidate.piece);
assert.ok(!/document\.|window\./.test(render),'render.mjs stays DOM-free so the static build and live page share it');

// Every leg can be reached from a word or chip, in every variant.
for(const subject of M.SUBJECTS)for(const verb of M.VERBS)for(const covered of [[],[1],[1,2]]){
 const model=R.model({subject,verb,covered}),chips=R.pathChipsHTML(model),svg=R.pathSVG(model);
 for(const leg of model.trace.legs){const key=R.legKey(leg);assert.ok(chips.includes('data-k="'+key+'"'),key+' has a chip');if(leg.kind!=='start')assert.ok(svg.includes('data-leg="'+key+'"'),key+' is drawn');}
 assert.ok(chips.includes('data-k="worked"')&&chips.includes('data-k="end"'));
 assert.match(svg,/role="img" aria-label="[^"]+"/);assert.ok(R.captionFor('end',model).length>10);
}

// Caveats appear once; controls start disabled; nothing autoplays.
for(const caveat of ['A hand-authored example, not a trained model','The eight notes and their labels are ours','stands in for the rest of a real vocabulary'])assert.equal(count(html,caveat),1,caveat);
for(const id of ['choose','next-cycle','reset','mode','seed','yaw'])assert.match(html,new RegExp('disabled id="'+id+'"'));
assert.equal(count(html,'<button '),count(html,' disabled>')+count(html,'<button disabled'),'every button starts disabled');
assert.match(html,/role="status" aria-live="polite"/);assert.ok(!html.includes('<canvas'));
assert.ok(!/setInterval|setTimeout|requestAnimationFrame/.test(page),'No autoplay: every step is reader-initiated');
assert.match(css,/@media\(max-width:540px\)/);
assert.match(readFileSync(new URL('../learning-machines/learning.css',import.meta.url),'utf8'),/prefers-reduced-motion:reduce/);

// The bounded walk still ends where the page says it does.
let state=M.createState();for(let i=0;i<20&&!state.stopped;i++)state=M.step(state);assert.equal(state.text,'The cat sat on the mat.');assert.equal(state.stopReason,'demo-limit');
state=M.createState({subject:'king'});for(let i=0;i<5;i++)state=M.step(state);assert.equal(state.text,'The king sat on the throne');

// Superseded modules are gone, and the two studies point at each other.
for(const f of ['flow.mjs','visuals.mjs','explanation.mjs','worked-output.svg'])assert.ok(!existsSync(new URL(f,base)),f+' was superseded');
const index=readFileSync(new URL('../learning-machines/index.html',import.meta.url),'utf8');assert.ok(index.indexOf('01 / tokens')<index.indexOf('02 / attention and memory'));
const next=readFileSync(new URL('../learning-machines/attention-and-memory/index.html',import.meta.url),'utf8');
assert.ok(next.includes('02 / attention and memory')&&next.includes('href="../tokens/"'));assert.ok(html.includes('href="../attention-and-memory/"')&&html.includes('Cards on the table: 5'));
const memory=await import('../learning-machines/attention-and-memory/mechanics.mjs');
assert.ok(next.includes('<p class="recall-question">'+memory.RECALL.question+'</p>'),'the recall question comes from the mechanics');
for(const event of memory.EVENTS)assert.notEqual(M.idFor(' '+event.value),null,event.value+' is a piece from study 01');
console.log('PASS: token provenance, real IDs, static page from pinned mechanics, linked legs, single caveats, disabled controls, bounded walk and series links');
