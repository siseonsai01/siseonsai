/* One owner of microphone/playback mode for narration and all sound effects. */
(() => {
  function create(env={}){
    const nav=env.navigator||navigator,doc=env.document||(typeof document==='undefined'?null:document);
    const wait=env.wait||(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
    const now=env.now||(()=>Math.round((typeof performance!=='undefined'?performance.now():Date.now())));
    const contexts=new Map(),listeners=new Set(),trace=[];let phase='playback',epoch=0,transition=Promise.resolve();
    const session=()=>nav.audioSession||null;
    // Small ring buffer so a real iPad run can be read back (?audio-debug=1). No audio, no answers.
    function log(event,extra){trace.push({t:now(),event,phase,type:session()?.type||'unsupported',state:session()?.state||'unknown',...(extra||{})});if(trace.length>80)trace.shift();}
    function type(value){try{const s=session();if(s&&s.type!==value){s.type=value;log('type',{to:value});}}catch(error){log('type-failed',{to:value,error:String(error?.name||error)});}}
    function changed(){for(const fn of listeners)try{fn();}catch{}}
    function routeError(name,message){return Object.assign(new Error(message),{name,fromRoute:true});}
    function bounded(promise,ms,label){
      let timer;return Promise.race([Promise.resolve(promise),new Promise((_,reject)=>{timer=setTimeout(()=>reject(routeError('TimeoutError',label)),ms);})]).finally(()=>clearTimeout(timer));
    }
    try{session()?.addEventListener?.('statechange',()=>log('session-state'));}catch{}
    function quiet(){
      const pending=[];
      for(const [context,kind] of contexts){if(context.state==='closed'){contexts.delete(context);continue;}try{pending.push(Promise.resolve(kind==='narration'||!context.close?context.suspend():context.close()));}catch{}}
      for(const media of doc?.querySelectorAll?.('audio,video')||[])try{media.pause();}catch{}
      return bounded(Promise.allSettled(pending),env.quietMs??600,'Audio did not become quiet').catch(error=>log('quiet-failed',{error:error.name}));
    }
    // Wait for an observable signal instead of a guessed delay: once capture and every
    // player are stopped, the page's audio session should leave 'active'. Bounded.
    function settled(maxMs){
      const s=session();
      if(!s||s.state!=='active')return Promise.resolve(s?s.state:'unsupported');
      return new Promise(resolve=>{
        let done=false,timer=0;
        const finish=value=>{if(done)return;done=true;clearTimeout(timer);try{s.removeEventListener?.('statechange',on);}catch{}resolve(value);};
        const on=()=>{if(s.state!=='active')finish(s.state);};
        timer=setTimeout(()=>finish('timeout'),maxMs);
        try{if(typeof s.addEventListener!=='function')finish('no-events');else{s.addEventListener('statechange',on);on();}}catch{finish('no-events');}
      });
    }
    const api={
      get phase(){return phase;},
      canPlayEffects:()=>phase==='playback'&&!doc?.hidden,
      requestPlayback(){if(phase!=='playback')return false;type('playback');return true;},
      registerContext(context,kind='effect'){contexts.set(context,kind);context.addEventListener?.('statechange',()=>{if(context.state==='closed')contexts.delete(context);});if(phase!=='playback')try{(kind==='narration'||!context.close?context.suspend():context.close()).catch(()=>{});}catch{}return context;},
      startCapture(){
        const key=++epoch;phase='capturing';log('start-capture',{key});const ready=quiet();type('play-and-record');transition=ready;changed();return {key,ready};
      },
      endCapture(key,reset){
        if(key!==epoch||phase!=='capturing')return transition;
        phase='restoring';log('end-capture',{key});changed();
        const pending=transition;
        transition=(async()=>{
          try{
            await pending;if(key!==epoch)return;
            await quiet();if(key!==epoch)return;
            const result=await settled(env.settleMs??1500);log('settled',{result});if(key!==epoch)return;
            // 'auto' first so WebKit re-evaluates the category, then pin media playback.
            type('auto');await wait(120);if(key!==epoch)return;
            type('playback');
            try{await bounded(reset?.(),env.resetMs??1000,'Audio decoder did not reset');}catch(error){log('reset-failed',{error:String(error?.name||error)});}
            if(key!==epoch)return;
            await wait(150);if(key!==epoch)return;
            type('playback');
          }catch(error){log('restore-failed',{error:String(error?.name||error)});}finally{
            // Never leave the app stuck in 'restoring' (e.g. if reset threw).
            if(key===epoch&&phase==='restoring'){type('playback');phase='playback';log('playback');changed();}
          }
        })();return transition;
      },
      async whenPlaybackReady(){
        if(phase==='capturing')throw routeError('NotAllowedError','Microphone is active');
        try{await transition;}catch{}
        if(phase!=='playback')throw routeError('AbortError','Microphone changed');
      },
      onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);},
      log,
      trace:()=>trace.slice(),
      snapshot(){return {phase,type:session()?.type||'unsupported',state:session()?.state||'unknown',contexts:contexts.size};}
    };return api;
  }
  window.SiseonAudioRoute=create();window.SiseonCreateAudioRoute=create;
})();
