# stethem.com

Personal site via GitHub Pages.

## What is included

- A static homepage at the repository root
- A custom domain declaration in `CNAME`
- A `verbosele/` Git submodule published under `/verbosele/`
- A GitHub Actions workflow that:
  - runs lightweight validation on every push and pull request
  - checks out submodules
  - builds a clean `_site` artifact from the root homepage and Verbosele
  - deploys to GitHub Pages automatically after successful validation on pushes to the default branch

## Local validation

```bash
python scripts/validate_site.py
```
