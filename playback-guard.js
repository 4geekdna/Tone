(function(){
  const VIDEO='Quick Morning Chakra Alignment Sound Bath - 11 Minute Chakra Balancing Meditation Frequencies.mp4';
  function player(){return document.getElementById('player')}
  function isiPhone(){return /iPhone|iPad|iPod/i.test(navigator.userAgent)}
  function resumeWebAudio(){try{if(typeof ctx!=='undefined'&&ctx&&ctx.state==='suspended')ctx.resume().catch(function(){})}catch(e){}}
  function ensureVideo(){
    const v=player(); if(!v)return;
    v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.playsInline=true;v.preload='metadata';
    // Core normally assigns the source. If Safari reached this guard first or
    // restored a page with an empty media element, explicitly restore the repo MP4.
    if(!v.currentSrc&&!v.getAttribute('src')){v.src=encodeURI(VIDEO);try{v.load()}catch(e){}}
  }
  // Do not monkey-patch speechSynthesis. Safari owns Share Audio routing and
  // replacing its methods can interfere with media initialization/restoration.
  window.unlockMedia=function(){resumeWebAudio();ensureVideo()};
  function loadJourneyPresets(){if(document.querySelector('script[data-journey-presets]'))return;const s=document.createElement('script');s.src='journey-presets.js?v=20260923b';s.dataset.journeyPresets='1';document.head.appendChild(s)}
  function boot(){ensureVideo();loadJourneyPresets();document.addEventListener('visibilitychange',function(){if(!document.hidden){resumeWebAudio();ensureVideo()}});window.addEventListener('pageshow',function(){setTimeout(function(){resumeWebAudio();ensureVideo()},80)});window.addEventListener('focus',function(){setTimeout(function(){resumeWebAudio();ensureVideo()},80)})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();