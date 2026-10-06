(function(){
'use strict';
/* v0.50 Play last recording. chakra-session-record.js fires "cj-recording-ready" when a journey recording
   finishes. This file keeps the newest 3 in a new IndexedDB database (cj_recordings_v1, store "recordings")
   and shows a Play last recording card on the main screen. No API key, no network, no microphone. */
const DB="cj_recordings_v1",STORE="recordings",KEEP=3;
const $=id=>document.getElementById(id);
let shown=null,url="",player=null,card=null;

function openDB(){return new Promise((ok,no)=>{try{if(!window.indexedDB)return no(new Error("no indexedDB"));let q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{let db=q.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"})};q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)}catch(e){no(e)}})}
async function saveRec(rec){
  let db=await openDB();
  await new Promise((ok,no)=>{let tx=db.transaction(STORE,"readwrite"),st=tx.objectStore(STORE);st.put(rec);
    let keys=[],c=st.openCursor();c.onsuccess=()=>{let r=c.result;if(r){keys.push(r.key);r.continue()}else{keys.sort((a,b)=>a-b);keys.slice(0,Math.max(0,keys.length-KEEP)).forEach(k=>st.delete(k))}};
    tx.oncomplete=ok;tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error)});
}
async function lastRec(){
  let db=await openDB();
  return await new Promise(ok=>{try{let c=db.transaction(STORE).objectStore(STORE).openCursor(null,"prev");c.onsuccess=()=>ok(c.result?c.result.value:null);c.onerror=()=>ok(null)}catch(e){ok(null)}});
}
function baseType(t){return String(t||"").split(";")[0].trim()}
function extOf(t){return /mp4|m4a|aac/.test(t)?"m4a":/ogg/.test(t)?"ogg":"webm"}
function playable(t){
  let a=document.createElement("audio");if(!a.canPlayType)return true;
  return !!(a.canPlayType(t)||a.canPlayType(baseType(t))||(baseType(t)==="audio/mp4"&&a.canPlayType("audio/x-m4a")));
}
function clock(s){s=Math.max(0,Math.floor(s||0));let h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+":"+String(m).padStart(2,"0"):m)+":"+String(x).padStart(2,"0")}
function when(ms){try{return new Date(ms).toLocaleString([], {weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}catch(e){return new Date(ms).toString()}}
function probeDuration(blob,fallback){return new Promise(ok=>{let a,u="",t=0,done=v=>{if(t)clearTimeout(t);t=0;if(u){try{URL.revokeObjectURL(u)}catch(e){}u=""}ok(v)};
  try{a=document.createElement("audio");u=URL.createObjectURL(blob);t=setTimeout(()=>done(fallback),3000);a.preload="metadata";a.onloadedmetadata=()=>done(Number.isFinite(a.duration)&&a.duration>0?a.duration:fallback);a.onerror=()=>done(fallback);a.src=u}catch(e){done(fallback)}})}

function el(tag,props,kids){let n=document.createElement(tag);Object.assign(n,props||{});(kids||[]).forEach(k=>n.appendChild(k));return n}
function build(){
  if(card)return card;
  let sub=document.querySelector(".w .sub");if(!sub)return null;
  card=el("div",{className:"panel last-rec",id:"lastRec",hidden:true},[
    el("div",{className:"groupHead"},[el("b",{textContent:"Last recording"}),el("span",{className:"muted",id:"lastRecMeta"})]),
    el("div",{className:"voice-tools"},[el("button",{className:"btn play",id:"lastRecPlay",type:"button",textContent:"\u25B6 Play last recording"}),el("button",{className:"btn",id:"lastRecShare",type:"button",textContent:"Save / share"})]),
    el("div",{className:"bar",id:"lastRecBar"},[el("i",{id:"lastRecFill"})]),
    el("div",{className:"voice-note",id:"lastRecTime"})
  ]);
  sub.insertAdjacentElement("afterend",card);
  $("lastRecPlay").onclick=toggle;
  $("lastRecShare").onclick=share;
  $("lastRecBar").onclick=e=>{if(!player||!shown)return;let r=e.currentTarget.getBoundingClientRect(),d=total();if(d>0)try{player.currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*d}catch(x){}};
  return card;
}
function total(){let d=player&&Number.isFinite(player.duration)&&player.duration>0?player.duration:0;return d||(shown&&shown.duration)||0}
function paint(){
  if(!shown)return;
  let t=player?player.currentTime||0:0,d=total(),on=!!(player&&!player.paused&&!player.ended);
  $("lastRecPlay").textContent=on?"\u275A\u275A Pause":"\u25B6 Play last recording";
  $("lastRecFill").style.width=(d>0?Math.min(100,t/d*100):0)+"%";
  $("lastRecTime").textContent=(t>0||on?clock(t)+" / ":"")+clock(d)+(shown.canPlay?"":" \u2022 This browser can't play this format. Use Save / share.");
}
function release(){if(player){try{player.pause()}catch(e){}player.removeAttribute("src");try{player.load()}catch(e){}}if(url){try{URL.revokeObjectURL(url)}catch(e){}url=""}}
function show(rec){
  if(!rec||!rec.data||!build())return;
  release();
  shown=rec;shown.canPlay=playable(rec.type);
  $("lastRecMeta").textContent=when(rec.endedAt||rec.id)+" \u2022 "+clock(rec.duration);
  $("lastRecPlay").disabled=!shown.canPlay;
  card.hidden=false;
  paint();
}
function blobOf(rec){return rec.data instanceof Blob?rec.data:new Blob([rec.data],{type:rec.type})}
function toggle(){
  if(!shown||!shown.canPlay)return;
  if(!player){player=el("audio",{preload:"auto",id:"lastRecAudio"});player.setAttribute("playsinline","");player.setAttribute("webkit-playsinline","");["timeupdate","play","pause","ended","loadedmetadata"].forEach(ev=>player.addEventListener(ev,paint));card.appendChild(player)}
  if(!url){url=URL.createObjectURL(blobOf(shown));player.src=url}
  if(player.paused||player.ended){if(player.ended)try{player.currentTime=0}catch(e){}let p=player.play();if(p&&p.catch)p.catch(()=>{$("lastRecTime").textContent="Tap again to play"})}
  else player.pause();
}
function share(){
  if(!shown)return;
  let f;try{f=new File([blobOf(shown)],shown.name||("chakra-journey-session."+extOf(shown.type)),{type:shown.type})}catch(e){f=blobOf(shown);f.name=shown.name}
  let dl=()=>{let a=el("a",{href:URL.createObjectURL(f),download:shown.name||"chakra-journey-session."+extOf(shown.type)});document.body.appendChild(a);a.click();a.remove();setTimeout(()=>{try{URL.revokeObjectURL(a.href)}catch(e){}},60000)};
  try{if(navigator.share&&navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:"Chakra Journey recording"}).catch(e=>{if(!e||e.name!=="AbortError")dl()});return}}catch(e){}
  dl();
}
async function onReady(ev){
  let d=ev&&ev.detail;if(!d||!d.file||!d.file.size)return;
  try{
    let endedAt=d.endedAt||Date.now(),startedAt=d.startedAt||endedAt,type=d.file.type||d.type||"audio/mp4";
    let duration=await probeDuration(d.file,Math.max(0,(endedAt-startedAt)/1000));
    let data=await new Response(d.file).arrayBuffer();
    let rec={id:endedAt,startedAt:startedAt,endedAt:endedAt,duration:duration,type:type,name:d.file.name||"chakra-journey-session."+extOf(type),size:data.byteLength,data:data};
    show(rec);
    try{await saveRec(rec)}catch(e){}
  }catch(e){}
}
function install(){
  window.addEventListener("cj-recording-ready",onReady);
  let play=$("play");if(play)play.addEventListener("click",()=>{if(player)try{player.pause()}catch(e){}},true);
  lastRec().then(r=>{if(r&&!shown)show(r)}).catch(()=>{});
}
window.CJLastRecording={latest:()=>lastRec().catch(()=>null),db:DB};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
