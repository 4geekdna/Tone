'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../chakra-color-blend.js');
const C=['#8B0000','#E65100','#F9A825','#2E7D32','#0277BD','#283593','#6A1B9A'];
test('M1 top 1 is the loudest table color',()=>{
  let r=M.mix([{band:2,hex:C[2],level:3},{band:4,hex:C[4],level:1}],1);
  assert.equal(r.hex.toLowerCase(),C[2].toLowerCase());
});
test('M2 top 2 leans to the louder color',()=>{
  let r=M.mix([{band:2,hex:C[2],level:3},{band:4,hex:C[4],level:1}],2);
  assert.ok(/^#[0-9a-f]{6}$/i.test(r.hex));
  assert.equal(r.slots[0].band,2);
});
test('M5 mix is valid sRGB hex',()=>{
  let r=M.mix(C.map((hex,band)=>({band,hex,level:1})),3);
  assert.match(r.hex,/^#[0-9a-f]{6}$/i);
});
test('M4 equal levels keep previous rank',()=>{
  let r=M.mix([{band:1,hex:C[1],level:1},{band:2,hex:C[2],level:1}],2,[2,1]);
  assert.equal(r.ranks[0],2);
});
