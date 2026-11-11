import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {growth,architecture,illustrate} from '../learning-machines/attention-and-memory/mechanics.mjs';
import {growthTiles,layerStrip,groupOf,tileAt,toyTiles,contains,context2d,paintGrowth,paintLayers,paintToy} from '../learning-machines/attention-and-memory/visuals.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const n of [1024,16384,262144]) {
 const cols=growthTiles(growth(n));assert.deepEqual(cols.map(x=>x.value),[n/1024,n/4096+.75,1]);
 // Linear and countable: whole tiles + a partial tile reproduce the exact value; recurrent is always one tile.
 cols.forEach(c=>{assert.ok(Math.abs(c.whole+c.fraction-c.value)<1e-9);assert.ok(c.whole+(c.fraction>0)<=256);});
 assert.equal(cols[2].whole,1);assert.equal(cols[2].fraction,0);
}
assert.equal(growthTiles(growth(262144))[0].whole,256);
{const d=growth(40960),at=(col,k)=>[12+col*155+((k-1)%16)*9+4,170-(Math.floor((k-1)/16)+1)*9+4];
 assert.deepEqual(tileAt(d,...at(0,6)),{kind:'full',number:6,filled:true,partial:false,value:40});
 assert.equal(tileAt(d,...at(1,11)).partial,true);assert.equal(tileAt(d,...at(1,12)).filled,false);assert.equal(tileAt(d,...at(2,2)).filled,false);assert.equal(tileAt(d,5,5),null);}assert.ok(growthTiles(growth(262144))[0].whole>growthTiles(growth(16384))[0].whole);
for(const mode of [false,true]) {
 const all=architecture(mode);
 for(const compact of [false,true]){const strip=layerStrip(all,compact);assert.equal(strip.length,64);assert.equal(new Set(strip.map(b=>b.x+','+b.row)).size,64);assert.ok(strip.every(b=>b.x>0&&b.x+b.w<(compact?246:466)));}
 assert.deepEqual(groupOf(13),[12,13,14,15]);
 assert.equal(all.filter(x=>x.kind===(mode?'converted':'attention')).length,16);
 assert.equal(all.filter(x=>x.kind===(mode?'adapted':'gdn')).length,48);
}
for(let step=0;step<=6;step++) {
 const {history,state}=illustrate(step),tiles=toyTiles(history,state);assert.equal(tiles.history.length,step);assert.equal(tiles.state.length,2);
 assert.deepEqual(tiles.state.map(x=>x.value),[state.who??null,state.where??null]);
}
assert.equal(context2d({getContext(){return null}}),null);assert.equal(context2d({getContext(){throw Error('off')}}),null);
const ctx={fillStyle:'',strokeStyle:'',lineWidth:1,beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},fillRect(){},strokeRect(){}};
paintGrowth(ctx,growth(16384));paintToy(ctx,...Object.values(illustrate(6)));
for(const compact of [false,true])for(const selected of [0,13,63]) {
 const hits=paintLayers(ctx,architecture(false),selected,compact),bars=hits.filter(h=>!h.inset),inset=hits.filter(h=>h.inset);
 assert.equal(bars.length,64);assert.deepEqual(bars.map(h=>h.index),[...Array(64).keys()]);assert.deepEqual(inset.map(h=>h.index),groupOf(selected));
 for(const h of bars){const p=h.polygon;assert.equal(contains([(p[0][0]+p[2][0])/2,(p[0][1]+p[2][1])/2],p),true);}
}
const html=read('learning-machines/attention-and-memory/index.html'),css=read('learning-machines/learning.css'),home=read('index.html'),globalCSS=read('styles.css');
assert.equal((html.match(/class="layer (?:attention|gdn)"/g)||[]).length,64);
assert.equal((html.match(/<canvas[^>]+aria-hidden="true"/g)||[]).length,3);
assert.match(html,/<label[^>]+for="layer-focus"/);assert.match(html,/One tile = the whole stack’s state at 1,024 tokens/);assert.ok(!html.includes('logarithmic'));assert.ok(!html.includes('layers-next'));
assert.ok(html.includes('id="recall-log"')&&html.includes('id="recall-state"'));
for(const tag of html.matchAll(/<(input|button|select)\b[^>]*>/g))assert.match(tag[0],/disabled/,'No-script controls disabled');
assert.ok(html.includes('<div id="experiment">'));assert.ok(html.includes('class="growth-chart"'));assert.match(html,/<details id="linear-growth" open>/);
assert.match(css,/grid-template-columns:repeat\(2,1fr\)/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(globalCSS,/prefers-reduced-motion:no-preference/);
assert.match(home,/role="img" aria-label="Two isometric layer stacks/);
assert.equal((home.match(/class="learning-thumb-slab"/g)||[]).length,8);
console.log('PASS: exact growth values/countable linear tiles/fixed state, all 64 layers in one strip, both modes, all recall steps, canvas fallback, pointer polygons, static semantics, accessible controls and motion guards');
