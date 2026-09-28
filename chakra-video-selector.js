(function(){
'use strict';
const KEY='cj_video_v1';
const videos=[
 {id:'default',label:'Original Sound Bath',file:'Quick Morning Chakra Alignment Sound Bath - 11 Minute Chakra Balancing Meditation Frequencies.mp4'},
 {id:'unlock',label:'Unlock Your Full Potential',file:'Chakra Frequencies - Unlock Your Full Potential - 11 Minute Cleanse.mp4'}
];
const $=id=>document.getElementById(id);
function current(){let id=localStorage.getItem(KEY)||'default';return videos.find(v=>v.id===id)||videos[0]}
function apply(id,keepTime=false){let choice=videos.find(v=>v.id===id)||videos[0],p=$('player');localStorage.setItem(KEY,choice.id);if(!p)return;let t=keepTime?p.currentTime:0,wasPlaying=!p.paused;p.pause();p.src=encodeURI(choice.file);p.load();p.addEventListener('loadedmetadata',function once(){p.removeEventListener('loadedmetadata',once);if(keepTime&&Number.isFinite(t))p.currentTime=Math.min(t,Math.max(0,(p.duration||t)-.1));if(wasPlaying)p.play().catch(()=>{})},{once:true});let note=$('videoChoiceNote');if(note)note.textContent=choice.id==='default'?'Uses the original analyzed bowl timestamps.':'Optional 11:10 cleanse video. Journey timing remains aligned to the same seven-chakra progression.'}
function install(){let panel=[...document.querySelectorAll('.panel')].find(p=>p.querySelector('b')?.textContent.trim()==='Journey Source');if(!panel||$('journeyVideo'))return;let row=document.createElement('div');row.className='row';row.innerHTML='<label>Journey video</label><select id="journeyVideo">'+videos.map(v=>'<option value="'+v.id+'">'+v.label+'</option>').join('')+'</select>';let tabs=panel.querySelector('.tabs');tabs?.insertAdjacentElement('afterend',row);let note=document.createElement('div');note.id='videoChoiceNote';note.className='voice-note';row.insertAdjacentElement('afterend',note);let c=current(),sel=$('journeyVideo');sel.value=c.id;sel.onchange=()=>apply(sel.value,false);apply(c.id,false)}
window.CJVideos=videos;window.CJSelectVideo=apply;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
