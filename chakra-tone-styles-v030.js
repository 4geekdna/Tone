/* Chakra Journey v0.30 — expanded tone palette with video-like crystal bowls */
(function(){
'use strict';
const $=id=>document.getElementById(id);
function addStyles(){
 const s=$('style'); if(!s)return;
 const options=[
  ['pure','Pure Solfeggio'],
  ['enhanced','Enhanced Chakra Tone'],
  ['crystal','Crystal Bowl — Video Match'],
  ['singing','Singing Crystal Bowl'],
  ['tibetan','Tibetan Bowl'],
  ['warm','Warm Meditation Bowl'],
  ['deep','Deep Grounding Bowl']
 ];
 const current=s.value||'crystal';
 s.innerHTML=options.map(([v,n])=>'<option value="'+v+'">'+n+'</option>').join('');
 s.value=options.some(x=>x[0]===current)?current:'crystal';
}
/* This engine is used by the v0.30 core. Profiles intentionally retain the
   original Solfeggio fundamental while changing partials/attack/decay so the
   bowl choices sound distinct. */
window.CJToneProfiles={
 pure:{partials:[[1,.90]],attack:1.0,release:1.8,wobble:0},
 enhanced:{partials:[[.5,.13],[1,.50],[.997,.10],[1.003,.10],[2,.12]],attack:1.8,release:3.0,wobble:.035},
 crystal:{partials:[[1,.46],[2.01,.20],[2.99,.12],[4.02,.075],[5.06,.04]],attack:2.4,release:4.5,wobble:.018},
 singing:{partials:[[.5,.07],[1,.43],[1.5,.11],[2.005,.17],[3.01,.08],[4.03,.035]],attack:2.8,release:5.2,wobble:.025},
 tibetan:{partials:[[1,.36],[2.02,.24],[2.98,.15],[4.18,.09],[5.43,.04]],attack:1.5,release:4.0,wobble:.045},
 warm:{partials:[[.5,.18],[1,.44],[1.5,.14],[2,.10],[2.5,.05]],attack:2.5,release:4.8,wobble:.028},
 deep:{partials:[[.25,.07],[.5,.22],[1,.42],[1.49,.10],[2,.07]],attack:3.0,release:5.5,wobble:.02}
};
function boot(){addStyles();let saved=localStorage.getItem('cj_style');const s=$('style');if(s&&saved&&[...s.options].some(o=>o.value===saved))s.value=saved;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
