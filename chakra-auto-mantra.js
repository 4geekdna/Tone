(function(){
'use strict';
/* Chakra Journey v0.44 — Auto mantra mode.
   Listens to the playing video's own sound (the analyser frames from
   chakra-audio-lights.js; no microphone) and runs CJDominant's tracker.
   When the primary chakra changes, the card moves; one affirmation plays
   for the new primary, then a cooldown. Brief or weak secondary peaks
   stay in the wings. Settings live in cj_auto_mantra_v1. */
const LS="cj_auto_mantra_v1", STEP_MS=100;
const D=window.CJDominant;
const $=id=>document.getElementById(id);
let tracker=null, lastRun=0, wasRun=false, last=null;
function defaults(){let d=D?D.DEFAULTS:{holdMs:3500,marginDb:3,cooldownMs:20000};return {hold:d.holdMs/1000,margin:d.marginDb,cooldown:d.cooldownMs/1000}}
function cfg(){let x=defaults();try{let s=JSON.parse(localStorage.getItem(LS)||"{}");["hold","margin","cooldown"].forEach(k=>{let v=+s[k];if(Number.isFinite(v))x[k]=v})}catch(e){}return x}
function saveCfg(x){try{localStorage.setItem(LS,JSON.stringify(x))}catch(e){}}
function trackerOpts(x){return {holdMs:x.hold*1000,marginDb:x.margin,cooldownMs:x.cooldown*1000}}
function ensureTracker(){if(!tracker&&D)tracker=D.createTracker(trackerOpts(cfg()));return tracker}
function state(){try{return window.CJJourneyState?window.CJJourneyState():null}catch(e){return null}}
function isAuto(){let m=$("mode");return !!m&&m.value==="auto"}
function name(i){return i>=0&&window.C&&window.C[i]?window.C[i][0]:"—"}
function readout(t){let el=$("autoReadout");if(el)el.textContent=t}
function describe(r){
  let x=cfg();
  if(!r)return "Auto listens to the video.";
  let p=r.primary>=0?name(r.primary):"Listening";
  if(r.candidate>=0)return p+" · "+name(r.candidate)+" rising "+(r.candidateMs/1000).toFixed(1)+" / "+x.hold+" s";
  if(r.leader>=0&&r.leader!==r.primary)return p+" · "+name(r.leader)+" in the wings";
  return r.primary>=0?p+" leads":"Listening";
}
function onFrame(db,sampleRate,fftSize,ts){
  if(!D||!isAuto())return;
  let now=performance.now();
  if(now-lastRun<STEP_MS)return;
  lastRun=now;
  let st=state(),running=!!(st&&st.run);
  if(running&&!wasRun)reset();
  wasRun=running;
  if(!running||st.paused)return;
  let tr=ensureTracker();
  let r=tr.update(D.bandLevels(db,sampleRate,fftSize),now);
  last=r;
  if(r.change&&typeof window.CJAutoShow==="function")window.CJAutoShow(r.change.chakra);
  if(r.announce&&typeof window.CJAutoAnnounce==="function")window.CJAutoAnnounce(r.announce.chakra);
  readout(describe(r));
}
function reset(){if(tracker)tracker.reset();else ensureTracker();last=null;readout("Listening")}
function begin(){reset();wasRun=true;if(window.CJAudioLights&&typeof window.CJAudioLights.start==="function"){try{window.CJAudioLights.start()}catch(e){}}}
function row(id,label,min,max,step,unit){return '<div class="row auto-row"><label>'+label+'</label><input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'"><span class="v" id="'+id+'v"></span></div>'}
function paintValues(){let x=cfg();[["autoHold",x.hold," s"],["autoMargin",x.margin," dB"],["autoCooldown",x.cooldown," s"]].forEach(a=>{let el=$(a[0]),v=$(a[0]+"v");if(el)el.value=a[1];if(v)v.textContent=(+a[1]).toFixed(a[0]==="autoHold"?1:0)+a[2]})}
function toggle(){
  let on=isAuto(),box=$("autoBox");
  if(box)box.style.display=on?"block":"none";
  ["count","gap"].forEach(id=>{let r=$(id)&&$(id).closest(".row");if(r)r.style.display=on?"none":""});
  let ro=$("autoReadout");if(ro)ro.style.display=on?"block":"none";
}
function install(){
  let mode=$("mode");
  if(!mode||$("autoBox"))return;
  if(!mode.querySelector('option[value="auto"]')){let o=document.createElement("option");o.value="auto";o.textContent="Auto (follows the sound)";mode.appendChild(o)}
  let st=document.createElement("style");
  st.textContent="#autoBox{display:none;margin:4px 0 6px}#autoBox .voice-note{margin:2px 0 6px}#autoReadout{display:none;font-size:13px;margin-top:6px;font-variant-numeric:tabular-nums}";
  document.head.appendChild(st);
  let box=document.createElement("div");
  box.id="autoBox";
  box.innerHTML='<div class="voice-note">Auto listens to the video, not the microphone. When a new chakra leads the sound long enough, its affirmation plays once. Short peaks stay in the wings.</div>'+row("autoHold","Hold",1,10,.5)+row("autoMargin","Lead by",1,12,1)+row("autoCooldown","Cooldown",0,120,5);
  let anchor=mode.closest(".row");
  anchor.insertAdjacentElement("afterend",box);
  let ro=document.createElement("div");
  ro.id="autoReadout";ro.className="muted";ro.textContent="Auto listens to the video.";
  let host=$("freqReadout")||$("meta");
  if(host)host.insertAdjacentElement("afterend",ro);
  paintValues();
  [["autoHold","hold"],["autoMargin","margin"],["autoCooldown","cooldown"]].forEach(a=>{
    let el=$(a[0]);
    el.addEventListener("input",()=>{let x=cfg();x[a[1]]=+el.value;saveCfg(x);paintValues();if(tracker)tracker.setOptions(trackerOpts(x))});
  });
  mode.addEventListener("change",toggle);
  toggle();
  window.__cjSpectrumHook=onFrame;
}
window.CJAutoMantra={begin:begin,reset:reset,config:cfg,last:()=>last,tracker:()=>tracker,onFrame:onFrame};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
