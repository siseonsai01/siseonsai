import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const playerSource=fs.readFileSync(new URL('../app/src/narration-player.js',import.meta.url),'utf8');
const appSource=fs.readFileSync(new URL('../app/src/app.js',import.meta.url),'utf8');
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(fetcher=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})){
  const contexts=[],ticks=new Map();let tickId=0;
  class Context{
    constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=24000;this.destination={};this.events={};this.sources=[];contexts.push(this);}
    addEventListener(type,fn){this.events[type]=fn;}
    resume(){this.state='running';return Promise.resolve();}
    suspend(){this.state='suspended';return Promise.resolve();}
    close(){this.state='closed';return Promise.resolve();}
    createBuffer(){return {duration:0};}
    createBufferSource(){const node={onended:null,connect(){},disconnect(){},start:(when,offset)=>{node.started=true;node.offset=offset;},stop(){node.stopped=true;}};this.sources.push(node);return node;}
    decodeAudioData(bytes,resolve){const buffer={duration:10};resolve(buffer);return Promise.resolve(buffer);}
  }
  const session={type:'auto'};
  const scope={window:{AudioContext:Context,fetch:fetcher},document:{baseURI:'https://example.test/app/'},navigator:{audioSession:session},URL,AbortController,setTimeout,clearTimeout,setInterval,clearInterval};
  vm.runInNewContext(fs.readFileSync(new URL('../app/src/audio-route.js',import.meta.url),'utf8'),scope);
  vm.runInNewContext(playerSource,scope);
  const media={};const player=scope.window.SiseonNarration.create(media,{Context,fetch:fetcher,setInterval:fn=>{ticks.set(++tickId,fn);return tickId;},clearInterval:id=>ticks.delete(id)});
  return {player,contexts,session,tick(){for(const fn of [...ticks.values()])fn();}};
}

