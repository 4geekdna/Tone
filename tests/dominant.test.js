'use strict';
/* node --test tests/   (Node 18+, no npm) */
const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('../chakra-dominant.js');

const ROOT=0,SACRAL=1,SOLAR=2,HEART=3,THROAT=4,THIRD=5,CROWN=6;
/* levels helper: dB per chakra -> linear array */
function lv(map){let a=new Array(7).fill(0);for(let k in map)a[k]=Math.pow(10,map[k]/20);return a}
/* drive a tracker with a piecewise script of [ms, levels] at 100 ms steps */
function run(tr,script,start){
  let t=start||0,events=[],last=null;
  for(let [ms,levels] of script){
    for(let end=t+ms;t<end;t+=100){last=tr.update(levels,t);if(last.change)events.push({t:t,type:'primary',chakra:last.change.chakra});if(last.announce)events.push({t:t,type:'announce',chakra:last.announce.chakra})}
  }
  return {events:events,last:last,t:t};
}
const primaries=e=>e.filter(x=>x.type==='primary').map(x=>x.chakra);
const announces=e=>e.filter(x=>x.type==='announce').map(x=>x.chakra);

test('chakraForHz: exact solfeggio tones map by Hz',()=>{
  assert.deepEqual([396,417,528,639,741,852,963].map(D.chakraForHz),[0,1,2,3,4,5,6]);
  // in-tune notes next to a solfeggio tone keep their note: G4 is Throat, C5 is Root
  assert.equal(D.chakraForHz(392),THROAT);
  assert.equal(D.chakraForHz(523.25),ROOT);
});
test('chakraForHz: other pitches map by note C D E F G A B, any octave, tolerating detuned bowls',()=>{
  assert.deepEqual([261.6,293.7,329.6,349.2,392.5,440,493.9].map(D.chakraForHz),[0,1,2,3,4,5,6]);
  // the default video's bowls are tuned about 25-35 cents flat
  assert.deepEqual([258,289,326,342,385,434,486].map(D.chakraForHz),[0,1,2,3,4,5,6]);
  assert.equal(D.chakraForHz(130.8),ROOT);
  assert.equal(D.chakraForHz(1046.5),ROOT);
  assert.equal(D.chakraForHz(50),-1);
  assert.equal(D.chakraForHz(5000),-1);
});
test('bandLevels: A-weighting lets a 400 Hz bowl beat an equally loud 130 Hz hum',()=>{
  let sr=8000,n=4096,db=new Float32Array(n/2).fill(-120);
  function peak(hz,level){let i=Math.round(hz*n/sr);db[i-1]=level-6;db[i]=level;db[i+1]=level-6}
  peak(130.8,-30); // C3 hum -> Root
  peak(392,-30);   // G4 bowl -> Throat
  let l=D.bandLevels(db,sr,n);
  assert.ok(l[THROAT]>l[ROOT]*2,'throat should lead by more than 6 dB after weighting');
});
test('bandLevels: a drone on a sharp (C#) cannot outvote the bowl',()=>{
  let sr=8000,n=4096,db=new Float32Array(n/2).fill(-120);
  function peak(hz,level){let i=Math.round(hz*n/sr);db[i-1]=level-6;db[i]=level;db[i+1]=level-6}
  peak(138.6,-22); // C#3, 8 dB louder
  peak(392,-30);   // G4
  let l=D.bandLevels(db,sr,n);
  assert.equal(l.indexOf(Math.max(...l)),THROAT);
});

