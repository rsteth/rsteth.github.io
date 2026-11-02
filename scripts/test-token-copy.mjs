import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Only the parts that carry provenance or exact arithmetic are byte-locked. Everything else is free to change.
const html=readFileSync(new URL('../learning-machines/tokens/index.html',import.meta.url),'utf8');
const sha=s=>createHash('sha256').update(s).digest('hex');
const checks=[{"label": "Sources", "pattern": "<details><summary>Sources, assumptions &amp; limits</summary>[\\s\\S]*?</details>", "hash": "c39cdba117b930634a8f318f5e26fd1d57c91dea24100e53e4426dc9cbf181ad"}, {"label": "tables", "pattern": "<table>[\\s\\S]*?</table>", "hash": "cef0ea2a525c9dad8a5bf8d4f96654779b8c74366cac31c756835bf83beafa1e"}, {"label": "equations", "pattern": "<p class=\"ex-exact\">[\\s\\S]*?</p>", "hash": "fd5abae8b60f0f1a7ea8093b5c1fc1fdd72dd1dfc7780756b7a6dc8544456546"}];
for(const c of checks)assert.equal(sha((html.match(new RegExp(c.pattern,'g'))||[]).join('\n')),c.hash,c.label+' changed: these are generated from the pinned math or record provenance. Regenerate or update deliberately.');
// The two caveats that keep the toy honest must still be on the page (wording elsewhere is free).
assert.ok(html.includes("fixed recipe, not learned attention scores"));
assert.ok(html.includes('not trained attention or a model prediction'));
console.log('PASS: Sources, exact tables and equations unchanged; core caveats present');
