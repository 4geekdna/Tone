(function(){
'use strict';
const $=id=>document.getElementById(id);
let rec=null,chunks=[],lastFile=null,saveBtn=null;

function mime(){
  if(!window.MediaRecorder)return '';
  if(MediaRecorder.isTypeSupported('audio/mp4'))return 'audio/mp4';
  if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))return 'audio/webm;codecs=opus';
  if(MediaRecorder.isTypeSupported('audio/webm'))return 'audio/webm';
  return '';
}
function ext(m){return m.indexOf('mp4')>=0?'m4a':'webm'}

function download(file){
  let a=document.createElement('a');
  a.href=URL.createObjectURL(file);
  a.download=file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function shareFile(file){
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
    navigator.share({files:[file],title:'Chakra Journey session'}).catch(()=>download(file));
  }else download(file);
}

function finish(m){
  let blob=new Blob(chunks,{type:m});
  chunks=[];rec=null;
  if(saveBtn)saveBtn.remove();saveBtn=null;
  if(!blob.size)return;
  lastFile=new File([blob],'chakra-journey-session.'+ext(m),{type:blob.type});
  showSaveButton();
}

function showSaveButton(){
  if(saveBtn||!lastFile)return;
  let panel=$('sessionPanel');
  if(!panel)return;
  saveBtn=document.createElement('button');
  saveBtn.type='button';
  saveBtn.className='btn play';
  saveBtn.textContent='Save audio';
  saveBtn.style.marginTop='8px';
  saveBtn.onclick=()=>{
    shareFile(lastFile);
    if(saveBtn){saveBtn.remove();saveBtn=null}
    lastFile=null;
  };
  panel.appendChild(saveBtn);
}

function begin(){
  if(rec&&rec.state==='recording')return;
  let m=mime();
  if(!window.MediaRecorder||!m)return;
  let bus=window.__cjRecBus;
  if(!bus)return;
  chunks=[];
  try{rec=new MediaRecorder(bus.stream,{mimeType:m})}catch(e){return}
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  rec.onstop=()=>finish(m);
  rec.start(1000);
}

function arm(){
  window.__cjRecWanted=true;
  if(window.__cjAudioCtx&&!window.__cjRecBus){
    try{window.__cjRecBus=window.__cjAudioCtx.createMediaStreamDestination()}catch(e){}
  }
  begin();
}

function discard(){
  if(rec&&rec.state==='recording'){try{rec.stop()}catch(e){}}
  chunks=[];rec=null;lastFile=null;
  if(saveBtn){saveBtn.remove();saveBtn=null}
}

function install(){
  window.addEventListener('cj-audio-ready',()=>{if(window.__cjRecWanted)begin()});
  let play=$('play');
  if(play){
    play.addEventListener('click',()=>{
      discard();
      arm();
    });
  }
  let st=$('status');
  if(st&&window.MutationObserver){
    new MutationObserver(()=>{
      if(st.textContent==='Journey complete'&&rec&&rec.state==='recording')rec.stop();
    }).observe(st,{childList:true,characterData:true,subtree:true});
  }
  let yt=$('player');
  if(yt)yt.addEventListener('ended',()=>{if(rec&&rec.state==='recording')rec.stop()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
