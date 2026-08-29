(function(){
  function player(){return document.getElementById("player")}
  function playBtn(){return document.getElementById("play")}
  function pauseBtn(){return document.getElementById("pause")}
  function running(){const b=playBtn();return !!(b&&b.textContent==="Running")}
  function pausedByApp(){const b=pauseBtn();return !!(b&&b.textContent==="Resume")}

  window.unlockMedia=function(){
    try{if(typeof audio==="function")audio()}catch(e){}
    try{speechSynthesis.resume()}catch(e){}
    const yt=player();
    if(!yt)return;
    yt.removeAttribute("autoplay");
    yt.setAttribute("playsinline","");
    yt.playsInline=true;
    if(!running()||pausedByApp()){
      try{yt.pause()}catch(e){}
    }
  };

  function holdPause(){
    const yt=player();
    if(!yt)return;
    if(!running()||pausedByApp()){
      try{yt.pause()}catch(e){}
    }
  }

  function boot(){
    const yt=player();
    if(!yt)return;
    yt.removeAttribute("autoplay");
    yt.addEventListener("loadedmetadata",holdPause);
    yt.addEventListener("playing",function(){
      if(!running()||pausedByApp()){
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
