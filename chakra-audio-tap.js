(function(){
'use strict';
function sharedRunning(ctx){
  return !!(ctx&&ctx===window.__cjAudioCtx&&ctx.state==="running");
}
function wrap(name){
  let Orig=window[name];
  if(!Orig||Orig.__cjWrapped)return;
  function W(opt){
    let ctx=new Orig(opt);
    if(!window.__cjAudioCtx)window.__cjAudioCtx=ctx;
    try{window.dispatchEvent(new Event("cj-audio-ready"))}catch(e){}
    return ctx;
  }
  W.prototype=Orig.prototype;
  W.__cjWrapped=true;
  try{Object.setPrototypeOf(W,Orig)}catch(e){}
  window[name]=W;
}
wrap("AudioContext");
wrap("webkitAudioContext");
if(!window.__cjRecTapped)window.__cjRecTapped=new WeakSet();
let orig=AudioNode.prototype.connect;
AudioNode.prototype.connect=function(dest){
  let out=orig.apply(this,arguments);
  try{
    let bus=window.__cjRecBus;
    let seen=window.__cjRecTapped;
    if(bus&&seen&&sharedRunning(this.context)&&dest&&dest===this.context.destination&&dest!==bus&&!seen.has(this)){
      orig.call(this,bus);
      seen.add(this);
    }
  }catch(e){}
  return out;
};
})();
