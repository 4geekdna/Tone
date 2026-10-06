(function(){
'use strict';
const API='https://openapi.api.govee.com/router/api/v1';
const LS_KEY='govee-api-key';
const LS_BUDGET='cj_govee_budget_v1';
const DEVICE_GAP=550, ACCOUNT_GAP=125, BACKOFF=7500, PAUSE_MS=10000, SOFT=8;
let queue=[], log=[], pumping=false, lastAccount=0, lastDevice={}, backoffUntil={}, recent429=[], pauseUntil=0, throttled=false, syncMode=false;
let clock=function(){return Date.now()};
let sleeper=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
function now(){return clock()}
function ptDate(t){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t))}catch(e){return new Date(t).toISOString().slice(0,10)}}
function budget(){let b={};try{b=JSON.parse(localStorage.getItem(LS_BUDGET)||'{}')}catch(e){}if(b.date!==ptDate(now()))b={date:ptDate(now()),count:0};return b}
function saveBudget(b){try{localStorage.setItem(LS_BUDGET,JSON.stringify(b))}catch(e){}}
function bump(){let b=budget();b.count=(b.count||0)+1;saveBudget(b);return b.count}
function suffix(id){return String(id||'').replace(/[^A-Za-z0-9]/g,'').slice(-4)}
function pushLog(e){log.push(e);if(log.length>200)log.shift()}
function key(){let el=document.getElementById&&document.getElementById('goveeKey');return (((el&&el.value)||localStorage.getItem(LS_KEY)||'')+'').trim()}
function note(){throttled=true;if(!document.getElementById)return;let el=document.getElementById('goveeThrottleNote');if(!el){let host=document.getElementById('goveeList');el=document.createElement('div');el.id='goveeThrottleNote';if(host&&host.parentNode)host.parentNode.insertBefore(el,host.nextSibling);else document.body.appendChild(el)}el.textContent='Lights throttled by Govee; some update slower.'}
function delay(job){if(job.off)return 0;let t=now();if(pauseUntil>t)return pauseUntil-t;let floor=backoffUntil[job.id]>t?BACKOFF:DEVICE_GAP;return Math.max(0,lastAccount+ACCOUNT_GAP-t,(lastDevice[job.id]||0)+floor-t)}
async function request(path,opts){
  opts=opts||{};
  let k=key();
  if(!k)throw Error('Enter your Govee API key first');
  let started=now();
  let r=await fetch(API+path,{method:opts.method||'GET',headers:{'Content-Type':'application/json','Govee-API-Key':k},body:opts.body});
  let ms=now()-started,t=await r.text(),b={};
  try{b=JSON.parse(t)}catch(e){}
  pushLog({t:started,dev:suffix(opts.deviceId),instance:opts.instance||path,ms:ms,status:r.status,dropped:false});
  bump();
  if(r.status===429||b.code===429){let err=Error(b.message||'HTTP 429');err.status=429;throw err}
  if(!r.ok||(b.code&&b.code!==200))throw Error(b.message||b.msg||('Govee HTTP '+r.status));
  return b;
}
function control(device,capability,opts){
  opts=opts||{};
  let id=device&&(device.device||device.sku)||'';
  let slotKey=opts.slotKey||(capability&&capability.instance)||'control';
  let lane=opts.lane||slotKey;
  let off=!!(capability&&capability.instance==='powerSwitch'&&capability.value===0);
  if(!off)queue=queue.filter(function(j){return !(j.id===id&&j.slotKey===slotKey)});
  let job={id:id,device:device,capability:capability,slotKey:slotKey,lane:lane,off:off};
  if(syncMode){queue.push(job);return Promise.resolve(job)}
  return new Promise(function(resolve,reject){job.resolve=resolve;job.reject=reject;queue.push(job);pump()});
}
function drainSync(){
  while(queue.length){
    queue.sort(function(a,b){return delay(a)-delay(b)});
    let job=queue[0], wait=delay(job);
    if(wait>0){sleeper(wait);continue}
    queue.shift();
    let started=now();
    lastAccount=started;lastDevice[job.id]=started;
    try{
      let body=JSON.stringify({requestId:'u',payload:{sku:job.device.sku,device:job.device.device,capability:job.capability}});
      if(window.CJGovee._send)window.CJGovee._send(body,job);
      else throw Error('sync send missing');
      bump();
      pushLog({t:started,dev:suffix(job.id),instance:job.capability&&job.capability.instance,ms:1,status:job.status||200,dropped:false});
      if(job.status===429)throw Object.assign(Error('HTTP 429'),{status:429});
    }catch(e){
      if(e.status===429||/429/.test(String(e&&e.message))){backoffUntil[job.id]=started+86400000;queue=queue.filter(function(j){return j.id!==job.id||j.off});recent429.push({t:started,id:job.id});recent429=recent429.filter(function(x){return started-x.t<5000});let ids={};recent429.forEach(function(x){ids[x.id]=1});note();if(Object.keys(ids).length>=3)pauseUntil=started+PAUSE_MS}
    }
  }
}
async function pump(){
  if(pumping)return;
  pumping=true;
  try{
    while(queue.length){
      queue.sort(function(a,b){return delay(a)-delay(b)});
      let job=queue[0], wait=delay(job);
      if(wait>0){await sleeper(wait);continue}
      queue.shift();
      let started=now();
      lastAccount=started;
      lastDevice[job.id]=started;
      try{
        let body=JSON.stringify({requestId:(crypto.randomUUID?crypto.randomUUID():String(started)),payload:{sku:job.device.sku,device:job.device.device,capability:job.capability}});
        let res=await request('/device/control',{method:'POST',body:body,deviceId:job.id,instance:job.capability&&job.capability.instance});
        job.resolve(res);
      }catch(e){
        if(e.status===429||/429/.test(String(e&&e.message))){
          backoffUntil[job.id]=started+24*3600*1000;
          queue=queue.filter(function(j){return j.id!==job.id||j.off});
          recent429.push({t:started,id:job.id});
          recent429=recent429.filter(function(x){return started-x.t<5000});
          let ids={};recent429.forEach(function(x){ids[x.id]=1});
          note();
          if(Object.keys(ids).length>=3)pauseUntil=started+PAUSE_MS;
          job.reject(e);
        }else job.reject(e);
      }
    }
  }finally{pumping=false;if(queue.length)pump()}
}
function stats(){
  let ms=log.map(function(e){return e.ms}).sort(function(a,b){return a-b});
  function pct(p){if(!ms.length)return 0;return ms[Math.min(ms.length-1,Math.floor((ms.length-1)*p))]}
  let per={};log.forEach(function(e){per[e.dev]=(per[e.dev]||0)+1});
  return {p50:pct(.5),p95:pct(.95),perDevice:per,r429:log.filter(function(e){return e.status===429}).length,backedOff:Object.keys(backoffUntil),daily:budget().count,throttled:throttled,log:log.slice(),warning:budget().count>=9000};
}
function planSpecials(list){
  let full=list.slice(0,SOFT).map(function(d){return {id:d.id||d.device,plan:'full'}});
  let rest=list.slice(SOFT).map(function(d){return {id:d.id||d.device,plan:'main1'}});
  return full.concat(rest);
}
window.CJGovee={request:request,control:control,stats:stats,planSpecials:planSpecials,flush:drainSync,setClock:function(fn){if(fn)clock=fn},setSleeper:function(fn){if(fn)sleeper=fn},setSync:function(v){syncMode=!!v},API:API};
})();
