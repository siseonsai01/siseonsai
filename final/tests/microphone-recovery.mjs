import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=n=>fs.readFileSync(new URL('../app/src/'+n,import.meta.url),'utf8');
let checks=0;const check=(v,label)=>{assert.ok(v,label);checks++;};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
class Session{
 constructor(state='inactive'){this.type='auto';this.state=state;this.events=new Set();}
 addEventListener(t,fn){if(t==='statechange')this.events.add(fn);}
 removeEventListener(t,fn){this.events.delete(fn);}
 setState(state){this.state=state;for(const fn of [...this.events])fn();}
}
class Media{
 constructor(){this.dataset={};this.events={};this.paused=true;this.ended=false;this.duration=5;this.readyState=4;this.currentTime=0;this._src='';this.volume=1;this.playbackRate=1;this.loads=0;this.writes=[];this.played=[];}
 get src(){return this._src;}set src(v){this.writes.push(v);this._src=v;this.currentTime=0;}
 getAttribute(n){return n==='src'?this.src:this[n];}removeAttribute(n){if(n==='src')this._src='';}
 load(){this.loads++;if(this.failLoad)throw Error('decoder reset failed');this.currentTime=0;}
 addEventListener(t,fn){(this.events[t]??=[]).push(fn);}emit(t){for(const fn of this.events[t]??[])fn();}
 pause(){this.paused=true;this.emit('pause');}
 play(){this.played.push(this.src);this.paused=false;this.emit('playing');return Promise.resolve();}
}
function fixture(state='inactive',options={}){
 const session=new Session(state),media=new Media(),window={},navigator={audioSession:session};
 const scope={window,navigator,document:{hidden:false,querySelectorAll:()=>[media]},setTimeout,clearTimeout,setInterval,clearInterval,Date};
 vm.runInNewContext(read('audio-route.js'),scope);
 const route=window.SiseonCreateAudioRoute({navigator,document:scope.document,wait:async()=>{},settleMs:10,quietMs:10,resetMs:10,...options});window.SiseonAudioRoute=route;
 vm.runInNewContext(read('narration-player.js'),scope);
 const player=window.SiseonNarration.create(media,{native:true,setInterval:()=>1,clearInterval(){}});
 return {player,media,route,session};
}
// Reproduce the reported sequence, with a page change while the mic is releasing.
for(const role of ['child','adult']){
 const {player:p,media:m,route:r}=fixture();p.src=role+'-0.mp3';await p.unlock();await p.beginCapture();
 const restoring=p.endCapture();p.pause();p.src=role+'-1.mp3';const playing=p.play();
 await restoring;await playing;
 check(m.loads===1,role+': changing pages during mic recovery must still reset the decoder');
 check(m.played.at(-1)===role+'-1.mp3'&&r.phase==='playback',role+': only the new page plays after recovery');
 check(m.volume===1&&m.playbackRate===1,role+': no gain or speed compensation');p.dispose();
}
{
 const {player:p,media:m}=fixture();p.src='old.mp3';await p.unlock();await p.beginCapture();const writes=m.writes.length;
 p.src='new.mp3';p.currentTime=2;check(m.writes.length===writes,'source changes during capture must remain deferred');
 const restore=p.endCapture(),play=p.play();await restore;await play;
 check(m.src==='new.mp3'&&m.currentTime===2,'latest source and seek apply after, rather than before, the reset');p.dispose();
}
{
 const {player:p,media:m,route:r,session:s}=fixture();await p.unlock();await p.beginCapture();m.failLoad=true;
 await p.endCapture();await r.whenPlaybackReady();check(r.phase==='playback'&&s.type==='playback','a decoder exception cannot strand playback in restoring');
 m.failLoad=false;p.src='replay.mp3';await p.play();check(m.played.at(-1)==='replay.mp3','the same unlocked player can replay after reset failure');p.dispose();
}
{
 const {route:r,session:s}=fixture('active');const capture=r.startCapture();await capture.ready;
 let reset=0,completed=false;const restoring=r.endCapture(capture.key,()=>reset++).then(()=>completed=true);await turn();
 check(!completed&&reset===0&&r.phase==='restoring','OS capture remains a barrier while the audio session is still active');
 s.setState('inactive');await restoring;
 check(completed&&reset===1&&s.type==='playback','the observed release event permits exactly one reset');
 check(r.trace().some(x=>x.event==='settled'&&x.result==='inactive'),'release evidence records state, never speech');
}
{
 const {route:r}=fixture('active',{settleMs:2});const c=r.startCapture();await c.ready;await r.endCapture(c.key);
 check(r.phase==='playback'&&r.trace().some(x=>x.result==='timeout'),'missing OS events have a bounded fallback');
}
{
 const {route:r,session:s}=fixture();const stuck={state:'running',addEventListener(){},close:()=>new Promise(()=>{})};r.registerContext(stuck);
 const c=r.startCapture();await c.ready;await r.endCapture(c.key,()=>new Promise(()=>{}));
 check(r.phase==='playback'&&s.type==='playback','stuck context/decoder promises do not permanently block the survey');
 check(r.trace().some(x=>x.event==='reset-failed'),'bounded reset failure is observable in local diagnostics');
}
{
 const {route:r,session:s}=fixture('active',{settleMs:10});const first=r.startCapture();await first.ready;
 let oldReset=0;const old=r.endCapture(first.key,()=>oldReset++);await turn();const second=r.startCapture();await second.ready;
 s.setState('inactive');await old;
 check(oldReset===0&&r.phase==='capturing'&&s.type==='play-and-record','a late old release cannot overwrite a newer microphone');
 await r.endCapture(second.key);check(r.phase==='playback','the newer capture can finish normally');
}
console.log(checks+' parent/child mic navigation, decoder failure, OS release, timeout, deferred source and stale capture regression checks passed');
