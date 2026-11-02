import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createState,step,chooseToken,distributionFor,FIXTURE} from '../learning-machines/tokens/mechanics.mjs';
import {describeFlow,STATUS,startPosition,forward,canForward,preview,drawMany,PLAYGROUND_DISTRIBUTION,WORDS,SAME_WORD} from '../learning-machines/tokens/flow.mjs';
// The followed piece survives a new cycle; generated pieces are marked.
let pos=startPosition();assert.equal(pos.phase,3);
const first=describeFlow(pos.cycle,3);assert.equal(first.pieces[3].label,'·on');assert.ok(first.pieces.every(p=>!p.generated));
// Scrubber: 03 → 04 chooses; 04 → 00 starts the next cycle; earlier stops never choose.
assert.equal(forward({...pos,phase:0}).phase,1);assert.equal(forward({...pos,phase:2}).result,null);
pos=forward(pos);assert.equal(pos.phase,4);assert.equal(pos.result.text,'The cat sat on the mat');assert.equal(describeFlow(pos.result,3).pieces.at(-1).generated,true);
pos=forward(pos);assert.deepEqual([pos.phase,pos.cycle.generated,pos.result],[0,1,null]);
assert.deepEqual(describeFlow(pos.cycle).distribution.map(p=>[p.id,p.probability]),[[13,1]]);
for(let i=0;i<4;i++)pos=forward(pos);assert.equal(pos.result.text,'The cat sat on the mat.');
pos=forward(pos);assert.equal(pos.result.stopReason,'demo-limit');assert.equal(canForward(pos),false);assert.equal(forward(pos),pos);assert.ok(STATUS[pos.result.stopReason]);
// Playground: the needle is the pinned sampler's own draw; chained draws follow the seeds it returns.
assert.deepEqual(PLAYGROUND_DISTRIBUTION,distributionFor(createState()));
for(const seed of [0,1,600,4294967295]){const {pick,draw}=preview(seed),real=chooseToken(PLAYGROUND_DISTRIBUTION,{mode:'sample',seed});assert.deepEqual(pick,real);assert.equal(draw,real.seed/4294967296);}
const many=drawMany(1,100);assert.equal(many.counts.reduce((a,b)=>a+b,0),100);
let s=1;for(let i=0;i<100;i++)s=chooseToken(PLAYGROUND_DISTRIBUTION,{mode:'sample',seed:s}).seed;assert.equal(many.seed,s);
// Word picker: real fixture splits only.
for(const w of WORDS){const e=FIXTURE.examples.find(x=>x.text===w.text);assert.deepEqual(w.pieces.map(p=>p.id),e.ids);}
assert.deepEqual(WORDS.map(w=>w.text),FIXTURE.examples.filter(e=>e.ids.length>1).map(e=>e.text));
assert.ok(SAME_WORD.some(g=>g.map(p=>p.id).sort().join()==='279,791'),'The (791) vs ·the (279) is found in the fixture');
// Without JavaScript every new control is disabled or hidden.
const html=readFileSync(new URL('../learning-machines/tokens/index.html',import.meta.url),'utf8');
for(const id of ['phase-back','phase-next','pg-seed','pg-draw','pg-clear','pg-use'])assert.match(html,new RegExp('disabled id="'+id+'"'));
assert.ok(html.includes('id="pg-cmd"'),'playground shows the terminal command');
for(const id of ['playground','word-picker'])assert.match(html,new RegExp('id="'+id+'"[^>]*hidden'));
console.log('PASS: scrubber stops and cycles, followed piece, playground draws equal the pinned sampler, real fixture splits, inert without JS');
