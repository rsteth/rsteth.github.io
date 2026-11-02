import {describeFlow,renderFlow} from './flow.mjs?v=20261102-tokencopy6';
import {createState,step,reset,PHASES} from './mechanics.mjs?v=20261101-tokenmath4';
const $=id=>document.getElementById(id);
const narrow=window.matchMedia('(max-width:540px)'),reduced=window.matchMedia('(prefers-reduced-motion:reduce)');
const names={tokens:'Tokenize the text',embedding:'Look up representations',layers:'Use the earlier context',distribution:'Score the next token',append:'Append and decode'};
let state=createState(),history=[],selected=1,timer=null,configValid=true;
function pause(){if(timer!==null){clearInterval(timer);timer=null;}$('play').textContent='Play';$('play').setAttribute('aria-pressed','false');}
function render(){
 const stage=PHASES.indexOf(state.phase);
 $('status').textContent=state.stopped?(state.stopReason==='outside-fixture'?'Stopped: choice outside this fixture. No token was invented.':'Stopped: two-token demo limit reached.'):`${stage+1} / 5 · ${names[state.phase]} · ${state.generated} ${state.generated===1?'token':'tokens'} generated`;
 $('back').disabled=history.length===0;$('next').disabled=state.stopped||!configValid;$('play').disabled=state.stopped||reduced.matches||!configValid;
 $('motion-note').hidden=!reduced.matches;
 selected=Math.min(selected,state.ids.length-1);
 const prediction=state.phase==='append'&&history.length?(history.findLast(item=>item.phase==='distribution')??state):state;
 renderFlow(describeFlow(state,selected,prediction),index=>{selected=index;render();$('flow-scene').querySelector('[data-piece-index="'+index+'"]')?.focus({preventScroll:true});});
 $('next').textContent=state.phase==='append'&&!state.stopped?(state.generated<2?'Next cycle':'Finish'):'Next step';
 if(state.stopped)pause();
}
function advance(){if(state.stopped||!configValid)return;history.push(state);state=step(state);render();}
$('next').addEventListener('click',()=>{pause();advance();});
$('back').addEventListener('click',()=>{pause();if(history.length)state=history.pop();render();});
$('reset').addEventListener('click',()=>{pause();state=reset(state);history=[];selected=1;configValid=true;$('seed').value=state.initialSeed;$('mode').value=state.mode;$('seed').setCustomValidity('');render();});
$('play').addEventListener('click',()=>{if(timer!==null){pause();return;}if(reduced.matches||state.stopped||!configValid)return;$('play').textContent='Pause';$('play').setAttribute('aria-pressed','true');timer=setInterval(advance,1400);});
function configure(){pause();const seed=Number($('seed').value);if($('seed').value===''||!Number.isInteger(seed)||seed<0||seed>0xffffffff){$('seed').setCustomValidity('Enter a whole number from 0 to 4294967295.');$('seed').reportValidity();configValid=false;render();$('status').textContent='Enter a valid whole-number seed, or Reset, to continue.';return;}configValid=true;$('seed').setCustomValidity('');state=createState({mode:$('mode').value,seed});history=[];selected=1;render();}
$('mode').addEventListener('change',configure);$('seed').addEventListener('change',configure);
narrow.addEventListener('change',render);reduced.addEventListener('change',()=>{pause();render();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',pause);
for(const id of ['reset','mode','seed'])$(id).disabled=false;
$('flow-controls').append($('experiment-controls'));$('flow').hidden=false;document.body.classList.add('flow-ready');
$('play').setAttribute('aria-pressed','false');render();
