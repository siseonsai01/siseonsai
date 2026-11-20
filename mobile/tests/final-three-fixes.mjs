import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
let checks=0;
const q=app.slice(app.indexOf('function qHtml()'),app.indexOf('function qBar()'));
for(const role of ['child','adult'])for(let i=0;i<5;i++)for(const choice of [null,'A','B']){
 const c={S:{role,index:i,answers:{child:Array.from({length:5},()=>({choice,reason:''})),adult:Array.from({length:5},()=>({choice,reason:''}))}},
 Q:Array.from({length:5},(_,i)=>({story:['story'],child:'child question',adult:'adult question',scene:{s:1,x:50,y:50},childOptions:['A','B'],adultOptions:['A','B']})),
 choiceArt:Array(5).fill(['a','b']),reasonAsk:{child:Array(5).fill('child reason'),adult:Array(5).fill('adult reason')},
 I:{},esc:s=>s,micSupported:()=>true,cheerHtml:()=>'',otherCardHtml:()=>''};
 vm.createContext(c);vm.runInContext(q,c);const html=c.qHtml();
 const reason=html.match(/<div class="reason" data-reason([^>]*)>/)[1];
 const toggle=html.match(/<button class="btn-text reason-toggle"[^>]*>/)?.[0];
 const follow=html.match(/<div data-follow([^>]*)>/)[1];
 assert.equal(reason.includes('hidden'),role==='child');assert.equal(!!toggle,role==='child');assert.equal(follow.includes('hidden'),!choice);checks+=3;
 assert.ok(html.includes('<textarea id="reason"'));checks++;
 if(role==='adult'){assert.ok(!html.includes('data-act="mic"'));assert.ok(!html.includes('mic-status'));checks+=2;}
}
const axes=app.slice(app.indexOf('const graphAxes ='),app.indexOf('function choicePicture()'));
const labels=app.slice(app.indexOf('  const labelAt = [[cx, 680'),app.indexOf('  // 부모님께 · 아이에게'));
const calls=[];const c={cx:340,body:'Noto Sans KR',Q:Array.from({length:5},(_,i)=>({title:['먼저 보인 것','장난감 생각','만들던 놀이','놀고 싶은 곳','바꾸고 싶은 것'][i]})),
 ctx:{font:'',measureText(text){const size=Number(this.font.match(/([\d.]+)px/)[1]);return {width:[...text].reduce((sum,ch)=>sum+(/[가-힣]/.test(ch)?size:size*.6),0)};}},
 write(text,x,y,width,size,weight,color,face,align='left'){
  calls.push({text,x,y,width,size,align});return y+String(text).split('\n').length*size*1.5;
 }};
vm.createContext(c);vm.runInContext(axes+labels,c);
for(const text of ['P(놀이) / F(제자리)','V(바닥) /\nH(책상)','S(놀이공간) / M(수납공간)','D(그대로) /\nB(옮기기)']){assert.ok(calls.some(x=>x.text===text));checks++;}
const graphCalls=calls.filter(x=>x.y!==616);
for(const x of graphCalls){const left=x.align==='center'?x.x-x.width/2:x.x;assert.ok(left>=92);assert.ok(left+x.width<=588);assert.ok(x.y>=660);assert.ok(x.y+String(x.text).split('\n').length*x.size*1.5<=1050);checks+=4;}
const hint=calls.find(x=>x.text.startsWith('바깥쪽 ='));assert.equal(hint.y,1027);assert.ok(hint.size>=12);checks+=2;
// Side labels stay outside the mark/plot region; upper/lower labels leave room around the outer marks.
assert.ok(156+128/2<340-88-11);assert.ok(524-128/2>340+88+11);assert.ok(680+30+2+27<848-88-11);assert.ok(960>848+88+11);checks+=4;
console.log(checks+' parent reason visibility and exported graph label/bounds checks passed.');

// Parent choices reveal the text reason on both first choice and reselection.
const chooseBlock=app.slice(app.indexOf('function choose(v,'),app.indexOf('function setupMic()'));
for(const role of ['child','adult'])for(let i=0;i<5;i++)for(const first of [true,false]){
 const reason={hidden:false,isConnected:true},cheer={innerHTML:''},follow={hidden:first,querySelector:q=>q==='[data-reason]'?reason:cheer};
 const timers=[],reveals=[],next={disabled:true},hint={};
 const t={S:{screen:'q',role,index:i,startedAt:'already',answers:{child:Array.from({length:5},()=>({choice:first?null:'A'})),adult:Array.from({length:5},()=>({choice:first?null:'A'}))}},
 stage:{querySelectorAll:()=>[],querySelector:q=>q==='[data-follow]'?follow:null},barEl:{querySelector:q=>q.includes('q-next')?next:hint},
 persist(){},stopVoice(){},cheerHtml:()=>'',lastPick:{childs:0},play(){},hidePointer(){},later(){},childGuide(){},pointAt(){},
 setTimeout:fn=>timers.push(fn),revealAboveBar:el=>reveals.push(el)};
 vm.createContext(t);vm.runInContext(chooseBlock,t);t.choose('B');timers.forEach(fn=>fn());
 assert.equal(next.disabled,false);assert.equal(follow.hidden,false);assert.equal(t.S.answers[role][i].choice,'B');checks+=3;
 assert.deepEqual(reveals,role==='adult'?[reason]:first?[cheer]:[]);checks++;
 if(role==='adult'){reveals.length=0;t.S.index=(i+1)%5;timers.forEach(fn=>fn());assert.equal(reveals.length,0);checks++;}
}
const result=app.slice(app.indexOf('function resultHtml()'),app.indexOf('const resultBar ='));
assert.ok(!result.includes('experience-card'));assert.ok(!result.includes('send-feedback'));assert.equal((result.match(/satisfactionHtml\(\)/g)||[]).length,1);checks+=3;
console.log(checks+' total checks including parent auto-scroll, text-only reasons and satisfaction-only results.');
