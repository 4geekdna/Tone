(function(){
'use strict';
/* Chakra Journey v0.35 — audio-reactive Govee lighting.
   Listens to the journey audio (video element + Web Audio tones) via an
   AnalyserNode, finds the two dominant chakra frequencies, blends their
   colors by relative amplitude, and paints selected lights with a smooth
   crossfade. Falls back to timestamp-driven goveeFollow when audio is
   unavailable or the mode toggle is off. */
const LS="cj_audio_lights_v1";
const FREQS=[396,417,528,639,741,852,963];
const ATTACK=.10, RELEASE=1.0;   /* envelope: fast up, slow down */
const SMOOTH=.35;                /* crossfade between dominant colors */
const MIN_AMP=.012;              /* ignore noise floor */
let on=false, ctx=null, src=null, analyser=null, data=null, raf=null;
let smooth=new Float32Array(7), lastBlend=null, lastT=0;

function $(id){return document.getElementById(id)}
function hexToRgb(h){h=String(h||"#fff").replace("#","").padStart(6,"0");return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function rgbToHex(r,g,b){return"#"+[r,g,b].map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,"0")).join("")}
function blend(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}

function load(){try{return JSON.parse(localStorage.getItem(LS)||"{}")}catch(e){return{}}
function save(x){localStorage.setItem(LS,JSON.stringify(x))}

function ensureAnalyser(){
  if(analyser)return true;
  let ac=window.__cjAudioCtx||(window.AudioContext?new AudioContext():null);
  if(!ac)return false;
  ctx=ac;
  try{
    if(window.__cjRecBus){src=ctx.createMediaStreamSource(__cjRecBus.stream)}
    else if($("player")&&$("player").src){src=ctx.createMediaElementSource($("player"))}
    else return false;
    analyser=ctx.createAnalyser();
    analyser.fftSize=2048;
    analyser.smoothingTimeConstant=.6;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    data=new Uint8Array(analyser.frequencyBinCount);
    return true;
  }catch(e){return false}
}

function binRange(hz){
  let sr=ctx.sampleRate, bin=hz*analyser.fftSize/sr;
  let half=Math.max(1,Math.round(sr/analyser.fftSize*2)); /* ~2 Hz wide */
  let lo=Math.max(0,Math.floor(bin-half)), hi=Math.min(data.length-1,Math.ceil(bin+half));
  return[lo,hi]
}
function ampAt(hz){
  let[lo,hi]=binRange(hz), sum=0, n=0;
  for(let i=lo;i<=hi;i++){sum+=data[i];n++}
  return n?sum/n/255:0
}

function tick(ts){
  if(!on||!analyser){raf=null;return}
  let dt=lastT?Math.min(.05,(ts-lastT)/1000):.016; lastT=ts;
  analyser.getByteFrequencyData(data);
  let raw=new Float32Array(7);
  for(let i=0;i<7;i++)raw[i]=ampAt(FREQS[i]);
  /* attack/release envelope */
  for(let i=0;i<7;i++){
    let a=raw[i], s=smooth[i];
    if(a>s)smooth[i]=s+(a-s)*Math.min(1,dt/ATTACK);
    else smooth[i]=s+(a-s)*Math.min(1,dt/RELEASE);
  }
  /* top two above noise floor */
  let idx=[0,1,2,3,4,5,6].sort((a,b)=>smooth[b]-smooth[a]);
  let i1=idx[0], i2=idx[1];
  let e1=smooth[i1], e2=smooth[i2];
  let color=null, bright=0;
  if(e1>MIN_AMP){
    let w=e1/(e1+Math.max(e2,.0001));
    let c1=hexToRgb((window.C[i1]&&window.C[i1][4])||"#fff");
    let c2=hexToRgb((window.C[i2]&&window.C[i2][4])||"#fff");
    let t=lastBlend?Math.min(1,dt/SMOOTH):1;
    let b=lastBlend?blend(lastBlend,blend(c1,c2,1-w),t):blend(c1,c2,1-w);
    lastBlend=b; color=rgbToHex(b[0],b[1],b[2]);
    bright=Math.round(Math.min(100,10+90*Math.min(1,e1*3)));
  }
  if(color&&window.goveePaintBlend)window.goveePaintBlend(color,bright);
  else if(!color&&window.goveePaintBlend)window.goveePaintBlend(null,0);
  raf=requestAnimationFrame(tick)
}

function start(){
  if(on)return;
  let ok=ensureAnalyser();
  if(!ok){line("Audio analyser unavailable — using timestamp lighting");return}
  on=true; lastT=0; smooth.fill(0); lastBlend=null;
  if(ctx&&ctx.state==="suspended")ctx.resume().catch(()=>{});
  raf=requestAnimationFrame(tick);
  line("Audio-reactive lighting on");
}
function stop(){
  on=false; if(raf){cancelAnimationFrame(raf);raf=null}
  if(window.goveePaintBlend)window.goveePaintBlend(null,0);
}
function line(m){if($("status"))$("status").textContent=m}

/* UI: toggle inside the Govee panel */
function ensureUI(){
  if($("audioLightsRow"))return;
  let gp=$("goveeList")&&$("goveeList").closest(".panel");
  if(!gp)return;
  let row=document.createElement("div"); row.className="row check"; row.id="audioLightsRow";
  row.innerHTML='<label>Audio-reactive lights</label><input id="audioLights" type="checkbox">';
  let note=document.createElement("p"); note.className="voice-note"; note.id="audioLightsNote";
  note.textContent="Listens to the journey audio and blends the two loudest chakra colors across your lights. Falls back to timestamp sync when off or when audio can't be tapped.";
  gp.appendChild(row); gp.appendChild(note);
  let cb=$("audioLights"), st=load();
  cb.checked=!!st.on;
  cb.onclick=()=>{let x=load();x.on=cb.checked;save(x);cb.checked?start():stop();line(cb.checked?"Audio-reactive lighting on":"Timestamp lighting restored")}
  if(cb.checked)setTimeout(start,800);
}
function boot(){ensureUI(); if(load().on)setTimeout(start,1000)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
window.CJAudioLights={start:start,stop:stop,isOn:()=>on}
})();