import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createState,step,decode,matricesFor} from '../learning-machines/tokens/mechanics.mjs';
import {context2d,paintTokens,paintEmbedding,paintLayers} from '../learning-machines/tokens/visuals.mjs';
const base=new URL('../learning-machines/tokens/',import.meta.url),read=f=>readFileSync(new URL(f,base),'utf8');
const pin=JSON.parse(read('mechanics-pin.json'));
assert.match(pin.commit,/^[a-f0-9]{40}$/);assert.equal(pin.repository,'https://github.com/rsteth/learning-machines');
for(const f of pin.files)assert.equal(createHash('sha256').update(read(f.file)).digest('hex'),f.sha256);
assert.equal(createHash('sha256').update(read(pin.licenseFile)).digest('hex'),pin.licenseSha256);
const html=read('index.html'),page=read('page.mjs'),css=read('tokens.css');
for(const s of [
'Each token ID selects a learned embedding: a vector of numbers, set during training, that the model can work with.',
"The model also keeps track of where each piece sits, so the same piece in a different spot isn't treated as the same.",
'Layers transform the representations using the earlier context — the text so far — and learned weights.',
"The model takes the last piece's updated numbers and scores every token in its vocabulary against them. Those scores become probabilities for the next token.",
'A sampler can draw from the distribution; always taking the highest-scoring token is called greedy decoding.',
'The chosen token is added to the context. The model runs again and predicts another piece.'
])assert.ok(html.includes(s),s);
for(const old of ['final input position','The next pass predicts','Position information helps distinguish','PIN_COMMIT'])assert.ok(!html.includes(old));
for(const text of ['cl100k_base','tiktoken 0.14.0','ID 389','ID 5634','45%','25%','15%','unhappiness','not a model run','Text. Token IDs. Representations. Next-token probabilities. Text again.','00 / tokens'])assert.ok(html.includes(text),text);
assert.ok(html.includes('/tree/'+pin.commit+'/experiments/tokens'));assert.ok(html.includes('/commit/'+pin.commit));
assert.equal((html.match(/<figure class="worked-example" id="worked-/g)||[]).length,4);
assert.ok(!html.includes('<canvas'));
for(const f of ['worked-output.svg','worked-output-narrow.svg'])assert.ok(read(f).includes('<svg'));
for(const id of ['choose','next-cycle','reset','mode','seed'])assert.match(html,new RegExp('disabled id="'+id+'"'));
assert.match(html,/role="status" aria-live="polite"/);assert.match(page,/prefers-reduced-motion:reduce/);assert.ok(!/setInterval|setTimeout/.test(page),'No autoplay: every step is reader-initiated');assert.match(css,/@media\(max-width:540px\)/);
assert.equal(context2d({getContext(){throw Error('blocked')}}),null);
let state=createState();for(let i=0;i<20&&!state.stopped;i++)state=step(state);assert.equal(state.text,'The cat sat on the mat.');assert.equal(state.stopReason,'demo-limit');assert.equal(decode([389]),' on');
for(const narrow of [false,true]){const ctx={canvas:{},fillStyle:'',strokeStyle:'',beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},fillRect(){},strokeRect(){}};const m=matricesFor(state);paintTokens(ctx,state.ids,1,narrow,state.generated);assert.equal(ctx.canvas.width,narrow?246:466);paintEmbedding(ctx,m.input,1,narrow);paintLayers(ctx,m.input,m.contextual,narrow);assert.equal(ctx.canvas.height,narrow?450:220);}
const index=readFileSync(new URL('../learning-machines/index.html',import.meta.url),'utf8');assert.ok(index.indexOf('01 / tokens')<index.indexOf('02 / attention and memory'));
assert.ok(readFileSync(new URL('../learning-machines/attention-and-memory/index.html',import.meta.url),'utf8').includes('02 / attention and memory'));
console.log('PASS: token provenance, exact approved copy, bounded fixture, visuals, static fallback, accessible controls and series order');
