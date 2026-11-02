import {describeFlow,renderPieces,renderDistribution,renderAppend,STATUS} from './flow.mjs?v=20261102-story1';
import {createState,step,reset} from './mechanics.mjs?v=20261101-tokenmath4';
import {renderLookup,renderTrace} from './explanation.mjs?v=20261102-story1';
// One scroll story. `cycle` is the text being processed; `result` is that cycle after a token is chosen.
const $=id=>document.getElementById(id);
const reduced=window.matchMedia('(prefers-reduced-motion:reduce)');
let cycle=createState(),result=null,selected=1,configValid=true;
const toAppend=s=>{let t=s;while(t.phase!=='append'&&!t.stopped)t=step(t);return t;};
const fmt=v=>Number(v.toFixed(3)).toFixed(1).replace(/^-0\.0$/,'0.0');
function select(index){selected=index;render();document.querySelector('#token-list [data-piece-index="'+index+'"]')?.focus({preventScroll:true});}
function render(){
 const view=describeFlow(cycle,selected),piece=view.pieces[view.selectedIndex];selected=view.selectedIndex;
 for(const id of ['prompt','pipeline-text','prediction-context'])$(id).textContent=cycle.text;
 // 00 · pieces
 $('token-list').replaceChildren(...renderPieces(view,select));
 $('piece-hint').textContent='Following '+piece.label+' / ID '+piece.id+'. Pick another piece; every section follows it.';
 // 01 · lookup
 $('embedding-value').textContent=piece.label+' / '+piece.id+' → ['+piece.input.map(fmt).join(', ')+']';
 $('live-embedding').innerHTML=renderLookup(view,{selectedIndex:view.selectedIndex,interactive:true});
 for(const b of $('live-embedding').querySelectorAll('[data-piece-index]'))b.addEventListener('click',()=>select(Number(b.dataset.pieceIndex)));
 // 02 · context (full derivation, with arcs, for the followed piece)
 $('live-layers').innerHTML=renderTrace(view,{selectedIndex:view.selectedIndex,includeCaveats:false});
 for(const id of ['embedding','layers'])$('live-'+id+'-caption').textContent='Live · following '+piece.label+' / ID '+piece.id+' in “'+cycle.text+'”.';
 // 03 · scores and choice
 const note=view.distribution.length?renderDistribution(view,result):'';
 $('distribution-note').textContent=note;
 // 04 · append
 if(result){$('live-output').replaceChildren(renderAppend(describeFlow(result,selected)));$('live-output').hidden=false;$('static-output').hidden=true;}
 else{$('live-output').hidden=true;$('static-output').hidden=false;}
 for(const id of ['chosen','output'])$(id).hidden=!!result;
 const stopped=result?.stopped||cycle.stopped;
 $('choose').disabled=!!result||cycle.stopped||!configValid;
 $('next-cycle').disabled=!result||stopped;
 $('next-cycle').textContent=result&&result.generated>=2?'Finish':'Run the next cycle ↺';
 $('status').textContent=!configValid?'Enter a valid whole-number seed, or Reset, to continue.':stopped?STATUS[(result??cycle).stopReason]:result?'Appended “'+describeFlow(result).pieces.at(-1).label+'” — see 04, then run the next cycle.':(cycle.generated?'Cycle '+(cycle.generated+1)+' · the text now ends in '+view.pieces.at(-1).label+'.':'Cycle 1 · choose the next piece.');
}
$('choose').addEventListener('click',()=>{if(result||!configValid)return;result=toAppend(cycle);render();});
$('next-cycle').addEventListener('click',()=>{if(!result||result.stopped)return;const next=step(result);if(next.stopped){result=next;render();return;}cycle=next;result=null;render();$('stage-tokens').scrollIntoView({behavior:reduced.matches?'auto':'smooth'});});
$('reset').addEventListener('click',()=>{cycle=reset(cycle);result=null;selected=1;configValid=true;$('seed').value=cycle.initialSeed;$('mode').value=cycle.mode;$('seed').setCustomValidity('');render();});
function configure(){const seed=Number($('seed').value);if($('seed').value===''||!Number.isInteger(seed)||seed<0||seed>0xffffffff){$('seed').setCustomValidity('Enter a whole number from 0 to 4294967295.');$('seed').reportValidity();configValid=false;render();return;}configValid=true;$('seed').setCustomValidity('');cycle=createState({mode:$('mode').value,seed});result=null;render();}
$('mode').addEventListener('change',configure);$('seed').addEventListener('change',configure);
// Pipeline: the stop for the section in view is marked current.
const links=[...document.querySelectorAll('.pipeline a')];
if('IntersectionObserver' in window){const io=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)links.forEach(a=>a.toggleAttribute('aria-current',a.hash==='#'+e.target.id));},{rootMargin:'-40% 0px -55% 0px'});for(const a of links)io.observe($(a.hash.slice(1)));}
for(const id of ['choose','reset','mode','seed'])$(id).disabled=false;
document.body.classList.add('flow-ready');render();
