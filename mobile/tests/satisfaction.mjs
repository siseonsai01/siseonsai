import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const block=app.slice(app.indexOf('/* ---------- 만족도:'),app.indexOf('/* ---------- 화면 ---------- */'));
let checks=0;
function setup(failFirst=false){
 let calls=0,saved=0;const button={},input={},status={textContent:'',classList:{toggle(){}}};
 const c={S:{savedId:'msatisfaction01',answers:{child:'unchanged',adult:'unchanged'}},ONLINE:true,esc:s=>String(s),
  stage:{querySelector:q=>q.includes('send-satisfaction')?button:q.includes('satisfaction-comment')?input:status,querySelectorAll:()=>[]},
  persist(){saved++;},saveRecord:async()=>{},recordPayload:()=>({id:'msatisfaction01',child:{same:true},adult:{same:true}}),
  fetch:async(url,options)=>{calls++;const p=JSON.parse(options.body);assert.equal(p.id,'msatisfaction01');assert.deepEqual(p.satisfaction,{ease:5,conversation:4,reuse:3,comment:failFirst?'선택 의견':''});checks+=2;
   if(failFirst&&calls===1)throw new Error('offline');return {ok:true,json:async()=>({satisfactionSaved:true,satisfaction:{...p.satisfaction,submittedAt:'2026-11-20T00:00:00Z'}})};}};
 vm.createContext(c);vm.runInContext(block,c);return {c,button,input,status,calls:()=>calls,saved:()=>saved};
}
for(const fail of [false,true]){
 const t=setup(fail),draft=t.c.satisfactionDraft(),before=JSON.stringify(t.c.S.answers);
 assert.equal(draft.ease,null);assert.equal(draft.conversation,null);assert.equal(draft.reuse,null);checks+=3;
 const html=t.c.satisfactionHtml();assert.equal((html.match(/role="radio"/g)||[]).length,15);assert.equal((html.match(/aria-checked="true"/g)||[]).length,0);assert.ok(html.includes('잠깐! 체험은 어떠셨나요?'));assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(html));checks+=4;
 await t.c.sendSatisfaction();assert.equal(t.calls(),0);assert.ok(t.status.textContent.includes('세 문항'));checks+=2;
 Object.assign(draft,{ease:5,conversation:4,reuse:3,comment:fail?'선택 의견':''});await t.c.sendSatisfaction();
 if(fail){assert.equal(t.c.S.satisfactionSent,undefined);assert.equal(draft.comment,'선택 의견');assert.ok(t.status.textContent.includes('남아 있어요'));checks+=3;await t.c.sendSatisfaction();}
 assert.equal(t.c.S.satisfactionSent,true);assert.equal(t.button.textContent,'소중한 의견 감사드립니다!');assert.equal(t.button.disabled,true);assert.equal(t.saved(),1);assert.equal(JSON.stringify(t.c.S.answers),before);checks+=5;
 const n=t.calls();await t.c.sendSatisfaction();assert.equal(t.calls(),n);checks++;
}
{
 const t=setup();Object.assign(t.c.satisfactionDraft(),{ease:5,conversation:4,reuse:3});let resolve;
 t.c.fetch=()=>new Promise(r=>{resolve=r;});const pending=t.c.sendSatisfaction();await new Promise(r=>setImmediate(r));
 t.c.S={savedId:'mnextfamily1',answers:{keep:true}};resolve({ok:true,json:async()=>({satisfactionSaved:true,satisfaction:{ease:5,conversation:4,reuse:3,comment:''}})});await pending;
 assert.equal(t.c.S.satisfactionSent,undefined);assert.deepEqual(t.c.S.answers,{keep:true});checks+=2;
}
console.log(checks+' satisfaction UI checks passed: no preselection, three ratings, optional comment, same family, retry and stale response guard.');
