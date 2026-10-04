(function(){
'use strict';
const KEY='cj_video_v1';
const CROWN=536;
const videos=[
 {id:'default',label:'Original Sound Bath',file:'Quick Morning Chakra Alignment Sound Bath - 11 Minute Chakra Balancing Meditation Frequencies.mp4'},
 {id:'unlock',label:'Unlock Your Full Potential',file:'Chakra Frequencies - Unlock Your Full Potential - 11 Minute Cleanse.mp4'}
];
/* v0.44: extra entries (videos/manifest.json and videos added on this
   phone) come from chakra-video-library.js through CJVideoOptions and
   play through CJVideoLibrary.play. Built-in behavior is unchanged. */
let extra=[],shown='',pendingId='';
const $=id=>document.getElementById(id);
function builtIn(id){return videos.find(v=>v.id===id)}
function savedId(){let id='default';try{id=localStorage.getItem(KEY)||'default'}catch(e){}return id}
function current(){return builtIn(savedId())||videos[0]}
function clock(s){s=Math.round(s);return Math.floor(s/60)+':'+(s%60<10?'0':'')+(s%60)}
function noteFor(choice,duration){
  if(choice.id==='default')return 'Uses the original analyzed bowl timestamps.';
  if(!Number.isFinite(duration))return 'Optional 11:10 cleanse video. Timing check waits until the file loads.';
  if(duration<CROWN+5)return 'This file is shorter than the crown mark (8:56). Staying on the original video.';
  return 'Original timestamps fit this file (crown at 8:56, file '+clock(duration)+'). Not re-analyzed for this video.';
}
function restoreMarks(){
  let a=(typeof ANALYZED!=='undefined'&&Array.isArray(ANALYZED))?ANALYZED:[0,102,194,277,366,450,536];
  if(window.CJVideoLibrary&&typeof window.CJVideoLibrary.setMarks==='function')window.CJVideoLibrary.setMarks(a);
}
function apply(id,keepTime){
  let choice=builtIn(id);
  if(!choice&&window.CJVideoLibrary&&extra.some(v=>v.id===id)){
    try{localStorage.setItem(KEY,id)}catch(e){}
    shown=id;
    let sel=$('journeyVideo');if(sel&&sel.value!==id)sel.value=id;
    window.CJVideoLibrary.play(id,keepTime);
    return;
  }
  if(!choice&&/^(lib|repo):/.test(id||'')){pendingId=id;return}
  choice=choice||videos[0];
  let p=$('player');
  let fromExtra=/^(lib|repo):/.test(shown||'');
  try{localStorage.setItem(KEY,choice.id)}catch(e){}
  shown=choice.id;
  let sel=$('journeyVideo');if(sel&&sel.value!==choice.id)sel.value=choice.id;
  if(fromExtra)restoreMarks();
  if(!p)return;
  try{p.removeAttribute('crossorigin')}catch(e){}
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
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function render(){
  let sel=$('journeyVideo');if(!sel)return;
  let groups={repo:[],lib:[]};
  extra.forEach(v=>{(v.id.indexOf('repo:')===0?groups.repo:groups.lib).push(v)});
  let html=videos.map(v=>'<option value="'+v.id+'">'+esc(v.label)+'</option>').join('');
  if(groups.repo.length)html+='<optgroup label="Library">'+groups.repo.map(v=>'<option value="'+esc(v.id)+'">'+esc(v.label)+'</option>').join('')+'</optgroup>';
  if(groups.lib.length)html+='<optgroup label="Added on this device">'+groups.lib.map(v=>'<option value="'+esc(v.id)+'">'+esc(v.label)+'</option>').join('')+'</optgroup>';
  sel.innerHTML=html;
  sel.value=shown&&[...sel.options].some(o=>o.value===shown)?shown:(builtIn(shown)?shown:'default');
}
function setOptions(list){
  extra=(list||[]).filter(v=>v&&v.id&&v.label);
  render();
  if(pendingId){let id=pendingId;pendingId='';if(extra.some(v=>v.id===id))apply(id,false);else apply('default',false)}
}
function install(){
  let panel=[...document.querySelectorAll('.panel')].find(p=>p.querySelector('b')?.textContent.trim()==='Journey Source');
  if(!panel||$('journeyVideo'))return;
  let row=document.createElement('div');
  row.className='row';
  row.innerHTML='<label>Journey video</label><select id="journeyVideo"></select>';
  let tabs=panel.querySelector('.tabs');
  (tabs||panel).insertAdjacentElement(tabs?'afterend':'beforeend',row);
  let note=document.createElement('div');
  note.id='videoChoiceNote';
  note.className='voice-note';
  row.insertAdjacentElement('afterend',note);
  let id=savedId();
  render();
  let sel=$('journeyVideo');
  sel.onchange=()=>apply(sel.value,false);
  if(builtIn(id))apply(id,false);
  else{pendingId=id;shown='';apply('default',false);pendingId=id}
}
window.CJVideos=videos;
window.CJSelectVideo=apply;
window.CJVideoOptions=setOptions;
window.CJCurrentVideoId=()=>shown;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
