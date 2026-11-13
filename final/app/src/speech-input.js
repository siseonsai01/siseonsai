/* User-initiated browser dictation. No audio file is kept by this app. */
(() => {
  const Recognition=window.SpeechRecognition || window.webkitSpeechRecognition;
  window.SiseonVoiceInput={supported:()=>Boolean(Recognition),create(callbacks){
    let active=null,epoch=0,startTimer=0,limitTimer=0,stopTimer=0;
    const timers=()=>{clearTimeout(startTimer);clearTimeout(limitTimer);clearTimeout(stopTimer);startTimer=limitTimer=stopTimer=0;};
    const detach=r=>{r.onstart=r.onresult=r.onerror=r.onend=null;};
    function finish(id,abort=false){
      if(id!==epoch||!active)return;
      const r=active;active=null;epoch++;timers();detach(r);
      if(abort)try{r.abort();}catch{}
      callbacks.end();
    }
    return {
      get active(){return Boolean(active);},
      start(base=''){
        if(!Recognition){callbacks.status('이 브라우저에서는 말로 적기를 지원하지 않아요. 보호자가 직접 적어 주세요.');return false;}
        if(active)return false;
        const id=++epoch,r=new Recognition();active=r;
        r.lang='ko-KR';r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
        r.onstart=()=>{if(id===epoch){clearTimeout(startTimer);callbacks.status('듣고 있어요. 말이 끝나면 마치기를 눌러 주세요.');}};
        r.onresult=event=>{
          if(id!==epoch)return;
          clearTimeout(startTimer);
          let final='',interim='';
          for(let i=0;i<event.results.length;i++){
            const result=event.results[i],text=result[0]?.transcript || '';
            if(result.isFinal)final+=text;else interim+=text;
          }
          if(final)callbacks.text((base+(base.trim()?' ':'')+final).slice(0,180));
          if(interim)callbacks.status('듣고 있어요: '+interim);
        };
        r.onerror=event=>{
          if(id!==epoch)return;
          callbacks.status(({ 'not-allowed':'마이크 사용이 허용되지 않았어요. 브라우저에서 허용하거나 직접 적어 주세요.','service-not-allowed':'이 기기에서는 음성입력을 사용할 수 없어요. 직접 적어 주세요.','no-speech':'목소리를 듣지 못했어요. 마이크를 다시 눌러 말해 주세요.','network':'음성인식 연결을 확인해 주세요. 직접 적어도 좋아요.','audio-capture':'사용할 마이크를 찾지 못했어요. 직접 적어 주세요.'})[event.error] || '말로 적기를 마쳤어요. 글을 확인해 주세요.');
          finish(id,true);
        };
        r.onend=()=>finish(id);
        startTimer=setTimeout(()=>{if(id===epoch){callbacks.status('마이크가 시작되지 않았어요. 다시 누르거나 직접 적어 주세요.');finish(id,true);}},8000);
        limitTimer=setTimeout(()=>{if(id===epoch){callbacks.status('말로 적기를 마쳤어요. 글을 확인해 주세요.');finish(id,true);}},30000);
        try{r.start();return true;}catch{timers();detach(r);active=null;epoch++;callbacks.status('마이크를 시작하지 못했어요. 다시 누르거나 직접 적어 주세요.');return false;}
      },
      stop(){if(!active)return;const id=epoch;stopTimer=setTimeout(()=>finish(id,true),1000);try{active.stop();}catch{finish(id,true);}},
      cancel(){epoch++;timers();const r=active;active=null;if(r){detach(r);try{r.abort();}catch{}}}
    };
  }};
})();
