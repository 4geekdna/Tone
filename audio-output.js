(function(){
  const $=id=>document.getElementById(id);
  const LS1="cj_audio_out_1";
  const LS2="cj_audio_out_2";
  let outputs=[];
  function note(msg){const el=document.getElementById("status");if(el)el.textContent=msg}
  function isiPhone(){return /iPhone|iPad|iPod/i.test(navigator.userAgent)}
  function canPick(){
    const v=$("player");
    return !!(v&&v.setSinkId)||!!(navigator.mediaDevices&&navigator.mediaDevices.selectAudioOutput);
  }
  function fillSelect(sel, selected, extraLabel){
    if(!sel)return;
    const opts=["<option value=''>System default</option>"];
    outputs.forEach(d=>{
      const label=d.label||"Bluetooth device";
      opts.push("<option value='"+d.deviceId+"'"+(selected===d.deviceId?" selected":"")+">"+label+"</option>");
    });
    sel.innerHTML=opts.join("");
    if(selected)sel.value=selected;
    if(extraLabel&&!outputs.some(d=>d.deviceId===selected)&&selected){
      const o=document.createElement("option");
      o.value=selected;o.textContent=extraLabel;o.selected=true;
      sel.appendChild(o);
    }
  }
  async function listOutputs(){
    if(!navigator.mediaDevices||!navigator.mediaDevices.enumerateDevices)return [];
    try{
      const all=await navigator.mediaDevices.enumerateDevices();
      outputs=all.filter(d=>d.kind==="audiooutput");
    }catch(e){outputs=[]}
    fillSelect($("out1"), localStorage.getItem(LS1)||"");
    fillSelect($("out2"), localStorage.getItem(LS2)||"");
    return outputs;
  }
  async function chooseOne(which){
    try{
      if(navigator.mediaDevices&&navigator.mediaDevices.selectAudioOutput){
        const dev=await navigator.mediaDevices.selectAudioOutput();
        if(!dev)return;
        if(!outputs.some(d=>d.deviceId===dev.deviceId))outputs.push({deviceId:dev.deviceId,label:dev.label,kind:"audiooutput"});
        const sel=$(which==="2"?"out2":"out1");
        fillSelect(sel, dev.deviceId, dev.label||"Selected device");
        sel.value=dev.deviceId;
        localStorage.setItem(which==="2"?LS2:LS1, dev.deviceId);
        await applyOutputs();
        note((dev.label||"Device")+" set as headphone "+which);
        return;
      }
    }catch(e){
      if(e&&e.name==="NotAllowedError")return note("Audio output picker was dismissed");
    }
    await listOutputs();
    if(!outputs.length)note(isiPhone()?"iPhone Safari cannot pick Bluetooth from a webpage. Use Share Audio below.":"No extra audio outputs found. Connect AirPods, then tap Refresh devices.");
  }
  async function applyOutputs(){
    const video=$("player");
    const id1=($("out1")&&$("out1").value)||"";
    const id2=($("out2")&&$("out2").value)||"";
    if($("out1"))localStorage.setItem(LS1,id1);
    if($("out2"))localStorage.setItem(LS2,id2);
    try{if(video&&video.setSinkId)await video.setSinkId(id1||"")}catch(e){note("Could not move video audio: "+(e.message||e))}
    try{if(window.ctx&&window.ctx.setSinkId)await window.ctx.setSinkId(id1||"")}catch(e){}
    let extra=$("playerTwin");
    const wantSecond=id2&&id2!==id1;
    if(wantSecond&&video&&video.captureStream){
      if(!extra){
        extra=document.createElement("audio");
        extra.id="playerTwin";
        extra.setAttribute("playsinline","");
        extra.style.display="none";
        document.body.appendChild(extra);
        video.addEventListener("play",()=>{if(extra.srcObject)extra.play().catch(()=>{})});
        video.addEventListener("pause",()=>{try{extra.pause()}catch(e){}});
      }
      if(!extra.srcObject){try{extra.srcObject=video.captureStream()}catch(e){}}
      try{if(extra.setSinkId)await extra.setSinkId(id2)}catch(e){note("Second headphone not available in this browser")}
      extra.volume=video.volume;
      if(!video.paused)extra.play().catch(()=>{});
    }else if(extra){
      try{extra.pause();extra.srcObject=null}catch(e){}
    }
  }
  function showHelp(){
    const help=$("audioHelp");
    if(!help)return;
    if(isiPhone())help.textContent="iPhone cannot pick AirPods from a website. Use Control Center, Share Audio, then pick the second pair.";
    else if(canPick())help.textContent="Pick Headphone 1 and Headphone 2, then tap Apply.";
    else help.textContent="This browser uses the system output.";
  }
  function boot(){
    showHelp();
    listOutputs();
    if($("outRefresh"))$("outRefresh").onclick=async function(){
      if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){
        try{const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(t=>t.stop())}catch(e){}
      }
      const list=await listOutputs();
      note(list.length?list.length+" output devices found":"No named outputs yet.");
    };
    if($("outPick1"))$("outPick1").onclick=function(){chooseOne("1")};
    if($("outPick2"))$("outPick2").onclick=function(){chooseOne("2")};
    if($("outApply"))$("outApply").onclick=function(){applyOutputs().then(function(){note("Audio output updated")})};
    if($("out1"))$("out1").onchange=applyOutputs;
    if($("out2"))$("out2").onchange=applyOutputs;
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
