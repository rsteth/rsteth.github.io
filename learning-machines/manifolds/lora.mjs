// One figure, two rows, the same shape of idea in each: a few numbers go in and many come out.
// Top row: real, from the pinned mechanics. The designed decoder f of the handoff panel, with Present held at zero,
// drawn as fourteen joint-angle traces while Reach runs from -1 to 1.
// Bottom row: a toy LoRA update with made-up numbers, not taken from any model. A tall matrix B times a wide matrix A fills in every
// cell of the update, so the entries of B and A are the few numbers and the update is the many.
import {vectorHTML, fixed} from './numbers.mjs';

export const ROWS = 8, COLS = 10, RANK = 2;
// The one number in each factor that a slider changes.
export const PICK = Object.freeze({B: [2, 0], A: [1, 6]});
const INK = '#302e28', MUTED = '#6b695f', LEFT = 'rgb(111,124,94)', RIGHT = 'rgb(177,108,79)';
const round = n => Math.round(n * 100) / 100, num = n => +n.toFixed(2);

// Made-up factors, fixed so the figure is the same on every load.
export function toyFactors() {
  return {
    B: Array.from({length: ROWS}, (_, i) => Array.from({length: RANK}, (_, k) => round(.9 * Math.sin(1.3 * i + 2.1 * k + .5)))),
    A: Array.from({length: RANK}, (_, k) => Array.from({length: COLS}, (_, j) => round(.9 * Math.cos(.8 * j - 1.7 * k + .3))))
  };
}
export const product = ({B, A}) => B.map(row => A[0].map((_, j) => row.reduce((sum, v, k) => sum + v * A[k][j], 0)));
export const counts = () => ({few: ROWS * RANK + RANK * COLS, many: ROWS * COLS});

// The designed decoder, f(Reach, Present) = the grasp solver applied to the designed task coordinates.
export function decode(M, reach, present, initialQ) {
  const result = M.solveGrasp({...M.encodeTaskCoordinates(reach, present), initialQ});
  return result.ok ? result.q : null;
}
// Fourteen joint angles at evenly spaced values of Reach, each solve starting from its neighbour so the traces are continuous.
export function sweep(F, M, steps = 16) {
  const middle = decode(M, 0, 0, F.canonical.q), samples = [{reach: 0, q: middle}];
  for (const dir of [-1, 1]) {
    let q = middle;
    for (let i = 1; i <= steps; i++) {
      q = decode(M, dir * i / steps, 0, q);
      if (!q) break;
      samples.push({reach: dir * i / steps, q});
    }
  }
  return samples.sort((a, b) => a.reach - b.reach);
}
// The pose at any Reach in the swept range, solved from the nearest sample.
export function poseAt(M, samples, reach) {
  const nearest = samples.reduce((best, s) => Math.abs(s.reach - reach) < Math.abs(best.reach - reach) ? s : best);
  return decode(M, reach, 0, nearest.q) ?? nearest.q;
}

