"""Build the single mobile page (index.html) from src/ + the original engine files copied unchanged."""
from pathlib import Path
root = Path(__file__).resolve().parent
src = root / 'src'
html = (src / 'index.src.html').read_text(encoding='utf-8')
parts = {
    '/*@ROOM_CSS@*/': (root / 'room-motion.css').read_text(encoding='utf-8'),
    '/*@MISSION_CSS@*/': (root / 'mission-motion.css').read_text(encoding='utf-8'),
    '/*@MISSION_JS@*/': (root / 'mission-motion.js').read_text(encoding='utf-8'),
    '/*@APP_CSS@*/': (src / 'app.css').read_text(encoding='utf-8'),
    '/*@SPEECH_JS@*/': (root / 'speech-input.js').read_text(encoding='utf-8'),
    '/*@HOTSPOTS_JS@*/': (root / 'room-hotspots.js').read_text(encoding='utf-8'),
    '/*@ROOM_JS@*/': (root / 'room-motion.js').read_text(encoding='utf-8'),
    '/*@APP_JS@*/': (src / 'app.js').read_text(encoding='utf-8'),
}

import json, subprocess
voice_files = sorted((root / 'assets' / 'voice').glob('*.mp3'))
voices = [f.stem for f in voice_files]
parts['/*@VOICE_LIST@*/'] = json.dumps(voices)
def secs(f):
    try:
        out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)], capture_output=True, text=True).stdout.strip()
        return round(float(out), 3)
    except Exception:
        return None
parts['/*@VOICE_SECONDS@*/'] = json.dumps({f.stem: secs(f) for f in voice_files if f.stem in ('cover', 'parent-cover')})
for k, v in parts.items():
    assert k in html, k
    assert '</script' not in v.lower() or k.endswith('CSS@*/'), k
    html = html.replace(k, v)
(root / 'index.html').write_text(html, encoding='utf-8')
# 로컬 확인용: 같은 화면을 완전한 HTML 문서로 (index.html은 Claude 검토 링크에 올리는 본문)
(root / 'preview.html').write_text('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>' + html + '</body></html>', encoding='utf-8')
print('index.html', round(len(html.encode()) / 1024), 'KB')
