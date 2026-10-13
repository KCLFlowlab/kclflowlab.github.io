"""Create a portable, self-contained preview and a clean website source archive."""
from pathlib import Path
import base64
import mimetypes
import re
import zipfile

root = Path(__file__).resolve().parents[1]
site = root / 'site'
html = (site / 'index.html').read_text()
css = (site / 'styles.css').read_text()
js = (site / 'app.js').read_text()

def embed(match):
    relative = match.group(0)
    path = site / relative
    mime = mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
    return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

# Embed only this package's static asset literals, not external reference URLs.
pattern = r'(?<![A-Za-z0-9_./-])assets/[a-zA-Z0-9_.-]+\.(?:png|jpg|svg|mp4|woff2|json)'
html = re.sub(pattern, embed, html)
js = re.sub(pattern, embed, js)
css = re.sub(pattern, embed, css)
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '\n</style>')
# Keep initialization after the parsed document; inline defer scripts execute immediately.
html = html.replace('<script defer src="app.js"></script>', '')
html = html.replace('</body>', '<script>\n' + js + '\n</script>\n</body>')
(root / 'preview.html').write_text(html)

members = [p for folder in ['site', '.github', 'tools'] for p in (root / folder).rglob('*')
           if p.is_file() and 'node_modules' not in p.parts and '__pycache__' not in p.parts]
members += [root / name for name in ['README.md', 'SITE_PLAN.md', 'asset-manifest.json', '.gitignore', 'preview.html']]
with zipfile.ZipFile(root / 'kclflowlab-website.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for p in sorted(members):
        archive.write(p, p.relative_to(root))
print(f'Self-contained preview: {(root / "preview.html").stat().st_size:,} bytes')
print(f'Source archive: {(root / "kclflowlab-website.zip").stat().st_size:,} bytes; {len(members)} files')
