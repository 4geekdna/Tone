(function(){
'use strict';
const KEY='cj_govee_special_v1';
const $=id=>document.getElementById(id);
function bag(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}}
function idOf(d){return d&&(d.device||d.id||d)}
function owns(d){
  if(!d)return false;
  let id=idOf(d), row=bag().devices&&bag().devices[id];
  if(row&&row.enabled)return true;
  let sku=String(d.sku||'').toUpperCase();
  return sku==='H607C'||sku==='H61E6'||/^H609[345]$/.test(sku);
}
function groups(n,kind){
  let main=[],accent=[],sparkle=[];
  if(kind==='buddha'){for(let i=0;i<n;i++){if(i>=13)accent.push(i);else if(i>=9){(i%4===0?sparkle:accent).push(i)}else main.push(i)}}
  else {let p=['M','M','A','M','M','S'];for(let i=0;i<n;i++){(p[i%6]==='M'?main:p[i%6]==='A'?accent:sparkle).push(i)}}
  return {main:main,accent:accent,sparkle:sparkle};
}
function devices(){try{return JSON.parse(localStorage.getItem('cj_govee_devices')||'[]')}catch(e){return []}}
function picked(id){if(typeof window.goveeIsPicked==='function')return window.goveeIsPicked(id);try{return !!(JSON.parse(localStorage.getItem('cj_govee_picked')||'{}')[id])}catch(e){return false}}
async function send(d,c){let k=((($('goveeKey')||{}).value)||localStorage.getItem('govee-api-key')||'').trim();if(!k)return;let r=await fetch('https://openapi.api.govee.com/router/api/v1/device/control',{method:'POST',headers:{'Content-Type':'application/json','Govee-API-Key':k},body:JSON.stringify({requestId:String(Date.now()),payload:{sku:d.sku,device:d.device,capability:c}})});if(!r.ok)throw Error('HTTP '+r.status)}
async function apply(detail){
  let chakra=typeof detail==='number'?detail:(detail&&detail.chakra)||0;
  let hex=(detail&&detail.hex)||((window.C||[])[chakra]||[])[4]||'#ffffff';
  let list=devices().filter(d=>owns(d)&&picked(idOf(d)));
  for(let d of list){
    let sku=String(d.sku||'').toUpperCase();
    if(/^H609/.test(sku)){if(window.CJStarlight)await window.CJStarlight.apply(chakra).catch(()=>{});continue}
    let g=groups(sku==='H607C'?16:15,sku==='H607C'?'buddha':'strip');
    for(let [name,seg] of [['main',g.main],['accent',g.accent],['sparkle',g.sparkle]]){
      if(seg.length)await send(d,{type:'devices.capabilities.segment_color_setting',instance:'segmentedColorRgb',value:{segment:seg,rgb:parseInt(hex.slice(1),16)}}).catch(()=>{});
    }
  }
}
window.CJSpecial={owns:owns,groups:groups,apply:apply};
window.addEventListener('cj-color-commit',e=>apply(e.detail));
})();
