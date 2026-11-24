# stethem.com

Personal site via GitHub Pages.

## What is included

- A static project grid at the repository root
- Full Invisible Objects essays and photo sequences under `/objects/`
- A Market River archive at `/market-river/`, showing up to nine recent snapshots
- A custom domain declaration in `CNAME`
- A `verbosele/` Git submodule published under `/verbosele/`

GitHub Pages should be configured to deploy from the default branch using the repository root.

The homepage card reads `manifests/latest.json` in `market-river-cover.js`.
It selects the newest trading date and slot, prefers the sunny variant without
requesting location. When the card scrolls into view, its dither reveal waits
at most 500 ms for the live image. If it is late or unavailable, the static cover
gets the full reveal, and a late live image replaces it only after that.
The static cover is still available without JavaScript; reduced motion skips
the animated reveal and the wait.
The archive uses `script.js` to group `manifests/recent.json` snapshots by
date and slot, select a weather variant, and display up to nine snapshots.

Run `node scripts/test-market-river-cover.cjs` and `node scripts/test-market-river.cjs`
for homepage and archive regression checks.

Run the dependency-free canvas regression checks with `node scripts/test-homepage-dither.cjs`.
They cover color fallbacks, unchanged Bayer pixels and simulated restoration/failure paths.
The dither remains generated on canvas; repainting follows page, visibility, context and size restoration.

Preview locally with `python3 -m http.server 8765 --bind 127.0.0.1` from the
repository root. The site has no build step or package dependencies.

## Learning Machines

The sparse companion pages live under `/learning-machines/`. Mechanics are vendored from `rsteth/learning-machines` at the exact commit and SHA-256 in `learning-machines/attention-and-memory/mechanics-pin.json`. No runtime network dependency or build step.

Update reproducibly from a committed experiment:

```sh
node scripts/sync-learning-machines.mjs /path/to/learning-machines <full-commit-sha>
node scripts/test-learning-machines.mjs
```

Review the teaching assumptions and source revisions when updating. The experiment repository is public. The website serves the pinned module, MIT license notice and provenance locally. The rest of this website is not relicensed by that notice.

### Source links on every companion page

The collection index links to the Learning Machines repository. Every concept page links to its experiment directory **at the full mechanics commit in its pin manifest**, that exact commit's GitHub page, and the locally served integrity manifest. Link text must identify the experiment. Never link a published explanation only to a moving branch.

When updating mechanics, run the sync command; it also updates both experiment/commit links to the manifest commit. Then run the Learning Machines checks. Before publishing, verify those remote links resolve with the intended audience's access. Keep any private/unpushed status explicit until it actually changes. Remove an unpushed notice only after verifying the push, and change access wording only after visibility is confirmed.

### Token study (#1)

`/learning-machines/tokens/` uses a fixed, verified `cl100k_base` token fixture,
not an arbitrary-input tokenizer or a live model. Everything after the IDs is a
hand-authored teaching model, and every number shown is computed from the step
before it: a piece's card of notes, what the last piece hears from earlier
pieces, what it works out, the score of each candidate and the next-token
probabilities. The page is one scroll story that follows the last piece. The
reader can swap who is in the sentence and what they did, cover words, turn the
path figure and choose the next piece (greedy or seeded sampling, at most two
new tokens); the grouped “all other tokens” result stops outside the fixture
without inventing a token ID. Every step is reader-initiated; there is no
autoplay. The default worked example remains readable without JavaScript.
Attention and memory is study #2 and picks up the same cards.

```sh
node scripts/sync-token-study.mjs /path/to/learning-machines <full-commit-sha>
node scripts/render-token-study.mjs --check
node scripts/test-token-study.mjs
node scripts/test-learning-machines.mjs
node scripts/test-learning-visuals.mjs
```

The token integrity manifest pins both `mechanics.mjs` and `fixture.mjs`, plus
the MIT notice. Regenerate token fixtures in the experiment repository first;
never hand-edit token IDs in the website copy.

`render.mjs` turns mechanics values into HTML strings and never touches the
DOM, so the same code draws the live page and the static blocks between the
`<!--R:name-->` markers in `index.html`. The sync script re-renders those
blocks; run `node scripts/render-token-study.mjs` after editing `render.mjs`.
`page.mjs` only holds reader state and events.

### Learning Machines / 03

The manifolds article is at `learning-machines/manifolds/`. See its README for
panel semantics, offline/static fallbacks and the committed-source sync command.
Run `node scripts/test-manifolds.mjs` alongside the existing regression scripts.
