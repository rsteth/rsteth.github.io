// Presentation only, and a schematic: the sheets are drawn examples, not computed from the robot or the pinned fixtures.
// Each sheet is a two-dimensional surface in three coordinates, [u, v, base + height(u, v)]. The map is the same (u, v) drawn flat beneath both.
import {formatSliderValue} from './format.mjs';

export const START = Object.freeze([-.78, -.62]);
export const TARGET = Object.freeze([.72, .5]);
export const MAP_Z = -1.2;
// The camera's pitch is fixed; the figure only spins about its vertical axis.
export const PITCH = .34, START_YAW = -.62;
const CELLS = 14, PIECES = 48, TAU = Math.PI * 2, REACH = Math.SQRT2;
const INK = '#302e28', MUTED = '#6b695f', ROUTE = '#9c4635', SUN = [-.42, -.5, .76];

// Two different shapes over the same map. Lower: one broad rise with a shallow trough beside it. Upper: a rolling fold.
export const SHEETS = Object.freeze([
  {
    name: 'lower', base: 0, shade: [146, 151, 128], light: [232, 229, 211],
    height: (u, v) => .5 * Math.exp(-((u - .12) ** 2 + (v + .05) ** 2) / .34) - .2 * Math.exp(-((u + .62) ** 2 + (v - .5) ** 2) / .3)
      + .07 * Math.sin(2.1 * u + .5) * Math.cos(1.7 * v) + .2
  },
  {
    name: 'upper', base: 1.3, shade: [178, 156, 112], light: [240, 231, 203],
    height: (u, v) => .2 * Math.sin(2.7 * u + 1.1 * v + .4) + .13 * Math.cos(2.3 * v - .8 * u) + .33
  }
]);
const TOP = SHEETS.at(-1).base + .7, MID = (MAP_Z + TOP) / 2;
export const lift = ([u, v], sheet = 0) => [u, v, SHEETS[sheet].base + SHEETS[sheet].height(u, v)];
const flat = ([u, v]) => [u, v, MAP_Z];
const at = k => -1 + 2 * k / CELLS;
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const pathLength = points => points.slice(1).reduce((sum, p, k) => sum + distance(points[k], p), 0);

// The straight map line from START to the target, and the same line lifted onto each sheet.
export function route(target) {
  const map = Array.from({length: PIECES + 1}, (_, k) => START.map((s, i) => s + (target[i] - s) * k / PIECES));
  const sheets = SHEETS.map((_, sheet) => map.map(p => lift(p, sheet)));
  return {map, sheets, mapLength: distance(START, target), sheetLengths: sheets.map(pathLength)};
}

// Orthographic camera: yaw about the vertical axis at a fixed pitch. Third value = nearness.
// The scale comes from the cylinder the figure sweeps as it spins, so nothing changes size while it turns.
export function projector(W, H, yaw) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), ce = Math.cos(PITCH), se = Math.sin(PITCH);
  const tall = 2 * REACH * se + (TOP - MAP_Z) * ce;
  const s = Math.min((W - 24) / (2 * REACH), (H - 76) / tall), ox = W / 2, oy = 38 + (H - 76) / 2;
  return ([x, y, z]) => {
    const xr = x * cy - y * sy, yr = x * sy + y * cy, zc = z - MID;
    return [ox + s * xr, oy - s * (yr * se + zc * ce), -yr * ce + zc * se];
  };
}

function tone({height, shade, light}, u, v) {
  const e = .02, du = (height(u + e, v) - height(u - e, v)) / (2 * e), dv = (height(u, v + e) - height(u, v - e)) / (2 * e);
  const lit = Math.max(0, (-du * SUN[0] - dv * SUN[1] + SUN[2]) / (Math.hypot(du, dv, 1) * Math.hypot(...SUN)));
  return 'rgb(' + shade.map((dark, i) => Math.round(dark + (light[i] - dark) * lit ** 1.6)).join(',') + ')';
}

