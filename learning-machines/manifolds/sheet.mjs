// Presentation only, and a schematic: the sheet is a drawn example, not computed from the robot or the pinned fixtures.
// The sheet is a two-dimensional surface in three coordinates, [u, v, height(u, v)]. The map is the same (u, v) drawn flat beneath it.
import {formatSliderValue} from './format.mjs';

export const VIEWS = Object.freeze({quarter: [-.62, .4], edge: [0, 0], above: [0, Math.PI / 2]});
export const START = Object.freeze([-.78, -.62]);
export const TARGET = Object.freeze([.72, .5]);
export const MAP_Z = -1.05;
const CELLS = 14, PIECES = 48, TAU = Math.PI * 2;
const INK = '#302e28', MUTED = '#6b695f', ROUTE = 'rgb(177,108,79)';
const SHADE = [146, 151, 128], LIGHT = [232, 229, 211], SUN = [-.42, -.5, .76];

// One broad rise with a shallow trough beside it: enough relief that a straight line on the map has to climb.
export const height = (u, v) =>
  .52 * Math.exp(-((u - .12) ** 2 + (v + .05) ** 2) / .34)
  - .2 * Math.exp(-((u + .62) ** 2 + (v - .5) ** 2) / .3)
  + .07 * Math.sin(2.1 * u + .5) * Math.cos(1.7 * v)
  + .2;
export const lift = ([u, v]) => [u, v, height(u, v)];
const flat = ([u, v]) => [u, v, MAP_Z];
const at = k => -1 + 2 * k / CELLS;
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const NODES = Array.from({length: (CELLS + 1) ** 2}, (_, n) => lift([at(n % (CELLS + 1)), at(Math.floor(n / (CELLS + 1)))]));
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

// The straight map line from START to the target, and the same line lifted onto the sheet.
export function route(target) {
  const map = Array.from({length: PIECES + 1}, (_, k) => START.map((s, i) => s + (target[i] - s) * k / PIECES));
  const sheet = map.map(lift);
  let sheetLength = 0;
  for (let k = 1; k < sheet.length; k++) sheetLength += distance(sheet[k - 1], sheet[k]);
  return {map, sheet, mapLength: distance(START, target), sheetLength};
}

// Orthographic camera, as in threads.mjs: yaw about the vertical axis, then elevation. Third value = nearness.
export function projector(W, H, view) {
  const cy = Math.cos(view.yaw), sy = Math.sin(view.yaw), ce = Math.cos(view.el), se = Math.sin(view.el);
  const raw = ([x, y, z]) => {
    const xr = x * cy - y * sy, yr = x * sy + y * cy, zc = z - (MAP_Z + .7) / 2;
    return [xr, -(yr * se + zc * ce), -yr * ce + zc * se];
  };
  const key = [...NODES, ...CORNERS.map(flat)].map(raw), xs = key.map(p => p[0]), ys = key.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = Math.min(view.scale, (W - 60) / Math.max(1e-9, maxX - minX), (H - 100) / Math.max(1e-9, maxY - minY));
  const ox = W / 2 - s * (minX + maxX) / 2, oy = 42 + (H - 100) / 2 - s * (minY + maxY) / 2;
  return p => { const r = raw(p); return [ox + s * r[0], oy + s * r[1], r[2]]; };
}

function tone(u, v) {
  const e = .02, du = (height(u + e, v) - height(u - e, v)) / (2 * e), dv = (height(u, v + e) - height(u, v - e)) / (2 * e);
  const n = Math.hypot(du, dv, 1), sun = Math.hypot(...SUN);
  const lit = Math.max(0, (-du * SUN[0] - dv * SUN[1] + SUN[2]) / (n * sun));
  return 'rgb(' + SHADE.map((dark, i) => Math.round(dark + (LIGHT[i] - dark) * lit ** 1.6)).join(',') + ')';
}

