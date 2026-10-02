(function(){
'use strict';
/* Chakra Journey v0.38 — audio-reactive lights, off until a gesture.
   Never creates an AudioContext and never taps the video until the
   shared core context is already running inside a click. */
const LS="cj_audio_lights_v1";
const REL="038";
const BANDS=[
  {hz:396,lo:360,hi:430,name:"Root"},
  {hz:417,lo:430,hi:470,name:"Sacral"},
  {hz:528,lo:490,hi:580,name:"Solar"},
  {hz:639,lo:590,hi:690,name:"Heart"},
  {hz:741,lo:700,hi:800,name:"Throat"},
  {hz:852,lo:810,hi:910,name:"Third Eye"},
  {hz:963,lo:910,hi:1040,name:"Crown"}
];
const ATTACK=.12, RELEASE=.85, SMOOTH=.4, MIN_AMP=.018, PAINT_MS=700;
let on=false, src=null, analyser=null, data=null, raf=null;
let smooth=new Float32Array(7), lastBlend=null, lastT=0, lastPaint=0, held=false;

function $(id){return document.getElementById(id)}
function hexToRgb(h){h=String(h||"#fff").replace("#","").padStart(6,"0");return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function rgbToHex(r,g,b){return"#"+[r,g,b].map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,"0")).join("")}
function mix(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
function load(){try{return JSON.parse(localStorage.getItem(LS)||"{}")}catch(e){return{}}}
function save(x){try{localStorage.setItem(LS,JSON.stringify(x))}catch(e){}}
function line(m){let el=$("audioLightsNote");if(el)el.textContent=m}
function shared(){return window.__cjAudioCtx||null}

function holdFollow(){
  if(held||!window.goveeFollow)return;
  let orig=window.goveeFollow;
  window.goveeFollow=function(i){
    if(on)return;
    return orig(i);
  };
  held=true;
}

function ensureAnalyser(){
  if(analyser)return true;
  let v=$("player"), ctx=shared();
  if(!v||!ctx)return false;
  try{ctx.resume()}catch(e){}
  if(ctx.state!=="running")return false;
  try{
    if(!src){
      src=ctx.createMediaElementSource(v);
      src.connect(ctx.destination);
    }
    analyser=ctx.createAnalyser();
    analyser.fftSize=4096;
    analyser.smoothingTimeConstant=.72;
    src.connect(analyser);
    data=new Uint8Array(analyser.frequencyBinCount);
    return true;
  }catch(e){return false}
}

function bandAmp(lo,hi){
  let ctx=shared();
  if(!ctx||!analyser)return 0;
  let sr=ctx.sampleRate, n=analyser.fftSize;
  let a=Math.max(0,Math.floor(lo*n/sr)), b=Math.min(data.length-1,Math.ceil(hi*n/sr));
  let peak=0;
  for(let i=a;i<=b;i++)if(data[i]>peak)peak=data[i];
  return peak/255;
}

function tick(ts){
  if(!on||!analyser){raf=null;return}
  let dt=lastT?Math.min(.05,(ts-lastT)/1000):.016; lastT=ts;
  analyser.getByteFrequencyData(data);
  let raw=new Float32Array(7);
  for(let i=0;i<7;i++)raw[i]=bandAmp(BANDS[i].lo,BANDS[i].hi);
  for(let i=1;i<7;i++){
    if(raw[i-1]>raw[i]*1.15 && BANDS[i].hz>BANDS[i-1].hz*1.7)raw[i]*=.45;
  }
  for(let i=0;i<7;i++){
    let a=raw[i], s=smooth[i];
    smooth[i]=a>s?s+(a-s)*Math.min(1,dt/ATTACK):s+(a-s)*Math.min(1,dt/RELEASE);
  }
  let idx=[0,1,2,3,4,5,6].sort((a,b)=>smooth[b]-smooth[a]);
  let i1=idx[0], i2=idx[1];
  let e1=smooth[i1], e2=smooth[i2];
  if(e1>MIN_AMP && ts-lastPaint>PAINT_MS && window.goveePaintBlend){
    let c1=hexToRgb((window.C&&window.C[i1]&&window.C[i1][4])||"#ffffff");
    let c2=hexToRgb((window.C&&window.C[i2]&&window.C[i2][4])||c1);
    let use2=e2>MIN_AMP && e2>e1*.28;
    let t=lastBlend?Math.min(1,dt/SMOOTH):1;
    let b1=lastBlend?mix(lastBlend[0],c1,t):c1;
    let b2=lastBlend?mix(lastBlend[1],use2?c2:c1,t):(use2?c2:c1);
    lastBlend=[b1,b2];
    let br1=Math.round(Math.min(100,18+82*Math.min(1,e1*3.2)));
    let br2=use2?Math.round(Math.min(100,12+80*Math.min(1,e2*3.2))):Math.round(br1*.7);
    window.goveePaintBlend(rgbToHex(b1[0],b1[1],b1[2]),br1,rgbToHex(b2[0],b2[1],b2[2]),br2);
    lastPaint=ts;
    line("Hearing "+BANDS[i1].name+(use2?" + "+BANDS[i2].name:"")+" · two light channels");
  }
  raf=requestAnimationFrame(tick);
}

function start(){
  if(on&&analyser)return;
  if(!ensureAnalyser()){
    on=false;
    line("Shared audio is not running. Timestamp colors on. Video playback is untouched.");
    return;
  }
  holdFollow();
  on=true; lastT=0; lastPaint=0; smooth.fill(0); lastBlend=null;
  raf=requestAnimationFrame(tick);
  line("Listening to the bowls. Lights follow the two loudest colors.");
}
function stop(){
  on=false;
  if(raf){cancelAnimationFrame(raf);raf=null}
  line("Audio-reactive lights off. Timestamp colors on. Video playback is untouched.");
}

function ensureUI(){
  if($("audioLightsRow"))return;
  let gp=$("goveeList")&&$("goveeList").closest(".panel");
  if(!gp)return;
  let row=document.createElement("div");
  row.className="row check";
  row.id="audioLightsRow";
  row.innerHTML='<label>Audio-reactive lights</label><input id="audioLights" type="checkbox">';
  let note=document.createElement("p");
  note.className="voice-note";
  note.id="audioLightsNote";
  note.textContent="Off by default. Turn it on from a tap after the journey audio is running. If that audio is not running, the video stays on the element and timestamp colors stay on.";
  gp.appendChild(row);
  gp.appendChild(note);
  let cb=$("audioLights"), st=load();
  cb.checked=st.rel===REL && st.on===true;
  cb.onclick=()=>{
    save({on:cb.checked,rel:REL});
    if(cb.checked)start(); else stop();
  };
}
function boot(){
  ensureUI();
  let play=$("play");
  if(play)play.addEventListener("click",()=>{
    let cb=$("audioLights");
    if(cb&&cb.checked)start();
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.CJAudioLights={start:start,stop:stop,isOn:()=>on};
})();
