import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const base=new URL('../learning-machines/tokens/',import.meta.url),read=f=>readFileSync(new URL(f,base),'utf8');
const html=read('index.html'),page=read('page.mjs'),flow=read('flow.mjs'),css=read('tokens.css');
const section00=html.slice(html.indexOf('<section id="stage-tokens"'),html.indexOf('<section id="stage-embedding"'));
assert.ok(section00.indexOf('00 / tokens')<section00.indexOf('id="token-list"'));assert.match(section00,/unhappiness/);assert.match(section00,/ID 67391/);
// One control set, placed with the distribution it acts on.
const section03=html.slice(html.indexOf('<section id="stage-distribution"'),html.indexOf('<section id="stage-append"'));
for(const id of ['choose','reset','mode','seed']){assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);assert.ok(section03.includes('id="'+id+'"'));}
assert.ok(html.includes('id="next-cycle"'));
// Four fixed worked examples stay readable without JS/canvas; the live story never mutates them.
for(const name of ['embedding','layers','distribution','output']){
 const figure=html.match(new RegExp('<figure class="worked-example" id="worked-'+name+'">([\\s\\S]*?)</figure>(?=<!--|<h3|</div>)'))?.[1];assert.ok(figure,name);assert.ok(figure.includes('Fixed worked example'));assert.ok(!figure.includes(' hidden'));
 if(name==='output')assert.match(figure,/<img[^>]+alt="[^"]+"/);
 if(name==='embedding'||name==='layers')assert.match(figure,/class="explanation/);
 assert.ok(!page.includes('worked-'+name)&&!flow.includes('worked-'+name));
}
// Live versions exist and only show once the page is interactive.
for(const id of ['live-embedding','live-layers','live-output'])assert.ok(html.includes('id="'+id+'"'));
assert.match(css,/\.live-example\s*\{[^}]*display:\s*none/);assert.match(page,/classList\.add\('flow-ready'\)/);
assert.ok(html.includes('·cat / 8415 → [-0.9, -0.2, 0.5, -0.7, 0.0, 0.7]'));assert.ok(html.includes('The cat sat on the mat'));
assert.ok(!html.includes('src="worked-layers.svg"'));assert.ok(html.includes('worked-output-narrow.svg'));assert.ok(!html.includes('<canvas'));
console.log('PASS: section 00 shows real splits; one control set beside the distribution; four fixed worked examples remain visible without JS and are never mutated; live examples appear only when interactive');
