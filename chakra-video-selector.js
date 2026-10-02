(function(){
'use strict';
const KEY='cj_video_v1';
const CROWN=536;
const videos=[
 {id:'default',label:'One bowl — Morning Sound Bath',file:'Quick Morning Chakra Alignment Sound Bath - 11 Minute Chakra Balancing Meditation Frequencies.mp4'},
 {id:'unlock',label:'Three bowls — Unlock Your Full Potential',file:'Chakra Frequencies - Unlock Your Full Potential - 11 Minute Cleanse.mp4'}
];
const $=id=>document.getElementById(id);
function current(){let id='default';try{id=localStorage.getItem(KEY)||'default'}catch(e){}return videos.find(v=>v.id===id)||videos[0]}
function clock(s){s=Math.round(s);return Math.floor(s/60)+':'+(s%60<10?'0':'')+(s%60)}
function which(choice){return choice.id==='default'?'One bowl (Morning Sound Bath).':'Three bowls (Unlock Your Full Potential).'}
function noteFor(choice,duration){
  if(!Number.isFinite(duration))return which(choice)+' Loading the file.';
  if(choice.id!=='default'&&duration<CROWN+5)return which(choice)+' Shorter than the crown mark (8:56). Staying on the one-bowl video.';
  return which(choice)+' '+clock(duration)+'. Bowl marks stay the original analyzed times (crown 8:56). Not re-analyzed.';
}
function showing(choice){
  let p=$('player');
  if(!p)return false;
  return decodeURIComponent(p.currentSrc||p.getAttribute('src')||'').indexOf(choice.file)>=0;
}
function apply(id,keepTime){
  let choice=videos.find(v=>v.id===id)||videos[0],p=$('player');
  try{localStorage.setItem(KEY,choice.id)}catch(e){}
  window.__cjVideoChoice=choice;
  if(!p)return;
  let t=keepTime?p.currentTime:0,wasPlaying=!p.paused&&p.currentTime>0,same=showing(choice);
  p.muted=false;
  p.setAttribute('playsinline','');
  p.setAttribute('webkit-playsinline','');
  p.playsInline=true;
  function done(){
    let note=$('videoChoiceNote');
    if(choice.id!=='default'&&Number.isFinite(p.duration)&&p.duration<CROWN+5){
      if(note)note.textContent=noteFor(choice,p.duration);
      apply('default',false);
      return;
    }
    if(note)note.textContent=noteFor(choice,p.duration);
    if(keepTime&&Number.isFinite(t))try{p.currentTime=Math.min(t,Math.max(0,(p.duration||t)-.1))}catch(e){}
    if(wasPlaying)p.play().catch(()=>{});
  }
  if(!same){
    p.pause();
    p.src=encodeURI(choice.file);
    p.load();
    p.addEventListener('loadedmetadata',function once(){
      p.removeEventListener('loadedmetadata',once);
      done();
    });
  }else if(p.readyState>=1)done();
  else p.addEventListener('loadedmetadata',function once(){
    p.removeEventListener('loadedmetadata',once);
    done();
  });
  let note=$('videoChoiceNote');
  if(note)note.textContent=noteFor(choice,NaN);
  let sel=$('journeyVideo');
  if(sel&&sel.value!==choice.id)sel.value=choice.id;
}
function install(){
  let panel=[...document.querySelectorAll('.panel')].find(p=>p.querySelector('b')?.textContent.trim()==='Journey Source');
  if(!panel||$('journeyVideo'))return;
  let row=document.createElement('div');
  row.className='row';
  row.innerHTML='<label>Journey video</label><select id="journeyVideo">'+videos.map(v=>'<option value="'+v.id+'">'+v.label+'</option>').join('')+'</select>';
  let tabs=panel.querySelector('.tabs');
  (tabs||panel).insertAdjacentElement(tabs?'afterend':'beforeend',row);
  let note=document.createElement('div');
  note.id='videoChoiceNote';
  note.className='voice-note';
  row.insertAdjacentElement('afterend',note);
  let c=current(),sel=$('journeyVideo');
  sel.value=c.id;
  sel.onchange=()=>apply(sel.value,false);
  apply(c.id,false);
  window.addEventListener('pageshow',()=>{let choice=current();if(!showing(choice))apply(choice.id,false)});
}
window.CJVideos=videos;
window.CJSelectVideo=apply;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
