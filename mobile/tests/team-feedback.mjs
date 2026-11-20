import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
let checks=0;
const cheers=app.slice(app.indexOf('const praise ='),app.indexOf('const reasonAsk ='));
const c={S:{index:0},Q:Array(5).fill({})};vm.createContext(c);vm.runInContext(cheers,c);
const phrases=['좋아, 첫 번째 생각 잘 골랐어!','재밌는 생각이네, 다음 장도 볼까?','벌써 절반 넘었어! 잘하고 있어.','생각하는 모습이 멋져!','최고야! 다섯 장 다 골랐네!'];
for(let i=0;i<5;i++){c.S.index=i;assert.ok(c.cheerHtml('child').includes(phrases[i]));checks++;}
assert.equal(new Set(phrases).size,5);assert.equal(vm.runInContext('new Set(childStageClips).size',c),5);assert.equal(vm.runInContext('childStageClips[3]',c),4);checks+=3;
for(let i=0;i<2;i++){c.S.index=i;c.cheerHtml('child');assert.notEqual(vm.runInContext('lastPick.childs',c),1);checks++;}

const photo=app.slice(app.indexOf('const hpSteps ='),app.indexOf('const views ='));
const p={S:{},photoUrl:'blob:local-photo',roleName:{child:'아이',adult:'부모님'},I:{},pawBadge:()=>'',code:()=>'',pv:()=>({}),friendFigure:()=>''};
vm.createContext(p);vm.runInContext(photo,p);
const h=vm.runInContext('hpFresh()',p);h.step=1;p.S.hp=h;
const expected=['child1','child2','child3','adult1','adult2','adult3'];
for(let i=0;i<6;i++){
 assert.equal(h.turn+h.step,expected[i]);checks++;
 const html=p.photoHtml();assert.ok(html.includes('hp-turn-badge '+h.turn));assert.ok(html.includes((h.turn==='child'?'아이':'부모님')+' 차례 · '+h.step+'/3'));checks+=2;
 const key=['look','play','change'][h.step-1];h.pins[key][h.turn]={x:i*10,y:i*10};
 const bar=p.photoBar();assert.equal(bar.includes('부모님께 폰 건네기'),i===2);checks++;
 p.hpAdvance(h);
}
assert.equal(h.step,4);checks++;
const pins=JSON.stringify(h.pins);
for(const step of [...expected].reverse()){assert.equal(p.hpRetreat(h),true);assert.equal(h.turn+h.step,step);checks+=2;}
assert.equal(p.hpRetreat(h),false);assert.equal(JSON.stringify(h.pins),pins);checks+=2;

const feedback=app.slice(app.indexOf("let feedbackState ="),app.indexOf('/* ---------- 화면 ---------- */'));
for(const failFirst of [false,true]){
 let requests=0,stored=0;
 const status={textContent:'',classList:{toggle(){}}},button={},input={};
 const f={S:{savedId:'mfamily001',feedbackDraft:'함께 이야기해서 좋았어요.'},ONLINE:true,
  stage:{querySelector:q=>q.includes('status')?status:q.includes('send-feedback')?button:input},
  persist(){stored++;},saveRecord:async()=>{},recordPayload:()=>({id:'mfamily001',child:{answers:[]},adult:{answers:[]}}),
  fetch:async(url,options)=>{requests++;const body=JSON.parse(options.body);assert.equal(body.id,'mfamily001');assert.equal(body.feedback,'함께 이야기해서 좋았어요.');checks+=2;
   if(failFirst&&requests===1)throw new Error('offline');return {ok:true,json:async()=>({feedbackSaved:true,feedback:{comment:body.feedback}})};}};
 vm.createContext(f);vm.runInContext(feedback,f);await f.sendFeedback();
 if(failFirst){assert.ok(!f.S.feedbackSent);assert.equal(f.S.feedbackDraft,'함께 이야기해서 좋았어요.');checks+=2;await f.sendFeedback();}
 assert.equal(f.S.feedbackSent,true);assert.equal(status.textContent,'소중한 의견 고마워요!');assert.equal(stored,1);checks+=3;
 await f.sendFeedback();assert.equal(requests,failFirst?2:1);checks++;
}
console.log(checks+' stage cheers, child-three/adult-three photo flow and feedback retry checks passed.');
