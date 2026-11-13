/* Small dependency-free XLSX writer: every answer is an explicit text cell. */
(() => {
  const questions=[
    {title:'먼저 보인 것',options:['바닥에 놓인 물건들','책상이나 선반 위의 물건들']},
    {title:'장난감 생각',options:['이걸로 무엇을 할 수 있을까?','이건 원래 어디에 있었을까?'],slot:0,codes:['F','P']},
    {title:'만들던 놀이',options:['그 자리에 두고 계속 놀기','다른 곳으로 옮겨 두기'],slot:3,codes:['B','D']},
    {title:'놀고 싶은 곳',options:['바닥의 넓은 자리','책상이나 작은 자리'],slot:1,codes:['V','H']},
    {title:'바꾸고 싶은 것',options:['놀이할 자리를 더 만들기','물건을 놓을 자리를 더 만들기'],slot:2,codes:['M','S']}
  ];
  const typeNames={PVSD:'각각각 다람쥐',PVSB:'갤러리 고양이',PVMD:'작품왕 강아지',PVMB:'추억전시 펭귄',PHSD:'칼각 박스 비버',PHSB:'비밀창고 햄스터',PHMD:'비밀일기 사슴',PHMB:'추억보물상자 아기곰',FVSD:'자유로운 사막여우',FVSB:'번개출동 표범',FVMD:'감성아티스트 수달',FVMB:'벼락치기 몽상가 토끼',FHSD:'순간포착 고슴도치',FHSB:'블랙홀 판다',FHMD:'마음부자 쿼카',FHMB:'우주대청장 아기물개'};
  const answers=(r,role)=>r.roles?.[role]?.answers||[];
  const answered=(r,role)=>answers(r,role).filter(a=>a.choice).length;
  const meaningful=r=>answered(r,'child')+answered(r,'adult')>0;
  function typeCode(r,role){const code=[];questions.forEach((q,i)=>{if(q.codes){const n=['A','B'].indexOf(answers(r,role)[i]?.choice);code[q.slot]=n<0?'?':q.codes[n];}});return code.includes('?')?'':code.join('');}
  function choiceLabel(i,value){return value==='A'?questions[i].options[0]:value==='B'?questions[i].options[1]:value==='other'?'다른 곳이 먼저 보여요':value==='unsure'?'잘 모르겠어요 (이전 응답)':'';}
  const date=value=>value?new Date(value*1000).toLocaleString('sv-SE',{timeZone:'Asia/Seoul'}):'';
  const status=r=>r.roles.child.complete&&r.roles.adult.complete?'두 사람 완료':r.roles.child.complete?'아이 완료 · 부모님 작성 중':r.roles.adult.complete?'부모님 완료 · 아이 작성 중':'작성 중';
  function makeSheets(input){
    const records=input.filter(meaningful).sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));
    const header=['가족 ID','참여 회차','시작 시각 (한국)','마지막 저장 (한국)','완료 상태','아이 응답 수','부모님 응답 수','아이 유형','아이 정리 친구','부모님 유형','부모님 정리 친구','아이 첫 시선 X (%)','아이 첫 시선 Y (%)','부모님 첫 시선 X (%)','부모님 첫 시선 Y (%)'];
    for(const [i,q]of questions.entries())header.push(`${i+1}. ${q.title} · 아이 선택`,`${i+1}. 아이 이유`,`${i+1}. ${q.title} · 부모님 선택`,`${i+1}. 부모님 이유`);
    const families=[header],details=[['가족 ID','질문 번호','질문','아이 선택 코드','아이 선택','아이 이유','부모님 선택 코드','부모님 선택','부모님 이유','두 사람의 선택']];
    for(const r of records){
      const child=typeCode(r,'child'),adult=typeCode(r,'adult');
      const row=[r.id,String(r.round??''),date(r.createdAt),date(r.updatedAt),status(r),String(answered(r,'child')),String(answered(r,'adult')),child,typeNames[child]||'',adult,typeNames[adult]||'',String(answers(r,'child')[0]?.point?.x??''),String(answers(r,'child')[0]?.point?.y??''),String(answers(r,'adult')[0]?.point?.x??''),String(answers(r,'adult')[0]?.point?.y??'')];
      questions.forEach((q,i)=>{const c=answers(r,'child')[i]||{},a=answers(r,'adult')[i]||{};row.push(choiceLabel(i,c.choice),c.reason||'',choiceLabel(i,a.choice),a.reason||'');details.push([r.id,String(i+1),q.title,c.choice||'',choiceLabel(i,c.choice),c.reason||'',a.choice||'',choiceLabel(i,a.choice),a.reason||'',c.choice&&a.choice?(c.choice===a.choice?'같은 선택':'다른 선택'):'응답 대기']);});
      families.push(row);
    }
    return [
      {name:'가족별 응답',rows:families},
      {name:'문항별 비교',rows:details},
      {name:'자료 안내',rows:[['항목','설명'],['자료 성격','5문항의 그림 놀이 응답입니다. 검증된 심리검사나 성격·발달·정리 능력의 점수가 아닙니다.'],['유형 기준','1번은 먼저 보인 곳을 기록하며, 2~5번의 선택으로 체험용 16친구를 연결합니다.'],['빈 답','아직 답하지 않은 칸은 빈칸으로 둡니다. 이유 입력은 선택 사항입니다.'],['완료 상태','두 사람이 책 마치기를 누른 기록과 작성 중인 기록을 구분합니다.'],['보관','다음 가족으로 넘어가거나 24시간이 지나도 자동 삭제하지 않습니다.'],['제외 자료','사진·녹음 파일·연결 비밀정보는 이 파일에 포함하지 않습니다.'],['시각','한국시간 기준입니다. 시작 시각이 없는 이전 기록은 보관 연결 당시 저장 시각을 사용합니다.']]}
    ];
  }
  const enc=new TextEncoder();
  const xml=text=>String(text??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function column(n){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
  function worksheet(rows){
    const width=Math.max(...rows.map(r=>r.length),1);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="'+width+'" width="25" customWidth="1"/></cols><sheetData>'+rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((value,j)=>'<c r="'+column(j)+(i+1)+'" t="inlineStr" s="'+(i===0?1:0)+'"><is><t xml:space="preserve">'+xml(value)+'</t></is></c>').join('')+'</row>').join('')+'</sheetData><autoFilter ref="A1:'+column(width-1)+Math.max(1,rows.length)+'"/></worksheet>';
  }
  const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
  function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0;}
  function join(parts){const result=new Uint8Array(parts.reduce((n,x)=>n+x.length,0));let p=0;for(const part of parts){result.set(part,p);p+=part.length;}return result;}
  function zip(files){
    const parts=[],directory=[];let offset=0;
    for(const [path,text]of Object.entries(files)){
      const name=enc.encode(path),data=enc.encode(text),crc=crc32(data),local=new Uint8Array(30),v=new DataView(local.buffer);
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x21,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);
      const central=new Uint8Array(46),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,0x21,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);
      parts.push(local,name,data);directory.push(central,name);offset+=local.length+name.length+data.length;
    }
    const dir=join(directory),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,Object.keys(files).length,true);e.setUint16(10,Object.keys(files).length,true);e.setUint32(12,dir.length,true);e.setUint32(16,offset,true);return join([...parts,dir,end]);
  }
  function makeWorkbook(records){
    const sheets=makeSheets(records),files={
      '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>',
      '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>'<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>',
      'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'xl/styles.xml':'<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf xfId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf xfId="0" fontId="1" fillId="0" borderId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
    };
    sheets.forEach((s,i)=>files['xl/worksheets/sheet'+(i+1)+'.xml']=worksheet(s.rows));return zip(files);
  }
  globalThis.SiseonCollectionExport={questions,typeNames,typeCode,choiceLabel,answered,meaningful,status,date,makeSheets,makeWorkbook};
})();
