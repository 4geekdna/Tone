(function(){
const $=id=>document.getElementById(id);
function panelByTitle(text){return [...document.querySelectorAll('.panel')].find(p=>p.querySelector('b')?.textContent.trim()===text)}
function installTopControls(){
 const video=$('ytBox'),play=$('play'),pause=$('pause'),stop=$('stop'); if(!video||!play)return;
 let box=$('topJourneyControls'); if(!box){box=document.createElement('div');box.id='topJourneyControls';box.className='panel';box.innerHTML='<b>Journey</b><div class="buttons" id="topJourneyButtons"></div><div class="voice-note">The video controls and journey controls stay synchronized.</div>';video.insertAdjacentElement('afterend',box)}
 const buttons=$('topJourneyButtons');[play,pause,stop].filter(Boolean).forEach(b=>buttons.appendChild(b));
}
function groupLights(){
 const g=panelByTitle('Govee Lights'); if(!g)return;
 g.querySelector('b').textContent='Lights • Govee + Chakra Calibration';
 const calibration=panelByTitle('Room Color Calibration'); if(calibration){let h=document.createElement('hr');h.style.cssText='border:0;border-top:1px solid #35353f;margin:16px 0';g.appendChild(h);while(calibration.firstChild)g.appendChild(calibration.firstChild);calibration.remove()}
 // Put any device/capability/starlight panels immediately after the main light panel.
 let anchor=g;[...document.querySelectorAll('.panel')].filter(p=>/capabilit|starlight|projector|device inspect/i.test(p.querySelector('b')?.textContent||'')).forEach(p=>{anchor.insertAdjacentElement('afterend',p);anchor=p});
}
function syncVideo(){
 const v=$('player'),play=$('play'),pause=$('pause');if(!v||!play)return;let internal=false;
 v.addEventListener('play',()=>{if(internal)return;if(play.textContent!=='Running'){internal=true;play.click();setTimeout(()=>internal=false,50)}else if(pause&&pause.textContent==='Resume'){internal=true;pause.click();setTimeout(()=>internal=false,50)}});
 v.addEventListener('pause',()=>{if(internal||v.ended)return;if(play.textContent==='Running'&&pause&&pause.textContent!=='Resume'){internal=true;pause.click();setTimeout(()=>internal=false,50)}});
}
function completedHistory(){
 const KEY='starfleet_chakra_outbox';
 function read(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
 function write(q){localStorage.setItem(KEY,JSON.stringify(q))}
 function render(){const el=$('journeyHistory');if(!el)return;let q=read().filter(s=>s.status==='completed').slice().reverse();if(!q.length){el.innerHTML='<div class="voice-note">No completed journeys stored on this device yet.</div>';return}el.innerHTML=q.slice(0,30).map(s=>{let d=new Date(s.startedAt),mins=Math.max(0,Math.round((s.durationSeconds||0)/60));return '<div class="historyItem" data-session="'+s.id+'"><b>'+d.toLocaleDateString()+' '+d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+'</b><span>'+mins+' min • '+((s.chakras||[]).length)+'/7 chakras • '+((s.mantras||[]).length)+' affirmations</span><button class="btn journeyDelete" style="margin-top:7px;padding:7px 10px">Delete</button></div>'}).join('');el.querySelectorAll('.journeyDelete').forEach(b=>b.onclick=()=>{let id=b.closest('[data-session]').dataset.session;if(confirm('Delete this completed journey?')){write(read().filter(s=>s.id!==id));render()}})}
 // Purge old stopped/aborted records so history is completed-only from this release onward.
 write(read().filter(s=>s.status==='completed'));
 if(window.chakraAuto){const old=window.chakraAuto.renderHistory;window.chakraAuto.renderHistory=render;window.chakraAuto.deleteSession=id=>{write(read().filter(s=>s.id!==id));render()}}
 render();window.addEventListener('starfleet-session-ready',e=>{if(e.detail?.status==='completed')setTimeout(render,20)});
}
function boot(){installTopControls();groupLights();syncVideo();completedHistory()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();