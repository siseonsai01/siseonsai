import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app/src/app.js',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('function eggAsset('),source.indexOf('function missionPlan('));
let checks=0;
for(const path of ['/parent/private-key','/child/private-key','/app/','/app/index.html','/app/src/index.html']){
  const c={URL,document:{baseURI:'https://example.test/app/'},location:{pathname:path,href:'https://example.test'+path}};
  vm.runInNewContext(helper,c);
  for(const asset of ['09_PHSD.html','a/egg.png','a/hog_PVMD.png']){assert.equal(c.eggAsset(asset),'https://example.test/app/src/egg/'+asset);checks++;}
}
const names=fs.readdirSync(new URL('../app/src/egg/',import.meta.url)).filter(x=>/^\d\d_.*\.html$/.test(x));
for(const name of names){
  const html=fs.readFileSync(new URL('../app/src/egg/'+name,import.meta.url),'utf8');
  const code=name.slice(3,7);assert.ok(fs.existsSync(new URL('../app/src/egg/a/hog_'+code+'.png',import.meta.url)));checks++;
  const boot=html.slice(html.indexOf('async function boot()'),html.indexOf('// Embedded storybook lifecycle adapter'));
  const guides=[],loading={hidden:false},c={G:null,IMG:{},TYPE_CODE:code,TYPE_NAME:'test',imgNames:[],ec:null,ex:null,st:null,EMBEDDED:true,
    fetch:async()=>({json:async()=>({pieces:[],EW:10,EH:10})}),loadImages:async names=>names.map(()=>({})),prepCracks(){},newState:()=>({}),nowS:()=>0,updateHud(){},sendGuide:stage=>guides.push(stage),fetchSounds(){},requestAnimationFrame(){},frame(){},setTimeout:fn=>{fn();return 0;},
    document:{fonts:{load:()=>new Promise(()=>{})},createElement:()=>({getContext:()=>({})}),getElementById:()=>loading}};
  vm.runInNewContext(boot,c);await c.boot();assert.deepEqual(guides,['ready']);assert.equal(loading.hidden,true);checks++;
}
// The parent can progress without a game loading or microphone recognition.
const reveal=source.slice(source.indexOf('function revealEndingFriend('),source.indexOf('function queueEggGuide('));
for(const role of ['child','adult']){
  const actual=role==='child'?'PVMD':'PHSD',friend={hidden:true,dataset:{},querySelector:()=>({focus(){}})},slot={hidden:false},invitation={hidden:false};let removed=0,played;
  const play={querySelector:selector=>selector==='#ending-egg-frame'?{remove(){removed++;}}:selector==='.egg-game-slot'?slot:selector==='.egg-invitation'?invitation:friend};
  const c={currentScreen:'report',characterCode:()=>actual,endingRole:()=>role,app:{querySelector:()=>play},eggLoadTimer:1,clearTimeout(){},stopNarration(){},narrationQueue:[],playNarrationClip:scene=>played=scene,markNextReady(){}};
  vm.runInNewContext(reveal,c);c.revealEndingFriend(role==='child'?'PHSD':'PVMD');assert.equal(removed,0);c.revealEndingFriend();assert.equal(removed,1);assert.equal(friend.hidden,false);assert.equal(slot.hidden,true);assert.equal(friend.dataset.hatchedCode,actual);assert.equal(played,'friend-'+actual);checks++;
}
// A frozen narration clock can no longer rewind the cover illustration.
const update=source.slice(source.indexOf('function updateCoverMotion('),source.indexOf('function mountCoverVideo('));
let seeks=0,time=3;const video={readyState:4,duration:18,get currentTime(){return time;},set currentTime(v){time=v;seeks++;}};
const m={silent:false,video,line:0,text:null};const c={coverMotion:m,playingScene:'cover',voiceAudio:{currentTime:0,duration:20},COVER_MOTION_LEAD:.4,coverCaptions:[[0,'hello']],parentCoverCaptions:[[0,'parent']],roleVoiceScene:()=> 'cover'};
vm.runInNewContext(update,c);for(let i=0;i<120;i++)c.updateCoverMotion(m);assert.equal(seeks,0);assert.equal(time,3);checks++;
console.log(checks+' stable-role egg URLs, all 16 font-independent game boots, role-correct fallback and no-rewind cover checks passed');
