(function(){
  function player(){return document.getElementById("player")}
  function playBtn(){return document.getElementById("play")}
  function pauseBtn(){return document.getElementById("pause")}
  function running(){const b=playBtn();return !!(b&&b.textContent==="Running")}
  function pausedByApp(){const b=pauseBtn();return !!(b&&b.textContent==="Resume")}

  // Resume the audio context only. Never pause — that used to eat the
  // video Play tap so the picture never moved.
  window.unlockMedia=function(){
    try{if(typeof audio==="function")audio()}catch(e){}
    try{speechSynthesis.resume()}catch(e){}
    const yt=player();
    if(!yt)return;
    yt.removeAttribute("autoplay");
    yt.setAttribute("playsinline","");
    yt.playsInline=true;
  };

  function boot(){
    const yt=player();
    if(!yt)return;
    yt.removeAttribute("autoplay");
    yt.addEventListener("loadedmetadata",function(){
      if(!running()){
        try{yt.pause()}catch(e){}
      }
    });
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
