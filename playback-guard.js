(function(){
  function player(){return document.getElementById("player")}
  function playBtn(){return document.getElementById("play")}
  function pauseBtn(){return document.getElementById("pause")}
  function running(){const b=playBtn();return !!(b&&b.textContent==="Running")}
  function pausedByApp(){const b=pauseBtn();return !!(b&&b.textContent==="Resume")}
  function isiPhone(){return /iPhone|iPad|iPod/i.test(navigator.userAgent)}

  // iOS Share Audio is owned by the system audio route. SpeechSynthesis can
  // create a second native speech audio session and cause one shared pair of
  // AirPods/headphones to disappear. Chakra Journey's ElevenLabs audio already
  // plays through Web Audio, so on iPhone keep the journey on that one route.
  function protectSharedAudioRoute(){
    if(!isiPhone()||!window.speechSynthesis)return;
    const synth=window.speechSynthesis;
    try{
      synth.cancel=function(){};
      synth.pause=function(){};
      synth.resume=function(){};
      synth.speak=function(utterance){
        // Silent fallback only. Do not open the native iOS speech route.
        // Complete asynchronously so journey sequencing continues normally.
        setTimeout(function(){
          try{if(utterance&&typeof utterance.onend==="function")utterance.onend({type:"end",elapsedTime:0})}catch(e){}
        },20);
      };
    }catch(e){}
  }

  function resumeWebAudio(){
    try{
      if(typeof ctx!=="undefined"&&ctx&&ctx.state==="suspended")ctx.resume().catch(function(){});
      else if(typeof audio==="function")audio();
    }catch(e){}
  }

  // Resume the existing Web Audio context only. Never create a competing
  // native speech session and never pause/reload the media element.
  window.unlockMedia=function(){
    resumeWebAudio();
    const media=player();
    if(!media)return;
    media.removeAttribute("autoplay");
    media.setAttribute("playsinline","");
    media.setAttribute("webkit-playsinline","");
    media.playsInline=true;
  };

  function boot(){
    protectSharedAudioRoute();
    const media=player();
    if(!media)return;
    media.removeAttribute("autoplay");
    media.setAttribute("playsinline","");
    media.setAttribute("webkit-playsinline","");
    media.playsInline=true;

    media.addEventListener("loadedmetadata",function(){
      if(!running()){
        try{media.pause()}catch(e){}
      }
    });

    // Safari can suspend Web Audio after Control Center is opened to add the
    // second headphones. Resume the same context when Chakra Journey returns.
    document.addEventListener("visibilitychange",function(){
      if(!document.hidden)setTimeout(resumeWebAudio,80);
    });
    window.addEventListener("pageshow",function(){setTimeout(resumeWebAudio,80)});
    window.addEventListener("focus",function(){setTimeout(resumeWebAudio,80)});

    const pause=pauseBtn();
    if(pause){
      pause.addEventListener("click",function(){
        setTimeout(function(){
          if(pausedByApp()){
            const v=player();
            if(v){try{v.pause()}catch(e){}}
          }
        },0);
      });
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
