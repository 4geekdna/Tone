(function(){
  const API="https://openapi.api.govee.com/router/api/v1";
  const LS_KEY="govee-api-key";
  const LS_NAMES="govee-custom-names";
  const LS_SELECTED="govee-selected";
  const LS_PICKED="cj_govee_picked";
  const LS_DEVICES="cj_govee_devices";
  let devices=[],picked={},names={},busy=false,last=-1,loading=false,powered={};

  const $=id=>document.getElementById(id);
  function running(){const b=$("play");return !!(b&&b.textContent==="Running")}
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
  function idOf(d){return d.device||d.sku||d.model}
  function nameOf(d){return names[idOf(d)]||d.deviceName||d.sku||d.model||"Light"}
  function savePicked(){try{localStorage.setItem(LS_PICKED,JSON.stringify(picked))}catch(e){}}
  function saveDevices(){try{localStorage.setItem(LS_DEVICES,JSON.stringify(devices))}catch(e){}}
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
  function activeChakra(){
    const cards=document.querySelectorAll(".card");
    for(let i=0;i<cards.length;i++) if(cards[i].classList.contains("on")) return i;
    return -1;
  }
  function targets(){return devices.filter(function(d){return picked[idOf(d)]})}

  async function api(path,options){
    const k=key();
    if(!k)throw new Error("Enter your Govee API key first");
    const res=await fetch(API+path,{
      method:(options&&options.method)||"GET",
      headers:{"Content-Type":"application/json","Govee-API-Key":k},
      body:options&&options.body
    });
    const text=await res.text();
    let body=null;
    if(text){try{body=JSON.parse(text)}catch(e){body={raw:text}}}
    if(!res.ok){
      const msg=(body&&(body.message||body.msg))||("Govee HTTP "+res.status);
      throw new Error(msg);
    }
    if(body&&body.code&&body.code!==200)throw new Error(body.message||body.msg||("Govee code "+body.code));
    return body||{};
  }

  async function sendControl(device,capability){
    await api("/device/control",{method:"POST",body:JSON.stringify({
      requestId:uuid(),
      payload:{sku:device.sku,device:device.device,capability:capability}
    })});
  }

  async function fetchDevices(){
    box("Asking Govee for devices…");
    const result=await api("/user/devices");
    const list=Array.isArray(result.data)?result.data:(result.data&&result.data.devices)||[];
    return (list||[]).map(function(d){
      return {sku:d.sku||d.model,device:d.device,deviceName:d.deviceName,capabilities:d.capabilities||[]};
    }).filter(function(d){return d.device||d.sku});
  }

  function render(){
    const el=$("goveeList");
    if(!el)return;
    if(!devices.length){el.textContent="No Govee devices for this key.";return}
    var html="<div>"+devices.length+" devices. Checked ones follow chakras.</div>";
    devices.forEach(function(d){
      const id=idOf(d);
      html+="<label style='display:flex;gap:8px;align-items:center;margin:6px 0;color:#ddd'>";
      html+="<input type='checkbox' data-govee='"+id+"' "+(picked[id]?"checked":"")+"> ";
      html+=nameOf(d)+" <span style='color:#888'>"+(d.sku||"")+"</span></label>";
    });
    el.innerHTML=html;
    el.querySelectorAll("[data-govee]").forEach(function(cb){
      cb.onchange=function(){
        if(cb.checked)picked[cb.dataset.govee]=true;
        else delete picked[cb.dataset.govee];
        savePicked();
      };
    });
  }

  async function loadLights(ev){
    if(ev&&ev.preventDefault)ev.preventDefault();
    if(loading)return;
    const k=key();
    if(k.length<8){box("Paste the Govee API key in the box above.");return}
    if($("goveeKey"))$("goveeKey").value=k;
    loading=true;
    if($("goveeLoad"))$("goveeLoad").disabled=true;
    box("Tapped Load Lights.");
    try{
      localStorage.setItem(LS_KEY,k);
      try{names=JSON.parse(localStorage.getItem(LS_NAMES)||"{}")}catch(e){names={}}
      devices=await fetchDevices();
      let saved={};
      try{saved=JSON.parse(localStorage.getItem(LS_PICKED)||"{}")}catch(e){}
      if(!Object.keys(saved).length){
        try{saved=JSON.parse(localStorage.getItem(LS_SELECTED)||"{}")}catch(e){}
      }
      picked=saved;
      if(!Object.keys(picked).length)devices.forEach(function(d){picked[idOf(d)]=true});
      savePicked();
      saveDevices();
      render();
      line(devices.length+" Govee devices loaded");
      await paint(0,true);
    }catch(e){
      box(e.message||"Could not load Govee lights");
      line(e.message||"Could not load Govee lights");
    }finally{
      loading=false;
      if($("goveeLoad"))$("goveeLoad").disabled=false;
    }
  }

  async function paint(i,force){
    const on=$("goveeOn");
    if(!force&&on&&!on.checked)return;
    if(!window.C||i<0||!C[i])return;
    if(!devices.length){
      try{devices=JSON.parse(localStorage.getItem(LS_DEVICES)||"[]")}catch(e){devices=[]}
    }
    const list=targets();
    if(!list.length){
      if(force)line("No Govee lights selected. Load Lights first.");
      return;
    }
    if(busy){last=i;return}
    busy=true;
    last=i;
    const hex=C[i][4];
    const rgb=hexInt(hex);
    const bright=Math.max(10,Math.min(100,Number(($("goveeBright")||{}).value)||70));
    line("Coloring "+list.length+" lights "+C[i][0]+" "+hex);
    let ok=0,fail="";
    try{
      for(let n=0;n<list.length;n++){
        const d=list[n];
        const id=idOf(d);
        try{
          if(!powered[id]){
            await sendControl(d,{type:"devices.capabilities.on_off",instance:"powerSwitch",value:1});
            await sleep(150);
            try{await sendControl(d,{type:"devices.capabilities.range",instance:"brightness",value:bright})}catch(e){}
            await sleep(150);
            powered[id]=true;
          }
          await sendControl(d,{type:"devices.capabilities.color_setting",instance:"colorRgb",value:rgb});
          ok++;
        }catch(e){
          fail=(e&&e.message)||"color failed";
        }
        await sleep(120);
      }
      line(ok+" lights → "+C[i][0]+" "+hex+(fail?" · "+fail:""));
    }finally{
      busy=false;
      if(last!==i)paint(last,force);
    }
  }

  async function allOff(){
    const list=targets().length?targets():devices;
    line("Turning Govee lights off");
    for(let n=0;n<list.length;n++){
      try{await sendControl(list[n],{type:"devices.capabilities.on_off",instance:"powerSwitch",value:0})}catch(e){}
      powered[idOf(list[n])]=false;
      await sleep(80);
    }
    line("Govee lights off");
  }

  window.goveeFollow=function(i){return paint(i,true)};
  window.goveeLoadLights=loadLights;
  window.goveeAllOff=allOff;

  function boot(){
    const keyEl=$("goveeKey");
    const saved=localStorage.getItem(LS_KEY);
    if(keyEl&&saved)keyEl.value=saved;
    if(localStorage.getItem("cj_goveeOn")==="0"&&$("goveeOn"))$("goveeOn").checked=false;
    try{devices=JSON.parse(localStorage.getItem(LS_DEVICES)||"[]")}catch(e){devices=[]}
    try{picked=JSON.parse(localStorage.getItem(LS_PICKED)||localStorage.getItem(LS_SELECTED)||"{}")}catch(e){picked={}}
    try{names=JSON.parse(localStorage.getItem(LS_NAMES)||"{}")}catch(e){names={}}
    if(devices.length)render();
    const loadBtn=$("goveeLoad");
    if(loadBtn){loadBtn.type="button";loadBtn.onclick=loadLights}
    const offBtn=$("goveeOff");
    if(offBtn){offBtn.type="button";offBtn.onclick=allOff}
    if($("goveeBright")&&$("goveeBrightv"))$("goveeBright").addEventListener("input",function(){$("goveeBrightv").textContent=$("goveeBright").value+"%"});
    if(keyEl)keyEl.addEventListener("change",function(){const k=keyEl.value.trim();if(k)localStorage.setItem(LS_KEY,k)});
    if($("goveeOn"))$("goveeOn").onchange=function(){localStorage.setItem("cj_goveeOn",$("goveeOn").checked?"1":"0")};
    const play=$("play");
    if(play)play.addEventListener("click",function(){setTimeout(function(){const i=activeChakra();paint(i<0?0:i,true)},800)});
    setInterval(function(){
      if(!running())return;
      if($("goveeOn")&&!$("goveeOn").checked)return;
      const i=activeChakra();
      if(i>=0&&i!==last)paint(i);
    },700);
    if(key()&&key().length>=8&&!devices.length)setTimeout(function(){loadLights()},500);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
