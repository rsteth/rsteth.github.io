// A small box of numbers: a caption that says how many there are, optional column heads, and one labelled row per thing.
// Used beside the surfaces figure and beside each robot panel, so the same picture of "many numbers held in a few" repeats down the page.
const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// DOM-free, so the page's static fallback can be checked against it.
export function numberBoxHTML({caption, heads = null, rows}) {
  const head = heads ? `<thead><tr><td></td>${heads.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>` : '';
  const body = rows.map(([label, values]) => `<tr><th scope="row">${esc(label)}</th>${values.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('');
  return `<table class="number-box"><caption>${esc(caption)}</caption>${head}<tbody>${body}</tbody></table>`;
}

// A vector written out the way the text writes it, without boxes: an italic symbol, a relation, and values between brackets.
// With fn, the values are that function's argument, so the line reads "q = g([…])": the symbol is produced from these few numbers.
// heads name the values, in small type above them.
export function vectorHTML({symbol, relation = '=', fn = null, values, heads = null, columns = values.length}) {
  const shown = values.map(v => String(v).replace('-', '−'));
  const said = `${symbol} ${relation === '=' ? 'equals' : 'is approximately'} ${fn ? fn + ' of ' : ''}${shown.join(', ')}`;
  const body = `<span class="vector-body${heads ? ' has-heads' : ''}" style="grid-template-columns:repeat(${columns},auto)">`
    + (heads ?? []).map(h => `<span class="vector-head">${esc(h)}</span>`).join('') + shown.map(v => `<span>${esc(v)}</span>`).join('') + '</span>';
  return `<p class="vector" role="math" aria-label="${esc(said)}"><i>${esc(symbol)}</i><span>${esc(relation)}</span>`
    + (fn ? `<i>${esc(fn)}</i><span class="vector-paren">(</span>${body}<span class="vector-paren">)</span>` : body) + '</p>';
}

// Two decimals by default, without a negative zero.
export const fixed = (n, places = 2) => (Math.round(n * 10 ** places) / 10 ** places || 0).toFixed(places);

// Fills a container with one box per entry, or a written-out vector for an entry with a symbol; an entry that is null is left out.
export function showNumbers(container, boxes) {
  const html = boxes.filter(Boolean).map(entry => entry.symbol ? vectorHTML(entry) : numberBoxHTML(entry)).join('');
  if (container.innerHTML !== html) container.innerHTML = html;
}
