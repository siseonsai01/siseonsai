/* One gesture-unlocked narration clock for iPad Safari and asynchronous page changes. */
(() => {
  // iPad narration stays on one native media element. It avoids a second audio
  // clock/session competing with Safari's speech-recognition microphone.
  function nativePlayer(media,env){
    const listeners=new Map(),later=env.setInterval||setInterval,cancel=env.clearInterval||clearInterval;
    let source='',serial=0,unlocked=false,priming=false,capturing=false,expectedPlaying=false,timer=0,seek=0;
    const silent='data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==';
    const stopped=()=>{if(timer)cancel(timer);timer=0;};
    function session(type){try{if(navigator.audioSession&&navigator.audioSession.type!==type)navigator.audioSession.type=type;}catch{}}
    function emit(type){for(const item of [...(listeners.get(type)||[])]){if(item.once)api.removeEventListener(type,item.fn);item.fn.call(api,{type});}}
    function pause(){serial++;expectedPlaying=false;priming=false;stopped();media.pause();}
    function unlock(){
      if(capturing)return Promise.resolve();
      session('playback');if(unlocked)return Promise.resolve();unlocked=true;
      const id=++serial;priming=true;media.src=silent;
      let playing;try{playing=media.play();}catch(error){playing=Promise.reject(error);}
      return Promise.resolve(playing).then(()=>{if(id===serial&&priming){expectedPlaying=false;media.pause();media.src=source;priming=false;}}).catch(error=>{if(id===serial&&priming){priming=false;media.src=source;if(error.name==='NotAllowedError')unlocked=false;}throw error;});
    }
    async function play(){
      if(!unlocked||capturing)throw Object.assign(new Error('Tap to enable narration'),{name:'NotAllowedError'});
      const id=++serial;priming=false;expectedPlaying=true;stopped();
      if(media.getAttribute('src')!==source)media.src=source;
      try{if(seek)media.currentTime=seek;}catch{}
      let deadline;
      try{
        const playing=media.play();
        await Promise.race([playing,new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('Audio did not start')),12000);})]);
        if(id!==serial)throw Object.assign(new Error('Playback cancelled'),{name:'AbortError'});
        let clock=media.currentTime,changed=Date.now();
        timer=later(()=>{if(id!==serial)return;if(media.currentTime>clock){clock=media.currentTime;changed=Date.now();}else if(media.readyState>=3&&!media.paused&&Date.now()-changed>2500){expectedPlaying=false;stopped();media.pause();emit('interrupted');}},150);
      }catch(error){if(id===serial){expectedPlaying=false;media.pause();if(error.name==='NotAllowedError')unlocked=false;}throw error;}finally{clearTimeout(deadline);}
    }
    const api={element:media,unlock,play,pause,
      get src(){return source;},set src(value){pause();source=value;seek=0;media.src=value;},
      get currentTime(){return media.currentTime||0;},set currentTime(value){seek=Math.max(0,Number(value)||0);try{media.currentTime=seek;}catch{}},
      get duration(){return media.duration;},get paused(){return media.paused;},get ended(){return media.ended;},
      getAttribute(name){return name==='src'?source:media.getAttribute(name);},
      addEventListener(type,fn,options={}){if(options.signal?.aborted)return;const list=listeners.get(type)||new Set();list.add({fn,once:options.once});listeners.set(type,list);options.signal?.addEventListener('abort',()=>api.removeEventListener(type,fn),{once:true});},
      removeEventListener(type,fn){for(const item of listeners.get(type)||[])if(item.fn===fn)listeners.get(type).delete(item);},
      beginCapture(){capturing=true;pause();session('play-and-record');},
      async endCapture(){if(!capturing)return;capturing=false;session('playback');},
      warm(){},dispose(){pause();listeners.clear();}
    };
    media.addEventListener('loadedmetadata',()=>{if(!priming&&seek)try{media.currentTime=seek;}catch{}});
    for(const type of ['playing','timeupdate','waiting','error','seeked'])media.addEventListener(type,()=>{if(!priming)emit(type);});
    media.addEventListener('ended',()=>{if(priming||!expectedPlaying||!media.ended)return;expectedPlaying=false;stopped();emit('ended');});
    media.addEventListener('pause',()=>{if(priming||!expectedPlaying||!media.paused||media.ended)return;expectedPlaying=false;stopped();emit('interrupted');});
    if(media.dataset)media.dataset.narrationEngine='native';
    return api;
  }
  function create(media,env={}){
    if(env.native)return nativePlayer(media,env);
    if(media.dataset)media.dataset.narrationEngine='web-audio';
    const Context=env.Context||window.AudioContext||window.webkitAudioContext;
    const fetchAudio=env.fetch||window.fetch.bind(window),later=env.setInterval||setInterval,cancel=env.clearInterval||clearInterval;
    const listeners=new Map(),cache=new Map(),loading=new Map();
    let context=null,node=null,buffer=null,url='',version=0,offset=0,began=0,paused=true,ended=false,unlocked=false,timer=0,capturing=false,clockStalled=false;
    function session(type){try{if(navigator.audioSession&&navigator.audioSession.type!==type)navigator.audioSession.type=type;}catch{}}
    function emit(type){for(const item of [...(listeners.get(type)||[])]){if(item.once)api.removeEventListener(type,item.fn);item.fn.call(api,{type});}}
    function current(){return !paused&&context?Math.min(buffer?.duration||Infinity,offset+Math.max(0,context.currentTime-began)):offset;}
    function stopNode(){if(timer)cancel(timer);timer=0;const old=node;node=null;if(old){old.onended=null;try{old.stop();}catch{}old.disconnect();}}
    function pause(){if(!Context){media.pause();return;}offset=current();paused=true;version++;stopNode();}
    function finish(id){if(id!==version||paused)return;offset=buffer.duration;paused=true;ended=true;stopNode();emit('timeupdate');emit('ended');}
    function start(id){
      if(id!==version)return;
      offset=Math.min(Math.max(0,offset),Math.max(0,buffer.duration-.01));
      node=context.createBufferSource();node.buffer=buffer;node.connect(context.destination);began=context.currentTime;paused=false;ended=false;
      node.onended=()=>finish(id);node.start(0,offset);emit('playing');emit('timeupdate');
      let lastClock=context.currentTime,lastWall=Date.now();
      timer=later(()=>{if(id!==version||paused)return;if(context.currentTime>lastClock){lastClock=context.currentTime;lastWall=Date.now();}else if(Date.now()-lastWall>2000){clockStalled=true;pause();emit('interrupted');return;}if(context.state!=='running'){pause();emit('interrupted');return;}emit('timeupdate');if(offset+context.currentTime-began>=buffer.duration+.12)finish(id);},120);
    }
    function makeContext(){
      context=new Context();clockStalled=false;
      const observed=context;
      context.addEventListener?.('statechange',()=>{if(observed!==context||paused||context.state==='running')return;pause();emit('interrupted');});
    }
    function unlock(){
      if(capturing)return Promise.resolve();
      if(!Context){unlocked=true;return Promise.resolve();}
      try{
        session('playback');
        if(unlocked&&context?.state==='running'&&!clockStalled)return Promise.resolve();
        if(!context||context.state==='closed'||context.state==='interrupted'||clockStalled){
          const old=context;pause();makeContext();if(old&&old.state!=='closed')old.close().catch(()=>{});
        }
        // Both calls occur synchronously inside the trusted click/touch handler.
        const resumed=context.resume();unlocked=true;
        const primer=context.createBufferSource();primer.buffer=context.createBuffer(1,1,context.sampleRate);primer.connect(context.destination);primer.onended=()=>primer.disconnect();primer.start(0);
        return Promise.resolve(resumed);
      }catch(error){return Promise.reject(error);}
    }
    async function decoded(source){
      const absolute=new URL(source,document.baseURI).href;
      if(cache.has(absolute)){const value=cache.get(absolute);cache.delete(absolute);cache.set(absolute,value);return value;}
      if(loading.has(absolute))return loading.get(absolute);
      const request=(async()=>{
        const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),15000);
        let bytes;
        try{const response=await fetchAudio(absolute,{cache:'force-cache',signal:controller.signal});if(!response.ok)throw new Error('Audio loading failed');bytes=await response.arrayBuffer();}finally{clearTimeout(deadline);}
        const result=await new Promise((resolve,reject)=>{const p=context.decodeAudioData(bytes,resolve,reject);p?.catch?.(reject);});
        cache.set(absolute,result);while(cache.size>8)cache.delete(cache.keys().next().value);return result;
      })();
      loading.set(absolute,request);try{return await request;}finally{loading.delete(absolute);}
    }
    async function boundedResume(){
      let deadline;
      try{return await Promise.race([Promise.resolve(context.resume()),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Object.assign(new Error('Tap to resume audio'),{name:'NotAllowedError'})),1800);})]);}finally{clearTimeout(deadline);}
    }
    const api={
      element:media,
      get src(){return url;},set src(value){if(!Context){url=value;media.src=value;return;}pause();url=value;offset=0;buffer=null;ended=false;},
      get currentTime(){return Context?current():media.currentTime;},set currentTime(value){if(!Context){try{media.currentTime=value;}catch{}return;}const active=!paused;pause();offset=Math.max(0,Number(value)||0);ended=false;if(active&&buffer&&context.state==='running')start(++version);emit('seeked');},
      get duration(){return Context?(buffer?.duration??NaN):media.duration;},
      get paused(){return Context?paused:media.paused;},get ended(){return Context?ended:media.ended;},
      getAttribute(name){return name==='src'?url:media.getAttribute(name);},
      addEventListener(type,fn,options={}){if(options.signal?.aborted)return;const list=listeners.get(type)||new Set();list.add({fn,once:options.once});listeners.set(type,list);options.signal?.addEventListener('abort',()=>api.removeEventListener(type,fn),{once:true});},
      removeEventListener(type,fn){for(const item of listeners.get(type)||[])if(item.fn===fn)listeners.get(type).delete(item);},
      async play(){
        if(capturing)throw Object.assign(new Error('Microphone is active'),{name:'NotAllowedError'});
        if(!Context)return media.play();
        if(!unlocked||!context)throw Object.assign(new Error('Tap once to enable audio'),{name:'NotAllowedError'});
        const id=++version;stopNode();paused=true;ended=false;emit('waiting');
        if(context.state!=='running')await boundedResume();
        if(context.state!=='running')throw Object.assign(new Error('Audio interrupted'),{name:'NotAllowedError'});
        const next=await decoded(url);if(id!==version)throw Object.assign(new Error('Playback cancelled'),{name:'AbortError'});
        if(context.state!=='running')throw Object.assign(new Error('Audio interrupted'),{name:'NotAllowedError'});
        buffer=next;start(id);
      },
      pause,unlock,
      beginCapture(){capturing=true;pause();if(context?.state==='running')context.suspend().catch(()=>{});session('play-and-record');},
      async endCapture(){if(!capturing)return;capturing=false;session('playback');if(context&&context.state!=='closed')try{await boundedResume();}catch{}},
      warm(sources){if(Context&&unlocked&&context)for(const source of sources.slice(0,2))decoded(source).catch(()=>{});},
      dispose(){pause();cache.clear();if(context&&context.state!=='closed')context.close().catch(()=>{});}
    };
    if(!Context)for(const event of ['playing','timeupdate','ended','waiting','error','pause','seeked'])media.addEventListener(event,()=>emit(event));
    return api;
  }
  window.SiseonNarration={create};
})();
