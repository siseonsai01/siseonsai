import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=n=>fs.readFileSync(new URL('../app/src/'+n,import.meta.url),'utf8');
const source=read('app.js');
const reason=source.slice(source.indexOf('function reasonVoiceSupported()'),source.indexOf('function syncGuidePointer()'));
const next=source.slice(source.indexOf('async function finishBookPage()'),source.indexOf('function markNextReady()'));
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;};
for(const role of ['child','adult'])for(const ending of ['delayed-final','interim-only','network-error']){
 let recognizer,expected='마지막으로 말한 검수 답변';const advanced=[],saved=[],reads=[];
 class Recognition{constructor(){recognizer=this;}start(){this.onstart?.();}abort(){}stop(){setTimeout(()=>{
   if(ending==='network-error')this.onerror?.({error:'network'});
   else {this.onresult?.({results:[Object.assign([{transcript:expected}],{isFinal:ending==='delayed-final'})]});this.onend?.();}
 },5);}}
 const mic={isConnected:true,setAttribute(){},disabled:false},button={disabled:false},status={textContent:''},field={value:'',dispatchEvent(){c.reviewAnswers[role][0].reason=this.value;}};
 const c={window:{SpeechRecognition:Recognition,SiseonAudioRoute:{phase:'playback'}},setTimeout,clearTimeout,Event,Promise,
 state:{role,index:0},reviewAnswers:{[role]:Array.from({length:5},()=>({choice:'A',reason:''}))},familySession:{role,code:'isolated'},familyBusy:false,bookTurn:false,currentScreen:'quiz',reasonVoice:null,reasonVoiceKey:null,micResumeByTap:false,
 voiceAudio:{beginCapture(){return Promise.resolve();},async endCapture(){}},stopNarration(){},stopNextCue(){},stopPageTurnSound(){},syncGuidePointer(){},narrate:s=>reads.push(s),holdNarration(){},setupReasonVoice(){},
 app:{querySelector:s=>s.includes('reason-mic-status')?status:s.includes('reason-mic')?mic:s.includes('review-next')?button:s.includes('[name=')?field:null},
 familyNotice:m=>{throw Error(m);},setFamilyAnswers(){},show(){},edit(r,i){advanced.push(i);c.state.index=i;},
 async queueFamilySave(){saved.push(c.reviewAnswers[role][0].reason);return {bothComplete:false};}};
 vm.createContext(c);vm.runInContext(read('speech-input.js'),c);vm.runInContext(reason+'\n'+next,c);
 await c.toggleReasonVoice();check(c.reasonVoice.active,role+' microphone started');
 const finishing=c.finishBookPage();check(button.disabled,role+' cannot submit twice while final speech arrives');
 await finishing;await new Promise(resolve=>setTimeout(resolve,10));
 assert.deepEqual(advanced,[1]);checks++;
 if(ending==='network-error')check(saved[0]===''&&!status.textContent.includes('소리를 준비'),'failed recognition can progress with a clear status');
 else check(saved[0]===expected,role+' '+ending+' must save the actual recognized last words before changing pages');
 check(reads.length===0,'old-page follow-up audio cannot restart while moving to the next question');
 check(!c.familyBusy&&button.disabled,'page finishes once and releases the navigation lock');
}
console.log(checks+' parent/child final dictation, interim fallback, error and immediate-next persistence checks passed');