export function paintSheet(c, W, H, yaw, target, style = {}) {
  const {font = 'monospace'} = style, P = projector(W, H, yaw), path = route(target);
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
  let below = [P(flat(START)), P(flat(target))];
  c.globalAlpha = .9; c.lineWidth = 1.5; c.setLineDash([5, 4]); seg(...below); c.setLineDash([]);
  c.fillStyle = INK; dot(below[0], 2.5); c.fill();
  c.lineWidth = 1.2; seg([below[1][0] - 5, below[1][1]], [below[1][0] + 5, below[1][1]]); seg([below[1][0], below[1][1] - 5], [below[1][0], below[1][1] + 5]);

  // The sheets, lowest first: the camera looks down, so a higher sheet is always in front of a lower one where they overlap.
  SHEETS.forEach((sheet, index) => {
    const ends = [P(lift(START, index)), P(lift(target, index))];
    // Both ends of the route are joined to the layer below. Drawn before this sheet, so the sheet hides what passes behind it.
    c.globalAlpha = .6; c.strokeStyle = INK; c.lineWidth = 1; c.setLineDash([2, 4]);
    seg(below[0], ends[0]); seg(below[1], ends[1]); c.setLineDash([]);

    // Lit facets drawn far to near, with the pieces of the route that lie on them.
    const lifted = path.sheets[index].map(P), pieces = new Map();
    for (let k = 1; k < lifted.length; k++) {
      const [u, v] = path.map[k - 1].map((a, i) => (a + path.map[k][i]) / 2);
      const cell = Math.min(CELLS - 1, Math.floor((u + 1) / 2 * CELLS)) + CELLS * Math.min(CELLS - 1, Math.floor((v + 1) / 2 * CELLS));
      pieces.set(cell, [...(pieces.get(cell) ?? []), [lifted[k - 1], lifted[k]]]);
    }
    const nodes = Array.from({length: (CELLS + 1) ** 2}, (_, n) => P(lift([at(n % (CELLS + 1)), at(Math.floor(n / (CELLS + 1)))], index)));
    const node = (i, j) => nodes[i + j * (CELLS + 1)], facets = [];
    for (let j = 0; j < CELLS; j++) for (let i = 0; i < CELLS; i++) {
      const corners = [node(i, j), node(i + 1, j), node(i + 1, j + 1), node(i, j + 1)];
      facets.push({corners, cell: i + j * CELLS, near: corners.reduce((sum, p) => sum + p[2], 0) / 4, fill: tone(sheet, at(i + .5), at(j + .5))});
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
      line(Array.from({length: CELLS + 1}, (_, k) => P(lift(CORNERS[a].map((s, i) => s + (CORNERS[b][i] - s) * k / CELLS), index)))); c.stroke();
    }
    // Route ends on this sheet: a dot where it starts, a ring on the current point.
    c.globalAlpha = 1; c.fillStyle = ROUTE; dot(ends[0], 3.2); c.fill();
    c.strokeStyle = INK; c.lineWidth = 1.5; dot(ends[1], 8); c.stroke();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) seg([ends[1][0] + 8 * dx, ends[1][1] + 8 * dy], [ends[1][0] + 12 * dx, ends[1][1] + 12 * dy]);
    below = ends;
  });

  // Labels: a caption in the corner nearest each layer, and the two map coordinates named along the map's front edges.
  c.globalAlpha = 1; c.font = '12px ' + font; c.textBaseline = 'middle'; c.textAlign = 'left';
  const caption = (name, rest, y) => {
    c.fillStyle = INK; c.fillText(name, 12, y);
    c.fillStyle = MUTED; c.fillText(rest, 12 + c.measureText(name + ' ').width, y);
  };
  caption('two sheets', '· curved, three coordinates', 14);
  caption('one map', '· flat, two coordinates', H - 12);
  c.fillStyle = MUTED; c.textAlign = 'center';
  const along = (text, a, b) => {
    const [from, to] = [P(flat(a)), P(flat(b))];
    if (Math.hypot(to[0] - from[0], to[1] - from[1]) < 100) return;
    let angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
    const dir = Math.cos(angle) < 0 ? -1 : 1;
    if (dir < 0) angle += Math.PI;
    const half = c.measureText(text).width / 2, tail = dir * (half - 6), tip = dir * (half + 16);
    c.save(); c.translate((from[0] + to[0]) / 2, (from[1] + to[1]) / 2); c.rotate(angle); c.fillText(text, -dir * 14, 16);
    c.strokeStyle = MUTED; c.lineWidth = 1; c.beginPath();
    c.moveTo(tail, 16); c.lineTo(tip, 16); c.moveTo(tip - dir * 5, 12.5); c.lineTo(tip, 16); c.lineTo(tip - dir * 5, 19.5);
    c.stroke(); c.restore();
  };
  // Each coordinate is named on whichever of its two map edges currently faces the viewer.
  const middle = ([u0, v0, u1, v1]) => P(flat([(u0 + u1) / 2, (v0 + v1) / 2]));
  const nearer = (a, b) => middle(a)[2] > middle(b)[2] ? a : b;
  const first = nearer([-1, -1, 1, -1], [-1, 1, 1, 1]), second = nearer([-1, -1, -1, 1], [1, -1, 1, 1]);
  along('coordinate 1', first.slice(0, 2), first.slice(2));
  along('coordinate 2', second.slice(0, 2), second.slice(2));
}

