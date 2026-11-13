/* One owner of microphone/playback mode for narration and all sound effects. */
(() => {
  function create(env={}){
    const nav=env.navigator||navigator,doc=env.document||(typeof document==='undefined'?null:document);
    const wait=env.wait||(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
    const contexts=new Map(),listeners=new Set();let phase='playback',epoch=0,transition=Promise.resolve();
    function type(value){try{if(nav.audioSession&&nav.audioSession.type!==value)nav.audioSession.type=value;}catch{}}
    function changed(){for(const fn of listeners)try{fn();}catch{}}
    function quiet(){
      const pending=[];
      for(const [context,kind] of contexts){if(context.state==='closed'){contexts.delete(context);continue;}try{pending.push(Promise.resolve(kind==='narration'||!context.close?context.suspend():context.close()));}catch{}}
      for(const media of doc?.querySelectorAll?.('audio,video')||[])try{media.pause();}catch{}
      return Promise.allSettled(pending);
    }
    const api={
      get phase(){return phase;},
      canPlayEffects:()=>phase==='playback'&&!doc?.hidden,
      requestPlayback(){if(phase!=='playback')return false;type('playback');return true;},
      registerContext(context,kind='effect'){contexts.set(context,kind);context.addEventListener?.('statechange',()=>{if(context.state==='closed')contexts.delete(context);});if(phase!=='playback')try{(kind==='narration'||!context.close?context.suspend():context.close()).catch(()=>{});}catch{}return context;},
      startCapture(){
        const key=++epoch;phase='capturing';const ready=quiet();type('play-and-record');transition=ready;changed();return {key,ready};
      },
      endCapture(key,reset){
        if(key!==epoch)return transition;
        if(phase==='restoring'||phase==='playback')return transition;
        phase='restoring';changed();
        const pending=transition;
        transition=(async()=>{
          await pending;if(key!==epoch)return;
          await quiet();if(key!==epoch)return;
          // Let Safari release speech capture before opening a new output route.
          type('auto');await wait(180);if(key!==epoch)return;
          type('playback');await reset?.();if(key!==epoch)return;
          await wait(220);if(key!==epoch)return;
          type('playback');phase='playback';changed();
        })();return transition;
      },
      async whenPlaybackReady(){
        if(phase==='capturing')throw Object.assign(new Error('Microphone is active'),{name:'NotAllowedError'});
        await transition;
        if(phase!=='playback')throw Object.assign(new Error('Microphone changed'),{name:'AbortError'});
      },
      onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);},
      snapshot(){return {phase,type:nav.audioSession?.type||'unsupported',state:nav.audioSession?.state||'unknown',contexts:contexts.size};}
    };return api;
  }
  window.SiseonAudioRoute=create();window.SiseonCreateAudioRoute=create;
})();
