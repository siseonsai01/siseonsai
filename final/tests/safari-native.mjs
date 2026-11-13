import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import worker from '../worker/index.js';
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const ticks=new Map(),session={type:'auto'};let tick=0;
const window={};
const playerScope={window,navigator:{audioSession:session},setTimeout,clearTimeout,setInterval,clearInterval,Date};
vm.runInNewContext(fs.readFileSync(new URL('../app/src/audio-route.js',import.meta.url),'utf8'),playerScope);
vm.runInNewContext(fs.readFileSync(new URL('../app/src/narration-player.js',import.meta.url),'utf8'),playerScope);
class Media{
 constructor(){this.dataset={};this.events={};this.src='';this.paused=true;this.ended=false;this.currentTime=0;this.duration=5;this.readyState=4;this.calls=[];}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
 emit(type){for(const fn of this.events[type]??[])fn();}
 getAttribute(name){return this[name];}
 play(){this.calls.push(this.src);this.paused=false;this.ended=false;this.emit('playing');return Promise.resolve();}
 pause(){this.paused=true;this.emit('pause');}
}
const media=new Media(),p=window.SiseonNarration.create(media,{native:true,setInterval:fn=>{ticks.set(++tick,fn);return tick;},clearInterval:id=>ticks.delete(id)});
check(media.dataset.narrationEngine==='native','iPad route uses the one native media element');
p.src='intro.mp3';await assert.rejects(p.play(),{name:'NotAllowedError'});checks++;
const primed=p.unlock();check(media.calls.length===1&&media.calls[0].startsWith('data:audio/wav'),'permission is requested inside the first tap, before server awaits');
await primed;let ends=0,interrupts=0;p.addEventListener('ended',()=>ends++);p.addEventListener('interrupted',()=>interrupts++);
media.ended=true;media.emit('ended');check(ends===0,'silent primer cannot finish a story');
await p.play();check(media.calls.at(-1)==='intro.mp3'&&!p.paused,'real narration starts after an asynchronous transition');
media.emit('pause');check(interrupts===0,'a queued primer pause event cannot interrupt the new playing clip');
media.currentTime=5;media.ended=true;media.emit('ended');check(ends===1,'natural end advances once');
p.src='question.mp3';p.currentTime=0;await p.play();check(media.calls.at(-1)==='question.mp3','next clip reuses unlocked native player');
p.pause();check(interrupts===0,'explicit page navigation never reports a microphone interruption');
for(let i=0;i<3;i++){
 p.beginCapture();check(session.type==='play-and-record'&&p.paused,'microphone explicitly pauses narration');await p.unlock();check(session.type==='play-and-record','microphone taps do not overwrite the capture route');
 await p.endCapture();check(session.type==='playback','every microphone finish restores playback without amplification');await p.play();
}
media.pause();check(interrupts===1,'Safari external interruption is exposed for recovery');
p.pause();p.currentTime=2;await p.play();check(p.currentTime===2,'same clip can resume at its retained time');p.dispose();

// Safari may omit onend entirely; timers must still release the microphone once.
const timers=new Map();let timerId=0;const instances=[];
class Recognition{constructor(){instances.push(this);}start(){}stop(){}abort(){this.aborted=true;}}
const speechWindow={SpeechRecognition:Recognition};
vm.runInNewContext(fs.readFileSync(new URL('../app/src/speech-input.js',import.meta.url),'utf8'),{window:speechWindow,setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id)});
const fire=ms=>{for(const [id,t]of [...timers])if(t.ms===ms&&timers.has(id)){timers.delete(id);t.fn();}};
let ended=0;const texts=[];const input=speechWindow.SiseonVoiceInput.create({status(){},text:t=>texts.push(t),end:()=>ended++});
input.start();let r=instances.at(-1);fire(8000);check(!input.active&&r.aborted&&ended===1,'missing start signal releases capture');
input.start();r=instances.at(-1);r.onstart();const stale=r.onresult;input.stop();
r.onresult({results:[Object.assign([{transcript:'내 생각'}],{isFinal:true})]});fire(1000);check(!input.active&&ended===2&&texts.at(-1)==='내 생각','missing stop signal retains final text and releases capture');
stale({results:[Object.assign([{transcript:'오래된 말'}],{isFinal:true})]});check(texts.at(-1)==='내 생각','late microphone results cannot overwrite answers');
input.start();r=instances.at(-1);r.onstart();r.onerror({error:'network'});check(ended===3&&!input.active&&timers.size===0,'error without onend also releases capture exactly once');
input.start();r=instances.at(-1);r.onstart();fire(30000);check(ended===4&&!input.active,'silent never-ending recognition is bounded');

// Runtime files cannot be mixed with a previously cached release.
const requests=[];const env={ASSETS:{fetch:async req=>{requests.push(new URL(req.url));return new Response('asset',{headers:{'content-type':req.url.includes('.png')?'image/png':'text/javascript','cache-control':'public,max-age=31536000,immutable'}});}}};
for(const path of ['/app/app.js?release=20261114-19','/app/narration-player.js?release=20261114-19','/app/speech-input.js?release=20261114-19','/app/styles.css?release=20261114-19','/app/']){
 const response=await worker.fetch(new Request('https://example.test'+path),env,{});check(response.headers.get('cache-control')==='no-store'&&response.headers.get('x-siseon-release')==='20261114-19','runtime response requires the new release');
}
for(const role of ['parent','child'])for(const file of ['15_FVMD.html','a/egg.png','a/hog_FVMD.png']){
 const response=await worker.fetch(new Request('https://example.test/'+role+'/src/egg/'+file),env,{});check(response.status===200&&requests.at(-1).pathname==='/app/src/egg/'+file,'already-open old pages can still load egg assets');
}
const html=fs.readFileSync(new URL('../app/src/index.html',import.meta.url),'utf8');check([...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^\"]+\.(?:js|css)[^\"]*)"[^>]+data-inline/g)].every(m=>m[1].includes('release=20261114-19')),'all runtime dependencies select one release');
const app=fs.readFileSync(new URL('../app/src/app.js',import.meta.url),'utf8'),begin=app.slice(app.indexOf('async function beginFreshBook()'),app.indexOf('function bookRoleLabel()'));
for(const success of [true,false]){
 let resolve,reject;const pending=new Promise((ok,no)=>{resolve=ok;reject=no;}),shown=[],notices=[];const first={disabled:true};let retry=false;
 const c={stationSession:{id:'isolated',role:'child'},stationBusy:false,stationView:{connected:{child:true},prepared:true},familyView:{ownAnswers:[]},app:{querySelector:selector=>selector.includes('station-start')?first:selector.includes('.station-ready .actions')?{insertAdjacentHTML(){retry=true;}}:null},
  show:screen=>shown.push(screen),stationRequest:()=>pending,acceptStation:(data,initial,screen)=>shown.push(screen),startStationPolling(){},narrate(){},familyNotice:message=>notices.push(message),markNextReady(){}};
 vm.runInNewContext(begin,c);const running=c.beginFreshBook();check(shown.join(',')==='intro'&&c.stationBusy&&first.disabled,'the tap opens preparation before any server/audio completion');
 if(success)resolve({prepared:true,connected:{child:true}});else reject(Error('offline'));await running;
 check(!c.stationBusy&&!shown.includes('home'),'settling the request never renders the cover again');
 check(success?!first.disabled:first.disabled&&retry&&notices.length===1,'only prepared data enables the first page; failure provides retry');
}
console.log(checks+' native iPad playback, microphone missing-event cleanup, release-cache and old-page compatibility checks passed');
