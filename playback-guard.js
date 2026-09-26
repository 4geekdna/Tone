(function(){
  const VIDEO='Quick Morning Chakra Alignment Sound Bath - 11 Minute Chakra Balancing Meditation Frequencies.mp4';
  function player(){return document.getElementById('player')}
  function resumeWebAudio(){try{if(typeof ctx!=='undefined'&&ctx&&ctx.state==='suspended')ctx.resume().catch(function(){})}catch(e){}}
  function ensureVideo(){const v=player();if(!v)return;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.playsInline=true;v.preload='metadata';if(!v.currentSrc&&!v.getAttribute('src')){v.src=encodeURI(VIDEO);try{v.load()}catch(e){}}}
  window.unlockMedia=function(){resumeWebAudio();ensureVideo()};
  function loadScript(src,attr){if(document.querySelector('script['+attr+']'))return;const s=document.createElement('script');s.src=src;s.setAttribute(attr,'1');document.head.appendChild(s)}
  function boot(){ensureVideo();loadScript('journey-presets.js?v=20260926a','data-journey-presets');document.addEventListener('visibilitychange',function(){if(!document.hidden){resumeWebAudio();ensureVideo()}});window.addEventListener('pageshow',function(){setTimeout(function(){resumeWebAudio();ensureVideo()},80)});window.addEventListener('focus',function(){setTimeout(function(){resumeWebAudio();ensureVideo()},80)})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();