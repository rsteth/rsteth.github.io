// Presentation only, and a schematic: the two surfaces (sheets, in this file) are drawn examples, not computed from the robot or the pinned fixtures.
// Each sheet is a two-dimensional surface in three coordinates, [u, v, base + height(u, v)]. The map is the same (u, v) drawn flat beneath both.
import {formatSliderValue} from './format.mjs';

export const START = Object.freeze([-.78, -.62]);
export const TARGET = Object.freeze([.72, .5]);
export const MAP_Z = -1.2;
// The camera's pitch is fixed; the figure only spins about its vertical axis.
export const PITCH = .34, START_YAW = -.62;
export const PIECES = 48;
const CELLS = 14, TAU = Math.PI * 2, REACH = Math.SQRT2;
const INK = '#302e28', MUTED = '#6b695f', PANEL = '#edeadf', ROUTE = '#9c4635', SUN = [-.42, -.5, .76];
const WIDEST = '(-0.00, -0.00, 0.00)';

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
const along = (target, t) => START.map((s, i) => s + (target[i] - s) * t);
// Two decimals, without a negative zero.
export const coordinates = point => '(' + point.map(n => (Math.round(n * 100) / 100 || 0).toFixed(2)).join(', ') + ')';

// The straight map line from START to the target, and the same line lifted onto each sheet.
export function route(target) {
  const map = Array.from({length: PIECES + 1}, (_, k) => along(target, k / PIECES));
  const sheets = SHEETS.map((_, sheet) => map.map(p => lift(p, sheet)));
  return {map, sheets, mapLength: distance(START, target), sheetLengths: sheets.map(pathLength)};
}

// The scale comes from the cylinder the figure sweeps as it spins, so nothing changes size while it turns.
// Where the canvas is wide enough, the figure moves left and the coordinates stand in a column to its right.
export function layout(W, H, labelWidth = 0) {
  const tall = 2 * REACH * Math.sin(PITCH) + (TOP - MAP_Z) * Math.cos(PITCH);
  const wide = Math.min((W - 24) / (2 * REACH), (H - 58) / tall);
  const beside = labelWidth > 0 && 12 + 2 * REACH * wide + 14 + labelWidth + 8 <= W;
  if (beside) return {s: wide, beside, ox: Math.min(W / 2, W - 8 - labelWidth - 14 - REACH * wide), oy: 14 + (H - 58) / 2};
  // Otherwise the coordinates go in the gap under each layer, and the map's own need a clear row at the bottom.
  const foot = labelWidth > 0 ? 78 : 58;
  return {s: Math.min(wide, (H - foot) / tall), beside, ox: W / 2, oy: 14 + (H - foot) / 2};
}

// Orthographic camera: yaw about the vertical axis at a fixed pitch. Third value = nearness.
export function projector(W, H, yaw, labelWidth = 0) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), ce = Math.cos(PITCH), se = Math.sin(PITCH), {s, ox, oy} = layout(W, H, labelWidth);
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

