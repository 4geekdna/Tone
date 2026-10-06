(function(){
'use strict';
const $=id=>document.getElementById(id);
let rec=null,chunks=[],lastFile=null,saveBtn=null,mimeType="",recStart=0;

function mime(){
  if(!window.MediaRecorder)return "";
  if(MediaRecorder.isTypeSupported("audio/mp4"))return "audio/mp4";
  if(MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))return "audio/webm;codecs=opus";
  if(MediaRecorder.isTypeSupported("audio/webm"))return "audio/webm";
  return "";
}
function ext(m){return m.indexOf("mp4")>=0?"m4a":"webm"}
function line(t){let n=$("sessionInfo");if(n)n.textContent=t}
function shared(){
  if(window.CJAudio){try{window.CJAudio()}catch(e){}}
  return window.__cjAudioCtx||null;
}
function download(file){
  let a=document.createElement("a");
  a.href=URL.createObjectURL(file);
  a.download=file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function shareFile(){
  if(!lastFile)return;
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[lastFile]})){
    navigator.share({files:[lastFile],title:"Chakra Journey recording"}).catch(()=>download(lastFile));
  }else download(lastFile);
}
function hideButton(){if(saveBtn){saveBtn.remove();saveBtn=null}}
function showButton(){
  if(saveBtn||!lastFile)return;
  let panel=$("sessionPanel");
  if(!panel)return;
  saveBtn=document.createElement("button");
  saveBtn.type="button";
  saveBtn.className="btn play";
  saveBtn.id="saveShareRecording";
  saveBtn.textContent="Save & share recording";
  saveBtn.style.marginTop="8px";
  saveBtn.onclick=shareFile;
  panel.appendChild(saveBtn);
}
function finish(){
  let m=mimeType||mime();
  let blob=new Blob(chunks,{type:m});
  chunks=[];rec=null;
  if(!blob.size){line("Nothing was captured.");return}
  lastFile=new File([blob],"chakra-journey-session."+ext(m),{type:blob.type});
  line("Recording ready.");
  showButton();
  try{window.dispatchEvent(new CustomEvent("cj-recording-ready",{detail:{file:lastFile,type:blob.type,startedAt:recStart,endedAt:Date.now()}}))}catch(e){}
}
function discard(){
  let old=rec;
  rec=null;chunks=[];lastFile=null;
  hideButton();
  if(old&&old.state==="recording"){old.onstop=null;try{old.stop()}catch(e){}}
}
function ensureBus(ctx){
  window.__cjRecWanted=true;
  if(!window.__cjRecBus||window.__cjRecBus.context!==ctx){
    try{window.__cjRecBus=ctx.createMediaStreamDestination()}catch(e){return null}
  }
  return window.__cjRecBus;
}
function copyThrough(e){
  let inn=e.inputBuffer, out=e.outputBuffer, n=out.numberOfChannels, m=inn.numberOfChannels;
  if(!n||!m)return;
  for(let c=0;c<n;c++){
    let src=inn.getChannelData(Math.min(c,m-1)), dst=out.getChannelData(c);
    dst.set(src.subarray(0,dst.length));
  }
}
function attachBus(ctx){
  let node=window.__cjVideoPull, bus=window.__cjRecBus;
  if(!node||!bus||bus.context!==ctx||window.__cjVideoBus===bus)return;
  try{node.connect(bus);window.__cjVideoBus=bus}catch(e){}
}
function scriptPull(ctx){
  let pull=ctx.createScriptProcessor(4096,2,2);
  pull.onaudioprocess=copyThrough;
  return pull;
}
/* Speakers hear the video gain directly. A ScriptProcessor on that path
   clicks every buffer (4096 samples, about 93 ms at 44.1 kHz) whenever the
   main thread is late, and the same node used to feed the recording.
   The pull stays off the speakers: an AudioWorklet copy into the record bus,
   with a silent leg so iOS keeps the media element running. */
