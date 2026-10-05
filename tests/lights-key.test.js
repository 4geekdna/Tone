'use strict';
/* cj_audio_lights_v1 must stay readable. node --test tests/ */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const src=fs.readFileSync(path.join(__dirname,'..','chakra-audio-lights.js'),'utf8');

test('cj_audio_lights_v1 is still a read path and is never deleted',()=>{
  assert.ok(src.includes('cj_audio_lights_v1'));
  assert.ok(src.includes('store.getItem(LS_LIGHTS)'));
  assert.ok(!/removeItem\(\s*LS_LIGHTS\s*\)/.test(src));
  assert.ok(!/removeItem\(\s*["']cj_audio_lights_v1["']\s*\)/.test(src));
});

test('missing cj_color_top_v1 migrates from cj_audio_lights_v1 and keeps the old key',()=>{
  let bag={cj_audio_lights_v1:JSON.stringify({on:true,rel:'040',top:2})};
  let store={
    getItem:k=>Object.prototype.hasOwnProperty.call(bag,k)?bag[k]:null,
    setItem:(k,v)=>{bag[k]=String(v)}
  };
  let fn=src.slice(src.indexOf('function migrateColorTop'),src.indexOf('function writeColorTop'));
  let migrate=vm.runInNewContext(fn+'\nmigrateColorTop;',{LS_TOP:'cj_color_top_v1',LS_LIGHTS:'cj_audio_lights_v1'});
  assert.equal(migrate(store),'2');
  assert.equal(bag.cj_color_top_v1,'2');
  assert.equal(JSON.parse(bag.cj_audio_lights_v1).on,true);
  assert.equal(migrate(store),'2');
  bag={cj_audio_lights_v1:JSON.stringify({on:false,rel:'040'})};
  assert.equal(migrate(store),'1');
  assert.equal(bag.cj_color_top_v1,'1');
  assert.ok(bag.cj_audio_lights_v1.includes('"on":false'));
});
