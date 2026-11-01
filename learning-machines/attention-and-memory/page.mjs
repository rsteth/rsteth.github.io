import {growth, architecture, illustrate, EVENTS} from './mechanics.mjs';
const $ = id => document.getElementById(id);
const format = n => n.toLocaleString('en-US', {maximumFractionDigits:2});
function updateGrowth() {
 const tokens=Number($('context').value), data=growth(tokens);
 $('tokens').value=format(tokens)+' tokens';
 for(const name of ['full','hybrid','recurrent']) $(name+'-value').textContent=format(data[name]/64)+'× baseline';
 const x=30+(tokens-1024)/(262144-1024)*550;
 for(const name of ['full','hybrid','recurrent']) {
  const y=value=>170-(value/64)/256*160;
  const start=growth(1024)[name],end=growth(262144)[name];
  document.querySelector('.'+name+'-line').setAttribute('d',`M30 ${y(start)}L580 ${y(end)}`);
  $(name+'-dot').setAttribute('cx',x);$(name+'-dot').setAttribute('cy',y(data[name]));
 }
 $('cursor').setAttribute('x1',x);$('cursor').setAttribute('x2',x);
}
function updateLayers() {
 const converted=document.querySelector('[name=architecture]:checked').value==='converted';
 $('layers').replaceChildren(...architecture(converted).map(({index,kind})=>{
  const el=document.createElement('span');el.className='layer '+kind;
  const mark=document.createElement('span');mark.textContent={attention:'A',gdn:'G',converted:'C',adapted:'D'}[kind];
  const num=document.createElement('small');num.textContent=index+1;el.append(mark,num);return el;
 }));
 $('layer-summary').textContent=converted?'All 64 layers are GDN: 16 converted (C), 48 original GDN later adapted (D).':'48 original GDN layers (G), 16 full-attention layers (A). Pattern: G G G A, repeated 16 times.';
}
let step=0;
function updateToy() {
 const {history,state}=illustrate(step);
 $('step-status').value=step+' / '+EVENTS.length+' updates';
 $('history').replaceChildren(...history.map(({key,value})=>{const li=document.createElement('li');li.textContent=key+' → '+value;return li;}));
 if(!history.length){const li=document.createElement('li');li.textContent='No updates yet';$('history').append(li);}
 $('state').replaceChildren(...['door','cup'].map(key=>{const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=state[key]??'—';div.append(dt,dd);return div;}));
 $('previous').disabled=step===0;$('next').disabled=step===EVENTS.length;
 $('recall').textContent=step>=3?'The first door colour was blue. The log still contains it; the latest-state dictionary has overwritten it.':step?'The first door colour is blue. Both representations still retain it.':'Start with an empty log and two empty state slots.';
}
$('context').addEventListener('input',updateGrowth);
document.querySelectorAll('[name=architecture]').forEach(input=>input.addEventListener('change',updateLayers));
$('next').addEventListener('click',()=>{step=Math.min(EVENTS.length,step+1);updateToy();});
$('previous').addEventListener('click',()=>{step=Math.max(0,step-1);updateToy();});
updateGrowth();updateLayers();updateToy();$('experiment').hidden=false;
