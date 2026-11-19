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


const id='mfeedback0001',payload=record(id);
ok((await call('/api/mobile-records','POST',payload)).status===200,'initial family saved');
const original=sqlite.prepare('SELECT * FROM mobile_records WHERE id=?').get(id);
const sent=await call('/api/mobile-records','POST',{...payload,feedback:'  아이와 함께해서 즐거웠어요.  ',name:'ignored',email:'ignored'});
ok(sent.status===200&&sent.body.feedbackSaved,'feedback attaches to the saved family');
const attached=sqlite.prepare('SELECT * FROM mobile_records WHERE id=?').get(id),after=JSON.parse(attached.data);
ok(sqlite.prepare('SELECT COUNT(*) n FROM mobile_records').get().n===1,'same family stays one row');
ok(after.feedback.comment==='아이와 함께해서 즐거웠어요.'&&Number.isFinite(Date.parse(after.feedback.submittedAt)),'comment and server time stored');
const {feedback,...withoutFeedback}=after;
ok(JSON.stringify(withoutFeedback)===original.data&&attached.created===original.created,'all original answers, metadata and creation time preserved');
ok(!('name' in after)&&!('email' in after),'no personal-detail fields accepted');
const repeated=await call('/api/mobile-records','POST',{...payload,feedback:'아이와 함께해서 즐거웠어요.'});
ok(repeated.status===200&&repeated.body.feedback.submittedAt===feedback.submittedAt,'safe retry keeps original feedback time');
ok(sqlite.prepare('SELECT data FROM mobile_records WHERE id=?').get(id).data===attached.data,'retry changes nothing');
ok((await call('/api/mobile-records','POST',{...payload,feedback:'다른 소감'})).status===409,'a submitted comment cannot be overwritten');
const other=record('mfeedback0002');await call('/api/mobile-records','POST',other);
const changedAnswers=structuredClone(other);changedAnswers.child.answers[0].choice='B';
ok((await call('/api/mobile-records','POST',{...changedAnswers,feedback:'wrong family answers'})).status===409,'feedback cannot replace an answer');
ok((await call('/api/mobile-records','POST',{...other,test:true,feedback:'wrong mode'})).status===409,'test flag cannot be changed through feedback');
for(const feedback of ['', '  ',null,{comment:'x'},'긴'.repeat(301)])ok((await call('/api/mobile-records','POST',{...other,feedback})).status===400,'invalid comment rejected');
const pair=await Promise.all(['첫 소감','두 번째 소감'].map(feedback=>call('/api/mobile-records','POST',{...other,feedback})));
ok(pair.filter(r=>r.status===200).length===1&&pair.filter(r=>r.status===409).length===1,'concurrent comments attach only once');
const untouched=JSON.parse(sqlite.prepare('SELECT data FROM mobile_records WHERE id=?').get(other.id).data);
ok(untouched.child.answers[0].choice==='A'&&!untouched.test,'original choices and mode remain after race');
const testPayload=record('mfeedbacktest01',{test:true});
const withInitial=await call('/api/mobile-records','POST',{...testPayload,feedback:'검수용 소감'});
ok(withInitial.status===200&&withInitial.body.feedbackSaved,'initial feedback uses existing record endpoint');
ok(JSON.parse(sqlite.prepare('SELECT data FROM mobile_records WHERE id=?').get(testPayload.id).data).test,'test feedback remains test data');
console.log(count+' mobile feedback backend checks passed; same table and one family row.');
