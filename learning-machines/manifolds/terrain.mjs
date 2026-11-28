// Presentation only. Every height and shade is a cost sampled in the pinned landscape fixture: one value per valid pose in the slice.
// The slice's two coordinates (ball forward distance and ball height) lie flat; the cost lifts the ground, so harder poses are higher and darker.
// Samples with no valid pose stand at the full height as a hatched plateau: ground a route cannot cross.
export const PITCH = .5, START_YAW = -.62, RISE = .7;
const TAU = Math.PI * 2, REACH = Math.SQRT2;
const INK = '#302e28', MUTED = '#6b695f', PALE = '#fff9ef';
// The same paper-to-terracotta ramp as the flat chart this figure grew out of.
export const shade = level => `rgb(${Math.round(228 - 72 * level)},${Math.round(221 - 116 * level)},${Math.round(194 - 117 * level)})`;

// One vertex per sampled cell. Columns run along x (ball forward), rows along y (ball height), and the normalized cost is z.
export function terrainMesh(grid, field) {
  const costs = grid.cells.filter(cell => cell.valid).map(cell => cell.costs[field]);
  const min = Math.min(...costs), max = Math.max(...costs), span = Math.max(1e-12, max - min), {width, height} = grid;
  const vertices = grid.cells.map((cell, index) => {
    const level = cell.valid ? (cell.costs[field] - min) / span : null;
    return {index, valid: cell.valid, level, point: [-1 + 2 * (index % width) / (width - 1), -1 + 2 * Math.floor(index / width) / (height - 1), (level ?? 1) * RISE]};
  });
  // A facet joins four neighbouring samples. Where any of the four has no valid pose it is hatched, and slopes up to the plateau.
  const facets = [];
  for (let row = 0; row < height - 1; row++) for (let col = 0; col < width - 1; col++) {
    const corners = [col + row * width, col + 1 + row * width, col + 1 + (row + 1) * width, col + (row + 1) * width];
    const solid = corners.every(index => vertices[index].valid);
    facets.push({corners, solid, level: solid ? corners.reduce((sum, index) => sum + vertices[index].level, 0) / 4 : null});
  }
  return {vertices, facets, min, max, width, height};
}

// Orthographic camera: yaw about the vertical axis at a fixed pitch, sized by the cylinder the ground sweeps as it spins.
export function projector(W, H, yaw) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), ce = Math.cos(PITCH), se = Math.sin(PITCH);
  const s = Math.min((W - 20) / (2 * REACH), (H - 64) / (2 * REACH * se + RISE * ce)), ox = W / 2, oy = 26 + (H - 64) / 2;
  return ([x, y, z]) => {
    const xr = x * cy - y * sy, yr = x * sy + y * cy, zc = z - RISE / 2;
    return [ox + s * xr, oy - s * (yr * se + zc * ce), -yr * ce + zc * se];
  };
}

