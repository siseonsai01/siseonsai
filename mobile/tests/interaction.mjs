import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
let checks = 0;
for (const file of fs.readdirSync(new URL('egg/', root)).filter(n => /^\d\d_.*\.html$/.test(n))) {
  const html = fs.readFileSync(new URL('egg/' + file, root), 'utf8');
  for (const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
  const tap = html.slice(html.indexOf('function tap(e)'), html.indexOf('function startSwing('));
  const hud = html.slice(html.indexOf('function updateHud()'), html.indexOf('// ---------- swing:'));
  const contact = html.slice(html.indexOf('function onContact(now)'), html.indexOf('function armState(now)'));
  const swing = html.slice(html.indexOf('function stepSwing(now)'), html.indexOf('// ---------- drawing'));
  assert.match(html,/const NEED = 70, GLOW_AT = 0.8/);assert.ok(!html.includes('HATCH_SECONDS'));checks+=2;
  const runs=[];
  for(const [spacing,pressure] of [[.25,.5],[.9,.5],[.9,1]]){
    const sent=[],timers=[],cv={dataset:{}};
    const c={st:{called:false,done:false,burstT:null,p:0,prog:[],strength:0,lastTap:-9,hits:0,hitTimes:[],swing:null,queued:0,flakes:[],pops:[],cheer:null,cheerT:-9},
      now:0,nowS:()=>c.now,NEED:70,GLOW_AT:.8,EMBEDDED:true,TYPE_CODE:file.slice(3,7),INTRO:[],CONTACT:.2,FOLLOW:.05,BACK:.32,
      clamp:n=>Math.max(0,Math.min(1,n)),power:()=>c.st.strength,callOut(){},play(){},rnd:(a,b)=>(a+b)/2,
      G:{TOP:[0],PAD:0,EA:1},WORDS:['콩','쿵','쾅','빛'],CHEER:[['힘내','좋아'],['금','멋져'],['더','한 번']],navigator:{},
      startSwing(now){c.st.swing={t0:now,s:c.st.strength,hit:false};},
      cv,fillEl:{style:{}},hintEl:{parentElement:{classList:{toggle(){}}}},hitBtn:{classList:{add(){},remove(){}}},
      parent:{postMessage:m=>sent.push(m)},location:{origin:'https://test.example'},setTimeout:(fn,ms)=>timers.push({fn,at:c.now+ms/1000})};
    vm.createContext(c);vm.runInContext(hud+'\n'+tap+'\n'+contact+'\n'+swing,c);
    const advance=to=>{while(c.now<to-.00001){c.now=Math.min(to,c.now+.01);c.stepSwing(c.now);for(let i=timers.length-1;i>=0;i--)if(timers[i].at<=c.now){const [t]=timers.splice(i,1);t.fn();}}};
    c.tap({});assert.equal(c.st.called,true);assert.equal(c.st.swing,null);checks+=2;
    c.tap({pointerType:'touch',pressure});assert.ok(c.st.swing);assert.equal(c.st.hits,0);checks+=2;
    advance(.21);assert.equal(c.st.hits,1);assert.ok(c.st.p>0&&c.st.p<.1);checks+=2;
    for(let i=0;i<4;i++){advance(c.now+spacing);c.tap({pointerType:'touch',pressure});}
    assert.ok(c.st.p<1);assert.equal(c.st.burstT,null);checks+=2;
    let n=0;while(c.st.burstT===null&&n++<80){advance(c.now+spacing);c.tap({pointerType:'touch',pressure});}
    assert.ok(c.st.burstT!==null);assert.equal(c.st.p,1);checks+=2;
    const hits=c.st.hits;advance(c.st.burstT+1.85);assert.equal(c.st.done,true);assert.equal(sent.length,1);checks+=2;
    c.tap({});assert.equal(c.st.hits,hits);advance(c.now+5);assert.equal(sent.length,1);checks+=2;
    runs.push({hits,seconds:c.st.burstT});
    // Completion also works without any further animation frames after the last contact.
    c.st={...c.st,done:false,reported:false,p:.999,hits:0,hitTimes:[],prog:[],swing:{s:0},burstT:null};
    c.onContact(c.now);assert.equal(timers.length,1);const t=timers.pop();t.fn();t.fn();assert.equal(c.st.done,true);assert.equal(sent.length,2);checks+=3;
  }
  assert.ok(runs[0].hits<runs[1].hits);assert.ok(runs[2].hits<runs[1].hits);assert.ok(runs[0].seconds<runs[1].seconds);checks+=3;
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
console.log(checks+' mobile checks passed: all 16 original pressure/speed-driven eggs, immediate hammer response, original crack progression, frame-independent completion, role-safe messages and graph meaning.');
