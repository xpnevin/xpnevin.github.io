"""Validate the static site without installing any packages or accessing the web."""
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.ids = set()
        self.refs = []
        self.labels = []
        self.errors = []
        self.json_text = None
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            if attrs["id"] in self.ids:
                self.errors.append(f"Duplicate ID: {attrs['id']}")
            self.ids.add(attrs["id"])
        for attr in ("src", "href", "action"):
            if attrs.get(attr):
                self.refs.append(attrs[attr])
        if attrs.get("srcset"):
            self.refs.extend(part.strip().split()[0] for part in attrs["srcset"].split(","))
        if tag == "label" and attrs.get("for"):
            self.labels.append(attrs["for"])
        if tag == "img" and "alt" not in attrs:
            self.errors.append("Image is missing alt text")
        if attrs.get("target") == "_blank":
            if not {"noopener", "noreferrer"} <= set(attrs.get("rel", "").split()):
                self.errors.append("External new-tab link is missing safe rel attributes")
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self.json_text = ""

    def handle_data(self, data):
        if self.json_text is not None:
            self.json_text += data

    def handle_endtag(self, tag):
        if tag == "script" and self.json_text is not None:
            try:
                json.loads(self.json_text)
            except ValueError as error:
                self.errors.append(f"Invalid structured data: {error}")
            self.json_text = None


pages = {path.name: Page(path) for path in ROOT.glob("*.html")}
errors = []
for name, page in pages.items():
    for label in page.labels:
        if label not in page.ids:
            page.errors.append(f"Label points to missing input: {label}")
    for ref in page.refs:
        url = urlsplit(ref)
        if url.scheme or url.netloc:
            continue
        target = ROOT / unquote(url.path) if url.path else page.path
        if not target.is_file():
            page.errors.append(f"Missing local file: {ref}")
        if url.fragment and target.suffix == ".html":
            target_page = pages.get(target.name)
            if not target_page or unquote(url.fragment) not in target_page.ids:
                page.errors.append(f"Broken anchor: {ref}")
    errors.extend(f"{name}: {error}" for error in page.errors)

for css in (ROOT / "assets/css").glob("*.css"):
    for ref in re.findall(r'url\([\'\"]?([^\)\'\"]+)', css.read_text()):
        if urlsplit(ref).scheme:
            continue
        if not (css.parent / ref).is_file():
            errors.append(f"{css.name}: missing asset {ref}")

if errors:
    raise SystemExit("\n".join(errors))
print(f"Static validation passed: {len(pages)} pages; local assets, anchors, labels and structured data are valid.")
