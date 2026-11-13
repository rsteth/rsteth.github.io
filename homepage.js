(() => {
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const CELL = 3;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

    /* paper <-> room, in sixteen ordered steps */
    function drawBand(canvas) {
        const [from, to] = canvas.dataset.band === "in" ? [css("--paper"), css("--room")] : [css("--room"), css("--paper")];
        const a = rgb(from), b = rgb(to);
        const w = Math.ceil(canvas.parentElement.clientWidth / CELL / 4) * 4;
        const h = Math.round(canvas.parentElement.clientHeight / CELL);
        canvas.width = w; canvas.height = h;
        canvas.style.width = w * CELL + "px";
        const g = canvas.getContext("2d");
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
        g.putImageData(img, 0, 0);
    }
    const bands = [...document.querySelectorAll("canvas[data-band]")];
    const drawBands = () => bands.forEach(drawBand);

    /* the label measures the work */
    const dimsPlain = document.querySelector("[data-dims-plain]");
    const scrolled = document.querySelector("[data-scrolled]");
    function measure() {
        const size = innerWidth + " × " + innerHeight;
        dimsPlain.textContent = size;
    }
    let far = 0;
    function onScroll() {
        far = Math.max(far, scrollY);
        scrolled.textContent = Math.round(far).toLocaleString("en") + " pixels";
    }
    addEventListener("resize", () => { measure(); drawBands(); });
    addEventListener("scroll", onScroll, { passive: true });
    measure(); drawBands(); onScroll();

    /* works arrive through the dither rather than a fade */
    const dpr = Math.min(2, devicePixelRatio || 1);
    const masks = [];
    for (let level = 0; level <= 16; level++) {
        const c = document.createElement("canvas");
        const s = CELL * dpr;
        c.width = c.height = 4 * s;
        const g = c.getContext("2d");
        for (let i = 0; i < 16; i++) if (BAYER[i] < level) g.fillRect((i % 4) * s, (i >> 2) * s, s, s);
        masks.push("url(" + c.toDataURL() + ")");
    }
    function setMask(el, level) {
        const v = level >= 16 ? "" : masks[level];
        el.style.webkitMaskImage = v; el.style.maskImage = v;
        el.style.webkitMaskSize = el.style.maskSize = v ? 4 * CELL + "px" : "";
    }
    if (!reduced && "IntersectionObserver" in window) {
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
