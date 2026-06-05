document.addEventListener('DOMContentLoaded', function() {
    const manifestUrl = 'https://market-river-generator-089089716476-dev.s3.us-east-1.amazonaws.com/manifests/latest.json';
    const slotOrder = ['open', 'midday', 'close'];
    const slotLabels = {
        open: 'Open',
        midday: 'Midday',
        close: 'Close'
    };

    const size = 64;
    const floor = 48;
    const radius = 11;
    const fps = 12;

    let canvas, ctx, link;
    let frame = 0;

    function createFavicon() {
        canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        ctx = canvas.getContext('2d');

        link = document.querySelector('link[rel~="icon"]') || document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.sizes = `${size}x${size}`;

        if (!link.parentNode) {
            document.head.appendChild(link);
        }

        draw();
        setInterval(draw, 1000 / fps);
    }

    function draw() {
        const bounce = Math.abs(Math.sin(frame * 0.28));
        const x = 32 + Math.sin(frame * 0.1) * 13;
        const y = floor - radius - bounce * 24;
        const isLanding = bounce < 0.14;
        const squishX = isLanding ? 1.18 : 1;
        const squishY = isLanding ? 0.82 : 1;

        ctx.clearRect(0, 0, size, size);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.beginPath();
        ctx.ellipse(x, floor + 5, radius * (1.3 - bounce * 0.55), 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(squishX, squishY);

        ctx.fillStyle = '#e91b1b';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff7777';
        ctx.beginPath();
        ctx.arc(-4, -4, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(-3, -1, 1.4, 0, Math.PI * 2);
        ctx.arc(4, -1, 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(1, 2, 4, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();

        ctx.restore();

        link.href = canvas.toDataURL('image/png');
        frame += 1;
    }

    createFavicon();

    loadMarketRiver();

    async function loadMarketRiver() {
        const homeRail = document.querySelector('[data-market-river-home]');
        const galleryRail = document.querySelector('[data-market-river-gallery]');
        const status = document.querySelector('[data-market-river-status]');

        if (!homeRail && !galleryRail) {
            return;
        }

        setMarketRiverStatus(status, homeRail ? 'loading latest market river image...' : 'loading market river...');
        renderLoading(homeRail || galleryRail);

        try {
            const response = await fetch(manifestUrl, { cache: 'no-store' });

            if (!response.ok) {
                throw new Error(`Manifest request failed with status ${response.status}`);
            }

            const manifest = await response.json();
            const items = normalizeItems(manifest.items);

            if (homeRail) {
                renderHomeRail(homeRail, items);
            }

            if (galleryRail) {
                renderGalleryRail(galleryRail, items);
            }

            bindImageFallbacks(homeRail || galleryRail);
            setMarketRiverStatus(status, formatManifestStatus(manifest.updated_at, items.length));

            if (galleryRail) {
                galleryRail.scrollLeft = galleryRail.scrollWidth;
            }
        } catch (error) {
            renderFetchError(homeRail || galleryRail);
            setMarketRiverStatus(status, 'market river is unavailable right now. please check back soon.');
            console.error('Unable to load Market River manifest:', error);
        }
    }

    function normalizeItems(items) {
        if (!Array.isArray(items)) {
            return [];
        }

        return items
            .filter((item) => item && item.image_url)
            .sort(compareItemsOldestFirst);
    }

    function compareItemsOldestFirst(a, b) {
        const dateDiff = getItemTime(a) - getItemTime(b);

        if (dateDiff !== 0) {
            return dateDiff;
        }

        return getSlotRank(a.slot) - getSlotRank(b.slot);
    }

    function getItemTime(item) {
        const time = Date.parse(item.date || '');
        return Number.isNaN(time) ? 0 : time;
    }

    function getSlotRank(slot) {
        const rank = slotOrder.indexOf(slot);
        return rank === -1 ? slotOrder.length : rank;
    }

    function renderHomeRail(rail, items) {
        if (!items.length) {
            rail.innerHTML = renderEmptyState('No market river images yet.');
            return;
        }

        const latestIndex = items.length - 1;

        rail.innerHTML = items
            .map((item, index) => index === latestIndex ? renderMarketCard(item, {
                linkImage: 'market-river/',
                isCurrent: true
            }) : renderPeekImage(item))
            .join('');
    }

    function renderGalleryRail(rail, items) {
        if (!items.length) {
            rail.innerHTML = renderEmptyState('No market river images yet.');
            return;
        }

        rail.innerHTML = items
            .map((item) => renderMarketCard(item, { showMetadataLink: true }))
            .join('');
    }

    function renderMarketCard(item, options) {
        const settings = options || {};
        const label = getSlotLabel(item.slot);
        const date = formatDate(item.date);
        const caption = item.caption || 'No caption available.';
        const image = renderImage(item, label, date, settings.linkImage);
        const metadataLink = settings.showMetadataLink ? renderMetadataLink(item.metadata_url) : '';
        const currentClass = settings.isCurrent ? ' market-river__card--current' : '';

        return `
            <article class="market-river__card${currentClass}" data-metadata-url="${escapeAttribute(item.metadata_url || '')}">
                ${image}
                <div class="market-river__card-body">
                    <div class="market-river__eyebrow">
                        <span>${escapeHtml(label)}</span>
                        <time datetime="${escapeAttribute(item.date || '')}">${escapeHtml(date)}</time>
                    </div>
                    <p class="market-river__caption">${escapeHtml(caption)}</p>
                    <dl class="market-river__moods">
                        <div>
                            <dt>market</dt>
                            <dd>${escapeHtml(formatMood(item.market_mood))}</dd>
                        </div>
                        <div>
                            <dt>volatility</dt>
                            <dd>${escapeHtml(formatMood(item.volatility_mood))}</dd>
                        </div>
                    </dl>
                    ${metadataLink}
                </div>
            </article>
        `;
    }

    function renderPeekImage(item) {
        const label = getSlotLabel(item.slot);
        const date = formatDate(item.date);

        return `
            <article class="market-river__peek" data-metadata-url="${escapeAttribute(item.metadata_url || '')}" aria-label="${escapeAttribute(`${label} market river image for ${date}`)}">
                ${renderImage(item, label, date)}
            </article>
        `;
    }

    function renderMetadataLink(metadataUrl) {
        if (!metadataUrl) {
            return '';
        }

        return `
            <p class="market-river__metadata">
                <a href="${escapeAttribute(metadataUrl)}" target="_blank" rel="noopener">metadata</a>
            </p>
        `;
    }

    function renderImage(item, label, date, linkHref) {
        const imageMarkup = `
            <img src="${escapeAttribute(item.image_url || '')}" alt="${escapeAttribute(`${label} market river image for ${date}`)}" loading="lazy">
            <div class="market-river__image-error" hidden>image unavailable</div>
        `;

        if (!linkHref) {
            return `<div class="market-river__image-wrap">${imageMarkup}</div>`;
        }

        return `
            <a class="market-river__image-link" href="${escapeAttribute(linkHref)}" data-metadata-url="${escapeAttribute(item.metadata_url || '')}" aria-label="Open the Market River archive">
                <div class="market-river__image-wrap">${imageMarkup}</div>
            </a>
        `;
    }

    function renderLoading(target) {
        if (!target) {
            return;
        }

        target.innerHTML = `
            <article class="market-river__card market-river__card--loading">
                <div class="market-river__placeholder">loading</div>
            </article>
        `;
    }

    function renderEmptyState(message) {
        return `
            <article class="market-river__card market-river__card--empty">
                <div class="market-river__placeholder">market river</div>
                <h3>${escapeHtml(message)}</h3>
            </article>
        `;
    }

    function renderFetchError(target) {
        if (!target) {
            return;
        }

        target.innerHTML = renderEmptyState('Market river is unavailable right now.');
    }

    function bindImageFallbacks(target) {
        if (!target) {
            return;
        }

        target.querySelectorAll('.market-river__image-wrap img').forEach((image) => {
            image.addEventListener('error', function() {
                const wrapper = image.closest('.market-river__image-wrap');
                const fallback = wrapper && wrapper.querySelector('.market-river__image-error');

                image.hidden = true;

                if (fallback) {
                    fallback.hidden = false;
                }
            }, { once: true });

            if (!image.getAttribute('src')) {
                image.dispatchEvent(new Event('error'));
            }
        });
    }

    function setMarketRiverStatus(element, message) {
        if (element) {
            element.textContent = message;
        }
    }

    function formatManifestStatus(updatedAt, itemCount) {
        const countLabel = itemCount === 1 ? '1 image' : `${itemCount} images`;
        const updatedDate = new Date(updatedAt);

        if (Number.isNaN(updatedDate.getTime())) {
            return `${countLabel} available`;
        }

        return `${countLabel} available - last updated ${updatedDate.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        })}`;
    }

    function formatDate(value) {
        const date = parseManifestDate(value);

        if (Number.isNaN(date.getTime())) {
            return value || 'undated';
        }

        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    function parseManifestDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');

        if (match) {
            return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        }

        return new Date(value);
    }

    function formatMood(value) {
        return value ? value.replace(/_/g, ' ') : 'unknown';
    }

    function getSlotLabel(slot) {
        return slotLabels[slot] || formatMood(slot || 'image');
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/`/g, '&#96;');
    }
});
