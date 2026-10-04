(function(){
'use strict';
/* Chakra Journey v0.43 — the video file's audio colors the screen.
   v0.44: the chakra comes from CJDominant (chakra-dominant.js), the same
   detection Auto mode uses: exact solfeggio tones by Hz, other pitches by
   their note (C Root ... B Crown, as in window.C), A-weighted so a low hum
   does not outvote the bowl. The band table below is the fallback only.
   Each analyser frame is also handed to window.__cjSpectrumHook
   (chakra-auto-mantra.js) for primary-chakra detection.
   There is no microphone path. The media element is attached once,
   and only while the shared AudioContext is running, by
   chakra-session-record.js (__cjEnsureVideoGraph). That same node
   feeds the speakers, the recording bus, and this analyser.

   Top 1 uses dominantHz: the loudest bin from 80–2200 Hz, above
   -58 dB, with a harmonic folded down when a subharmonic within
   8 dB is present. Top 2 and Top 3 take that many separated local
   maxima, merge peaks that land in the same chakra, and blend the
   band colors in OKLab by linear magnitude. The one resulting color
   is painted on the page background and sent to Govee.

   Band table. Centers are the solfeggio tones on window.C.
   Edges are the midpoints between those centers.

     Root       80–406.5 Hz   center 396  #8B0000
     Sacral    406.5–472.5    center 417  #E65100
     Solar     472.5–583.5    center 528  #F9A825
     Heart     583.5–690      center 639  #2E7D32
     Throat    690–796.5      center 741  #0277BD
     Third Eye 796.5–907.5    center 852  #283593
     Crown     907.5–2200     center 963  #6A1B9A
*/
const LS_TOP="cj_color_top_v1";
const BANDS=[
  {name:"Root",hz:396,lo:80,hi:406.5,color:"#8B0000"},
  {name:"Sacral",hz:417,lo:406.5,hi:472.5,color:"#E65100"},
  {name:"Solar",hz:528,lo:472.5,hi:583.5,color:"#F9A825"},
  {name:"Heart",hz:639,lo:583.5,hi:690,color:"#2E7D32"},
  {name:"Throat",hz:741,lo:690,hi:796.5,color:"#0277BD"},
  {name:"Third Eye",hz:852,lo:796.5,hi:907.5,color:"#283593"},
  {name:"Crown",hz:963,lo:907.5,hi:2200,color:"#6A1B9A"}
];
const HOLD_MS=200, QUIET_MS=1200, FLOOR_DB=-58, SEP_HZ=45, GOVEE_MS=650;
let analyser=null, floatData=null, mute=null, raf=null;
let shownHex="", shownLabel="", pendingHex="", pendingAt=0, quietAt=0, paintedHex="";
let lastGovee=0, goveeHex="", goveeTimer=0, pendingGovee="";
let held=false, origFollow=null, topN=1, fileUrl="";

function $(id){return document.getElementById(id)}
function readout(){return $("freqReadout")}
function say(t){let el=readout();if(el)el.textContent=t}
function shared(){
  try{if(window.CJAudio)return window.CJAudio()}catch(e){}
  return window.__cjAudioCtx||null;
}
function loadTop(){
  try{
    let n=parseInt(localStorage.getItem(LS_TOP)||"1",10);
    if(n===2||n===3)return n;
  }catch(e){}
  return 1;
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
function linMag(db){return Math.pow(10, db/20)}
function findPeaks(db, sampleRate, fftSize, n){
  if(!db||!sampleRate||!fftSize)return [];
  let hzPer=sampleRate/fftSize;
  let i0=Math.max(1,Math.floor(80/hzPer));
  let i1=Math.min(db.length-2,Math.ceil(2200/hzPer));
  let found=[];
  for(let i=i0;i<=i1;i++){
    let v=db[i];
    if(!(v>FLOOR_DB)||!(v>db[i-1]&&v>=db[i+1]))continue;
    let a=db[i-1], b=v, c=db[i+1];
    let denom=(a-2*b+c);
    let shift=Math.abs(denom)>1e-3?0.5*(a-c)/denom:0;
    if(shift>0.5)shift=0.5;else if(shift<-0.5)shift=-0.5;
    let hz=(i+shift)*hzPer;
    if(hz<80||hz>2200)continue;
    found.push({hz:hz, db:v, mag:linMag(v), band:bandForHz(hz)});
  }
  found.sort(function(p,q){return q.mag-p.mag});
  let picked=[];
  for(let i=0;i<found.length&&picked.length<n;i++){
    let p=found[i];
    if(p.band<0)continue;
    let near=false;
    for(let k=0;k<picked.length;k++)if(Math.abs(picked[k].hz-p.hz)<SEP_HZ)near=true;
    if(!near)picked.push(p);
  }
  return picked;
}
function mergeBands(peaks){
  let out=[];
  for(let i=0;i<peaks.length;i++){
    let p=peaks[i], slot=null;
    for(let k=0;k<out.length;k++)if(out[k].band===p.band)slot=out[k];
    if(slot){slot.mag+=p.mag;if(p.mag>linMag(slot.db)){slot.db=p.db;slot.hz=p.hz}}
    else out.push({hz:p.hz, db:p.db, mag:p.mag, band:p.band});
  }
  return out;
}
function hexRgb(hex){
  let h=String(hex||"").replace("#","");
  if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  let n=parseInt(h,16);
  return [(n>>16)&255,(n>>8)&255,n&255];
}
function srgbToLin(c){
  c=c/255;
  return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);
}
function linToSrgb(c){
  let s=c<=0.0031308?12.92*c:1.055*Math.pow(Math.max(c,0),1/2.4)-0.055;
  return Math.max(0,Math.min(255,Math.round(s*255)));
}
function rgbToOklab(r,g,b){
  let R=srgbToLin(r), G=srgbToLin(g), B=srgbToLin(b);
  let l=Math.cbrt(0.4122214708*R+0.5363325363*G+0.0514459929*B);
  let m=Math.cbrt(0.2119034982*R+0.6806995451*G+0.1073969566*B);
  let s=Math.cbrt(0.0883024619*R+0.2817188376*G+0.6299787005*B);
  return [
    0.2104542553*l+0.7936177850*m-0.0040720468*s,
    1.9779984951*l-2.4285922050*m+0.4505937099*s,
    0.0259040371*l+0.7827717662*m-0.8086757660*s
  ];
}
function oklabToRgb(L,a,b){
  let l=L+0.3963377774*a+0.2158037573*b;
  let m=L-0.1055613458*a-0.0638541728*b;
  let s=L-0.0894841775*a-1.2914855480*b;
  l=l*l*l; m=m*m*m; s=s*s*s;
  return [
    linToSrgb(4.0767416621*l-3.3077115913*m+0.2309699292*s),
    linToSrgb(-1.2684380046*l+2.6097574011*m-0.3413193965*s),
    linToSrgb(-0.0041960863*l-0.7034186147*m+1.7076147010*s)
  ];
}
function rgbHex(r,g,b){
  function h(v){return v.toString(16).padStart(2,"0")}
  return "#"+h(r)+h(g)+h(b);
}
function blendParts(parts){
  if(!parts.length)return "";
  if(parts.length===1)return colorFor(parts[0].band);
  let sum=0;
  for(let i=0;i<parts.length;i++)sum+=parts[i].mag;
  if(!(sum>0))return colorFor(parts[0].band);
  let L=0,a=0,b=0;
  for(let i=0;i<parts.length;i++){
    let w=parts[i].mag/sum;
    let rgb=hexRgb(colorFor(parts[i].band));
    let lab=rgbToOklab(rgb[0],rgb[1],rgb[2]);
    L+=w*lab[0]; a+=w*lab[1]; b+=w*lab[2];
  }
  let rgb=oklabToRgb(L,a,b);
  return rgbHex(rgb[0],rgb[1],rgb[2]);
}
function targetFrom(db, sampleRate, fftSize){
  let D=window.CJDominant;
  if(D&&typeof D.topBands==="function"){
    let top=D.topBands(db, sampleRate, fftSize, topN);
    if(!top.length)return null;
    if(topN<=1||top.length===1){
      let p=top[0];
      return {hex:colorFor(p.band), label:Math.round(p.hz)+" Hz · "+BANDS[p.band].name, peaks:[{hz:p.hz, band:p.band, mag:1}]};
    }
    let parts=top.map(function(p){return {hz:p.hz, band:p.band, mag:p.level}});
    return {hex:blendParts(parts), label:parts.map(function(p){return BANDS[p.band].name}).join(" · "), peaks:parts};
  }
  if(topN<=1){
    let hz=dominantHz(db, sampleRate, fftSize);
    let band=hz==null?-1:bandForHz(hz);
    if(band<0)return null;
    return {hex:colorFor(band), label:Math.round(hz)+" Hz · "+BANDS[band].name, peaks:[{hz:hz, band:band, mag:1}]};
  }
  let peaks=mergeBands(findPeaks(db, sampleRate, fftSize, topN));
  if(!peaks.length)return null;
  let hex=blendParts(peaks);
  let label=peaks.map(function(p){return Math.round(p.hz)+" Hz"}).join(" · ");
  return {hex:hex, label:label, peaks:peaks};
}
function mainBox(){return document.querySelector(".w")}
function applySurfaces(hex){
  document.documentElement.style.setProperty("--chakra",hex);
  document.documentElement.style.backgroundColor=hex;
  document.body.style.backgroundColor=hex;
  let w=mainBox();
  if(w)w.style.backgroundColor=hex;
  let meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute("content",hex);
  document.body.dataset.freqHex=hex;
}
function paintColor(hex){
  if(!hex)return;
  if(hex===paintedHex){applySurfaces(hex);return}
  document.body.classList.add("freq-color");
  let now=getComputedStyle(document.body).backgroundColor;
  document.body.style.transition="none";
  document.documentElement.style.transition="none";
  document.body.style.backgroundColor=now;
  document.documentElement.style.backgroundColor=now;
  let w=mainBox();
  if(w){w.style.transition="none";w.style.backgroundColor=now}
  void document.body.offsetWidth;
  document.body.style.transition="background-color .5s ease";
  document.documentElement.style.transition="background-color .5s ease";
  if(w)w.style.transition="background-color .5s ease";
  applySurfaces(hex);
  paintedHex=hex;
  paintLights(hex);
}
function releaseScreen(){
  paintedHex="";
  document.body.style.backgroundColor="";
  document.body.style.transition="";
  document.documentElement.style.backgroundColor="";
  document.documentElement.style.transition="";
  let w=mainBox();
  if(w){w.style.backgroundColor="";w.style.transition=""}
  delete document.body.dataset.freqHex;
}
function paintLights(hex){
  pendingGovee=hex;
  flushGovee();
}
function flushGovee(){
  if(!pendingGovee||typeof window.goveePaintBlend!=="function")return;
  let now=performance.now();
  if(now-lastGovee<GOVEE_MS){
    if(!goveeTimer){
      goveeTimer=setTimeout(function(){goveeTimer=0;flushGovee()},Math.max(20,GOVEE_MS-(now-lastGovee)));
    }
    return;
  }
  let hex=pendingGovee;
  if(hex===goveeHex)return;
  lastGovee=now;
  goveeHex=hex;
  try{window.goveePaintBlend(hex,74,hex,58)}catch(e){}
}
function holdFollow(){
  if(held||typeof window.goveeFollow!=="function")return;
  origFollow=window.goveeFollow;
  window.goveeFollow=function(i){
    if(shownHex)return;
    return origFollow.apply(this,arguments);
  };
  held=true;
}
function watchFollow(n){
  n=n||0;
  if(held||n>25)return;
  if(typeof window.goveeFollow==="function"){holdFollow();return}
  setTimeout(function(){watchFollow(n+1)},400);
}
function ownScreen(){
  let auto=window.chakraAuto;
  if(!auto||auto.__freqWrapped||typeof auto.activate!=="function")return;
  let orig=auto.activate;
  auto.activate=function(i){
    let r=orig.apply(this,arguments);
    if(shownHex)paintColor(shownHex);
    return r;
  };
  auto.__freqWrapped=true;
}
function markTop(){
  let box=$("colorFrom");
  if(!box)return;
  box.querySelectorAll("button").forEach(function(b){
    b.classList.toggle("on",parseInt(b.dataset.top,10)===topN);
  });
}
function setTop(n){
  n=n===2||n===3?n:1;
  topN=n;
  try{localStorage.setItem(LS_TOP,String(n))}catch(e){}
  pendingHex="";
  shownHex="";
  shownLabel="";
  pendingAt=0;
  markTop();
}
function ensureStyle(){
  if($("colorFromStyle"))return;
  let s=document.createElement("style");
  s.id="colorFromStyle";
  s.textContent=".color-from{display:flex;gap:6px;align-items:center;justify-content:center;margin-top:8px;font-size:12px;color:#aaa}.color-from button{border:1px solid #3a3a44;background:#22222a;color:#ddd;border-radius:999px;padding:4px 9px;font:inherit}.color-from button.on{background:#fff;color:#111;border-color:#fff}#chooseVideoFile{display:block;margin:-4px auto 10px;background:transparent;color:#aaa;border:0;font:13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-decoration:underline}#ytBox.filedrop{outline:2px solid #fff;outline-offset:2px}";
  document.head.appendChild(s);
}
function ensureReadout(){
  if(readout())return;
  let now=document.querySelector(".now");
  if(!now)return;
  let el=document.createElement("div");
  el.id="freqReadout";
  el.className="muted";
  el.textContent="Color follows the video.";
  now.appendChild(el);
}
function ensureTop(){
  if($("colorFrom")){markTop();return}
  let host=readout();
  if(!host||!host.parentNode)return;
  let box=document.createElement("div");
  box.id="colorFrom";
  box.className="color-from";
  box.innerHTML='<span>Colors from</span><button type="button" data-top="1">Top 1</button><button type="button" data-top="2">Top 2</button><button type="button" data-top="3">Top 3</button>';
  host.insertAdjacentElement("afterend",box);
  box.addEventListener("click",function(e){
    let b=e.target.closest("button");
    if(!b)return;
    setTop(parseInt(b.dataset.top,10));
  });
  markTop();
}
function loadUserVideo(file){
  if(!file)return;
  let v=$("player");
  if(!v)return;
  if(fileUrl){try{URL.revokeObjectURL(fileUrl)}catch(e){}}
  fileUrl=URL.createObjectURL(file);
  v.src=fileUrl;
  try{v.load()}catch(e){}
  let note=$("videoChoiceNote");
  if(note)note.textContent=file.name;
  beginFile();
  let p=v.play();
  if(p&&p.catch)p.catch(function(){});
}
function ensurePicker(){
  if($("pickVideoFile"))return;
  let input=document.createElement("input");
  input.type="file";
  input.id="pickVideoFile";
  input.accept="video/*";
  input.hidden=true;
  input.addEventListener("change",function(){
    let f=input.files&&input.files[0];
    input.value="";
    if(f)loadUserVideo(f);
  });
  document.body.appendChild(input);
  let btn=document.createElement("button");
  btn.type="button";
  btn.id="chooseVideoFile";
  btn.textContent="Choose a video file";
  btn.addEventListener("click",function(){beginFile();input.click()});
  let box=$("ytBox");
  if(box)box.insertAdjacentElement("afterend",btn);
  if(!box||box.__cjDrop)return;
  box.__cjDrop=true;
  ["dragenter","dragover"].forEach(function(ev){
    box.addEventListener(ev,function(e){e.preventDefault();box.classList.add("filedrop")});
  });
  box.addEventListener("dragleave",function(){box.classList.remove("filedrop")});
  box.addEventListener("drop",function(e){
    e.preventDefault();
    box.classList.remove("filedrop");
    let f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
    if(f)loadUserVideo(f);
  });
}
function connectFile(ctx){
  if(!ctx||ctx.state!=="running"||typeof window.__cjEnsureVideoGraph!=="function")return false;
  try{window.__cjEnsureVideoGraph()}catch(e){return false}
  let node=window.__cjVideoOut;
  if(!node||node.context!==ctx)return false;
  try{
    if(!analyser||analyser.context!==ctx){
      analyser=ctx.createAnalyser();
      analyser.fftSize=8192;
      analyser.smoothingTimeConstant=0.5;
      analyser.minDecibels=-100;
      analyser.maxDecibels=0;
      floatData=new Float32Array(analyser.frequencyBinCount);
      mute=ctx.createGain();
      mute.gain.value=0;
      analyser.connect(mute);
      if(window.__cjRecTapped)window.__cjRecTapped.add(mute);
      mute.connect(ctx.destination);
    }
    if(window.__cjColorNode!==node){
      if(window.__cjColorNode){try{window.__cjColorNode.disconnect(analyser)}catch(e){}}
      node.connect(analyser);
      window.__cjColorNode=node;
    }
    if(!raf)raf=requestAnimationFrame(tick);
    return true;
  }catch(e){
    say("Could not read the video sound.");
    return false;
  }
}
function tick(ts){
  raf=requestAnimationFrame(tick);
  let ctx=window.__cjAudioCtx;
  if(!analyser||!ctx||ctx.state!=="running"||!floatData)return;
  analyser.getFloatFrequencyData(floatData);
  if(typeof window.__cjSpectrumHook==="function"){try{window.__cjSpectrumHook(floatData, ctx.sampleRate, analyser.fftSize, ts)}catch(e){}}
  let target=targetFrom(floatData, ctx.sampleRate, analyser.fftSize);
  if(!target){
    pendingHex="";
    if(!quietAt)quietAt=ts;
    if(ts-quietAt>QUIET_MS&&shownHex){
      shownHex="";
      shownLabel="";
      releaseScreen();
      say("Color follows the video.");
    }
    return;
  }
  quietAt=0;
  if(target.hex!==pendingHex){pendingHex=target.hex;pendingAt=ts}
  if(target.hex!==shownHex&&ts-pendingAt<HOLD_MS){
    say(shownLabel||target.label);
    return;
  }
  if(target.hex!==shownHex){
    shownHex=target.hex;
    shownLabel=target.label;
    paintColor(shownHex);
  }
  say(shownLabel||target.label);
}
function beginFile(){
  watchFollow();
  ownScreen();
  ensureReadout();
  ensureTop();
  let ctx=shared();
  if(!ctx)return;
  try{
    let p=ctx.resume();
    if(p&&p.then)p.then(function(){connectFile(ctx)}).catch(function(){});
  }catch(e){}
  if(ctx.state==="running"){connectFile(ctx);return}
  if(ctx.__cjFileWait)return;
  ctx.__cjFileWait=true;
  let on=function(){
    if(ctx.state!=="running")return;
    ctx.removeEventListener("statechange",on);
    ctx.__cjFileWait=false;
    connectFile(ctx);
  };
  ctx.addEventListener("statechange",on);
}
function boot(){
  topN=loadTop();
  ensureStyle();
  ensureReadout();
  ensureTop();
  ensurePicker();
  say("Color follows the video.");
  watchFollow();
  ownScreen();
  ["pointerup","touchend","click"].forEach(function(ev){
    document.addEventListener(ev,beginFile,true);
  });
  let v=$("player");
  if(v)v.addEventListener("play",function(){
    let ctx=window.__cjAudioCtx;
    if(ctx&&ctx.state==="running")connectFile(ctx);
  });
  document.addEventListener("visibilitychange",function(){
    if(document.hidden)return;
    let ctx=window.__cjAudioCtx;
    if(!ctx)return;
    if(ctx.state==="suspended"){try{ctx.resume()}catch(e){}}
    if(ctx.state==="running")connectFile(ctx);
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
else boot();
window.CJFreqColor={
  BANDS:BANDS,
  bandForHz:bandForHz,
  dominantHz:dominantHz,
  colorFor:colorFor,
  findPeaks:findPeaks,
  mergeBands:mergeBands,
  blendParts:blendParts,
  targetFrom:targetFrom,
  setTop:setTop,
  top:function(){return topN},
  start:beginFile,
  isLive:function(){return !!analyser},
  input:function(){return window.__cjColorNode?"file":""},
  frame:function(){
    return {
      hex:shownHex,
      top:topN,
      sampleRate:analyser&&analyser.context?analyser.context.sampleRate:0,
      fftSize:analyser?analyser.fftSize:0,
      db:floatData?Array.from(floatData):null
    };
  }
};
window.CJAudioLights={start:beginFile,stop:function(){
  shownHex="";shownLabel="";pendingHex="";
  if(raf){cancelAnimationFrame(raf);raf=null}
  if(window.__cjColorNode&&analyser){try{window.__cjColorNode.disconnect(analyser)}catch(e){}}
  window.__cjColorNode=null;
  analyser=null;
  releaseScreen();
  say("Color follows the video.");
},isOn:function(){return !!analyser}};
})();
