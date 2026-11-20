// Run with: node scripts/test-homepage-dither.cjs (no dependencies).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../homepage.js'), 'utf8');
function harness({tokens = {}, nullContext = false, throwPaint = false, zeroSize = false} = {}) {
    const listeners = {}, documentListeners = {}, frames = [];
    const colors = {'--paper':'#f6f3eb', '--room':'#1b1917', ...tokens};
    function canvas(band) {
        const events = {};
        let fill = '#000000';
        const context = {
            set fillStyle(value) {
                if (/^#[0-9a-f]{6}$/i.test(value)) fill = value;
                else if (/^#[0-9a-f]{3}$/i.test(value)) fill = '#' + [...value.slice(1)].map(x=>x+x).join('');
                else if (value === 'rgb(246, 243, 235)') fill = '#f6f3eb';
                else if (value === 'transparent') fill = value;
            },
            get fillStyle() { return fill; },
            clearRect() {}, fillRect() {},
            getImageData() { return {data: new Uint8ClampedArray(fill === 'transparent' ? [0,0,0,0] : [...[1,3,5].map(i=>parseInt(fill.slice(i,i+2),16)),255])}; },
            createImageData(w,h) { return {data: new Uint8ClampedArray(w*h*4)}; },
            putImageData(img) { if (throwPaint) throw Error('paint failed'); this.last = img; this.paints = (this.paints || 0) + 1; },
            isContextLost() { return !!this.lost; }
        };
        return {dataset:{band}, style:{}, parentElement:{clientWidth:zeroSize ? 0 : 120, clientHeight:288},
            events, context, getContext:()=>nullContext ? null : context, toDataURL:()=>'', addEventListener:(name,fn)=>events[name]=fn};
    }
    const bands = [canvas('in'),canvas('out')];
    const text = {}, counter = {querySelector:()=>text,classList:{toggle(){}}};
    const video = {paused:true,addEventListener(){},play:()=>Promise.resolve()};
    const toggle = {addEventListener(){}};
    const document = {documentElement:{scrollHeight:1000},visibilityState:'visible',createElement:()=>canvas(),
        addEventListener:(n,f)=>documentListeners[n]=f,
        querySelectorAll:s=>s === 'canvas[data-band]' ? bands : [],
        querySelector:s=>s === '.counter' ? counter : s === '.film video' ? video : s === '.film__toggle' ? toggle : null};
    const sandbox = {document,window:{},matchMedia:()=>({matches:true}),getComputedStyle:()=>({getPropertyValue:n=>colors[n] || ''}),
        innerWidth:120,innerHeight:800,scrollY:0,devicePixelRatio:1,
        addEventListener:(n,f)=>listeners[n]=f,requestAnimationFrame:f=>frames.push(f),setTimeout:()=>{},Uint8ClampedArray};
    vm.runInNewContext(source,sandbox);
    return {bands,listeners,documentListeners,document,colors,flush(){while(frames.length)frames.shift()();},pending:()=>frames.length,setFailure(v){throwPaint=v;},setNull(v){nullContext=v;}};
}
const baseline = harness();
assert.equal(baseline.bands[0].context.last.data[0],246);
assert.equal(baseline.bands[1].context.last.data[0],27);
for (const token of ['', 'nonsense', '#gggggg', 'transparent', 'rgb(246, 243, 235)']) {
    const h = harness({tokens:{'--paper':token}});
    assert.deepEqual(h.bands[0].context.last.data, baseline.bands[0].context.last.data, token);
}
const short = harness({tokens:{'--paper':'#fff'}});
assert.equal(short.bands[0].context.last.data[0],255);
// Recovery events repaint and burst events are coalesced.
for (const event of ['pageshow','load','resize']) {
    const h = harness(); const before = h.bands[0].context.paints;
    h.listeners[event]({persisted:true}); h.listeners[event]({persisted:true});
    assert.equal(h.pending(),1); h.flush(); assert.equal(h.bands[0].context.paints,before+1);
}
const visibility = harness(); visibility.document.visibilityState='hidden';
visibility.documentListeners.visibilitychange(); assert.equal(visibility.pending(),0);
visibility.document.visibilityState='visible'; visibility.documentListeners.visibilitychange(); visibility.flush();
assert.equal(visibility.bands[0].context.paints,2);
const restore = harness(); restore.bands[0].events.contextlost();
assert.equal(restore.bands[0].style.visibility,'hidden');
restore.bands[0].events.contextrestored(); restore.flush(); assert.equal(restore.bands[0].style.visibility,'visible');
for (const options of [{nullContext:true},{throwPaint:true},{zeroSize:true}]) {
    const h = harness(options); assert.equal(h.bands[0].style.visibility,'hidden');
    h.setNull(false); h.setFailure(false); h.bands.forEach(b=>b.parentElement.clientWidth=120);
    h.listeners.pageshow(); h.flush(); assert.equal(h.bands[0].style.visibility,'visible');
}
// Verify unchanged Bayer pixel algorithm against the original formula.
const data = baseline.bands[0].context.last.data, bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
for(let y=0;y<96;y++)for(let x=0;x<40;x++){
    const t=(y+.5)/96, level=Math.floor(t*t*(3-2*t)*17);
    const expected=bayer[(y&3)*4+(x&3)]<level ? [27,25,23,255] : [246,243,235,255];
    assert.deepEqual(Array.from(data.slice((y*40+x)*4,(y*40+x+1)*4)),expected);
}
console.log('PASS: dither pixels unchanged; invalid/missing/transparent colors; short hex/rgb normalization; pageshow/load/resize/visibility/context restoration; null contexts, paint errors and zero-size recovery.');
