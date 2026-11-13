import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app/src/app.js',import.meta.url),'utf8');
const voices=JSON.parse(source.match(/const offlineVoice = (\{.*?\});/)[1]);
let checks=0;
const nodes=Array.from({length:2},()=>({spoken:false,classList:{toggle(name,value){this.owner.spoken=value;},remove(){this.owner.spoken=false;}}}));nodes.forEach(n=>n.classList.owner=n);
const context={offlineVoice:voices,reviewChoices:['A','B'],state:{role:'child',index:0},currentScreen:'quiz',voiceEnabled:true,playingScene:null,narrationQueue:[],playbackId:0,coverMotion:null,
  document:{hidden:false},app:{querySelectorAll:()=>nodes,querySelector:()=>null},stopPageTurnSound(){},stopCoverMotion(){},syncVoiceControls(){},markNextReady(){},clearNextReady(){},startCoverMotion(){},motionAllowed:()=>false};
const played=[];
context.voiceAudio={handlers:{},paused:true,ended:false,currentTime:0,src:'',getAttribute(){return this.src;},play(){this.paused=false;this.ended=false;played.push(context.playingScene);return Promise.resolve();},pause(){this.paused=true;},addEventListener(type,handler){this.handlers[type]=handler;}};
const highlight=source.slice(source.indexOf('function highlightSpokenChoice()'),source.indexOf('// Adapted from',source.indexOf('function highlightSpokenChoice()')));
const speech=source.slice(source.indexOf('function stopNarration('),source.indexOf('voiceAudio.addEventListener("timeupdate"'));
const ended=source.match(/voiceAudio\.addEventListener\("ended", \(\) => \{[\s\S]*?\n\}\);/)[0];
vm.runInNewContext(highlight+'\n'+speech+'\n'+ended,context);
for(let index=0;index<5;index++){
  context.state={role:'child',index};played.length=0;context.narrate('child-'+index);
  const expected=['story-'+index,'child-'+index,...(index===0?['choices-intro']:[]),'option-child-'+index+'-A','option-child-'+index+'-B','choices-ready'];
  assert.equal(context.playingScene,expected[0]);
  while(context.playingScene){
    const match=/option-child-\d-([AB])/.exec(context.playingScene);
    assert.deepEqual(nodes.map(n=>n.spoken),match?[match[1]==='A',match[1]==='B']:[false,false]);checks++;
    context.voiceAudio.ended=true;context.voiceAudio.handlers.ended();
  }
  assert.deepEqual(played,expected);checks++;
}
context.state={role:'child',index:2};context.narrate('child-2');context.stopNarration();assert.equal(context.narrationQueue.length,0);assert.ok(nodes.every(n=>!n.spoken));checks++;
context.state={role:'adult',index:3};played.length=0;context.narrate('adult-3');context.voiceAudio.ended=true;context.voiceAudio.handlers.ended();assert.deepEqual(played,['story-3','adult-3']);context.stopNarration();checks++;
for(const [scene,file]of Object.entries(voices)){assert.ok(fs.existsSync(new URL('../app/src/'+file,import.meta.url)),scene+' missing asset');}
checks++;
const start=source.indexOf('const surveyCodeNames ='),end=source.indexOf('function typeKeys(',start);
const profiles=vm.runInNewContext(source.slice(start,end)+';({typeProfile,surveyCodeNames})');
const names=vm.runInNewContext('('+source.match(/const characters = (\{[\s\S]*?\n\});/)[1]+')');
for(const code of Object.keys(names)){const p=profiles.typeProfile(code);assert.ok(p.summary.length>50&&p.support.length>30&&p.brief.length>30);assert.ok(!/수납|진열|실용|감성/.test(p.summary));checks++;}
assert.equal((source.match(/class="chart-example/g)||[]).length,0);assert.ok(!source.includes('chart-axis-key chart-answer-key'));checks++;
for(const name of fs.readdirSync(new URL('../app/src/egg/',import.meta.url)).filter(n=>/^\d\d_.*\.html$/.test(n))){
  const html=fs.readFileSync(new URL('../app/src/egg/'+name,import.meta.url),'utf8');
  assert.ok(html.includes("sendGuide('ready')")&&html.includes("sendGuide('error')")&&html.includes("hostNarrating ? 0.15 : 1"));
  new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);checks++;
}
console.log(checks+' narration, picture-choice, type-profile and egg lifecycle checks passed');
