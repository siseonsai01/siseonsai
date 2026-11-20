import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const cover=app.slice(app.indexOf('/* ---------- 표지: 소리를 켜는 입구는 버튼 하나'),app.indexOf('/* 표지 그림:'));
const intro=app.slice(app.indexOf('const introLines ='),app.indexOf('let missionInst ='));
let checks=0;
function context({started=false,finished=false,reject=false,noContext=false}={}){
 const calls=[],button={textContent:'',setAttribute(){}},status={textContent:''};
 const c={S:{screen:'home',startedAt:started?'existing-start':null,finishedAt:finished?'existing-finish':null,savedId:finished?'saved-family':null,answers:{keep:'existing answers'}},
  soundOn:false,pending:{list:['stale']},needTouch:true,actx:null,SOUND_KEY:'sound',playToken:0,gesture:false,coverMedia:()=>'<img>',I:{},
  stage:{querySelector:()=>({textContent:''})},barEl:{querySelector:q=>q.includes('cover-open')?button:status},
  document:{body:{classList:{remove(){}}}},localStorage:{setItem(){}},syncTouchChip(){},hasVoice:()=>true,VOICE_SEC:{cover:16.33},clipSrc:f=>f+'.mp3',
  stopVoice(){c.playToken++;c.voice.paused=true;c.voice.ontimeupdate=null;},blocked(){calls.push('blocked');},
  go:screen=>{c.S.screen=screen;calls.push('go:'+screen);},resume:()=>calls.push('resume'),
  window:{AudioContext:noContext?undefined:class{sampleRate=44100;destination={};constructor(){assert.equal(c.gesture,true);calls.push('context');checks++;}resume(){assert.equal(c.gesture,true);calls.push('resume-context');checks++;return Promise.resolve();}createBuffer(){return {};}createBufferSource(){return {connect(){},start(){calls.push('silent-start');}};}}},
  voice:{paused:true,currentTime:0,pause(){this.paused=true;},play(){assert.equal(c.gesture,true);calls.push('play:'+this.src);checks++;if(reject){reject=false;return Promise.reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'}));}this.paused=false;return Promise.resolve();}},
 };
 vm.createContext(c);vm.runInContext(intro+'\n'+cover,c);
 const click=()=>{c.gesture=true;c.openCover();c.gesture=false;};
 return {c,calls,button,status,click};
}
for(const state of [{},{started:true},{finished:true}]){
 const t=context(state),html=t.c.homeHtml()+t.c.homeBar();
 assert.equal((html.match(/<button\b/g)||[]).length,1);assert.ok(html.includes('data-act="cover-open"'));assert.ok(!/토끼 이야기 듣기|방사진 놀이 시작|화면을 톡!/.test(html));assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(t.c.homeBar()));checks+=4;
 const before=JSON.stringify(t.c.S.answers);t.click();assert.equal(t.c.soundOn,true);assert.equal(JSON.stringify(t.c.S.answers),before);checks+=2;
 if(state.started){assert.ok(t.calls.includes('resume'));checks++;}
 else if(state.finished){assert.ok(t.calls.includes('go:result'));assert.equal(t.c.S.savedId,'saved-family');checks+=2;}
 else{
  assert.ok(t.calls.includes('play:cover.mp3'));assert.equal(t.c.S.screen,'home');checks+=2;
  t.click();assert.equal(t.calls.filter(x=>x.startsWith('play:')).length,1);checks++;
  t.c.voice.currentTime=16.4;t.c.voice.ontimeupdate();assert.equal(t.c.S.screen,'guide');assert.equal(t.calls.filter(x=>x==='go:guide').length,1);checks+=2;
  t.c.voice.onended();assert.equal(t.calls.filter(x=>x==='go:guide').length,1);checks++;
 }
}
for(const noContext of [false,true]){
 const t=context({reject:true,noContext});t.click();await Promise.resolve();await Promise.resolve();
 assert.equal(t.c.S.screen,'home');assert.equal(vm.runInContext('coverOpening',t.c),false);assert.ok(t.status.textContent.includes('한 번 더'));checks+=3;
 t.click();assert.equal(t.calls.filter(x=>x==='play:cover.mp3').length,2);checks++;
 t.c.voice.onended();assert.equal(t.c.S.screen,'guide');checks++;
}
{
 const t=context();t.click();t.c.voice.onerror(new Error('network'));assert.equal(t.c.S.screen,'home');assert.equal(vm.runInContext('coverOpening',t.c),false);checks+=2;
 t.click();t.c.resetCoverOpening();t.c.voice.onended();assert.equal(t.c.S.screen,'home');checks++;
 t.click();t.c.S={...t.c.S,answers:{next:'other family'}};t.c.voice.onended();assert.equal(t.c.S.screen,'home');checks++;
}
assert.ok(!app.includes("homeSpoke = true; playIntro('child')"));
assert.ok(app.includes("touchChip.hidden = S.screen === 'home'"));
assert.ok(app.indexOf("if (act === 'cover-open')")<app.indexOf("performance.now() - renderedAt < 700"));checks+=3;
console.log(checks+' cover-entry checks passed: one button, synchronous unlock/play, blocked/error retry, resume/result preservation, no double advance.');