// routes: [{path: [cell index, ...], dashed}], later ones drawn over earlier ones. inspect: a cell index to ring, or null.
// Returns every vertex in canvas coordinates, for pointing at.
export function paintTerrain(c, W, H, yaw, mesh, {routes = [], start = null, goal = null, inspect = null, labels = [], font = 'monospace'} = {}) {
  const P = projector(W, H, yaw), points = mesh.vertices.map(vertex => P(vertex.point));
  const line = list => { c.beginPath(); list.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p[0], p[1])); };
  const seg = (a, b) => { line([a, b]); c.stroke(); };
  const dot = (p, r) => { c.beginPath(); c.arc(p[0], p[1], r, 0, TAU); };
  c.clearRect(0, 0, W, H); c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash([]);

  const order = mesh.facets.map((facet, index) => {
    const corners = facet.corners.map(i => points[i]);
    return {facet, index, corners, near: corners.reduce((sum, p) => sum + p[2], 0) / 4};
  }).sort((a, b) => a.near - b.near);
  // A stretch of route waits until every facet around its two ends is drawn, so the ground in front of it can still hide it.
  const turn = new Map(order.map((item, at) => [item.index, at])), due = new Map();
  const around = cell => {
    const col = cell % mesh.width, row = Math.floor(cell / mesh.width), found = [];
    for (const [dc, dr] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      if (col + dc >= 0 && col + dc < mesh.width - 1 && row + dr >= 0 && row + dr < mesh.height - 1) found.push(col + dc + (row + dr) * (mesh.width - 1));
    }
    return found;
  };
  routes.forEach((route, which) => {
    for (let k = 1; k < route.path.length; k++) {
      const last = Math.max(...[...around(route.path[k - 1]), ...around(route.path[k])].map(index => turn.get(index)));
      due.set(last, [...(due.get(last) ?? []), {a: points[route.path[k - 1]], b: points[route.path[k]], dashed: route.dashed, which}]);
    }
  });
  order.forEach(({facet, corners}, at) => {
    c.globalAlpha = 1; line(corners); c.closePath();
    if (facet.solid) { c.fillStyle = shade(facet.level); c.fill(); c.globalAlpha = .14; c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); }
    else { c.fillStyle = '#d7d3c8'; c.fill(); c.globalAlpha = .55; c.strokeStyle = '#948e80'; c.lineWidth = 1; seg(corners[0], corners[2]); }
    for (const piece of (due.get(at) ?? []).sort((a, b) => a.which - b.which)) {
      c.globalAlpha = 1; c.setLineDash([]); c.strokeStyle = PALE; c.lineWidth = 5.5; seg(piece.a, piece.b);
      c.strokeStyle = INK; c.lineWidth = 2.2; c.setLineDash(piece.dashed ? [5, 5] : []); seg(piece.a, piece.b); c.setLineDash([]);
    }
  });

  // Start and goal sit on top, lettered. The ring marks a pose being inspected along a route.
  c.globalAlpha = 1; c.font = '12px ' + font; c.textBaseline = 'middle'; c.textAlign = 'center';
  for (const [cell, letter] of [[start, 'S'], [goal, 'G']]) {
    if (cell === null) continue;
    const p = points[cell];
    c.fillStyle = '#f7f3e7'; c.strokeStyle = INK; c.lineWidth = 1; dot(p, 10); c.fill(); c.stroke();
    c.fillStyle = INK; c.fillText(letter, p[0], p[1] + .5);
  }
  if (inspect !== null) {
    const p = points[inspect];
    c.strokeStyle = INK; c.lineWidth = 1.5; dot(p, 8); c.stroke();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) seg([p[0] + 8 * dx, p[1] + 8 * dy], [p[0] + 12 * dx, p[1] + 12 * dy]);
  }

  // The two flat coordinates are named along whichever ground edges face the viewer; the caption says what height means.
  c.fillStyle = MUTED; c.textAlign = 'left'; c.fillText('higher and darker = more costly', 12, 14);
  c.textAlign = 'center';
  const name = (text, a, b) => {
    const [from, to] = [P(a), P(b)], long = Math.hypot(to[0] - from[0], to[1] - from[1]), wide = c.measureText(text).width;
    if (long < wide + 44) return;
    let angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
    const dir = Math.cos(angle) < 0 ? -1 : 1;
    if (dir < 0) angle += Math.PI;
    const tail = dir * (wide / 2 - 6), tip = dir * (wide / 2 + 16);
    c.save(); c.translate((from[0] + to[0]) / 2, (from[1] + to[1]) / 2); c.rotate(angle); c.fillText(text, -dir * 14, 16);
    c.strokeStyle = MUTED; c.lineWidth = 1; c.beginPath();
    c.moveTo(tail, 16); c.lineTo(tip, 16); c.moveTo(tip - dir * 5, 12.5); c.lineTo(tip, 16); c.lineTo(tip - dir * 5, 19.5);
    c.stroke(); c.restore();
  };
  const middle = ([a, b]) => P([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0])[2];
  const nearer = (one, other) => middle(one) > middle(other) ? one : other;
  if (labels[0]) name(labels[0], ...nearer([[-1, -1, 0], [1, -1, 0]], [[-1, 1, 0], [1, 1, 0]]));
  if (labels[1]) name(labels[1], ...nearer([[-1, -1, 0], [-1, 1, 0]], [[1, -1, 0], [1, 1, 0]]));
  return points;
}

