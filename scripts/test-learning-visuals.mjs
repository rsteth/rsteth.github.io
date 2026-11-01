import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {growth,architecture,illustrate} from '../learning-machines/attention-and-memory/mechanics.mjs';
import {growthColumns,layerGroups,toyTiles,contains,context2d,paintGrowth,paintLayers,paintToy} from '../learning-machines/attention-and-memory/visuals.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const n of [1024,16384,262144]) {
 const bars=growthColumns(growth(n));assert.deepEqual(bars.map(x=>x.value),[n/1024,n/4096+.75,1]);
 assert.equal(bars[2].height,14);assert.ok(bars.every(x=>Number.isFinite(x.height)&&x.height>0));
}
assert.ok(growthColumns(growth(262144))[0].height>growthColumns(growth(16384))[0].height);
for(const mode of [false,true]) {
 const all=architecture(mode),pages=Array.from({length:4},(_,p)=>layerGroups(all,p).flat());
 assert.deepEqual(pages.flat(),all);assert.equal(new Set(pages.flat().map(x=>x.index)).size,64);
 assert.equal(all.filter(x=>x.kind===(mode?'converted':'attention')).length,16);
 assert.equal(all.filter(x=>x.kind===(mode?'adapted':'gdn')).length,48);
}
for(let step=0;step<=6;step++) {
 const {history,state}=illustrate(step),tiles=toyTiles(history,state);assert.equal(tiles.history.length,step);assert.equal(tiles.state.length,2);
 assert.deepEqual(tiles.state.map(x=>x.value),[state.door??null,state.cup??null]);
}
assert.equal(context2d({getContext(){return null}}),null);assert.equal(context2d({getContext(){throw Error('off')}}),null);
const ctx={fillStyle:'',strokeStyle:'',lineWidth:1,beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},fillRect(){},strokeRect(){}};
paintGrowth(ctx,growth(16384));paintToy(ctx,...Object.values(illustrate(6)));
for(const compact of [false,true])for(let page=0;page<4;page++) {
 const hits=paintLayers(ctx,architecture(false),page,page*16,compact);assert.equal(hits.length,16);assert.equal(hits[0].index,page*16);
 const p=hits[0].polygon;assert.equal(contains([(p[0][0]+p[2][0])/2,(p[0][1]+p[2][1])/2],p),true);
}
const html=read('learning-machines/attention-and-memory/index.html'),css=read('learning-machines/learning.css'),home=read('index.html'),globalCSS=read('styles.css');
assert.equal((html.match(/class="layer (?:attention|gdn)"/g)||[]).length,64);
assert.equal((html.match(/<canvas[^>]+aria-hidden="true"/g)||[]).length,3);
assert.match(html,/<label[^>]+for="layer-focus"/);assert.match(html,/Height uses a logarithmic scale/);
for(const tag of html.matchAll(/<(input|button|select)\b[^>]*>/g))assert.match(tag[0],/disabled/,'No-script controls disabled');
assert.ok(html.includes('<div id="experiment">'));assert.ok(html.includes('class="growth-chart"'));assert.match(html,/<details id="linear-growth" open>/);
assert.match(css,/grid-template-columns:repeat\(2,1fr\)/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(globalCSS,/prefers-reduced-motion:no-preference/);
assert.match(home,/role="img" aria-label="Two isometric layer stacks/);
assert.equal((home.match(/class="learning-thumb-slab"/g)||[]).length,8);
console.log('PASS: exact growth values/log scale/fixed state, 64-layer identity, both modes, all recall steps, canvas fallback, pointer polygons, static semantics, accessible controls and motion guards');
