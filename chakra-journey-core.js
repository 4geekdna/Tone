const C=[["Root","Muladhara",396,"C","#8B0000",["I am safe, grounded, and secure in my body.","I trust the process of life and feel deeply rooted.","My foundation is strong; I belong here.","I release fear and stand firmly in the present moment.","Abundance flows to me as I remain stable and centered."]],["Sacral","Svadhisthana",417,"D","#E65100",["I embrace pleasure and creativity with ease.","My emotions flow freely and healthily.","I honor my desires and allow joy into my life.","I am open to change and the beauty of transformation.","Creativity moves through me effortlessly."]],["Solar Plexus","Manipura",528,"E","#F9A825",["I am confident, powerful, and in control of my life.","I trust my inner wisdom and take decisive action.","My personal power shines brightly.","I release self-doubt and step into my strength.","I am worthy of success and respect."]],["Heart","Anahata",639,"F","#2E7D32",["I give and receive love freely and unconditionally.","My heart is open, compassionate, and full of gratitude.","I forgive myself and others with ease.","Love is my true nature and guides every action.","I am deeply connected to all living beings."]],["Throat","Vishuddha",741,"G","#0277BD",["I speak my truth with clarity and confidence.","My voice is powerful and my words create positive change.","I express myself authentically and listen deeply.","Communication flows easily between me and others.","I am heard, understood, and respected."]],["Third Eye","Ajna",852,"A","#283593",["I trust my intuition and inner vision.","Clarity and insight guide my path.","I see beyond illusion and perceive the truth.","My mind is clear, focused, and open to wisdom.","I am connected to my higher guidance."]],["Crown","Sahasrara",963,"B","#6A1B9A",["I am one with the divine and infinite consciousness.","Divine wisdom flows through me effortlessly.","I am connected to pure awareness and universal love.","My spirit is free, expansive, and luminous.","I surrender to the highest good and trust the universe."]]];
window.C=C;
const $=x=>document.getElementById(x),cl=(v,a,b)=>Math.min(b,Math.max(a,v)),wait=m=>new Promise(r=>setTimeout(r,m));
const ANALYZED=[0,102,194,277,366,450,536];
const VIDEO_FILES=["Quick Morning Chakra Alignment Sound Bath - 11 Minute Chakra Balancing Meditation Frequencies.mp4","Chakra01.mp4","chakra01.mp4"];
let src="both",ctx,tone,yt=$("player"),ytReady=false,run=false,paused=false,fromPreview=false,token=0,cur=-1,watch,voiceNode,voiceGainNode,voiceWarm,voiceDry,voiceWet,aborter,allVoices=[],idx=Object.fromEntries(C.map(c=>[c[0],0])),speakingFor=-1,triedSrc="",voiceDone=null,voiceBuild=null,ducked=false;
function status(s=""){$("status").textContent=s}
function useYT(){return src!=="tones"}
function useTone(){return src!=="youtube"}
function audio(){if(!ctx)ctx=new(window.AudioContext||window.webkitAudioContext)();if(ctx.state==="suspended")ctx.resume();return ctx}
function mediaSrc(src){if(!src)return "";if(/^https?:/i.test(src))return src;return encodeURI(src)}
function loadVideoSrc(src){if(!yt||!src||triedSrc===src)return;triedSrc=src;ytReady=false;yt.setAttribute("playsinline","");yt.setAttribute("webkit-playsinline","");yt.playsInline=true;yt.src=mediaSrc(src);yt.load()}
function tryNextVideo(){let i=VIDEO_FILES.indexOf(triedSrc);let next=VIDEO_FILES[i+1];if(next){status("Trying "+next);loadVideoSrc(next)}}
function seekVideo(sec){if(!yt)return;try{yt.currentTime=Math.max(0,sec)}catch{}}
function unlockMedia(){try{audio()}catch{}if(!yt)return;yt.setAttribute("playsinline","");yt.setAttribute("webkit-playsinline","");yt.playsInline=true;yt.muted=false}
function stillThis(i,t){return run&&t===token&&cur===i}
function stampText(seconds){seconds=Math.max(0,Math.floor(seconds||0));let h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return h?h+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0"):m+":"+String(s).padStart(2,"0")}
function applyAnalyzed(){ANALYZED.forEach((sec,i)=>{let el=document.querySelector('[data-ts="'+i+'"]');if(el)el.value=stampText(sec)});$("mode").value="timestamps";if(src==="tones")src="both";save();ui();status("Using analyzed bowl timestamps from the 11:10 video")}
C.forEach((c,i)=>{let d=document.createElement("div");d.className="card";d.style.background=c[4];d.dataset.i=i;d.innerHTML="<b>"+c[0]+" • "+c[2]+" Hz</b><small>"+c[1]+" ("+c[3]+")</small><em></em>";d.onclick=()=>preview(i);$("grid").appendChild(d);let r=document.createElement("div");r.className="row";r.innerHTML="<label>"+c[0]+"</label><input data-ts=\""+i+"\" placeholder=\"mm:ss\" value=\""+stampText(ANALYZED[i])+"\">";$("ts").appendChild(r)});
function current(i,d=""){cur=i;if(window.chakraAuto&&typeof window.chakraAuto.activate==="function")window.chakraAuto.activate(i);document.querySelectorAll(".card").forEach((x,n)=>x.classList.toggle("on",n===i));if(i<0){$("now").textContent="Ready";$("meta").textContent=d||"Choose a source and start";$("bar").style.width="0";return}let c=C[i];$("now").textContent=c[0];$("meta").textContent=c[1]+" • "+c[2]+" Hz • "+c[3]+(d?" • "+d:"");$("bar").style.width=((i+1)/7*100)+"%";if(typeof window.goveeFollow==="function")window.goveeFollow(i)}
let decks={};
function shuffleDeck(c){let order=c[5].map((_,i)=>i);for(let i=order.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1)),x=order[i];order[i]=order[j];order[j]=x}decks[c[0]]={order,pos:0}}
function next(c){
  let recent={};try{recent=JSON.parse(localStorage.getItem("cj_recent_affirmations")||"{}")}catch(e){}
  let d=decks[c[0]];
  if(!d||d.pos>=d.order.length){
    shuffleDeck(c); d=decks[c[0]];
    const last=recent[c[0]];
    if(last!=null&&d.order.length>1&&d.order[0]===last){const x=d.order[0];d.order[0]=d.order[1];d.order[1]=x}
  }
  d=decks[c[0]];let i=d.order[d.pos++];
  recent[c[0]]=i;try{localStorage.setItem("cj_recent_affirmations",JSON.stringify(recent))}catch(e){}
  if(window.chakraAuto&&typeof window.chakraAuto.mantra==="function")window.chakraAuto.mantra(c[0],i,c[5][i]);
  return[c[5][i],i+1]
}
function show(c,a){$("al").textContent=c[0]+" • AFFIRMATION "+a[1]+" OF 5";$("at").textContent=a[0];let em=document.querySelector('.card[data-i="'+C.indexOf(c)+'"] em');if(em)em.textContent=a[0]}
function stopTone(f=.45){if(!tone||!ctx)return;let t=tone;tone=null;let n=ctx.currentTime;try{t.g.gain.setTargetAtTime(.0001,n,.12)}catch{}t.o.forEach(o=>{try{o.stop(n+f)}catch{}})}
function startTone(c){if(!useTone())return;audio();stopTone();let g=ctx.createGain(),o=[],n=ctx.currentTime,style=$("style").value,l=style==="pure"?[[1,.8]]:style==="tibetan"?[[1,.4],[2.02,.25],[2.98,.14],[4.18,.08]]:style==="warm"?[[.5,.16],[1,.45],[1.5,.14],[2,.1]]:[[1,.48],[2,.23],[3,.12],[4,.06]];g.gain.setValueAtTime(.0001,n);g.connect(ctx.destination);l.forEach(([m,v])=>{let x=ctx.createOscillator(),q=ctx.createGain();x.frequency.value=c[2]*m;q.gain.value=v;x.connect(q);q.connect(g);x.start();o.push(x)});g.gain.linearRampToValueAtTime(+$("tv").value,n+1);tone={g,o}}
function ytVol(){return +$("yv").value}
function fadeYT(v){if(!yt)return;try{yt.volume=cl(v,0,100)/100}catch{}}
function duck(on){ducked=!!on;if(tone&&ctx)try{tone.g.gain.setTargetAtTime(Math.max(.0001,+$("tv").value*(ducked?.18:1)),ctx.currentTime,.2)}catch{}if(useYT())fadeYT(on?+$("dv").value:ytVol())}
function settleVoice(ok){let done=voiceDone;voiceDone=null;if(voiceNode){try{voiceNode.onended=null}catch{}try{voiceNode.stop()}catch{}voiceNode=null}voiceGainNode=voiceWarm=voiceDry=voiceWet=null;duck(false);if(done)done(!!ok)}
function stopVoice(){if(aborter){try{aborter.abort()}catch{}aborter=null}settleVoice(false)}
function unlockVoiceAudio(){let ac=audio();try{let b=ac.createBuffer(1,1,ac.sampleRate),s=ac.createBufferSource(),g=ac.createGain();g.gain.value=.00001;s.buffer=b;s.connect(g);g.connect(ctx.destination);s.start()}catch{}return ac.resume?.().catch(()=>{})}
const VOICE_CACHE="cj_voice_audio_v2";
const VOICE_CACHE_MAX=200;
const VOICE_CACHE_TTL_MS=30*24*60*60*1000;
function roundParam(v,step){let n=Number(v);if(!Number.isFinite(n))return "0";return (Math.round(n/step)*step).toFixed(2)}
function currentVoiceSnap(){return {key:$("key").value.trim(),voiceId:$("voice").value||"JBFqnCBsd6RMkjVDRZzb",model:$("model").value,auto:!!$("autoModel")?.checked,speed:+$("speed").value,stability:+$("stability").value,similarity:+$("similarity").value,style:+$("voiceStyle").value,boost:!!$("speakerBoost").checked}}
function voiceSettingsKeyFrom(s){return [roundParam(s.speed,.01),roundParam(s.stability,.01),roundParam(s.similarity,.01),roundParam(s.style,.01),s.boost?"1":"0"].join("|")}
function voiceSettingsKey(){return voiceSettingsKeyFrom(currentVoiceSnap())}
function modelFrom(text,snap){if(snap.auto)return text.length<=220?"eleven_flash_v2_5":"eleven_multilingual_v2";return snap.model}
function clipKey(text,snap){return [snap.voiceId,modelFrom(text,snap),voiceSettingsKeyFrom(snap),text].join("|")}
function voiceCacheKey(t,voiceId,model){return [voiceId,model,voiceSettingsKey(),t].join("|")}
function metaKey(k){return "m:"+k}
async function openVoiceDB(){return await new Promise((ok,no)=>{let q=indexedDB.open(VOICE_CACHE,1);q.onupgradeneeded=()=>{let db=q.result;if(!db.objectStoreNames.contains("audio"))db.createObjectStore("audio");if(!db.objectStoreNames.contains("meta"))db.createObjectStore("meta")};q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)})}
async function cacheGet(k){try{let db=await openVoiceDB();return await new Promise(ok=>{let q=db.transaction("audio").objectStore("audio").get(k);q.onsuccess=()=>ok(q.result||null);q.onerror=()=>ok(null)})}catch(e){return null}}
async function cachePut(k,v){try{let db=await openVoiceDB();let tx=db.transaction(["audio","meta"],"readwrite");tx.objectStore("audio").put(v,k);tx.objectStore("meta").put({t:Date.now()},metaKey(k));await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}catch(e){}}
async function cacheEvict(){try{let db=await openVoiceDB();let tx=db.transaction(["audio","meta"],"readwrite");let meta=tx.objectStore("meta"),audio=tx.objectStore("audio");let req=meta.openCursor();let entries=[];req.onsuccess=e=>{let c=e.target.result;if(c){entries.push({k:c.key,t:c.value&&c.value.t||0});c.continue()}};req.onerror=()=>{};await new Promise(res=>{tx.oncomplete=res;tx.onerror=()=>res()});let now=Date.now();for(let e of entries){if(now-(e.t||0)>VOICE_CACHE_TTL_MS){meta.delete(e.k);audio.delete(e.k.slice(2))}}entries=entries.filter(e=>now-(e.t||0)<=VOICE_CACHE_TTL_MS);if(entries.length>VOICE_CACHE_MAX){entries.sort((a,b)=>(a.t||0)-(b.t||0));let drop=entries.slice(0,entries.length-VOICE_CACHE_MAX);for(let e of drop){meta.delete(e.k);audio.delete(e.k.slice(2))}}await new Promise(res=>{let t2=db.transaction(["audio","meta"],"readwrite");t2.oncomplete=res;t2.onerror=()=>res()})}catch(e){}}
async function clearVoiceCache(){try{let db=await openVoiceDB();let tx=db.transaction(["audio","meta"],"readwrite");tx.objectStore("audio").clear();tx.objectStore("meta").clear();await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});if($("voiceCacheState"))$("voiceCacheState").textContent="Cache: cleared";status("Voice cache cleared")}catch(e){status("Cache clear failed")}}
window.CJClearVoiceCache=clearVoiceCache;
function chosenModel(t){return modelFrom(t,currentVoiceSnap())}
async function updateVoiceAccount(){
 let key=$("key").value.trim();if(!key){if($("voiceAccount"))$("voiceAccount").textContent="API: no key • add a key or run Build All Voices. System voices are not used.";return}
 try{let r=await fetch("https://api.elevenlabs.io/v1/user/subscription",{headers:{"xi-api-key":key}}),j=await r.json();if(!r.ok)throw new Error("HTTP "+r.status);let used=j.character_count??0,limit=j.character_limit??0,remain=Math.max(0,limit-used);if($("voiceAccount"))$("voiceAccount").textContent="API connected • "+remain.toLocaleString()+" characters remaining"+(j.tier?" • "+j.tier:"")}catch(e){if($("voiceAccount"))$("voiceAccount").textContent="API check failed • cached clips still play. System voices are not used."}}