// mark is how far along the route the reticle sits, from 0 (start) to 1 (end).
// Returns the three drawn route lines in canvas coordinates, map first, for pointing at.
export function paintSheet(c, W, H, yaw, target, {mark = 1, font = 'monospace'} = {}) {
  c.font = '12px ' + font;
  const labelWidth = c.measureText(WIDEST).width, {s, ox, oy, beside} = layout(W, H, labelWidth);
  const P = projector(W, H, yaw, labelWidth), path = route(target), point = along(target, mark);
  const line = points => { c.beginPath(); points.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p[0], p[1])); };
  const seg = (a, b) => { line([a, b]); c.stroke(); };
  const dot = (p, r) => { c.beginPath(); c.arc(p[0], p[1], r, 0, TAU); };
  const reticle = p => {
    c.globalAlpha = 1; c.strokeStyle = INK; c.lineWidth = 1.5; c.setLineDash([]); dot(p, 8); c.stroke();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) seg([p[0] + 8 * dx, p[1] + 8 * dy], [p[0] + 12 * dx, p[1] + 12 * dy]);
  };
  // One dashed line joins the marked point on every layer. Each stretch is drawn before the sheet above it, which hides what passes behind.
  const join = (a, b) => { c.globalAlpha = .75; c.strokeStyle = INK; c.lineWidth = 1; c.setLineDash([3, 4]); seg(a, b); c.setLineDash([]); };
  c.clearRect(0, 0, W, H); c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash([]);

  // The map: a flat grid, with the route as a straight dashed line.
  c.strokeStyle = INK; c.lineWidth = 1; c.globalAlpha = .1;
  for (let k = 0; k <= 8; k++) {
    const t = -1 + k / 4;
    seg(P(flat([t, -1])), P(flat([t, 1]))); seg(P(flat([-1, t])), P(flat([1, t])));
  }
  c.globalAlpha = .45; line(CORNERS.map(p => P(flat(p)))); c.closePath(); c.stroke();
  const lines = [path.map.map(p => P(flat(p)))], marks = [P(flat(point))];
  c.globalAlpha = .9; c.lineWidth = 1.5; c.setLineDash([5, 4]); seg(lines[0][0], lines[0].at(-1)); c.setLineDash([]);
  c.fillStyle = INK; for (const end of [lines[0][0], lines[0].at(-1)]) { dot(end, 2.5); c.fill(); }
  reticle(marks[0]);

  // The sheets, lowest first: the camera looks down, so a higher sheet is always in front of a lower one where they overlap.
  SHEETS.forEach((sheet, index) => {
    const lifted = path.sheets[index].map(P), marked = P(lift(point, index)), pieces = new Map();
    join(marks.at(-1), marked);
    // Lit facets drawn far to near, with the pieces of the route that lie on them.
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
    c.globalAlpha = 1; c.fillStyle = ROUTE; for (const end of [lifted[0], lifted.at(-1)]) { dot(end, 3.2); c.fill(); }
    reticle(marked);
    lines.push(lifted); marks.push(marked);
  });

  // The marked point's coordinates on each layer: beside it where there is room, otherwise in the gap under the layer.
  c.globalAlpha = 1; c.textBaseline = 'middle'; c.fillStyle = INK;
  const values = [coordinates(point), ...SHEETS.map((_, index) => coordinates(lift(point, index)))];
  const bases = [MAP_Z, ...SHEETS.map(sheet => sheet.base)];
  values.forEach((text, layer) => {
    if (beside) { c.textAlign = 'left'; c.fillText(text, ox + s * REACH + 14, marks[layer][1]); return; }
    // A plate of the panel's own colour keeps the numbers readable where the dashed line or a label passes behind them.
    const y = layer ? oy - s * (bases[layer] - .58 - MID) * Math.cos(PITCH) : H - 12, width = c.measureText(text).width;
    c.globalAlpha = .88; c.fillStyle = PANEL; line([[W - 12 - width, y - 9], [W - 4, y - 9], [W - 4, y + 9], [W - 12 - width, y + 9]]); c.closePath(); c.fill();
    c.globalAlpha = 1; c.fillStyle = INK; c.textAlign = 'right'; c.fillText(text, W - 8, y);
  });

  // A caption under the map (where it does not meet the map's own numbers), and its two coordinates named along its front edges.
  c.textAlign = 'left';
  if (beside) {
    c.fillStyle = INK; c.fillText('one map', 12, H - 12);
    c.fillStyle = MUTED; c.fillText('· flat, two coordinates', 12 + c.measureText('one map ').width, H - 12);
  }
  c.fillStyle = MUTED; c.textAlign = 'center';
  const name = (text, a, b) => {
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
  name('coordinate 1', first.slice(0, 2), first.slice(2));
  name('coordinate 2', second.slice(0, 2), second.slice(2));
  return lines;
}

// How far along the route the pointer is, if it is within reach of any of the three drawn lines; otherwise null.
export function nearestOnRoute(lines, x, y, reach = 14) {
  let best = null, nearest = reach;
  for (const points of lines) for (let k = 1; k < points.length; k++) {
    const a = points[k - 1], dx = points[k][0] - a[0], dy = points[k][1] - a[1], size = dx * dx + dy * dy;
    const f = size ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / size)) : 0;
    const gap = Math.hypot(x - a[0] - f * dx, y - a[1] - f * dy);
    if (gap < nearest) { nearest = gap; best = (k - 1 + f) / (points.length - 1); }
  }
  return best;
}

