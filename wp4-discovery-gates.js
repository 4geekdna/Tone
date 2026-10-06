'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'govee-discover.js'),'utf8');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(src,ctx);
const c=ctx.window.CJDiscover.classify;
const light={type:'devices.types.light',capabilities:[]};
function assert(cond,msg){if(!cond){console.error(msg);process.exit(1)}}
assert(c(Object.assign({sku:'H5080',type:'devices.types.socket'},light,{type:'devices.types.socket'})).class==='ignore','socket');
assert(c(Object.assign({},light,{sku:'H607C',deviceName:'Buddha',capabilities:[{instance:'pillarLightToggle'},{instance:'baseLightToggle'}]})).n===16,'buddha');
assert(c(Object.assign({},light,{sku:'H61E6',deviceName:'Halo strip',capabilities:[{instance:'segmentedColorRgb'}]})).category==='strips','halo');
assert(c(Object.assign({},light,{sku:'H6093',deviceName:'Star projector'})).class==='scene-only','projector');
console.log('W1-W3 discovery fixtures ok');
