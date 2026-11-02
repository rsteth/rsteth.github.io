// Keep complete no-JavaScript worked examples synchronized with the pinned teaching math.
import {readFileSync,writeFileSync} from 'node:fs';
import {createState,traceFor} from '../learning-machines/tokens/mechanics.mjs';
import {describeFlow} from '../learning-machines/tokens/flow.mjs';
import {renderLookup,renderTrace} from '../learning-machines/tokens/explanation.mjs';
const url=new URL('../learning-machines/tokens/index.html',import.meta.url),html=readFileSync(url,'utf8'),state=createState();
const lookup=describeFlow(state,1),trace=describeFlow(state,4);
const replacements={LOOKUP:`<figure class="worked-example" id="worked-embedding">${renderLookup(lookup,{selectedIndex:1})}<figcaption>Fixed worked example · five input pieces, six illustrative numbers per row. A row is a vector, not a layer.</figcaption></figure>`,TRACE:`<figure class="worked-example" id="worked-layers">${renderTrace(trace,{selectedIndex:4})}<figcaption>Fixed worked example · follow the last input piece, ·the / ID 279.</figcaption></figure>`};
let result=html;for(const [name,body]of Object.entries(replacements))result=result.replace(new RegExp(`<!-- ${name} START -->[\\s\\S]*?<!-- ${name} END -->`),`<!-- ${name} START -->${body}<!-- ${name} END -->`);
if(process.argv.includes('--check')){if(result!==html)throw Error('Stale token teaching examples');}else writeFileSync(url,result);
console.log('PASS: fixed lookup and causal trace match pinned teaching math');