// The cell under the pointer, from a list of candidate cells; null if none is within reach.
export function nearestCell(points, candidates, x, y, reach = 14) {
  let best = null, nearest = reach;
  for (const cell of candidates) {
    const gap = Math.hypot(points[cell][0] - x, points[cell][1] - y);
    if (gap < nearest) { nearest = gap; best = cell; }
  }
  return best;
}

// Live figure. Pointing at a route shows the pose at that step; clicking valid ground moves the goal there;
// dragging sideways, or the left and right arrow keys, spins the ground at a fixed pitch.
export function terrainFigure({onGoal = () => {}, onInspect = () => {}} = {}) {
  const stage = document.createElement('div'); stage.className = 'thread-stage';
  stage.innerHTML = '<canvas class="thread-figure terrain-figure" tabindex="0" role="img" aria-label="The cost field drawn as ground: each valid pose in the slice is a point whose height and darkness show its cost, and the hatched plateau has no valid pose. A dashed shortest route and a solid cheapest route run from S to G. Left and right arrow keys spin the view; the goal sliders move G."></canvas>';
  const canvas = stage.querySelector('canvas'), c = canvas.getContext('2d');
  let yaw = START_YAW, scene = null, inspect = null, points = [], drag = null, W = 480, H = 380;

  function paint() {
    if (!scene) return;
    const ratio = devicePixelRatio || 1;
    W = canvas.clientWidth || 480; H = Math.round(Math.max(260, Math.min(420, W * .8))); canvas.style.height = H + 'px';
    if (canvas.width !== Math.round(W * ratio) || canvas.height !== Math.round(H * ratio)) { canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio); }
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    points = paintTerrain(c, W, H, yaw, scene.mesh, {...scene, inspect, font: getComputedStyle(canvas).fontFamily || 'monospace'});
  }
  const under = (event, candidates, reach) => {
    const rect = canvas.getBoundingClientRect();
    return nearestCell(points, candidates, event.clientX - rect.left, event.clientY - rect.top, reach);
  };
  function look(event) {
    const found = under(event, scene.routes.flatMap(route => route.path));
    if (found !== inspect) { inspect = found; paint(); onInspect(inspect); }
    canvas.style.cursor = found !== null ? 'crosshair' : '';
  }
  canvas.addEventListener('pointerdown', event => { drag = {x: event.clientX, yaw, moved: false}; canvas.setPointerCapture?.(event.pointerId); });
  canvas.addEventListener('pointermove', event => {
    if (!drag) { look(event); return; }
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 5) return;
    drag.moved = true; yaw = drag.yaw + dx * .008; paint();
  });
  canvas.addEventListener('pointerup', event => {
    const clicked = drag && !drag.moved; drag = null;
    if (!clicked) return;
    const cell = under(event, scene.mesh.vertices.filter(vertex => vertex.valid).map(vertex => vertex.index), 18);
    if (cell !== null) onGoal(cell);
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('pointerleave', () => { if (!drag && inspect !== null) { inspect = null; paint(); onInspect(null); } });
  canvas.addEventListener('keydown', event => {
    const turn = {ArrowLeft: -.1, ArrowRight: .1}[event.key];
    if (!turn) return;
    event.preventDefault(); yaw += turn; paint();
  });
  if (typeof ResizeObserver === 'function') new ResizeObserver(paint).observe(canvas); else addEventListener('resize', paint);
  return {
    stage,
    // scene: {mesh, routes, start, goal, labels}
    set(next) { scene = next; inspect = null; paint(); },
    reset() { yaw = START_YAW; inspect = null; paint(); }
  };
}
