'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const SRC=fs.readFileSync(path.join(ROOT,'govee-client.js'),'utf8');

function boot(fetchImpl){
  const calls=[];
  let t=Date.now();
  const bag={'govee-api-key':'secret-key-value'};
  const note={textContent:''};
  global.localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(bag,k)?bag[k]:null,setItem:(k,v)=>{bag[k]=String(v)}};
  global.document={getElementById:id=>id==='goveeThrottleNote'?note:null,createElement:()=>note,body:{appendChild(){}}};
  global.fetch=async()=>({ok:true,status:200,text:async()=>'{"code":200}'});
  global.window=global;
  eval(SRC);
  window.CJGovee.setClock(()=>t);
  window.CJGovee.setSleeper(ms=>{t+=ms});
  window.CJGovee.setSync(true);
  window.CJGovee._send=function(body,job){calls.push({body:JSON.parse(body),at:t});if(fetchImpl){let r=fetchImpl(calls);job.status=r.status}};
  return {calls,bag,note,set:n=>{t=n}};
}
const dev=i=>({device:'AA:BB:CC:DD:EE:FF:00:'+String(i).padStart(2,'0'),sku:'H6008'});

test('Q1 account cap stays at 8 starts per second',async()=>{
  const {calls}=boot();
  let jobs=[];
  for(let i=0;i<20;i++)jobs.push(window.CJGovee.control(dev(i%10),{type:'t',instance:'colorRgb',value:i},{slotKey:'colorRgb'}));
  await Promise.all(jobs);
  window.CJGovee.flush();
  for(let i=0;i<calls.length;i++){
    let windowed=calls.filter(c=>c.at>=calls[i].at&&c.at<calls[i].at+1000);
    assert.ok(windowed.length<=8,windowed.length);
  }
});
test('Q2 per-device floor is 550 ms',async()=>{
  const {calls}=boot();
  await window.CJGovee.control(dev(1),{instance:'colorRgb',value:1,type:'t'},{slotKey:'a'});
  window.CJGovee.flush();
  await window.CJGovee.control(dev(1),{instance:'brightness',value:2,type:'t'},{slotKey:'b'});
  window.CJGovee.flush();
  assert.ok(calls[1].at-calls[0].at>=550);
});
test('Q4 ten offers in one window send the last color once',async()=>{
  const {calls}=boot();
  let ps=[];
  for(let i=0;i<10;i++)ps.push(window.CJGovee.control(dev(1),{instance:'colorRgb',value:i,type:'t'},{slotKey:'colorRgb'}));
  await Promise.all(ps);
  window.CJGovee.flush();
  assert.equal(calls.length,1);
  assert.equal(calls[0].body.payload.capability.value,9);
});
test('Q5 a 429 backs off that device only',async()=>{
  let n=0;
  const {calls}=boot(()=>n++===0?{ok:false,status:429,text:async()=>'{"code":429}'}:{ok:true,status:200,text:async()=>'{"code":200}'});
  await window.CJGovee.control(dev(1),{instance:'colorRgb',value:1,type:'t'},{slotKey:'colorRgb'}).catch(()=>{});
  window.CJGovee.flush();
  await window.CJGovee.control(dev(2),{instance:'colorRgb',value:2,type:'t'},{slotKey:'colorRgb'});
  window.CJGovee.flush();
  await window.CJGovee.control(dev(1),{instance:'colorRgb',value:3,type:'t'},{slotKey:'colorRgb'});
  window.CJGovee.flush();
  let a=calls.filter(c=>c.body.payload.device===dev(1).device);
  assert.ok(a.length>=2);
  assert.ok(a[1].at-a[0].at>=7500);
});
test('Q6 throttle note after a 429',async()=>{
  const {note}=boot(()=>({ok:false,status:429,text:async()=>'{"code":429}'}));
  await window.CJGovee.control(dev(1),{instance:'colorRgb',value:1,type:'t'},{slotKey:'colorRgb'}).catch(()=>{});
  window.CJGovee.flush();
  assert.match(note.textContent,/Lights throttled/);
});
test('Q7 daily counter warns and still sends',async()=>{
  const {bag,calls}=boot();
  bag.cj_govee_budget_v1=JSON.stringify({date:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(new Date()),count:9499});
  await window.CJGovee.control(dev(1),{instance:'colorRgb',value:1,type:'t'},{slotKey:'colorRgb'});
  window.CJGovee.flush();
  assert.ok(window.CJGovee.stats().daily>=9500);
  assert.equal(window.CJGovee.stats().warning,true);
  assert.equal(calls.length,1);
  await window.CJGovee.control(dev(1),{instance:'powerSwitch',value:0,type:'devices.capabilities.on_off'},{slotKey:'powerSwitch',lane:'off'});
  window.CJGovee.flush();
  assert.ok(calls.some(c=>c.body.payload.capability.value===0));
});
test('Q8 soft cap keeps 8 full plans',()=>{
  boot();
  let plans=window.CJGovee.planSpecials(Array.from({length:10},(_,i)=>({id:'d'+i})));
  assert.equal(plans.filter(p=>p.plan==='full').length,8);
  assert.equal(plans.filter(p=>p.plan==='main1').length,2);
});
test('Q9 Govee host fetch only in the client',()=>{
  for(const f of fs.readdirSync(ROOT).filter(x=>x.endsWith('.js'))){
    let src=fs.readFileSync(path.join(ROOT,f),'utf8');
    if(f==='govee-client.js')assert.match(src,/fetch\(API/);
    else assert.ok(!/fetch\([^)]*openapi\.api\.govee\.com/.test(src),f);
  }
});
test('Q10 logs omit the key and the full device id',async()=>{
  boot();
  await window.CJGovee.control(dev(1),{instance:'colorRgb',value:1,type:'t'},{slotKey:'colorRgb'});
  window.CJGovee.flush();
  let raw=JSON.stringify(window.CJGovee.stats());
  assert.ok(!raw.includes('secret-key-value'));
  assert.ok(!raw.includes(dev(1).device));
});
