import {growth, architecture, illustrate, EVENTS} from './mechanics.mjs';
import {context2d,paintGrowth,paintLayers,paintToy,contains} from './visuals.mjs';
const $ = id => document.getElementById(id);
const growthContext=context2d($('growth-canvas')),layerContext=context2d($('layer-canvas')),toyContext=context2d($('toy-canvas'));
let layerPage=0,selectedLayer=0,layerHits=[];
const narrow=window.matchMedia('(max-width:540px)');
const names={attention:'Full attention',gdn:'Original GDN',converted:'Converted to GDN',adapted:'Original GDN, later adapted'};
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
 if(growthContext){paintGrowth(growthContext,data);if($('growth-art').hidden)$('linear-growth').open=false;$('growth-art').hidden=false;}
}
function updateLayers() {
 const converted=document.querySelector('[name=architecture]:checked').value==='converted';
 const layers=architecture(converted);
 $('layers').replaceChildren(...layers.map(({index,kind})=>{
  const el=document.createElement('span');el.className='layer '+kind;
  const mark=document.createElement('span');mark.textContent={attention:'A',gdn:'G',converted:'C',adapted:'D'}[kind];
  const num=document.createElement('small');num.textContent=index+1;el.append(mark,num);return el;
 }));
 $('layer-summary').textContent=converted?'All 64 layers are GDN: 16 converted (C), 48 original GDN later adapted (D).':'48 original GDN layers (G), 16 full-attention layers (A). Pattern: G G G A, repeated 16 times.';
 if(layerContext){
  $('layer-canvas').width=narrow.matches?246:466;$('layer-canvas').height=narrow.matches?420:220;
  layerHits=paintLayers(layerContext,layers,layerPage,selectedLayer,narrow.matches);$('layer-art').hidden=false;$('layers').hidden=true;
  $('layer-ranges').replaceChildren(...Array.from({length:4},(_,g)=>{const span=document.createElement('span');span.textContent=(converted?'D D D C':'G G G A')+' · '+(layerPage*16+g*4+1)+'–'+(layerPage*16+g*4+4);return span;}));
  $('layer-page').value='Layers '+(layerPage*16+1)+'–'+(layerPage*16+16)+' of 64';
  $('layers-previous').disabled=layerPage===0;$('layers-next').disabled=layerPage===3;
  $('layer-focus').replaceChildren(...layers.map(({index,kind})=>{const option=document.createElement('option');option.value=index;option.textContent='Layer '+(index+1)+' · '+names[kind];return option;}));
  $('layer-focus').value=String(selectedLayer);
  $('selected-layer').textContent='Layer '+(selectedLayer+1)+' · '+names[layers[selectedLayer].kind]+'. Each stack shows four consecutive layers, bottom to top.';
 }

}
let step=0;
function updateToy() {
 const {history,state}=illustrate(step);
 if(toyContext){paintToy(toyContext,history,state);$('toy-art').hidden=false;}
 $('step-status').value=step+' / '+EVENTS.length+' updates';
 $('history').replaceChildren(...history.map(({key,value})=>{const li=document.createElement('li');li.textContent=key+' → '+value;return li;}));
 if(!history.length){const li=document.createElement('li');li.textContent='No updates yet';$('history').append(li);}
 $('state').replaceChildren(...['door','cup'].map(key=>{const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=state[key]??'—';div.append(dt,dd);return div;}));
 $('previous').disabled=step===0;$('next').disabled=step===EVENTS.length;
 $('recall').textContent=step>=3?'The first door colour was blue. The log still contains it; the latest-state dictionary has overwritten it.':step?'The first door colour is blue. Both representations still retain it.':'Start with an empty log and two empty state slots.';
}
$('layers-previous').addEventListener('click',()=>{layerPage=Math.max(0,layerPage-1);selectedLayer=layerPage*16;updateLayers();});
$('layers-next').addEventListener('click',()=>{layerPage=Math.min(3,layerPage+1);selectedLayer=layerPage*16;updateLayers();});
$('layer-focus').addEventListener('change',()=>{selectedLayer=Number($('layer-focus').value);layerPage=Math.floor(selectedLayer/16);updateLayers();});
$('layer-canvas').addEventListener('click',event=>{
 const rect=$('layer-canvas').getBoundingClientRect();
 const point=[(event.clientX-rect.left)/rect.width*$('layer-canvas').width,(event.clientY-rect.top)/rect.height*$('layer-canvas').height];
 const hit=[...layerHits].reverse().find(hit=>contains(point,hit.polygon));
 if(hit){selectedLayer=hit.index;updateLayers();}
});
$('context').addEventListener('input',updateGrowth);
document.querySelectorAll('[name=architecture]').forEach(input=>input.addEventListener('change',updateLayers));
$('next').addEventListener('click',()=>{step=Math.min(EVENTS.length,step+1);updateToy();});
$('previous').addEventListener('click',()=>{step=Math.max(0,step-1);updateToy();});
narrow.addEventListener('change',updateLayers);
document.querySelectorAll('#experiment input,#experiment button,#experiment select').forEach(control=>control.disabled=false);
updateGrowth();updateLayers();updateToy();$('experiment').hidden=false;
