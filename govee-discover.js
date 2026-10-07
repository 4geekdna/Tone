(function(){
'use strict';
const KEY='cj_govee_class_v1';
function classify(d){
  let sku=String(d.sku||'').toUpperCase();
  let name=String(d.deviceName||d.name||'').toLowerCase();
  let caps=d.capabilities||[];
  let has=inst=>caps.some(c=>c.instance===inst);
  if(d.type&&d.type!=='devices.types.light')return {class:'ignore',category:'ignore'};
  if(/^(H1167|H1162|H1168)$/.test(sku))return {class:'ignore',category:'ignore'};
  if(/^H609[1-5D]/.test(sku)||/projector|nebula|galaxy/.test(name))return {class:has('colorRgb')?'projector':'scene-only',category:'projectors'};
  if(has('pillarLightToggle')&&has('baseLightToggle'))return {class:'zoned-segmented',category:'two-zone'};
  if(has('segmentedColorRgb')&&/halo|ring|strip|cob/.test(name))return {class:'segmented',category:'strips'};
  if(has('colorRgb'))return {class:'color',category:'color'};
  return {class:'power-only',category:'basic'};
}
function refresh(){
  let list=[];try{list=JSON.parse(localStorage.getItem('cj_govee_devices')||'[]')}catch(e){}
  let out={};list.forEach(d=>{out[d.device||d.sku]=classify(d)});
  try{localStorage.setItem(KEY,JSON.stringify(out))}catch(e){}
  return out;
}
window.CJDiscover={classify:classify,refresh:refresh};
window.addEventListener('govee-selection-changed',refresh);
})();
