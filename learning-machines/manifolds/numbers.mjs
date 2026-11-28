// A small box of numbers: a caption that says how many there are, optional column heads, and one labelled row per thing.
// Used beside the surfaces figure and beside each robot panel, so the same picture of "many numbers held in a few" repeats down the page.
const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// DOM-free, so the page's static fallback can be checked against it.
export function numberBoxHTML({caption, heads = null, rows}) {
  const head = heads ? `<thead><tr><td></td>${heads.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>` : '';
  const body = rows.map(([label, values]) => `<tr><th scope="row">${esc(label)}</th>${values.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('');
  return `<table class="number-box"><caption>${esc(caption)}</caption>${head}<tbody>${body}</tbody></table>`;
}

// A vector written out the way the text writes it, without boxes: an italic symbol, an equals sign and its values between brackets.
export function vectorHTML({symbol, values, columns = values.length}) {
  const shown = values.map(v => String(v).replace('-', '\u2212'));
  return `<p class="vector" role="math" aria-label="${esc(symbol)} equals ${shown.map(esc).join(', ')}"><i>${esc(symbol)}</i><span>=</span>`
    + `<span class="vector-body" style="grid-template-columns:repeat(${columns},auto)">${shown.map(v => `<span>${esc(v)}</span>`).join('')}</span></p>`;
}

// Two decimals by default, without a negative zero.
export const fixed = (n, places = 2) => (Math.round(n * 10 ** places) / 10 ** places || 0).toFixed(places);

// Fills a container with one box per entry, or a written-out vector for an entry with a symbol; an entry that is null is left out.
export function showNumbers(container, boxes) {
  const html = boxes.filter(Boolean).map(entry => entry.symbol ? vectorHTML(entry) : numberBoxHTML(entry)).join('');
  if (container.innerHTML !== html) container.innerHTML = html;
}
