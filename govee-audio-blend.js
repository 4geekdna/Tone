(function(){
'use strict';
/* govee-audio-blend.js — v0.35
   Provides window.goveePaintBlend(hex, bright) used by chakra-audio-lights.js.
   Self-contained: reads selected devices from the same localStorage keys as
   govee-chakra-runtime.js and sends the same Govee API commands. */
const API="https://openapi.api.govee.com/router/api/v1";
const LS_KEY="govee-api-key", LS_PICKED="cj_govee_picked", LS_DEVICES="cj_govee_devices";
let busy=false, target=null, bright=70, powered={}
const $=id=>document.getElementById(id)
const idOf=d=>d.device||d.sku||d.model
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const hexInt=h=>parseInt(String(h||"#fff").replace("#",""),16)
function key(){return ((($("goveeKey")||{}).value)||localStorage.getItem(LS_KEY)||"").trim()}
function uuid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random()}
function devices(){try{return JSON.parse(localStorage.getItem(LS_DEVICES)||"[]")}catch(e){return[]}}
function picked(){try{return JSON.parse(localStorage.getItem(LS_PICKED)||"{}')}catch(e){return{}}
function targets(){let p=picked();return devices().filter(d=>p[idOf(d)])}
async function api(path,o){let k=key();if(!k)throw Error("Enter your Govee API key first");let r=await fetch(API+path,{method:o?.method||"GET",headers:{"Content-Type":"application/json","Govee-API-Key":k},body:o?.body}),t=await r.text(),b={};try{b=JSON.parse(t)}catch(e){}if(!r.ok||b.code&&b.code!==200)throw Error(b.message||b.msg||("Govee HTTP "+r.status));return b}
async function sendControl(d,c){return api("/device/control",{method:"POST",body:JSON.stringify({requestId:uuid(),payload:{sku:d.sku,device:d.device,capability:c}})})}
async function paintBlend(hex,br){
  target=hex; bright=br==null?bright:br;
  if(busy)return;
  busy=true;
  let list=targets();
  if(!list.length){busy=false;return}
  try{
    for(let d of list){
      let id=idOf(d);
      try{
        if(!powered[id]){await sendControl(d,{type:"devices.capabilities.on_off",instance:"powerSwitch",value:1});powered[id]=true;await sleep(150)}
        await sendControl(d,{type:"devices.capabilities.range",instance:"brightness",value:Math.max(1,Math.min(100,bright))}).catch(()=>{});
        if(target)await sendControl(d,{type:"devices.capabilities.color_setting",instance:"colorRgb",value:hexInt(target)});
      }catch(e){}await sleep(120);
    }
  }finally{busy=false;if(target!==hex)paintBlend(target,bright)}
}
window.goveePaintBlend=paintBlend;
})();