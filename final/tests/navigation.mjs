import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const s=fs.readFileSync(new URL('../app/src/app.js',import.meta.url),'utf8');
let checks=0;
const accept=s.slice(s.indexOf('function acceptStation('),s.indexOf('async function connectStation('));
for(const role of ['child','adult'])for(const status of ['blank','partial','complete','both']){
  const answers=Array.from({length:5},(_,i)=>({choice:status==='blank'||status==='partial'&&i>1?null:'A',reason:'saved reason'}));
  const family={code:'test-code',token:'test-family-token',role,complete:status==='complete'||status==='both',bothComplete:status==='both',ownAnswers:answers};
  const data={id:'test-station',role,round:1,family,connected:{child:true}};
  const shown=[],stored=new Map();
  const c={stationView:null,familySession:null,familyView:null,familyPoll:0,familySaveTimer:0,familyPending:false,currentScreen:'stationLink',state:{},clearTimeout(){},clearAnswers(){},familyStorage:r=>'family-'+r,localStorage:{setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},history:{replaceState(){}},location:{pathname:'/app/'},show:x=>shown.push(x),edit(){throw Error('A link must open the cover before questions');},receiveFamily:(value,restore)=>{c.familyView=value;if(restore)c.restored=structuredClone(value.ownAnswers);}};
  vm.runInNewContext(accept,c);c.acceptStation(data,true);
  assert.deepEqual(shown,['home'],role+' '+status);assert.deepEqual(c.restored,answers);assert.equal(c.familySession.code,family.code);checks++;
}
const start=s.match(/case "begin-voice": ([^\n]+)/)[1];
for(const role of ['child','adult']){let called=0;vm.runInNewContext('(function(){'+start+'})()',{voiceEnabled:null,beginFreshBook:()=>called++});assert.equal(called,1);checks++;}
const home=s.match(/case "home": ([^\n]+)/)[1];const shown=[];vm.runInNewContext('(function(){'+home+'})()',{show:x=>shown.push(x),restoreStation:()=>{throw Error('Home must stay on the cover');}});assert.deepEqual(shown,['home']);checks++;
const roleFunctions=s.slice(s.indexOf('function bookRoleLabel()'),s.indexOf('function familyIntro()'));
const badge={hidden:true,textContent:'',dataset:{}};
const c={stationSession:null,familySession:null,stationEntryRole:null,document:{querySelector:()=>badge}};
vm.runInNewContext(roleFunctions,c);
for(const [role,label]of [['child','아이용'],['adult','부모용']]){c.stationSession={role};c.syncBookRoleBadge();assert.equal(badge.textContent,label);assert.equal(badge.hidden,false);assert.equal(badge.dataset.role,role);checks++;}
c.stationSession=null;c.stationEntryRole='child';c.syncBookRoleBadge();assert.equal(badge.textContent,'아이용');checks++;
const hero=s.slice(s.indexOf('function hero()'),s.indexOf('function home()'));
for(const label of ['아이용','부모용']){const h={bookRoleLabel:()=>label,voiceTools:()=>'',voiceButton:()=>''};vm.runInNewContext(hero,h);const html=h.hero();assert.ok(html.includes(label+' · 소개 표지'));assert.ok(html.includes('data-action="begin-voice"'));assert.ok(!html.includes('resume-book'));checks++;}
const intro=s.slice(s.indexOf('function familyIntro()'),s.indexOf('function acceptStation('));
const p={stationSession:{role:'child'},stationView:{connected:{child:true},prepared:true},familyView:{ownAnswers:Array.from({length:5},()=>({choice:null}))},stationRibbon:()=>'<p>두 책이 연결됐어요</p>',room:()=>'<figure>공통 그림</figure>',voiceTools:scene=>'<button>'+scene+'</button>'};
vm.runInNewContext(intro,p);
for(const role of ['child','adult']){p.stationSession.role=role;const html=p.familyIntro();assert.ok(html.includes('준비 화면')&&!html.includes('이 설문은 왜 할까요?')&&html.includes('room-play'));assert.ok(!html.includes('station-code'));checks++;}
for(const prepared of [false,true])for(const saved of [false,true]){
 p.stationView.prepared=prepared;p.familyView.ownAnswers[0].choice=saved?'A':null;
 const html=p.familyIntro(),tag=html.match(/<button[^>]+data-action="station-start"[^>]*>/)[0];
 assert.equal(tag.includes('disabled'),!prepared||saved);checks++;
}
const begin=s.slice(s.indexOf('async function beginFreshBook()'),s.indexOf('function bookRoleLabel()'));
for(const role of ['adult','child']){
 const requests=[],shown=[],read=[];
 const ctx={app:{querySelector:()=>null},markNextReady(){},stationSession:{role,id:'isolated-test'},stationBusy:false,stationRequest:async(path,method,payload)=>{requests.push({method,payload});return {round:7,connected:{child:true},prepared:role==='adult'};},acceptStation:()=>{},startStationPolling(){},show:x=>shown.push(x),narrate:x=>read.push(x),familyNotice:err=>{throw Error(err);}};
 vm.runInNewContext(begin,ctx);await ctx.beginFreshBook();
 assert.equal(requests.length,role==='adult'?2:1);if(role==='adult')assert.deepEqual(JSON.parse(JSON.stringify(requests[1].payload)),{begin:true,round:7});
 assert.deepEqual(shown,['intro']);assert.deepEqual(read,role==='child'?['waiting-start']:[]);assert.equal(ctx.stationBusy,false);checks++;
}
{
 const calls=[],shown=[];const ctx={app:{querySelector:()=>null},markNextReady(){},stationSession:{role:'adult',id:'new-test-pair'},stationBusy:false,stationRequest:async(path,method)=>{calls.push(method);return {round:1,connected:{child:false},prepared:false};},acceptStation(){},startStationPolling(){},show:x=>shown.push(x),narrate(){},familyNotice:e=>{throw Error(e);}};
 vm.runInNewContext(begin,ctx);await ctx.beginFreshBook();assert.deepEqual(calls,['GET']);assert.deepEqual(shown,['intro']);checks++;
}
const coverFunction={bookRoleLabel:()=>'',voiceTools:()=>'',voiceButton:()=>''};vm.runInNewContext(hero,coverFunction);
const coverHtml=coverFunction.hero();assert.ok(coverHtml.includes('같은 방, 다른 생각')&&coverHtml.includes('검증된 심리검사가 아니며')&&coverHtml.includes('재미로'));checks++;
console.log(checks+' cover-first, role label, saved-answer and preparation checks passed');

