'use strict';
/* WP0c correctness. node --test tests/govee-correct.test.js */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const RUNTIME=fs.readFileSync(path.join(ROOT,'govee-chakra-runtime.js'),'utf8');
const STAR=fs.readFileSync(path.join(ROOT,'govee-starlight-chakra.js'),'utf8');
const PRESETS=fs.readFileSync(path.join(ROOT,'journey-presets.js'),'utf8');

test('C1 Load Lights keeps type on cj_govee_devices',async()=>{
  const bag={};
  const calls=[];
  const list=[{device:'AA:BB:CC:DD:EE:FF:00:01',sku:'H6008',deviceName:'Lamp',type:'devices.types.light',capabilities:[]}];
  const els={goveeKey:{value:''},goveeList:{textContent:'',innerHTML:'',closest:()=>null,querySelectorAll:()=>[]},status:{textContent:''}};
  const store={getItem:k=>Object.prototype.hasOwnProperty.call(bag,k)?bag[k]:null,setItem:(k,v)=>{bag[k]=String(v)}};
  const win={addEventListener(){},dispatchEvent(){},CJGovee:{request:async()=>({code:200,data:list}),control:async()=>({code:200})}};
  const ctx={window:win,localStorage:store,console,JSON,Promise,Array,Object,String,Number,Math,Error,Date,CustomEvent:function(t){this.type=t},crypto:{randomUUID:()=>'u'},setTimeout:fn=>{fn();return 0},
    document:{readyState:'complete',getElementById:id=>els[id]||null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({})},
    fetch:async()=>({ok:true,status:200,text:async()=>JSON.stringify({code:200,data:list})})};
  win.window=win;
  vm.createContext(ctx);
  ctx.window=new Proxy(win,{set(t,k,v){t[k]=v;ctx[k]=v;return true}});
  vm.runInContext('(function(window){'+RUNTIME+'\n}).call(this,this.window)',ctx);
  els.goveeKey.value='x'.repeat(12);
  await win.goveeLoadLights();
  assert.equal(JSON.parse(bag.cj_govee_devices)[0].type,'devices.types.light');
});

function starEnv(send){
  const calls=[];
  const win={addEventListener(){},dispatchEvent(){},CJGovee:{control:async(d,c)=>{let body={payload:{sku:d.sku,device:d.device,capability:c}};calls.push(body);let r=send?send(body,calls):{code:200};if(r&&r.status===404)throw Error('HTTP 404');return r}}};
  const ctx={window:win,localStorage:{getItem:()=>null,setItem(){}},console,JSON,Promise,Array,Object,String,Number,Math,Error,Date,CustomEvent:function(t){this.type=t},crypto:{randomUUID:()=>'u'},setTimeout:fn=>{fn();return 0},
    document:{readyState:'complete',getElementById:()=>null,querySelectorAll:()=>[],addEventListener(){}},
    fetch:async(url,o)=>{let body=JSON.parse(o.body);calls.push(body);return send?send(body,calls):{ok:true,status:200,json:async()=>({code:200})}}};
  win.window=win;
  vm.createContext(ctx);
  ctx.window=new Proxy(win,{set(t,k,v){t[k]=v;ctx[k]=v;return true}});
  vm.runInContext('(function(window){'+STAR+'\n}).call(this,this.window)',ctx);
  return{win,calls};
}
test('C2 segmentCount fixtures',()=>{
  const {win}=starEnv();
  const sc=win.CJStarlight.segmentCount;
  assert.equal(sc({size:{min:1,max:8},elementRange:{min:0,max:14}}).count,8);
  assert.equal(sc({options:[],size:15}).count,15);
  assert.equal(sc({size:{min:1,max:10}},'H7075').count,3);
  let both=sc({size:{min:1,max:21},elementRange:{min:0,max:14}});
  assert.equal(both.count,15);
  assert.equal(both.ambiguous,true);
});
test('C3 DIY scene sends dynamic_scene/diyScene and retries once on 404',async()=>{
  const {win,calls}=starEnv(body=>{
    if(calls.length===1)return{ok:false,status:404,json:async()=>({code:404,message:'HTTP 404'})};
    return{ok:true,status:200,json:async()=>({code:200})};
  });
  const d={sku:'H6072',device:'AA:BB:CC:DD:EE:FF:00:09',deviceName:'Strip',capabilities:[{type:'devices.capabilities.dynamic_scene',instance:'diyScene'}],diyScenes:[{name:'galaxy night',value:4,type:'devices.capabilities.diy_color_setting',instance:'diyScene'}],dynamicScenes:[]};
  const used=await win.CJStarlight.applyScene(d,0);
  assert.equal(calls.length,2);
  assert.equal(calls[0].payload.capability.type,'devices.capabilities.dynamic_scene');
  assert.equal(calls[0].payload.capability.instance,'diyScene');
  assert.equal(calls[1].payload.capability.type,'devices.capabilities.diy_color_setting');
  assert.equal(used,'galaxy night');
});
test('C4 preset save and restore round-trips the six keys and still reads the old four',()=>{
  const bag={cj_govee_picked:'{"a":true}',cj_govee_calibration_v2:'{"0":{}}',cj_govee_special_v1:'{"x":1}',cj_govee_class_v1:'{"y":1}',cj_color_top_v1:'"2"',cj_color_separate_v1:'{"on":true}',cj_govee_calibration:'{"old":1}'};
  const store={getItem:k=>Object.prototype.hasOwnProperty.call(bag,k)?bag[k]:null,setItem:(k,v)=>{bag[k]=String(v)}};
  const win={addEventListener(){},dispatchEvent(){},goveeApplySafety(){bag.safety='called'}};
  const ctx={window:win,localStorage:store,console,JSON,Promise,Array,Object,String,Number,Math,Error,Date,CustomEvent:function(t){this.type=t},
    document:{readyState:'complete',getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){},createElement:()=>({})},setTimeout:fn=>{fn();return 0}};
  win.window=win;
  vm.createContext(ctx);
  ctx.window=new Proxy(win,{set(t,k,v){t[k]=v;ctx[k]=v;return true}});
  vm.runInContext('(function(window){'+PRESETS+'\n}).call(this,this.window)',ctx);
  const snap=win.CJPresets.capture();
  assert.equal(snap.cj_govee_picked.a,true);
  assert.equal(snap.cj_color_top_v1,'2');
  assert.equal(snap.cj_govee_calibration.old,1);
  bag.cj_govee_picked='{}';
  win.CJPresets.apply(snap);
  assert.equal(JSON.parse(bag.cj_govee_picked).a,true);
  assert.equal(bag.safety,'called');
  win.CJPresets.apply({cj_govee_selected:{legacy:true}});
  assert.equal(JSON.parse(bag.cj_govee_selected).legacy,true);
});
