import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
let checks = 0;
for (const file of fs.readdirSync(new URL('egg/', root)).filter(n => /^\d\d_.*\.html$/.test(n))) {
  const html = fs.readFileSync(new URL('egg/' + file, root), 'utf8');
  for (const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
  const tap = html.slice(html.indexOf('function tap(e)'), html.indexOf('function startSwing('));
  const visual = html.slice(html.indexOf('function eggVisual('), html.indexOf('const VOICE ='));
  const visualContext={};vm.createContext(visualContext);vm.runInContext(visual,visualContext);
  assert.equal(visualContext.eggVisual(1).glow,0);assert.equal(visualContext.eggVisual(2).glow,0);
  assert.ok(visualContext.eggVisual(3).glow>0);assert.ok(visualContext.eggVisual(4).glow>visualContext.eggVisual(3).glow);
  for(let n=1;n<4;n++)assert.ok(visualContext.eggVisual(n+1).level>visualContext.eggVisual(n).level);checks+=7;
  const hud = html.slice(html.indexOf('function updateHud()'), html.indexOf('// ---------- swing:'));
  for (const spacing of [0, 0.05, 2.05, 10]) {
    const timers = [], sent = [], cv = {dataset: {}};
    let timerId=0;
    const c = {st: {done:false,burstT:null,taps:0,requestedTaps:0,startedAt:null,tapTimer:null,called:false,p:0,hits:0,strength:0,lastTap:-9},
      TAP_TARGET:Number(html.match(/const TAP_TARGET = (\d+)/)[1]), HATCH_SECONDS:Number(html.match(/HATCH_SECONDS = ([\d.]+)/)[1]), BURST_SECONDS:Number(html.match(/BURST_SECONDS = ([\d.]+)/)[1]), TAP_INTERVAL:2.05, EMBEDDED:true, TYPE_CODE:file.slice(3,7), INTRO:[], now:0,
      nowS:()=>c.now, clamp:n=>Math.max(0,Math.min(1,n)), callOut(){}, startSwing(){c.st.swing={hit:false};},
      cv, fillEl:{style:{}}, hintEl:{hidden:false,parentElement:{classList:{toggle(){}}}},
      hitBtn:{classList:{add(){},remove(){}}}, parent:{postMessage:m=>sent.push({message:m,at:c.now})}, location:{origin:'https://test.example'},
      setTimeout:(fn,ms)=>{const id=++timerId;timers.push({fn,at:c.now+ms/1000,id});return id;}};
    assert.equal(c.TAP_TARGET,5);assert.equal(c.HATCH_SECONDS,10);checks+=2;
    vm.createContext(c);vm.runInContext(hud + '\n' + tap, c);
    const advance=to=>{while(timers.some(t=>t.at<=to+1e-9)){timers.sort((a,b)=>a.at-b.at);const t=timers.shift();c.now=t.at;t.fn();}c.now=to;};
    for(let n=1;n<=5;n++){advance((n-1)*spacing);c.tap({});assert.equal(c.st.requestedTaps,n);checks++;}
    c.tap({});assert.equal(c.st.requestedTaps,5);checks++;
    if(spacing<2.05){assert.equal(c.st.burstT,null);advance(8.19);assert.equal(c.st.taps,4);assert.equal(sent.length,0);checks+=3;}
    const expected=Math.max(8.2,4*spacing)+1.8;
    advance(expected-.001);assert.equal(sent.length,0);checks++;
    advance(expected+.005);assert.equal(c.st.done,true);assert.equal(c.st.taps,5);assert.equal(sent.length,1);checks+=3;
    assert.ok(Math.abs(sent[0].at-expected)<.003);assert.equal(sent[0].message.code,file.slice(3,7));checks+=2;
    c.tap({});advance(expected+20);assert.equal(sent.length,1);checks++;
    // Old delayed steps cannot mutate a restarted standalone game.
    c.st={done:false,burstT:null,taps:0,requestedTaps:0,startedAt:null,tapTimer:null,called:false,p:0,hits:0,strength:0,lastTap:-9};
    c.tap({});c.tap({});const old=c.st;c.st={...old,taps:0,requestedTaps:0};advance(c.now+3);assert.equal(c.st.taps,0);checks++;
  }
}

const app = fs.readFileSync(new URL('src/app.js', root), 'utf8');
const listener = app.slice(app.indexOf("addEventListener('message', (e) => {", app.indexOf('/* ---------- 알깨기')), app.indexOf('/* ---------- 시트 ---------- */'));
for (const role of ['child','adult']) {
  const timers=[],revealed=[],frame={contentWindow:{}};
  const c={S:{screen:'egg',eggStage:role},document:{getElementById:()=>frame},location:{origin:'https://test.example'},
    code:r=>r==='child'?'PVSD':'FVMB',stage:{querySelector:()=>null},eggTimer:0,skipTimer:0,
    clearTimeout(){},setTimeout:fn=>timers.push(fn),hatched:r=>revealed.push(r),
    addEventListener:(name,fn)=>{c.message=fn;}};
  vm.createContext(c);vm.runInContext(listener,c);
  const msg={origin:c.location.origin,source:frame.contentWindow,data:{type:'siseon-egg-hatched',code:c.code(role)}};
  c.message({...msg,origin:'https://other.example'});assert.equal(timers.length,0);checks++;
  c.message(msg);timers.shift()();assert.deepEqual(revealed,[role]);checks++;
  c.message(msg);c.S.eggStage=role==='child'?'adult':'child';timers.shift()();assert.deepEqual(revealed,[role]);checks++;
}

const graph = app.slice(app.indexOf('const graphAxes = ['), app.indexOf('/* ---------- 정리 친구 16종'));
const g={S:{answers:{child:Array(5).fill({choice:'A'}),adult:Array(5).fill({choice:'B'})}},
  code:r=>r==='child'?'PVSD':'FHMB',Q:Array.from({length:5},(_,i)=>({title:'문항'+i})),
  optionLabel:()=>'',esc:s=>s,codeNames:{}};
vm.createContext(g);vm.runInContext(graph,g);
const svg=g.choicePicture();
assert.match(svg,/<g class="marks child"><circle cx="160" cy="59"/);checks++;
assert.match(svg,/<g class="marks adult"><rect x="154" y="83"/);checks++;
for (const label of ['P(놀이) / F(제자리)','V(바닥)','H(책상)','S(놀이공간) / M(수납공간)','D(그대로)','B(옮기기)']) {assert.ok(svg.includes(label));checks++;}
assert.ok(g.graphSection('함께 보기').includes('바깥쪽 = 앞 글자(P·V·S·D) | 안쪽 = 뒤 글자(F·H·M·B)'));checks++;
const preview=fs.readFileSync(new URL('preview.html',root),'utf8');
for (const script of preview.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
console.log(checks+' mobile checks passed: all 16 ten-second five-tap eggs, queued fast taps, staged cracks/glow, slow taps, frame-independent hatch, role-safe messages and graph meaning.');
