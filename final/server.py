"""시선사이 local family workshop. Run: python server.py --port 8773"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse, json, sqlite3, secrets, time, re, threading
from contextlib import contextmanager

ROOT = Path(__file__).resolve().parent
DB = ROOT.parent.parent / 'work' / 'runtime-option-2' / 'families.sqlite3'
LOCK = threading.Lock()
ATTEMPTS = {}

@contextmanager
def database():
    DB.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB)
    db.execute('CREATE TABLE IF NOT EXISTS families (code TEXT PRIMARY KEY, data TEXT NOT NULL, updated REAL NOT NULL)')
    db.execute('CREATE TABLE IF NOT EXISTS stations (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated REAL NOT NULL)')
    try:
        with db: yield db
    finally: db.close()

def blank():
    return [dict(choice=None, reason='', point=None) for _ in range(5)]

def new_station_family(db):
    while True:
        code = ''.join(secrets.choice('0123456789') for _ in range(8))
        if not db.execute('SELECT 1 FROM families WHERE code=?', (code,)).fetchone(): break
    family = dict(revision=1, photo=None, ratio=None, photoRevision=0,
                  roles={r:dict(token=secrets.token_urlsafe(32), answers=blank(), complete=False) for r in ('child','adult')})
    db.execute('INSERT INTO families VALUES (?,?,?)', (code,json.dumps(family),time.time()))
    return code

def clean_answers(items):
    if not isinstance(items, list) or len(items) != 5: raise ValueError('다섯 답변을 확인해 주세요.')
    result = []
    for i, a in enumerate(items):
        choice = a.get('choice')
        if choice not in (None, 'A', 'B', 'unsure', 'other') or (choice == 'other' and i != 0): raise ValueError('답변을 확인해 주세요.')
        point = a.get('point')
        if point is not None:
            point = {k: max(0, min(100, float(point[k]))) for k in ('x', 'y')}
        result.append(dict(choice=choice, reason=str(a.get('reason', ''))[:180], point=point))
    return result

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, fmt, *args): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()
    def reply(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        if self.path.startswith('/api/'): return self.api('GET')
        if self.path == '/': self.path = '/app/index.html'
        # Runtime contains private answers and must never be served as files.
        if not (self.path.split('?')[0] == '/app/index.html' or self.path.split('?')[0].startswith('/app/src/')):
            return self.send_error(404)
        resolved = Path(self.translate_path(self.path)).resolve()
        if not resolved.is_relative_to(ROOT / 'app') or not resolved.is_file(): return self.send_error(404)
        return super().do_GET()
    def do_POST(self): self.api('POST')
    def do_PATCH(self): self.api('PATCH')
    def do_HEAD(self): self.send_error(405)
    def api(self, method):
        try:
            # No cross-origin writes; tablets use the same server URL.
            origin = self.headers.get('Origin')
            # HTTPS is terminated by the local tunnel; only a loopback proxy may
            # supply its public protocol. Keep the exact same-origin check.
            proxy_https = self.client_address[0] in ('127.0.0.1', '::1') and self.headers.get('X-Forwarded-Proto', '').split(',')[0].strip() == 'https'
            scheme = 'https' if proxy_https else 'http'
            if origin and origin != scheme + '://' + self.headers.get('Host', ''): return self.reply(403, {'error':'같은 작업실 주소에서 연결해 주세요.'})
            length = int(self.headers.get('Content-Length', '0'))
            if length > 2500000: return self.reply(413, {'error':'사진이 너무 커요.'})
            payload = json.loads(self.rfile.read(length)) if length else {}
            with LOCK, database() as db:
                db.execute('DELETE FROM families WHERE updated < ?', (time.time()-86400,))
                path = self.path.split('?')[0]
                if path.startswith('/api/stations'):
                    return self.station_api(db, method, path, payload)
                role = payload.get('role')
                if method == 'POST' and path == '/api/families':
                    if role not in ('child', 'adult'): raise ValueError('책을 골라 주세요.')
                    while True:
                        code = ''.join(secrets.choice('0123456789') for _ in range(8))
                        if not db.execute('SELECT 1 FROM families WHERE code=?', (code,)).fetchone(): break
                    token = secrets.token_urlsafe(32)
                    family = dict(revision=1, photo=None, ratio=None, photoRevision=0, roles={role:dict(token=token, answers=blank(), complete=False)})
                elif method == 'POST' and path == '/api/families/join':
                    key = self.client_address[0]; now = time.time()
                    attempts = [t for t in ATTEMPTS.get(key, []) if now-t < 60]
                    if len(attempts) >= 20: return self.reply(429, {'error':'잠시 뒤 다시 연결해 주세요.'})
                    ATTEMPTS[key] = attempts + [now]
                    code = re.sub(r'[^0-9]', '', str(payload.get('code', '')))
                    row = db.execute('SELECT data FROM families WHERE code=?', (code,)).fetchone()
                    if not row: return self.reply(404, {'error':'가족 코드를 다시 확인해 주세요.'})
                    family = json.loads(row[0])
                    if role not in ('child', 'adult'): raise ValueError('책을 골라 주세요.')
                    if role in family['roles']: return self.reply(409, {'error':'그 책은 이미 열려 있어요. 다른 책을 골라 주세요.'})
                    token = secrets.token_urlsafe(32)
                    family['roles'][role] = dict(token=token, answers=blank(), complete=False)
                    family['revision'] += 1
                else:
                    match = re.fullmatch(r'/api/families/(\d{8})', path)
                    if not match: return self.reply(404, {'error':'연결 주소를 찾지 못했어요.'})
                    code = match[1]
                    row = db.execute('SELECT data FROM families WHERE code=?', (code,)).fetchone()
                    if not row: return self.reply(404, {'error':'가족 연결이 만료됐어요. 새 책을 열어 주세요.'})
                    family = json.loads(row[0]); token = self.headers.get('Authorization', '').removeprefix('Bearer ')
                    role = next((r for r, info in family['roles'].items() if secrets.compare_digest(info['token'], token)), None)
                    if not role: return self.reply(403, {'error':'이 기기의 가족 연결을 확인해 주세요.'})
                    if method == 'PATCH':
                        own = family['roles'][role]
                        if payload.get('started'): own['started'] = True
                        if 'answers' in payload: own['answers'] = clean_answers(payload['answers'])
                        if 'complete' in payload:
                            if payload['complete'] and any(not a['choice'] for a in own['answers']): raise ValueError('모든 페이지에서 하나씩 골라 주세요.')
                            own['complete'] = bool(payload['complete'])
                        if 'photo' in payload:
                            if any(item.get('started') or any(a['choice'] for a in item['answers']) for item in family['roles'].values()): raise ValueError('책을 펼친 뒤에는 방 사진을 바꿀 수 없어요.')
                            photo = payload['photo']
                            if photo is not None and not re.fullmatch(r'data:image/(?:jpeg|png);base64,[A-Za-z0-9+/=]+', photo): raise ValueError('사진을 다시 골라 주세요.')
                            family.update(photo=photo, ratio=payload.get('ratio'), photoRevision=family['photoRevision']+1)
                        family['revision'] += 1
                    elif method != 'GET': return self.reply(405, {'error':'지원하지 않는 요청이에요.'})
                db.execute('INSERT OR REPLACE INTO families VALUES (?,?,?)', (code, json.dumps(family), time.time()))
                both = len(family['roles']) == 2 and all(v['complete'] for v in family['roles'].values())
                result = dict(code=code, role=role, revision=family['revision'], photoRevision=family['photoRevision'], photoLocked=any(item.get('started') or any(a['choice'] for a in item['answers']) for item in family['roles'].values()), ratio=family['ratio'], ownAnswers=family['roles'][role]['answers'], complete=family['roles'][role]['complete'], bothComplete=both, peers={r:dict(connected=True, complete=v['complete']) for r,v in family['roles'].items()})
                if method == 'POST': result['token'] = token
                query = self.path.partition('?')[2]
                if f'photoRevision={family["photoRevision"]}' not in query: result['photo'] = family['photo']
                if both: result['answers'] = {r:v['answers'] for r,v in family['roles'].items()}
                self.reply(200, result)
        except (ValueError, KeyError, TypeError): self.reply(400, {'error':'입력 내용을 다시 확인해 주세요.'})
        except Exception: self.reply(500, {'error':'저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.'})

    def station_api(self, db, method, path, payload):
        """Persistent device pairing; each round owns a separate family and tokens."""
        now=time.time()
        db.execute('DELETE FROM stations WHERE updated < ?', (now-86400,))
        fresh=False
        if method=='POST' and path=='/api/stations':
            sid=secrets.token_hex(12); role='adult'; fresh=True
            pair=''.join(secrets.choice('0123456789') for _ in range(8))
            station=dict(round=1,code=new_station_family(db),pair=pair,pairUntil=now+600,
                         tokens={'adult':secrets.token_urlsafe(32)},connected={'adult':True,'child':False})
        elif method=='POST' and path=='/api/stations/join':
            key=self.client_address[0]+'-station'; attempts=[t for t in ATTEMPTS.get(key,[]) if now-t<60]
            if len(attempts)>=20:return self.reply(429,{'error':'잠시 뒤 다시 연결해 주세요.'})
            ATTEMPTS[key]=attempts+[now]
            pair=re.sub(r'[^0-9]','',str(payload.get('code','')))
            found=[]
            for candidate,data in db.execute('SELECT id,data FROM stations'):
                item=json.loads(data)
                if secrets.compare_digest(item.get('pair',''),pair) and len(pair)==8 and item['pairUntil']>now and not item['connected']['child']:
                    found.append((candidate,item))
            if len(found)!=1:return self.reply(404,{'error':'준비 화면의 연결 번호를 다시 확인해 주세요. 번호는 10분 동안 사용할 수 있어요.'})
            sid,station=found[0];role='child';fresh=True
            station['tokens'][role]=secrets.token_urlsafe(32);station['connected'][role]=True;station['pair']=''
        else:
            match=re.fullmatch(r'/api/stations/([a-f0-9]{24})',path)
            if not match:return self.reply(404,{'error':'현장 연결 주소를 확인해 주세요.'})
            sid=match[1];row=db.execute('SELECT data FROM stations WHERE id=?',(sid,)).fetchone()
            if not row:return self.reply(404,{'error':'현장 연결이 만료됐어요. 진행자가 다시 준비해 주세요.'})
            station=json.loads(row[0]);token=self.headers.get('Authorization','').removeprefix('Bearer ')
            role=next((r for r,t in station['tokens'].items() if secrets.compare_digest(t,token)),None)
            if not role:return self.reply(403,{'error':'이 태블릿의 현장 연결을 확인해 주세요.'})
            if method=='PATCH':
                if role!='adult':return self.reply(403,{'error':'부모님 쪽 진행자 화면에서 다음 가족을 시작해 주세요.'})
                if payload.get('next') or payload.get('begin'):
                    if not station['connected']['child']:return self.reply(409,{'error':'태블릿 두 대를 먼저 연결해 주세요.'})
                    if payload.get('round')!=station['round']:
                        return self.reply(409,{'error':'이미 다음 가족으로 바뀌었어요. 화면을 다시 확인해 주세요.'})
                    station['code']=new_station_family(db);station['round']+=1;station['readyRound']=station['round']
                elif payload.get('renew') and not station['connected']['child']:
                    station['pair']=''.join(secrets.choice('0123456789') for _ in range(8));station['pairUntil']=now+600
                else:raise ValueError('현장 요청을 확인해 주세요.')
            elif method!='GET':return self.reply(405,{'error':'지원하지 않는 요청이에요.'})
        row=db.execute('SELECT data FROM families WHERE code=?',(station['code'],)).fetchone()
        if not row:return self.reply(410,{'error':'가족 기록이 만료됐어요. 현장 연결을 다시 준비해 주세요.'})
        family=json.loads(row[0]);both=all(v['complete'] for v in family['roles'].values())
        own=family['roles'][role]
        view=dict(code=station['code'],role=role,token=own['token'],revision=family['revision'],photoRevision=family['photoRevision'],
                  photo=None,ratio=None,photoLocked=True,ownAnswers=own['answers'],complete=own['complete'],bothComplete=both,
                  peers={r:dict(connected=station['connected'][r],complete=v['complete']) for r,v in family['roles'].items()})
        if both:view['answers']={r:v['answers'] for r,v in family['roles'].items()}
        result=dict(id=sid,role=role,round=station['round'],connected=station['connected'],prepared=station.get('readyRound')==station['round'],family=view)
        if role=='adult' and not station['connected']['child']:result.update(pairCode=station['pair'],pairExpires=station['pairUntil'])
        if fresh:result['token']=station['tokens'][role]
        db.execute('INSERT OR REPLACE INTO stations VALUES (?,?,?)',(sid,json.dumps(station),now))
        db.execute('UPDATE families SET updated=? WHERE code=?',(now,station['code']))
        return self.reply(200,result)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--port', type=int, default=8773); parser.add_argument('--bind', default='0.0.0.0')
    args = parser.parse_args()
    print(f'시선사이 작업실: http://127.0.0.1:{args.port}/app/index.html', flush=True)
    ThreadingHTTPServer((args.bind, args.port), Handler).serve_forever()
