"""Check that a static Pages upload has its referenced local files and anchors."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
import re

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

page = Page()
page.feed((root / 'index.html').read_text())
for ref in page.refs:
    parsed = urlparse(ref)
    if parsed.scheme or parsed.netloc:
        continue
    if parsed.path:
        target = (root / unquote(parsed.path)).resolve()
        assert target.is_relative_to(root.resolve()), f'Outside site root: {ref}'
        assert target.is_file(), f'Missing asset: {ref}'
    elif parsed.fragment:
        assert parsed.fragment in page.ids, f'Broken anchor: {ref}'
for ref in re.findall(r"['\"](assets/[^'\"]+)['\"]", (root / 'app.js').read_text()):
    assert (root / ref).is_file(), f'Missing dynamic asset: {ref}'
assert (root / '.nojekyll').exists()
print(f'Passed: {len(page.ids)} unique IDs; {len(page.refs)} HTML references; dynamic assets present.')
