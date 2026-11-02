import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createState,step} from '../learning-machines/tokens/mechanics.mjs';
import {describeFlow} from '../learning-machines/tokens/flow.mjs';
import {renderTrace} from '../learning-machines/tokens/explanation.mjs';
const root=new URL('../learning-machines/tokens/',import.meta.url),read=f=>readFileSync(new URL(f,root),'utf8');
const counts=t=>[/\btoy\b/gi,/hand-authored/gi,/not trained attention or a model prediction/g,/not a model prediction/g].map(re=>(t.match(re)||[]).length);
const plain=s=>s.replace(/<[^>]*>/g,'');
assert.deepEqual(counts(plain(read('index.html'))),[1,1,1,1]);
assert.deepEqual(counts(read('flow.mjs')),[0,0,0,0]);
assert.match(read('flow.mjs'),/compact:true,includeCaveats:false/);
let state=createState();for(let i=0;i<11;i++){
 const view=describeFlow(state),full=renderTrace(view),active=renderTrace(view,{compact:true,includeCaveats:false});
 assert.deepEqual(counts(plain(active)),[0,0,0,0]);
 for(const re of [/<table>[\s\S]*?<\/table>/g,/<p class="ex-exact">[\s\S]*?<\/p>/g])assert.deepEqual(active.match(re),full.match(re));
 assert.equal((active.match(/Check component /g)||[]).length,6);
 assert.match(active,/Next-token probabilities are supplied separately/);assert.match(active,/fixed recipe/);
 state=step(state);
}
assert.equal(state.text,'The cat sat on the mat.');assert.equal(state.stopReason,'demo-limit');
console.log('PASS: single caveats across both cycles; expanded active derivation retains all six tables/equations and functional recipe/probability notes');
