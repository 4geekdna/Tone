(function(){
  function player(){return document.getElementById("player")}
  function playBtn(){return document.getElementById("play")}
  function pauseBtn(){return document.getElementById("pause")}
  function running(){const b=playBtn();return !!(b&&b.textContent==="Running")}
  function pausedByApp(){const b=pauseBtn();return !!(b&&b.textContent==="Resume")}
  function isiPhone(){return /iPhone|iPad|iPod/i.test(navigator.userAgent)}
  function protectSharedAudioRoute(){if(!isiPhone()||!window.speechSynthesis)return;const synth=window.speechSynthesis;try{synth.cancel=function(){};synth.pause=function(){};synth.resume=function(){};synth.speak=function(u){setTimeout(function(){try{if(u&&typeof u.onend==="function")u.onend({type:"end",elapsedTime:0})}catch(e){}},20)}}catch(e){}}
  function resumeWebAudio(){try{if(typeof ctx!=="undefined"&&ctx&&ctx.state==="suspended")ctx.resume().catch(function(){});else if(typeof audio==="function")audio()}catch(e){}}
  window.unlockMedia=function(){resumeWebAudio();const media=player();if(!media)return;media.removeAttribute("autoplay");media.setAttribute("playsinline","");media.setAttribute("webkit-playsinline","");media.playsInline=true};
  function loadJourneyPresets(){if(document.querySelector('script[data-journey-presets]'))return;const s=document.createElement('script');s.src='journey-presets.js?v=20260923a';s.dataset.journeyPresets='1';document.head.appendChild(s)}
  function boot(){protectSharedAudioRoute();loadJourneyPresets();const media=player();if(!media)return;media.removeAttribute("autoplay");media.setAttribute("playsinline","");media.setAttribute("webkit-playsinline","");media.playsInline=true;media.addEventListener("loadedmetadata",function(){if(!running()){try{media.pause()}catch(e){}}});document.addEventListener("visibilitychange",function(){if(!document.hidden)setTimeout(resumeWebAudio,80)});window.addEventListener("pageshow",function(){setTimeout(resumeWebAudio,80)});window.addEventListener("focus",function(){setTimeout(resumeWebAudio,80)});const pause=pauseBtn();if(pause)pause.addEventListener("click",function(){setTimeout(function(){if(pausedByApp()){const v=player();if(v){try{v.pause()}catch(e){}}}},0)})}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();