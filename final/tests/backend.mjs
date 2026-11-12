import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
const sqlite=new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(new URL('../drizzle/0000_family_workshop.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));
class Statement{
  constructor(sql,args=[]){this.sql=sql;this.args=args;}
  bind(...args){return new Statement(this.sql,args);}
  async first(){return sqlite.prepare(this.sql).get(...this.args)??null;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async run(){return {meta:{changes:Number(sqlite.prepare(this.sql).run(...this.args).changes)}};}
}
const DB={prepare:s=>new Statement(s),async batch(items){sqlite.exec('BEGIN');try{const result=[];for(const s of items)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
// D1 batches are serial transactions. Gate local emulation as well.
const realBatch=DB.batch.bind(DB);let tail=Promise.resolve();DB.batch=items=>{const p=tail.then(()=>realBatch(items));tail=p.catch(()=>{});return p;};
async function call(path,method='GET',data,auth,origin){
  const req=new Request('https://test.example'+path,{method,headers:{...(auth?{authorization:'Bearer '+auth}:{}),...(origin?{origin}:{})},...(data!==undefined?{body:JSON.stringify(data)}:{})});
  const r=await worker.fetch(req,{DB,ASSETS:{fetch:()=>new Response('asset')}},{waitUntil:p=>p.catch(()=>{})});return {status:r.status,body:await r.json()};
}
let count=0;const ok=(value,label)=>{assert.ok(value,label);count++;};
const a=(await call('/api/stations','POST',{})).body;
ok(a.id&&a.pairCode&&a.token,'create station');
const c=(await call('/api/stations/join','POST',{code:a.pairCode})).body;
ok(c.connected.child&&c.token&&c.family.token!==a.family.token,'independent role tokens');
ok((await call('/api/stations/join','POST',{code:a.pairCode})).status===404,'one-time pairing');
ok((await call('/api/stations/'+a.id,'GET',undefined,'bad')).status===403,'wrong station token');
ok((await call('/api/families/'+a.family.code)).status===403,'private family');
ok((await call('/api/stations/'+a.id,'PATCH',{next:true,round:1},c.token)).status===403,'child cannot advance');
ok((await call('/api/families/'+a.family.code,'PATCH',{complete:true},a.family.token)).status===400,'incomplete result refused');
const adult=Array.from({length:5},()=>({choice:'A',reason:'부모님의 이유',point:null}));
const child=Array.from({length:5},()=>({choice:'B',reason:'아이의 이유',point:null}));
const fpath='/api/families/'+a.family.code;
const results=await Promise.all([call(fpath,'PATCH',{answers:adult,complete:true},a.family.token),call(fpath,'PATCH',{answers:child,complete:true},c.family.token)]);
ok(results.every(r=>r.status===200),'simultaneous writes succeed');
const ar=(await call(fpath,'GET',undefined,a.family.token)).body,cr=(await call(fpath,'GET',undefined,c.family.token)).body;
ok(ar.bothComplete&&cr.bothComplete,'both completed');
assert.deepEqual(ar.answers,cr.answers);ok(ar.answers.adult[0].choice==='A'&&ar.answers.child[0].choice==='B','shared result includes distinct answers');
ok((await call(fpath,'PATCH',{answers:adult},a.family.token,'https://attacker.example')).status===403,'cross-origin denied');
ok((await call(fpath,'PATCH',{answers:[...adult.slice(0,4),{choice:'other'}]},a.family.token)).status===400,'invalid other choice rejected');
const next=await call('/api/stations/'+a.id,'PATCH',{next:true,round:1},a.token);
ok(next.status===200&&next.body.round===2&&next.body.family.code!==a.family.code,'next family separate');
ok((await call('/api/stations/'+a.id,'PATCH',{next:true,round:1},a.token)).status===409,'stale advance refused');
const childNext=(await call('/api/stations/'+a.id,'GET',undefined,c.token)).body;
ok(childNext.round===2&&childNext.family.ownAnswers.every(x=>!x.choice),'child follows round with blank answers');
const solo=(await call('/api/families','POST',{role:'child'})).body;
const peer=(await call('/api/families/join','POST',{role:'adult',code:solo.code})).body;
ok(peer.token&&peer.code===solo.code,'legacy family join works');
const hidden=(await call('/api/families/'+solo.code,'PATCH',{answers:child,complete:true},solo.token)).body;
ok(!hidden.bothComplete&&!hidden.answers,'other answers hidden until both complete');
const row=sqlite.prepare('SELECT data FROM stations WHERE id=?').get(a.id);sqlite.prepare('UPDATE stations SET updated=? WHERE id=?').run(0,a.id);
ok((await call('/api/stations/'+a.id,'GET',undefined,a.token)).status===404,'expired station unavailable');
ok((await call('/api/families','POST',null)).status===400,'invalid JSON body rejected');
console.log(`${count} cloud backend checks passed`);
