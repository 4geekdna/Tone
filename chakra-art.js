(function(){
'use strict';
const KEY='chakraArtSettings';
const COLORS=['#C62828','#E65100','#F9A825','#2E7D32','#0277BD','#283593','#6A1B9A'];
const NAMES=['Root','Sacral','Solar Plexus','Heart','Throat','Third Eye','Crown'];
const MARKS=[0,102,194,277,366,450,536];
const VIDEOS=['Quick Morning Chakra Alignment Sound Bath - 11 Minute Chakra Balancing Meditation Frequencies.mp4'];
const $=id=>document.getElementById(id);
function load(){try{return Object.assign({speed:1,blend:0.85,strength:1,dark:0.25,bands:7,lock:false,look:'wash',peaks:false,source:VIDEOS[0],react:1.4,adapt:0.35,variance:0.7},JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){return {speed:1,blend:0.85,strength:1,dark:0.25,bands:7,lock:false,look:'wash',peaks:false,source:VIDEOS[0],react:1.4,adapt:0.35,variance:0.7}}}
function save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
let st=load();
const canvas=$('art'),ctx=canvas.getContext('2d');
const video=$('player');
const HZ=[396,417,528,639,741,852,963];
let audio,analyser,data,raf=0,wake=null,fileUrl='',smooth=[],picked=-1,pendingFile=null;
const LIB='cj_video_library_v1';
function hex(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]}
function mix(a,b,t){return a.map((v,i)=>Math.round(v+(b[i]-v)*t))}
function resize(){canvas.width=innerWidth;canvas.height=innerHeight}
addEventListener('resize',resize);resize();
function chakraNow(){let t=video.currentTime||0,i=0;for(let n=0;n<MARKS.length;n++)if(t>=MARKS[n])i=n;return i}
function bands(){
  if(!analyser||!data)return COLORS.slice(0,st.bands).map(()=>0.15);
  analyser.getFloatFrequencyData(data);
  let sr=audio.sampleRate||48000,n=data.length,bin=sr/(analyser.fftSize||2048);
  let out=[];
  for(let i=0;i<st.bands;i++){
    let hz=HZ[i%7],half=18+i*4,a=Math.max(0,Math.floor((hz-half)/bin)),b=Math.min(n-1,Math.ceil((hz+half)/bin)),peak=-120;
    for(let k=a;k<=b;k++)if(data[k]>peak)peak=data[k];
    let mag=Math.max(0,Math.min(1,(peak+78)/48));
    mag=Math.pow(mag,1/st.react);
    if(!smooth[i])smooth[i]=mag;
    let aRate=mag>smooth[i]?st.adapt:st.adapt*0.45;
    smooth[i]=smooth[i]+(mag-smooth[i])*aRate;
    out.push(smooth[i]);
  }
  return out;
}
function colorOf(levels){
  let loud=0,sum=0;
  for(let i=0;i<levels.length;i++){sum+=levels[i];if(levels[i]>levels[loud])loud=i}
  picked=loud;
  let mean=sum/Math.max(1,levels.length);
  let spread=levels[loud]-mean;
  let take=Math.max(st.blend,st.variance*Math.min(1,spread*3));
  let base=hex(st.lock?COLORS[chakraNow()]:COLORS[loud]);
  let acc=[0,0,0],w=0;
  for(let i=0;i<levels.length;i++){
    let m=levels[i];
    if(m<0.12)continue;
    let c=hex(COLORS[i%7]);
    acc[0]+=c[0]*m;acc[1]+=c[1]*m;acc[2]+=c[2]*m;w+=m;
  }
  if(!w)return base;
  return mix(base,acc.map(v=>v/w),1-take);
}
function paint(col,levels,t){
  let w=canvas.width,h=canvas.height,g=ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,'rgb('+col.join(',')+')');
  g.addColorStop(1,'rgb('+mix(col,[8,6,16],st.dark).join(',')+')');
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  if(st.look==='blobs'||st.look==='rings'){
    levels.forEach((m,i)=>{
      if(m<0.08)return;
      let x=w*(0.2+0.6*((i+Math.sin(t*st.speed+i))/7));
      let y=h*(0.3+0.4*Math.cos(t*st.speed*0.7+i));
      ctx.beginPath();
      if(st.look==='rings')ctx.arc(w/2,h/2,40+i*28+m*40,0,7);
      else ctx.arc(x,y,30+m*90*st.strength,0,7);
      ctx.strokeStyle='rgba('+hex(COLORS[i%7]).join(',')+','+(0.25+m)+')';
      ctx.lineWidth=st.look==='rings'?8:0;
      if(st.look==='blobs'){ctx.fillStyle=ctx.strokeStyle;ctx.fill()}else ctx.stroke();
    });
  }
}
function frame(ts){
  raf=requestAnimationFrame(frame);
  if(video.paused&&!st.peaks)return;
  let levels=bands();
  let col=colorOf(levels);
  paint(col,levels,(ts||0)/1000);
  document.body.style.background='rgb('+col.join(',')+')';
  if(window.goveePaintBlend)window.goveePaintBlend('#'+col.map(v=>v.toString(16).padStart(2,'0')).join(''),70,'#'+col.map(v=>v.toString(16).padStart(2,'0')).join(''),50);
}
function show(){
  $('speed').value=st.speed;$('speedv').textContent=st.speed;
  $('react').value=st.react;$('reactv').textContent=st.react;
  $('adapt').value=st.adapt;$('adaptv').textContent=st.adapt;
  $('variance').value=st.variance;$('varv').textContent=st.variance;
  $('blend').value=st.blend;$('blendv').textContent=st.blend;
  $('strength').value=st.strength;$('strengthv').textContent=st.strength;
  $('dark').value=st.dark;$('darkv').textContent=st.dark;
  $('bands').value=st.bands;$('bandsv').textContent=st.bands;
  $('lock').textContent='Chakra lock: '+(st.lock?'On':'Off');
  $('peaks').textContent='Peaks mode: '+(st.peaks?'On':'Off');
  document.querySelectorAll('[data-look]').forEach(b=>b.classList.toggle('on',b.dataset.look===st.look));
}
function sources(){
  let sel=$('source');sel.innerHTML='';
  function add(v,t){let o=document.createElement('option');o.value=v;o.textContent=t;sel.appendChild(o)}
  VIDEOS.forEach(f=>add(f,'Bowl video'));
  (st.saved||[]).forEach(x=>add('lib:'+x.id,x.label));
  (st.recent||[]).forEach(x=>add('here:'+x.id,x.label+' · in place'));
  if(st.source)sel.value=st.source;
}
function remember(list,item){
  list=list.filter(x=>x.id!==item.id);
  list.unshift(item);
  return list.slice(0,8);
}
function idb(){return new Promise((ok,no)=>{try{let q=indexedDB.open(LIB,1);q.onupgradeneeded=()=>{let db=q.result;if(!db.objectStoreNames.contains('videos'))db.createObjectStore('videos',{keyPath:'id'})};q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)}catch(e){no(e)}})}
async function saveLibrary(){
  if(!pendingFile){$('note').textContent='Pick a file first.';return}
  let id=Date.now()+'-'+pendingFile.name;
  let db=await idb();
  await new Promise((ok,no)=>{let t=db.transaction('videos','readwrite');t.objectStore('videos').put({id:id,label:pendingFile.name,kind:'file',blob:pendingFile,addedAt:Date.now()});t.oncomplete=ok;t.onerror=()=>no(t.error)});
  st.saved=remember(st.saved||[],{id:id,label:pendingFile.name});
  st.source='lib:'+id;save(st);sources();
  $('note').textContent='Saved with the other added videos on this phone.';
}
async function useHere(){
  if(!pendingFile){$('note').textContent='Pick a file first.';return}
  if(fileUrl)URL.revokeObjectURL(fileUrl);
  fileUrl=URL.createObjectURL(pendingFile);
  video.src=fileUrl;
  let id=pendingFile.name;
  st.recent=remember(st.recent||[],{id:id,label:pendingFile.name});
  st.source='here:'+id;save(st);sources();
  $('note').textContent='Playing in place. It stays in the list on this phone.';
}
async function openSaved(id){
  let db=await idb();
  let row=await new Promise(ok=>{let t=db.transaction('videos','readonly');let r=t.objectStore('videos').get(id);r.onsuccess=()=>ok(r.result);r.onerror=()=>ok(null)});
  if(!row||!row.blob){$('note').textContent='That saved file is not on this phone.';return}
  if(fileUrl)URL.revokeObjectURL(fileUrl);
  fileUrl=URL.createObjectURL(row.blob);
  video.src=fileUrl;
}
async function play(){
  if(!video.src)video.src=encodeURI(st.source||VIDEOS[0]);
  try{await video.play()}catch(e){}
  let AC=window.AudioContext||window.webkitAudioContext;
  if(AC&&!audio){audio=new AC();analyser=audio.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=0.35;analyser.minDecibels=-90;analyser.maxDecibels=-20;data=new Float32Array(analyser.frequencyBinCount);let src=audio.createMediaElementSource(video);src.connect(analyser);analyser.connect(audio.destination)}
  if(audio&&audio.state!=='running')await audio.resume();
  try{wake=await navigator.wakeLock.request('screen')}catch(e){}
  if(!raf)raf=requestAnimationFrame(frame);
  $('play').textContent=picked<0?'Playing':NAMES[picked]+' · '+HZ[picked]+' Hz';
}
$('play').onclick=play;
$('thumb').onclick=()=>$('thumb').classList.toggle('hide');
$('gear').onclick=()=>{$('pop').classList.add('on');show()};
$('close').onclick=()=>$('pop').classList.remove('on');
$('peaks').onclick=()=>{st.peaks=!st.peaks;save(st);show()};
$('lock').onclick=()=>{st.lock=!st.lock;save(st);show()};
document.querySelectorAll('[data-look]').forEach(b=>b.onclick=()=>{st.look=b.dataset.look;save(st);show()});
['speed','blend','strength','dark','bands','react','adapt','variance'].forEach(id=>$(id).oninput=()=>{st[id]=+$(id).value;save(st);show()});
$('source').onchange=()=>{
  st.source=$('source').value;save(st);
  if(st.source.indexOf('lib:')===0){openSaved(st.source.slice(4));return}
  if(st.source.indexOf('here:')===0){$('note').textContent='In-place files play after you pick them again this visit.';return}
  video.src=encodeURI(st.source);
};
$('pickVideo').onclick=()=>{$('file').accept='video/*';$('file').click()};
$('pickAudio').onclick=()=>{$('file').accept='audio/*';$('file').click()};
$('saveLib').onclick=()=>saveLibrary().catch(e=>{$('note').textContent=e.message||'Could not save.'});
$('useHere').onclick=()=>useHere();
$('file').onchange=()=>{pendingFile=$('file').files&&$('file').files[0];if(!pendingFile)return;$('note').textContent=pendingFile.name+' — Save to library, or Use in place.';};
sources();show();
let s=document.createElement('script');s.src='govee-chakra.js?v=20261006a';document.body.appendChild(s);
})();
