"""Build app/index.html (one self-contained file) from the editable sources in app/src/.

    python app/build.py          # writes app/index.html
    python app/build.py --check  # fails if app/index.html is out of date
"""
import re, sys, base64, pathlib
here = pathlib.Path(__file__).resolve().parent
src = here / 'src'
MIME = {'webp': 'image/webp', 'mp3': 'audio/mpeg', 'mp4': 'video/mp4', 'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'svg': 'image/svg+xml', 'gif': 'image/gif'}

def build():
    html = (src / 'index.html').read_text(encoding='utf-8')
    html = re.sub(r'<link rel="stylesheet" href="([A-Za-z0-9_-]+\.css)" data-inline>',
                  lambda m: '<style>' + (src / m.group(1)).read_text(encoding='utf-8') + '</style>', html)
    html = re.sub(r'<script src="([A-Za-z0-9_-]+\.js)" data-inline></script>',
                  lambda m: '<script>' + (src / m.group(1)).read_text(encoding='utf-8') + '</script>', html)
    missing = []
    def inline(m):
        f = src / 'assets' / m.group(1)
        if not f.exists():
            missing.append(m.group(1)); return m.group(0)
        return f'data:{MIME[f.suffix[1:].lower()]};base64,' + base64.b64encode(f.read_bytes()).decode()
    html = re.sub(r'assets/([A-Za-z0-9_\-]+\.(?:' + '|'.join(MIME) + r'))', inline, html)
    if missing:
        sys.exit('missing asset files: ' + ', '.join(sorted(set(missing))))
    return html

def lambda_safe(s): return s

if __name__ == '__main__':
    out = build(); target = here / 'index.html'
    if '--check' in sys.argv:
        ok = target.exists() and target.read_text(encoding='utf-8') == out
        print('up to date' if ok else 'app/index.html is out of date: run python app/build.py'); sys.exit(0 if ok else 1)
    target.write_text(out, encoding='utf-8')
    print(f'wrote {target} ({len(out.encode()) / 1e6:.1f} MB)')