test('topBands: loudest chakras first, same mapping as the tracker (screen color matches Auto)',()=>{
  let sr=48000,n=8192,db=new Float32Array(n/2).fill(-120);
  function peak(hz,level){let i=Math.round(hz*n/sr);db[i-1]=level-6;db[i]=level;db[i+1]=level-6}
  peak(130.8,-26); // hum
  peak(329.6,-30); // E4 bowl
  peak(440,-40);   // A4 quieter
  let top=D.topBands(db,sr,n,3);
  assert.deepEqual(top.map(p=>p.band),[SOLAR,ROOT,THIRD]);
  assert.ok(Math.abs(top[0].hz-329.6)<3);
});
test('tracker: first primary needs the full hold, then one announce',()=>{
  let tr=D.createTracker({holdMs:3500,marginDb:6,cooldownMs:20000,smoothMs:0});
  let r=run(tr,[[3000,lv({[HEART]:-30,[ROOT]:-45})]]);
  assert.deepEqual(r.events,[],'no primary before 3.5 s');
  r=run(tr,[[1000,lv({[HEART]:-30,[ROOT]:-45})]],r.t);
  assert.deepEqual(primaries(r.events),[HEART]);
  assert.deepEqual(announces(r.events),[HEART]);
  assert.ok(r.events[0].t>=3500&&r.events[0].t<=3700,'committed at about 3.5 s, got '+r.events[0].t);
});
test('tracker: a brief secondary peak stays in the wings',()=>{
  let tr=D.createTracker({holdMs:3500,marginDb:6,cooldownMs:0,smoothMs:600});
  let r=run(tr,[
    [6000,lv({[ROOT]:-30,[THROAT]:-50})],
    [2000,lv({[ROOT]:-40,[THROAT]:-25})], // Throat leads clearly, but only for 2 s
    [6000,lv({[ROOT]:-30,[THROAT]:-50})]
  ]);
  assert.deepEqual(primaries(r.events),[ROOT]);
  assert.deepEqual(announces(r.events),[ROOT]);
});
test('tracker: a rival that never leads by the margin does not count',()=>{
  let tr=D.createTracker({holdMs:3000,marginDb:6,cooldownMs:0,smoothMs:0});
  let r=run(tr,[
    [5000,lv({[SOLAR]:-30,[HEART]:-50})],
    [15000,lv({[SOLAR]:-30,[HEART]:-27})] // Heart is louder by 3 dB, under the 6 dB margin
  ]);
  assert.deepEqual(primaries(r.events),[SOLAR]);
  assert.equal(r.last.leader,HEART);
  assert.equal(r.last.primary,SOLAR);
});
test('tracker: a real change holds and clearly leads, then counts once',()=>{
  let tr=D.createTracker({holdMs:3500,marginDb:6,cooldownMs:0,smoothMs:600});
  let r=run(tr,[
    [8000,lv({[ROOT]:-30,[SACRAL]:-50})],
    [8000,lv({[ROOT]:-50,[SACRAL]:-30})]
  ]);
  assert.deepEqual(primaries(r.events),[ROOT,SACRAL]);
  assert.deepEqual(announces(r.events),[ROOT,SACRAL]);
  let ch=r.events.find(e=>e.type==='primary'&&e.chakra===SACRAL);
  assert.ok(ch.t>=8000+3500&&ch.t<=8000+4500,'sacral after about hold + smoothing, got '+ch.t);
});
test('tracker: a short dip during the hold is forgiven (grace), a long one resets',()=>{
  let a=D.createTracker({holdMs:3000,marginDb:6,cooldownMs:0,smoothMs:0,graceMs:800});
  let r=run(a,[
    [4000,lv({[ROOT]:-30})],
    [2000,lv({[ROOT]:-50,[HEART]:-30})],
    [500,lv({[ROOT]:-30,[HEART]:-30})],   // ambiguous half second
    [1500,lv({[ROOT]:-50,[HEART]:-30})]
  ]);
  assert.deepEqual(primaries(r.events),[ROOT,HEART]);
  let b=D.createTracker({holdMs:3000,marginDb:6,cooldownMs:0,smoothMs:0,graceMs:800});
  r=run(b,[
    [4000,lv({[ROOT]:-30})],
    [2000,lv({[ROOT]:-50,[HEART]:-30})],
    [2000,lv({[ROOT]:-30,[HEART]:-30})],  // ambiguous for 2 s, longer than grace
    [1500,lv({[ROOT]:-50,[HEART]:-30})]
  ]);
  assert.deepEqual(primaries(r.events),[ROOT]);
});
test('tracker: cooldown delays the next affirmation, then plays it if still primary',()=>{
  let tr=D.createTracker({holdMs:3000,marginDb:6,cooldownMs:20000,smoothMs:0});
  let r=run(tr,[
    [5000,lv({[ROOT]:-30})],
    [20000,lv({[THROAT]:-30})]
  ]);
  assert.deepEqual(primaries(r.events),[ROOT,THROAT]);
  let ann=r.events.filter(e=>e.type==='announce');
  assert.deepEqual(ann.map(e=>e.chakra),[ROOT,THROAT]);
  assert.ok(ann[1].t-ann[0].t>=20000,'second affirmation waits for the cooldown');
});
test('tracker: back to the last announced chakra during cooldown does not repeat it',()=>{
  let tr=D.createTracker({holdMs:3000,marginDb:6,cooldownMs:20000,smoothMs:0});
  let r=run(tr,[
    [5000,lv({[ROOT]:-30})],
    [4000,lv({[THROAT]:-30})],
    [20000,lv({[ROOT]:-30})]
  ]);
  assert.deepEqual(primaries(r.events),[ROOT,THROAT,ROOT]);
  assert.deepEqual(announces(r.events),[ROOT]);
});
test('tracker: silence keeps the primary and never announces',()=>{
  let tr=D.createTracker({holdMs:3000,marginDb:6,cooldownMs:0,smoothMs:0});
  let r=run(tr,[[5000,lv({[CROWN]:-30})],[10000,lv({})]]);
  assert.deepEqual(announces(r.events),[CROWN]);
  assert.equal(r.last.primary,CROWN);
  assert.equal(r.last.leader,-1);
});
test('tracker: hold and margin are adjustable live',()=>{
  let tr=D.createTracker({holdMs:3500,marginDb:6,cooldownMs:0,smoothMs:0});
  tr.setOptions({holdMs:1000});
  let r=run(tr,[[1500,lv({[HEART]:-30})]]);
  assert.deepEqual(primaries(r.events),[HEART]);
  assert.equal(tr.state().options.holdMs,1000);
  assert.equal(tr.state().options.marginDb,6);
});
test('tracker defaults: about 3.5 s hold, 3 dB lead, 20 s cooldown',()=>{
  assert.equal(D.DEFAULTS.holdMs,3500);
  assert.equal(D.DEFAULTS.marginDb,3);
  assert.equal(D.DEFAULTS.cooldownMs,20000);
});

