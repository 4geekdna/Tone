(function(){
'use strict';
/* v0.59 session strip. Parks last recording in the strip and closes the four drawers when immersive turns on. */
function $(id){return document.getElementById(id)}
function park(){
  var card=$('lastRec'), slot=$('lastRecSlot');
  if(card&&slot&&card.parentNode!==slot)slot.appendChild(card);
}
function closeDrawers(){
  var nodes=document.querySelectorAll('details.drawer');
  for(var i=0;i<nodes.length;i++)nodes[i].open=false;
}
function onImmersive(){
  if(document.body.classList.contains('immersive'))closeDrawers();
}
function install(){
  park();
  var imm=$('immersiveMode');
  if(imm)imm.addEventListener('change',function(){if(imm.checked)closeDrawers()});
  try{
    new MutationObserver(function(){park();onImmersive()}).observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
  }catch(e){}
  onImmersive();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
else install();
})();
