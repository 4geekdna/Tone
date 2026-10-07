(function(){
'use strict';
/* govee-audio-blend.js — v0.37
   Two-channel paint: first half of selected lights get the loudest bowl,
   second half get the next. Throttled so Govee is not spammed. */
const API="https://openapi.api.govee.com/router/api/v1";
const LS_KEY="govee-api-key", LS_PICKED="cj_govee_picked", LS_DEVICES="cj_govee_devices";
let busy=false, queued=null, powered={}, lastSent="";
const $=id=>document.getElementById(id);
const idOf=d=>d.device||d.sku||d.model;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hexInt=h=>parseInt(String(h||"#fff").replace("#",""),16);
function key(){return ((($("goveeKey")||{}).value)||localStorage.getItem(LS_KEY)||"").trim()}
function uuid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random()}
function devices(){try{return JSON.parse(localStorage.getItem(LS_DEVICES)||"[]")}catch(e){return[]}}
function picked(){try{return JSON.parse(localStorage.getItem(LS_PICKED)||"{}")}catch(e){return{}}}
function separateOn(){try{let x=JSON.parse(localStorage.getItem("cj_color_separate_v1")||"null");return !!(x&&x.on)}catch(e){return false}}
function targets(){if(window.goveeLightTargets)return window.goveeLightTargets();let p=picked();return devices().filter(d=>p[idOf(d)])}
async function api(path,o){
  let k=key();
  if(!k)throw Error("Enter your Govee API key first");
  let r=await fetch(API+path,{method:o&&o.method||"GET",headers:{"Content-Type":"application/json","Govee-API-Key":k},body:o&&o.body});
  let t=await r.text(), b={};
  try{b=JSON.parse(t)}catch(e){}
  if(!r.ok||(b.code&&b.code!==200))throw Error(b.message||b.msg||("Govee HTTP "+r.status));
  return b;
}
async function sendControl(d,c){
  return api("/device/control",{method:"POST",body:JSON.stringify({requestId:uuid(),payload:{sku:d.sku,device:d.device,capability:c}})});
}
async function paintOne(d,hex,br){
  let id=idOf(d);
  if(!powered[id]){
    await sendControl(d,{type:"devices.capabilities.on_off",instance:"powerSwitch",value:1});
    powered[id]=true;
    await sleep(120);
  }
  await sendControl(d,{type:"devices.capabilities.range",instance:"brightness",value:Math.max(1,Math.min(100,br|0))}).catch(()=>{});
  if(hex)await sendControl(d,{type:"devices.capabilities.color_setting",instance:"colorRgb",value:hexInt(hex)});
}
async function paintBlend(aHex,aBright,bHex,bBright){
  queued={aHex:aHex,aBright:aBright,bHex:bHex||aHex,bBright:bBright==null?aBright:bBright};
  if(busy)return;
  busy=true;
  try{
    while(queued){
      let job=queued; queued=null;
      let list=targets();
      if(!list.length)break;
      let sig=list.map(idOf).join(",")+"|"+job.aHex+"|"+job.aBright+"|"+job.bHex+"|"+job.bBright;
      if(sig===lastSent)break;
      let mid=Math.ceil(list.length/2);
      for(let i=0;i<list.length;i++){
        let hex=separateOn()?(i===0?job.aHex:job.bHex):(i<mid?job.aHex:job.bHex);
        let br=i<mid?job.aBright:job.bBright;
        try{await paintOne(list[i],hex,br)}catch(e){}
        await sleep(140);
      }
      lastSent=sig;
    }
  }finally{busy=false}
}
window.goveePaintBlend=paintBlend;
})();
