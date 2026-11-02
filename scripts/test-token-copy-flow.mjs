import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createState,step} from '../learning-machines/tokens/mechanics.mjs';
import {describeFlow} from '../learning-machines/tokens/flow.mjs';
import {renderTrace} from '../learning-machines/tokens/explanation.mjs';
const root=new URL('../learning-machines/tokens/',import.meta.url),read=f=>readFileSync(new URL(f,root),'utf8');
const counts=t=>[/\btoy\b/gi,/hand-authored/gi,/not trained attention or a model prediction/g,/not a model prediction/g].map(re=>(t.match(re)||[]).length);
const plain=s=>s.replace(/<[^>]*>/g,'');
// Caveats appear once on the page; live re-renders never repeat them.
assert.deepEqual(counts(plain(read('index.html'))),[1,1,1,1]);
assert.deepEqual(counts(read('flow.mjs')),[0,0,0,0]);assert.deepEqual(counts(read('page.mjs')),[0,0,0,0]);
assert.match(read('page.mjs'),/renderTrace\(view,\{selectedIndex:view\.selectedIndex,includeCaveats:false\}\)/);
let state=createState();for(let i=0;i<11;i++){
 for(let selected=0;selected<state.ids.length;selected++){
  const view=describeFlow(state,selected),full=renderTrace(view,{selectedIndex:selected}),live=renderTrace(view,{selectedIndex:selected,includeCaveats:false});
  assert.deepEqual(counts(plain(live)),[0,0,0,0]);
  for(const re of [/<table>[\s\S]*?<\/table>/g,/<p class="ex-exact">[\s\S]*?<\/p>/g,/<figure class="ex-arcs">[\s\S]*?<\/figure>/g])assert.deepEqual(live.match(re),full.match(re));
  assert.equal((live.match(/Check component /g)||[]).length,6);assert.equal((live.match(/class="ex-arc[ "]/g)||[]).length,selected+1);
 }
 state=step(state);
}
assert.equal(state.text,'The cat sat on the mat.');assert.equal(state.stopReason,'demo-limit');
console.log('PASS: single caveats on the page; live derivations for every piece and cycle keep all tables, equations and arcs without repeating caveats');
