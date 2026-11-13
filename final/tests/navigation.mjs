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
for(const role of ['child','adult']){const shown=[];vm.runInNewContext('(function(){'+start+'})()',{voiceEnabled:null,stationSession:{role},familyView:{bothComplete:true},show:x=>shown.push(x)});assert.deepEqual(shown,['intro']);checks++;}
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
const p={stationSession:{role:'child'},stationView:{connected:{child:true}},stationRibbon:()=>'<p>두 책이 연결됐어요</p>',room:()=>'<figure>공통 그림</figure>',voiceTools:scene=>'<button>'+scene+'</button>'};
vm.runInNewContext(intro,p);
for(const role of ['child','adult']){p.stationSession.role=role;const html=p.familyIntro();assert.ok(html.includes('준비 화면')&&html.includes('이 설문은 왜 할까요?')&&html.includes('정답은 없어요')&&html.includes('purpose'));assert.ok(!html.includes('station-code'));checks++;}
console.log(checks+' cover-first, role label, saved-answer and preparation checks passed');
