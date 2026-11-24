const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../market-river-cover.js'), 'utf8');
const homepage = fs.readFileSync(path.join(__dirname, '../homepage.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const base = 'https://market-river-generator-089089716476-dev.s3.us-east-1.amazonaws.com';
const record = (date, slot, weather, extra = {}) => ({
    date, slot, weather, image_url: `${base}/images/${date}-${slot}-${weather}.webp`, ...extra
});

function run(manifest, options = {}) {
    let replacement;
    let decode;
    let fading = false, removed = false, releaseFade;
    const requests = [];
    const timers = [];
    const wrapper = {
        pending: false, style: {},
        getBoundingClientRect: () => ({ top: 1200 }),
        classList: { contains: (name) => name === 'market-river-reveal' },
        hasAttribute: (name) => name === 'data-reveal-pending' && (wrapper.pending || options.revealPending),
        setAttribute: () => { wrapper.pending = true; },
        removeAttribute: () => { wrapper.pending = false; }
    };
    const ordinary = { ...wrapper, style: {}, classList: { contains: () => false }, removeAttribute() {} };
    let onIntersection;
    const observed = [];
    const cover = {
        attributes: [
            { name: 'src', value: 'static.webp' }, { name: 'alt', value: 'Static scene' },
            { name: 'width', value: '1008' }, { name: 'height', value: '1008' },
            { name: 'loading', value: 'eager' }, { name: 'decoding', value: 'async' },
            { name: 'data-market-river-cover', value: '' }
        ],
        parentElement: wrapper,
        complete: !options.waitingFallback, naturalWidth: 1008,
        getBoundingClientRect: () => options.visible ? { top: 200, bottom: 500 } : { top: 1200, bottom: 1500 },
        removeAttribute: () => {},
        setAttribute: () => {},
        classList: { add: () => {} },
        animate: () => {
            fading = true;
            return { finished: new Promise((resolve) => { releaseFade = resolve; }) };
        },
        remove: () => { removed = true; },
        replaceWith: (image) => { replacement = image; }
    };
    const context = {
        URL,
        innerHeight: 900,
        matchMedia: () => ({ matches: options.reducedMotion }),
        document: { querySelector: (key) => key === '[data-market-river-cover]' && !options.noCover ? cover : null },
        navigator: { get geolocation() { assert.fail('The homepage must not access location'); } },
        fetch: async (url, init) => {
            requests.push(url);
            assert.equal(init.cache, 'no-store');
            assert.equal(init.credentials, 'omit');
            if (options.networkError) throw Error('offline');
            return {
                ok: !options.httpError,
                json: async () => {
                    if (options.invalidJson) throw SyntaxError('invalid JSON');
                    return manifest;
                }
            };
        },
        Image: class {
            constructor() {
                this.naturalWidth = options.noImage ? 0 : 1024;
                this.naturalHeight = this.naturalWidth;
                this.attributes = new Map();
            }
            after() {}
            setAttribute(name, val) { this.attributes.set(name, val); }
            decode() {
                return new Promise((resolve, reject) => { decode = options.brokenImage ? reject : resolve; });
            }
        }
    };
    if (options.withReveal) {
        const counter = { querySelector: () => ({}), classList: { toggle() {} } };
        const video = { paused: true, play: () => Promise.resolve(), addEventListener() {} };
        const toggle = { addEventListener() {} };
        let serial = 0;
        const initialQuery = context.document.querySelector;
        context.document.querySelector = (key) => initialQuery(key)
            || ({ '.counter': counter, '.film video': video, '.film__toggle': toggle })[key];
        Object.assign(context.document, {
            documentElement: { scrollHeight: 4000 },
            addEventListener() {},
            createElement: () => ({ getContext: () => ({ fillRect() {} }), toDataURL: () => `data:mask,${++serial}` }),
            querySelectorAll: (key) => key.startsWith('.frame')
                ? [key.includes('.market-river-reveal') ? wrapper : cover, ordinary] : []
        });
        Object.assign(context, {
            window: { IntersectionObserver: true }, scrollY: 0, devicePixelRatio: 1,
            addEventListener() {},
            setTimeout: (fn) => timers.push(fn),
            IntersectionObserver: class {
                constructor(callback) { onIntersection = callback; }
                observe(el) { observed.push(el); }
                unobserve() {}
            }
        });
        vm.runInNewContext(homepage, context);
    }
    const done = vm.runInNewContext(source, context);
    return { done, requests, wrapper, ordinary, observed, timers,
        enter: () => onIntersection(observed.map(target => ({ target, isIntersecting: true }))), completeDecode: () => decode?.(), finishFade: () => releaseFade?.(), get fading() { return fading; }, get removed() { return removed; }, get image() { return replacement; } };
}

async function main() {
    assert.match(html, /<script src="market-river-cover\.js\?v=[^"]+" defer><\/script>/);
    assert.match(html, /<span class="market-river-reveal"><img data-market-river-cover src="images\/market-river\/[^"]+\.webp" alt="[^"]+"/);

    const newest = record('2026-11-23', 'midday', 'sunny', {
        caption: 'a sunlit river winding through a city', created_at: '2026-11-23T18:15:00Z'
    });
    const old = record('2026-11-20', 'close', 'sunny', { created_at: '2026-11-24T00:00:00Z' });
    const cloudy = record('2026-11-23', 'midday', 'cloudy', { created_at: '2026-11-23T18:16:00Z' });
    const pending = run({ items: [
        old, cloudy, record('2026-11-23', 'open', 'sunny'), newest,
        record('2026-11-23', 'close', 'sunny', { image_url: 'https://other.example/images/not-published.webp' }),
        record('2026-11-31', 'close', 'sunny'), record('2026-11-25', 'overnight', 'sunny')
    ] });
    await new Promise(setImmediate);
    assert.equal(pending.image, undefined, 'keep original visible while the image decodes');
    pending.completeDecode();
    await pending.done;
    assert.deepEqual(pending.requests, [base + '/manifests/latest.json']);
    assert.equal(pending.image.src, newest.image_url);
    assert.equal(pending.image.alt, 'Market River, November 23, 2026 midday snapshot. a sunlit river winding through a city');
    assert.equal(pending.image.attributes.get('width'), '1008');
    assert.equal(pending.image.attributes.get('loading'), 'eager');
    assert.equal(pending.fading, false, 'a cover loaded before it is in view never fades the old one');

    for (const [extra, shouldFade] of [[{}, true], [{ reducedMotion: true }, false], [{ waitingFallback: true }, false], [{ revealPending: true }, false]]) {
        const visible = run({ items: [newest] }, { visible: true, ...extra });
        await new Promise(setImmediate);
        visible.completeDecode();
        await new Promise(setImmediate);
        assert.equal(visible.image.src, newest.image_url);
        assert.equal(visible.fading, shouldFade);
        visible.finishFade();
        await visible.done;
        assert.equal(visible.removed, shouldFade);
    }

    // Run both browser entry points. A replacement after observe() but before any
    // reveal ticks used to strand the new image under a mask on the detached node.
    for (const during of [false, true]) {
        const pair = run({ items: [newest] }, { withReveal: true });
        const first = pair.wrapper.style.maskImage;
        assert.ok(first && pair.observed[0] === pair.wrapper && pair.wrapper.pending);
        assert.equal(pair.ordinary.style.maskImage, first, 'other illustrations still use their own reveal');
        if (during) {
            pair.enter();
            pair.timers.shift()();
            assert.notEqual(pair.wrapper.style.maskImage, first);
        }
        await new Promise(setImmediate);
        pair.completeDecode();
        await pair.done;
        assert.equal(pair.image.src, newest.image_url);
        assert.equal(pair.image.attributes.has('style'), false);
        if (!during) pair.enter();
        while (pair.timers.length) pair.timers.shift()();
        assert.equal(pair.wrapper.style.maskImage, '');
        assert.equal(pair.wrapper.pending, false);
        assert.equal(pair.ordinary.style.maskImage, '');
    }

    const fallbackWeather = run([old, newest, record('2026-11-23', 'close', 'rainy')]);
    await new Promise(setImmediate);
    fallbackWeather.completeDecode();
    await fallbackWeather.done;
    assert.match(fallbackWeather.image.src, /close-rainy/);
    assert.match(fallbackWeather.image.alt, /close snapshot\. Generated river landscape in rainy weather\./);

    for (const options of [
        { networkError: true }, { httpError: true }, { invalidJson: true },
        { brokenImage: true }, { noImage: true }, { noCover: true }
    ]) {
        const result = run({ items: [newest] }, options);
        await new Promise(setImmediate);
        result.completeDecode();
        await result.done;
        assert.equal(result.image, undefined, JSON.stringify(options));
        if (options.noCover) assert.deepEqual(result.requests, []);
    }

    for (const items of [null, [], [record('2026-11-31', 'close', 'sunny')], [null, {}]]) {
        const result = run({ items });
        await result.done;
        assert.equal(result.image, undefined);
    }
    console.log('Market River homepage cover checks passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
