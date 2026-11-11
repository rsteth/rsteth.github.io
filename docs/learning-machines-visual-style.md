# Learning Machines visual language

This is a house style, not a contract. The **commitments** are the few things the tests enforce because they keep the studies honest. Everything under **defaults** is how the pages look today; change it whenever a better picture explains the idea better.

## Commitments (tested)

- **The pinned mechanics own every educational value.** Token IDs, embeddings, weights, probabilities, sampler draws, growth units and layer kinds come from the vendored modules at the commit and SHA-256 in each `mechanics-pin.json`. Presentation may compute views of those values (a tile count, a seed's draw, where a tile is first filled) but must not invent model output, measurements or benchmarks.
- **Caveats appear once.** Each study states its teaching caveats in one place; live re-renders never repeat them.
- **Exact arithmetic and provenance stay byte-stable.** The token study's calculation tables, exact equations and Sources block are generated or verified; update them deliberately.
- **It works without JavaScript.** Static explanations and fixed worked examples stay readable, controls start disabled, and anything interactive-only starts hidden.
- **Accessible by default.** Native controls, labels in HTML (or SVG text), keyboard paths for every interaction, and reduced-motion respected. Canvas art is decorative (`aria-hidden`) with the same information available as text.

## Defaults (change freely)

**Palette and type.** Warm ivory (#f6f3eb), charcoal (#302e28), muted text (#6b695f). One colour per meaning: terracotta = full attention, sage = recurrent/GDN, ochre = hybrid/converted. Space Grotesk, Inter and Space Mono.

**Texture.** Ordered (Bayer 4×4) dither for grain, in CSS masks and canvas art. It is deterministic, so pages render identically every time. Panels are plain paper with viewfinder corner brackets; no graph-paper grid behind diagrams.

**Illustrations.** Small fixed-resolution canvases enlarged with nearest-neighbour scaling; isometric 2:1 slabs. Redraw on state changes; short transitions are fine when they explain a change, and are skipped under reduced motion.

**Token study.** One scroll story with a sticky pipeline, following the last piece. A piece's row is a card: six stored numbers as dots (area = magnitude, filled = positive, ring = negative, tick = zero) beside the eight notes that can be read from them. One colour per leg of the card's journey: ochre = heard from ·on, sage = heard from the verb, terracotta = heard from who, charcoal = worked out. Listening shares are arcs. The journey is drawn as a path in a three-number view on a plain floor grid, with words and legs lighting each other up, a dashed ghost for the other subject and dotted rays for candidate directions. Scores are bars split by leg; the next-token distribution is one 100% ribbon. The word picker shows real fixture splits.

**Attention and memory.** Opens on the row of cards from study 01. Linear, countable growth tiles (one tile = the whole stack's state at 1,024 tokens), with a readout for any tile. All 64 layers in one strip with a zoom on the selected block of four. The record-versus-summary toy retells study 01's sentences and ends on a recall question both representations answer.

## Before shipping a visual change

Run every `node scripts/test-*.mjs` and `node scripts/test-market-river.cjs`. Look at it at desktop and phone width, with the keyboard, with reduced motion and with JavaScript off. Do not claim browser or device checks that were not performed.
