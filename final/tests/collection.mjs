import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const ctx={TextEncoder};vm.runInNewContext(fs.readFileSync(new URL('../app/src/collection-export.js',import.meta.url),'utf8'),ctx);
const E=ctx.SiseonCollectionExport;
const source=fs.readFileSync(new URL('../app/src/app.js',import.meta.url),'utf8');
const questions=vm.runInNewContext('('+source.match(/const reviewQuestions = (\[[\s\S]*?\n\]);/)[1]+')');
for(let i=0;i<5;i++){assert.equal(E.questions[i].title,questions[i].title);assert.deepEqual(Array.from(E.questions[i].options),Array.from(questions[i].options));if(i)assert.deepEqual(Array.from(E.questions[i].codes),Array.from(questions[i].codes));}
const names=vm.runInNewContext('('+source.match(/const characters = (\{[\s\S]*?\n\});/)[1]+')');assert.deepEqual(JSON.parse(JSON.stringify(E.typeNames)),JSON.parse(JSON.stringify(names)));
const make=(id,choices,complete=true)=>({id,round:2,createdAt:1730000000,updatedAt:1730000001,roles:{child:{complete,token:'not-for-export',answers:choices.map(choice=>({choice,reason:'=HYPERLINK("https://example.invalid") <태그> & 줄\n바꿈',point:{x:12.5,y:30}}))},adult:{complete,token:'never-export',answers:choices.map(choice=>({choice,reason:'부모님의 이유'}))}}});
const records=[make('00001234',['A','A','B','A','B']),make('00005678',['other','B',null,null,null],false),make('00009999',Array(5).fill(null),false)];
const sheets=E.makeSheets(records);assert.equal(sheets.length,3);assert.equal(sheets[0].rows.length,3);assert.equal(sheets[1].rows.length,11);assert.equal(sheets[0].rows[1][0],'00001234');assert.equal(E.typeCode(records[0],'child'),'FVSD');assert.equal(E.typeCode(records[1],'child'),'');
for(let n=0;n<16;n++){const choices=['A',...Array.from({length:4},(_,i)=>n&(1<<i)?'B':'A')],r=make('test',choices);assert.ok(names[E.typeCode(r,'child')]);}
const bytes=E.makeWorkbook(records);assert.equal(new DataView(bytes.buffer).getUint32(0,true),0x04034b50);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'siseon-xlsx-')),file=path.join(dir,'export.xlsx');fs.writeFileSync(file,bytes);
const check=spawnSync('python',['-c',`import sys,zipfile,xml.etree.ElementTree as E
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 for name in z.namelist(): E.fromstring(z.read(name))
 ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 sheet=E.fromstring(z.read('xl/worksheets/sheet1.xml'))
 rows=sheet.findall('s:sheetData/s:row',ns)
 assert len(rows)==3
 assert rows[1][0].find('s:is/s:t',ns).text=='00001234'
 assert all(c.attrib.get('t')=='inlineStr' for row in rows for c in row)
 assert not sheet.findall('.//s:f',ns)
 text=z.read('xl/worksheets/sheet1.xml').decode()
 assert '=HYPERLINK' in text and '&lt;태그&gt;' in text
 assert 'not-for-export' not in text and 'never-export' not in text
 print('Valid XLSX: 3 sheets, paired family rows, text-safe answers, leading zeros and XML/ZIP integrity')`,file],{encoding:'utf8'});
assert.equal(check.status,0,check.stderr);console.log(check.stdout.trim());
fs.unlinkSync(file);fs.rmdirSync(dir);
const setup=source.slice(source.indexOf('function stationSetup()'),source.indexOf('async function beginFreshBook()'));
for(const role of ['child','adult']){const c={stationEntryRole:role,location:{search:'?station='+role},URLSearchParams};vm.runInNewContext(setup,c);const html=c.stationSetup();assert.ok(!html.includes('name="station-code"'));assert.ok(html.includes('전용 주소'));}
assert.ok(fs.readFileSync(new URL('../app/src/index.html',import.meta.url),'utf8').includes('<base href="/app/">'));
console.log('Default tablet entry never requests a code; stable entry paths keep app assets rooted correctly');