test('fft matches a direct DFT',()=>{
  let n=64,re=new Float64Array(n),im=new Float64Array(n),x=[];
  for(let i=0;i<n;i++){x[i]=Math.sin(i*0.7)+0.3*Math.cos(i*2.1);re[i]=x[i]}
  D.fft(re,im);
  for(let k=0;k<n;k++){
    let r=0,m=0;for(let i=0;i<n;i++){r+=x[i]*Math.cos(-2*Math.PI*k*i/n);m+=x[i]*Math.sin(-2*Math.PI*k*i/n)}
    assert.ok(Math.abs(r-re[k])<1e-9&&Math.abs(m-im[k])<1e-9);
  }
});

function tones(sr,parts){
  let total=parts.reduce((s,p)=>s+p.sec,0),out=new Float32Array(Math.round(total*sr)),off=0;
  for(let p of parts){
    let len=Math.round(p.sec*sr);
    for(let i=0;i<len;i++){let t=(off+i)/sr,v=0;for(let [hz,amp] of p.tones)v+=amp*Math.sin(2*Math.PI*hz*t);out[off+i]=v}
    off+=len;
  }
  return out;
}
test('analyzeSamples: synthetic Root..Crown bowls with a hum and a blip give the right marks',()=>{
  let sr=8000,hum=[130.8,0.25],seq=[];
  let notes=[261.6,293.7,329.6,349.2,392,440,493.9];
  notes.forEach((hz,i)=>{
    seq.push({sec:20,tones:[[hz,0.3],hum]});
    if(i===2)seq.push({sec:1.5,tones:[[740*1.0,0.4],hum]}); // brief 741-ish blip stays in the wings
    if(i===2)seq.push({sec:8.5,tones:[[hz,0.3],hum]});
  });
  let a=D.analyzeSamples(tones(sr,seq),sr,{});
  let expected=[0,20,40,70,90,110,130];
  assert.equal(a.found,7);
  assert.equal(a.estimated,false);
  a.timestamps.forEach((t,i)=>assert.ok(Math.abs(t-expected[i])<=2,'mark '+i+' '+t+' vs '+expected[i]));
  assert.ok(!a.segments.some(s=>s.chakra===THROAT&&s.t<80),'the blip did not become a segment');
});
test('timestampsFromSegments: increasing, fills gaps, even when there is no sequence',()=>{
  let r=D.timestampsFromSegments([{t:3,chakra:0},{t:100,chakra:1},{t:300,chakra:3},{t:400,chakra:4},{t:500,chakra:6}],600);
  assert.equal(r.found,5);
  assert.equal(r.estimated,true);
  assert.equal(r.timestamps[0],3);
  assert.equal(r.timestamps[2],200);
  assert.equal(r.timestamps[5],450);
  for(let i=1;i<7;i++)assert.ok(r.timestamps[i]>r.timestamps[i-1]);
  let none=D.timestampsFromSegments([{t:5,chakra:6},{t:50,chakra:0}],700);
  assert.deepEqual(none.timestamps,[0,100,200,300,400,500,600]);
  assert.equal(none.estimated,true);
});
