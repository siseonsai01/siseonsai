const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const fail=(status,error)=>{throw Object.assign(new Error(error),{status})};
const now=()=>Date.now()/1000;
const token=(bytes=32)=>Array.from(crypto.getRandomValues(new Uint8Array(bytes)),v=>v.toString(16).padStart(2,'0')).join('');
const digits=()=>String(crypto.getRandomValues(new Uint32Array(1))[0]%100000000).padStart(8,'0');
const blank=()=>Array.from({length:5},()=>({choice:null,reason:'',point:null}));
const roleData=()=>({token:token(),answers:blank(),complete:false});
const newFamily=(role)=>({revision:1,photo:null,ratio:null,photoRevision:0,roles:role?{[role]:roleData()}:{child:roleData(),adult:roleData()}});
const validRole=r=>{if(!['child','adult'].includes(r))fail(400,'책을 골라 주세요.');return r};
function cleanAnswers(items){
  if(!Array.isArray(items)||items.length!==5)fail(400,'다섯 답변을 확인해 주세요.');
  return items.map((a,i)=>{
    if(!a||![null,'A','B','unsure','other'].includes(a.choice)||(a.choice==='other'&&i!==0))fail(400,'답변을 확인해 주세요.');
    let point=null;
    if(a.point!=null){point={};for(const k of ['x','y']){if(!Number.isFinite(Number(a.point[k])))fail(400,'위치를 확인해 주세요.');point[k]=Math.max(0,Math.min(100,Number(a.point[k])));}}
    return {choice:a.choice,reason:String(a.reason??'').slice(0,180),point};
  });
}
function view(f,code,role,query=''){
  const both=Object.keys(f.roles).length===2&&Object.values(f.roles).every(v=>v.complete);
  const r={code,role,revision:f.revision,photoRevision:f.photoRevision,photoLocked:Object.values(f.roles).some(v=>v.started||v.answers.some(a=>a.choice)),ratio:f.ratio,ownAnswers:f.roles[role].answers,complete:f.roles[role].complete,bothComplete:both,peers:Object.fromEntries(Object.entries(f.roles).map(([r,v])=>[r,{connected:true,complete:v.complete}]))};
  if(!new URLSearchParams(query).has('photoRevision')||new URLSearchParams(query).get('photoRevision')!==String(f.photoRevision))r.photo=f.photo;
  if(both)r.answers=Object.fromEntries(Object.entries(f.roles).map(([r,v])=>[r,v.answers]));
  return r;
}
const read=async(db,table,key)=>db.prepare(`SELECT data FROM ${table} WHERE ${table==='families'?'code':'id'}=?`).bind(key).first();
const insert=(db,table,key,value)=>db.prepare(`INSERT INTO ${table} VALUES (?,?,?)`).bind(key,JSON.stringify(value),now());
const update=(db,table,key,value,old)=>db.prepare(`UPDATE ${table} SET data=?,updated=? WHERE ${table==='families'?'code':'id'}=? AND data=?`).bind(JSON.stringify(value),now(),key,old);
const changed=r=>r.meta.changes===1;
const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
async function expire(db){
  await db.batch([
    db.prepare("DELETE FROM families WHERE updated<? AND code NOT IN (SELECT json_extract(data,'$.code') FROM stations WHERE json_extract(data,'$.permanent')=1)").bind(now()-86400),
    db.prepare("DELETE FROM stations WHERE updated<? AND COALESCE(json_extract(data,'$.permanent'),0)<>1").bind(now()-86400)
  ]);
}
function auth(req,roles){const supplied=req.headers.get('authorization')?.replace(/^Bearer /,'');const r=Object.keys(roles).find(r=>(roles[r].token??roles[r])===supplied);if(!supplied||!r)fail(403,'이 기기의 연결을 확인해 주세요.');return r;}
async function rate(db,req,kind){
  const address=req.headers.get('cf-connecting-ip')||'local';
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(address+kind));
  const key=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')+':'+Math.floor(now()/60);
  const r=await db.prepare('INSERT INTO attempts (key,count,updated) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now()).first();
  if(r.count>20)fail(429,'잠시 뒤 다시 연결해 주세요.');
}
async function familyApi(req,db,url,p){
  const m=req.method,path=url.pathname;
  if(m==='POST'&&path==='/api/families'){
    const role=validRole(p.role),f=newFamily(role);
    for(let n=0;n<5;n++){const code=digits();const r=await db.prepare('INSERT OR IGNORE INTO families VALUES (?,?,?)').bind(code,JSON.stringify(f),now()).run();if(changed(r))return {...view(f,code,role,url.search),token:f.roles[role].token};}
    fail(503,'다시 시도해 주세요.');
  }
  if(m==='POST'&&path==='/api/families/join'){
    await rate(db,req,'family');const code=String(p.code??'').replace(/\D/g,''),role=validRole(p.role);
    for(let n=0;n<6;n++){const row=await read(db,'families',code);if(!row)fail(404,'가족 코드를 다시 확인해 주세요.');const f=JSON.parse(row.data);if(f.roles[role])fail(409,'그 책은 이미 열려 있어요. 다른 책을 골라 주세요.');f.roles[role]=roleData();f.revision++;if(changed(await update(db,'families',code,f,row.data).run()))return {...view(f,code,role,url.search),token:f.roles[role].token};}
    fail(409,'연결을 다시 시도해 주세요.');
  }
  const match=path.match(/^\/api\/families\/(\d{8})$/);if(!match)fail(404,'연결 주소를 찾지 못했어요.');
  const code=match[1];
  for(let n=0;n<8;n++){
    const row=await read(db,'families',code);if(!row)fail(404,'가족 연결이 만료됐어요. 새 책을 열어 주세요.');const f=JSON.parse(row.data),role=auth(req,f.roles),own=f.roles[role];
    if(m==='PATCH'){
      if(p.started)own.started=true;
      if('answers'in p)own.answers=cleanAnswers(p.answers);
      if('complete'in p){if(p.complete&&own.answers.some(a=>!a.choice))fail(400,'모든 페이지에서 하나씩 골라 주세요.');own.complete=!!p.complete;}
      if('photo'in p){
        if(Object.values(f.roles).some(v=>v.started||v.answers.some(a=>a.choice)))fail(400,'책을 펼친 뒤에는 방 사진을 바꿀 수 없어요.');
        if(p.photo!==null&&(typeof p.photo!=='string'||!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(p.photo)))fail(400,'사진을 다시 골라 주세요.');
        f.photo=p.photo;f.ratio=p.ratio??null;f.photoRevision++;
      }
      f.revision++;
    }else if(m!=='GET')fail(405,'지원하지 않는 요청이에요.');
    if(changed(await update(db,'families',code,f,row.data).run()))return view(f,code,role,url.search);
  }
  fail(409,'동시에 저장 중이에요. 다시 시도해 주세요.');
}
async function stationView(db,sid,s,role,fresh){
  const row=await read(db,'families',s.code);if(!row)fail(410,'가족 기록이 만료됐어요. 현장 연결을 다시 준비해 주세요.');
  const f=JSON.parse(row.data),family={...view(f,s.code,role),token:f.roles[role].token,photo:null,ratio:null,photoLocked:true};
  for(const r of Object.keys(family.peers))family.peers[r].connected=s.connected[r];
  const result={id:sid,role,round:s.round,connected:s.connected,prepared:s.readyRound===s.round,family};
  if(role==='adult'&&!s.connected.child)Object.assign(result,{pairCode:s.pair,pairExpires:s.pairUntil});
  if(fresh)result.token=s.tokens[role];
  await db.batch([db.prepare('UPDATE stations SET updated=? WHERE id=?').bind(now(),sid),db.prepare('UPDATE families SET updated=? WHERE code=?').bind(now(),s.code)]);
  return result;
}
async function stationApi(req,db,url,p){
  const path=url.pathname,m=req.method;
  const pin=path.match(/^\/api\/stations\/([a-f0-9]{24})\/links$/);
  if(pin&&m==='POST'){
    const sid=pin[1],keys=p.keys;
    if(!keys||!['adult','child'].every(r=>/^[a-f0-9]{32}$/.test(keys[r]))||keys.adult===keys.child)fail(400,'고정 주소를 다시 확인해 주세요.');
    for(let n=0;n<8;n++){
      const row=await read(db,'stations',sid);if(!row)fail(404,'현장 연결을 찾지 못했어요.');
      const s=JSON.parse(row.data);if(auth(req,s.tokens)!=='adult')fail(403,'부모님 화면에서 준비해 주세요.');
      if(!s.connected.child)fail(409,'두 화면을 먼저 연결해 주세요.');
      const hashes=await Promise.all(['adult','child'].map(r=>digest(keys[r])));
      if(s.linkHashes&&['adult','child'].some((r,i)=>s.linkHashes[r]!==hashes[i]))fail(409,'이미 고정 주소가 있어요. 기존 주소를 사용해 주세요.');
      for(const [i,r] of ['adult','child'].entries()){
        const existing=await db.prepare('SELECT station_id,role FROM tablet_links WHERE key_hash=?').bind(hashes[i]).first();
        if(existing&&(existing.station_id!==sid||existing.role!==r))fail(409,'다른 연결의 주소를 사용할 수 없어요.');
      }
      s.permanent=true;s.linkHashes={adult:hashes[0],child:hashes[1]};
      const statements=['adult','child'].map((r,i)=>db.prepare('INSERT INTO tablet_links (key_hash,station_id,role) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM stations WHERE id=? AND data=?) ON CONFLICT(key_hash) DO NOTHING').bind(hashes[i],sid,r,sid,row.data));
      const result=await db.batch([...statements,update(db,'stations',sid,s,row.data)]);
      if(!changed(result[2]))continue;
      return {permanent:true,links:{adult:url.origin+'/parent/'+keys.adult,child:url.origin+'/child/'+keys.child}};
    }fail(409,'고정 주소 준비를 다시 시도해 주세요.');
  }
  if(m==='POST'&&path==='/api/stations'){
    for(let n=0;n<5;n++){
      const sid=token(12),code=digits(),f=newFamily(),s={round:1,code,pair:digits(),pairUntil:now()+600,tokens:{adult:token()},connected:{adult:true,child:false}};
      try{await db.batch([insert(db,'families',code,f),insert(db,'stations',sid,s)]);return await stationView(db,sid,s,'adult',true);}catch(e){if(!/UNIQUE/.test(e.message))throw e;}
    }fail(503,'다시 시도해 주세요.');
  }
  if(m==='POST'&&path==='/api/stations/join'){
    await rate(db,req,'station');const pair=String(p.code??'').replace(/\D/g,'');if(pair.length!==8)fail(404,'연결 번호를 다시 확인해 주세요.');
    const rows=await db.prepare("SELECT id,data FROM stations WHERE json_extract(data,'$.pair')=? AND json_extract(data,'$.pairUntil')>? AND json_extract(data,'$.connected.child')=0").bind(pair,now()).all();
    if(rows.results.length!==1)fail(404,'준비 화면의 연결 번호를 다시 확인해 주세요. 번호는 10분 동안 사용할 수 있어요.');
    const row=rows.results[0],s=JSON.parse(row.data);s.tokens.child=token();s.connected.child=true;s.pair='';
    if(!changed(await update(db,'stations',row.id,s,row.data).run()))fail(409,'이미 연결되었어요. 화면을 다시 확인해 주세요.');
    return stationView(db,row.id,s,'child',true);
  }
  const match=path.match(/^\/api\/stations\/([a-f0-9]{24})$/);if(!match)fail(404,'현장 연결 주소를 확인해 주세요.');const sid=match[1];
  for(let n=0;n<8;n++){
    const row=await read(db,'stations',sid);if(!row)fail(404,'현장 연결이 만료됐어요. 진행자가 다시 준비해 주세요.');const s=JSON.parse(row.data),role=auth(req,s.tokens);
    if(m==='PATCH'){
      if(role!=='adult')fail(403,'부모님 쪽 진행자 화면에서 다음 가족을 시작해 주세요.');
      if(p.next || p.begin){
        if(!s.connected.child)fail(409,'태블릿 두 대를 먼저 연결해 주세요.');
        if(p.round!==s.round)fail(409,'이미 다음 가족으로 바뀌었어요. 화면을 다시 확인해 주세요.');
        const code=digits(),f=newFamily();s.code=code;s.round++;s.readyRound=s.round;
        const results=await db.batch([
          db.prepare('INSERT INTO families (code,data,updated) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM stations WHERE id=? AND data=?)').bind(code,JSON.stringify(f),now(),sid,row.data),
          update(db,'stations',sid,s,row.data)
        ]);
        if(!changed(results[1]))continue;
      }else if(p.renew&&!s.connected.child){s.pair=digits();s.pairUntil=now()+600;if(!changed(await update(db,'stations',sid,s,row.data).run()))continue;}
      else fail(400,'현장 요청을 확인해 주세요.');
    }else if(m!=='GET')fail(405,'지원하지 않는 요청이에요.');
    return stationView(db,sid,s,role,false);
  }
  fail(409,'연결을 다시 확인해 주세요.');
}
export default {async fetch(req,env,ctx){
  const url=new URL(req.url);
  const launch=url.pathname.match(/^\/(parent|child)\/([a-f0-9]{32})$/);
  if(launch){
    if(!['GET','HEAD'].includes(req.method))return json(405,{error:'지원하지 않는 요청이에요.'});
    try{
      const link=await env.DB.prepare('SELECT station_id,role FROM tablet_links WHERE key_hash=?').bind(await digest(launch[2])).first();
      const role=launch[1]==='parent'?'adult':'child';
      if(!link||link.role!==role)return json(404,{error:'주소를 다시 확인해 주세요.'});
      const row=await read(env.DB,'stations',link.station_id);
      if(!row)return json(404,{error:'연결을 찾지 못했어요.'});
      const s=JSON.parse(row.data);
      if(!s.permanent||!s.connected.child)return json(409,{error:'두 화면 연결을 확인해 주세요.'});
      const location=url.origin+'/app/?station='+role+'#'+new URLSearchParams({pair:link.station_id,key:s.tokens[role]});
      return new Response(null,{status:302,headers:{location,'cache-control':'no-store','referrer-policy':'no-referrer','x-robots-tag':'noindex, nofollow'}});
    }catch{return json(503,{error:'잠시 뒤 같은 주소로 다시 열어 주세요.'});}
  }
  if(!url.pathname.startsWith('/api/')){
    if(url.pathname==='/')return Response.redirect(url.origin+'/app/index.html'+url.search,302);
    if(!url.pathname.startsWith('/app/'))return new Response('Not found',{status:404});
    return env.ASSETS.fetch(req);
  }
  try{
    if(!['GET','POST','PATCH'].includes(req.method))fail(405,'지원하지 않는 요청이에요.');
    const origin=req.headers.get('origin');if(origin&&origin!==url.origin)fail(403,'같은 작업실 주소에서 연결해 주세요.');
    if(Number(req.headers.get('content-length'))>2500000)fail(413,'사진이 너무 커요.');
    let p={};if(req.method!=='GET'){const raw=await req.text();if(new TextEncoder().encode(raw).length>2500000)fail(413,'사진이 너무 커요.');try{p=raw?JSON.parse(raw):{};}catch{fail(400,'입력 내용을 다시 확인해 주세요.');}if(!p||Array.isArray(p)||typeof p!=='object')fail(400,'입력 내용을 다시 확인해 주세요.');}
    // Opportunistic expiration is schema-only at deployment; never create tables in requests.
    if(Math.random()<.01)ctx.waitUntil(env.DB.prepare('DELETE FROM attempts WHERE updated<?').bind(now()-120).run());
    // Deterministic reads also enforce retention when opportunistic cleanup has not run.
    await expire(env.DB);
    return json(200,await (url.pathname.startsWith('/api/stations')?stationApi(req,env.DB,url,p):familyApi(req,env.DB,url,p)));
  }catch(e){return json(e.status||500,{error:e.status?e.message:'저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.'});}
}};
