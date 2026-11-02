import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createState,traceFor,matricesFor,EMBEDDINGS,distributionFor} from '../learning-machines/tokens/mechanics.mjs';
import {describeFlow} from '../learning-machines/tokens/flow.mjs';
import {renderLookup,renderTrace,renderVector} from '../learning-machines/tokens/explanation.mjs';
const state=createState(),equal=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(let selected=0;selected<state.ids.length;selected++){
 const trace=traceFor(state,selected),view=describeFlow(state,selected),html=renderTrace(view,{selectedIndex:selected});
 assert.deepEqual(view.trace,trace);assert.deepEqual(trace.before,EMBEDDINGS[state.ids[selected]]);
 equal(trace.weights.reduce((a,b)=>a+b,0),1);
 trace.weights.forEach((w,i)=>{if(i>selected)assert.equal(w,0);assert.ok(html.includes(`data-source-index="${i}"`));assert.ok(html.includes(`data-weight="${w}"`));});
 for(let c=0;c<6;c++){
  equal(trace.contextMix[c],trace.contributions.reduce((a,row)=>a+row[c],0));
  equal(trace.before[c]+trace.attentionDelta[c],trace.afterAttention[c]);
  equal(trace.afterAttention[c]+trace.mlpDelta[c],trace.output[c]);
  assert.ok(html.includes(`data-value="${trace.output[c]}"`));
  assert.ok(html.includes(`Check component ${c+1}`));
 }
 assert.match(html,/not learned attention scores/);assert.match(html,/supplied separately/);assert.match(html,/rounded to three decimals/);
 const lookup=renderLookup(view,{selectedIndex:selected,interactive:true});assert.match(lookup,/one token’s vector, not six layers/);assert.match(lookup,/Component numbers are positions/);assert.match(lookup,/data-piece-index/);
}
const vector=renderVector([-1,0,1,.25,-.25,.5]);assert.equal((vector.match(/class="ex-component"/g)||[]).length,6);assert.match(vector,/negative/);assert.match(vector,/positive/);assert.match(vector,/zero/);
const compact=renderTrace(describeFlow(state,4),{selectedIndex:4,compact:true});assert.match(compact,/ex-compact/);assert.match(compact,/Show updates and calculations/);assert.match(compact,/data-weight="0.5"/);
const last=traceFor(state,4);assert.deepEqual(last.weights,[.0625,.0625,.125,.25,.5]);
assert.deepEqual(matricesFor(state).contextual[4],last.output);
assert.deepEqual(distributionFor(state).map(x=>x.probability),[.45,.25,.15,.15]);
const base=new URL('../learning-machines/tokens/',import.meta.url),html=readFileSync(new URL('index.html',base),'utf8');
assert.ok(html.includes(renderLookup(describeFlow(state,1),{selectedIndex:1})));
assert.ok(html.includes(renderTrace(describeFlow(state,4),{selectedIndex:4})));
for(const text of ['Starting representations → contextual processing → updated representations'])assert.ok(html.includes(text));
console.log('PASS: shared static/active math, explicit ID lookup, scalar/vector labels, six stable components, causal weights and exact contributions, residual sums, sign/focus separation and independent probabilities');
