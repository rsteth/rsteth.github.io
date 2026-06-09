document.addEventListener('DOMContentLoaded', function() {
    const manifestUrl = 'https://market-river-generator-089089716476-dev.s3.us-east-1.amazonaws.com/manifests/latest.json';
    const slotOrder = ['open', 'midday', 'close'];
    const slotLabels = {
        open: 'Open',
        midday: 'Midday',
        close: 'Close'
    };
    const defaultWeather = 'sunny';
    const maxMarketRiverSnapshots = 9;
    const carouselWheelThreshold = 8;
    const carouselWheelLockMs = 320;

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
            const localWeather = await determineLocalWeather();
            const displayItems = selectDisplayImages(items, localWeather, maxMarketRiverSnapshots);
            const currentItem = displayItems[displayItems.length - 1] || null;

            if (homeRail) {
                renderHomeRail(homeRail, displayItems, currentItem, manifest.updated_at);
            }

            if (galleryRail) {
                renderGalleryRail(galleryRail, displayItems, manifest.updated_at);
            }

            bindImageFallbacks(homeRail || galleryRail);
            setMarketRiverStatus(status, formatGalleryStatus(displayItems, manifest.updated_at));
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
        const time = Date.parse(item.created_at || item.updated_at || item.date || '');
        return Number.isNaN(time) ? 0 : time;
    }

    function getSlotRank(slot) {
        const rank = slotOrder.indexOf(slot);
        return rank === -1 ? slotOrder.length : rank;
    }

    function selectDisplayImages(items, localWeather, maxItems) {
        const groups = new Map();

        items.forEach((item) => {
            const key = getSnapshotKey(item);
            const group = groups.get(key) || [];

            group.push(item);
            groups.set(key, group);
        });

        return Array.from(groups.values())
            .sort(compareSnapshotGroupsOldestFirst)
            .flatMap((group) => group.slice().sort((a, b) => compareItemsForSnapshotGroup(a, b, localWeather)))
            .slice(-maxItems);
    }

    function compareSnapshotGroupsOldestFirst(a, b) {
        return compareItemsOldestFirst(getNewestItem(a), getNewestItem(b));
    }

    function compareItemsForSnapshotGroup(a, b, localWeather) {
        const weatherDiff = getWeatherRank(a, localWeather) - getWeatherRank(b, localWeather);

        if (weatherDiff !== 0) {
            return weatherDiff;
        }

        return compareItemsOldestFirst(a, b);
    }

    function getWeatherRank(item, localWeather) {
        const weather = normalizeWeather(item.weather);

        if (weather === localWeather) {
            return 2;
        }

        if (weather === defaultWeather) {
            return 1;
        }

        return 0;
    }

    function getSnapshotKey(item) {
        const baseRunId = String(item.run_id || item.id || '').replace(/-(sunny|cloudy|rainy)$/i, '');
        const producedAt = item.created_at || item.updated_at || item.date || '';

        return `${producedAt}|${item.date || ''}|${item.slot || ''}|${baseRunId}`;
    }

    function getNewestItem(items) {
        return items.slice().sort(compareItemsOldestFirst).pop() || null;
    }

    async function determineLocalWeather() {
        const position = await getBrowserPosition();

        if (!position) {
            return defaultWeather;
        }

        try {
            const params = new URLSearchParams({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                current: 'weather_code',
                timezone: 'auto'
            });
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

            if (!response.ok) {
                return defaultWeather;
            }

            const weather = await response.json();
            return normalizeWeather(weather.current && weather.current.weather_code);
        } catch (error) {
            console.error('Unable to determine local weather:', error);
            return defaultWeather;
        }
    }

    function getBrowserPosition() {
        if (!navigator.geolocation) {
            return Promise.resolve(null);
        }

        return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 7000);

            navigator.geolocation.getCurrentPosition((position) => {
                clearTimeout(timeout);
                resolve(position);
            }, () => {
                clearTimeout(timeout);
                resolve(null);
            }, {
                enableHighAccuracy: false,
                maximumAge: 30 * 60 * 1000,
                timeout: 6000
            });
        });
    }

    function normalizeWeather(value) {
        if (value === null || value === undefined || value === '') {
            return defaultWeather;
        }

        if (typeof value === 'number' || /^\d+$/.test(String(value))) {
            return normalizeWeatherCode(Number(value));
        }

        const weather = String(value).toLowerCase().replace(/[_-]/g, ' ');

        if (/(rain|drizzle|thunder|storm|shower|sleet|snow|wet)/.test(weather)) {
            return 'rainy';
        }

        if (/(cloud|overcast|partly|fog|mist|haze)/.test(weather)) {
            return 'cloudy';
        }

        if (/(clear|sun|fair)/.test(weather)) {
            return 'sunny';
        }

        return defaultWeather;
    }

    function normalizeWeatherCode(code) {
        if ([0, 1].includes(code)) {
            return 'sunny';
        }

        if ([2, 3, 45, 48].includes(code)) {
            return 'cloudy';
        }

        if (code >= 51 && code <= 99) {
            return 'rainy';
        }

        return defaultWeather;
    }

    function renderHomeRail(rail, items, currentItem, fallbackProducedAtDateTime) {
        if (!items.length) {
            rail.innerHTML = renderEmptyState('No market river images yet.');
            return;
        }

        rail.innerHTML = items
            .map((item) => renderMarketCard(item, {
                linkImage: 'market-river/',
                isCurrent: item === currentItem,
                fallbackProducedAtDateTime: fallbackProducedAtDateTime
            }))
            .join('');

        bindMarketRiverCarousel(rail.parentElement, rail);
    }

    function renderGalleryRail(rail, items, fallbackProducedAtDateTime) {
        if (!items.length) {
            rail.innerHTML = renderEmptyState('No market river images yet.');
            return;
        }

        rail.innerHTML = items
            .map((item) => renderMarketCard(item, {
                showMetadataLink: true,
                isCurrent: item === items[items.length - 1],
                fallbackProducedAtDateTime: fallbackProducedAtDateTime
            }))
            .join('');

        bindMarketRiverCarousel(rail, rail);
    }

    function bindMarketRiverCarousel(scroller, rail) {
        if (!scroller || !rail) {
            return;
        }

        const cards = Array.from(rail.querySelectorAll('.market-river__card'));

        if (!cards.length) {
            return;
        }

        let frameRequest = null;
        let wheelLocked = false;
        let suppressScrollFocus = false;
        const latestCard = cards[cards.length - 1];

        setFocusedMarketRiverCard(cards, latestCard);

        requestAnimationFrame(() => {
            centerMarketRiverCard(scroller, latestCard);
        });

        scroller.addEventListener('scroll', () => {
            if (suppressScrollFocus) {
                return;
            }

            if (frameRequest) {
                return;
            }

            frameRequest = requestAnimationFrame(() => {
                frameRequest = null;
                setFocusedMarketRiverCard(cards, getCenteredMarketRiverCard(scroller, cards));
            });
        }, { passive: true });

        scroller.addEventListener('wheel', (event) => {
            const horizontalDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY) || event.shiftKey
                ? event.deltaX || event.deltaY
                : 0;

            if (Math.abs(horizontalDelta) < carouselWheelThreshold) {
                return;
            }

            event.preventDefault();

            if (wheelLocked) {
                return;
            }

            const currentCard = getCenteredMarketRiverCard(scroller, cards);
            const currentIndex = cards.indexOf(currentCard);
            const nextIndex = Math.max(0, Math.min(cards.length - 1, currentIndex + Math.sign(horizontalDelta)));
            const nextCard = cards[nextIndex];

            wheelLocked = true;
            suppressScrollFocus = true;
            setFocusedMarketRiverCard(cards, nextCard);

            requestAnimationFrame(() => {
                centerMarketRiverCard(scroller, nextCard, true);
            });

            window.setTimeout(() => {
                wheelLocked = false;
                suppressScrollFocus = false;
                setFocusedMarketRiverCard(cards, getCenteredMarketRiverCard(scroller, cards));
            }, carouselWheelLockMs);
        }, { passive: false });
    }

    function getCenteredMarketRiverCard(scroller, cards) {
        const scrollerRect = scroller.getBoundingClientRect();
        const scrollerCenter = scrollerRect.left + scrollerRect.width / 2;

        return cards.reduce((closestCard, card) => {
            const cardRect = card.getBoundingClientRect();
            const cardCenter = cardRect.left + cardRect.width / 2;
            const closestRect = closestCard.getBoundingClientRect();
            const closestCenter = closestRect.left + closestRect.width / 2;

            return Math.abs(cardCenter - scrollerCenter) < Math.abs(closestCenter - scrollerCenter)
                ? card
                : closestCard;
        }, cards[0]);
    }

    function centerMarketRiverCard(scroller, card, smooth) {
        const scrollerRect = scroller.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const cardCenterOffset = cardRect.left + cardRect.width / 2 - (scrollerRect.left + scrollerRect.width / 2);

        scroller.scrollTo({
            left: scroller.scrollLeft + cardCenterOffset,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }

    function setFocusedMarketRiverCard(cards, focusedCard) {
        cards.forEach((card) => {
            const isFocused = card === focusedCard;

            card.classList.toggle('market-river__card--current', isFocused);
            card.setAttribute('aria-current', isFocused ? 'true' : 'false');
        });
    }

    function renderMarketCard(item, options) {
        const settings = options || {};
        const label = getSlotLabel(item.slot);
        const dateTime = item.created_at || settings.fallbackProducedAtDateTime || item.date || '';
        const date = formatProducedAt(dateTime) || formatDate(item.date);
        const caption = item.caption || 'No caption available.';
        const image = renderImage(item, label, date, settings.linkImage);
        const metadataLink = settings.showMetadataLink ? renderMetadataLink(item.metadata_url) : '';
        const currentClass = settings.isCurrent ? ' market-river__card--current' : '';

        return `
            <article class="market-river__card${currentClass}" data-metadata-url="${escapeAttribute(item.metadata_url || '')}" data-weather="${escapeAttribute(normalizeWeather(item.weather))}" data-run-id="${escapeAttribute(item.run_id || '')}">
                ${image}
                <div class="market-river__card-body">
                    <div class="market-river__eyebrow">
                        <span>${escapeHtml(label)}</span>
                        <time datetime="${escapeAttribute(dateTime)}">${escapeHtml(date)}</time>
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
        const date = formatProducedAt(item.created_at) || formatDate(item.date);

        return `
            <article class="market-river__peek" data-metadata-url="${escapeAttribute(item.metadata_url || '')}" data-weather="${escapeAttribute(normalizeWeather(item.weather))}" data-run-id="${escapeAttribute(item.run_id || '')}" aria-label="${escapeAttribute(`${label} market river image for ${date}`)}">
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

    function formatGalleryStatus(items, fallbackProducedAtDateTime) {
        const latestItem = getNewestItem(items);
        const producedAt = latestItem ? formatProducedAt(latestItem.created_at || fallbackProducedAtDateTime) : '';
        return producedAt ? `latest produced ${producedAt}` : formatManifestStatus(fallbackProducedAtDateTime, items.length);
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

    function formatProducedAt(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return `${date.toLocaleString('en-US', {
            timeZone: 'America/Los_Angeles',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        })} Pacific`;
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
