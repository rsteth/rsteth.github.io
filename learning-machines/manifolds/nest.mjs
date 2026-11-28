// Presentation only, and a sketch: nothing here is computed from the robot or the pinned fixtures.
// It draws the nesting the article describes with far fewer dimensions than the real thing:
// a box (three dimensions, standing for the fourteen joint angles), a sheet inside it (two, standing for the eight left by the grasp)
// and a band on the sheet (drawn narrow, standing for the two a handoff uses).
export const PITCH = .34, START_YAW = -.55, TALL = 1.5, EDGE = .86, BAND = .15;
const CELLS = 12, STEPS = 32, TAU = Math.PI * 2, REACH = Math.SQRT2;
const INK = '#302e28', MUTED = '#6b695f', ROUTE = '#9c4635', SHADE = [146, 151, 128], LIGHT = [232, 229, 211], SUN = [-.42, -.5, .76];

// A gentle sheet that stays well inside the box and never hides part of itself at this pitch.
export const height = (u, v) => .74 + .2 * Math.sin(1.6 * u + .4) * Math.cos(1.3 * v) + .1 * u;
export const onSheet = ([u, v]) => [u, v, height(u, v)];
// The middle of the band as it crosses the sheet.
export const bandCentre = u => .22 * Math.sin(1.9 * u) - .08;
const at = k => -EDGE + 2 * EDGE * k / CELLS;
const BOX = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

// Orthographic camera: yaw about the vertical axis at a fixed pitch, sized by the cylinder the box sweeps as it spins.
export function projector(W, H, yaw) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), ce = Math.cos(PITCH), se = Math.sin(PITCH);
  const s = Math.min((W - 24) / (2 * REACH), (H - 96) / (2 * REACH * se + TALL * ce)), ox = W / 2, oy = 76 + (H - 96) / 2;
  return ([x, y, z]) => {
    const xr = x * cy - y * sy, yr = x * sy + y * cy, zc = z - TALL / 2;
    return [ox + s * xr, oy - s * (yr * se + zc * ce), -yr * ce + zc * se];
  };
}

function tone(u, v) {
  const e = .02, du = (height(u + e, v) - height(u - e, v)) / (2 * e), dv = (height(u, v + e) - height(u, v - e)) / (2 * e);
  const lit = Math.max(0, (-du * SUN[0] - dv * SUN[1] + SUN[2]) / (Math.hypot(du, dv, 1) * Math.hypot(...SUN)));
  return 'rgb(' + SHADE.map((dark, i) => Math.round(dark + (LIGHT[i] - dark) * lit ** 1.6)).join(',') + ')';
}