{
  const f=fixture(),p=f.player;p.src='voice.mp3';
  await assert.rejects(p.play(),{name:'NotAllowedError'});checks++;
  const unlocking=p.unlock();check(f.contexts[0].state==='running','unlock must resume synchronously in the tap handler');
  await unlocking;await turn();await p.play();
  check(!p.paused,'asynchronous load after tap plays');
  const ctx=f.contexts[0];let ended=0;p.addEventListener('ended',()=>ended++);
  ctx.currentTime=9.99;f.tick();check(ended===0&&!p.paused,'never truncate the ending');
  ctx.sources.at(-1).onended();check(ended===1&&p.ended,'natural ending fires once');
  f.tick();check(ended===1,'timer cannot repeat the ending');
  p.src='second.mp3';await turn();await p.play();check(f.contexts.length===1&&!p.paused,'next clip needs no second gesture');
  ctx.currentTime+=10.2;f.tick();check(ended===2&&p.ended,'missing ended callback recovers after the full duration');
  p.dispose();
}
{
  let resolveFetch;
  const f=fixture(()=>new Promise(resolve=>{resolveFetch=resolve;})),p=f.player;
  await p.unlock();p.src='delayed.mp3';const pending=p.play();await turn();p.pause();
  resolveFetch({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
  await assert.rejects(pending,{name:'AbortError'});checks++;
  check(p.paused&&f.contexts[0].sources.length===1,'navigation cancels stale decoding without playing');p.dispose();
}
{
  const f=fixture(),p=f.player;await p.unlock();p.src='a.mp3';await p.play();
  let ended=0,interrupted=0;p.addEventListener('ended',()=>ended++);p.addEventListener('interrupted',()=>interrupted++);
  const old=f.contexts[0],source=old.sources.at(-1);old.currentTime=4;old.state='interrupted';old.events.statechange();
  check(p.paused&&p.currentTime===4&&interrupted===1,'interruption preserves the current position');
  check(source.onended===null&&ended===0,'stopping cannot fake a natural ending');
  await p.unlock();check(f.contexts.length===2&&old.state==='closed','gesture replaces an interrupted Safari context');
  await p.play();check(f.contexts[1].sources.at(-1).offset===4,'resume uses preserved position');
  const controller=new AbortController();let count=0;const fn=()=>count++;
  p.addEventListener('timeupdate',fn,{signal:controller.signal});controller.abort();f.tick();check(count===0,'aborted screen listeners are removed');p.dispose();
}
{
  const f=fixture(async()=>{throw Error('network offline');}),p=f.player;await p.unlock();p.src='bad.mp3';
  await assert.rejects(p.play(),/offline/);checks++;check(p.paused,'load failure leaves playback stopped for explicit recovery');p.dispose();
}
{
  const f=fixture(),p=f.player;await p.unlock();p.src='question.mp3';
  for(let i=0;i<3;i++){
    p.beginCapture();check(f.session.type==='play-and-record'&&f.contexts[0].state==='suspended','capture explicitly suspends narration and selects the recording route');
    await p.unlock();check(f.session.type==='play-and-record','a microphone tap cannot switch the route back');
    await assert.rejects(p.play(),{name:'NotAllowedError'});checks++;
    await p.endCapture();check(f.session.type==='playback'&&f.contexts[0].state==='running','capture end restores the original playback route before speech');
    await p.play();p.pause();
  }
  check(f.contexts.length===1,'repeated dictation reuses one player instead of stacking outputs');p.dispose();
}

// Real app queue/lifecycle functions with an isolated document and player.
const voices=JSON.parse(appSource.match(/const offlineVoice = (\{.*?\});/)[1]);
const handlers={},played=[],inserted=[];
const c={offlineVoice:voices,state:{role:'child',index:2},currentScreen:'quiz',familySession:{code:'test-family'},voiceEnabled:true,playingScene:null,narrationQueue:[],narrationRecovery:null,playbackId:0,coverMotion:null,missionPausedVoice:null,reasonVoice:null,
  document:{hidden:false,addEventListener(){}},app:{querySelector:()=>null,querySelectorAll:()=>[],insertAdjacentHTML:(where,html)=>inserted.push(html)},
  voiceAudio:{src:'',currentTime:0,paused:true,ended:false,getAttribute(){return this.src;},play(){this.paused=false;played.push([c.playingScene,this.currentTime]);return Promise.resolve();},pause(){this.paused=true;},addEventListener:(name,fn)=>handlers[name]=fn,unlock(){c.unlocks=(c.unlocks||0)+1;return Promise.resolve();}},
  stopNextCue(){},stopCoverMotion(){},stopPageTurnSound(){},cancelReasonVoice(){},syncVoiceControls(){},highlightSpokenChoice(){},markNextReady(){},startCoverMotion(){},bookRoleLabel:()=>c.state.role==='adult'?'부모용':'아이용',reasonVoiceSupported:()=>true,missionMotion:null};
const speech=appSource.slice(appSource.indexOf('function stopNarration('),appSource.indexOf('voiceAudio.addEventListener("timeupdate"'));
vm.runInNewContext(speech,c);
c.narrate('child-2');c.voiceAudio.currentTime=3.25;
const expectedQueue=[...c.narrationQueue];
c.document.hidden=true;c.suspendNarrationForPage();
check(c.narrationRecovery.scene==='story-2'&&c.narrationRecovery.time===3.25,'background preserves the in-progress story');
assert.deepEqual([...c.narrationRecovery.queue],expectedQueue);checks++;
c.document.hidden=false;c.restoreNarrationForPage();check(played.at(-1)[0]==='story-2'&&played.at(-1)[1]===3.25,'foreground resumes the same clip');
assert.deepEqual([...c.narrationQueue],expectedQueue);checks++;
handlers.interrupted();check(c.narrationRecovery&&inserted.at(-1).includes('resume-voice'),'interruption exposes a recovery button');
c.resumeNarration();check(c.playingScene==='story-2'&&c.narrationQueue.length===expectedQueue.length,'recovery retains all remaining prompts');
handlers.error();check(c.narrationRecovery?.scene==='story-2','media errors preserve the queue too');
c.stopNarration();check(c.narrationRecovery===null&&c.narrationQueue.length===0,'mute/navigation clears recovery');
c.holdNarration('child-2',['choices-ready'],1);c.state.index=3;const before=played.length;c.resumeNarration();check(played.length===before,'old page recovery cannot play on another page');c.stopNarration();
c.voiceEnabled=false;c.unlockNarration({type:'click',isTrusted:true});check(!c.unlocks,'muted generic taps do not start audio');
c.voiceEnabled=true;c.unlockNarration({type:'click',isTrusted:false});check(!c.unlocks,'synthetic clicks cannot unlock');
c.unlockNarration({type:'click',isTrusted:true});check(c.unlocks===1,'trusted first tap unlocks before asynchronous work');
c.voiceAudio.play=()=>Promise.reject(Error('blocked'));c.state.index=0;c.narrate('child-0');await turn();
check(c.narrationRecovery?.scene==='story-0'&&c.narrationRecovery.queue.includes('option-child-0-B'),'rejected play preserves child option narration');

// Availability effects are independent of narration, reduced motion, and silent cover video.
const buttons=['station-start','review-next','resume-voice'].map(action=>({dataset:{action},disabled:false,hidden:false,closest:()=>null,classes:new Set(),classList:{toggle(name,on){on?this.owner.classes.add(name):this.owner.classes.delete(name);}}}));buttons.forEach(b=>b.classList.owner=b);
buttons.push({...buttons[0],disabled:true,classes:new Set(),classList:{toggle(name,on){check(!on,'disabled step never glows');}}});
const ready={app:{querySelectorAll(selector){check(selector.includes('station-start')&&selector.includes('resume-voice'),'first-page and recovery actions are included');return buttons;}},playingScene:'story-0',coverMotion:{silent:true},queueNextCue(){},syncGuidePointer(){},motionAllowed:()=>false};
vm.runInNewContext(appSource.slice(appSource.indexOf('function markNextReady()'),appSource.indexOf('function clearNextReady()')),ready);ready.markNextReady();
check(buttons.slice(0,3).every(b=>b.classes.has('next-ready')),'enabled actions glow even during narration or reduced motion');
const css=fs.readFileSync(new URL('../app/src/styles.css',import.meta.url),'utf8');
check(css.includes('.next-ready {\n  outline:3px')||/\.next-ready\s*\{\s*outline:3px/.test(css),'static gold outline remains outside motion media rules');
check(!appSource.includes('AbortSignal.timeout('),'older Safari requests do not require AbortSignal.timeout');
console.log(checks+' Safari playback, interruption, full-queue recovery, stale-navigation and independent-button checks passed');