let hallIR;
function hallImpulse(){if(hallIR&&hallIR.sampleRate===ctx.sampleRate)return hallIR;let length=Math.floor(ctx.sampleRate*2.8),ir=ctx.createBuffer(2,length,ctx.sampleRate);for(let ch=0;ch<2;ch++){let data=ir.getChannelData(ch);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,2.4)}hallIR=ir;return ir}
const VOICE_GAP_MSG="No saved voice for this line. Add an ElevenLabs API key or run Build All Voices. System voices are not used.";
function showVoiceGap(msg){
  let el=$("voiceGap");
  if(el){el.textContent=msg;el.classList.add("show")}
  document.body.classList.add("voice-gap-on");
  let at=$("at");
  if(at&&(run||fromPreview))at.textContent=msg;
  status(msg);
}
function hideVoiceGap(){
  let el=$("voiceGap");
  if(el){el.textContent="";el.classList.remove("show")}
  document.body.classList.remove("voice-gap-on");
}
function setBuildProgress(msg){let el=$("buildProgress");if(el)el.textContent=msg||""}
function applyColorLive(){
  if(!ctx)return;
  let now=ctx.currentTime;
  if(voiceGainNode)try{voiceGainNode.gain.setTargetAtTime(+$("vv").value,now,.05)}catch(e){}
  if(voiceWarm)try{voiceWarm.frequency.setTargetAtTime(+$("warmthFreq").value,now,.05)}catch(e){}
  if(voiceDry&&voiceWet){let mix=+$("reverbMix").value;try{voiceDry.gain.setTargetAtTime(1-mix,now,.05);voiceWet.gain.setTargetAtTime(mix,now,.05)}catch(e){}}
  if(tone)try{tone.g.gain.setTargetAtTime(Math.max(.0001,+$("tv").value*(ducked?.18:1)),now,.08)}catch(e){}
}
async function requestVoiceBlob(text,snap,signal){
  let r=await fetch("https://api.elevenlabs.io/v1/text-to-speech/"+snap.voiceId,{method:"POST",signal:signal,headers:{"Content-Type":"application/json","xi-api-key":snap.key,Accept:"audio/mpeg"},body:JSON.stringify({text:text,model_id:modelFrom(text,snap),voice_settings:{stability:snap.stability,similarity_boost:snap.similarity,style:snap.style,use_speaker_boost:snap.boost,speed:snap.speed}})});
  if(!r.ok){let raw=await r.text(),j={};try{j=JSON.parse(raw)}catch(_){}let d=j.detail;let msg=(d&&d.message)||(d&&d.status)||j.message||("HTTP "+r.status);throw new Error(msg)}
  return await r.blob();
}
async function playVoiceBlob(blob,label){
  let bytes=await blob.arrayBuffer();
  if(!run&&!fromPreview)return false;
  await unlockVoiceAudio();
  let b=await ctx.decodeAudioData(bytes.slice(0)),s=ctx.createBufferSource(),g=ctx.createGain(),warm=ctx.createBiquadFilter(),dry=ctx.createGain(),wet=ctx.createGain(),conv=ctx.createConvolver(),mix=+$("reverbMix").value;
  s.buffer=b;g.gain.value=+$("vv").value;warm.type="lowshelf";warm.frequency.value=+$("warmthFreq").value;warm.gain.value=3;dry.gain.value=1-mix;wet.gain.value=mix;conv.buffer=hallImpulse();
  s.connect(g);g.connect(warm);warm.connect(dry);dry.connect(ctx.destination);warm.connect(conv);conv.connect(wet);wet.connect(ctx.destination);
  voiceNode=s;voiceGainNode=g;voiceWarm=warm;voiceDry=dry;voiceWet=wet;duck(true);status(label+" • speaking");hideVoiceGap();
  return await new Promise(ok=>{let settled=false;let done=v=>{if(settled)return;settled=true;if(voiceNode===s)voiceNode=null;voiceGainNode=voiceWarm=voiceDry=voiceWet=null;if(voiceDone===fin)voiceDone=null;setTimeout(()=>{duck(false);ok(!!v)},v?350:0)};let fin=v=>done(v);voiceDone=fin;s.onended=()=>done(true);try{s.start()}catch(e){done(false)}});
}
function stopForMissingVoice(msg){if(run&&!fromPreview)stop();showVoiceGap(msg);return false}
async function speak(t,label){
  stopVoice();
  await unlockVoiceAudio();
  let snap=currentVoiceSnap(),ck=clipKey(t,snap),cached=await cacheGet(ck);
  if(cached){status(label+" • cached voice");try{return await playVoiceBlob(cached,label)}catch(e){if(!run&&!fromPreview)return false;return stopForMissingVoice("Saved voice could not play ("+(e&&e.message?e.message:"decode failed")+"). Run Build All Voices again. System voices are not used.")}}
  if(!snap.key)return stopForMissingVoice(VOICE_GAP_MSG);
  aborter=new AbortController();
  try{
    hideVoiceGap();
    status(label+" • generating "+(modelFrom(t,snap).includes("flash")?"Flash":"Multilingual")+" voice");
    let blob=await requestVoiceBlob(t,snap,aborter.signal);
    await cachePut(ck,blob);cacheEvict();updateVoiceAccount();aborter=null;
    return await playVoiceBlob(blob,label);
  }catch(e){
    let aborted=(e&&e.name==="AbortError")||(aborter&&aborter.signal.aborted);
    aborter=null;
    if(aborted||(!run&&!fromPreview))return false;
    return stopForMissingVoice("ElevenLabs: "+(e.message||"unavailable")+". Add a working key or run Build All Voices. System voices are not used.");
  }
}
async function buildAllVoices(){
  if(voiceBuild){voiceBuild.abort=true;try{voiceBuild.ctrl.abort()}catch(e){}return}
  if(run){status("Stop the journey before Build All Voices");return}
  let snap=currentVoiceSnap();
  if(!snap.key){showVoiceGap("Add an ElevenLabs API key, then run Build All Voices. Saved clips play with no key. System voices are not used.");return}
  let clips=[];C.forEach(c=>c[5].forEach(text=>clips.push({name:c[0],text:text})));
  let total=clips.length,made=0,ready=0;
  voiceBuild={abort:false,ctrl:new AbortController()};
  let btn=$("buildAllVoices");if(btn)btn.textContent="Abort Build";
  try{
    for(let n=0;n<clips.length;n++){
      if(!voiceBuild||voiceBuild.abort)break;
      let clip=clips[n],ck=clipKey(clip.text,snap);
      setBuildProgress("Building voices "+(n+1)+"/"+total+" • "+clip.name);
      status("Building voices "+(n+1)+"/"+total+" • "+clip.name);
      let cached=await cacheGet(ck);
      if(!cached){
        if(!voiceBuild||voiceBuild.abort)break;
        let blob=await requestVoiceBlob(clip.text,snap,voiceBuild.ctrl.signal);
        await cachePut(ck,blob);made++;
      }
      ready++;
    }
    if(voiceBuild&&voiceBuild.abort){setBuildProgress("Build aborted • "+ready+"/"+total+" kept in cache ("+made+" new).");status("Build All Voices aborted")}
    else{cacheEvict();updateVoiceAccount();hideVoiceGap();setBuildProgress("Build All Voices complete • "+ready+"/"+total+" ready ("+made+" newly generated).");status("Build All Voices complete");if($("voiceCacheState"))$("voiceCacheState").textContent="Cache: "+ready+" voice clips ready for these settings"}
  }catch(e){
    let aborted=(e&&e.name==="AbortError")||(voiceBuild&&voiceBuild.abort);
    if(aborted){setBuildProgress("Build aborted • "+ready+"/"+total+" kept in cache ("+made+" new).");status("Build All Voices aborted")}
    else{setBuildProgress("Build stopped at "+ready+"/"+total+": "+(e.message||"failed")+". Clips already saved stay in the cache.");showVoiceGap("Build All Voices stopped: "+(e.message||"failed")+". Add a working ElevenLabs key and try again. System voices are not used.")}
  }finally{voiceBuild=null;if(btn)btn.textContent="Build All Voices"}
}
window.CJBuildAllVoices=buildAllVoices;
const voicePresets={philosophical:{speed:.82,stability:.68,similarity:.83,style:.05,boost:true,warmth:180,reverb:.065,note:"Calm pitch and warm chest resonance."},meditation:{speed:.82,stability:.69,similarity:.83,style:.04,boost:true,note:"Slower pace."},natural:{speed:1,stability:.67,similarity:.82,style:.02,boost:true,note:"Balanced."},narration:{speed:.92,stability:.72,similarity:.85,style:.08,boost:true,note:"Polished."},expressive:{speed:.97,stability:.65,similarity:.8,style:.10,boost:true,note:"More emotion."}};
function applyVoicePreset(name,doSave=true){let p=voicePresets[name]||voicePresets.philosophical;$("speed").value=p.speed;$("stability").value=p.stability;$("similarity").value=p.similarity;$("voiceStyle").value=p.style;$("speakerBoost").checked=p.boost;if(p.warmth)$("warmthFreq").value=p.warmth;if(p.reverb)$("reverbMix").value=p.reverb;if($("voiceInfo"))$("voiceInfo").textContent=name+" preset: "+p.note;ui();if(doSave)save()}
async function testElevenKey(){
 let key=$("key").value.trim();
 if(!key){status("ElevenLabs: API key missing");return false}
 status("ElevenLabs: testing key…");
 try{
   let r=await fetch("https://api.elevenlabs.io/v2/voices?page_size=1",{headers:{"xi-api-key":key}});
   let raw=await r.text(),j={};try{j=JSON.parse(raw)}catch(e){}
   if(!r.ok){let d=j.detail,msg=(d&&d.message)||(d&&d.status)||j.message||("HTTP "+r.status);throw new Error(msg)}
   localStorage.setItem("cj_key",key);
   status("ElevenLabs: connected ✓");
   updateVoiceAccount();
   return true
 }catch(e){status("ElevenLabs test failed: "+(e&&e.message?e.message:"connection failed"));return false}
}
async function loadElevenVoices(){let key=$("key").value.trim();if(!key)return status("Enter your ElevenLabs API key first");$("loadVoices").disabled=true;status("Loading voices");try{let found=[],page="";do{let q=new URLSearchParams({page_size:"100"});if(page)q.set("next_page_token",page);let r=await fetch("https://api.elevenlabs.io/v2/voices?"+q,{headers:{"xi-api-key":key}});if(!r.ok)throw new Error("Could not load voices ("+r.status+")");let j=await r.json();found.push.apply(found,j.voices||[]);page=j.has_more?j.next_page_token||"":""}while(page&&found.length<1000);allVoices=found;renderVoiceOptions();status(found.length+" voices loaded");localStorage.setItem("cj_key",key)}catch(e){status(e.message)}finally{$("loadVoices").disabled=false}}
function renderVoiceOptions(){let q=$("voiceSearch").value.trim().toLowerCase(),selected=$("voice").value,list=allVoices.filter(v=>(v.name+" "+Object.values(v.labels||{}).join(" ")).toLowerCase().includes(q));if(!allVoices.length)return;let s=$("voice");s.innerHTML="";list.sort((a,b)=>a.name.localeCompare(b.name)).forEach(v=>{let o=document.createElement("option");o.value=v.voice_id;o.textContent=v.name;s.appendChild(o)});if(list.some(v=>v.voice_id===selected))s.value=selected;else if(list.length)s.value=list[0].voice_id;save()}
async function previewSelectedVoice(){
 if(run)return status("Stop the journey first");
 fromPreview=true;
 try{
   await unlockVoiceAudio();
   status("Preview: preparing voice…");
   return await speak("Take a slow breath. Allow your body to soften.","Preview");
 }catch(e){
   status("Preview error: "+(e&&e.message?e.message:e));
   return false;
 }finally{fromPreview=false}
}
async function pw(ms,t){let left=ms,last=performance.now();while(left>0&&run&&t===token){await wait(100);let n=performance.now();if(!paused)left-=n-last;last=n}}
async function affirm(c,t){let n=cl(+$("count").value,1,5),gap=cl(+$("gap").value,0,30),iC=C.indexOf(c);speakingFor=iC;for(let i=0;i<n;i++){while(paused&&t===token)await wait(100);if(!stillThis(iC,t))return false;let a=next(c);show(c,a);if(!await speak(a[0],c[0]+" "+(i+1)+"/"+n))return false;if(!stillThis(iC,t))return false;if(i<n-1)await pw(gap*1000,t);if(!stillThis(iC,t))return false}return true}
async function sequence(t,timed){let a=stamps()||ANALYZED;for(let i=0;i<7;i++){if(!run||t!==token)return;let c=C[i],st=performance.now();current(i,timed?"Timed":"Affirmation Driven");startTone(c);if(useYT()&&ytReady){seekVideo(a[i]);yt.play().catch(()=>{})}if(!await affirm(c,t))return;if(timed){let d=cl(+$("dur").value,10,600)*1000-(performance.now()-st);if(d>0)await pw(d,t)}else if(i<6)await pw(cl(+$("between").value,0,60)*1000,t)}finish(t)}
function distributeTimestamps(){applyAnalyzed()}
function parse(v){let p=String(v||"").split(":").map(Number);return p.some(x=>!Number.isFinite(x))?NaN:p.length===3?p[0]*3600+p[1]*60+p[2]:p.length===2?p[0]*60+p[1]:p[0]}
function stamps(){let el=i=>document.querySelector('[data-ts="'+i+'"]');let a=C.map((_,i)=>parse(el(i)?el(i).value:""));a[0]=Number.isFinite(a[0])?a[0]:0;for(let i=1;i<7;i++)if(!Number.isFinite(a[i])||a[i]<=a[i-1])return null;return a}
async function activate(i,t){if(!run||t!==token)return;if(i===cur&&speakingFor===i)return;stopVoice();current(i,"Timestamp Sync");startTone(C[i]);let marks=stamps()||ANALYZED,need=Number(marks[i]||0);while(run&&t===token&&yt&&!paused&&(yt.currentTime||0)+.05<need)await wait(80);if(i===0&&need<1){let settle=cl(+$("between").value,0,60)*1000;if(settle)await pw(settle,t)}if(!run||t!==token||cur!==i)return;await affirm(C[i],t)}
function timestampRun(t){let a=stamps();if(!a){applyAnalyzed();a=stamps()}if(!a){status("Enter increasing timestamps");run=false;return}status("Waiting for Root at "+stampText(a[0]));watch=setInterval(()=>{if(!run||t!==token){clearInterval(watch);return}if(paused||!yt)return;let s=yt.currentTime||0,i=-1;for(let n=0;n<7;n++)if(s>=a[n])i=n;if(i>=0&&i!==cur)activate(i,t)},250)}