for(const label of ['부모용','아이용']){const ctx={bookRoleLabel:()=>label,voiceTools:()=>'',voiceButton:()=>''};vm.runInNewContext(hero,ctx);const html=ctx.hero();assert.equal(html.includes('아이와 서로의 생각을 나누고'),label==='부모용');const visible=html.slice(html.indexOf('cover-purpose'),html.indexOf('hero-actions')).replace(/<[^>]+>/g,'');assert.ok(visible.length<165);checks++;}
const route=s.slice(s.indexOf('function roleVoiceScene('),s.indexOf('function playNarrationClip('));
for(const label of ['부모용','아이용']){const c={bookRoleLabel:()=>label,offlineVoice:{'cover':'child.mp3','parent-cover':'parent.mp3'}};vm.runInNewContext(route,c);assert.equal(c.roleVoiceScene('cover'),label==='부모용'?'parent-cover':'cover');assert.equal(c.roleVoiceScene('room-play'),'room-play');checks++;}
const results=s.slice(s.indexOf('function openFamilyResults('),s.indexOf('function openMissionTheater('));
{const calls=[];const result={scrollIntoView:x=>calls.push('scroll'),querySelector:()=>({focus:()=>calls.push('focus')})};const c={pauseMission:()=>calls.push('pause'),stopNarration:()=>calls.push('stop'),motionAllowed:()=>false,app:{querySelector:()=>result}};vm.runInNewContext(results,c);c.openFamilyResults();assert.deepEqual(calls,['pause','stop','scroll','focus']);assert.ok(s.includes('data-action="family-results">우리 가족 결과지 보기'));checks++;}
console.log('All '+checks+' cover and result navigation checks passed');
