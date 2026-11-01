// Rebuild fixed SVG examples from the pinned toy and the existing presentation renderer.
import {writeFileSync,readFileSync} from 'node:fs';
import {createState,step} from '../learning-machines/tokens/mechanics.mjs';
import {paintTokens} from '../learning-machines/tokens/visuals.mjs';
const initial=createState();let appended=initial;for(let i=0;i<4;i++)appended=step(appended);
function record(draw){
 const shapes=[];let path=[];const canvas={width:0,height:0};
 const c={canvas,fillStyle:'',strokeStyle:'',lineWidth:1,beginPath(){path=[];},moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);},closePath(){},fill(){shapes.push(`<polygon points="${path.map(p=>p.join(',')).join(' ')}" fill="${this.fillStyle}"/>`);},fillRect(x,y,w,h){
  // Preserve painter order; consecutive same-colour rectangles form one path.
  const prev=shapes.at(-1);const d=`M${x} ${y}h${w}v${h}h${-w}z`;
  if(prev&&typeof prev==='object'&&prev.color===this.fillStyle)prev.d+=d;else shapes.push({color:this.fillStyle,d});
 },strokeRect(x,y,w,h){shapes.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${this.strokeStyle}" stroke-width="${this.lineWidth}"/>`);}};
 draw(c);return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" shape-rendering="crispEdges">${shapes.map(s=>typeof s==='string'?s:`<path fill="${s.color}" d="${s.d}"/>`).join('')}</svg>\n`;
}
for(const [name,draw] of [
 ['worked-output.svg',c=>paintTokens(c,appended.ids,-1,false,1)],
 ['worked-output-narrow.svg',c=>paintTokens(c,appended.ids,-1,true,1)]
]){const target=new URL('../learning-machines/tokens/'+name,import.meta.url),svg=record(draw);if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==svg)throw Error('Stale worked example: '+name);}else writeFileSync(target,svg);}
console.log('Rendered two fixed, browser-independent output SVG examples');
