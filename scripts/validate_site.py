from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SITE_DIR = ROOT / "docs"
INDEX_FILE = SITE_DIR / "index.html"


class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_title = False
        self.title = []
        self.has_h1 = False
        self.local_links = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "h1":
            self.has_h1 = True
        for attribute in ("href", "src"):
            value = attributes.get(attribute)
            if value and is_local_reference(value):
                self.local_links.append(value)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title.append(data)


def is_local_reference(target: str) -> bool:
    if target.startswith(("#", "mailto:", "tel:")):
        return False
    parsed = urlparse(target)
    return not parsed.scheme and not target.startswith("//")


def resolve_site_path(target: str) -> Path:
    site_root = SITE_DIR.resolve()
    target_path = target.lstrip("/")
    resolved = (site_root / target_path).resolve()
    try:
        resolved.relative_to(site_root)
    except ValueError as exc:
        raise ValueError(f"{target} must stay within docs/.") from exc
    return resolved


def main() -> None:
    required_files = [INDEX_FILE, SITE_DIR / "style.css", SITE_DIR / "CNAME"]
    missing_files = [str(path.relative_to(ROOT)) for path in required_files if not path.exists()]
    if missing_files:
        raise SystemExit(f"Missing required site files: {', '.join(missing_files)}")

    content = INDEX_FILE.read_text(encoding="utf-8")
    if not content.lstrip().lower().startswith("<!doctype html>"):
        raise SystemExit("docs/index.html must start with <!DOCTYPE html>.")

    parser = SiteParser()
    parser.feed(content)

    if not "".join(parser.title).strip():
        raise SystemExit("docs/index.html must include a non-empty <title>.")
    if not parser.has_h1:
        raise SystemExit("docs/index.html must include an <h1>.")

    missing_assets = []
    for target in parser.local_links:
        try:
            asset_path = resolve_site_path(target)
        except ValueError:
            missing_assets.append(target)
            continue
        if not asset_path.exists():
            missing_assets.append(target)
    if missing_assets:
        raise SystemExit(f"docs/index.html references missing local assets: {', '.join(sorted(set(missing_assets)))}")

    cname = (SITE_DIR / "CNAME").read_text(encoding="utf-8").strip()
    if not cname or "." not in cname:
        raise SystemExit("docs/CNAME must contain the configured domain.")

    print("Site validation passed.")


if __name__ == "__main__":
    main()
