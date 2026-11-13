import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from '../worker/index.js';
const sqlite=new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(new URL('../drizzle/0000_family_workshop.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));
sqlite.exec(fs.readFileSync(new URL('../drizzle/0001_fixed_tablet_links.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));
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
const keys={adult:'a'.repeat(32),child:'b'.repeat(32)},pinPath='/api/stations/'+a.id+'/links';
ok((await call(pinPath,'POST',{keys},c.token)).status===403,'child cannot create operator links');
const pinned=await call(pinPath,'POST',{keys},a.token);
ok(pinned.status===200&&pinned.body.permanent,'parent pins one existing pair');
assert.deepEqual((await call(pinPath,'POST',{keys},a.token)).body,pinned.body);count++;
ok((await call(pinPath,'POST',{keys:{...keys,child:'c'.repeat(32)}},a.token)).status===409,'fixed links cannot silently rotate');
const activeCode=next.body.family.code;
sqlite.prepare('UPDATE stations SET updated=0 WHERE id=?').run(a.id);
sqlite.prepare('UPDATE families SET updated=0 WHERE code=?').run(activeCode);
ok((await call('/api/stations/'+a.id,'GET',undefined,a.token)).status===200,'pinned station survives over 24 hours');
ok(!!sqlite.prepare('SELECT code FROM families WHERE code=?').get(activeCode),'active family survives with pinned pair');
const source=fs.readFileSync(new URL('../app/src/app.js',import.meta.url),'utf8');
const start=source.indexOf('async function openStationLink('),end=source.indexOf('\nfunction stationSetup()',start);
const openSource=source.slice(start,end);
for(const [role,prefix] of [['adult','parent'],['child','child']]){
  const launch=await worker.fetch(new Request('https://test.example/'+prefix+'/'+keys[role]),{DB},{waitUntil(){}});
  ok(launch.status===302&&launch.headers.get('cache-control')==='no-store','fixed link redirects without caching');
  const target=new URL(launch.headers.get('location'));
  ok(target.pathname==='/app/'&&target.searchParams.get('station')===role,'fixed link selects requested role');
  const storage=new Map();
  const context={stationLinkBusy:false,stationLinkCandidate:null,stationEntryRole:null,stationLinkError:false,stationSession:null,stationView:null,
    history:{replaceState(){}},stationRoleUrl:r=>'/app/?station='+r,show(){},stopStationPolling(){},startStationPolling(){},stationStorage:r=>'station-'+r,
    localStorage:{setItem:(k,v)=>storage.set(k,v)},acceptStation:d=>{context.accepted=d;},
    stationRequest:async(path,method,body,session)=>{const r=await call('/api/stations'+path,method,body,session.token);if(r.status!==200)throw Error('request refused');return r.body;}};
  const open=vm.runInNewContext(openSource+';openStationLink',context);
  await open(role,new URLSearchParams(target.hash.slice(1)));
  ok(context.accepted?.role===role&&storage.has('station-'+role),'actual frontend accepts cloud-issued 64-character token');
}
const badRole=await worker.fetch(new Request('https://test.example/child/'+keys.adult),{DB},{waitUntil(){}});
ok(badRole.status===404,'parent link cannot be changed to child path');
const invalid=await worker.fetch(new Request('https://test.example/parent/'+'d'.repeat(32)),{DB},{waitUntil(){}});
ok(invalid.status===404,'unknown link does not expose a station');
const unpinned=(await call('/api/stations','POST',{})).body;
sqlite.prepare('UPDATE stations SET updated=0 WHERE id=?').run(unpinned.id);
ok((await call('/api/stations/'+unpinned.id,'GET',undefined,unpinned.token)).status===404,'ordinary temporary pair still expires');
const advanced=await call('/api/stations/'+a.id,'PATCH',{next:true,round:2},a.token);
ok(advanced.status===200&&advanced.body.round===3,'next family keeps fixed station');
const repeatedLaunch=await worker.fetch(new Request(pinned.body.links.adult),{DB},{waitUntil(){}});
ok(repeatedLaunch.status===302,'same fixed address survives next family');
sqlite.prepare('UPDATE families SET updated=0 WHERE code=?').run(activeCode);
await call('/api/stations/'+a.id,'GET',undefined,a.token);
ok(!sqlite.prepare('SELECT code FROM families WHERE code=?').get(activeCode),'previous family still follows ordinary retention');
ok((await call('/api/families','POST',null)).status===400,'invalid JSON body rejected');
const trial=(await call('/api/stations','POST',{})).body;
const trialChild=(await call('/api/stations/join','POST',{code:trial.pairCode})).body;
ok(!trial.prepared,'a station does not silently start a new questionnaire');
await call('/api/families/'+trial.family.code,'PATCH',{answers:adult,complete:true},trial.family.token);
await call('/api/families/'+trial.family.code,'PATCH',{answers:child,complete:true},trialChild.family.token);
ok((await call('/api/stations/'+trial.id,'PATCH',{begin:true,round:1},trialChild.token)).status===403,'child cannot clear another participant answers');
const fresh=await call('/api/stations/'+trial.id,'PATCH',{begin:true,round:1},trial.token);
ok(fresh.status===200&&fresh.body.prepared&&fresh.body.round===2,'parent explicitly starts a prepared fresh attempt');
ok(fresh.body.family.ownAnswers.every(a=>a.choice===null&&a.reason===''),'parent fresh attempt has no suggested answer');
const freshChild=(await call('/api/stations/'+trial.id,'GET',undefined,trialChild.token)).body;
ok(freshChild.prepared&&freshChild.family.code===fresh.body.family.code&&freshChild.family.ownAnswers.every(a=>!a.choice),'other tablet follows same blank attempt');
const past=(await call('/api/families/'+trial.family.code,'GET',undefined,trial.family.token)).body;
ok(past.bothComplete&&past.answers.child[0].choice==='B'&&past.answers.adult[0].choice==='A','starting fresh preserves prior family record');
ok((await call('/api/stations/'+trial.id,'PATCH',{begin:true,round:1},trial.token)).status===409,'duplicate stale start cannot clear fresh attempt');
console.log(`${count} cloud backend checks passed`);
