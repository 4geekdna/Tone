(function(){
'use strict';
const CORRECTIONS={H7075:3,H7076:4,H6046:10,H6047:10,H607C:16};
function span(r){if(typeof r==='number')return r;if(!r||r.max==null||r.min==null)return 0;return Math.max(0,r.max-r.min+1)}
function classify(d){
  let sku=String(d.sku||'').toUpperCase();
  let name=String(d.deviceName||d.name||'').toLowerCase();
  let caps=d.capabilities||[];
  let has=inst=>caps.some(c=>c.instance===inst);
  if(d.type&&d.type!=='devices.types.light')return {class:'ignore',category:'ignore',reason:'not a light'};
  if(/^(H1167|H1162|H1168)$/.test(sku))return {class:'ignore',category:'ignore',reason:'box'};
  if(/^H609[1-5D]/.test(sku)||/projector|nebula|galaxy|star light/.test(name))return {class:has('colorRgb')?'projector':'scene-only',category:'projectors',reason:'projector'};
  if(has('pillarLightToggle')&&has('baseLightToggle'))return {class:'zoned-segmented',category:'two-zone',reason:'pillar + base toggles',n:16};
  if(has('segmentedColorRgb')&&/halo|ring|strip|cob/.test(name))return {class:'segmented',category:'strips',reason:'strip name',n:15};
  if(has('colorRgb'))return {class:'color',category:'color',reason:'colorRgb'};
  return {class:'power-only',category:'basic',reason:'power'};
}
window.CJDiscover={classify:classify,corrections:CORRECTIONS,span:span};
})();