export function paintSheet(c, W, H, view, target, style = {}) {
  const {font = 'monospace'} = style, P = projector(W, H, view), path = route(target);
  const line = points => { c.beginPath(); points.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p[0], p[1])); };
  const seg = (a, b) => { line([a, b]); c.stroke(); };
  const dot = (p, r) => { c.beginPath(); c.arc(p[0], p[1], r, 0, TAU); };
  c.clearRect(0, 0, W, H); c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash([]);

  // The map: a flat grid, with the route as a straight dashed line.
  c.strokeStyle = INK; c.lineWidth = 1; c.globalAlpha = .1;
  for (let k = 0; k <= 8; k++) {
    const t = -1 + k / 4;
    seg(P(flat([t, -1])), P(flat([t, 1]))); seg(P(flat([-1, t])), P(flat([1, t])));
  }
  c.globalAlpha = .45; line(CORNERS.map(p => P(flat(p)))); c.closePath(); c.stroke();
  const mapStart = P(flat(START)), mapEnd = P(flat(target)), sheetStart = P(lift(START)), sheetEnd = P(lift(target));
  c.globalAlpha = .9; c.lineWidth = 1.5; c.setLineDash([5, 4]); seg(mapStart, mapEnd); c.setLineDash([]);
  c.fillStyle = INK; dot(mapStart, 2.5); c.fill();
  c.lineWidth = 1.2; seg([mapEnd[0] - 5, mapEnd[1]], [mapEnd[0] + 5, mapEnd[1]]); seg([mapEnd[0], mapEnd[1] - 5], [mapEnd[0], mapEnd[1] + 5]);
  // Each end of the route is joined to its place on the map. Drawn before the sheet, so the sheet hides what passes behind it.
  c.globalAlpha = .6; c.lineWidth = 1; c.setLineDash([2, 4]); seg(mapStart, sheetStart); seg(mapEnd, sheetEnd); c.setLineDash([]);

  // The sheet: lit facets drawn far to near, each followed by the pieces of the route that lie on it.
  const pieces = new Map();
  for (let k = 1; k < path.sheet.length; k++) {
    const [u, v] = path.map[k - 1].map((a, i) => (a + path.map[k][i]) / 2);
    const cell = Math.min(CELLS - 1, Math.floor((u + 1) / 2 * CELLS)) + CELLS * Math.min(CELLS - 1, Math.floor((v + 1) / 2 * CELLS));
    if (!pieces.has(cell)) pieces.set(cell, []);
    pieces.get(cell).push([P(path.sheet[k - 1]), P(path.sheet[k])]);
  }
  const node = (i, j) => P(NODES[i + j * (CELLS + 1)]);
  const facets = [];
  for (let j = 0; j < CELLS; j++) for (let i = 0; i < CELLS; i++) {
    const corners = [node(i, j), node(i + 1, j), node(i + 1, j + 1), node(i, j + 1)];
    facets.push({corners, cell: i + j * CELLS, near: corners.reduce((sum, p) => sum + p[2], 0) / 4, fill: tone(at(i + .5), at(j + .5))});
  }
  facets.sort((a, b) => a.near - b.near);
  // A piece waits until the facets touching its own are drawn, so a neighbour cannot clip the width of the line.
  const turn = new Map(facets.map((facet, order) => [facet.cell, order])), due = new Map();
  for (const [cell, list] of pieces) {
    const i = cell % CELLS, j = Math.floor(cell / CELLS);
    let last = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (i + di >= 0 && i + di < CELLS && j + dj >= 0 && j + dj < CELLS) last = Math.max(last, turn.get(i + di + (j + dj) * CELLS));
    }
    due.set(last, [...(due.get(last) ?? []), ...list]);
  }
  facets.forEach((facet, order) => {
    c.globalAlpha = 1; c.fillStyle = facet.fill; line(facet.corners); c.closePath(); c.fill();
    c.globalAlpha = .16; c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    if (due.has(order)) {
      c.globalAlpha = 1; c.strokeStyle = ROUTE; c.lineWidth = 2.8;
      for (const [a, b] of due.get(order)) seg(a, b);
    }
  });
  c.globalAlpha = .55; c.strokeStyle = INK; c.lineWidth = 1;
  for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0]]) {
    const edge = Array.from({length: CELLS + 1}, (_, k) => P(lift(CORNERS[a].map((s, i) => s + (CORNERS[b][i] - s) * k / CELLS))));
    line(edge); c.stroke();
  }
  // Route ends on the sheet: a dot where it starts, a ring on the current point.
  c.globalAlpha = 1; c.fillStyle = ROUTE; dot(sheetStart, 3.2); c.fill();
  c.strokeStyle = INK; c.lineWidth = 1.5; dot(sheetEnd, 8); c.stroke();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) seg([sheetEnd[0] + 8 * dx, sheetEnd[1] + 8 * dy], [sheetEnd[0] + 12 * dx, sheetEnd[1] + 12 * dy]);

  // Labels: a caption for each surface in the corner nearest it, and the two map coordinates named along their edges.
  c.font = '12px ' + font; c.textBaseline = 'middle'; c.textAlign = 'left';
  const caption = (name, rest, y) => {
    c.fillStyle = INK; c.fillText(name, 12, y);
    c.fillStyle = MUTED; c.fillText(rest, 12 + c.measureText(name + ' ').width, y);
  };
  caption('the sheet', '· curved, three coordinates', 14);
  caption('the map', '· flat, two coordinates', H - 12);
  c.fillStyle = MUTED; c.textAlign = 'center';
  const along = (text, a, b, offset) => {
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 120) return;
    let angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const dir = Math.cos(angle) < 0 ? -1 : 1;
    if (dir < 0) angle += Math.PI;
    const half = c.measureText(text).width / 2, from = dir * (half - 6), tip = dir * (half + 16);
    c.save(); c.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); c.rotate(angle); c.fillText(text, -dir * 14, offset);
    c.strokeStyle = MUTED; c.lineWidth = 1; c.beginPath();
    c.moveTo(from, offset); c.lineTo(tip, offset); c.moveTo(tip - dir * 5, offset - 3.5); c.lineTo(tip, offset); c.lineTo(tip - dir * 5, offset + 3.5);
    c.stroke(); c.restore();
  };
  along('map coordinate 1', P(flat([-1, -1])), P(flat([1, -1])), 16);
  along('map coordinate 2', P(flat([-1, -1])), P(flat([-1, 1])), -12);
}

