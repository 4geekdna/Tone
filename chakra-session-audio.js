(function(){
'use strict';
const $=id=>document.getElementById(id);
let rec=null,chunks=[],lastFile=null,starting=false;
function note(t){let n=$('sessionAudioNote');if(n)n.textContent=t}
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
  note('Saved '+file.name+'. Open it in Files, AirDrop it, or use Share last audio. No app needed to replay.');
}
function shareLast(){
  if(!lastFile){note('Record a session first.');return}
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[lastFile]})){
    navigator.share({files:[lastFile],title:'Chakra Journey session'}).then(()=>note('Share sheet open. Save to Files to replay on this phone or another device.')).catch(()=>download(lastFile));
    return;
  }
  download(lastFile);
}
function finish(m){
  let blob=new Blob(chunks,{type:m});
  chunks=[];
  rec=null;
  starting=false;
  let btn=$('sessionAudioBtn');
  if(btn)btn.textContent='Record session audio';
  if(!blob.size){note('Nothing was captured. Press Record, then Start Journey, so the bowls and voice are included.');return}
  lastFile=new File([blob],'chakra-journey-session.'+ext(m),{type:blob.type});
  let share=$('sessionAudioShare');
  if(share)share.disabled=false;
  note('Recording ready ('+Math.round(blob.size/1024)+' KB). Share last audio, or it will also download.');
  download(lastFile);
}
function begin(){
  if(starting||(rec&&rec.state==='recording'))return;
  let m=mime();
  if(!window.MediaRecorder||!m){note('This browser cannot write a shareable audio file.');return}
  let bus=window.__cjRecBus;
  if(!bus){note('Armed. Start the journey. Recording begins with the bowls and voice.');return}
  chunks=[];
  try{rec=new MediaRecorder(bus.stream,{mimeType:m})}catch(e){note('Could not start recording.');return}
  starting=true;
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  rec.onstop=()=>finish(m);
  rec.start(1000);
  let btn=$('sessionAudioBtn');
  if(btn)btn.textContent='Stop and save audio';
  note('Recording bowls and affirmations. Already-playing sound is missed until the next bowl or voice. Stop and save writes a file.');
}
function arm(){
  window.__cjRecWanted=true;
  if(window.__cjAudioCtx&&!window.__cjRecBus){
    try{window.__cjRecBus=window.__cjAudioCtx.createMediaStreamDestination()}catch(e){}
  }
  begin();
}
function install(){
  let panel=$('sessionPanel');
  if(!panel||$('sessionAudioBtn'))return;
  let tools=document.createElement('div');
  tools.className='voice-tools';
  tools.innerHTML='<button class="btn" id="sessionAudioBtn" type="button">Record session audio</button><button class="btn" id="sessionAudioShare" type="button">Share last audio</button>';
  panel.appendChild(tools);
  let n=document.createElement('p');
  n.id='sessionAudioNote';
  n.className='voice-note';
  n.textContent='Records bowls and spoken affirmations, then gives you a file to save or AirDrop. The video is already a file on the site. Does not change the saved session.';
  panel.appendChild(n);
  $('sessionAudioShare').disabled=true;
  $('sessionAudioBtn').onclick=()=>{
    if(rec&&rec.state==='recording'){rec.stop();return}
    arm();
  };
  $('sessionAudioShare').onclick=shareLast;
  window.addEventListener('cj-audio-ready',()=>{if(window.__cjRecWanted)begin()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
