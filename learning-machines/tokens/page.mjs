import {createState,step,reset,decode,distributionFor,matricesFor,PHASES} from './mechanics.mjs';
import {context2d,paintTokens,paintEmbedding,paintLayers} from './visuals.mjs';
const $=id=>document.getElementById(id);
const narrow=window.matchMedia('(max-width:540px)'),reduced=window.matchMedia('(prefers-reduced-motion:reduce)');
const names={tokens:'Tokenize the text',embedding:'Look up representations',layers:'Use the earlier context',distribution:'Score the next token',append:'Append and decode'};
const contexts=Object.fromEntries(['tokens','embedding','layers','output'].map(name=>[name,context2d($(name+'-canvas'))]));
let state=createState(),history=[],selected=1,timer=null,configValid=true;
const piece=id=>decode([id]).replaceAll(' ','·');
function pause(){if(timer!==null){clearInterval(timer);timer=null;}$('play').textContent='Play';$('play').setAttribute('aria-pressed','false');}
function render(){
 const stage=PHASES.indexOf(state.phase);
 $('status').textContent=state.stopped?(state.stopReason==='outside-fixture'?'Stopped: choice outside this fixture. No token was invented.':'Stopped: two-token demo limit reached.'):`${stage+1} / 5 · ${names[state.phase]} · ${state.generated} tokens generated`;
 PHASES.forEach(name=>$('stage-'+name).classList.toggle('current-stage',name===state.phase));
 $('back').disabled=history.length===0;$('next').disabled=state.stopped||!configValid;$('play').disabled=state.stopped||reduced.matches||!configValid;
 $('motion-note').hidden=!reduced.matches;
 $('prompt').textContent=state.text;
 selected=Math.min(selected,state.ids.length-1);
 $('token-list').replaceChildren(...state.ids.map((id,index)=>{const li=document.createElement('li'),small=document.createElement('small');li.append(piece(id));small.textContent='ID '+id;li.append(small);li.classList.toggle('selected',index===selected);return li;}));
 $('token-select').replaceChildren(...state.ids.map((id,index)=>{const option=document.createElement('option');option.value=index;option.textContent=piece(id)+' / ID '+id;return option;}));$('token-select').value=String(selected);
 const {input,contextual}=matricesFor(state);
 $('embedding-value').textContent=piece(state.ids[selected])+' / '+state.ids[selected]+' → ['+input[selected].map(v=>v.toFixed(1)).join(', ')+']';
 // On append, keep the distribution which actually made this selection visible.
 const prediction=state.phase==='append'&&history.length?(history.findLast(item=>item.phase==='distribution')??state):state;
 const distribution=distributionFor(prediction);
 $('prediction-context').textContent=prediction.text;
 $('distribution').replaceChildren(...distribution.map(item=>{const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd'),bar=document.createElement('span');dt.textContent=item.aggregate?'all other tokens':piece(item.id);bar.style.setProperty('--probability',item.probability*100+'%');bar.setAttribute('aria-hidden','true');dd.append(bar,Math.round(item.probability*100)+'%');div.append(dt,dd);return div;}));
 $('chosen').textContent=state.selection?(state.selection.aggregate?'“All other tokens” is a group, not a token ID. This fixture cannot decode that choice.':'Chosen: '+piece(state.selection.id)+' / ID '+state.selection.id):'No new token selected in this cycle yet.';
 $('output').textContent=state.text;
 $('stop-note').textContent=state.stopped&&state.stopReason==='outside-fixture'?'Stopped outside the small verified fixture; the text is unchanged. Reset or choose another seed.':state.generated>=1?'After the first choice, this toy scripts a period at 100% and stops after two generated tokens. This is not model output.':'This toy generates at most two tokens, then stops at its demo limit. It does not run a language model.';
 if(contexts.tokens)paintTokens(contexts.tokens,state.ids,selected,narrow.matches,state.generated);
 if(contexts.embedding)paintEmbedding(contexts.embedding,input,selected,narrow.matches);
 if(contexts.layers)paintLayers(contexts.layers,input,contextual,narrow.matches);
 if(contexts.output)paintTokens(contexts.output,state.ids,-1,narrow.matches,state.generated);
 for(const [name,ctx] of Object.entries(contexts))$(name+'-canvas').hidden=!ctx;
 if(state.stopped)pause();
}
function advance(){if(state.stopped||!configValid)return;history.push(state);state=step(state);render();}
$('next').addEventListener('click',()=>{pause();advance();});
$('back').addEventListener('click',()=>{pause();if(history.length)state=history.pop();render();});
$('reset').addEventListener('click',()=>{pause();state=reset(state);history=[];selected=1;configValid=true;$('seed').value=state.initialSeed;$('mode').value=state.mode;$('seed').setCustomValidity('');render();});
$('play').addEventListener('click',()=>{if(timer!==null){pause();return;}if(reduced.matches||state.stopped||!configValid)return;$('play').textContent='Pause';$('play').setAttribute('aria-pressed','true');timer=setInterval(advance,1400);});
function configure(){pause();const seed=Number($('seed').value);if($('seed').value===''||!Number.isInteger(seed)||seed<0||seed>0xffffffff){$('seed').setCustomValidity('Enter a whole number from 0 to 4294967295.');$('seed').reportValidity();configValid=false;render();$('status').textContent='Enter a valid whole-number seed, or Reset, to continue.';return;}configValid=true;$('seed').setCustomValidity('');state=createState({mode:$('mode').value,seed});history=[];selected=1;render();}
$('mode').addEventListener('change',configure);$('seed').addEventListener('change',configure);
$('token-select').addEventListener('change',()=>{selected=Number($('token-select').value);render();});
narrow.addEventListener('change',render);reduced.addEventListener('change',()=>{pause();render();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',pause);
for(const id of ['reset','mode','seed','token-select'])$(id).disabled=false;
$('play').setAttribute('aria-pressed','false');render();
