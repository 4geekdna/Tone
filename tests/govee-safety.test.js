'use strict';
/* WP0a safety. node --test tests/govee-safety.test.js */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const RUNTIME=fs.readFileSync(path.join(ROOT,'govee-chakra-runtime.js'),'utf8');
const BLEND=fs.readFileSync(path.join(ROOT,'govee-audio-blend.js'),'utf8');
const LIGHT='devices.types.light';
const mac=n=>'AA:BB:CC:DD:EE:FF:00:0'+n;
const dev=(n,sku,name,type,caps)=>({device:mac(n),sku,deviceName:name,type:type||'',capabilities:caps||[]});
const color=[{type:'devices.capabilities.color_setting',instance:'colorRgb'}];
const L1=dev(1,'H6008','Lamp',LIGHT,color), L2=dev(2,'H6008','Sconce',LIGHT,color);
const SOCK=dev(3,'H5080','Plug','devices.types.socket',[]);
const HEAT=dev(4,'H7130','Heater','devices.types.heater',color);
const BOX=dev(5,'H1167','Box',LIGHT,color);
const GROUP={device:'12345',sku:'GROUP',deviceName:'Group',type:LIGHT,capabilities:color};
const FIX=[L1,L2,SOCK,HEAT,BOX,GROUP];

function harness(bag,list){
  const calls=[];
  const els={goveeKey:{value:'x'.repeat(12)},goveeOn:{checked:true},goveeList:{textContent:'',innerHTML:'',closest:()=>null,querySelectorAll:()=>[]},status:{textContent:''}};
  const store={getItem:k=>Object.prototype.hasOwnProperty.call(bag,k)?bag[k]:null,setItem:(k,v)=>{bag[k]=String(v)},removeItem:k=>{delete bag[k]}};
  const win={addEventListener(){},dispatchEvent(){},C:[['Root','','','','#ff0000']]};
  const ctx={window:win,localStorage:store,console,JSON,Promise,Array,Object,String,Number,Math,Error,Date,
    CustomEvent:function(t){this.type=t},crypto:{randomUUID:()=>'u'},setTimeout:(fn)=>{fn();return 0},clearTimeout(){},
    document:{readyState:'complete',getElementById:id=>els[id]||null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({})},
    fetch:async(url,o)=>{
      calls.push({url,body:o&&o.body?JSON.parse(o.body):null});
      if(String(url).indexOf('/user/devices')>=0)return{ok:true,status:200,text:async()=>JSON.stringify({code:200,data:list||FIX})};
      return{ok:true,status:200,text:async()=>'{"code":200}'};
    }};
  win.window=win;Object.assign(win,{localStorage:store,document:ctx.document});
  vm.createContext(ctx);
  ctx.window=new Proxy(win,{set(t,k,v){t[k]=v;ctx[k]=v;return true}});
  const run=src=>vm.runInContext('(function(window){'+src+'\n}).call(this,this.window)',ctx);
  run(RUNTIME);run(BLEND);
  return{win,calls,els,bag};
}
const controls=calls=>calls.filter(c=>String(c.url).indexOf('/device/control')>=0);

test('S1 first load ticks nothing and a chakra step sends no control',async()=>{
  const {win,calls}=harness({'govee-api-key':'x'.repeat(12)},FIX);
  await win.goveeLoadLights();
  assert.equal(win.localStorage.getItem('cj_govee_picked'),null);
  calls.length=0;
  await win.goveeFollow(0);
  assert.equal(controls(calls).length,0);
});
test('S2 Lights Off is ticked lights only',async()=>{
  const {win,calls}=harness({'govee-api-key':'x'.repeat(12)},FIX);
  await win.goveeLoadLights();
  await win.goveeAllOff();
  assert.equal(controls(calls).length,0);
  assert.equal(win.document.getElementById('status').textContent,'No lights ticked.');
  const picked={};picked[L1.device]=true;picked[L2.device]=true;picked[HEAT.device]=true;
  const h=harness({'govee-api-key':'x'.repeat(12),cj_govee_picked:JSON.stringify(picked),cj_govee_devices:JSON.stringify(FIX)},FIX);
  await h.win.goveeAllOff();
  const off=controls(h.calls).filter(c=>c.body.payload.capability.instance==='powerSwitch'&&c.body.payload.capability.value===0);
  assert.deepEqual(off.map(c=>c.body.payload.device).sort(),[L1.device,L2.device].sort());
});
test('S3 migration keeps picked bytes and hides the socket',async()=>{
  const picked={};picked[L1.device]=true;picked[SOCK.device]=true;
  const raw=JSON.stringify(picked);
  const untyped=FIX.map(d=>{let x=Object.assign({},d);delete x.type;return x});
  const bag={'govee-api-key':'x'.repeat(12),cj_govee_picked:raw,cj_govee_devices:JSON.stringify(untyped)};
  const {win}=harness(bag,FIX);
  await win.goveeApplySafety();
  assert.equal(bag.cj_govee_picked,raw);
  let flag=JSON.parse(bag.cj_govee_safety_v1);
  assert.ok(flag.hiddenIds.indexOf(SOCK.device)>=0);
  const calls=[];
  await win.goveeFollow(0);
});
test('S4 follow off blocks session paint, test button still sends',async()=>{
  const picked={};picked[L1.device]=true;
  const {win,calls,els}=harness({'govee-api-key':'x'.repeat(12),cj_govee_picked:JSON.stringify(picked),cj_govee_devices:JSON.stringify(FIX)},FIX);
  els.goveeOn.checked=false;
  for(let i=0;i<30;i++)await win.goveePaintBlend('#ff0000',74,'#ff0000',58);
  await win.goveeFollow(0);
  assert.equal(controls(calls).length,0);
  win.goveeCalibration.setColor(0,'#00ff00');
  await new Promise(r=>setImmediate(r));
  assert.ok(controls(calls).length>0);
});
test('S5 non-lights never get powerSwitch',async()=>{
  const picked={};FIX.forEach(d=>picked[d.device]=true);
  const {win,calls}=harness({'govee-api-key':'x'.repeat(12),cj_govee_picked:JSON.stringify(picked),cj_govee_devices:JSON.stringify(FIX)},FIX);
  await win.goveeFollow(0);
  await win.goveeAllOff();
  await win.goveePaintBlend('#ff0000',70,'#00ff00',50);
  for(const c of controls(calls)){
    if(c.body.payload.capability.instance==='powerSwitch')assert.ok(c.body.payload.device===L1.device||c.body.payload.device===L2.device);
  }
});
