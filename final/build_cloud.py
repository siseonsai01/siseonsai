"""Build the reviewed source without the 31MB single-file HTML asset."""
from pathlib import Path
import shutil,json,re
root=Path(__file__).resolve().parent
src=root/'app/src'
out=root/'dist'
out.mkdir(exist_ok=True)
client=out/'client/app'
client.mkdir(parents=True,exist_ok=True)
text='\n'.join(p.read_text(encoding='utf-8') for p in src.iterdir() if p.is_file() and p.suffix in {'.html','.js','.css','.json'})
active={m for m in re.findall(r'assets/([A-Za-z0-9_\-]+\.(?:webp|mp3|mp4|png|jpg|jpeg|svg|gif|wav|json|woff2|woff|ttf))',text)}
runtime_files={p.name for p in src.iterdir() if p.is_file() and (p.suffix in {'.js','.css'} or p.name=='index.html')}
for p in client.iterdir():
    if p.is_file() and p.name not in runtime_files:p.unlink()
for name in runtime_files:shutil.copy2(src/name,client/name)
for folder,target in [(src/'egg',client/'src/egg'),(src/'assets',client/'assets')]:
    for p in folder.rglob('*'):
        if not p.is_file() or (folder.name=='assets' and p.name not in active):continue
        dest=target/p.relative_to(folder);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
(out/'server').mkdir(exist_ok=True)
shutil.copy2(root/'worker/index.js',out/'server/index.js')
(out/'.openai').mkdir(exist_ok=True)
shutil.copy2(root/'.openai/hosting.json',out/'.openai/hosting.json')
files=[p for p in (out/'client').rglob('*') if p.is_file()]
assert all(p.stat().st_size<25*1024*1024 for p in files)
assert 'final-survey-v7-20261113' in (client/'index.html').read_text(encoding='utf-8')
print('Cloud build verified:',len(files),'assets;',round(sum(p.stat().st_size for p in files)/1e6,1),'MB')

