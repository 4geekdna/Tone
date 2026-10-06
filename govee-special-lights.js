(function(){
'use strict';
const KEY='cj_govee_special_v1';
const PATTERN=['M','M','A','M','M','S'];
function owns(device){let id=device&&(device.device||device.id);let bag={};try{bag=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}let row=bag.devices&&bag.devices[id];return !!(row&&row.enabled)}
function groups(n,kind){
  let main=[],accent=[],sparkle=[];
  if(kind==='buddha'){
    for(let i=0;i<n;i++){if(i>=13)accent.push(i);else if(i>=9){if(i%4===0)sparkle.push(i);else accent.push(i)}else main.push(i)}
  }else{
    for(let i=0;i<n;i++){let p=PATTERN[i%6];(p==='M'?main:p==='A'?accent:sparkle).push(i)}
  }
  return {main:main,accent:accent,sparkle:sparkle};
}
function plan(device,colors){
  let n=device.n||(device.sku==='H607C'?16:15);
  let kind=device.sku==='H607C'?'buddha':'strip';
  let g=groups(n,kind);
  let calls=[{instance:'segmentedColorRgb',group:'main',segment:g.main,hex:colors.main},{instance:'segmentedColorRgb',group:'accent',segment:g.accent,hex:colors.accent},{instance:'segmentedColorRgb',group:'sparkle',segment:g.sparkle,hex:colors.sparkle}];
  if(colors.level)calls.push({instance:'brightness',value:colors.level});
  return calls;
}
window.CJSpecial={owns:owns,groups:groups,plan:plan,apply:function(){}};
})();
