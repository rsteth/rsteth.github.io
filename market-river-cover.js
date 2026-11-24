(async function () {
    'use strict';

    const cover = document.querySelector('[data-market-river-cover]');
    if (!cover) return;

    const base = 'https://market-river-generator-089089716476-dev.s3.us-east-1.amazonaws.com';
    const slots = ['open', 'midday', 'close'];
    const weather = ['sunny', 'cloudy', 'rainy'];
    const dateFormat = new Intl.DateTimeFormat('en-US', {
        month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
    });

    function candidate(item) {
        if (!item || typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return null;
        const day = new Date(item.date + 'T00:00:00Z');
        if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== item.date) return null;
        const slot = slots.indexOf(item.slot);
        const variant = weather.indexOf(item.weather);
        if (slot < 0 || variant < 0 || typeof item.image_url !== 'string') return null;

        let url;
        try {
            url = new URL(item.image_url);
        } catch {
            return null;
        }
        if (url.origin !== base || url.username || url.password || !url.pathname.startsWith('/images/')) return null;
        return { item, url: url.href, day, slot, variant, produced: Date.parse(item.created_at) || 0 };
    }

    try {
        const response = await fetch(base + '/manifests/latest.json', {
            cache: 'no-store', credentials: 'omit'
        });
        if (!response.ok) return;

        const manifest = await response.json();
        const items = Array.isArray(manifest) ? manifest : manifest?.items;
        if (!Array.isArray(items)) return;

        const newest = items.map(candidate).filter(Boolean).sort((a, b) =>
            b.day - a.day || b.slot - a.slot || a.variant - b.variant || b.produced - a.produced
        )[0];
        if (!newest) return;

        const { item, url, day } = newest;
        const caption = typeof item.caption === 'string' ? item.caption.trim() : '';
        const alt = `Market River, ${dateFormat.format(day)} ${item.slot} snapshot. ${caption || `Generated river landscape in ${item.weather} weather.`}`;

        // Leave the static cover in place while loading and decoding the new image.
        const image = new Image();
        image.fetchPriority = 'low';
        image.src = url;
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight) return;
        for (const { name, value } of cover.attributes) {
            if (name !== 'src' && name !== 'alt') image.setAttribute(name, value);
        }
        image.alt = alt;

        // Keep the reveal on the wrapper, and only fade an already visible fallback.
        const rect = cover.getBoundingClientRect();
        const fade = cover.complete && cover.naturalWidth && rect.top < innerHeight && rect.bottom > 0
            && !cover.parentElement.hasAttribute('data-reveal-pending')
            && !matchMedia('(prefers-reduced-motion: reduce)').matches
            && typeof cover.animate === 'function';
        cover.replaceWith(image);
        if (fade) {
            cover.removeAttribute('data-market-river-cover');
            cover.setAttribute('aria-hidden', 'true');
            cover.classList.add('market-river-outgoing');
            image.after(cover);
            try {
                await cover.animate([{ opacity: 1 }, { opacity: 0 }], {
                    duration: 200, easing: 'ease-out', fill: 'forwards'
                }).finished;
            } finally {
                cover.remove();
            }
        }
    } catch {
        // A missing feed or image should never leave the homepage with a broken card.
    }
})();
