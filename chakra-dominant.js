(function(root,factory){
'use strict';
let api=factory();
if(typeof module==="object"&&module.exports)module.exports=api;
if(root)root.CJDominant=api;
})(typeof window!=="undefined"?window:(typeof globalThis!=="undefined"?globalThis:null),function(){
'use strict';
/* Chakra Journey v0.44 — which chakra leads the sound, and when it changes.
   Pure logic, no DOM. Used live (chakra-audio-lights.js uses topBands for
   the screen color and hands each AnalyserNode frame to Auto mode), by
   the Add video analyzer
   (chakra-video-library.js), and by tools/add-video.js in Node.

   Primary chakra rule (hysteresis):
   - Spectral peaks map to chakras by solfeggio Hz or musical note
     (chakraForHz) and are A-weighted, so a low hum does not outvote
     the bowl the ear hears.
   - Each band's level is smoothed (smoothMs) so a short ring fades in slowly.
   - A new band counts only while it leads every other band by marginDb.
   - It must keep that lead for holdMs in total. Ambiguous frames pause the
     count; a gap longer than graceMs, or the old primary leading again,
     drops the candidate. Secondary peaks that never hold stay in the wings.
   - Each change of primary asks for one affirmation. After one plays, the
     next waits cooldownMs; a change during the cooldown is announced when
     the cooldown ends, only if that chakra is still primary and was not the
     last one announced. */
const BANDS=[
  {name:"Root",hz:396,note:"C"},
  {name:"Sacral",hz:417,note:"D"},
  {name:"Solar",hz:528,note:"E"},
  {name:"Heart",hz:639,note:"F"},
  {name:"Throat",hz:741,note:"G"},
  {name:"Third Eye",hz:852,note:"A"},
  {name:"Crown",hz:963,note:"B"}
];
const DEFAULTS={holdMs:3500,marginDb:3,cooldownMs:20000,smoothMs:600,graceMs:800,floorDb:-58,maxStepMs:250};
const MIN_FOUND=4,LO_HZ=80,HI_HZ=2200,SOLF_TOL=0.006,SHARP_TOL=0.4,SHARP_DB=12;
const NATURAL=[[0,0],[2,1],[4,2],[5,3],[7,4],[9,5],[11,6],[12,0]];
/* Chakra for one pitch, matching window.C: an exact solfeggio tone
   (within 0.6 %, so an in-tune G4 at 392 Hz is still Throat) maps by
   Hz; anything else maps by its musical note,
   C Root, D Sacral, E Solar, F Heart, G Throat, A Third Eye, B Crown,
   in any octave. Bowls are often tuned a little flat or sharp, so the
   nearest natural note wins. */
function solfeggioIndex(hz){
  for(let i=0;i<BANDS.length;i++)if(Math.abs(hz/BANDS[i].hz-1)<SOLF_TOL)return i;
  return -1;
}
function semis(hz){return ((12*Math.log2(hz/261.6256))%12+12)%12}
function chakraForHz(hz){
  if(!Number.isFinite(hz)||hz<LO_HZ||hz>HI_HZ)return -1;
  let s=solfeggioIndex(hz);
  if(s>=0)return s;
  let st=semis(hz),best=-1,bd=99;
  for(let k=0;k<NATURAL.length;k++){let d=Math.abs(st-NATURAL[k][0]);if(d<bd){bd=d;best=NATURAL[k][1]}}
  return best;
}
/* A tone sitting on a sharp (C#, D#, F#, G#, A#) is not a chakra note.
   It still counts, 12 dB lower, so a drone on C# cannot outvote the bowl. */
function offKey(hz){
  if(solfeggioIndex(hz)>=0)return false;
  let st=semis(hz),r=Math.round(st)%12;
  return (r===1||r===3||r===6||r===8||r===10)&&Math.abs(st-Math.round(st))<SHARP_TOL;
}
/* A-weighting in dB: the ear hears a 130 Hz hum about 13 dB quieter than
   a 400 Hz bowl at the same level, so "predominant" follows the ear. */
function aWeight(f){
  let f2=f*f;
  let ra=(148693636*f2*f2)/((f2+424.36)*Math.sqrt((f2+11599.29)*(f2+544496.41))*(f2+148693636));
  return 20*Math.log10(ra)+2;
}
function linMag(db){return Math.pow(10,db/20)}
/* Per chakra: its strongest weighted spectral peak (linear level, Hz). */
function bandPeaks(db,sampleRate,fftSize,floorDb){
  let out=BANDS.map(function(b,i){return {band:i,level:0,hz:0}});
  if(!db||!sampleRate||!fftSize)return out;
  let floor=Number.isFinite(floorDb)?floorDb:DEFAULTS.floorDb;
  let hzPer=sampleRate/fftSize;
  let i0=Math.max(1,Math.floor(LO_HZ/hzPer)),i1=Math.min(db.length-2,Math.ceil(HI_HZ/hzPer));
  for(let i=i0;i<=i1;i++){
    let v=db[i];
    if(!(v>floor)||!(v>db[i-1]&&v>=db[i+1]))continue;
    let a=db[i-1],c=db[i+1],den=a-2*v+c;
    let sh=Number.isFinite(den)&&Math.abs(den)>1e-3?0.5*(a-c)/den:0;
    if(!Number.isFinite(sh))sh=0;
    sh=Math.max(-0.5,Math.min(0.5,sh));
    let hz=(i+sh)*hzPer,band=chakraForHz(hz);
    if(band<0)continue;
    let m=linMag(v+aWeight(hz)-(offKey(hz)?SHARP_DB:0));
    if(m>out[band].level){out[band].level=m;out[band].hz=hz}
  }
  return out;
}
function bandLevels(db,sampleRate,fftSize,floorDb){return bandPeaks(db,sampleRate,fftSize,floorDb).map(function(p){return p.level})}
/* The n loudest chakras right now, loudest first (for screen color). */
function topBands(db,sampleRate,fftSize,n){
  return bandPeaks(db,sampleRate,fftSize).filter(function(p){return p.level>0}).sort(function(a,b){return b.level-a.level}).slice(0,n||1);
}
function opt(o,k){let v=o&&o[k];return Number.isFinite(v)?v:DEFAULTS[k]}
function createTracker(options){
  let o={};
  function setOptions(next){for(let k in DEFAULTS)o[k]=opt(Object.assign({},o,next||{}),k)}
  setOptions(options);
  let smooth=null,lastT=null,primary=-1,primarySince=0,candidate=-1,candMs=0,candStart=0,candSeen=0;
  let lastAnnounced=-1,lastAnnounceAt=-Infinity,pending=false,leader=-1,margin=0;
  function reset(){
    smooth=null;lastT=null;primary=-1;primarySince=0;candidate=-1;candMs=0;candStart=0;candSeen=0;
    lastAnnounced=-1;lastAnnounceAt=-Infinity;pending=false;leader=-1;margin=0;
  }
  function announce(now){lastAnnounced=primary;lastAnnounceAt=now;pending=false;return {type:"announce",chakra:primary,at:now}}
  function update(levels,now){
    let dt=lastT==null?0:Math.max(0,Math.min(o.maxStepMs,now-lastT));
    lastT=now;
    if(!smooth)smooth=levels.map(function(x){return x||0});
    else{
      let a=o.smoothMs>0?1-Math.exp(-dt/o.smoothMs):1;
      for(let i=0;i<smooth.length;i++)smooth[i]+=a*((levels[i]||0)-smooth[i]);
    }
    let best=-1,bv=0,sv=0;
    for(let i=0;i<smooth.length;i++){
      let v=smooth[i];
      if(v>bv){sv=bv;bv=v;best=i}else if(v>sv)sv=v;
    }
    let floorLin=linMag(o.floorDb);
    leader=bv>floorLin?best:-1;
    margin=leader<0?0:(sv>0?20*Math.log10(bv/sv):Infinity);
    let clear=leader>=0&&margin>=o.marginDb;
    let change=null,ann=null;
    if(clear&&leader===primary){candidate=-1;candMs=0}
    else if(clear){
      if(leader===candidate)candMs+=dt;
      else{candidate=leader;candMs=0;candStart=now}
      candSeen=now;
    }else if(candidate>=0&&now-candSeen>o.graceMs){candidate=-1;candMs=0}
    if(candidate>=0&&candMs>=o.holdMs){
      let from=primary;
      primary=candidate;primarySince=candStart;
      candidate=-1;candMs=0;
      change={type:"primary",chakra:primary,from:from,since:primarySince,at:now};
      if(primary!==lastAnnounced){
        if(now-lastAnnounceAt>=o.cooldownMs)ann=announce(now);
        else pending=true;
      }else pending=false;
    }else if(pending&&now-lastAnnounceAt>=o.cooldownMs){
      if(primary>=0&&primary!==lastAnnounced)ann=announce(now);
      else pending=false;
    }
    return {primary:primary,since:primarySince,candidate:candidate,candidateMs:candMs,leader:leader,marginDb:margin,change:change,announce:ann,pending:pending};
  }
  function state(){return {primary:primary,since:primarySince,candidate:candidate,candidateMs:candMs,leader:leader,marginDb:margin,lastAnnounced:lastAnnounced,pending:pending,options:Object.assign({},o)}}
  return {update:update,reset:reset,setOptions:setOptions,state:state};
}
/* In-place radix-2 FFT. re and im have length n (a power of two). */
function fft(re,im){
  let n=re.length;
  for(let i=1,j=0;i<n;i++){
    let bit=n>>1;
    for(;j&bit;bit>>=1)j^=bit;
    j^=bit;
    if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}
  }
  for(let len=2;len<=n;len<<=1){
    let ang=-2*Math.PI/len,wr=Math.cos(ang),wi=Math.sin(ang),half=len>>1;
    for(let i=0;i<n;i+=len){
      let cr=1,ci=0;
      for(let k=0;k<half;k++){
        let a=i+k,b=a+half;
        let xr=re[b]*cr-im[b]*ci,xi=re[b]*ci+im[b]*cr;
        re[b]=re[a]-xr;im[b]=im[a]-xi;re[a]+=xr;im[a]+=xi;
        let t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t;
      }
    }
  }
}
let winCache={};
function blackman(n){
  if(winCache[n])return winCache[n];
  let w=new Float64Array(n);
  for(let i=0;i<n;i++)w[i]=0.42-0.5*Math.cos(2*Math.PI*i/n)+0.08*Math.cos(4*Math.PI*i/n);
  return (winCache[n]=w);
}
/* Spectrum in dB scaled like AnalyserNode (Blackman window, |X|/N). */
function spectrumDb(samples,start,n){
  let re=new Float64Array(n),im=new Float64Array(n),w=blackman(n);
  for(let i=0;i<n;i++){let s=samples[start+i];re[i]=(s===undefined?0:s)*w[i]}
  fft(re,im);
  let out=new Float32Array(n/2);
  for(let k=0;k<n/2;k++){let m=Math.hypot(re[k],im[k])/n;out[k]=m>0?20*Math.log10(m):-Infinity}
  return out;
}
function fftSizeFor(sampleRate){let n=1024;while(n*2<=sampleRate*0.55)n*=2;return n}
/* Offline: mono samples -> primary-chakra segments and 7 journey marks. */
function analyzeSamples(samples,sampleRate,options){
  let o=Object.assign({},options||{});
  if(!Number.isFinite(o.cooldownMs))o.cooldownMs=0;
  let hop=Number.isFinite(o.hopSec)?o.hopSec:0.25;
  let n=fftSizeFor(sampleRate),step=Math.max(1,Math.round(hop*sampleRate));
  if(!Number.isFinite(o.holdMs))o.holdMs=4000;
  let tr=createTracker(o),segments=[],frames=0;
  for(let s=0;s+n<=samples.length;s+=step){
    let db=spectrumDb(samples,s,n);
    let t=(s+n/2)/sampleRate;
    let r=tr.update(bandLevels(db,sampleRate,n,o.floorDb),t*1000);
    if(r.change)segments.push({t:Math.round(r.change.since/100)/10,chakra:r.change.chakra});
    frames++;
    if(o.onProgress&&frames%200===0)o.onProgress(s/samples.length);
  }
  let duration=samples.length/sampleRate;
  let marks=timestampsFromSegments(segments,duration);
  return {duration:duration,segments:segments,timestamps:marks.timestamps,estimated:marks.estimated,found:marks.found};
}
/* Journey marks need 7 strictly increasing times, Root..Crown. Take each
   chakra's first primary segment after the previous mark (Root takes the
   very first segment, so an opening bowl belongs to Root); fill gaps by
   spacing evenly between known marks (or to the end of the file). With
   fewer than 4 chakras found in order there is no real sequence, so the
   marks are spaced evenly over the whole file and flagged estimated. */
function timestampsFromSegments(segments,duration){
  let ts=new Array(7).fill(null),after=-1,found=0;
  let segs=(segments||[]).slice().sort(function(a,b){return a.t-b.t});
  for(let i=0;i<7;i++){
    for(let k=0;k<segs.length;k++){
      if(segs[k].chakra===i&&segs[k].t>after){ts[i]=segs[k].t;after=segs[k].t;found++;break}
    }
  }
  let dur=Number.isFinite(duration)&&duration>0?duration:7*60;
  if(found<MIN_FOUND){
    let out=[];for(let i=0;i<7;i++)out.push(Math.round(dur*i/7));
    return {timestamps:out,estimated:true,found:found};
  }
  if(ts[0]===null||segs[0].t<ts[0])ts[0]=ts[0]===null?0:segs[0].t;
  for(let i=1;i<7;i++){
    if(ts[i]!==null)continue;
    let j=i;while(j<7&&ts[j]===null)j++;
    let lo=ts[i-1],hi=j<7?ts[j]:Math.max(lo+1,dur*(1-0.5/7));
    let gaps=j-i+1;
    for(let k=i;k<j;k++)ts[k]=lo+(hi-lo)*(k-i+1)/gaps;
    i=j-1;
  }
  let out=[];
  for(let i=0;i<7;i++){
    let v=Math.round(ts[i]);
    if(i>0&&v<=out[i-1])v=out[i-1]+1;
    out.push(Math.max(0,v));
  }
  return {timestamps:out,estimated:found<7,found:found};
}
return {BANDS:BANDS,DEFAULTS:DEFAULTS,chakraForHz:chakraForHz,aWeight:aWeight,bandPeaks:bandPeaks,topBands:topBands,bandLevels:bandLevels,createTracker:createTracker,fft:fft,spectrumDb:spectrumDb,fftSizeFor:fftSizeFor,analyzeSamples:analyzeSamples,timestampsFromSegments:timestampsFromSegments};
});
