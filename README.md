# stethem.com

Personal site via GitHub Pages.

## What is included

- A static project grid at the repository root
- Full Invisible Objects essays and photo sequences under `/objects/`
- A Market River archive at `/market-river/`, showing up to nine recent snapshots
- A custom domain declaration in `CNAME`
- A `verbosele/` Git submodule published under `/verbosele/`

GitHub Pages should be configured to deploy from the default branch using the repository root.

Market River uses the public base URL in `script.js`: the homepage reads
`manifests/latest.json`, and the archive reads `manifests/recent.json`. Records
are grouped by date and slot before selecting a weather variant and limiting
the display to nine snapshots.

Run the manifest and rendering regression checks with `node scripts/test-market-river.cjs`.

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
not an arbitrary-input tokenizer or a live model. Embeddings and probabilities
are explicitly illustrative. The page is one scroll story: every section follows one
selected piece, and section 03 chooses the next piece (greedy or seeded
sampling, at most two new tokens); the grouped “all other tokens” result stops
outside the fixture without inventing a token ID. Every step is reader-initiated;
there is no autoplay.
HTML explanations and the worked example remain readable without JavaScript
or canvas. Attention and memory is study #2; its URL is unchanged.

```sh
node scripts/sync-token-study.mjs /path/to/learning-machines <full-commit-sha>
node scripts/test-token-study.mjs
node scripts/test-learning-machines.mjs
node scripts/test-learning-visuals.mjs
```

The token integrity manifest pins both `mechanics.mjs` and `fixture.mjs`, plus
the MIT notice. Regenerate token fixtures in the experiment repository first;
never hand-edit token IDs in the website copy.

The token study keeps the active diagram, context strip and controls in one
card. The five stages visibly change the scene; selected token labels remain
attached to their rows, while next-token prediction explicitly uses the last
position. The longer approved explanation remains below. Run
`node scripts/test-token-flow.mjs` for flow/provenance-boundary regressions.

Section 00 owns the token interactive. Sections 01–04 retain fixed worked
examples independently of the stepper. Section 04’s SVG artwork is generated from
the pinned fixture through the existing renderer and remains visible without
JavaScript or canvas. Rebuild it with `node scripts/render-token-examples.mjs`;
verify with `node scripts/render-token-examples.mjs --check`.

Token teaching diagrams: run `node scripts/render-token-explanations.mjs --check` and `node scripts/test-token-explanations.mjs`. Sections 01–02 use server-generated HTML from the same pinned, explicitly hand-authored causal toy as the interactive. No model is run; next-token probabilities remain separately supplied.

### Learning Machines / 03

The manifolds article is at `learning-machines/manifolds/`. See its README for
panel semantics, offline/static fallbacks and the committed-source sync command.
Run `node scripts/test-manifolds.mjs` alongside the existing regression scripts.
