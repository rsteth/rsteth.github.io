(() => {
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const CELL = 3;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const fallbackColors = { "--paper": [246, 243, 235], "--room": [27, 25, 23] };
    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = colorCanvas.height = 1;
    let colorContext;
    try { colorContext = colorCanvas.getContext("2d", { willReadFrequently: true }); } catch (_) {}

    // Let the browser parse CSS colors (including rgb()/short hex), never NaN -> black.
    function color(name) {
        const value = css(name);
        try {
            if (!value || !colorContext) return fallbackColors[name];
            // Invalid fillStyle assignments retain the previous value. Two sentinels
            // distinguish invalid input from a valid color equal to either sentinel.
            colorContext.fillStyle = "#010203";
            colorContext.fillStyle = value;
            const first = colorContext.fillStyle;
            colorContext.fillStyle = "#040506";
            colorContext.fillStyle = value;
            if (first !== colorContext.fillStyle) return fallbackColors[name];
            colorContext.clearRect(0, 0, 1, 1);
            colorContext.fillRect(0, 0, 1, 1);
            const rgba = colorContext.getImageData(0, 0, 1, 1).data;
            // The band is opaque; transparent/missing tokens must not become black.
            return rgba[3] === 255 ? Array.from(rgba.slice(0, 3)) : fallbackColors[name];
        } catch (_) { return fallbackColors[name]; }
    }

    /* paper <-> room, in sixteen ordered steps */
    function drawBand(canvas) {
        try {
            const [a, b] = canvas.dataset.band === "in"
                ? [color("--paper"), color("--room")]
                : [color("--room"), color("--paper")];
            const w = Math.ceil(canvas.parentElement.clientWidth / CELL / 4) * 4;
            const h = Math.round(canvas.parentElement.clientHeight / CELL);
            const g = canvas.getContext("2d");
            if (!w || !h || !g || g.isContextLost?.()) {
                canvas.style.visibility = "hidden";
                return;
            }
            const img = g.createImageData(w, h);
            for (let y = 0; y < h; y++) {
                const t = (y + 0.5) / h;
                const level = Math.floor((t * t * (3 - 2 * t)) * 17);
                for (let x = 0; x < w; x++) {
                    const c = BAYER[(y & 3) * 4 + (x & 3)] < level ? b : a;
                    const i = (y * w + x) * 4;
                    img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
                }
            }
            canvas.width = w; canvas.height = h;
            canvas.style.width = w * CELL + "px";
            g.putImageData(img, 0, 0);
            canvas.style.visibility = "visible";
        } catch (_) {
            // Leave the existing CSS gradient visible if canvas painting fails.
            canvas.style.visibility = "hidden";
        }
    }
    const bands = [...document.querySelectorAll("canvas[data-band]")];
    const drawBands = () => bands.forEach(drawBand);
    let redrawPending = false;
    function scheduleBands() {
        if (redrawPending) return;
        redrawPending = true;
        requestAnimationFrame(() => { redrawPending = false; drawBands(); });
    }
    addEventListener("pageshow", scheduleBands); // Includes back/forward cache restoration.
    addEventListener("load", scheduleBands);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") scheduleBands();
    });
    for (const canvas of bands) {
        canvas.addEventListener("contextlost", () => { canvas.style.visibility = "hidden"; });
        canvas.addEventListener("contextrestored", scheduleBands);
    }
    if ("ResizeObserver" in window) {
        const observer = new ResizeObserver(scheduleBands);
        for (const canvas of bands) observer.observe(canvas.parentElement);
    }

    addEventListener("resize", scheduleBands);
    drawBands();

    /* works arrive through the dither rather than a fade */
    const dpr = Math.min(2, devicePixelRatio || 1);
    const masks = [];
    for (let level = 0; level <= 16; level++) {
        const c = document.createElement("canvas");
        const s = CELL * dpr;
        c.width = c.height = 4 * s;
        let g;
        try { g = c.getContext("2d"); } catch (_) {}
        if (!g) { masks.length = 0; break; }
        for (let i = 0; i < 16; i++) if (BAYER[i] < level) g.fillRect((i % 4) * s, (i >> 2) * s, s, s);
        try { masks.push("url(" + c.toDataURL() + ")"); }
        catch (_) { masks.length = 0; break; }
    }
    function setMask(el, level) {
        const v = level >= 16 ? "" : masks[level];
        el.style.webkitMaskImage = v; el.style.maskImage = v;
        el.style.webkitMaskSize = el.style.maskSize = v ? 4 * CELL + "px" : "";
    }
    if (!reduced && masks.length === 17 && "IntersectionObserver" in window) {
        const frames = [...document.querySelectorAll(".frame > img, .frame > svg, .frame > .feather > img")];
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (!e.isIntersecting) continue;
                io.unobserve(e.target);
                let level = 0;
                const tick = () => { setMask(e.target, ++level); if (level < 16) setTimeout(tick, 34); };
                setTimeout(tick, 60);
            }
        }, { threshold: 0.25 });
        for (const el of frames) {
            if (el.getBoundingClientRect().top > innerHeight * 0.9) { setMask(el, 0); io.observe(el); }
        }
    }

    /* 07 / 13 */
    const counter = document.querySelector(".counter");
    const count = counter.querySelector("[data-count]");
    const works = [...document.querySelectorAll(".work")];
    function track() {
        const mid = innerHeight * 0.55;
        let current = null;
        for (const w of works) if (w.getBoundingClientRect().top < mid) current = w;
        const atEnd = innerHeight + scrollY > document.documentElement.scrollHeight - 140;
        counter.classList.toggle("is-on", !!current && !atEnd);
        if (current) count.textContent = current.dataset.no;
    }
    addEventListener("scroll", track, { passive: true });
    track();

    /* the film plays unless asked not to */
    const video = document.querySelector(".film video");
    const toggle = document.querySelector(".film__toggle");
    toggle.hidden = false;
    const sync = () => { toggle.textContent = video.paused ? "play" : "pause"; };
    toggle.addEventListener("click", () => { video.paused ? video.play().catch(() => {}) : video.pause(); });
    video.addEventListener("play", sync); video.addEventListener("pause", sync);
    if (!reduced) video.play().catch(() => {});
    sync();
})();
