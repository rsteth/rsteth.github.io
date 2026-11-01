// Presentation only. The pinned experiment remains the source of all values.
export const PALETTES = Object.freeze({
 gdn:['#c0c7ac','#7f8b6e','#66745f','#dde1c9'],
 attention:['#db9672','#b16c4f','#874d3a','#f1c19a'],
 adapted:['#b7c4af','#778c78','#5f7565','#dce6d4'],
 converted:['#d9c48d','#ae9560','#8a774e','#efe2ba'],
 hybrid:['#d9c48d','#ae9560','#8a774e','#efe2ba']
});
export const COLORS=Object.freeze({blue:'#6d91ad',red:'#bd7664',green:'#8caa7a',white:'#e1ddcc',yellow:'#c9ad58',black:'#454841'});
export function growthColumns(data) {
 return ['full','hybrid','recurrent'].map((kind,index)=>({kind,x:76+index*157,height:(Math.log2(data[kind]/64)+1)*14,value:data[kind]/64}));
}
export function layerGroups(layers,page=0) {
 if(layers.length!==64||!Number.isInteger(page)||page<0||page>3) throw new RangeError('Expected 64 layers and page 0–3');
 return Array.from({length:4},(_,group)=>layers.slice(page*16+group*4,page*16+group*4+4));
}
export function toyTiles(history,state) {
 return {history:history.map(({key,value},index)=>({key,value,index,color:COLORS[value]})),state:['door','cup'].map(key=>({key,value:state[key]??null,color:COLORS[state[key]]??null}))};
}
export function contains(point,polygon) {
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
  const a=polygon[i],b=polygon[j];
  if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function polygon(ctx,points,color) {ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function slab(ctx,x,y,w,h,depth,palette) {
 const [top,left,right,highlight]=palette;
 const face=[[x,y-h],[x+w,y],[x,y+h],[x-w,y]];
 polygon(ctx,[face[3],face[2],[x,y+h+depth],[x-w,y+depth]],left);
 polygon(ctx,[face[2],face[1],[x+w,y+depth],[x,y+h+depth]],right);
 polygon(ctx,face,top);
 // Deterministic pixel-grid shading; no random shimmer or animation loop.
 ctx.fillStyle=highlight;
 for(let px=Math.ceil(x-w+2);px<x+w-1;px++)for(let py=Math.ceil(y-h+1);py<y+h;py++) {
  if(Math.abs(px-x)/w+Math.abs(py-y)/h<.9&&((px%4===0&&py%4===0)||(px%4===2&&py%4===2)))ctx.fillRect(px,py,1,1);
 }
 return [...face,[x,y+h+depth]];
}
function ground(ctx,width,height) {
 ctx.fillStyle='#f6f3eb';ctx.fillRect(0,0,width,height);ctx.fillStyle='#ddd8cb';
 for(let x=8;x<width;x+=8)for(let y=height-40;y<height-4;y+=8)ctx.fillRect(x,y,1,1);
}
export function context2d(canvas) {
 try {return canvas?.getContext('2d')??null;}catch{return null;}
}
export function paintGrowth(ctx,data) {
 ground(ctx,466,188);
 for(const {kind,x,height} of growthColumns(data)) {
  const palette=PALETTES[{full:'attention',hybrid:'hybrid',recurrent:'gdn'}[kind]];
  slab(ctx,x,145-height,42,19,height,palette);
 }
}
export function paintLayers(ctx,layers,page,selected,compact=false) {
 ground(ctx,compact?246:466,compact?420:220);const hits=[];
 layerGroups(layers,page).forEach((group,g)=>{
  const x=65+110*(compact?g%2:g),base=158-14*(compact?g%2:g)+(compact?Math.floor(g/2)*210:0);
  group.forEach(({index,kind},level)=>{
   const y=base-level*24,face=slab(ctx,x,y,44,22,8,PALETTES[kind]);
   hits.push({index,polygon:face.slice(0,4)});
   if(index===selected){ctx.fillStyle='#9c523d';ctx.fillRect(x-49,y-5,1,21);ctx.fillRect(x-49,y+15,12,1);ctx.fillRect(x+48,y-5,1,21);ctx.fillRect(x+37,y+15,12,1);}
  });
 });
 return hits;
}
export function paintToy(ctx,history,state) {
 ground(ctx,466,210);const tiles=toyTiles(history,state);
 tiles.history.forEach(({index,color})=>slab(ctx,45+index%2*70,35+Math.floor(index/2)*54,27,13,5,[color,'#999681','#6b6d5e','#eee4c6']));
 tiles.state.forEach(({color},i)=>{
  slab(ctx,305+i*100,141,37,18,8,PALETTES.gdn);
  if(color)slab(ctx,305+i*100,130,22,10,7,[color,'#8d8e78','#626957','#e1dcc7']);
 });
}
