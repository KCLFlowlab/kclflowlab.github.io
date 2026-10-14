"""Check that a static Pages upload has its referenced local files and anchors."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
import re
import json
import hashlib
import math

root = Path(__file__).resolve().parents[1] / 'site'

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.refs = set(), []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, f'Duplicate id: {attrs["id"]}'
            self.ids.add(attrs['id'])
        self.refs.extend(attrs[key] for key in ('href', 'src', 'poster') if key in attrs)

pages = {}
for file in sorted(root.glob('*.html')):
    page = Page()
    page.feed(file.read_text())
    pages[file.resolve()] = page
for file, page in pages.items():
    for ref in page.refs:
        parsed = urlparse(ref)
        if parsed.scheme or parsed.netloc:
            continue
        target = (file.parent / unquote(parsed.path)).resolve() if parsed.path else file
        if target.is_dir():
            target = target / 'index.html'
        assert target.is_relative_to(root.resolve()), f'Outside site root: {ref}'
        assert target.is_file(), f'Missing asset in {file.name}: {ref}'
        if parsed.fragment and target in pages:
            assert parsed.fragment in pages[target].ids, f'Broken anchor in {file.name}: {ref}'
for script in root.glob('*.js'):
    for ref in re.findall(r"['\"](assets/[^'\"]+)['\"]", script.read_text()):
        assert (root / ref).is_file(), f'Missing dynamic asset in {script.name}: {ref}'
for stylesheet in root.glob('*.css'):
    for ref in re.findall(r"url\(['\"]?(assets/[^)'\"]+)", stylesheet.read_text()):
        assert (root / ref).is_file(), f'Missing stylesheet asset in {stylesheet.name}: {ref}'
manifest = json.loads((root.parent / 'asset-manifest.json').read_text())
for asset in manifest['assets']:
    data = (root.parent / asset['file']).read_bytes()
    assert len(data) == asset['bytes'], f'Changed asset size: {asset["file"]}'
    assert hashlib.sha256(data).hexdigest() == asset['sha256'], f'Changed asset hash: {asset["file"]}'
field = json.loads((root / 'assets/flow-field.json').read_text())
for component in ('u', 'v', 'omega'):
    assert len(field[component]) == field['nx'] * field['ny']
    assert all(math.isfinite(value) for value in field[component])
assert (root / '.nojekyll').exists()
print(f'Passed: {len(pages)} pages; {sum(len(p.ids) for p in pages.values())} per-page unique IDs; {sum(len(p.refs) for p in pages.values())} HTML references; CSS/JS assets; {len(manifest["assets"])} verified hashes; finite velocity display grid.')
