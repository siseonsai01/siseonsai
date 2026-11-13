import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=name=>fs.readFileSync(new URL('../app/src/'+name,import.meta.url),'utf8');
const source=read('app.js'),voices=JSON.parse(source.match(/const offlineVoice = (\{.*?\});/)[1]);
let checks=0;const check=(v,message)=>{assert.ok(v,message);checks++;};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
// A delayed OS transition must gate every output, and a new microphone cancels
// an older pending restore instead of letting it switch the session mid-word.
{
 const window={},sleeps=[],nav={audioSession:{type:'auto'}};
 vm.runInNewContext(read('audio-route.js'),{window,navigator:nav,setTimeout,clearTimeout});
 const route=window.SiseonCreateAudioRoute({navigator:nav,document:{hidden:false,querySelectorAll:()=>[]},wait:ms=>new Promise(resolve=>sleeps.push({ms,resolve}))});
 const fx={state:'running',addEventListener(){},suspend(){this.state='suspended';return Promise.resolve();}};route.registerContext(fx);
 const first=route.startCapture();await first.ready;check(fx.state==='suspended'&&!route.canPlayEffects(),'capture silences all registered sound contexts');
 let reset=0;const ended=route.endCapture(first.key,()=>reset++);await turn();check(route.phase==='restoring'&&nav.audioSession.type==='auto','capture release gets a quiet interval');
 let allowed=false;const pending=route.whenPlaybackReady().then(()=>allowed=true,()=>{});check(!allowed,'narration cannot start during route recovery');
 const second=route.startCapture();await second.ready;sleeps.shift().resolve();await ended;await pending;check(nav.audioSession.type==='play-and-record'&&reset===0&&!allowed,'stale release cannot interrupt a newer microphone');
 const end=route.endCapture(second.key,()=>reset++);await turn();sleeps.shift().resolve();await turn();check(!route.canPlayEffects()&&reset===1,'native decoder reset runs while effects remain blocked');sleeps.shift().resolve();await end;
 check(route.phase==='playback'&&nav.audioSession.type==='playback','only a complete recovery re-enables output');
}

