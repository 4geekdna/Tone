(function(){
'use strict';
/* Chakra Journey v0.40 — microphone frequency colors the screen.
   The graph is created only after a user gesture, or when the mic
   permission is already granted. The video element is never routed
   into the AudioContext (that was the v0.38 silent-video bug).

   Band table. Centers are the solfeggio tones on window.C.
   Edges are the midpoints between those centers, so each Hz lands
   in exactly one chakra. Root starts at 80 Hz so a low tone
   (about 100–250 Hz) is Root and 60 Hz mains hum is ignored.
   Crown runs through 2200 Hz so a high tone (about 910–1200 Hz+)
   is Crown. Colors match window.C column 4.

     Root       80–406.5 Hz   center 396  #8B0000
     Sacral    406.5–472.5    center 417  #E65100
     Solar     472.5–583.5    center 528  #F9A825
     Heart     583.5–690      center 639  #2E7D32
     Throat    690–796.5      center 741  #0277BD
     Third Eye 796.5–907.5    center 852  #283593
     Crown     907.5–2200     center 963  #6A1B9A
*/
const BANDS=[
  {name:"Root",hz:396,lo:80,hi:406.5,color:"#8B0000"},
  {name:"Sacral",hz:417,lo:406.5,hi:472.5,color:"#E65100"},
  {name:"Solar",hz:528,lo:472.5,hi:583.5,color:"#F9A825"},
  {name:"Heart",hz:639,lo:583.5,hi:690,color:"#2E7D32"},
  {name:"Throat",hz:741,lo:690,hi:796.5,color:"#0277BD"},
  {name:"Third Eye",hz:852,lo:796.5,hi:907.5,color:"#283593"},
  {name:"Crown",hz:963,lo:907.5,hi:2200,color:"#6A1B9A"}
];
const HOLD_MS=200, QUIET_MS=1200, FLOOR_DB=-58;
let stream=null, starting=null, analyser=null, floatData=null, mute=null, src=null;
let raf=null, shown=-1, pending=-1, pendingAt=0, quietAt=0, lastPaint=0, held=false, origFollow=null;

function $(id){return document.getElementById(id)}
function readout(){return $("freqReadout")}
function say(t){let el=readout();if(el)el.textContent=t}
function shared(){
  try{if(window.CJAudio)return window.CJAudio()}catch(e){}
  return window.__cjAudioCtx||null;
}
function colorFor(i){
  let c=window.C&&window.C[i]&&window.C[i][4];
  return (typeof c==="string"&&c)?c:BANDS[i].color;
}
function bandForHz(hz){
  if(!Number.isFinite(hz))return -1;
  for(let i=0;i<BANDS.length;i++){
    let b=BANDS[i], last=i===BANDS.length-1;
    if(hz>=b.lo&&(hz<b.hi||(last&&hz<=b.hi)))return i;
  }
  return -1;
}
function dominantHz(db, sampleRate, fftSize){
  if(!db||!sampleRate||!fftSize)return null;
  let hzPer=sampleRate/fftSize;
  let i0=Math.max(1,Math.floor(80/hzPer));
  let i1=Math.min(db.length-2,Math.ceil(2200/hzPer));
  if(i1<=i0)return null;
  let best=-Infinity, idx=-1;
  for(let i=i0;i<=i1;i++){
    let v=db[i];
    if(v>best){best=v;idx=i}
  }
  if(idx<0||!(best>FLOOR_DB))return null;
  let chosen=idx;
  let hz=idx*hzPer;
  for(let div=2;div<=3;div++){
    let target=hz/div;
    if(target<80)continue;
    let j=Math.round(target/hzPer);
    if(j<=i0||j>=i1)continue;
    let local=-Infinity, li=j;
    for(let k=j-2;k<=j+2;k++)if(db[k]>local){local=db[k];li=k}
    if(local>best-8&&local>FLOOR_DB){chosen=li;best=local;break}
  }
  let a=db[chosen-1], b=db[chosen], c=db[chosen+1];
  let denom=(a-2*b+c);
  let shift=Math.abs(denom)>1e-3?0.5*(a-c)/denom:0;
  if(shift>0.5)shift=0.5;else if(shift<-0.5)shift=-0.5;
  let out=(chosen+shift)*hzPer;
  return Number.isFinite(out)?out:null;
}
function paintScreen(i){
  let hex=colorFor(i);
  document.documentElement.style.setProperty("--chakra",hex);
  document.body.classList.add("freq-color");
  document.body.dataset.freqBand=BANDS[i].name;
  document.body.dataset.freqIndex=String(i);
  let meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute("content",hex);
}
function paintLights(i){
  let now=performance.now();
  if(now-lastPaint<650&&shown===i)return;
  lastPaint=now;
  let hex=colorFor(i);
  if(typeof window.goveePaintBlend==="function"){
    try{window.goveePaintBlend(hex,74,hex,58)}catch(e){}
  }
}
function holdFollow(){
  if(held||typeof window.goveeFollow!=="function")return;
  origFollow=window.goveeFollow;
  window.goveeFollow=function(i){
    if(shown>=0)return;
    return origFollow.apply(this,arguments);
  };
  held=true;
}
function ownScreen(){
  let auto=window.chakraAuto;
  if(!auto||auto.__freqWrapped||typeof auto.activate!=="function")return;
  let orig=auto.activate;
  auto.activate=function(i){
    let r=orig.apply(this,arguments);
    if(shown>=0)paintScreen(shown);
    return r;
  };
  auto.__freqWrapped=true;
}
function ensureReadout(){
  if(readout())return;
  let now=document.querySelector(".now");
  if(!now)return;
  let el=document.createElement("div");
  el.id="freqReadout";
  el.className="muted";
  el.textContent="Color follows the microphone. Tap anywhere to listen.";
  now.appendChild(el);
}
function connectGraph(ctx,live){
  if(!ctx||!live)return false;
  try{ctx.resume()}catch(e){}
  try{
    if(src){try{src.disconnect()}catch(e){}}
    src=ctx.createMediaStreamSource(live);
    analyser=ctx.createAnalyser();
    analyser.fftSize=8192;
    analyser.smoothingTimeConstant=0.5;
    analyser.minDecibels=-90;
    analyser.maxDecibels=-12;
    floatData=new Float32Array(analyser.frequencyBinCount);
    mute=ctx.createGain();
    mute.gain.value=0;
    src.connect(analyser);
    analyser.connect(mute);
    mute.connect(ctx.destination);
    if(!raf)raf=requestAnimationFrame(tick);
    say("Listening…");
    return true;
  }catch(e){
    say("Could not open the frequency analyzer.");
    return false;
  }
}
function tick(ts){
  raf=requestAnimationFrame(tick);
  let ctx=window.__cjAudioCtx;
  if(!analyser||!ctx||ctx.state!=="running")return;
  analyser.getFloatFrequencyData(floatData);
  let hz=dominantHz(floatData,ctx.sampleRate,analyser.fftSize);
  let band=hz==null?-1:bandForHz(hz);
  if(band<0){
    if(!quietAt)quietAt=ts;
    if(ts-quietAt>QUIET_MS&&shown>=0){
      shown=-1;
      delete document.body.dataset.freqHz;
      say("Listening…");
    }
    return;
  }
  quietAt=0;
  if(band!==pending){pending=band;pendingAt=ts}
  document.body.dataset.freqHz=String(Math.round(hz));
  if(band!==shown&&ts-pendingAt<HOLD_MS){
    say(Math.round(hz)+" Hz · "+BANDS[band].name);
    return;
  }
  if(band!==shown){
    shown=band;
    paintScreen(band);
    paintLights(band);
  }
  say(Math.round(hz)+" Hz · "+BANDS[band].name);
}
function beginMic(){
  if(stream)return Promise.resolve(stream);
  if(starting)return starting;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    say("This browser has no microphone. Screen color stays on the journey.");
    return Promise.resolve(null);
  }
  let ctx=shared();
  if(!ctx){
    say("Tap again to start the microphone.");
    return Promise.resolve(null);
  }
  try{let p=ctx.resume();if(p&&p.catch)p.catch(function(){})}catch(e){}
  let constraints={audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}};
  starting=navigator.mediaDevices.getUserMedia(constraints).catch(function(){
    return navigator.mediaDevices.getUserMedia({audio:true});
  }).then(function(live){
    stream=live;
    starting=null;
    connectGraph(ctx,live);
    if(ctx.state!=="running"){try{ctx.resume()}catch(e){}}
    return live;
  }).catch(function(){
    starting=null;
    stream=null;
    say("Allow the microphone, then tap again. The tone colors the screen.");
    return null;
  });
  return starting;
}
function gestureStart(){
  holdFollow();
  ownScreen();
  ensureReadout();
  beginMic();
}
function tryGranted(){
  if(!navigator.permissions||!navigator.permissions.query)return;
  navigator.permissions.query({name:"microphone"}).then(function(p){
    if(p.state==="granted")gestureStart();
    p.onchange=function(){if(p.state==="granted")gestureStart()};
  }).catch(function(){});
}
function stop(){
  shown=-1;pending=-1;
  if(raf){cancelAnimationFrame(raf);raf=null}
  if(stream){try{stream.getTracks().forEach(function(t){t.stop()})}catch(e){}}
  stream=null;starting=null;analyser=null;
  say("Microphone color is off.");
}
function boot(){
  ensureReadout();
  holdFollow();
  ownScreen();
  ["pointerup","touchend","click"].forEach(function(ev){
    document.addEventListener(ev,gestureStart,true);
  });
  tryGranted();
  document.addEventListener("visibilitychange",function(){
    if(document.hidden)return;
    let ctx=window.__cjAudioCtx;
    if(ctx&&ctx.state==="suspended"){try{ctx.resume()}catch(e){}}
    if(!stream)tryGranted();
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
else boot();
window.CJFreqColor={BANDS:BANDS,bandForHz:bandForHz,dominantHz:dominantHz,colorFor:colorFor,start:gestureStart,isLive:function(){return !!analyser}};
window.CJAudioLights={start:gestureStart,stop:stop,isOn:function(){return !!analyser}};
})();