// Fourteen lanes, one per joint: left arm above, right arm below. Every lane uses the same degrees-per-pixel,
// so a joint that barely moves draws a nearly flat line.
export const LANES = {width: 500, height: 268};
export function lanesSVG(samples, reach, q) {
  const x = r => 78 + (r + 1) / 2 * 396, lane = k => 22 + k * 15 + (k >= 7 ? 12 : 0);
  const spans = Array.from({length: 14}, (_, k) => { const v = samples.map(s => s.q[k]); return [Math.min(...v), Math.max(...v)]; });
  const scale = 30 / Math.max(1e-9, ...spans.map(([lo, hi]) => hi - lo)), y = (k, value) => lane(k) - (value - (spans[k][0] + spans[k][1]) / 2) * scale;
  let svg = '';
  for (let k = 0; k < 14; k++) {
    const colour = k < 7 ? LEFT : RIGHT;
    svg += `<line x1="${x(-1)}" y1="${lane(k)}" x2="${x(1)}" y2="${lane(k)}" stroke="${INK}" stroke-opacity=".08"/>`
      + `<polyline points="${samples.map(s => num(x(s.reach)) + ',' + num(y(k, s.q[k]))).join(' ')}" fill="none" stroke="${colour}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  svg += `<line x1="${num(x(reach))}" y1="10" x2="${num(x(reach))}" y2="${lane(13) + 12}" stroke="${INK}" stroke-opacity=".55" stroke-dasharray="3 4"/>`;
  for (let k = 0; k < 14; k++) svg += `<circle cx="${num(x(reach))}" cy="${num(y(k, q[k]))}" r="3" fill="${k < 7 ? LEFT : RIGHT}" stroke="#edeadf" stroke-width="1"/>`;
  const text = (tx, ty, s, anchor = 'start', fill = MUTED) => `<text x="${tx}" y="${ty}" font-family="monospace" font-size="11" fill="${fill}" text-anchor="${anchor}">${s}</text>`;
  svg += text(68, lane(3) + 4, 'left arm', 'end', LEFT) + text(68, lane(10) + 4, 'right arm', 'end', RIGHT);
  svg += `<line x1="${x(-1)}" y1="${lane(13) + 16}" x2="${x(1)}" y2="${lane(13) + 16}" stroke="${INK}" stroke-opacity=".35"/>`;
  svg += text(x(-1), lane(13) + 32, '−1') + text(x(1), lane(13) + 32, '1', 'end') + text(x(0), lane(13) + 32, 'Reach', 'middle');
  return svg;
}

// B times A equals the update, drawn as grids of shaded cells: terracotta for positive, sage for negative.
// The picked number in B is outlined together with the row of the update it sets; the picked number in A, dashed, with its column.
export const GRIDS = {width: 500, height: 226};
export function factorsSVG(factors) {
  const {B, A} = factors, W = product(factors), cell = 18, top = 40, limit = Math.max(1, ...W.flat().map(Math.abs));
  const fill = (v, max) => {
    const t = Math.min(1, Math.abs(v) / max), to = v >= 0 ? [177, 108, 79] : [95, 112, 84];
    return 'rgb(' + [244, 240, 228].map((p, i) => Math.round(p + (to[i] - p) * t)).join(',') + ')';
  };
  const grid = (m, x0, y0, max) => m.map((row, i) => row.map((v, j) => `<rect x="${x0 + j * cell}" y="${y0 + i * cell}" width="${cell}" height="${cell}" fill="${fill(v, max)}" stroke="#c9c4b8" stroke-width=".7"/>`).join('')).join('');
  const frame = (x0, y0, w, h, dashed) => `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="2"${dashed ? ' stroke-dasharray="4 3"' : ''}/>`;
  const text = (x, y, s, size = 11, family = 'monospace', fill = MUTED, style = '') => `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" fill="${fill}" text-anchor="middle"${style}>${s}</text>`;
  const serif = 'Georgia,Times New Roman,serif', italic = ' font-style="italic"';
  const bx = 24, ax = bx + RANK * cell + 38, ay = top + (ROWS - RANK) * cell / 2, wx = ax + COLS * cell + 46, tall = ROWS * cell;
  let svg = grid(B, bx, top, 1) + grid(A, ax, ay, 1) + grid(W, wx, top, limit);
  svg += text(bx + RANK * cell + 19, top + tall / 2 + 6, '×', 18, serif, INK) + text(ax + COLS * cell + 23, top + tall / 2 + 6, '=', 18, serif, INK);
  svg += text(bx + RANK * cell / 2, top - 12, 'B', 17, serif, INK, italic) + text(ax + COLS * cell / 2, ay - 12, 'A', 17, serif, INK, italic) + text(wx + COLS * cell / 2, top - 12, 'ΔW', 17, serif, INK, italic);
  svg += text(bx + RANK * cell / 2, top + tall + 18, `${ROWS}×${RANK}`) + text(bx + RANK * cell / 2, top + tall + 32, `${ROWS * RANK} numbers`);
  svg += text(ax + COLS * cell / 2, ay + RANK * cell + 18, `${RANK}×${COLS} · ${RANK * COLS} numbers`);
  svg += text(wx + COLS * cell / 2, top + tall + 18, `${ROWS}×${COLS}`) + text(wx + COLS * cell / 2, top + tall + 32, `${ROWS * COLS} numbers`);
  const [bi, bk] = PICK.B, [ak, aj] = PICK.A;
  svg += frame(bx + bk * cell, top + bi * cell, cell, cell) + frame(wx, top + bi * cell, COLS * cell, cell);
  svg += frame(ax + aj * cell, ay + ak * cell, cell, cell, true) + frame(wx + aj * cell, top, cell, tall, true);
  return svg;
}

// The whole figure as one drawing, for readers without JavaScript.
export function staticSVG(F, M) {
  const samples = sweep(F, M), reach = .4, q = poseAt(M, samples, reach), {few, many} = counts();
  const text = (x, y, s) => `<text x="${x}" y="${y}" font-family="monospace" font-size="12" fill="#514e44">${s}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 590" role="img"><title>Few numbers in, many numbers out</title><desc>Top: fourteen joint-angle traces from the pinned mechanics as the Reach control runs from minus one to one. Bottom: a toy LoRA update with made-up numbers, a tall matrix B times a wide matrix A giving the full update.</desc><rect width="640" height="590" fill="#edeadf"/>`
    + text(20, 28, 'ONE NUMBER MOVES FOURTEEN JOINT ANGLES') + `<g transform="translate(60 40)">${lanesSVG(samples, reach, q)}</g>`
    + text(20, 338, `TOY LORA UPDATE / ${few} NUMBERS SET ${many}`) + `<g transform="translate(60 350)">${factorsSVG(toyFactors())}</g></svg>`;
}

// Live figure: two sliders for the robot row's one control and for the two picked numbers in B and A.
export function loraFigure(root, F, M) {
  const make = (tag, name, html = '') => { const el = document.createElement(tag); el.className = name; el.innerHTML = html; return el; };
  const fallback = root.querySelector('.lora-static'), caption = root.querySelector('p.small');
  const samples = sweep(F, M), factors = toyFactors(), {few, many} = counts();
  const span = [samples[0].reach, samples.at(-1).reach];
  let reach = .4;
  const lanes = make('div', 'lora-drawing'), robotNumbers = make('div', 'numbers'), robot = make('div', 'lora-row'), robotControls = make('div', 'controls');
  const grids = make('div', 'lora-drawing'), loraNumbers = make('div', 'numbers'), lora = make('div', 'lora-row'), loraControls = make('div', 'controls');
  robot.append(lanes, robotNumbers); lora.append(grids, loraNumbers);
  const picture = (size, label, inner) => `<svg viewBox="0 0 ${size.width} ${size.height}" role="img" aria-label="${label}">${inner}</svg>`;
  function paintRobot() {
    const q = poseAt(M, samples, reach), degrees = q.map(v => fixed(v * 180 / Math.PI, 1));
    lanes.innerHTML = picture(LANES, 'Fourteen joint-angle traces, seven for each arm, as the Reach control runs from minus one to one. A dashed vertical line marks the current value of Reach, with a dot on each trace.', lanesSVG(samples, reach, q));
    robotNumbers.innerHTML = vectorHTML({symbol: 'q', fn: 'f', heads: ['Reach', 'Present'], quiet: [1], values: [fixed(reach, 3), fixed(0, 3)]}) + vectorHTML({symbol: 'q', columns: 7, values: degrees});
  }
  function paintLora() {
    grids.innerHTML = picture(GRIDS, 'A tall matrix B times a wide matrix A equals the update, drawn as grids of shaded cells. One outlined number in B sets an outlined row of the update, and one outlined number in A sets an outlined column.', factorsSVG(factors));
    loraNumbers.innerHTML = `<p class="vector" role="math" aria-label="Delta W equals B times A"><i>ΔW</i><span>=</span><i>B</i><i>A</i></p><p class="lora-count">${ROWS * RANK} + ${RANK * COLS} = ${few} numbers set ${many}</p>`;
  }
  const slider = (parent, id, label, min, max, step, value, fn) => {
    const wrap = make('div', 'control', `<label for="${id}">${label}<output for="${id}"></output></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">`);
    const input = wrap.querySelector('input'), out = wrap.querySelector('output'), show = () => { out.textContent = fixed(+input.value, 2); };
    input.addEventListener('input', () => { show(); fn(+input.value); }); parent.append(wrap); show();
  };
  slider(robotControls, 'lora-reach', 'Reach', span[0], span[1], .01, reach, v => { reach = v; paintRobot(); });
  slider(loraControls, 'lora-b', 'One number in B (solid outline)', -1, 1, .01, factors.B[PICK.B[0]][PICK.B[1]], v => { factors.B[PICK.B[0]][PICK.B[1]] = v; paintLora(); });
  slider(loraControls, 'lora-a', 'One number in A (dashed outline)', -1, 1, .01, factors.A[PICK.A[0]][PICK.A[1]], v => { factors.A[PICK.A[0]][PICK.A[1]] = v; paintLora(); });
  caption.before(robot, robotControls, lora, loraControls); fallback.hidden = true;
  paintRobot(); paintLora();
}
