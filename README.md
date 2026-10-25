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
