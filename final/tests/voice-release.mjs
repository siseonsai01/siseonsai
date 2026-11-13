import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app/src/app.js',import.meta.url),'utf8');
const release=JSON.parse(fs.readFileSync(new URL('../app/src/voice-release.json',import.meta.url),'utf8'));
const routes=JSON.parse(source.match(/const offlineVoice = (\{.*?\});/)[1]);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(new URL('../app/src/'+file,import.meta.url))).digest('hex');
assert.equal(release.complete,true);
assert.equal(release.revision,'whole-fresh-storybook-v13-20261113');
assert.deepEqual(Object.keys(routes).sort(),Object.keys(release.routes).sort());
for(const [scene,file]of Object.entries(routes)){
  assert.ok(file.startsWith('assets/storybookVoice-v13-'),scene+' stale voice');
  const item=release.routes[scene];assert.equal(item.file,file);assert.equal(item.fresh,true);assert.equal(item.completeTake,true);
  assert.equal(hash(file),item.sha256,scene+' audio content changed');assert.ok(item.seconds>0);
}
for(const scene of ['speech-invite','speech-typing','speech-done','next-step','waiting-start','parent-cover','parent-speech-typing'])assert.ok(routes[scene],scene+' missing');
for(const name of ['coverCaptions','parentCoverCaptions']){
  const timed=vm.runInNewContext('('+source.match(new RegExp('const '+name+' = (.*?);'))[1]+')');
  const duration=release.routes[name==='coverCaptions'?'cover':'parent-cover'].seconds;
  assert.ok(timed.length>=5);assert.equal(timed[0][0],0);
  for(let i=0;i<timed.length;i++){assert.ok(timed[i][0]<duration);if(i)assert.ok(timed[i][0]>timed[i-1][0]);}
}
for(const name of release.games){const html=fs.readFileSync(new URL('../app/src/egg/'+name,import.meta.url),'utf8');assert.ok(html.includes('a/egg_call-storybook-v13.wav'));assert.ok(!/egg_call-storybook-v[0-9](?:\.|-)/.test(html));}
assert.equal(release.games.length,16);assert.equal(hash(release.standaloneEgg.file),release.standaloneEgg.sha256);
assert.equal(new Set(Object.values(routes)).size,release.uniqueTakes);
console.log(Object.keys(routes).length+' fresh narration routes, role captions and 16 egg games verified');
