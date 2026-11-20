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


const id='msatisfy0001',base=record(id),scores={ease:5,conversation:4,reuse:3};
ok((await call('/api/mobile-records','POST',base)).status===200,'save family first');
const original=sqlite.prepare('SELECT * FROM mobile_records WHERE id=?').get(id);
const response=await call('/api/mobile-records','POST',{...base,satisfaction:{...scores,name:'ignored',email:'ignored',submittedAt:'1900-01-01'}});
ok(response.status===200&&response.body.satisfactionSaved,'satisfaction attaches to same record');
const row=sqlite.prepare('SELECT * FROM mobile_records WHERE id=?').get(id),stored=JSON.parse(row.data);
ok(sqlite.prepare('SELECT COUNT(*) n FROM mobile_records').get().n===1,'one family remains one row');
const {satisfaction,...unchanged}=stored;
ok(JSON.stringify(unchanged)===original.data&&row.created===original.created,'all answers and metadata unchanged');
ok(satisfaction.ease===5&&satisfaction.conversation===4&&satisfaction.reuse===3&&satisfaction.comment==='','three numeric scores, empty optional comment accepted');
ok(!('name'in satisfaction)&&!('email'in satisfaction)&&satisfaction.submittedAt!=='1900-01-01','personal fields discarded and time set by server');
const repeat=await call('/api/mobile-records','POST',{...base,satisfaction:scores});
ok(repeat.body.satisfaction.submittedAt===satisfaction.submittedAt&&sqlite.prepare('SELECT data FROM mobile_records WHERE id=?').get(id).data===row.data,'idempotent retry changes nothing');
ok((await call('/api/mobile-records','POST',{...base,satisfaction:{...scores,ease:4}})).status===409,'sent scores cannot be overwritten');
const modified=structuredClone(base);modified.child.answers[0].choice='B';
ok((await call('/api/mobile-records','POST',{...modified,satisfaction:scores})).status===409,'cannot replace family answers');
ok((await call('/api/mobile-records','POST',{...base,test:true,satisfaction:scores})).status===409,'cannot change test flag');
for(const bad of [null,[],{}, {...scores,ease:0},{...scores,ease:6},{...scores,ease:'5'},{...scores,ease:2.5},{...scores,conversation:null},{...scores,comment:null},{...scores,comment:'x'.repeat(301)}])ok((await call('/api/mobile-records','POST',{...record('msatisfybad01'),satisfaction:bad})).status===400,'invalid satisfaction rejected');
ok(!sqlite.prepare('SELECT id FROM mobile_records WHERE id=?').get('msatisfybad01'),'invalid submission creates no family row');
const test=record('msatisfytest01',{test:true});
const first=await call('/api/mobile-records','POST',{...test,satisfaction:{ease:1,conversation:2,reuse:5,comment:'  검수용 의견  '}});
ok(first.status===200&&first.body.satisfaction.comment==='검수용 의견'&&JSON.parse(sqlite.prepare('SELECT data FROM mobile_records WHERE id=?').get(test.id).data).test,'initial test satisfaction saved with trimmed comment');
const mixed=record('msatisfyboth01');await call('/api/mobile-records','POST',mixed);
const pair=await Promise.all([call('/api/mobile-records','POST',{...mixed,feedback:'기존 소감'}),call('/api/mobile-records','POST',{...mixed,satisfaction:scores})]);
if(pair[0].status===409)pair[0]=await call('/api/mobile-records','POST',{...mixed,feedback:'기존 소감'});
if(pair[1].status===409)pair[1]=await call('/api/mobile-records','POST',{...mixed,satisfaction:scores});
const both=JSON.parse(sqlite.prepare('SELECT data FROM mobile_records WHERE id=?').get(mixed.id).data);
ok(pair.every(r=>r.status===200)&&both.feedback.comment==='기존 소감'&&both.satisfaction.ease===5,'old comment and satisfaction coexist without loss');
const racing=record('msatisfyrace01');await call('/api/mobile-records','POST',racing);
const raced=await Promise.all([3,4].map(ease=>call('/api/mobile-records','POST',{...racing,satisfaction:{...scores,ease}})));
ok(raced.filter(r=>r.status===200).length===1&&raced.filter(r=>r.status===409).length===1,'conflicting concurrent scores attach once');
console.log(count+' satisfaction backend checks passed; existing table and answers preserved.');