export function paintNest(c, W, H, yaw, {font = 'monospace'} = {}) {
  const P = projector(W, H, yaw);
  const line = points => { c.beginPath(); points.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p[0], p[1])); };
  const seg = (a, b) => { line([a, b]); c.stroke(); };
  c.clearRect(0, 0, W, H); c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash([]);

  // The box: its far edges go behind the sheet, its near edges in front.
  const edges = [];
  BOX.forEach(([x, y], k) => {
    const [nx, ny] = BOX[(k + 1) % 4];
    edges.push([[x, y, 0], [nx, ny, 0]], [[x, y, TALL], [nx, ny, TALL]], [[x, y, 0], [x, y, TALL]]);
  });
  const middle = P([0, 0, TALL / 2])[2];
  const near = ([a, b]) => P(a.map((v, i) => (v + b[i]) / 2))[2] > middle;
  const boxEdges = front => { c.globalAlpha = front ? .5 : .28; c.strokeStyle = INK; c.lineWidth = 1; for (const edge of edges) if (near(edge) === front) seg(P(edge[0]), P(edge[1])); };
  boxEdges(false);

  // The sheet: lit facets drawn far to near, each outer side drawn with its own facet.
  const node = (i, j) => P(onSheet([at(i), at(j)])), facets = [];
  for (let j = 0; j < CELLS; j++) for (let i = 0; i < CELLS; i++) {
    const corners = [node(i, j), node(i + 1, j), node(i + 1, j + 1), node(i, j + 1)];
    const rim = [[j === 0, 0, 1], [i === CELLS - 1, 1, 2], [j === CELLS - 1, 2, 3], [i === 0, 3, 0]].filter(([outer]) => outer).map(([, a, b]) => [corners[a], corners[b]]);
    facets.push({corners, rim, near: corners.reduce((sum, p) => sum + p[2], 0) / 4, fill: tone(at(i + .5), at(j + .5))});
  }
  facets.sort((a, b) => a.near - b.near);
  for (const facet of facets) {
    c.globalAlpha = 1; c.fillStyle = facet.fill; line(facet.corners); c.closePath(); c.fill();
    c.globalAlpha = .14; c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.globalAlpha = .55; for (const [a, b] of facet.rim) seg(a, b);
  }

  // The band: a narrow strip of the sheet, from one side to the other.
  const along = Array.from({length: STEPS + 1}, (_, k) => -EDGE + 2 * EDGE * k / STEPS);
  const side = sign => along.map(u => P(onSheet([u, bandCentre(u) + sign * BAND])));
  const upper = side(1), lower = side(-1);
  c.globalAlpha = .55; c.fillStyle = ROUTE; line([...upper, ...lower.reverse()]); c.closePath(); c.fill();
  c.globalAlpha = .95; c.strokeStyle = ROUTE; c.lineWidth = 1.3; line(upper); c.stroke(); line(lower); c.stroke();
  boxEdges(true);

  // A key in the corner: it stays put while the figure spins.
  c.globalAlpha = 1; c.font = '12px ' + font; c.textBaseline = 'middle'; c.textAlign = 'left';
  const key = (row, mark, name, count) => {
    const y = 14 + 19 * row;
    mark(12, y - 5);
    c.globalAlpha = 1; c.fillStyle = INK; c.fillText(name, 30, y);
    c.fillStyle = MUTED; c.fillText(count, 30 + c.measureText(name + ' ').width, y);
  };
  const square = (x, y) => line([[x, y], [x + 10, y], [x + 10, y + 10], [x, y + 10]]);
  key(0, (x, y) => { c.globalAlpha = .6; c.strokeStyle = INK; c.lineWidth = 1; square(x, y); c.closePath(); c.stroke(); }, 'every pose of the arms', '· 14 numbers');
  key(1, (x, y) => { c.globalAlpha = 1; c.fillStyle = 'rgb(' + LIGHT.map((v, i) => Math.round((v + SHADE[i]) / 2)).join(',') + ')'; square(x, y); c.closePath(); c.fill(); }, 'poses that keep the grasp', '· 8');
  key(2, (x, y) => { c.globalAlpha = .7; c.fillStyle = ROUTE; square(x, y); c.closePath(); c.fill(); }, 'poses a handoff uses', '· 2');
}

// Live figure: puts a canvas in place of the static drawing. Dragging sideways, or the left and right arrow keys, spins it.
export function nestFigure(root) {
  const fallback = root.querySelector('.nest-static'), stage = document.createElement('div');
  stage.className = 'thread-stage';
  stage.innerHTML = '<canvas class="thread-figure sheet-canvas" tabindex="0" role="img" aria-label="A sketch of three nested spaces: a wireframe box standing for every pose of the arms, a curved sheet inside it standing for the poses that keep the grasp, and a narrow band across the sheet standing for the poses a handoff uses. Left and right arrow keys spin the view."></canvas>';
  const canvas = stage.querySelector('canvas'), c = canvas.getContext('2d');
  let yaw = START_YAW, drag = null;
  function paint() {
    const ratio = devicePixelRatio || 1, W = canvas.clientWidth || 640, H = Math.round(Math.max(300, Math.min(470, W * .86)));
    canvas.style.height = H + 'px';
    if (canvas.width !== Math.round(W * ratio) || canvas.height !== Math.round(H * ratio)) { canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio); }
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    paintNest(c, W, H, yaw, {font: getComputedStyle(canvas).fontFamily || 'monospace'});
  }
  canvas.addEventListener('pointerdown', event => { drag = {x: event.clientX, yaw}; canvas.setPointerCapture?.(event.pointerId); });
  canvas.addEventListener('pointermove', event => { if (drag) { yaw = drag.yaw + (event.clientX - drag.x) * .008; paint(); } });
  for (const type of ['pointerup', 'pointercancel']) canvas.addEventListener(type, () => { drag = null; });
  canvas.addEventListener('keydown', event => {
    const turn = {ArrowLeft: -.1, ArrowRight: .1}[event.key];
    if (!turn) return;
    event.preventDefault(); yaw += turn; paint();
  });
  fallback.after(stage); fallback.hidden = true;
  if (typeof ResizeObserver === 'function') new ResizeObserver(paint).observe(canvas); else addEventListener('resize', paint);
  paint();
}
