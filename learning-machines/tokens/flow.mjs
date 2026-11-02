import {decode,matricesFor,traceFor,distributionFor,PHASES} from './mechanics.mjs?v=20261101-tokenmath4';
// Presentation for the single scroll story: every section reads one shared state and one followed piece.
// No values are produced here; pieces, rows, weights, probabilities and choices all come from the pinned mechanics.
export function describeFlow(state,selected=1,previous=null){
 const selectedIndex=Math.max(0,Math.min(selected,state.ids.length-1)),matrices=matricesFor(state),last=state.ids.length-1;
 return {phase:state.phase,stage:PHASES.indexOf(state.phase)+1,context:state.text,
 pieces:state.ids.map((id,index)=>({id,index,text:decode([id]),label:decode([id]).replaceAll(' ','·'),input:matrices.input[index],contextual:matrices.contextual[index],generated:index>=state.ids.length-state.generated})),
 trace:traceFor(state,selectedIndex),selectedIndex,lastIndex:last,distribution:distributionFor(previous??state),selection:state.selection,generated:state.generated,stopped:state.stopped,stopReason:state.stopReason,mode:state.mode};
}
function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
const SLAB={sage:['#7f8b6e','#66745f','#c0c7ac','#dde1c9'],terra:['#b16c4f','#874d3a','#db9672','#f1c19a']};
function slabArt(kind){
 const art=document.createElementNS('http://www.w3.org/2000/svg','svg');art.setAttribute('viewBox','0 0 80 58');art.setAttribute('class','flow-slab');art.setAttribute('aria-hidden','true');
 const [left,right,top,dot]=SLAB[kind];
 for(const [points,fill] of [['4,22 40,40 40,50 4,32',left],['40,40 76,22 76,32 40,50',right],['4,22 40,4 76,22 40,40',top]]){const p=document.createElementNS('http://www.w3.org/2000/svg','polygon');p.setAttribute('points',points);p.setAttribute('fill',fill);art.append(p);}
 for(let x=12;x<70;x+=6)for(let y=10;y<36;y+=6)if(Math.abs(x-40)/32+Math.abs(y-22)/16<.9){const d=document.createElementNS('http://www.w3.org/2000/svg','rect');d.setAttribute('x',x);d.setAttribute('y',y);d.setAttribute('width','2');d.setAttribute('height','2');d.setAttribute('fill',dot);art.append(d);}
 return art;
}
/** Piece tiles. With onSelect they are toggle buttons (aria-pressed); without, a plain list. */
export function renderPieces(view,onSelect=null,{highlight=-1}={}){
 return view.pieces.map(piece=>{
  const li=node('li','piece'+(piece.generated?' generated':'')+(piece.index===highlight?' appended':''));
  const body=onSelect?node('button','flow-piece'+(piece.index===view.selectedIndex?' selected':'')):node('span','flow-piece');
  if(onSelect){body.type='button';body.dataset.pieceIndex=piece.index;body.setAttribute('aria-pressed',String(piece.index===view.selectedIndex));body.setAttribute('aria-label',piece.label+', token ID '+piece.id);body.addEventListener('click',()=>onSelect(piece.index));}
  body.append(slabArt(piece.generated?'terra':'sage'),node('strong','',piece.label),node('small','','ID '+piece.id));li.append(body);return li;
 });
}
const LABEL=item=>item.aggregate?'all other tokens':decode([item.id]).replaceAll(' ','·');
/** Probability ribbon (one 0–100% strip) plus accessible rows. In sampling mode the needle marks the seeded draw. */
export function renderDistribution(view,result){
 const $=id=>document.getElementById(id),chosen=result?.selection,draw=chosen&&result.mode==='sample'?chosen.seed/4294967296:null;
 const same=item=>chosen&&(item.aggregate?chosen.aggregate:item.id===chosen.id);
 const ribbon=$('ribbon');ribbon.replaceChildren(...view.distribution.map((item,i)=>{const seg=node('span','ribbon-seg seg-'+i+(same(item)?' chosen':''));seg.style.flexBasis=item.probability*100+'%';if(item.probability>=.12)seg.append(node('b','',LABEL(item)),node('small','',Math.round(item.probability*100)+'%'));return seg;}));
 if(draw!==null){const needle=node('span','ribbon-needle');needle.style.left=draw*100+'%';needle.append(node('small','','draw '+draw.toFixed(3)));ribbon.append(needle);}
 const dl=$('distribution');dl.replaceChildren(...view.distribution.map(item=>{const div=node('div',same(item)?'chosen':''),dt=node('dt','',LABEL(item)),dd=node('dd'),bar=node('span');bar.style.setProperty('--probability',item.probability*100+'%');bar.setAttribute('aria-hidden','true');dd.append(bar,Math.round(item.probability*100)+'%');if(same(item))dd.append(node('em','',result.mode==='sample'?' ← sampled':' ← greedy pick'));div.append(dt,dd);return div;}));
 const last=view.pieces[view.lastIndex];$('last-position').textContent='Scored from the LAST POSITION · '+last.label+' / ID '+last.id+'.';
 return view.generated===1?'This second cycle scripts a period at 100%. It is not model output.':'Illustrative probabilities. Probability is not truth confidence.';
}
/** The appended piece, its ID decoded, and the longer text that becomes the next cycle's input. */
export function renderAppend(view){
 const wrap=node('div','append-live');
 if(view.selection?.aggregate){wrap.append(node('p','text-box','All other tokens'),node('p','','This group has no single token ID. The small fixture stops here without inventing text.'));return wrap;}
 const last=view.pieces.at(-1),list=node('ol','token-list piece-row');list.append(...renderPieces(view,null,{highlight:last.index}));
 const decodeRow=node('p','append-decode');decodeRow.append(node('span','flow-id','ID '+last.id),node('span','flow-arrow','→ decode →'),node('span','flow-decoded',last.label));
 const out=node('p','text-box');out.append(view.pieces.slice(0,-1).map(p=>p.text).join(''));out.append(node('mark','',last.text));
 wrap.append(list,decodeRow,out);return wrap;
}
export const STATUS={'outside-fixture':'Stopped: choice outside this fixture. No token was invented.','demo-limit':'Stopped at the two-token demo limit. No model was run.'};
