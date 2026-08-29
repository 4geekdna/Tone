(function(){
  const API="https://openapi.api.govee.com/router/api/v1";
  const API_OLD="https://developer-api.govee.com/v1";
  const LS_KEY="govee-api-key";
  const LS_NAMES="govee-custom-names";
  const LS_SELECTED="govee-selected";
  const LS_PICKED="cj_govee_picked";
  let devices=[],picked={},names={},busy=false,last=-1;

  const $=id=>document.getElementById(id);
  function journeyOn(){const b=$("play");return !!(b&&b.textContent==="Running")}
  function say(msg){
    const box=$("goveeList");
    if(box)box.textContent=msg;
    const line=$("status");
    if(line)line.textContent=msg;
  }
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
    const cmds=d.supportCmds||[];
    return cmds.indexOf("color")>=0;
  }
  function idOf(d){return d.device||d.sku||d.model}
  function nameOf(d){return names[idOf(d)]||d.deviceName||d.sku||d.model||"Light"}
  function savePicked(){try{localStorage.setItem(LS_PICKED,JSON.stringify(picked))}catch(e){}}

  async function request(url,options){
    const k=key();
    if(!k)throw new Error("Enter your Govee API key first");
    const res=await fetch(url,Object.assign({},options,{
      headers:Object.assign({"Govee-API-Key":k,"Content-Type":"application/json"},options&&options.headers||{})
    }));
    let body=null;
    try{body=await res.json()}catch(e){}
    if(!res.ok){
      throw new Error((body&&(body.message||body.msg))||("Govee HTTP "+res.status));
    }
    if(body&&body.code&&body.code!==200){
      throw new Error(body.message||body.msg||("Govee code "+body.code));
    }
    return body||{};
  }

  async function fetchDevices(){
    try{
      const result=await request(API+"/user/devices",{method:"GET"});
      const list=Array.isArray(result.data)?result.data:(result.data&&result.data.devices)||[];
      if(list.length)return list;
    }catch(e){
      lastError=e.message;
    }
    const old=await request(API_OLD+"/devices",{method:"GET"});
    const list=(old.data&&old.data.devices)||old.data||[];
    return (list||[]).map(function(d){
      return {
        sku:d.sku||d.model,
        device:d.device,
        deviceName:d.deviceName,
        supportCmds:d.supportCmds||[],
        capabilities:d.capabilities||[]
      };
    });
  }

  let lastError="";
  async function control(device,capability){
    await request(API+"/device/control",{method:"POST",body:JSON.stringify({
      requestId:uuid(),
      payload:{sku:device.sku,device:device.device,capability}
    })});
  }
  function targets(){return devices.filter(d=>picked[idOf(d)])}
  function render(){
    const box=$("goveeList");
    if(!box)return;
    if(!devices.length){
      box.textContent=lastError||"No Govee devices returned for this key.";
      return;
    }
    box.innerHTML=devices.map(d=>{
      const id=idOf(d);
      const rgb=canColor(d)?"RGB":"no color";
      return '<label style="display:flex;gap:8px;align-items:center;margin:6px 0;color:#ddd"><input type="checkbox" data-govee="'+id+'" '+(picked[id]?"checked":"")+"> '+nameOf(d)+' <span style="color:#888">'+(d.sku||"")+' · '+rgb+"</span></label>";
    }).join("");
    box.querySelectorAll("[data-govee]").forEach(el=>{
      el.onchange=function(){
        if(el.checked)picked[el.dataset.govee]=true;
        else delete picked[el.dataset.govee];
        savePicked();
      };
    });
  }
  async function loadLights(ev){
    if(ev&&ev.preventDefault)ev.preventDefault();
    const k=key();
    if(k.length<8){
      say("Paste your Govee API key above, then tap Load Lights.");
      return;
    }
    if($("goveeKey"))$("goveeKey").value=k;
    if($("goveeLoad"))$("goveeLoad").disabled=true;
    say("Loading lights from Govee…");
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
      say(devices.length+" Govee device"+(devices.length===1?"":"s")+" loaded · "+rgb+" can change color");
    }catch(e){
      lastError=e.message||"Could not load Govee lights";
      say(lastError+("/user/devices failed. Check the key and that this phone can reach Govee."));
    }finally{
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
    say(C[i][0]+" lights · "+hex);
    try{
      await Promise.all(list.map(async function(d){
        try{await control(d,{type:"devices.capabilities.on_off",instance:"powerSwitch",value:1})}catch(e){}
        try{await control(d,{type:"devices.capabilities.range",instance:"brightness",value:bright})}catch(e){}
        if(canColor(d))await control(d,{type:"devices.capabilities.color_setting",instance:"colorRgb",value:rgb});
      }));
    }catch(e){
      say("Govee: "+(e.message||"color failed"));
    }finally{
      busy=false;
      if(last!==i&&$("goveeOn")&&$("goveeOn").checked)follow(last);
    }
  }
  async function allOff(){
    const list=targets().length?targets():devices;
    say("Turning Govee lights off");
    try{
      await Promise.all(list.map(d=>control(d,{type:"devices.capabilities.on_off",instance:"powerSwitch",value:0}).catch(function(){})));
      say("Govee lights off");
    }catch(e){
      say(e.message||"Could not turn lights off");
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
    const loadBtn=$("goveeLoad");
    if(loadBtn){
      loadBtn.type="button";
      loadBtn.addEventListener("click",loadLights);
    }
    const offBtn=$("goveeOff");
    if(offBtn){
      offBtn.type="button";
      offBtn.addEventListener("click",allOff);
    }
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
