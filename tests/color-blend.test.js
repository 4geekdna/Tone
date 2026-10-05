'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const B=require('../chakra-color-blend.js');

function mem(initial){
  let bag=Object.assign({},initial||{});
  return {getItem:k=>Object.prototype.hasOwnProperty.call(bag,k)?bag[k]:null,setItem:(k,v)=>{bag[k]=String(v)},bag};
}

test('color picks default off: classic journey until the user turns them on',()=>{
  let s=mem();
  let x=B.read(s);
  assert.equal(x.picks,false);
  assert.equal(x.mode,'audio');
  assert.equal(x.smooth,4);
  assert.equal(x.threshold,6);
  x=B.write(s,{picks:true,mode:'timestamps',smooth:2.5,threshold:10,cycle:30});
  assert.equal(x.picks,true);
  assert.equal(B.read(s).mode,'timestamps');
  assert.equal(B.read(s).smooth,2.5);
  assert.equal(B.read(s).cycle,30);
});

test('threshold ignores a lead smaller than the slider',()=>{
  assert.equal(B.passesThreshold(5.9,6),false);
  assert.equal(B.passesThreshold(6,6),true);
  assert.equal(B.passesThreshold(3,2),true);
  assert.equal(B.passesThreshold(NaN,6),false);
});

test('timestamp color follows bowl marks, not a freewheel clock',()=>{
  let stamps=[0,102,194,277,366,450,536];
  assert.equal(B.confirmSec(2),0);
  assert.equal(B.confirmSec(6),1);
  assert.equal(B.timestampIndex(0,stamps,0),0);
  assert.equal(B.timestampIndex(0.5,stamps,1),-1);
  assert.equal(B.timestampIndex(101,stamps,0),0);
  assert.equal(B.timestampIndex(102,stamps,0),1);
  assert.equal(B.timestampIndex(102.5,stamps,1),0);
  assert.equal(B.timestampIndex(103,stamps,1),1);
  assert.equal(B.timestampIndex(536,stamps,0),6);
  assert.equal(B.timestampIndex(540,stamps,0),6);
});

test('auto-pick cycles chakras on its own and wraps',()=>{
  assert.equal(B.nextCycle(-1),0);
  assert.equal(B.nextCycle(0),1);
  assert.equal(B.nextCycle(6),0);
});

test('blend stays on the start color at 0 and the end color at 1, and is not a hard jump at halfway',()=>{
  assert.equal(B.blendHex('#8B0000','#E65100',0).toLowerCase(),'#8b0000');
  assert.equal(B.blendHex('#8B0000','#E65100',1).toLowerCase(),'#e65100');
  let mid=B.blendHex('#000000','#ffffff',0.5);
  assert.notEqual(mid.toLowerCase(),'#000000');
  assert.notEqual(mid.toLowerCase(),'#ffffff');
  assert.match(mid,/^#[0-9a-f]{6}$/i);
});
