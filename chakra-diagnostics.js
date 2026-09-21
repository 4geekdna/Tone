(function(){
 const $=id=>document.getElementById(id);
 function badge(state,msg){const b=$("voiceApiBadge");if(!b)return;b.className="apiBadge"+(state==="ok"?" ok":state==="bad"?" bad":"");b.textContent=(state==="ok"?"🟢 ":state==="bad"?"🔴 ":"⚪ ")+msg}
 function observe(){
  const s=$("status"); if(!s)return;
  new MutationObserver(()=>{const t=s.textContent||"";
   if(/connected|voices loaded/i.test(t))badge("ok","ElevenLabs connected ✓");
   else if(/API key missing|test failed|Could not load voices|ElevenLabs:.*(HTTP|failed|invalid)/i.test(t))badge("bad","ElevenLabs connection problem");
   const c=$("voiceCacheState"); if(c){
    if(/cached voice/i.test(t))c.textContent="Cache: HIT • reused local audio";
    else if(/generating .*voice/i.test(t))c.textContent="Cache: MISS • generating new audio";
   }
  }).observe(s,{childList:true,subtree:true,characterData:true});
  if(($("key")?.value||"").trim())badge("","Key saved • tap Test Voice API");
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",observe);else observe();
})();