// 모바일 한 대 설문(/api/mobile-records) 서버 검사. 실제 운영 자료에는 연결하지 않습니다.
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
const sqlite=new DatabaseSync(':memory:');
for(const f of ['0000_family_workshop','0001_fixed_tablet_links','0002_mobile_records'])
  sqlite.exec(fs.readFileSync(new URL(`../drizzle/${f}.sql`,import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));
class Statement{
  constructor(sql,args=[]){this.sql=sql;this.args=args;}
  bind(...args){return new Statement(this.sql,args);}
  async first(){return sqlite.prepare(this.sql).get(...this.args)??null;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async run(){return {meta:{changes:Number(sqlite.prepare(this.sql).run(...this.args).changes)}};}
}
const DB={prepare:s=>new Statement(s),async batch(items){const r=[];for(const s of items)r.push(await s.run());return r;}};
let ip=0;
async function call(path,method='GET',data,{auth,origin,raw,sameIp}={}){
  const headers={...(auth?{authorization:'Bearer '+auth}:{}),...(origin?{origin}:{}),'cf-connecting-ip':sameIp||('10.0.0.'+(++ip))};
  const body=raw!==undefined?raw:data!==undefined?JSON.stringify(data):undefined;
  const r=await worker.fetch(new Request('https://test.example'+path,{method,headers,...(body!==undefined?{body}:{})}),{DB,ASSETS:{fetch:req=>new Response('asset '+new URL(req.url).pathname,{headers:{'content-type':'text/html'}})}},{waitUntil:p=>p.catch(()=>{})});
  const text=await r.text();let json=null;try{json=JSON.parse(text);}catch{}
  return {status:r.status,body:json,text,headers:r.headers};
}
let count=0;const ok=(v,label)=>{assert.ok(v,label);count++;};
const answers=(choices,role)=>choices.map((choice,i)=>({q:i+1,title:'제목'+(i+1),choice,label:role+' 보기 '+choice,reason:i===1?'=HYPERLINK("x")':'이유',point:i===0?{x:12.345,y:150}:null,toy:i===0?'기차':''}));
const record=(id,extra={})=>({id,surveyVersion:'mobile-v1',sourceRelease:'test',stimulus:'s',mode:'one-phone',test:false,startedAt:'2026-11-20T01:00:00.000Z',finishedAt:'2026-11-20T01:12:00.000Z',
  child:{code:'FVMB',name:'벼락치기 몽상가 토끼',answers:answers(['A','A','A','A','A'],'아이')},adult:{code:'PVSD',name:'각각각 다람쥐',answers:answers(['A','B','B','A','B'],'부모')},...extra});

// 1) 저장과 중복 방지
const first=await call('/api/mobile-records','POST',record('mabc12345xyz'));
ok(first.status===200&&first.body.ok&&!first.body.duplicate,'mobile record saved');
const again=await call('/api/mobile-records','POST',record('mabc12345xyz'));
ok(again.status===200&&again.body.duplicate,'same id is stored once (safe retry)');
ok(sqlite.prepare('SELECT COUNT(*) n FROM mobile_records').get().n===1,'one row after retry');
const saved=JSON.parse(sqlite.prepare('SELECT data FROM mobile_records').get().data);
ok(saved.child.answers[0].point.y===100&&saved.child.answers[0].point.x===12.3,'point clamped and rounded');
ok(saved.adult.name==='각각각 다람쥐'&&saved.child.answers[1].label==='아이 보기 A','labels and friend names kept for export');
ok(!('token' in saved)&&saved.mode==='one-phone','no extra fields stored');

// 2) 잘못된 입력 거절
const bad=async(rec,label,status=400)=>ok((await call('/api/mobile-records','POST',rec)).status===status,label);
await bad(record('bad id'),'invalid id rejected');
await bad(record('mshort'),'too short id rejected');
await bad(record('mabc00000001',{child:{code:'XXXX',answers:answers(['A','A','A','A','A'])}}),'invalid type code rejected');
await bad(record('mabc00000002',{child:{code:'FVMB',answers:answers(['A','A','A','A'])}}),'four answers rejected');
await bad(record('mabc00000003',{adult:{code:'PVSD',answers:answers(['A','other','A','A','A'])}}),'other outside page 1 rejected');
await bad(record('mabc00000004',{adult:{code:'PVSD',answers:answers(['A',null,'A','A','A'])}}),'unfinished answers rejected');
await bad(record('mabc00000005',{startedAt:'not a date'}),'bad time rejected');
ok((await call('/api/mobile-records','POST',record('mabc00000006',{stimulus:'x'.repeat(50000)}))).status===413,'oversized body rejected');
ok((await call('/api/mobile-records','POST',record('mabc00000007'),{origin:'https://attacker.example'})).status===403,'cross-origin post denied');
ok((await call('/api/mobile-records','POST',undefined,{raw:'{nope'})).status===400,'broken json rejected');
ok((await call('/api/mobile-records','PATCH',record('mabc00000008'))).status===405,'patch not allowed');
const reason=JSON.parse(sqlite.prepare('SELECT data FROM mobile_records').get().data);ok(reason.child.answers[1].reason.length<=180,'reason length bounded');

// 3) 같은 주소에서 연달아 보내면 제한
let limited=false;for(let n=0;n<25;n++){const r=await call('/api/mobile-records','POST',record('mrate'+String(n).padStart(6,'0')),{sameIp:'9.9.9.9'});if(r.status===429)limited=true;}
ok(limited,'rate limited per address');

// 4) 내려받기: 진행자 전용 키만
ok((await call('/api/mobile-records')).status===403,'list without key denied');
ok((await call('/api/mobile-records','GET',undefined,{auth:'f'.repeat(64)})).status===403,'unknown key denied');
const st=(await call('/api/stations','POST',{})).body;await call('/api/stations/join','POST',{code:st.pairCode});
const key='e'.repeat(64);
ok((await call('/api/stations/'+st.id+'/collection-access','POST',{key},{auth:st.token})).status===200,'operator key prepared through existing flow');
const list=await call('/api/mobile-records','GET',undefined,{auth:key});
ok(list.status===200&&list.body.records.some(r=>r.id==='mabc12345xyz')&&list.body.retention==='no_automatic_deletion','operator lists mobile records');
ok(list.body.records.every(r=>typeof r.receivedAt==='number'),'received time included');
ok((await call('/api/mobile-records?cursor=bad cursor','GET',undefined,{auth:key})).status===400,'bad cursor rejected');
for(let n=0;n<230;n++)sqlite.prepare('INSERT INTO mobile_records VALUES (?,?,?)').run('mpage'+String(n).padStart(6,'0'),JSON.stringify(record('mpage'+String(n).padStart(6,'0'))),n);
const p1=(await call('/api/mobile-records','GET',undefined,{auth:key})).body,p2=(await call('/api/mobile-records?cursor='+p1.nextCursor,'GET',undefined,{auth:key})).body;
ok(p1.records.length===200&&p1.nextCursor&&p2.records.length>0&&!p2.nextCursor,'pagination');
ok(new Set([...p1.records,...p2.records].map(r=>r.id)).size===p1.records.length+p2.records.length,'pages do not overlap');

// 5) 태블릿 기록과 분리
ok(sqlite.prepare('SELECT COUNT(*) n FROM families WHERE code LIKE ?').get('m%').n===0,'mobile records never enter tablet families');
const coll=await call('/api/collections','GET',undefined,{auth:key});
ok(coll.status===200&&coll.body.records.every(r=>!String(r.id).startsWith('m')),'tablet collection unchanged');

// 6) 주소
const page=await call('/mobile/');ok(page.status===200&&page.text==='asset /mobile/index.html'&&page.headers.get('cache-control')==='no-store','mobile page served without cache');
ok((await call('/mobile')).status===302,'/mobile redirects');
ok((await call('/mobile/assets/voice/cover.mp3')).text==='asset /mobile/assets/voice/cover.mp3','mobile assets served');
ok((await call('/mobile/','POST',{})).status===405,'mobile page is read-only');
const mm=await call('/manage-mobile/'+key);ok(mm.status===302&&mm.headers.get('location').endsWith('/mobile/collect.html#access='+key),'operator shortcut');
ok((await call('/elsewhere')).status===404,'other paths still 404');
console.log('mobile records checks passed:',count);
