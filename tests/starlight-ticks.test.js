'use strict';
/* v0.51: the star projector step only drives projectors ticked in Govee Lights. No real Govee calls. node --test tests/ */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const RUNTIME=fs.readFileSync(path.join(ROOT,'govee-chakra-runtime.js'),'utf8');
const STAR=fs.readFileSync(path.join(ROOT,'govee-starlight-chakra.js'),'utf8');

const proj=(device,sku,name)=>({deviceName:name,name,sku,device,capabilities:[
  {type:'devices.capabilities.on_off',instance:'powerSwitch'},
  {type:'devices.capabilities.range',instance:'brightness'},
  {type:'devices.capabilities.color_setting',instance:'colorRgb'}],dynamicScenes:[{name:'Galaxy',value:7,type:'devices.capabilities.dynamic_scene',instance:'lightScene'}],diyScenes:[]});
const P1=proj('AA:BB:CC:DD:EE:FF:00:01','H6094','Bedroom Projector');
const P2=proj('AA:BB:CC:DD:EE:FF:00:02','H6093','Office Galaxy');
const LAMP={deviceName:'Desk Lamp',sku:'H6008',device:'11:22:33:44:55:66:77:88',capabilities:[]};

function env(bag,{runtime=true}={}){
  const calls=[],els={};
  const store={getItem:k=>Object.prototype.hasOwnProperty.call(bag,k)?bag[k]:null,setItem:(k,v)=>{bag[k]=String(v)},removeItem:k=>{delete bag[k]}};
  const win={addEventListener(){},dispatchEvent(){}};
  const ctx={window:win,localStorage:store,console,JSON,Promise,Array,Object,String,Number,Math,Error,Date,
    CustomEvent:function(t){this.type=t},
    crypto:{randomUUID:()=>'u-'+calls.length},
    setTimeout:fn=>{fn();return 0},clearTimeout(){},
    document:{readyState:'complete',getElementById:id=>els[id]||null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({})},
    fetch:async(url,o)=>{calls.push({url,body:JSON.parse(o.body),headers:o.headers});return{ok:true,status:200,json:async()=>({code:200}),text:async()=>'{"code":200}'}}};
  win.window=win;Object.assign(win,{localStorage:store,document:ctx.document});
  vm.createContext(ctx);
  // scripts set globals on `window`; mirror window props onto the context's global
  const run=(src,file)=>vm.runInContext('(function(window){'+src+'\n}).call(this,this.window)',ctx,{filename:file});
  ctx.window=new Proxy(win,{set(t,k,v){t[k]=v;ctx[k]=v;return true}});
  if(runtime)run(RUNTIME,'govee-chakra-runtime.js');
  run(STAR,'govee-starlight-chakra.js');
  return{ctx,win,calls,els};
}
const baseBag=picked=>({
  cj_govee_capability_report:JSON.stringify({at:'2026-10-05T00:00:00Z',reports:[P1,P2,LAMP]}),
  cj_govee_devices:JSON.stringify([P1,P2,LAMP].map(d=>({sku:d.sku,device:d.device,deviceName:d.deviceName,capabilities:d.capabilities}))),
  cj_govee_picked:JSON.stringify(picked)
});

test('runtime exposes the tick selection with the same idOf (device id) as targets()',()=>{
  const {win}=env(baseBag({[P1.device]:true,[LAMP.device]:true}),{runtime:true});
  assert.equal(typeof win.goveeIsPicked,'function');
  assert.equal(win.goveeIsPicked(P1),true);
  assert.equal(win.goveeIsPicked(P1.device),true);
  assert.equal(win.goveeIsPicked(P2),false);
  assert.deepEqual([...win.goveePickedIds()].sort(),[P1.device,LAMP.device].sort());
});

test('2 projectors in the capability report, 1 ticked: apply() only sends to the ticked one',async()=>{
  const {win,calls}=env(baseBag({[P1.device]:true,[LAMP.device]:true}));
  assert.equal(win.CJStarlight.candidates().length,2,'both projectors are still detected');
  const used=await win.CJStarlight.apply(3);
  assert.equal(used.length,1);
  assert.equal(used[0].device,'Bedroom Projector');
  assert.ok(calls.length>0,'the ticked projector got commands');
  for(const c of calls){
    assert.equal(c.url,'https://openapi.api.govee.com/router/api/v1/device/control');
    assert.equal(c.body.payload.device,P1.device);
    assert.equal(c.body.payload.sku,'H6094');
  }
  assert.ok(!calls.some(c=>c.body.payload.device===P2.device),'unticked projector got no commands');
  // same commands as before: power on, brightness, colour, then the scene
  assert.deepEqual(calls.map(c=>c.body.payload.capability.instance),['powerSwitch','lightScene']);
});

test('nothing ticked: apply() sends nothing and does not write the status line',async()=>{
  const {win,calls,els}=env(baseBag({[LAMP.device]:true}));
  els.status={textContent:'5 lights → Heart #00ff00'};
  await assert.rejects(win.CJStarlight.apply(0),/No ticked projector — tick it in Govee Lights/);
  assert.equal(calls.length,0);
  assert.equal(els.status.textContent,'5 lights → Heart #00ff00');
});

test('falls back to the stored ticks (cj_govee_picked) if the runtime has not loaded yet',async()=>{
  const {win,calls}=env(baseBag({[P2.device]:true}),{runtime:false});
  const used=await win.CJStarlight.apply(5);
  assert.equal(used.length,1);
  assert.ok(calls.length>0&&calls.every(c=>c.body.payload.device===P2.device));
});

test('follow() still paints only ticked lights and then runs the (tick-filtered) projector step',async()=>{
  const {win,calls,els}=env(baseBag({[P1.device]:true,[LAMP.device]:true}));
  els.goveeKey={value:'x'.repeat(12)}; // placeholder so api() runs; fetch is stubbed
  win.C=[['Root','','','','#ff0000'],['Sacral','','','','#ff8800']];
  await win.goveeFollow(0);
  await new Promise(r=>setImmediate(r));for(let k=0;k<50;k++)await Promise.resolve();
  const devs=new Set(calls.map(c=>c.body.payload.device));
  assert.ok(devs.has(P1.device));
  assert.ok(!devs.has(LAMP.device),'a ticked device with no color is not a light');
  assert.ok(!devs.has(P2.device),'unticked projector untouched by both paths');
});
