(function(){
'use strict';
/* govee-audio-blend.js — v0.37
   Two-channel paint: first half of selected lights get the loudest bowl,
   second half get the next. Throttled so Govee is not spammed. */
const API="cj-govee";
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
function followOn(){let el=$("goveeOn");return !el||!!el.checked}
function isPaintable(d){return window.goveeIsLight?window.goveeIsLight(d):true}
function targets(){if(window.goveeLightTargets)return window.goveeLightTargets();let p=picked();return devices().filter(d=>p[idOf(d)]&&isPaintable(d))}
async function api(path,o){if(window.CJGovee)return window.CJGovee.request(path,o);throw Error("Govee client missing")}
async function sendControl(d,c){
  if(window.CJGovee)return window.CJGovee.control(d,c,{lane:c&&c.instance==="powerSwitch"&&c.value===0?"off":"color",slotKey:c&&c.instance});
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
  if(!followOn())return;
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
        let hex=i<mid?job.aHex:job.bHex;
        let br=i<mid?job.aBright:job.bBright;
        try{await paintOne(list[i],hex,br)}catch(e){}
        await sleep(140);
      }
      lastSent=sig;
    }
  }finally{busy=false}
}
function readSeparate(){try{let x=JSON.parse(localStorage.getItem("cj_color_separate_v1")||"null");if(!x||typeof x!=="object")return {v:1,on:false,extra:"primary"};return {v:1,on:!!x.on,extra:x.extra==="hold"?"hold":"primary"}}catch(e){return {v:1,on:false,extra:"primary"}}}
function assignSlots(lights,tones,extra){
  extra=extra==="hold"?"hold":"primary";
  return lights.map(function(light,i){
    let tone=tones[i]||null;
    if(!tone)return {id:light.id||light.device,hex:extra==="hold"?null:(tones[0]&&tones[0].hex)||null,slot:i<tones.length?i:0};
    return {id:light.id||light.device,hex:tone.hex,slot:i};
  });
}
window.goveeAssignSlots=assignSlots;
window.goveeReadSeparate=readSeparate;
window.goveePaintSlots=function(plan){if(!followOn()||!plan)return;let hex=plan.hex||(plan[0]&&plan[0].hex);return paintBlend(hex,74,hex,58)};
})();
