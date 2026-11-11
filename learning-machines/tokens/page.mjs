// Interaction for the token study. Nothing educational is computed here: the mechanics
// produce every value and render.mjs draws it.
import * as M from './mechanics.mjs';
import * as R from './render.mjs';

const $ = id => document.getElementById(id);
const ui = { subject: 'cat', verb: 'sat', covered: [], mode: 'greedy', seed: 1, piece: 1, word: 0, yaw: -18, results: [], hover: null, pin: null };
let m = R.model(ui);

const toAppend = state => { do { state = M.step(state); } while (state.phase !== 'append' && !state.stopped); return state; };
const latest = () => ui.results.at(-1) ?? null;

function paintHot() {
  const hot = ui.hover ?? ui.pin, figure = $('path-figure');
  const feeds = (figure.querySelector('.path-sentence')?.dataset.feeds ?? '').split(' ');
  figure.querySelectorAll('[data-leg]').forEach(el => {
    el.classList.toggle('is-hot', el.dataset.leg === hot);
    el.classList.toggle('is-dim', Boolean(hot) && hot !== 'end' && el.classList.contains('path-leg') && el.dataset.leg !== hot);
  });
  figure.querySelectorAll('.path-chip').forEach(chip => {
    chip.classList.toggle('is-hot', Boolean(hot) && (chip.dataset.k === hot || (hot === 'worked' && feeds.includes(chip.dataset.k))));
  });
  $('path-caption').textContent = R.captionFor(hot, m);
}
function renderPath() { $('r-path-svg').innerHTML = R.pathSVG(m, ui.yaw); paintHot(); }

function render() {
  const focused = document.activeElement?.dataset?.fid;
  const { state } = m, selection = latest()?.selection ?? null;
  $('r-pieces').innerHTML = `<p class="panel-label">TEXT SO FAR</p><p class="text-box">${R.esc(state.text)}</p>`
    + R.piecesHTML(state.pieces, state.ids, { selected: ui.piece, act: 'piece' }) + R.switcherHTML(m) + R.pendingNote(state.pieces, state.ids);
  $('r-split').innerHTML = R.splitHTML(ui.word);
  $('r-card').innerHTML = `<div class="card-picker"><span class="switch-label">Whose card</span>${state.pieces.map((piece, index) =>
    `<button type="button" data-act="piece" data-idx="${index}" data-fid="card-${index}" aria-pressed="${index === ui.piece}">${R.esc(R.show(piece))}</button>`).join('')}</div>` + R.cardHTML(m, ui.piece);
  $('r-listen').innerHTML = R.listenHTML(m);
  $('r-path-chips').innerHTML = R.pathChipsHTML(m);
  $('r-path-switch').innerHTML = R.switcherHTML(m);
  $('r-scores').innerHTML = R.scoresHTML(m);
  $('r-ribbon').innerHTML = R.ribbonHTML(m, selection);
  $('r-append').innerHTML = R.appendHTML(m, ui.results);
  $('status').textContent = R.statusText(m, ui.results);
  $('pipeline-text').textContent = latest()?.text ?? state.text;
  $('choose').disabled = ui.results.length > 0;
  $('next-cycle').disabled = !latest() || latest().stopped;
  $('reset').disabled = ui.results.length === 0;
  renderPath();
  if (focused) document.querySelector(`[data-fid="${focused}"]`)?.focus({ preventScroll: true });
}
function update(change) {
  Object.assign(ui, change, { results: [], pin: null, hover: null });
  m = R.model(ui);
  render();
}

document.addEventListener('click', event => {
  const control = event.target.closest('[data-act]');
  if (!control || control.disabled) return;
  const { act, val } = control.dataset, index = Number(control.dataset.idx);
  if (act === 'subject') update({ subject: val });
  else if (act === 'verb') update({ verb: val });
  else if (act === 'cover') update({ covered: ui.covered.includes(index) ? ui.covered.filter(i => i !== index) : [...ui.covered, index] });
  else if (act === 'piece') { ui.piece = index; render(); }
  else if (act === 'word') { ui.word = index; render(); }
});
$('mode').addEventListener('change', event => update({ mode: event.target.value }));
$('seed').addEventListener('change', event => {
  const seed = Number(event.target.value);
  if (Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff) update({ seed }); else event.target.value = ui.seed;
});
$('choose').addEventListener('click', () => { ui.results = [toAppend(m.state)]; render(); });
$('reset').addEventListener('click', () => { ui.results = []; render(); });
$('next-cycle').addEventListener('click', () => {
  let next = M.step(latest());
  if (!next.stopped) next = toAppend(next);
  ui.results.push(next); render();
});

// Path: words and legs light each other up; click pins; the slider or a drag turns the view.
const figure = $('path-figure'), keyOf = target => target.closest?.('[data-k]')?.dataset.k ?? null;
figure.addEventListener('pointerover', event => { const key = keyOf(event.target); if (key) { ui.hover = key; paintHot(); } });
figure.addEventListener('pointerout', event => { if (keyOf(event.target)) { ui.hover = null; paintHot(); } });
figure.addEventListener('focusin', event => { const key = keyOf(event.target); if (key) { ui.hover = key; paintHot(); } });
figure.addEventListener('focusout', () => { ui.hover = null; paintHot(); });
figure.addEventListener('click', event => { const key = keyOf(event.target); if (key) { ui.pin = ui.pin === key ? null : key; paintHot(); } });
const yaw = $('yaw'), stage = $('r-path-svg');
yaw.addEventListener('input', () => { ui.yaw = Number(yaw.value); renderPath(); });
let drag = null;
stage.addEventListener('pointerdown', event => { if (keyOf(event.target)) return; drag = { x: event.clientX, yaw: ui.yaw }; stage.setPointerCapture(event.pointerId); });
stage.addEventListener('pointermove', event => {
  if (!drag) return;
  ui.yaw = Math.max(-45, Math.min(45, Math.round(drag.yaw + (event.clientX - drag.x) * 0.3)));
  yaw.value = ui.yaw; renderPath();
});
for (const type of ['pointerup', 'pointercancel']) stage.addEventListener(type, () => { drag = null; });

// Pipeline: mark the section being read.
const links = [...document.querySelectorAll('.pipeline a')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) links.forEach(link => link.toggleAttribute('aria-current', link.hash === `#${entry.target.id}`));
  }, { rootMargin: '-30% 0px -60% 0px' });
  document.querySelectorAll('section[id^=stage-]').forEach(section => observer.observe(section));
}

for (const id of ['mode', 'seed', 'yaw']) $(id).disabled = false;
document.body.classList.add('notes-ready');
render();