class Media{
 constructor(){this.dataset={};this.events={};this._src='';this.currentTime=0;this.paused=true;this.ended=false;this.duration=5;this.readyState=4;this.volume=1;this.loads=0;this.played=[];}
 set src(value){this._src=value;this.currentTime=0;this.ended=false;}get src(){return this._src;}
 getAttribute(name){return name==='src'?this._src:this[name];}removeAttribute(name){if(name==='src')this._src='';}
 load(){this.loads++;this.currentTime=0;}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn);}emit(type){for(const fn of this.events[type]??[])fn();}
 play(){this.paused=false;this.ended=false;this.played.push(this._src);this.emit('playing');return Promise.resolve();}
 pause(){this.paused=true;this.emit('pause');}
 finish(){this.currentTime=this.duration;this.paused=true;this.ended=true;this.emit('ended');}
}
const instances=[];
class Recognition{
 constructor(){instances.push(this);}start(){this.onstart?.();}stop(){this.onend?.();}abort(){this.aborted=true;}
}
const speech=source.slice(source.indexOf('function stopNarration('),source.indexOf('voiceAudio.addEventListener("timeupdate"'));
const ended=source.match(/voiceAudio\.addEventListener\("ended", \(\) => \{[\s\S]*?\n\}\);/)[0];
const reason=source.slice(source.indexOf('function reasonVoiceSupported()'),source.indexOf('function syncGuidePointer()'));
for(const role of ['child','adult']){
 const media=new Media(),button={isConnected:true,setAttribute(){},disabled:false},field={value:'',dispatchEvent(){}},status={textContent:''};
 const c={window:{SpeechRecognition:Recognition},navigator:{audioSession:{type:'auto'}},document:{hidden:false,baseURI:'https://test.example/app/',querySelectorAll:()=>[media],addEventListener(){}},URL,AbortController,Event,setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){},Date,
  offlineVoice:voices,micResumeByTap:false,state:{role,index:0},currentScreen:'home',familySession:null,familyBusy:false,voiceEnabled:true,playingScene:null,narrationQueue:[],narrationRecovery:null,playbackId:0,coverMotion:null,missionPausedVoice:null,reasonVoice:null,reasonVoiceKey:null,
  app:{querySelector:selector=>selector.includes('reason-mic-status')?status:selector.includes('reason-mic')?button:selector.includes('[name=')?field:null,querySelectorAll:()=>[],insertAdjacentHTML(){}},
  stopNextCue(){},stopCoverMotion(){},stopPageTurnSound(){},syncVoiceControls(){},highlightSpokenChoice(){},markNextReady(){},clearNextReady(){},startCoverMotion(){},syncGuidePointer(){},motionAllowed:()=>false,missionMotion:null,bookRoleLabel:()=>role==='adult'?'부모용':'아이용'};
 vm.createContext(c);vm.runInContext(read('audio-route.js'),c);c.window.SiseonAudioRoute=c.window.SiseonCreateAudioRoute({navigator:c.navigator,document:c.document,wait:async()=>{}});
 vm.runInContext(read('narration-player.js'),c);vm.runInContext(read('speech-input.js'),c);c.voiceAudio=c.window.SiseonNarration.create(media,{native:true,setInterval:()=>1,clearInterval(){}});
 vm.runInContext(reason+'\n'+speech+'\n'+ended,c);
 await c.voiceAudio.unlock();
 async function complete(scene){
  const before=media.played.length;c.narrate(scene);await turn();let turns=0;
  while(c.playingScene){check(!media.paused,role+' '+c.playingScene+' actually starts');check(c.window.SiseonAudioRoute.phase==='playback','narration only plays on a restored route');media.finish();await turn();assert.ok(++turns<20,'queue must terminate');}
  return media.played.slice(before);
 }
 assert.deepEqual(await complete('cover'),[voices[role==='adult'?'parent-cover':'cover']]);checks++;
 c.currentScreen='intro';assert.deepEqual(await complete('room-play'),[voices['room-play']]);checks++;
 for(let index=0;index<5;index++){
  c.currentScreen='quiz';c.state.index=index;
  const q=[`story-${index}`,`${role}-${index}`,...(role==='child'?[...(index===0?['choices-intro']:[]),`option-child-${index}-A`,`option-child-${index}-B`]:[]),'choices-ready'];
  assert.deepEqual(await complete(role+'-'+index),q.map(scene=>voices[scene]));checks++;
  await complete('reason-'+role+'-'+index);
  field.value='';await c.toggleReasonVoice();const r=instances.at(-1);check(c.reasonVoice.active&&c.window.SiseonAudioRoute.phase==='capturing','microphone owns the route');
  if(index===2)r.onerror({error:'network'});
  else{r.onresult({results:[Object.assign([{transcript:'내 생각을 말했어요'}],{isFinal:true})]});if(index===3)c.reasonVoice.stop();else r.onend();}
  await turn();check(r.aborted&&!c.reasonVoice.active,'every recognition path explicitly releases its microphone');
  while(c.playingScene){media.finish();await turn();}
  check(c.window.SiseonAudioRoute.phase==='playback'&&c.navigator.audioSession.type==='playback','same playback route after each microphone');
  if(index===2)check(status.textContent.includes('음성인식 연결을 확인'),'recognition failure remains visible after playback recovery');
  check(media.volume===1,'application volume never changes');if(index!==2)check(field.value==='내 생각을 말했어요','dictated answer is retained');
  check(media.loads>=index+1,'same activated native element is reset after capture');
  const replay=await complete(role+'-'+index);assert.deepEqual(replay,q.map(scene=>voices[scene]));checks++;
 }
 // Optional real-device A/B: an explicit tap rebuilds the complete question queue.
 c.currentScreen='audioCheck';c.state.index=4;c.micResumeByTap=true;
 await c.toggleReasonVoice();instances.at(-1).onend();await turn();
 check(Boolean(c.narrationRecovery?.restart)&&!c.playingScene,'tap diagnostic waits without autoplay');
 const beforeTap=media.played.length;c.resumeNarration();await turn();
 while(c.playingScene){media.finish();await turn();}
 assert.deepEqual(media.played.slice(beforeTap),[voices[role+'-4']]);checks++;
 c.currentScreen='quiz';c.narrateAfterMic(role+'-4');const quizStart=media.played.length;c.resumeNarration();await turn();
 while(c.playingScene){media.finish();await turn();}
 const replayScenes=['story-4',role+'-4',...(role==='child'?['option-child-4-A','option-child-4-B']:[]),'choices-ready'];
 assert.deepEqual(media.played.slice(quizStart),replayScenes.map(scene=>voices[scene]));checks++;
 c.micResumeByTap=false;
 c.currentScreen='report';
 for(const scene of ['ending','egg-loading','egg-ready','friend-'+(role==='child'?'PVMD':'FHMB'),'description-'+(role==='child'?'PVMD':'FHMB'),'motion-0-0','motion-0-1','mission-done','chart','result-answers','photo-intro','print-options']){
  const actual=await complete(scene);assert.ok(actual.length>=1);checks++;
 }
 check(c.window.SiseonAudioRoute.snapshot().phase==='playback'&&media.volume===1,'results preserve the same output and app volume');
 c.voiceAudio.dispose();
}
console.log(checks+' parent/child cover, five questions, microphone success/error/stop, replay, egg, mission and report audio checks passed');
