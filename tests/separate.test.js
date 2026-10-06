'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'..','govee-audio-blend.js'),'utf8');
const ctx={window:{},document:{getElementById:()=>null},localStorage:{getItem:()=>null}};
ctx.window=ctx;
vm.createContext(ctx);
vm.runInContext(src,ctx);
const assign=ctx.goveeAssignSlots, read=ctx.goveeReadSeparate;
const tones=[{hex:'#a'},{hex:'#b'},{hex:'#c'}];
test('P1 extra lights follow the primary',()=>{
  let lights=[1,2,3,4,5].map(id=>({id}));
  let plan=assign(lights,tones,'primary');
  assert.equal(plan[0].hex,'#a');
  assert.equal(plan[2].hex,'#c');
  assert.equal(plan[4].hex,'#a');
});
test('P2 two lights drop the third tone',()=>{
  let plan=assign([{id:1},{id:2}],tones,'primary');
  assert.deepEqual(plan.map(p=>p.hex),['#a','#b']);
});
test('P3 hold sends no color to extras',()=>{
  let plan=assign([1,2,3,4].map(id=>({id})),tones,'hold');
  assert.equal(plan[3].hex,null);
});
test('P4 missing separate setting is off',()=>{
  assert.deepEqual(read(),{v:1,on:false,extra:'primary'});
});
test('P5 assignment follows device list order',()=>{
  let plan=assign([{id:'z'},{id:'a'}],tones,'primary');
  assert.deepEqual(plan.map(p=>p.id),['z','a']);
});
