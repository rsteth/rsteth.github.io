// Presentation only. Pieces, IDs, notes, shares, scores, probabilities and path points all come
// from mechanics.mjs; this module turns them into HTML strings. It runs in the browser for the
// live page and in Node for the static (no-JavaScript) build, so it never touches the DOM.
import * as M from './mechanics.mjs';

export const esc = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const show = piece => piece.replaceAll(' ', '·');
const num = (value, digits = 2) => { const r = Number(value.toFixed(digits)); return String(r === 0 ? 0 : r); };
const fixed = value => value.toFixed(2);
export const pct = p => p > 0 && p < 0.005 ? '<1%' : `${Math.round(p * 100)}%`;
const idText = id => id === null ? 'ID pending' : `ID ${id}`;
const NOTE = Object.fromEntries(M.NOTES.map(note => [note.key, note]));
const label = key => NOTE[key].label;
const quote = key => `“${label(key)}”`;
const arrow = (dir, d, viewBox) => `<svg class="arrow arrow-${dir}" viewBox="${viewBox}" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
const EAST = arrow('e', 'M0 5.5h22.8M18 1l4.8 4.5L18 10', '0 0 24 11');
const SOUTH = arrow('s', 'M8 0v22.2M1.4 15.6 8 22.2l6.6-6.6', '0 0 16 24');

/** Everything the page draws for one prompt, computed once. */
export function model({ subject = 'cat', verb = 'sat', covered = [], mode = 'greedy', seed = 1 } = {}) {
  const state = M.createState({ subject, verb, covered, mode, seed });
  const scores = M.scoresFor(state);
  const other = M.traceFor(M.createState({ subject: subject === 'cat' ? 'king' : 'cat', verb, covered }));
  const distribution = M.distributionFor(state);
  const top = distribution.reduce((best, item) => item.probability > best.probability ? item : best);
  return { state, trace: scores.trace, scores, distribution, other, top };
}

// One meaning per colour: which leg wrote it.
const ROLES = ['faint', 'who', 'verb', 'glue'];
export const legKey = leg => leg.kind === 'start' ? 'start' : leg.kind === 'worked' ? 'worked' : `p${leg.index}`;
const legRole = leg => leg.kind === 'start' ? 'start' : leg.kind === 'worked' ? 'worked' : ROLES[leg.index] ?? 'faint';
const UNIT_NEEDS = { cosy: 'a cat together with sitting or sleeping', grand: 'royalty together with sitting' };
/** Which heard legs fed a unit that fired (for linking the worked-out leg back to its words). */
export function feedsOf(trace) {
  const fired = trace.units.filter(unit => unit.amount > 0).flatMap(unit => Object.keys(unit.reads));
  return trace.legs.filter(leg => leg.kind === 'heard' && Object.keys(leg.wrote).some(key => fired.includes(key))).map(legKey);
}

/* ---------- Pieces ---------- */
const SLAB = { sage: ['#7f8b6e', '#66745f', '#c0c7ac', '#dde1c9'], terra: ['#b16c4f', '#874d3a', '#db9672', '#f1c19a'] };
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
function slab(kind) {
  const [left, right, top, dot] = SLAB[kind];
  let dots = '';
  for (let x = 6; x < 74; x += 2) for (let y = 6; y < 38; y += 2) {
    const d = Math.abs(x - 40) / 36 + Math.abs(y - 22) / 18;
    if (d < 0.92 && BAYER[(y / 2) & 3][(x / 2) & 3] < Math.round(9 - (y - 4) / 4)) dots += `<rect x="${x}" y="${y}" width="1.4" height="1.4" fill="${dot}"/>`;
  }
  return `<svg class="flow-slab" viewBox="0 0 80 58" aria-hidden="true" shape-rendering="crispEdges"><polygon points="4,22 40,40 40,50 4,32" fill="${left}"/><polygon points="40,40 76,22 76,32 40,50" fill="${right}"/><polygon points="4,22 40,4 76,22 40,40" fill="${top}"/>${dots}</svg>`;
}
/** Piece tiles. With `act` they are toggle buttons; without, a plain list. */
export function piecesHTML(pieces, ids, { selected = -1, generated = 0, act = null, live = true, compact = false } = {}) {
  const items = pieces.map((piece, index) => {
    const fresh = index >= pieces.length - generated;
    const inner = `${slab(fresh ? 'terra' : 'sage')}<strong>${esc(show(piece))}</strong><small>${idText(ids[index])}</small>`;
    const cls = `flow-piece${index === selected ? ' selected' : ''}`;
    const body = act
      ? `<button type="button" class="${cls}" data-act="${act}" data-idx="${index}" data-fid="${act}-${index}" aria-pressed="${index === selected}"${live ? '' : ' disabled'}>${inner}</button>`
      : `<span class="${cls}">${inner}</span>`;
    return `<li class="piece${fresh ? ' appended generated' : ''}">${body}</li>`;
  }).join('');
  return `<ol class="token-list piece-row${compact ? ' compact-row' : ''}">${items}</ol>`;
}
const choice = (act, value, current, live, text = value) =>
  `<button type="button" class="seg-button" data-act="${act}" data-val="${value}" data-fid="${act}-${value}" aria-pressed="${value === current}"${live ? '' : ' disabled'}>${esc(text)}</button>`;
/** Who / did-what switcher shared by sections 00 and 03. */
export function switcherHTML(m, { live = true } = {}) {
  return `<div class="switcher"><span class="switch-group"><span class="switch-label">Who</span>${M.SUBJECTS.map(s => choice('subject', s, m.state.subject, live)).join('')}</span>`
    + `<span class="switch-group"><span class="switch-label">Did what</span>${M.VERBS.map(v => choice('verb', v, m.state.verb, live)).join('')}</span></div>`;
}
export function pendingNote(pieces, ids) {
  const pending = pieces.filter((piece, index) => ids[index] === null);
  return pending.length ? `<p class="small side-note">The fixture has no ID for ${pending.map(p => esc(show(p))).join(' and ')} yet. No ID is invented here.</p>` : '';
}
/** Real fixture splits for the word picker. */
export const WORDS = M.FIXTURE.examples.filter(e => e.ids.length > 1 && !e.text.includes(' '));
export function splitHTML(wordIndex = 0, { live = true } = {}) {
  const word = WORDS[wordIndex];
  const picker = WORDS.length > 1 ? `<div class="word-picker">${WORDS.map((w, i) =>
    `<button type="button" data-act="word" data-idx="${i}" data-fid="word-${i}" aria-pressed="${i === wordIndex}"${live ? '' : ' disabled'}>${esc(w.text)}</button>`).join('')}</div>` : '';
  return `${picker}<figure class="split-example"><p class="split-word">${esc(word.text)}</p><p class="split-arrow" aria-hidden="true">${SOUTH}</p>`
    + piecesHTML(word.pieces, word.ids, { compact: true })
    + `<figcaption>Real cl100k_base split · one word, ${word.ids.length} pieces.</figcaption></figure>`;
}

/* ---------- Cards: six stored numbers, eight readable notes ---------- */
export function vectorHTML(row, { scale = 1, caption = 'Six stored numbers' } = {}) {
  const cells = row.map((value, index) => {
    const sign = value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero';
    const m = Math.min(1, Math.abs(value) / scale);
    return `<div class="ex-component"><span class="ex-index" aria-hidden="true">${index + 1}</span><span class="ex-cell ${sign}" aria-label="Number ${index + 1}: ${num(value)}" title="Number ${index + 1}: ${num(value, 4)}"><i class="ex-dot" style="--m:${num(m, 3)}" aria-hidden="true"></i><b>${num(value)}</b></span></div>`;
  }).join('');
  return `<div class="ex-vector" role="group" aria-label="${esc(caption)}">${cells}</div>`;
}
export function notesHTML(reads, { scale = 1, written = null } = {}) {
  const rows = M.NOTES.map(note => {
    const value = Math.max(0, reads[note.key]);
    const leak = written && value > 0.005 && !(note.key in written);
    return `<div class="note-read${value > 0.005 ? ' is-on' : ''}${leak ? ' is-leak' : ''}"><dt>${esc(note.label)}</dt><dd><span class="note-track" aria-hidden="true"><span style="width:${num(Math.min(100, value / scale * 100), 1)}%"></span></span><b>${num(value)}</b>${leak ? '<em>overlap</em>' : ''}</dd></div>`;
  }).join('');
  return `<dl class="note-reads">${rows}</dl>`;
}
export function cardHTML(m, index) {
  const piece = m.state.pieces[index];
  const row = M.embeddingFor(piece);
  return `<div class="explanation card-lookup"><div class="ex-lookup-path"><div class="ex-id-card"><strong class="ex-label">${esc(show(piece))}</strong><span class="ex-label">${idText(m.state.ids[index])}</span></div>`
    + `<div class="ex-link">look up<br>${EAST}</div><div class="card-face"><p class="ex-label">What is stored · six numbers</p>${vectorHTML(row, { scale: 0.6 })}`
    + `<p class="ex-label card-reads-label">What can be read from it · eight notes</p>${notesHTML(M.readNotes(row), { written: M.PIECES[piece].starts })}</div></div></div>`;
}

/* ---------- Listening and working out ---------- */
export function listenHTML(m, { live = true } = {}) {
  const { trace, state } = m;
  const heard = trace.legs.filter(leg => leg.kind === 'heard');
  const last = trace.rowIndex, x = index => 80 + index * 135, tx = x(last);
  const arcs = heard.map(leg => {
    const sx = x(leg.index), mid = (sx + tx) / 2, peak = 196 - (tx - sx) * 0.3, cy = 2 * peak - 196, width = 2 + 26 * leg.share;
    // Label a third of the way along the arc, where the arcs have not yet converged.
    const t = 0.3, lx = (1 - t) ** 2 * sx + 2 * t * (1 - t) * mid + t * t * tx, ly = (1 - t) ** 2 * 196 + 2 * t * (1 - t) * cy + t * t * 196;
    return `<g class="listen-arc role-${legRole(leg)}${leg.covered ? ' is-covered' : ''}"><path d="M${sx} 196Q${mid} ${num(cy, 1)} ${tx} 196" stroke-width="${num(width, 1)}"/><text x="${num(lx - 8, 1)}" y="${num(ly - width / 2 - 8, 1)}" text-anchor="end">${leg.covered ? 'covered' : pct(leg.share)}</text></g>`;
  }).join('');
  const boxes = state.pieces.map((piece, index) => {
    const covered = state.covered.includes(index);
    return `<g class="ex-arc-piece${index === last ? ' ex-arc-target' : ''}${covered ? ' ex-arc-future' : ''}"><rect x="${x(index) - 50}" y="202" width="100" height="40"/><text x="${x(index)}" y="227" text-anchor="middle">${esc(covered ? '· · ·' : show(piece))}</text></g>`;
  }).join('');
  const spoken = heard.map(leg => `${leg.covered ? 'covered piece' : show(leg.piece)} ${pct(leg.share)}`).join(', ');
  const covers = state.pieces.slice(0, last).map((piece, index) => {
    const on = state.covered.includes(index);
    return `<button type="button" data-act="cover" data-idx="${index}" data-fid="cover-${index}" aria-pressed="${on}"${live ? '' : ' disabled'}>${on ? 'uncover' : 'cover'} ${esc(show(piece))}</button>`;
  }).join('');
  const chip = (role, title, sub, dim = false) => `<span class="note-chip role-${role}${dim ? ' is-dim' : ''}"><b>${esc(title)}</b><small>${esc(sub)}</small></span>`;
  const start = trace.legs[0];
  const startChips = Object.keys(start.wrote).map(key => chip('start', label(key), `its own note · ${num(start.wrote[key])}`)).join('');
  const heardChips = [...heard].sort((a, b) => a.index - b.index).map(leg => leg.covered
    ? chip(legRole(leg), 'covered', 'nothing copied', true)
    : Object.keys(leg.wrote).map(key => chip(legRole(leg), label(key), `from ${show(leg.piece)} · ${num(leg.wrote[key])}`)).join('')).join('');
  const workedChips = trace.units.map(unit => unit.amount > 0
    ? chip('worked', label(unit.writes), `worked out · ${num(unit.amount)}`)
    : chip('worked', label(unit.writes), `needs ${UNIT_NEEDS[unit.key]}`, true)).join('');
  const unitLines = trace.units.map(unit => {
    const terms = Object.keys(unit.reads).map(key => `${label(key)} ${num(trace.notes.afterListening[key])}`).join(' + ');
    const verdict = unit.amount > 0
      ? `over the bar of ${num(unit.threshold)} ${EAST} writes ${num(unit.amount)} of ${quote(unit.writes)}`
      : `under the bar of ${num(unit.threshold)} ${EAST} writes nothing`;
    return `<p class="unit-line${unit.amount > 0 ? ' is-on' : ''}">${esc(terms)} = ${num(unit.input)} · ${verdict}</p>`;
  }).join('');
  const rows = trace.legs.map(leg => {
    const what = leg.kind === 'start' ? `starts as ${show(leg.piece)}` : leg.kind === 'worked' ? `works out ${label(Object.keys(leg.wrote)[0])}` : `hears ${leg.covered ? 'a covered piece' : show(leg.piece)}`;
    const wrote = Object.entries(leg.wrote).map(([key, value]) => `${label(key)} ${num(value, 4)}`).join(', ') || 'nothing';
    return `<tr><th scope="row">${esc(what)}</th><td>${leg.kind === 'heard' ? num(leg.share * 100, 2) + '%' : '—'}</td><td>${esc(wrote)}</td><td>[${leg.after.map(value => num(value, 3)).join(', ')}]</td></tr>`;
  }).join('');
  return `<h3><span class="ex-step">A</span> Listen</h3><p>The last piece hears every earlier piece, some more than others: thicker arc, larger share. It copies what it hears onto its own card. It cannot hear pieces that come later.</p>`
    + `<figure class="ex-arcs listen-figure"><svg viewBox="0 0 700 250" role="img" aria-label="How much ${esc(show(trace.piece))} hears from each earlier piece: ${esc(spoken)}">${arcs}${boxes}</svg><figcaption>Thicker arc = larger share of what is heard.</figcaption></figure>`
    + `<div class="cover-row"><span class="switch-label">Cover a word to see what goes missing</span>${covers}</div>`
    + `<h3><span class="ex-step">B</span> Work out</h3><p>Then the card is worked over on its own. Some notes can only be written when two things are on the card together: a cat and sitting make a low, cosy spot. Neither word carries that alone.</p>`
    + `<div class="notes-card viewfinder"><p class="panel-label">THE CARD OF THE LAST PIECE · ${esc(show(trace.piece))}</p>`
    + `<div class="notes-row"><span class="notes-step">Starts with</span><span class="chips">${startChips}</span></div>`
    + `<div class="notes-row"><span class="notes-step">Hears</span><span class="chips">${heardChips}</span></div>`
    + `<div class="notes-row"><span class="notes-step">Works out</span><span class="chips">${workedChips}</span></div>`
    + `<div class="unit-lines">${unitLines}</div></div>`
    + `<details class="ex-details explanation"><summary>Inspect the exact numbers</summary><p>Every row below is computed from the one above it. Shares are a softmax of hand-written match scores; a share times ${M.LISTEN_GAIN} is the amount copied.</p>`
    + `<table><caption>The card of ${esc(show(trace.piece))}, step by step</caption><thead><tr><th>Step</th><th>Share</th><th>Writes</th><th>Six stored numbers afterwards</th></tr></thead><tbody>${rows}</tbody></table>`
    + `<p class="ex-label">The finished card</p>${vectorHTML(trace.output, { scale: 2.4, caption: 'The finished card: six stored numbers' })}${notesHTML(trace.notes.output, { scale: 2.6 })}</details>`;
}

/* ---------- The path: a three-number view of the card's journey ---------- */
const VB = { w: 720, h: 500, cx: 350, cy: 245, scale: 74, pitch: 24 * Math.PI / 180, centre: [0.55, 1.75, 0.5] };
function project(point, yaw) {
  const t = yaw * Math.PI / 180, x = point[0] - VB.centre[0], y = point[1] - VB.centre[1], z = point[2] - VB.centre[2];
  const x1 = x * Math.cos(t) + z * Math.sin(t), z1 = -x * Math.sin(t) + z * Math.cos(t);
  return [Number((VB.cx + VB.scale * x1).toFixed(1)), Number((VB.cy - VB.scale * (y * Math.cos(VB.pitch) - z1 * Math.sin(VB.pitch))).toFixed(1))];
}
export const RAY = 1.12;
export function pathSVG(m, yaw = -18) {
  const { trace, other, scores, top } = m;
  const line = (a, b, attrs) => { const p = project(a, yaw), q = project(b, yaw); return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" ${attrs}/>`; };
  const floor = point => [point[0], 0, point[2]];
  let out = '';
  for (let x = -2; x <= 3; x++) out += line([x, 0, -2], [x, 0, 3], 'class="path-grid"');
  for (let z = -2; z <= 3; z++) out += line([-2, 0, z], [3, 0, z], 'class="path-grid"');
  const origin = project(trace.legs[0].viewTo, yaw), finish = project(trace.legs.at(-1).viewTo, yaw);
  const rays = scores.candidates.map(candidate => {
    const tip = M.viewOf(candidate.direction).map(value => value * RAY), p = project(tip, yaw), win = !top.aggregate && top.piece === candidate.piece;
    // Labels sit on the outer side; near the middle they sit away from where the path heads.
    const left = Math.abs(p[0] - origin[0]) < 70 ? finish[0] > origin[0] : p[0] < origin[0];
    return { svg: line([0, 0, 0], tip, `class="path-ray${win ? ' is-top' : ''}"`), text: `<g class="path-candidate${win ? ' is-top' : ''}"><circle cx="${p[0]}" cy="${p[1]}" r="${win ? 5 : 3.5}"/><text x="${p[0] + (left ? -10 : 10)}" y="${p[1] + 4}" text-anchor="${left ? 'end' : 'start'}">${esc(show(candidate.piece))}</text></g>` };
  });
  out += rays.map(ray => ray.svg).join('');
  const points = [trace.legs[0].viewFrom, ...trace.legs.map(leg => leg.viewTo)];
  out += `<polyline class="path-shadow" points="${points.slice(1).map(point => project(floor(point), yaw).join(',')).join(' ')}"/>`;
  out += points.slice(1).map(point => line(point, floor(point), 'class="path-drop"')).join('');
  // Ghost: where the other subject would have sent the card, from the point the two paths part.
  other.legs.forEach((leg, index) => {
    const mine = trace.legs[index];
    if (!mine || mine.viewTo.some((value, axis) => Math.abs(value - leg.viewTo[axis]) > 1e-9) || mine.viewFrom.some((value, axis) => Math.abs(value - leg.viewFrom[axis]) > 1e-9)) out += line(leg.viewFrom, leg.viewTo, 'class="path-ghost"');
  });
  const ghostEnd = project(other.legs.at(-1).viewTo, yaw);
  if (other.legs.at(-1).viewTo.some((value, axis) => Math.abs(value - trace.legs.at(-1).viewTo[axis]) > 1e-9)) out += `<circle class="path-ghost-end" cx="${ghostEnd[0]}" cy="${ghostEnd[1]}" r="3"/>`;
  const moving = trace.legs.filter(leg => leg.kind !== 'start');
  out += moving.map(leg => line(leg.viewFrom, leg.viewTo, `class="path-leg role-${legRole(leg)}" data-leg="${legKey(leg)}"`)).join('');
  out += moving.slice(0, -1).map(leg => { const p = project(leg.viewTo, yaw); return `<circle class="path-stop" cx="${p[0]}" cy="${p[1]}" r="4"/>`; }).join('');
  const s = project(trace.legs[0].viewTo, yaw), e = project(trace.legs.at(-1).viewTo, yaw);
  out += `<circle class="path-start" data-leg="start" data-k="start" cx="${s[0]}" cy="${s[1]}" r="6"/><text class="path-label" x="${s[0] - 12}" y="${s[1] + 4}" text-anchor="end">start</text>`;
  out += `<circle class="path-end" data-leg="end" data-k="end" cx="${e[0]}" cy="${e[1]}" r="7"/>`;
  out += rays.map(ray => ray.text).join('');
  out += moving.map(leg => line(leg.viewFrom, leg.viewTo, `class="path-hit" data-k="${legKey(leg)}"`)).join('');
  const where = top.aggregate ? 'no candidate stands out' : `furthest along the direction of ${show(top.piece)}`;
  return `<svg class="path-svg" viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-label="The card of ${esc(show(trace.piece))} drawn as a path. It starts with ${esc(label('thing'))}, moves once for each piece it hears and once for what it works out, and ends ${esc(where)}.">${out}</svg>`;
}
/** Sentence chips and legend that link to the legs. */
export function pathChipsHTML(m, { live = true } = {}) {
  const { trace, state, top } = m;
  const chip = (key, role, text, extra = '') => `<button type="button" class="path-chip role-${role}${extra}" data-k="${key}" data-fid="chip-${key}"${live ? '' : ' disabled'}>${esc(text)}</button>`;
  const last = trace.rowIndex;
  const words = state.pieces.slice(0, last).map((piece, index) => chip(`p${index}`, ROLES[index] ?? 'faint', state.covered.includes(index) ? '· · ·' : show(piece), state.covered.includes(index) ? ' is-covered' : ''));
  const worked = trace.legs.some(leg => leg.kind === 'worked');
  return `<div class="path-sentence" data-feeds="${feedsOf(trace).join(' ')}">${words.join('')}${chip('start', 'start', show(trace.piece))}<span class="path-then" aria-hidden="true">${EAST}</span>${chip('end', 'end', top.aggregate ? '?' : show(top.piece))}`
    + `${chip('worked', 'worked', worked ? '+ worked out' : '+ nothing worked out', worked ? '' : ' is-covered')}</div>`;
}
export function captionFor(key, m) {
  const { trace, top } = m;
  if (!key) return 'Point at a word or a leg of the path to see what it wrote.';
  if (key === 'start') return `${show(trace.piece)} · where the card starts: ${Object.keys(trace.legs[0].wrote).map(quote).join(', ')}`;
  if (key === 'end') return top.aggregate ? 'Where the card ends up · no candidate stands out, so “all other tokens” leads' : `Where the card ends up · furthest along the direction of ${show(top.piece)} (${pct(top.probability)})`;
  if (key === 'worked') {
    const fired = trace.units.filter(unit => unit.amount > 0);
    if (!fired.length) return 'Nothing worked out · no pair of notes is on the card together';
    return fired.map(unit => `Worked out from ${Object.keys(unit.reads).filter(k => trace.notes.afterListening[k] > 0.5).map(label).join(' and ')} together · writes ${quote(unit.writes)}`).join(' · ');
  }
  const leg = trace.legs.find(candidate => legKey(candidate) === key);
  if (!leg) return '';
  if (leg.covered) return `Covered · still listened to (${pct(leg.share)}), but it offers nothing`;
  const wrote = Object.keys(leg.wrote).map(quote).join(', ');
  return leg.share < 0.06 ? `${show(leg.piece)} · barely heard (${pct(leg.share)}) · adds a trace of ${wrote}` : `${show(leg.piece)} · heard ${pct(leg.share)} · writes ${wrote}`;
}

