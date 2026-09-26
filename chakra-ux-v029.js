/* Chakra Journey UX v0.29: collapsible voice/tone + smoother tone transitions */
(function(){
'use strict';
const $=id=>document.getElementById(id);
function installCollapsible(){
  const voice=document.querySelector('.panel.voice-group')||$('voicePreset')?.closest('.panel');
  if(!voice||voice.dataset.collapsible==='1')return;
  voice.dataset.collapsible='1';
  const body=document.createElement('div'); body.className='cj-collapse-body';
  const groupHead=voice.querySelector(':scope > .groupHead');
  if(groupHead){
    [...voice.children].filter(x=>x!==groupHead).forEach(x=>body.appendChild(x));
    const chev=document.createElement('button');
    chev.type='button'; chev.className='cj-chevron-btn'; chev.id='voiceControlsToggle';
    chev.setAttribute('aria-label','Show or hide voice controls');
    groupHead.appendChild(chev); voice.appendChild(body);
    let open=localStorage.getItem('cj_voice_tone_open')!=='0';
    const render=()=>{body.hidden=!open;chev.setAttribute('aria-expanded',String(open));chev.textContent=open?'▴':'▾'};
    chev.onclick=()=>{open=!open;localStorage.setItem('cj_voice_tone_open',open?'1':'0');render()};
    render();
    return;
  }
  const title=[...voice.children].find(x=>x.tagName==='B');
  if(!title)return;
  [...voice.children].filter(x=>x!==title).forEach(x=>body.appendChild(x));
  const head=document.createElement('button'); head.type='button'; head.className='cj-collapse-head';
  head.innerHTML='<span>Voice & Tone</span><span class="cj-chevron">▾</span>';
  title.replaceWith(head); voice.appendChild(body);
  let open=localStorage.getItem('cj_voice_tone_open')!=='0';
  const render=()=>{body.hidden=!open;head.setAttribute('aria-expanded',String(open));head.querySelector('.cj-chevron').textContent=open?'▴':'▾'};
  head.onclick=()=>{open=!open;localStorage.setItem('cj_voice_tone_open',open?'1':'0');render()}; render();
}
function installStyles(){
 const s=document.createElement('style');s.textContent=`
 .cj-collapse-head{width:100%;display:flex;align-items:center;justify-content:space-between;background:transparent;color:#fff;border:0;padding:2px 0 6px;font:700 16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left}.cj-chevron,.cj-chevron-btn{font-size:20px;color:#aaa}.cj-chevron-btn{border:0;background:transparent;color:#fff;padding:0 4px;font-weight:700}.cj-collapse-body[hidden]{display:none!important}
 `;document.head.appendChild(s);
}
/* The core creates oscillator banks directly. Intercept gain ramps so old banks release more slowly
   and new banks bloom more gradually; this produces a short musical crossfade rather than a hard swap. */
function installSmoothAudio(){
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC||!AC.prototype||AC.prototype.__cjSmooth)return;
 AC.prototype.__cjSmooth=true;
 const original=AC.prototype.createGain;
 AC.prototype.createGain=function(){
   const g=original.call(this); const p=g.gain;
   if(p&&p.linearRampToValueAtTime){const ramp=p.linearRampToValueAtTime.bind(p);p.linearRampToValueAtTime=(v,t)=>ramp(v,Math.max(t,this.currentTime+1.8));}
   if(p&&p.setTargetAtTime){const target=p.setTargetAtTime.bind(p);p.setTargetAtTime=(v,t,c)=>target(v,t,Math.max(c||0,.55));}
   return g;
 };
}
installStyles();installSmoothAudio();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installCollapsible);else installCollapsible();
})();
