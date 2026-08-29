(function(){
  const API="https://openapi.api.govee.com/router/api/v1";
  const LS_KEY="govee-api-key";
  const LS_NAMES="govee-custom-names";
  const LS_SELECTED="govee-selected";
  const LS_PICKED="cj_govee_picked";
  let devices=[],picked={},names={},busy=false,last=-1;

  const $=id=>document.getElementById(id);
  function uuid(){
    if(crypto.randomUUID)return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(c){
      const r=Math.random()*16|0;
      return (c==="x"?r:(r&3|8)).toString(16);
    });
  }
  function hexInt(hex){return parseInt(String(hex||"#ffffff").replace("#",""),16)}
  function canColor(d){return (d.capabilities||[]).some(c=>c.instance==="colorRgb")}
  function idOf(d){return d.device||d.sku}
  function nameOf(d){return names[idOf(d)]||d.deviceName||d.sku||"Light"}
  function savePicked(){try{localStorage.setItem(LS_PICKED,JSON.stringify(picked))}catch(e){}}

  async function api(path,options){
    const key=(($("goveeKey")||{}).value||"").trim();
    if(!key)throw new Error("Enter Govee API key");
    const res=await fetch(API+path,Object.assign({},options,{
      headers:Object.assign({"Content-Type":"application/json","Govee-API-Key":key},options&&options.headers||{})
    }));
    if(!res.ok){
      let msg="Govee "+res.status;
      try{const body=await res.json();msg=body.message||body.msg||msg}catch(e){}
      throw new Error(msg);
    }
    return res.json();
  }
  async function control(device,capability){
    await api("/device/control",{method:"POST",body:JSON.stringify({
      requestId:uuid(),
      payload:{sku:device.sku,device:device.device,capability}
    })});
  }
  function targets(){return devices.filter(d=>canColor(d)&&picked[idOf(d)])}
  function render(){
    const box=$("goveeList");
    if(!box)return;
    const list=devices.filter(canColor);
    if(!list.length){box.textContent="No RGB Govee lights found.";return}
    box.innerHTML=list.map(d=>{
      const id=idOf(d);
      return '<label style="display:flex;gap:8px;align-items:center;margin:6px 0;color:#ddd"><input type="checkbox" data-govee="'+id+'" '+(picked[id]?"checked":"")+"> '+nameOf(d)+' <span style="color:#888">'+(d.sku||"")+"</span></label>";
    }).join("");
    box.querySelectorAll("[data-govee]").forEach(el=>{
      el.onchange=function(){
        if(el.checked)picked[el.dataset.govee]=true;
        else delete picked[el.dataset.govee];
        savePicked();
      };
    });
  }
  async function loadLights(){
    const key=(($("goveeKey")||{}).value||"").trim();
    if(key.length<8){if(typeof status==="function")status("Enter a Govee API key first");return}
    if($("goveeLoad"))$("goveeLoad").disabled=true;
    try{
      localStorage.setItem(LS_KEY,key);
      try{names=JSON.parse(localStorage.getItem(LS_NAMES)||"{}")}catch(e){names={}}
      const result=await api("/user/devices");
      devices=result.data||[];
      let saved={};
      try{saved=JSON.parse(localStorage.getItem(LS_PICKED)||"{}")}catch(e){}
      if(!Object.keys(saved).length){
        try{saved=JSON.parse(localStorage.getItem(LS_SELECTED)||"{}")}catch(e){}
      }
      picked=saved;
      if(!Object.keys(picked).length)devices.filter(canColor).forEach(d=>picked[idOf(d)]=true);
      savePicked();
      render();
      if(typeof status==="function")status(devices.filter(canColor).length+" Govee lights ready");
    }catch(e){
      if(typeof status==="function")status(e.message||"Could not load Govee lights");
    }finally{
      if($("goveeLoad"))$("goveeLoad").disabled=false;
    }
  }
  async function follow(i){
    const on=$("goveeOn");
    if(!on||!on.checked)return;
    if(!window.C||i<0||!C[i])return;
    last=i;
    const list=targets();
    if(!list.length)return;
    if(busy)return;
    busy=true;
    const hex=C[i][4];
    const rgb=hexInt(hex);
    const bright=Math.max(10,Math.min(100,Number(($("goveeBright")||{}).value)||70));
    if(typeof status==="function")status(C[i][0]+" lights · "+hex);
    try{
      await Promise.all(list.map(async function(d){
        try{await control(d,{type:"devices.capabilities.on_off",instance:"powerSwitch",value:1})}catch(e){}
        try{await control(d,{type:"devices.capabilities.range",instance:"brightness",value:bright})}catch(e){}
        await control(d,{type:"devices.capabilities.color_setting",instance:"colorRgb",value:rgb});
      }));
    }catch(e){
      if(typeof status==="function")status("Govee: "+(e.message||"color failed"));
    }finally{
      busy=false;
      if(last!==i&&$("goveeOn")&&$("goveeOn").checked)follow(last);
    }
  }
  async function allOff(){
    const list=targets().length?targets():devices;
    if(typeof status==="function")status("Turning Govee lights off");
    try{
      await Promise.all(list.map(d=>control(d,{type:"devices.capabilities.on_off",instance:"powerSwitch",value:0}).catch(function(){})));
      if(typeof status==="function")status("Govee lights off");
    }catch(e){
      if(typeof status==="function")status(e.message);
    }
  }

  window.goveeFollow=follow;
  window.goveeLoadLights=loadLights;
  window.goveeAllOff=allOff;

  function boot(){
    const keyEl=$("goveeKey");
    const saved=localStorage.getItem(LS_KEY);
    if(keyEl&&saved)keyEl.value=saved;
    if(localStorage.getItem("cj_goveeOn")==="0"&&$("goveeOn"))$("goveeOn").checked=false;
    if($("goveeLoad"))$("goveeLoad").onclick=loadLights;
    if($("goveeOff"))$("goveeOff").onclick=allOff;
    if($("goveeBright")&&$("goveeBrightv")){
      $("goveeBright").addEventListener("input",function(){$("goveeBrightv").textContent=$("goveeBright").value+"%"});
    }
    if(keyEl)keyEl.addEventListener("change",function(){
      const k=keyEl.value.trim();
      if(k)localStorage.setItem(LS_KEY,k);
    });
    if($("goveeOn"))$("goveeOn").onchange=function(){
      localStorage.setItem("cj_goveeOn",$("goveeOn").checked?"1":"0");
    };
    if(saved)loadLights();

    if(typeof current==="function"&&!current._goveeWrapped){
      const orig=current;
      window.current=function(i,d){
        orig(i,d);
        if(i>=0)follow(i);
      };
      window.current._goveeWrapped=true;
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
