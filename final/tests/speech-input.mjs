import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app/src/speech-input.js',import.meta.url),'utf8');
const instances=[];
class Recognition{
 constructor(){instances.push(this);}
 start(){this.started=true;this.onstart?.();}
 stop(){this.stopped=true;this.onend?.();}
 abort(){this.aborted=true;}
}
const window={SpeechRecognition:Recognition};vm.runInNewContext(source,{window});
const events=[],texts=[];let ended=0;
const input=window.SiseonVoiceInput.create({status:t=>events.push(t),text:t=>texts.push(t),end:()=>ended++});
assert.equal(instances.length,0);assert.equal(input.active,false);
assert.equal(input.start('내 생각'),true);let r=instances.at(-1);
assert.equal(r.lang,'ko-KR');assert.equal(r.continuous,false);assert.equal(input.active,true);
const result=(text,final)=>Object.assign([{transcript:text}],{isFinal:final});
r.onresult({results:[result('장난감',false)]});assert.equal(texts.length,0);
r.onresult({results:[result('장난감 집',true),result('좋아',false)]});assert.equal(texts.at(-1),'내 생각 장난감 집');
r.onresult({results:[result('장난감 집',true),result('좋아요',true)]});assert.equal(texts.at(-1),'내 생각 장난감 집좋아요');
input.stop();assert.equal(ended,1);assert.equal(input.active,false);
input.start();r=instances.at(-1);const stale=r.onresult;input.cancel();stale({results:[result('오래된 말',true)]});assert.equal(texts.at(-1),'내 생각 장난감 집좋아요');assert.equal(r.aborted,true);
input.start('가'.repeat(179));r=instances.at(-1);r.onresult({results:[result('장난감',true)]});assert.equal(texts.at(-1).length,180);
r.onerror({error:'not-allowed'});assert.match(events.at(-1),/허용되지/);r.onend();assert.equal(input.active,false);
const unsupported={};vm.runInNewContext(source,{window:unsupported});assert.equal(unsupported.SiseonVoiceInput.supported(),false);
assert.equal(unsupported.SiseonVoiceInput.create({status:t=>events.push(t)}).start(),false);
console.log('14 microphone consent, dictation text, stale-result and fallback checks passed');