function finish(t){if(t!==token)return;if(window.chakraAuto&&typeof window.chakraAuto.sessionEnd==="function")window.chakraAuto.sessionEnd("completed");run=false;paused=false;speakingFor=-1;stopVoice();stopTone();if(yt)try{yt.pause()}catch(e){}$("play").textContent="Start Journey";status("Journey complete")}
function startYT(){if(!useYT())return true;if(!ytReady){status("Video is still loading");return false}try{yt.setAttribute("playsinline","");yt.setAttribute("webkit-playsinline","");yt.playsInline=true;yt.currentTime=0;fadeYT(ytVol());let p=yt.play();if(p&&p.catch)p.catch(()=>{yt.muted=true;yt.play().then(()=>{yt.muted=false;fadeYT(ytVol())}).catch(()=>status("Tap the video play button"))});return true}catch(e){return false}}
function start(){hideVoiceGap();if(window.chakraAuto&&typeof window.chakraAuto.sessionStart==="function")window.chakraAuto.sessionStart();unlockMedia();if(run&&paused)return togglePause();if(run)stop();stopVoice();unlockVoiceAudio();decks={};speakingFor=-1;token++;let t=token;run=true;paused=false;cur=-1;$("play").textContent="Running";if(!startYT()){run=false;$("play").textContent="Start Journey";return}let m=$("mode").value;if(m==="timestamps"){if(!useYT()){status("Timestamp Sync requires the video");run=false;$("play").textContent="Start Journey";return}timestampRun(t)}else sequence(t,m==="timed")}
function togglePause(){if(!run)return;paused=!paused;if(useYT()&&ytReady)paused?yt.pause():yt.play().catch(()=>{});if(paused){try{if(ctx&&ctx.state==="running")ctx.suspend()}catch(e){}status("Journey paused");$("pause").textContent="Resume"}else{try{if(ctx&&ctx.state==="suspended")ctx.resume()}catch(e){}unlockVoiceAudio();$("pause").textContent="Pause";status("Journey resumed")}}
function stop(){if(run&&window.chakraAuto&&typeof window.chakraAuto.sessionEnd==="function")window.chakraAuto.sessionEnd("stopped");token++;run=false;paused=false;speakingFor=-1;clearInterval(watch);stopVoice();stopTone();if(ytReady){try{yt.pause();yt.currentTime=0}catch(e){}}current(-1,"Journey stopped");$("play").textContent="Start Journey";$("pause").textContent="Pause";status()}
async function preview(i){let a=stamps()||ANALYZED;if(run){if(useYT()){seekVideo(a[i]);yt.play().catch(()=>{})}return}fromPreview=true;current(i,"Preview");startTone(C[i]);if(useYT()){seekVideo(a[i]);yt.play().catch(()=>{})}let aff=next(C[i]);show(C[i],aff);try{await speak(aff[0],C[i][0])}finally{fromPreview=false}}
function save(){let ids=["yv","dv","mode","dur","count","gap","between","voice","key","voicePreset","model","speed","stability","similarity","voiceStyle","warmthFreq","reverbMix","vv","style","tv"];ids.forEach(id=>{if($(id))localStorage.setItem("cj_"+id,$(id).value)});localStorage.setItem("cj_src",src);if($("speakerBoost"))localStorage.setItem("cj_speakerBoost",$("speakerBoost").checked?"1":"0");if($("autoModel"))localStorage.setItem("cj_autoModel",$("autoModel").checked?"1":"0");C.forEach((_,i)=>{let el=document.querySelector('[data-ts="'+i+'"]');if(el)localStorage.setItem("cj_ts"+i,el.value)})}
function load(){let ids=["yv","dv","mode","dur","count","gap","between","voice","key","voicePreset","model","speed","stability","similarity","voiceStyle","warmthFreq","reverbMix","vv","style","tv"];ids.forEach(id=>{let v=localStorage.getItem("cj_"+id);if(v!==null&&$(id))$(id).value=v});let boost=localStorage.getItem("cj_speakerBoost");if(boost!==null&&$("speakerBoost"))$("speakerBoost").checked=boost==="1";let auto=localStorage.getItem("cj_autoModel");if(auto!==null&&$("autoModel"))$("autoModel").checked=auto==="1";src=localStorage.getItem("cj_src")||"both";C.forEach((_,i)=>{let v=localStorage.getItem("cj_ts"+i);let el=document.querySelector('[data-ts="'+i+'"]');if(v!==null&&el)el.value=v});if(localStorage.getItem("cj_pitchfix")!=="1"){applyAnalyzed();localStorage.setItem("cj_pitchfix","1")}ui()}
function ui(){document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.s===src));if($("ytBox"))$("ytBox").classList.toggle("hide",!useYT());if($("yvv"))$("yvv").textContent=$("yv").value+"%";if($("dvv"))$("dvv").textContent=$("dv").value+"%";if($("vvv"))$("vvv").textContent=Math.round(+$("vv").value*100)+"%";if($("tvv"))$("tvv").textContent=Math.round(+$("tv").value*100)+"%";if($("speedv"))$("speedv").textContent=(+$("speed").value).toFixed(2)+"x";if($("stabilityv"))$("stabilityv").textContent=Math.round(+$("stability").value*100)+"%";if($("similarityv"))$("similarityv").textContent=Math.round(+$("similarity").value*100)+"%";if($("voiceStylev"))$("voiceStylev").textContent=Math.round(+$("voiceStyle").value*100)+"%";if($("warmthFreqv"))$("warmthFreqv").textContent=$("warmthFreq").value+" Hz";if($("reverbMixv"))$("reverbMixv").textContent=(+$("reverbMix").value*100).toFixed(1)+"%";let m=$("mode").value;if($("ts"))$("ts").classList.toggle("show",m==="timestamps");if($("durrow"))$("durrow").style.display=m==="timed"?"flex":"none"}
document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>{src=b.dataset.s;save();ui()});
document.querySelectorAll("input,select").forEach(x=>x.addEventListener("change",()=>{save();ui()}));
["yv","dv","speed","stability","similarity","voiceStyle"].forEach(id=>{if($(id))$(id).addEventListener("input",()=>{ui();save();if(id==="yv")fadeYT(ytVol())})});
["vv","tv","warmthFreq","reverbMix"].forEach(id=>{if($(id))$(id).addEventListener("input",()=>{ui();save();applyColorLive()})});
if($("style"))$("style").addEventListener("change",()=>{if(cur>=0&&useTone()&&(run||fromPreview))startTone(C[cur])});
function bindVoiceControls(){
 const test=$("testVoiceApi"),previewBtn=$("previewVoice"),loadBtn=$("loadVoices"),clear=$("clearVoiceKey"),cache=$("clearVoiceCache"),build=$("buildAllVoices");
 if(test)test.onclick=()=>{status("Voice API button pressed…");testElevenKey().catch(e=>status("Voice API error: "+e.message))};
 if(previewBtn)previewBtn.onclick=()=>{status("Preview button pressed…");previewSelectedVoice().catch(e=>status("Preview error: "+e.message))};
 if(loadBtn)loadBtn.onclick=()=>{status("Load voices button pressed…");loadElevenVoices().catch(e=>status("Load voices error: "+e.message))};
 if(clear)clear.onclick=()=>{$("key").value="";localStorage.removeItem("cj_key");status("ElevenLabs key cleared");updateVoiceAccount()};
 if(cache)cache.onclick=()=>clearVoiceCache();
 if(build)build.onclick=()=>{buildAllVoices().catch(e=>status("Build All Voices error: "+(e&&e.message?e.message:e)))};
}
bindVoiceControls();
window.CJVoiceTest=()=>{status("Voice API button pressed…");return testElevenKey().catch(e=>status("Voice API error: "+e.message))};
window.CJVoicePreview=()=>{status("Preview button pressed…");return previewSelectedVoice().catch(e=>status("Preview error: "+e.message))};
window.CJVoiceLoad=()=>{status("Load voices button pressed…");return loadElevenVoices().catch(e=>status("Load voices error: "+e.message))};
$("voiceSearch").oninput=renderVoiceOptions;$("voicePreset").onchange=()=>applyVoicePreset($("voicePreset").value);$("speakerBoost").onchange=save;$("distributeTimestamps").onclick=distributeTimestamps;$("play").onclick=start;$("pause").onclick=togglePause;$("stop").onclick=stop;
yt.addEventListener("loadedmetadata",()=>{ytReady=true;fadeYT(ytVol());status("Video ready • "+(triedSrc||VIDEO_FILES[0])+" • "+stampText(yt.duration||670))});
yt.addEventListener("canplay",()=>{ytReady=true});
yt.addEventListener("play",()=>{if(ctx&&ctx.state!=="running")ctx.resume().catch(()=>{});if(!run&&!fromPreview&&useYT())start()});
yt.addEventListener("error",()=>{ytReady=false;tryNextVideo()});
yt.addEventListener("ended",()=>{if(run&&$("mode").value==="timestamps")finish(token)});
["pointerdown","touchstart","click"].forEach(ev=>document.addEventListener(ev,unlockMedia,{passive:true}));
document.addEventListener("visibilitychange",()=>{if(!document.hidden){try{audio()}catch(e){}if(run&&!paused&&useYT())yt.play().catch(()=>{})}});
loadVideoSrc(VIDEO_FILES[0]);if(yt.readyState>=1)ytReady=true;load();setTimeout(updateVoiceAccount,400);
if(localStorage.getItem("cj_philosophicalPresetVersion")!=="1"){$("voicePreset").value="philosophical";$("model").value="eleven_multilingual_v2";$("voice").value="JBFqnCBsd6RMkjVDRZzb";applyVoicePreset("philosophical",false);localStorage.setItem("cj_philosophicalPresetVersion","1");save()}
