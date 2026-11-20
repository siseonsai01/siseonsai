import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const keys=app.slice(app.indexOf('const TEST ='),app.indexOf('/* ---------- 원본 기준 데이터'));
const state=app.slice(app.indexOf('const blankAnswers ='),app.indexOf('let soundOn ='));
let checks=0;
for(const mode of [false,true])for(const legacyTest of [false,true]){
  const legacy={v:1,test:legacyTest,marker:'legacy'},other={v:1,test:!mode,marker:'other'};
  const otherKey='siseon-mobile-v1-state'+(mode?'-live':'-test');
  const data=new Map([['siseon-mobile-v1-state',JSON.stringify(legacy)],[otherKey,JSON.stringify(other)]]);
  const c={location:{hash:mode?'#test':''},Q:Array(5).fill({}),localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}};
  vm.createContext(c);vm.runInContext(keys+state,c);
  assert.equal(vm.runInContext('S.test',c),mode);checks++;
  assert.equal(vm.runInContext('S.marker',c),mode===legacyTest?'legacy':undefined);checks++;
  vm.runInContext('persist()',c);
  assert.equal(JSON.parse(data.get('siseon-mobile-v1-state')).test,legacyTest);checks++;
  assert.equal(JSON.parse(data.get(otherKey)).marker,'other');checks++;
  assert.equal(JSON.parse(data.get('siseon-mobile-v1-state'+(mode?'-test':'-live'))).test,mode);checks++;
}

const html=fs.readFileSync(new URL('../collect.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements=new Map();
const el=id=>{if(!elements.has(id))elements.set(id,{textContent:'',checked:false,disabled:false,className:'',events:{},addEventListener(n,f){this.events[n]=f;}});return elements.get(id);};
el('recent').tHead={innerHTML:''};el('recent').tBodies=[{innerHTML:''}];
const answers=choice=>Array.from({length:5},(_,i)=>({title:'제목 '+i,choice,label:'선택 '+choice,reason:'이유 '+i}));
const record=(id,test)=>({id,test,receivedAt:1,satisfaction:{ease:5,conversation:4,reuse:3,comment:test?'검수 만족도':'실제 만족도',submittedAt:'2026-11-20T00:00:00Z'},feedback:{comment:test?'시험 소감':'함께해서 좋았어요',submittedAt:'2026-11-20T00:00:00Z'},child:{code:'PVSD',name:'아이친구',answers:answers('A')},adult:{code:'FVMB',name:'부모친구',answers:answers('B')}});
const blobs=[];
const c={location:{hash:'#access='+'a'.repeat(64)},URLSearchParams,Blob,
  fetch:async()=>({ok:true,json:async()=>({records:[record('mrealrecord01',false),record('mtestrecord01',true)],nextCursor:null})}),
  URL:{createObjectURL:b=>{blobs.push(b);return 'blob:test';},revokeObjectURL(){}},setTimeout(){},
  document:{getElementById:el,createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}}};
vm.createContext(c);vm.runInContext(script,c);await new Promise(r=>setImmediate(r));
assert.equal(el('n-all').textContent,1);assert.equal(el('n-real').textContent,1);checks+=2;
assert.equal((el('recent').tBodies[0].innerHTML.match(/<tr>/g)||[]).length,1);checks++;
el('csv').events.click();const realCsv=await blobs.at(-1).text();
assert.ok(realCsv.includes('mrealrecord01'));assert.ok(!realCsv.includes('mtestrecord01'));checks+=2;
assert.ok(realCsv.includes('체험 소감'));assert.ok(realCsv.includes('소감 남긴 때'));assert.ok(realCsv.includes('함께해서 좋았어요'));assert.ok(!realCsv.includes('시험 소감'));checks+=4;
for(let q=1;q<=5;q++){assert.ok(realCsv.includes(q+'장 아이가 한 말'));assert.ok(realCsv.includes(q+'장 부모님 이유'));checks+=2;}
assert.ok(realCsv.includes('만족도 사용편의(1~5)'));assert.ok(realCsv.includes('실제 만족도'));assert.ok(!realCsv.includes('검수 만족도'));checks+=3;
el('with-test').checked=true;el('with-test').events.change();assert.equal(el('n-all').textContent,2);checks++;
assert.equal((el('recent').tBodies[0].innerHTML.match(/<tr>/g)||[]).length,2);checks++;
el('csv').events.click();const allCsv=await blobs.at(-1).text();assert.ok(allCsv.includes('mtestrecord01'));checks++;
console.log(checks+' test/live separation checks passed: browser resume, default list and default CSV.');
