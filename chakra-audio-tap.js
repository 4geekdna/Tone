(function(){
'use strict';
function wrap(name){
  let Orig=window[name];
  if(!Orig||Orig.__cjWrapped)return;
  function W(opt){
    let ctx=new Orig(opt);
    window.__cjAudioCtx=ctx;
    if(window.__cjRecWanted){
      try{window.__cjRecBus=ctx.createMediaStreamDestination()}catch(e){}
    }
    try{window.dispatchEvent(new Event('cj-audio-ready'))}catch(e){}
    return ctx;
  }
  W.prototype=Orig.prototype;
  W.__cjWrapped=true;
  try{Object.setPrototypeOf(W,Orig)}catch(e){}
  window[name]=W;
}
wrap('AudioContext');
wrap('webkitAudioContext');
let orig=AudioNode.prototype.connect;
AudioNode.prototype.connect=function(dest){
  let out=orig.apply(this,arguments);
  try{
    let bus=window.__cjRecBus;
    if(bus&&dest&&dest===this.context.destination&&dest!==bus)orig.call(this,bus);
  }catch(e){}
  return out;
};
})();
