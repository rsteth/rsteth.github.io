import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const base=new URL('../learning-machines/tokens/',import.meta.url),read=f=>readFileSync(new URL(f,base),'utf8');
const html=read('index.html'),page=read('page.mjs'),css=read('tokens.css');
const section00=html.slice(html.indexOf('<section id="stage-tokens"'),html.indexOf('<section id="stage-embedding"'));
assert.ok(section00.indexOf('00 / tokens')<section00.indexOf('id="flow"'));assert.ok(section00.indexOf('id="flow"')<section00.indexOf('</section>'));
assert.equal((html.match(/id="play"/g)||[]).length,1);assert.equal((html.match(/id="next"/g)||[]).length,1);
for(const name of ['embedding','layers','distribution','output']){
 const figure=html.match(new RegExp('<figure class="worked-example" id="worked-'+name+'">([\\s\\S]*?)</figure>'))?.[1];assert.ok(figure,name);assert.ok(figure.includes('Fixed worked example'));assert.ok(!figure.includes(' hidden'));
 if(name==='output')assert.match(figure,/<img[^>]+alt="[^"]+"/);
 if(name==='embedding'||name==='layers')assert.match(figure,/class="explanation/);
 assert.ok(!page.includes('worked-'+name));
}
for(const id of ['embedding-value','prediction-context','distribution','chosen','output','stop-note']){
 assert.ok(html.includes('id="'+id+'"'));assert.ok(!page.includes("$('"+id+"')"));
 assert.ok(!css.includes('.flow-ready #'+id));
}
assert.ok(html.includes('·cat / 8415 → [-0.9, -0.2, 0.5, -0.7, 0.0, 0.7]'));assert.ok(html.includes('The cat sat on the mat'));
assert.ok(!html.includes('src="worked-layers.svg"'));assert.ok(html.includes('worked-output-narrow.svg'));assert.ok(!html.includes('<canvas'));
console.log('PASS: section 00 owns the flow; one control set; all four fixed worked examples, values and captions remain visible without JS/canvas and are never mutated by the stepper');
