const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../market-river-cover.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const base = 'https://market-river-generator-089089716476-dev.s3.us-east-1.amazonaws.com';
const record = (date, slot, weather, extra = {}) => ({
    date, slot, weather, image_url: `${base}/images/${date}-${slot}-${weather}.webp`, ...extra
});

function run(manifest, options = {}) {
    let replacement;
    let decode;
    const requests = [];
    const cover = {
        attributes: [
            { name: 'src', value: 'static.webp' }, { name: 'alt', value: 'Static scene' },
            { name: 'width', value: '1008' }, { name: 'height', value: '1008' },
            { name: 'loading', value: 'lazy' }, { name: 'decoding', value: 'async' },
            { name: 'data-market-river-cover', value: '' }
        ],
        replaceWith: (image) => { replacement = image; }
    };
    const done = vm.runInNewContext(source, {
        URL,
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
            setAttribute(name, val) { this.attributes.set(name, val); }
            decode() {
                return new Promise((resolve, reject) => { decode = options.brokenImage ? reject : resolve; });
            }
        }
    });
    return { done, requests, completeDecode: () => decode?.(), get image() { return replacement; } };
}

async function main() {
    assert.match(html, /<script src="market-river-cover\.js\?v=[^"]+" defer><\/script>/);
    assert.match(html, /<img data-market-river-cover src="images\/market-river\/[^"]+\.webp" alt="[^"]+"/);

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
    assert.equal(pending.image.attributes.get('loading'), 'lazy');

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
