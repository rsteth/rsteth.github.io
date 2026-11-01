import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createState,step} from '../learning-machines/tokens/mechanics.mjs';
import {describeFlow} from '../learning-machines/tokens/flow.mjs';
let state=createState(),previous=null;const views=[];
for(let i=0;i<5;i++){views.push(describeFlow(state,3,previous));previous=state;state=step(state);}
assert.equal(new Set(views.map(v=>v.title)).size,5);
for(const v of views){assert.equal(v.pieces[v.selectedIndex].id,389);assert.equal(v.pieces[v.selectedIndex].label,'·on');}
assert.equal(views[3].pieces[views[3].lastIndex].id,279);
assert.notDeepEqual(views[2].pieces[3].input,views[2].pieces[3].contextual);
assert.equal(views[4].context,'The cat sat on the mat');assert.equal(views[4].selection.id,5634);
assert.deepEqual(views[3].distribution.map(p=>p.probability),[.45,.25,.15,.15]);
const root=new URL('../learning-machines/tokens/',import.meta.url),read=f=>readFileSync(new URL(f,root),'utf8');
assert.match(read('index.html'),/id="flow-controls"/);assert.match(read('page.mjs'),/\$\('flow-controls'\)\.append\(\$\('experiment-controls'\)\)/);
assert.match(read('flow.mjs'),/LAST POSITION/);assert.match(read('flow.mjs'),/scripts a period at 100%/);assert.match(read('flow.mjs'),/two-token demo limit/);assert.match(read('flow.mjs'),/Earlier pieces provide context/);
assert.match(read('flow.mjs'),/aria-pressed/);assert.match(read('page.mjs'),/preventScroll:true/);assert.match(read('tokens.css'),/@media\(max-width:540px\)/);
console.log('PASS: distinct active scenes, selected-token continuity, last-position prediction, supplied probabilities, bounded stop, attached controls and focus retention');
