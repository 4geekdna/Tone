(function(){
  const API_NEW="https://openapi.api.govee.com/router/api/v1";
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
    if(caps.some(function(c){return c&&(c.instance==="colorRgb"||c.instance==="color")}))return true;
    return (d.supportCmds||[]).indexOf("color")>=0;
  }
  function idOf(d){return d.device||d.sku||d.model}
  function nameOf(d){return names[idOf(d)]||d.deviceName||d.sku||d.model||"Light"}
  function savePicked(){try{localStorage.setItem(LS_PICKED,JSON.stringify(picked))}catch(e){}}
  function normalize(list){
    return (list||[]).map(function(d){
      return {sku:d.sku||d.model,device:d.device,deviceName:d.deviceName,supportCmds:d.supportCmds||[],capabilities:d.capabilities||[]};
    }).filter(function(d){return d.device||d.sku});
  }
  function merge(a,b){
    const map={};
    a.concat(b).forEach(function(d){
      const id=idOf(d);
      if(!id)return;
      if(!map[id])map[id]=d;
      else {
        if((d.capabilities||[]).length>(map[id].capabilities||[]).length)map[id].capabilities=d.capabilities;
        if(!map[id].deviceName&&d.deviceName)map[id].deviceName=d.deviceName;
      }
    });
    return Object.keys(map).map(function(k){return map[k]});
  }

  async function request(url,options,ms){
    const k=key();
    if(!k)throw new Error("Enter your Govee API key first");
    const ctrl=new AbortController();
    const timer=setTimeout(function(){ctrl.abort()},ms||15000);
    const method=(options&&options.method)||"GET";
    try{
      const res=await fetch(url,{
        method:method,
        signal:ctrl.signal,
        headers:{"Content-Type":"application/json","Govee-API-Key":k},
        body:options&&options.body
      });
      const text=await res.text();
      let body=null;
      if(text){try{body=JSON.parse(text)}catch(e){body={raw:text}}}
      if(!res.ok){
        const msg=(body&&(body.message||body.msg))||("Govee HTTP "+res.status);
        throw new Error(msg+(res.status===401?" — key rejected":res.status===429?" — rate limited":""));
      }
      if(body&&body.code&&body.code!==200)throw new Error(body.message||body.msg||("Govee code "+body.code));
      return body||{};
    }catch(e){
      if(e&&e.name==="AbortError")throw new Error("Timed out talking to "+url.split("/")[2]);
      throw e;
    }finally{clearTimeout(timer)}
  }

  async function getNew(){
    const result=await request(API_NEW+"/user/devices",{method:"GET"},15000);
    const list=Array.isArray(result.data)?result.data:(result.data&&result.data.devices)||[];
    return normalize(list);
  }
  async function getOld(){
    const old=await request(API_OLD+"/devices",{method:"GET"},15000);
    const list=(old.data&&old.data.devices)||old.data||[];
    return normalize(list);
  }

  async function fetchDevices(){
    const notes=[];
    let a=[],b=[];
    box("Asking Govee for every device…");
    try{a=await getNew();notes.push("new API "+a.length)}catch(e){notes.push("new API "+(e.message||e))}
    try{b=await getOld();notes.push("classic API "+b.length)}catch(e){notes.push("classic API "+(e.message||e))}
    const list=merge(a,b);
    if(!list.length)throw new Error(notes.join(" | "));
    lastError=notes.join(" · ");
    return list;
  }

  async function control(device,capability){
    try{
      await request(API_NEW+"/device/control",{method:"POST",body:JSON.stringify({
        requestId:uuid(),payload:{sku:device.sku,device:device.device,capability}
      })},15000);
    }catch(e){
      await request(API_OLD+"/devices/control",{method:"PUT",body:JSON.stringify({
        device:device.device,model:device.sku,
        cmd:capability.instance==="powerSwitch"?{name:"turn",value:capability.value===1?"on":"off"}:
            capability.instance==="brightness"?{name:"brightness",value:capability.value}:
            {name:"color",value:{r:(capability.value>>16)&255,g:(capability.value>>8)&255,b:capability.value&255}}
      })},15000);
    }
  }
  function targets(){return devices.filter(function(d){return picked[idOf(d)]})}
  function render(){
    const el=$("goveeList");
    if(!el)return;
    if(!devices.length){el.textContent=lastError||"No Govee devices returned for this key.";return}
    var html="<div>"+devices.length+" devices</div>";
    devices.forEach(function(d){
      const id=idOf(d);
      const rgb=canColor(d)?"RGB":"on/off";
      html+="<label style='display:flex;gap:8px;align-items:center;margin:6px 0;color:#ddd'>";
      html+="<input type='checkbox' data-govee='"+id+"' "+(picked[id]?"checked":"")+"> ";
      html+=nameOf(d)+" <span style='color:#888'>"+(d.sku||"")+" · "+rgb+"</span></label>";
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
    if(ev){if(ev.preventDefault)ev.preventDefault();if(ev.stopPropagation)ev.stopPropagation()}
    if(loading){box("Still talking to Govee…");return}
    const k=key();
    box(k.length<8?"Paste the Govee API key in the box above.":"Tapped Load Lights.");
    line(k.length<8?"Govee key missing":"Loading every Govee device");
    if(k.length<8)return;
    if($("goveeKey"))$("goveeKey").value=k;
    loading=true;
    if($("goveeLoad"))$("goveeLoad").disabled=true;
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
      render();
      line(devices.length+" Govee devices loaded");
    }catch(e){
      lastError=e.message||"Could not load Govee lights";
      box(lastError);line(lastError);
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
    if(!list.length||busy)return;
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
    }catch(e){line("Govee: "+(e.message||"color failed"))}
    finally{
      busy=false;
      if(last!==i&&$("goveeOn")&&$("goveeOn").checked)follow(last);
    }
  }
  async function allOff(){
    const list=targets().length?targets():devices;
    line("Turning Govee lights off");
    try{
      await Promise.all(list.map(function(d){return control(d,{type:"devices.capabilities.on_off",instance:"powerSwitch",value:0}).catch(function(){})}));
      line("Govee lights off");
    }catch(e){line(e.message||"Could not turn lights off")}
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
    if(loadBtn){loadBtn.type="button";loadBtn.onclick=loadLights}
    const offBtn=$("goveeOff");
    if(offBtn){offBtn.type="button";offBtn.onclick=allOff}
    if($("goveeBright")&&$("goveeBrightv"))$("goveeBright").addEventListener("input",function(){$("goveeBrightv").textContent=$("goveeBright").value+"%"});
    if(keyEl)keyEl.addEventListener("change",function(){const k=keyEl.value.trim();if(k)localStorage.setItem(LS_KEY,k)});
    if($("goveeOn"))$("goveeOn").onchange=function(){localStorage.setItem("cj_goveeOn",$("goveeOn").checked?"1":"0")};
    if(typeof current==="function"&&!current._goveeWrapped){
      const orig=current;
      window.current=function(i,d){orig(i,d);if(journeyOn()&&i>=0)follow(i)};
      window.current._goveeWrapped=true;
    }
    if(key()&&key().length>=8)setTimeout(function(){loadLights()},400);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
