import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {ARROWS,arrowSVG} from '../learning-machines/arrows.mjs';
// Arrow glyphs render as colour emoji on some phones, so pages draw them as SVG instead.
const root=new URL('../',import.meta.url).pathname,skip=new Set(['.git','verbosele','node_modules','scripts']);
const glyph=/[←-⇿➔-➿⬅-⬇]/;
const files=[];(function walk(d){for(const f of readdirSync(d)){if(skip.has(f))continue;const p=join(d,f);statSync(p).isDirectory()?walk(p):/\.(html|css|mjs|js)$/.test(f)&&f!=='arrows.mjs'&&files.push(p);}})(root);
for(const p of files){
 let s=readFileSync(p,'utf8');if(/\.m?js$/.test(p))s=s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 const m=s.match(glyph);assert.equal(m,null,`${p.slice(root.length)} still contains ${m?.[0]}`);
}
for(const dir of Object.keys(ARROWS)){const svg=arrowSVG(dir);assert.match(svg,/aria-hidden="true"/);assert.match(svg,new RegExp('class="arrow arrow-'+dir+'"'));}
assert.match(arrowSVG('e',{label:'to'}),/role="img" aria-label="to"/);
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');for(const dir of Object.keys(ARROWS))assert.match(css,new RegExp('\\.arrow-'+dir+'\\b'),'size rule for '+dir);
// Every browser module must at least parse (tests import some, but page scripts only run in a browser).
import {execFileSync} from 'node:child_process';
for(const p of files.filter(f=>f.endsWith('.mjs')))execFileSync(process.execPath,['--check',p]);
console.log('PASS: every page module parses; no arrow glyphs in rendered pages, scripts or styles; every SVG arrow has a size rule and is hidden or labelled');