// Live figure: puts a canvas and two sliders in place of the static drawing.
// Pointing at any of the three lines moves the reticle there; dragging sideways, or the left and right arrow keys, spins the figure.
export function sheetFigure(root) {
  const make = (tag, name, html = '') => { const el = document.createElement(tag); el.className = name; el.innerHTML = html; return el; };
  const fallback = root.querySelector('.sheet-static');
  const stage = make('div', 'thread-stage', '<canvas class="thread-figure sheet-canvas" tabindex="0" role="img" aria-label="Two curved surfaces drawn one above the other, over a single flat map. A straight dashed line on the map appears on each surface as a different curved route. A ring marks the same point on all three, joined by a dashed line, with its three coordinates beside each surface and its two beside the map. Left and right arrow keys spin the view; the sliders move the end of the route."></canvas>');
  const controls = make('div', 'controls');
  const reset = make('button', '', 'Reset panel'); reset.type = 'button';
  const canvas = stage.querySelector('canvas'), c = canvas.getContext('2d'), target = [...TARGET];
  let yaw = START_YAW, mark = 1, W = 640, H = 640, drag = null, lines = [];

  function paint() {
    const ratio = devicePixelRatio || 1;
    W = canvas.clientWidth || 640; H = Math.round(Math.max(380, Math.min(640, W * 1.3))); canvas.style.height = H + 'px';
    if (canvas.width !== Math.round(W * ratio) || canvas.height !== Math.round(H * ratio)) { canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio); }
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    lines = paintSheet(c, W, H, yaw, target, {mark, font: getComputedStyle(canvas).fontFamily || 'monospace'});
  }
  // Moves the reticle if the pointer is on a line, and reports whether it was.
  function point(event) {
    const rect = canvas.getBoundingClientRect(), found = nearestOnRoute(lines, event.clientX - rect.left, event.clientY - rect.top);
    if (found !== null && found !== mark) { mark = found; paint(); }
    return found !== null;
  }
  const sliders = [0, 1].map(i => {
    const id = 'sheet-' + i, wrap = make('div', 'control', `<label for="${id}">Map coordinate ${i + 1}<output for="${id}"></output></label><input id="${id}" type="range" min="-1" max="1" step="0.01" value="${target[i]}">`);
    const input = wrap.querySelector('input'), out = wrap.querySelector('output'), show = () => { out.textContent = formatSliderValue(+input.value, .01); };
    input.addEventListener('input', () => { target[i] = +input.value; show(); paint(); });
    controls.append(wrap); show();
    return {set(value) { input.value = value; show(); }};
  });
  reset.addEventListener('click', () => { yaw = START_YAW; mark = 1; TARGET.forEach((value, i) => { target[i] = value; sliders[i].set(value); }); paint(); });
  // The near side of the figure follows the pointer. Vertical movement is ignored: the pitch is fixed.
  canvas.addEventListener('pointerdown', event => { point(event); drag = {x: event.clientX, yaw}; canvas.setPointerCapture?.(event.pointerId); });
  canvas.addEventListener('pointermove', event => {
    if (drag) { yaw = drag.yaw + (event.clientX - drag.x) * .008; paint(); }
    else canvas.style.cursor = point(event) ? 'crosshair' : '';
  });
  for (const type of ['pointerup', 'pointercancel']) canvas.addEventListener(type, () => { drag = null; });
  canvas.addEventListener('keydown', event => {
    const turn = {ArrowLeft: -.1, ArrowRight: .1}[event.key];
    if (!turn) return;
    event.preventDefault(); yaw += turn; paint();
  });
  root.querySelector('.exhibit-head').append(reset);
  fallback.after(stage, controls); fallback.hidden = true;
  if (typeof ResizeObserver === 'function') new ResizeObserver(paint).observe(canvas); else addEventListener('resize', paint);
  paint();
}
