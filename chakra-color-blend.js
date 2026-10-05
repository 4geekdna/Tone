(function(root,factory){
'use strict';
let api=factory();
if(typeof module==="object"&&module.exports)module.exports=api;
if(root)root.CJColorBlend=api;
})(typeof window!=="undefined"?window:(typeof globalThis!=="undefined"?globalThis:null),function(){
'use strict';
/* Screen-color decisions for Chakra Journey. Pure: no DOM.
   Picks off is the classic journey (single bowl, affirmations at the
   bowl timestamps). Audio follows the video sound. Timestamps follow
   the journey bowl marks, not the times an affirmation line is spoken.
   Auto-pick cycles on its own interval. A new chakra is taken only when
   it clears the threshold. The slider duration is how long the blend
   from the old color to the new one takes. */
const KEY="cj_color_ui_v1";
const MODES=["audio","timestamps","manual","cycle"];
const DEFAULTS={picks:false,mode:"audio",smooth:4,threshold:6,cycle:45};
function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
function read(store){
  let x={picks:DEFAULTS.picks,mode:DEFAULTS.mode,smooth:DEFAULTS.smooth,threshold:DEFAULTS.threshold,cycle:DEFAULTS.cycle};
  if(!store||typeof store.getItem!=="function")return x;
  let raw=null;
  try{raw=store.getItem(KEY)}catch(e){return x}
  if(raw==null||raw==="")return x;
  let s=null;
  try{s=JSON.parse(raw)}catch(e){return x}
  if(!s||typeof s!=="object")return x;
  if(typeof s.picks==="boolean")x.picks=s.picks;
  if(MODES.indexOf(s.mode)>=0)x.mode=s.mode;
  if(Number.isFinite(+s.smooth))x.smooth=clamp(+s.smooth,0.4,12);
  if(Number.isFinite(+s.threshold))x.threshold=clamp(+s.threshold,2,18);
  if(Number.isFinite(+s.cycle))x.cycle=clamp(+s.cycle,10,180);
  return x;
}
function write(store,next){
  let x=read({getItem:()=>null});
  if(next&&typeof next==="object"){
    if(typeof next.picks==="boolean")x.picks=next.picks;
    if(MODES.indexOf(next.mode)>=0)x.mode=next.mode;
    if(Number.isFinite(+next.smooth))x.smooth=clamp(+next.smooth,0.4,12);
    if(Number.isFinite(+next.threshold))x.threshold=clamp(+next.threshold,2,18);
    if(Number.isFinite(+next.cycle))x.cycle=clamp(+next.cycle,10,180);
  }
  try{if(store&&store.setItem)store.setItem(KEY,JSON.stringify(x))}catch(e){}
  return x;
}
/* Audio: the new chakra must lead by at least this many dB.
   Minor fluctuations stay on the current color. */
function passesThreshold(marginDb,thresholdDb){
  if(!Number.isFinite(marginDb))return false;
  let th=Number.isFinite(+thresholdDb)?+thresholdDb:DEFAULTS.threshold;
  return marginDb>=th;
}
/* Timestamp mode: how far into the next bowl before the color may move.
   Mapped from the same threshold slider (2 dB → 0 s, 6 dB → 1 s). */
function confirmSec(thresholdDb){
  let th=Number.isFinite(+thresholdDb)?+thresholdDb:DEFAULTS.threshold;
  return Math.max(0,(th-2)*0.25);
}
/* Bowl marks in seconds. Returns the chakra index whose section the
   playhead is clearly inside, or -1 before the first confirmed mark. */
function timestampIndex(time,stamps,confirm){
  if(!stamps||!stamps.length)return -1;
  let wait=Number.isFinite(+confirm)?Math.max(0,+confirm):0;
  let t=Number(time);
  if(!Number.isFinite(t))t=0;
  let i=-1;
  for(let n=0;n<stamps.length&&n<7;n++){
    let mark=+stamps[n];
    if(!Number.isFinite(mark))continue;
    if(t+1e-3>=mark+wait)i=n;
  }
  return i;
}
function nextCycle(i){
  let n=+i;
  if(!Number.isFinite(n)||n<0)return 0;
  return (Math.floor(n)+1)%7;
}
function hexRgb(hex){
  let h=String(hex||"").replace("#","");
  if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  let n=parseInt(h,16);
  if(!Number.isFinite(n))return [15,15,18];
  return [(n>>16)&255,(n>>8)&255,n&255];
}
function srgbToLin(c){c=c/255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)}
function linToSrgb(c){
  let s=c<=0.0031308?12.92*c:1.055*Math.pow(Math.max(c,0),1/2.4)-0.055;
  return Math.max(0,Math.min(255,Math.round(s*255)));
}
function rgbToOklab(r,g,b){
  let R=srgbToLin(r),G=srgbToLin(g),B=srgbToLin(b);
  let l=Math.cbrt(0.4122214708*R+0.5363325363*G+0.0514459929*B);
  let m=Math.cbrt(0.2119034982*R+0.6806995451*G+0.1073969566*B);
  let s=Math.cbrt(0.0883024619*R+0.2817188376*G+0.6299787005*B);
  return [0.2104542553*l+0.7936177850*m-0.0040720468*s,1.9779984951*l-2.4285922050*m+0.4505937099*s,0.0259040371*l+0.7827717662*m-0.8086757660*s];
}
function oklabToRgb(L,a,b){
  let l=L+0.3963377774*a+0.2158037573*b;
  let m=L-0.1055613458*a-0.0638541728*b;
  let s=L-0.0894841775*a-1.2914855480*b;
  l=l*l*l;m=m*m*m;s=s*s*s;
  return [
    linToSrgb(4.0767416621*l-3.3077115913*m+0.2309699292*s),
    linToSrgb(-1.2684380046*l+2.6097574011*m-0.3413193965*s),
    linToSrgb(-0.0041960863*l-0.7034186147*m+1.7076147010*s)
  ];
}
function rgbHex(r,g,b){
  function h(v){return v.toString(16).padStart(2,"0")}
  return "#"+h(r)+h(g)+h(b);
}
/* t is 0..1. Smoothstep so the blend eases instead of stepping. */
function canonical(hex){let [r,g,b]=hexRgb(hex);return rgbHex(r,g,b)}
function blendHex(from,to,t){
  let u=Number.isFinite(+t)?clamp(+t,0,1):0;
  if(u<=0)return canonical(from);
  if(u>=1)return canonical(to);
  u=u*u*(3-2*u);
  let A=hexRgb(from),B=hexRgb(to);
  let a=rgbToOklab(A[0],A[1],A[2]),b=rgbToOklab(B[0],B[1],B[2]);
  let rgb=oklabToRgb(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u);
  return rgbHex(rgb[0],rgb[1],rgb[2]);
}
return {
  KEY:KEY,
  DEFAULTS:DEFAULTS,
  MODES:MODES,
  read:read,
  write:write,
  passesThreshold:passesThreshold,
  confirmSec:confirmSec,
  timestampIndex:timestampIndex,
  nextCycle:nextCycle,
  blendHex:blendHex
};
});