/* ---------- Scores and the 100% strip ---------- */
export function scoresHTML(m) {
  const { scores, trace, distribution, top } = m, full = 7.2;
  const rows = scores.candidates.map(candidate => {
    const segments = candidate.parts.map((part, index) => part > 0.004
      ? `<span class="score-seg role-${legRole(trace.legs[index])}" style="width:${num(part / full * 100, 2)}%" title="${esc(captionFor(legKey(trace.legs[index]), m).split(' · ')[0])}: +${num(part)}"></span>` : '').join('');
    const win = !top.aggregate && top.piece === candidate.piece;
    return `<div class="score-row${win ? ' is-top' : ''}"><dt>${esc(show(candidate.piece))}</dt><dd><span class="score-track">${segments}</span><b>${fixed(candidate.score)}</b></dd></div>`;
  }).join('');
  const rest = `<div class="score-row is-other${top.aggregate ? ' is-top' : ''}"><dt>all other tokens</dt><dd><span class="score-track"><span class="score-seg role-other" style="width:${num(scores.other / full * 100, 2)}%"></span></span><b>${fixed(scores.other)}</b></dd></div>`;
  return `<dl class="score-bars">${rows}${rest}</dl><ul class="path-legend score-legend"><li class="role-start">its own note</li><li class="role-glue">heard from ·on</li><li class="role-verb">heard from the verb</li><li class="role-who">heard from who</li><li class="role-faint">heard from The</li><li class="role-worked">worked out from both</li><li class="role-other">fixed stand-in</li></ul>`;
}
export function ribbonHTML(m, selection = null) {
  const { distribution, top } = m;
  const segments = distribution.map(item => {
    const name = item.aggregate ? 'all other tokens' : show(item.piece);
    const chosen = selection && (item.aggregate ? selection.aggregate : selection.piece === item.piece);
    return `<span class="ribbon-seg ${item === top ? 'seg-top' : 'seg-n'}${chosen ? ' chosen' : ''}" style="flex-basis:${num(item.probability * 100, 3)}%"><b>${esc(name)}</b><small>${pct(item.probability)}</small></span>`;
  }).join('');
  const needle = selection && m.state.mode === 'sample'
    ? `<span class="ribbon-needle" style="left:${num(selection.seed / 4294967296 * 100, 2)}%"><small>draw ${num(selection.seed / 4294967296, 3)}</small></span>` : '';
  const spoken = distribution.map(item => `${item.aggregate ? 'all other tokens' : show(item.piece)} ${pct(item.probability)}`).join(' · ');
  return `<div class="ribbon" aria-hidden="true">${segments}${needle}</div><p class="small ribbon-text">${esc(spoken)}</p>`;
}