export function describe(target) {
  const {mapLength, sheetLength} = route(target), [u, v, h] = lift(target).map(n => n.toFixed(2));
  return `Map: (${u}, ${v}). Sheet: (${u}, ${v}, ${h}); on the sheet the first two numbers decide the third.\n`
    + `Route: a straight line on the map, ${mapLength.toFixed(2)} long. On the sheet the same route is ${sheetLength.toFixed(2)} long.`;
}

// Live figure: replaces the static drawing with a canvas, view buttons and two sliders. Drag or arrow keys turn the view.
export function sheetFigure(root) {
  const make = (tag, name, html = '') => { const el = document.createElement(tag); el.className = name; el.innerHTML = html; return el; };
  const fallback = root.querySelector('.sheet-static'), legend = root.querySelector('.map-legend');
  const stage = make('div', 'thread-stage', '<canvas class="thread-figure sheet-canvas" tabindex="0" role="img" aria-label="A curved sheet drawn above its flat map. A straight dashed line on the map appears on the sheet as a curved route. Arrow keys turn the view; the sliders move the end of the route."></canvas>');
  const views = make('div', 'toolbar thread-views', '<span>View</span><button type="button" data-view="quarter">Three-quarter</button><button type="button" data-view="edge">Edge-on</button><button type="button" data-view="above">From above</button>');
  const controls = make('div', 'controls'), readout = make('p', 'thread-readout');
  const reset = make('button', '', 'Reset panel'); reset.type = 'button';
  const canvas = stage.querySelector('canvas'), c = canvas.getContext('2d');
  const view = {yaw: VIEWS.quarter[0], el: VIEWS.quarter[1], scale: 230}, target = [...TARGET];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 640, H = 480, frame = 0, drag = null;
  const clampEl = v => Math.max(0, Math.min(Math.PI / 2, v));

  function paint() {
    const ratio = devicePixelRatio || 1;
    W = canvas.clientWidth || 640; H = Math.round(Math.max(300, Math.min(500, W * .82))); canvas.style.height = H + 'px';
    if (canvas.width !== Math.round(W * ratio) || canvas.height !== Math.round(H * ratio)) { canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio); }
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    paintSheet(c, W, H, view, target, {font: getComputedStyle(canvas).fontFamily || 'monospace'});
    readout.textContent = describe(target);
  }
  function turnTo(name) {
    const from = [view.yaw, view.el], to = VIEWS[name]; cancelAnimationFrame(frame);
    if (still) { view.yaw = to[0]; view.el = to[1]; paint(); return; }
    const start = performance.now();
    const step = now => {
      const t = Math.min(1, (now - start) / 600), e = t * t * (3 - 2 * t);
      view.yaw = from[0] + (to[0] - from[0]) * e; view.el = from[1] + (to[1] - from[1]) * e; paint();
      if (t < 1) frame = requestAnimationFrame(step);
    };
    step(start);
  }
  const sliders = [0, 1].map(i => {
    const id = 'sheet-' + i, wrap = make('div', 'control', `<label for="${id}">Map coordinate ${i + 1}<output for="${id}"></output></label><input id="${id}" type="range" min="-1" max="1" step="0.01" value="${target[i]}">`);
    const input = wrap.querySelector('input'), out = wrap.querySelector('output'), show = () => { out.textContent = formatSliderValue(+input.value, .01); };
    input.addEventListener('input', () => { target[i] = +input.value; show(); paint(); });
    controls.append(wrap); show();
    return {set(value) { input.value = value; show(); }};
  });
  views.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => turnTo(b.dataset.view)));
  reset.addEventListener('click', () => {
    cancelAnimationFrame(frame); [view.yaw, view.el] = VIEWS.quarter;
    TARGET.forEach((value, i) => { target[i] = value; sliders[i].set(value); }); paint();
  });
  canvas.addEventListener('pointerdown', event => { cancelAnimationFrame(frame); drag = {x: event.clientX, y: event.clientY, yaw: view.yaw, el: view.el}; canvas.setPointerCapture?.(event.pointerId); });
  canvas.addEventListener('pointermove', event => {
    if (!drag) return;
    view.yaw = drag.yaw - (event.clientX - drag.x) * .008; view.el = clampEl(drag.el + (event.clientY - drag.y) * .008); paint();
  });
  for (const type of ['pointerup', 'pointercancel']) canvas.addEventListener(type, () => { drag = null; });
  canvas.addEventListener('keydown', event => {
    const turn = {ArrowLeft: [.1, 0], ArrowRight: [-.1, 0], ArrowUp: [0, .1], ArrowDown: [0, -.1]}[event.key];
    if (!turn) return;
    event.preventDefault(); cancelAnimationFrame(frame); view.yaw += turn[0]; view.el = clampEl(view.el + turn[1]); paint();
  });
  root.querySelector('.exhibit-head').append(reset);
  legend.before(stage, views, controls, readout); fallback.hidden = true;
  if (typeof ResizeObserver === 'function') new ResizeObserver(paint).observe(canvas); else addEventListener('resize', paint);
  paint();
}