export function describe(target) {
  const {mapLength, sheetLengths} = route(target), show = point => '(' + point.map(n => n.toFixed(2)).join(', ') + ')';
  return `Map: ${show(target)}. The same two numbers pick out one point on each sheet: ${show(lift(target, 0))} below, ${show(lift(target, 1))} above.\n`
    + `Route: a straight line on the map, ${mapLength.toFixed(2)} long. Lifted, it is ${sheetLengths[0].toFixed(2)} long on the lower sheet and ${sheetLengths[1].toFixed(2)} on the upper.`;
}

// Live figure: replaces the static drawing with a canvas and two sliders. Drag sideways or use the left and right arrow keys to spin it.
export function sheetFigure(root) {
  const make = (tag, name, html = '') => { const el = document.createElement(tag); el.className = name; el.innerHTML = html; return el; };
  const fallback = root.querySelector('.sheet-static'), legend = root.querySelector('.map-legend');
  const stage = make('div', 'thread-stage', '<canvas class="thread-figure sheet-canvas" tabindex="0" role="img" aria-label="Two curved sheets drawn one above the other, over a single flat map. A straight dashed line on the map appears on each sheet as a different curved route. Left and right arrow keys spin the view; the sliders move the end of the route."></canvas>');
  const controls = make('div', 'controls'), readout = make('p', 'thread-readout');
  const reset = make('button', '', 'Reset panel'); reset.type = 'button';
  const canvas = stage.querySelector('canvas'), c = canvas.getContext('2d'), target = [...TARGET];
  let yaw = START_YAW, W = 640, H = 640, drag = null;

  function paint() {
    const ratio = devicePixelRatio || 1;
    W = canvas.clientWidth || 640; H = Math.round(Math.max(380, Math.min(640, W * 1.3))); canvas.style.height = H + 'px';
    if (canvas.width !== Math.round(W * ratio) || canvas.height !== Math.round(H * ratio)) { canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio); }
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    paintSheet(c, W, H, yaw, target, {font: getComputedStyle(canvas).fontFamily || 'monospace'});
    readout.textContent = describe(target);
  }
  const sliders = [0, 1].map(i => {
    const id = 'sheet-' + i, wrap = make('div', 'control', `<label for="${id}">Map coordinate ${i + 1}<output for="${id}"></output></label><input id="${id}" type="range" min="-1" max="1" step="0.01" value="${target[i]}">`);
    const input = wrap.querySelector('input'), out = wrap.querySelector('output'), show = () => { out.textContent = formatSliderValue(+input.value, .01); };
    input.addEventListener('input', () => { target[i] = +input.value; show(); paint(); });
    controls.append(wrap); show();
    return {set(value) { input.value = value; show(); }};
  });
  reset.addEventListener('click', () => { yaw = START_YAW; TARGET.forEach((value, i) => { target[i] = value; sliders[i].set(value); }); paint(); });
  // The near side of the figure follows the pointer. Vertical movement is ignored: the pitch is fixed.
  canvas.addEventListener('pointerdown', event => { drag = {x: event.clientX, yaw}; canvas.setPointerCapture?.(event.pointerId); });
  canvas.addEventListener('pointermove', event => { if (drag) { yaw = drag.yaw + (event.clientX - drag.x) * .008; paint(); } });
  for (const type of ['pointerup', 'pointercancel']) canvas.addEventListener(type, () => { drag = null; });
  canvas.addEventListener('keydown', event => {
    const turn = {ArrowLeft: -.1, ArrowRight: .1}[event.key];
    if (!turn) return;
    event.preventDefault(); yaw += turn; paint();
  });
  root.querySelector('.exhibit-head').append(reset);
  legend.before(stage, controls, readout); fallback.hidden = true;
  if (typeof ResizeObserver === 'function') new ResizeObserver(paint).observe(canvas); else addEventListener('resize', paint);
  paint();
}
