(() => {
  const E=globalThis.SiseonCollectionExport,$=id=>document.getElementById(id);
  const params=new URLSearchParams(location.hash.slice(1));
  let key=params.get('access')||sessionStorage.getItem('siseonsai-collection-access')||'';
  if(/^[a-f0-9]{64}$/.test(key))sessionStorage.setItem('siseonsai-collection-access',key);
  else key='';
  history.replaceState(null,'',key?'/manage/'+key:location.pathname);
  let records=[],busy=false;
  function render(){
    const meaningful=records.filter(E.meaningful).sort((a,b)=>b.updatedAt-a.updatedAt);
    $('total').textContent=meaningful.length;
    const complete=meaningful.filter(r=>r.roles.child.complete&&r.roles.adult.complete).length;
    $('complete').textContent=complete;$('partial').textContent=meaningful.length-complete;
    const body=$('families');body.replaceChildren();
    for(const r of meaningful){const row=document.createElement('tr');for(const text of [r.id,r.round??'',E.date(r.updatedAt),E.answered(r,'child')+' / 5',E.answered(r,'adult')+' / 5',E.status(r)]){const cell=document.createElement('td');cell.textContent=String(text);row.append(cell);}body.append(row);}
    $('empty').hidden=meaningful.length>0;
    $('download').disabled=busy||!meaningful.length;
  }
  async function load(){
    if(busy)return;busy=true;$('refresh').disabled=true;$('download').disabled=true;
    if(!key){$('status').textContent='진행자 전용 주소로 다시 열어 주세요.';busy=false;$('refresh').disabled=false;return false;}
    try{
      const all=new Map();let cursor='',snapshot='';
      do{
        const query=new URLSearchParams();if(cursor)query.set('cursor',cursor);if(snapshot)query.set('snapshot',snapshot);
        const response=await fetch('/api/collections?'+query,{headers:{Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(20000)});
        const data=await response.json();if(!response.ok)throw new Error(data.error||'자료를 불러오지 못했어요.');
        for(const r of data.records)all.set(r.id,r);snapshot=String(data.snapshot);cursor=data.nextCursor||'';
        $('status').textContent='저장한 가족 자료를 불러오고 있어요…';
      }while(cursor);
      records=Array.from(all.values());$('status').textContent='서버에 저장된 최신 답변을 불러왔습니다. 자동 삭제하지 않습니다.';return true;
    }catch(error){$('status').textContent=error.message+' 새로 불러오기를 눌러 주세요.';return false;}
    finally{busy=false;$('refresh').disabled=false;render();}
  }
  $('refresh').addEventListener('click',load);
  $('download').addEventListener('click',async()=>{
    if(!await load())return;
    const blob=new Blob([E.makeWorkbook(records)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    const stamp=new Date().toLocaleString('sv-SE',{timeZone:'Asia/Seoul'}).replace(/[-: ]/g,'');
    a.href=url;a.download='시선사이_가족응답_'+stamp+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    $('status').textContent='엑셀 파일을 내려받았습니다. 가족별 응답과 문항별 비교를 확인해 주세요.';
  });
  load();setInterval(()=>{if(!document.hidden)load();},30000);
})();