/* ---------- Append ---------- */
export function statusText(m, results) {
  const latest = results.at(-1);
  if (!latest) return `Cycle 1 · ${m.state.mode === 'greedy' ? 'greedy would take' : 'sampling could take any piece; most likely is'} ${m.top.aggregate ? '“all other tokens”' : show(m.top.piece)}.`;
  if (latest.stopReason === 'outside-fixture') return '“All other tokens” was chosen. A real model would pick one particular token from its vocabulary; this toy stops instead of inventing one.';
  if (latest.stopReason === 'demo-limit') return 'Two pieces generated. The demo stops here; a model would carry on until a stopping rule.';
  const picked = latest.selection;
  return `Cycle ${latest.generated} · chose ${show(picked.piece)}${picked.scripted ? ' (scripted, not computed)' : ` at ${pct(picked.probability)}`}${latest.mode === 'sample' && !picked.scripted ? ` · draw ${num(picked.seed / 4294967296, 3)}` : ''}.`;
}
export function appendHTML(m, results) {
  const latest = results.at(-1);
  const table = count => `<p class="small cards-count">Cards on the table: ${count}. Every one has to be kept for the next piece to listen to.</p>`;
  if (!latest) return `<p class="text-box">${esc(m.state.text)}</p><p class="small">Choose a piece in section 03 and it is appended here.</p>${table(m.state.pieces.length)}`;
  if (latest.generated === 0) return `<p class="text-box">${esc(latest.text)}</p><p class="small">Nothing was appended: the choice fell outside this toy's handful of candidates.</p>${table(latest.pieces.length)}`;
  const before = latest.pieces.slice(0, latest.pieces.length - 1).join(''), fresh = latest.pieces.at(-1);
  return piecesHTML(latest.pieces, latest.ids, { generated: latest.generated })
    + `<p class="text-box">${esc(before)}<mark>${esc(fresh)}</mark></p>`
    + `<p class="small">The new piece gets a fresh card: its own starting notes, with nothing heard yet.</p>${table(latest.pieces.length)}`;
}
