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
    const timers = new Map();
    let clock = 0, sequence = 0;
    const advance = (end, runTimers = true) => {
        while (runTimers && timers.size) {
            const [id, next] = [...timers.entries()].sort((a, b) => a[1].time - b[1].time)[0];
            if (next.time > end) break;
            timers.delete(id);
            clock = Math.max(clock, next.time);
            next.fn();
        }
        clock = end;
    };
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
        performance: { now: () => clock },
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
            setTimeout: (fn, delay) => {
                const id = ++sequence;
                timers.set(id, { fn, time: clock + delay });
                return id;
            },
            clearTimeout: (id) => timers.delete(id),
            IntersectionObserver: class {
                constructor(callback) { onIntersection = callback; }
                observe(el) { observed.push(el); }
                unobserve() {}
            }
        });
        vm.runInNewContext(homepage, context);
    }
    const done = options.noCoverScript ? Promise.resolve() : vm.runInNewContext(source, context);
    return { done, requests, wrapper, ordinary, observed, advance,
        enter: (time = clock) => onIntersection(observed.map(target => ({ target, time, isIntersecting: true }))), completeDecode: () => decode?.(), finishFade: () => releaseFade?.(), get fading() { return fading; }, get removed() { return removed; }, get image() { return replacement; } };
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

    // Both entry points use the real dither and cover scheduling code.
    const flush = () => new Promise(setImmediate);
    const makePair = async (options = {}) => {
        const pair = run({ items: [newest] }, { withReveal: true, ...options });
        await flush();
        return pair;
    };

    for (const opts of [{}, { networkError: true }, { noCoverScript: true }]) {
        const ready = await makePair(opts);
        ready.completeDecode();
        await ready.done;
        const zero = ready.wrapper.style.maskImage;
        ready.enter();
        ready.advance(59);
        assert.equal(ready.wrapper.style.maskImage, zero);
        ready.advance(60);
        assert.notEqual(ready.wrapper.style.maskImage, zero, 'normal reveal starts immediately when ready, failed or script blocked');
        assert.equal(ready.ordinary.style.maskImage, ready.wrapper.style.maskImage);
        assert.equal(ready.image?.src, opts.networkError || opts.noCoverScript ? undefined : newest.image_url);
        ready.advance(650);
        assert.equal(ready.wrapper.style.maskImage, '');
    }

    const held = await makePair({ brokenImage: true });
    held.enter();
    const heldZero = held.wrapper.style.maskImage;
    held.advance(124);
    assert.notEqual(held.ordinary.style.maskImage, heldZero, 'other artwork does not wait');
    assert.equal(held.wrapper.style.maskImage, heldZero);
    held.completeDecode(); // failure at 124ms releases the gate
    await held.done;
    await flush();
    held.advance(184);
    assert.notEqual(held.wrapper.style.maskImage, heldZero, 'decode failure does not wait out the deadline');
    assert.equal(held.image, undefined);

    const at499 = await makePair({ visible: true });
    at499.enter();
    const at499Zero = at499.wrapper.style.maskImage;
    at499.advance(499);
    at499.completeDecode();
    await at499.done;
    assert.equal(at499.image.src, newest.image_url, 'fresh source at 499ms is selected before reveal');
    assert.equal(at499.image.attributes.has('style'), false);
    assert.equal(at499.fading, false, 'nothing has been revealed, so no old-cover fade');
    at499.advance(558);
    assert.equal(at499.wrapper.style.maskImage, at499Zero);
    at499.advance(559);
    assert.notEqual(at499.wrapper.style.maskImage, at499Zero, 'deadline timer was canceled');
    at499.advance(1070);
    assert.equal(at499.wrapper.style.maskImage, '');

    for (const [arrival, stallTimer] of [[500, true], [501, false], [601, false]]) {
        const late = await makePair({ visible: true });
        late.enter();
        const zero = late.wrapper.style.maskImage;
        late.advance(arrival, !stallTimer);
        if (arrival > 560) assert.notEqual(late.wrapper.style.maskImage, zero, 'fallback already revealing');
        late.completeDecode();
        await flush();
        assert.equal(late.image, undefined, 'fallback is pinned even when decode wins a delayed timer task');
        assert.equal(late.fading, false);
        late.advance(Math.max(559, arrival));
        if (arrival <= 559) assert.equal(late.wrapper.style.maskImage, zero);
        late.advance(1069);
        assert.notEqual(late.wrapper.style.maskImage, '');
        assert.equal(late.image, undefined, 'no source change before the final tick');
        late.advance(1070);
        await flush();
        assert.equal(late.wrapper.style.maskImage, '');
        assert.equal(late.image.src, newest.image_url);
        assert.equal(late.fading, true, 'fade starts only after the complete fallback reveal');
        late.finishFade();
        await late.done;
        assert.equal(late.removed, true);
    }

    const aged = await makePair();
    aged.advance(510);
    aged.enter(0); // callback delivered after an already-expired intersection deadline
    const agedZero = aged.wrapper.style.maskImage;
    aged.advance(570);
    assert.notEqual(aged.wrapper.style.maskImage, agedZero);
    aged.completeDecode();
    aged.advance(1080);
    await aged.done;

    const reduced = await makePair({ visible: true, reducedMotion: true });
    assert.equal(reduced.observed.length, 0);
    reduced.completeDecode();
    await reduced.done;
    assert.equal(reduced.image.src, newest.image_url);
    assert.equal(reduced.fading, false);

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
