# stethem.com

Personal site via GitHub Pages.

## What is included

- A minimal static site in `/docs`
- A custom domain declaration in `/docs/CNAME`
- A GitHub Actions workflow that:
  - runs lightweight validation on every push and pull request
  - deploys to GitHub Pages automatically after successful validation on pushes to the default branch

## Local validation

```bash
python scripts/validate_site.py
```
