"""Create two linked, self-contained previews and a clean website source archive."""
from pathlib import Path
import base64
import mimetypes
import re
import zipfile

root = Path(__file__).resolve().parents[1]
site = root / 'site'
previews = [('index.html', 'preview.html'), ('sculpture.html', 'preview-sculpture.html')]

def embed(match):
    relative = match.group(0)
    path = site / relative
    mime = mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
    return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

# Embed only this package's static asset literals, not external reference URLs.
pattern = r'(?<![A-Za-z0-9_./-])assets/[a-zA-Z0-9_.-]+\.(?:png|jpg|svg|mp4|woff2|json)'
for source, output in previews:
    html = (site / source).read_text()
    scripts = []
    for filename in re.findall(r'<script defer src="([a-z-]+\.js)"></script>', html):
        scripts.append((site / filename).read_text())
        html = html.replace(f'<script defer src="{filename}"></script>', '')
    for filename in re.findall(r'<link rel="stylesheet" href="([a-z-]+\.css)">', html):
        html = html.replace(f'<link rel="stylesheet" href="{filename}">', '<style>\n' + (site / filename).read_text() + '\n</style>')
    # Keep initialization after the parsed document; inline defer executes immediately.
    html = html.replace('</body>', '<script>\n' + '\n'.join(scripts) + '\n</script>\n</body>')
    html = re.sub(pattern, embed, html)
    html = html.replace('href="./"', 'href="preview.html"').replace('href="sculpture.html"', 'href="preview-sculpture.html"')
    (root / output).write_text(html)
    print(f'Self-contained preview {output}: {(root / output).stat().st_size:,} bytes')

members = [p for folder in ['site', '.github', 'tools'] for p in (root / folder).rglob('*')
           if p.is_file() and 'node_modules' not in p.parts and '__pycache__' not in p.parts]
members += [root / name for name in ['README.md', 'SITE_PLAN.md', 'asset-manifest.json', '.gitignore'] + [output for _, output in previews]]
with zipfile.ZipFile(root / 'kclflowlab-website.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for p in sorted(members):
        archive.write(p, p.relative_to(root))
print(f'Source archive: {(root / "kclflowlab-website.zip").stat().st_size:,} bytes; {len(members)} files')
