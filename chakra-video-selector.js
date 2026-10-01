(function(){
'use strict';
const KEY='cj_video_v1';
const CROWN=536;
const videos=[
 {id:'default',label:'Original Sound Bath',file:'Quick Morning Chakra Alignment Sound Bath - 11 Minute Chakra Balancing Meditation Frequencies.mp4'},
 {id:'unlock',label:'Unlock Your Full Potential',file:'Chakra Frequencies - Unlock Your Full Potential - 11 Minute Cleanse.mp4'}
];
const $=id=>document.getElementById(id);
function current(){let id='default';try{id=localStorage.getItem(KEY)||'default'}catch(e){}return videos.find(v=>v.id===id)||videos[0]}
function clock(s){s=Math.round(s);return Math.floor(s/60)+':'+(s%60<10?'0':'')+(s%60)}
function noteFor(choice,duration){
  if(choice.id==='default')return 'Uses the original analyzed bowl timestamps.';
  if(!Number.isFinite(duration))return 'Optional 11:10 cleanse video. Timing check waits until the file loads.';
  if(duration<CROWN+5)return 'This file is shorter than the crown mark (8:56). Staying on the original video.';
  return 'Original timestamps fit this file (crown at 8:56, file '+clock(duration)+'). Not re-analyzed for this video.';
}
function apply(id,keepTime){
  let choice=videos.find(v=>v.id===id)||videos[0],p=$('player');
  try{localStorage.setItem(KEY,choice.id)}catch(e){}
  if(!p)return;
  let t=keepTime?p.currentTime:0,wasPlaying=!p.paused;
  p.pause();
  p.src=encodeURI(choice.file);
  p.load();
  p.addEventListener('loadedmetadata',function once(){
    p.removeEventListener('loadedmetadata',once);
    let note=$('videoChoiceNote');
    if(choice.id!=='default'&&Number.isFinite(p.duration)&&p.duration<CROWN+5){
      if(note)note.textContent=noteFor(choice,p.duration);
      apply('default',false);
      return;
    }
    if(note)note.textContent=noteFor(choice,p.duration);
    if(keepTime&&Number.isFinite(t))p.currentTime=Math.min(t,Math.max(0,(p.duration||t)-.1));
    if(wasPlaying)p.play().catch(()=>{});
  },{once:true});
  let note=$('videoChoiceNote');
  if(note)note.textContent=noteFor(choice,NaN);
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
}
window.CJVideos=videos;
window.CJSelectVideo=apply;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
