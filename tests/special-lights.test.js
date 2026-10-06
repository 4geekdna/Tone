'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'..','govee-special-lights.js'),'utf8');
const ctx={window:{},localStorage:{getItem:()=>'{"devices":{"AA":{"enabled":true}}}'}};
vm.createContext(ctx);vm.runInContext(src,ctx);
test('X2 Buddha groups cover 0-15 and base is accent',()=>{
  let g=ctx.window.CJSpecial.groups(16,'buddha');
  assert.deepEqual(g.accent.filter(i=>i>=13),[13,14,15]);
  let all=g.main.concat(g.accent,g.sparkle).sort((a,b)=>a-b);
  assert.equal(all.length,16);
});
test('X3 Halo pattern repeats',()=>{
  let g=ctx.window.CJSpecial.groups(15,'strip');
  assert.equal(g.main.length+g.accent.length+g.sparkle.length,15);
});
test('X1 owned device is claimed',()=>{
  assert.equal(ctx.window.CJSpecial.owns({device:'AA'}),true);
  assert.equal(ctx.window.CJSpecial.owns({device:'BB'}),false);
});
