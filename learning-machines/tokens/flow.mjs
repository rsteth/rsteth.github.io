import {decode,matricesFor,distributionFor,PHASES} from './mechanics.mjs';
const TITLES={tokens:'Text becomes labeled pieces.',embedding:'Each piece gets a row of numbers.',layers:'The same row changes with context.',distribution:'The last row scores the next piece.',append:'One new piece joins the text.'};
const PURPOSES={tokens:'Read a piece and its vocabulary ID together. Select one to follow it through the next steps.',embedding:'Follow the selected piece into its six-number row. The other pieces get rows too.',layers:'Compare the selected row before and after processing. Earlier pieces provide context; we are highlighting one row.',distribution:'Prediction uses the last position in the current text. This teaching distribution is supplied, not calculated by a model.',append:'The chosen ID decodes to text and is appended. That longer text becomes the input for the next cycle.'};
export function describeFlow(state,selected=1,previous=null){
 const selectedIndex=Math.max(0,Math.min(selected,state.ids.length-1)),matrices=matricesFor(state),last=state.ids.length-1;
 return {phase:state.phase,stage:PHASES.indexOf(state.phase)+1,title:TITLES[state.phase],purpose:PURPOSES[state.phase],context:state.text,
 pieces:state.ids.map((id,index)=>({id,index,text:decode([id]),label:decode([id]).replaceAll(' ','·'),input:matrices.input[index],contextual:matrices.contextual[index]})),
 selectedIndex,lastIndex:last,distribution:distributionFor(previous??state),selection:state.selection,generated:state.generated,stopped:state.stopped,stopReason:state.stopReason};
}
function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function numbers(values,changed=false){const n=node('div','flow-vector');values.forEach(v=>{const cell=node('span',changed?'changed':'',v.toFixed(2));n.append(cell);});return n;}
function pieceCard(piece,selected,onSelect){
 const b=node('button','flow-piece'+(selected?' selected':''));b.type='button';b.dataset.pieceIndex=piece.index;b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-label',piece.label+', token ID '+piece.id);
 const art=document.createElementNS('http://www.w3.org/2000/svg','svg');art.setAttribute('viewBox','0 0 80 58');art.setAttribute('class','flow-slab');art.setAttribute('aria-hidden','true');
 for(const [points,fill] of [['4,22 40,40 40,50 4,32','#7f8b6e'],['40,40 76,22 76,32 40,50','#66745f'],['4,22 40,4 76,22 40,40','#c0c7ac']]){const p=document.createElementNS('http://www.w3.org/2000/svg','polygon');p.setAttribute('points',points);p.setAttribute('fill',fill);art.append(p);}
 for(let x=12;x<70;x+=6)for(let y=10;y<36;y+=6)if(Math.abs(x-40)/32+Math.abs(y-22)/16<.9){const dot=document.createElementNS('http://www.w3.org/2000/svg','rect');dot.setAttribute('x',x);dot.setAttribute('y',y);dot.setAttribute('width','2');dot.setAttribute('height','2');dot.setAttribute('fill','#dde1c9');art.append(dot);}
 b.append(art,node('strong','',piece.label),node('small','','ID '+piece.id));b.addEventListener('click',()=>onSelect(piece.index));return b;
}
export function renderFlow(view,onSelect){
 const $=id=>document.getElementById(id),scene=$('flow-scene');scene.replaceChildren();
 $('flow-step').textContent=`${view.stage} / 5 · ${view.phase}`;$('flow-heading').textContent=view.title;$('flow-purpose').textContent=view.purpose;$('flow-context-text').textContent=view.context;
 let change='';const followed=view.pieces[view.selectedIndex];
 if(view.phase==='tokens'){
  const grid=node('div','flow-pieces');view.pieces.forEach(p=>grid.append(pieceCard(p,p.index===view.selectedIndex,onSelect)));scene.append(grid,node('p','small','· marks a space. Every label stays attached to its piece.'));
  change=`Following ${followed.label} / ID ${followed.id}. Next: look up its numbers.`;
 }else if(view.phase==='embedding'){
  const table=node('table','flow-matrix');const caption=node('caption','', 'Illustrative starting rows · select a piece to follow');table.append(caption);const tbody=node('tbody');
  view.pieces.forEach(p=>{const tr=node('tr',p.index===view.selectedIndex?'selected':'');const th=node('th');th.scope='row';const b=node('button','',p.label+' / '+p.id);b.type='button';b.dataset.pieceIndex=p.index;b.setAttribute('aria-pressed',String(p.index===view.selectedIndex));b.addEventListener('click',()=>onSelect(p.index));th.append(b);const td=node('td');td.append(numbers(p.input));tr.append(th,td);tbody.append(tr);});table.append(tbody);scene.append(table);change=`${followed.label} / ID ${followed.id} now identifies the highlighted row. These numbers are illustrative.`;
 }else if(view.phase==='layers'){
  const title=node('p','flow-follow',`Following ${followed.label} / ID ${followed.id}`),grid=node('div','flow-transform');
  const before=node('div'),after=node('div');before.append(node('p','eyebrow','INPUT ROW'),numbers(followed.input));after.append(node('p','eyebrow','UPDATED ROW'),numbers(followed.contextual,true));
  const stack=node('div','flow-stack');stack.setAttribute('aria-hidden','true');for(let i=0;i<4;i++)stack.append(node('span'));
  grid.append(before,stack,after);scene.append(title,grid,node('p','small','Schematic layers. The toy changes values deterministically; it does not run a neural network.'));
  change='Only the representation changed. The context strip above is still the same text.';
 }else if(view.phase==='distribution'){
  const last=view.pieces[view.lastIndex];scene.append(node('p','flow-follow',`LAST POSITION · ${last.label} / ID ${last.id}`),numbers(last.contextual,true));
  const dl=node('dl','token-distribution');view.distribution.forEach(item=>{const div=node('div'),dt=node('dt','',item.aggregate?'all other tokens':decode([item.id]).replaceAll(' ','·')),dd=node('dd'),bar=node('span');bar.style.setProperty('--probability',item.probability*100+'%');bar.setAttribute('aria-hidden','true');dd.append(bar,Math.round(item.probability*100)+'%');div.append(dt,dd);dl.append(div);});scene.append(dl);
  change=view.generated===1?'This second cycle scripts a period at 100%. It is not model output. Next step appends it.':'Next step chooses from these illustrative probabilities. Probability is not truth confidence.';
 }else{
  if(view.selection?.aggregate){scene.append(node('p','text-box','All other tokens'),node('p','','This group has no single token ID. The small fixture stops here without inventing text.'));change='Nothing was appended. Reset to try another rule or seed.';}
  else if(view.selection){const p=view.pieces.at(-1),strip=node('div','flow-append');strip.append(node('span','flow-id','ID '+p.id),node('span','flow-arrow','→'),node('span','flow-decoded',p.label));scene.append(strip);const out=node('p','text-box');out.append(view.pieces.slice(0,-1).map(p=>p.text).join(''));out.append(node('mark','',p.text));scene.append(node('p','eyebrow','DECODED TEXT'),out);change=view.stopped?'Stopped at the two-token demo limit. No model was run.':view.generated===1?'New piece added. Next cycle uses this longer text and scripts a period at 100%.':'Period added. Next step stops at this toy’s two-token limit.';}
 }
 $('flow-change').textContent=change;
}