function armPull(ctx,gain,pull){
  if(window.__cjVideoPull||!pull)return;
  window.__cjVideoPull=pull;
  try{gain.connect(pull)}catch(e){window.__cjVideoPull=null;return}
  if(window.__cjRecTapped)window.__cjRecTapped.add(pull);
  let silent=ctx.createGain();
  silent.gain.value=0;
  if(window.__cjRecTapped)window.__cjRecTapped.add(silent);
  try{pull.connect(silent);silent.connect(ctx.destination)}catch(e){}
  attachBus(ctx);
}
function installPull(ctx,gain){
  if(!gain)return;
  if(window.__cjVideoPull){attachBus(ctx);return}
  if(ctx.__cjPullPending)return;
  ctx.__cjPullPending=true;
  if(ctx.audioWorklet&&ctx.audioWorklet.addModule){
    try{
      ctx.audioWorklet.addModule("chakra-audio-copy.js?v=20261005b").then(function(){
        if(window.__cjVideoPull)return;
        try{armPull(ctx,gain,new AudioWorkletNode(ctx,"cj-copy",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:"explicit"}))}
        catch(err){armPull(ctx,gain,scriptPull(ctx))}
      }).catch(function(){armPull(ctx,gain,scriptPull(ctx))});
      return;
    }catch(e){}
  }
  armPull(ctx,gain,scriptPull(ctx));
}
function tapVideo(ctx){
  if(!ctx||ctx.state!=="running")return null;
  if(window.__cjVideoSrc){installPull(ctx,window.__cjVideoGain||window.__cjVideoOut);return window.__cjVideoSrc}
  let v=$("player");
  if(!v)return null;
  try{ctx.resume()}catch(e){}
  if(ctx.state!=="running")return null;
  try{
    let src=ctx.createMediaElementSource(v);
    let gain=ctx.createGain();
    gain.gain.value=1;
    src.connect(gain);
    if(window.__cjRecTapped)window.__cjRecTapped.add(gain);
    gain.connect(ctx.destination);
    window.__cjVideoSrc=src;
    window.__cjVideoGain=gain;
    window.__cjVideoOut=gain;
    installPull(ctx,gain);
    return src;
  }catch(e){return window.__cjVideoSrc||null}
}
window.__cjTapVideo=function(){
  let ctx=shared();
  if(!ctx)return null;
  try{ctx.resume()}catch(e){}
  if(ctx.state!=="running")return null;
  ensureBus(ctx);
  return tapVideo(ctx);
};
window.__cjEnsureVideoGraph=function(){
  let ctx=shared();
  if(!ctx)return null;
  try{ctx.resume()}catch(e){}
  if(ctx.state!=="running")return null;
  if(window.__cjRecWanted)ensureBus(ctx);
  return tapVideo(ctx);
};
function begin(){
  if(rec&&rec.state==="recording")return true;
  let ctx=window.__cjAudioCtx;
  if(!ctx||ctx.state!=="running"||!window.__cjRecBus)return false;
  let m=mime();
  if(!window.MediaRecorder||!m){line("This browser cannot write a recording.");return false}
  mimeType=m;chunks=[];
  try{rec=new MediaRecorder(window.__cjRecBus.stream,{mimeType:m})}catch(e){line("Could not start recording.");return false}
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  rec.onstop=finish;
  rec.start(1000);
  recStart=Date.now();
  return true;
}
function endRecording(){
  if(rec&&rec.state==="recording"){try{rec.stop()}catch(e){}}
}
function armRecording(ctx){
  if(!window.__cjRecWanted||!ctx)return;
  let go=function(){
    if(!window.__cjRecWanted||ctx.state!=="running")return;
    ensureBus(ctx);
    let tapped=tapVideo(ctx);
    begin();
    line(tapped?"Recording this journey, including the video.":"Recording bowls and voice. Video stays on the element.");
  };
  if(ctx.state==="running"){go();return}
  try{ctx.resume().then(go).catch(function(){})}catch(e){}
  let onstate=function(){
    if(ctx.state!=="running")return;
    ctx.removeEventListener("statechange",onstate);
    go();
  };
  ctx.addEventListener("statechange",onstate);
}
function startCapture(){
  discard();
  window.__cjRecWanted=true;
  let ctx=shared();
  if(!ctx){line("Recording bowls and voice when audio starts. Video stays on the element.");return}
  try{ctx.resume()}catch(e){}
  armRecording(ctx);
}
function iosNote(){
  let ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  if(!ios||$("silentNote"))return;
  let play=$("play");
  if(!play)return;
  let p=document.createElement("p");
  p.id="silentNote";
  p.className="voice-note";
  p.textContent="Turn off silent mode for sound";
  play.insertAdjacentElement("afterend",p);
}
function install(){
  iosNote();
  let play=$("play");
  if(play)play.addEventListener("click",startCapture,true);
  let stop=$("stop");
  if(stop)stop.addEventListener("click",endRecording);
  let back=$("backMain");
  if(back)back.addEventListener("click",endRecording);
  let st=$("status");
  if(st&&window.MutationObserver){
    new MutationObserver(()=>{
      if(st.textContent==="Journey complete"||st.textContent==="Back on the main screen")endRecording();
    }).observe(st,{childList:true,characterData:true,subtree:true});
  }
  let yt=$("player");
  if(yt)yt.addEventListener("ended",endRecording);
  window.addEventListener("cj-audio-ready",()=>{
    if(!window.__cjRecWanted||(rec&&rec.state==="recording"))return;
    let ctx=window.__cjAudioCtx;
    if(!ctx)return;
    armRecording(ctx);
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
