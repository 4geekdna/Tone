(function(){
  const API="https://openapi.api.govee.com/router/api/v1";
  const API_OLD="https://developer-api.govee.com/v1";
  const LS_KEY="govee-api-key";
  const LS_NAMES="govee-custom-names";
  const LS_SELECTED="govee-selected";
  const LS_PICKED="cj_govee_picked";
  let devices=[],picked={},names={},busy=false,last=-1,lastError="",loading=false;

  const $=id=>document.getElementById(id);
  function journeyOn(){const b=$("play");return !!(b&&b.textContent==="Running")}
  function line(msg){const el=$("status");if(el)el.textContent=msg}
  function box(msg){const el=$("goveeList");if(el)el.textContent=msg}
  function key(){
    const typed=((($("goveeKey")||{}).value)||"").trim();
    const saved=(localStorage.getItem(LS_KEY)||"").trim();
    return typed||saved;
  }
  function uuid(){
    if(crypto.randomUUID)return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(c){
      const r=Math.random()*16|0;
      return (c==="x"?r:(r&3|8)).toString(16);
    });
  }
  function hexInt(hex){return parseInt(String(hex||"#ffffff").replace("#",""),16)}
  function canColor(d){
    const caps=d.capabilities||[];
    if(caps.some(c=>c&&(c.instance==="colorRgb"||c.instance==="color")))return true;
    return (d.supportCmds||[]).indexOf("color")>=0;
  }
  function idOf(d){return d.device||d.sku||d.model}
  function nameOf(d){return names[idOf(d)]||d.deviceName||d.sku||d.model||"Light"}
  function savePicked(){try{localStorage.setItem(LS_PICKED,JSON.stringify(picked))}catch(e){}}

  async function request(url,options){
    const k=key();
    if(!k)throw new Error("Enter your Govee API key first");
    const ctrl=new AbortController();
    const timer=setTimeout(function(){ctrl.abort()},12000);
    try{
      const res=await fetch(url,Object.assign({},options,{
        signal:ctrl.signal,
        headers:Object.assign({"Govee-API-Key":k,"Content-Type":"application/json"},options&&options.headers||{})
      }));
      let body=null;
      try{body=await res.json()}catch(e){}
      if(!res.ok)throw new Error((body&&(body.message||body.msg))||("Govee HTTP "+res.status));
      if(body&&body.code&&body.code!==200)throw new Error(body.message||body.msg||("Govee code "+body.code));
      return body||{};
    }catch(e){
      if(e&&e.name==="AbortError")throw new Error("Govee did not answer in 12 seconds. Try again, or load lights in Govee Control first.");
      if(String(e.message||e).indexOf("Failed to fetch")>=0||String(e.message||e).indexOf("NetworkError")>=0){
        throw new Error("Phone could not reach Govee. Same key works in Govee Control? Open that app, connect, then come back.");
      }
      throw e;
    }finally{
      clearTimeout(timer);
    }
  }

  async function fetchDevices(){
    try{
      const result=await request(API+"/user/devices",{method:"GET"});
      const list=Array.isArray(result.data)?result.data:(result.data&&result.data.devices)||[];
      if(list.length)return list;
      lastError="Govee returned zero devices for this key.";
    }catch(e){lastError=e.message}
    const old=await request(API_OLD+"/devices",{method:"GET"});
    const list=(old.data&&old.data.devices)||old.data||[];
    return (list||[]).map(function(d){
      return {sku:d.sku||d.model,device:d.device,deviceName:d.deviceName,supportCmds:d.supportCmds||[],capabilities:d.capabilities||[]};
    });
  }

  async function control(device,capability){
    await request(API+"/device/control",{method:"POST",body:JSON.stringify({
      requestId:uuid(),
      payload:{sku:device.sku,device:device.device,capability}
    })});
  }
  function targets(){return devices.filter(d=>picked[idOf(d)])}
  function render(){
    const el=$("goveeList");
    if(!el)return;
    if(!devices.length){el.textContent=lastError||"No Govee devices returned for this key.";return}
    el.innerHTML=devices.map(d=>{
      const id=idOf(d);
      const rgb=canColor(d)?"RGB":"no color";
      return '<label style="display:flex;gap:8px;align-items:center;margin:6px 0;color:#ddd"><input type="checkbox" data-govee="'+id+'" '+(picked[id]?"checked":"")+"> '+nameOf(d)+' <span style="color:#888">'+(d.sku||"")+' · '+rgb+"</span></label>";
    }).join("");
    el.querySelectorAll("[data-govee]").forEach(function(cb){
      cb.onchange=function(){
        if(cb.checked)picked[cb.dataset.govee]=true;
        else delete picked[cb.dataset.govee];
        savePicked();
      };
    });
  }
  async function loadLights(ev){
    if(ev){if(ev.preventDefault)ev.preventDefault();if(ev.stopPropagation)ev.stopPropagation()}
    if(loading){box("Still talking to Govee…");return}
    const k=key();
    box(k.length<8?"Paste the Govee API key in the box above.":"Tapped Load Lights. Calling Govee…");
    line(k.length<8?"Govee key missing":"Loading Govee lights");
    if(k.length<8)return;
    if($("goveeKey"))$("goveeKey").value=k;
    loading=true;
    if($("goveeLoad"))$("goveeLoad").disabled=true;
    try{
      localStorage.setItem(LS_KEY,k);
      try{names=JSON.parse(localStorage.getItem(LS_NAMES)||"{}")}catch(e){names={}}
      lastError="";
      devices=await fetchDevices();
      let saved={};
      try{saved=JSON.parse(localStorage.getItem(LS_PICKED)||"{}")}catch(e){}
      if(!Object.keys(saved).length){
        try{saved=JSON.parse(localStorage.getItem(LS_SELECTED)||"{}")}catch(e){}
      }
      picked=saved;
      if(!Object.keys(picked).length)devices.forEach(d=>picked[idOf(d)]=true);
      savePicked();
      render();
      const rgb=devices.filter(canColor).length;
      line(devices.length+" Govee device"+(devices.length===1?"":"s")+" · "+rgb+" RGB");
    }catch(e){
      lastError=e.message||"Could not load Govee lights";
      box(lastError);
      line(lastError);
    }finally{
      loading=false;
      if($("goveeLoad"))$("goveeLoad").disabled=false;
    }
  }
  async function follow(i){
    if(!journeyOn())return;
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
    line(C[i][0]+" lights · "+hex);
    try{
      await Promise.all(list.map(async function(d){
        try{await control(d,{type:"devices.capabilities.on_off",instance:"powerSwitch",value:1})}catch(e){}
        try{await control(d,{type:"devices.capabilities.range",instance:"brightness",value:bright})}catch(e){}
        if(canColor(d))await control(d,{type:"devices.capabilities.color_setting",instance:"colorRgb",value:rgb});
      }));
    }catch(e){
      line("Govee: "+(e.message||"color failed"));
    }finally{
      busy=false;
      if(last!==i&&$("goveeOn")&&$("goveeOn").checked)follow(last);
    }
  }
  async function allOff(){
    const list=targets().length?targets():devices;
    line("Turning Govee lights off");
    try{
      await Promise.all(list.map(d=>control(d,{type:"devices.capabilities.on_off",instance:"powerSwitch",value:0}).catch(function(){})));
      line("Govee lights off");
    }catch(e){line(e.message||"Could not turn lights off")}
  }

  window.goveeFollow=follow;
  window.goveeLoadLights=loadLights;
  window.goveeAllOff=allOff;

  function bind(){
    const loadBtn=$("goveeLoad");
    if(loadBtn&&!loadBtn._goveeBound){
      loadBtn._goveeBound=true;
      loadBtn.type="button";
      loadBtn.addEventListener("click",loadLights,true);
    }
    const offBtn=$("goveeOff");
    if(offBtn&&!offBtn._goveeBound){
      offBtn._goveeBound=true;
      offBtn.type="button";
      offBtn.addEventListener("click",allOff,true);
    }
  }
  function boot(){
    const keyEl=$("goveeKey");
    const saved=localStorage.getItem(LS_KEY);
    if(keyEl&&saved)keyEl.value=saved;
    if(localStorage.getItem("cj_goveeOn")==="0"&&$("goveeOn"))$("goveeOn").checked=false;
    bind();
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
    document.addEventListener("click",function(e){
      const t=e.target&&e.target.closest?e.target.closest("#goveeLoad,#goveeOff"):null;
      if(!t)return;
      if(t.id==="goveeLoad")loadLights(e);
      if(t.id==="goveeOff")allOff(e);
    },true);
    if(typeof current==="function"&&!current._goveeWrapped){
      const orig=current;
      window.current=function(i,d){
        orig(i,d);
        if(journeyOn()&&i>=0)follow(i);
      };
      window.current._goveeWrapped=true;
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
