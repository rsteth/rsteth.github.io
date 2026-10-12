const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the shared browser code with deterministic manifests and no location access.
function createHarness(view, manifest, ok = true) {
    let onReady;
    const requests = [];
    const rail = { innerHTML: '', querySelectorAll: () => [] };
    const status = { textContent: '' };
    const context = {
        document: {
            addEventListener: (_, callback) => { onReady = callback; },
            querySelector: (selector) => selector === `[data-market-river-${view}]` ? rail
                : selector === '[data-market-river-status]' ? status : null
        },
        navigator: {},
        console: { error: () => {} },
        fetch: async (url) => {
            requests.push(url);
            return { ok, status: ok ? 200 : 403, json: async () => manifest };
        }
    };
    const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8')
        .replace('    createFavicon();', '')
        .replace('    loadMarketRiver();', `
            globalThis.api = { loadMarketRiver, normalizeItems, selectDisplaySnapshots,
                selectItemFromSnapshotGroup, renderMarketCard };
        `);
    vm.runInNewContext(source, context);
    onReady();
    return { ...context.api, rail, status, requests };
}

function record(date, slot, weather, extra = {}) {
    return { date, slot, weather, image_url: `${date}-${slot}-${weather}.png`,
        market_mood: 'risk_on', volatility_mood: 'calm', ...extra };
}

async function main() {
    const api = createHarness('gallery', {});
    const variants = [
        record('2026-10-12', 'close', 'rainy', { created_at: '2026-10-12T23:03:00Z', run_id: 'rain-run' }),
        record('2026-10-12', 'close', 'cloudy', { created_at: '2026-10-12T23:02:00Z', run_id: 'cloud-run' }),
        record('2026-10-12', 'close', 'sunny', { created_at: '2026-10-12T23:01:00Z', run_id: 'sun-run' })
    ];
    const collapsed = api.selectDisplaySnapshots(variants, 'sunny', 9);
    assert.equal(collapsed.length, 1, 'timestamps and run IDs must not split one snapshot');
    assert.equal(collapsed[0].weather, 'sunny');
    assert.equal(api.selectItemFromSnapshotGroup(variants, 'rainy').weather, 'rainy');
    assert.equal(api.selectItemFromSnapshotGroup(variants.slice(0, 2), 'sunny').weather, 'cloudy');
    assert.equal(api.selectItemFromSnapshotGroup(variants.slice(0, 1), 'sunny').weather, 'rainy');
    const unknown = [record('2026-10-12', 'open', 'windy'), record('2026-10-12', 'open', 'other')];
    assert.equal(api.selectItemFromSnapshotGroup(unknown, 'sunny'), unknown[0]);
    assert.equal(api.selectItemFromSnapshotGroup([unknown[0], variants[1]], 'sunny'), variants[1]);

    const records = [];
    for (let day = 12; day >= 8; day--) {
        for (const slot of ['close', 'midday', 'open']) {
            for (const weather of ['rainy', 'cloudy', 'sunny']) {
                records.push(record(`2026-10-${String(day).padStart(2, '0')}`, slot, weather));
            }
        }
    }
    const newest = api.selectDisplaySnapshots(api.normalizeItems(records.slice().reverse()), 'sunny', 9).reverse();
    assert.equal(newest.length, 9, 'limit snapshots, not weather records');
    assert.deepEqual(Array.from(newest, (item) => `${item.date}/${item.slot}`), [
        '2026-10-12/close', '2026-10-12/midday', '2026-10-12/open',
        '2026-10-11/close', '2026-10-11/midday', '2026-10-11/open',
        '2026-10-10/close', '2026-10-10/midday', '2026-10-10/open'
    ]);
    const produced = api.selectDisplaySnapshots([
        record('2026-10-12', 'close', 'sunny', { created_at: '2026-10-12T20:00:00Z' }),
        record('2026-10-12', 'open', 'sunny', { created_at: '2026-10-12T21:00:00Z' })
    ], 'sunny', 9);
    assert.equal(produced[1].slot, 'open', 'created_at takes precedence when available');

    for (const view of ['home', 'gallery']) {
        const harness = createHarness(view, { items: records });
        await harness.loadMarketRiver();
        assert.equal(harness.requests.length, 1);
        assert.ok(harness.requests[0].endsWith(`/manifests/${view === 'home' ? 'latest' : 'recent'}.json`));
        assert.equal((harness.rail.innerHTML.match(/<article /g) || []).length, 9);
        assert.ok(harness.rail.innerHTML.includes('risk on'));
        assert.ok(harness.rail.innerHTML.includes('calm'));
        if (view === 'gallery') {
            assert.ok(/<article class="market-river__card market-river__card--current"[^>]*>[\s\S]*?2026-10-12-close-sunny.png/.test(harness.rail.innerHTML));
            assert.ok(harness.rail.innerHTML.indexOf('2026-10-12-close-sunny.png')
                < harness.rail.innerHTML.indexOf('2026-10-12-open-sunny.png'));
            assert.ok(harness.rail.innerHTML.includes('datetime="2026-10-12"'));
        }
    }
    const card = api.renderMarketCard({ ...variants[0], caption: '<river>', metadata_url: 'audit.json' }, { showMetadataLink: true });
    assert.ok(card.includes('&lt;river&gt;'));
    assert.ok(card.includes('href="audit.json"'));
    assert.ok(!api.renderMarketCard(variants[0], { showMetadataLink: true }).includes('market-river__metadata'));
    assert.ok(!api.renderMarketCard(variants[0]).includes('market-river__caption'));
    for (const manifest of [{ items: [] }, records, { items: null }]) {
        const harness = createHarness('gallery', manifest);
        await harness.loadMarketRiver();
        assert.ok(harness.rail.innerHTML.includes(Array.isArray(manifest) ? '.png' : 'No market river images yet.'));
    }
    const failed = createHarness('gallery', {}, false);
    await failed.loadMarketRiver();
    assert.ok(failed.status.textContent.includes('unavailable'));
    console.log('Market River grouping, selection, ordering, feed routing, rendering, and error checks passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
