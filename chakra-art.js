(function(){
'use strict';
const KEY='chakraArtSettings';
const COLORS=['#C62828','#E65100','#F9A825','#2E7D32','#0277BD','#283593','#6A1B9A'];
const NAMES=['Root','Sacral','Solar Plexus','Heart','Throat','Third Eye','Crown'];
const MARKS=[0,102,194,277,366,450,536];
const VIDEOS=['Quick Morning Chakra Alignment Sound Bath - 11 Minute Chakra Balancing Meditation Frequencies.mp4'];
const $=id=>document.getElementById(id);
function load(){try{return Object.assign({speed:1,blend:0.65,strength:1,dark:0.25,bands:7,lock:true,look:'wash',peaks:false,source:VIDEOS[0]},JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){return {speed:1,blend:0.65,strength:1,dark:0.25,bands:7,lock:true,look:'wash',peaks:false,source:VIDEOS[0]}}}
function save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
let st=load();
const canvas=$('art'),ctx=canvas.getContext('2d');
const video=$('player');
let audio,analyser,data,raf=0,wake=null,fileUrl='';
function hex(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]}
function mix(a,b,t){return a.map((v,i)=>Math.round(v+(b[i]-v)*t))}
function resize(){canvas.width=innerWidth;canvas.height=innerHeight}
addEventListener('resize',resize);resize();
function chakraNow(){let t=video.currentTime||0,i=0;for(let n=0;n<MARKS.length;n++)if(t>=MARKS[n])i=n;return i}
function bands(){
  if(!analyser||!data)return COLORS.slice(0,st.bands).map(()=>0.2);
  analyser.getByteFrequencyData(data);
  let out=[],n=st.bands;
  for(let i=0;i<n;i++){
    let a=Math.floor(data.length*(i/n)*0.5),b=Math.floor(data.length*((i+1)/n)*0.5),s=0;
    for(let k=a;k<b;k++)s+=data[k];
    out.push(b>a?s/(b-a)/255:0);
  }
  return out;
}
function colorOf(levels){
  let lock=st.lock?chakraNow():0;
  let base=hex(COLORS[lock]);
  let acc=[0,0,0],w=0;
  for(let i=0;i<levels.length;i++){
    let m=levels[i];
    if(m<0.08)continue;
    let c=hex(COLORS[i%7]);
    acc[0]+=c[0]*m;acc[1]+=c[1]*m;acc[2]+=c[2]*m;w+=m;
  }
  if(!w)return base;
  let live=acc.map(v=>v/w);
  return mix(base,live,st.blend);
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
  VIDEOS.forEach(f=>{let o=document.createElement('option');o.value=f;o.textContent='Bowl video';sel.appendChild(o)});
  if(st.source&&VIDEOS.indexOf(st.source)<0){let o=document.createElement('option');o.value=st.source;o.textContent='Last file';sel.appendChild(o)}
  sel.value=st.source||VIDEOS[0];
}
async function play(){
  if(!video.src)video.src=encodeURI(st.source||VIDEOS[0]);
  try{await video.play()}catch(e){}
  let AC=window.AudioContext||window.webkitAudioContext;
  if(AC&&!audio){audio=new AC();analyser=audio.createAnalyser();analyser.fftSize=1024;data=new Uint8Array(analyser.frequencyBinCount);let src=audio.createMediaElementSource(video);src.connect(analyser);analyser.connect(audio.destination)}
  if(audio&&audio.state!=='running')await audio.resume();
  try{wake=await navigator.wakeLock.request('screen')}catch(e){}
  if(!raf)raf=requestAnimationFrame(frame);
  $('play').textContent='Playing';
}
$('play').onclick=play;
$('thumb').onclick=()=>$('thumb').classList.toggle('hide');
$('gear').onclick=()=>{$('pop').classList.add('on');show()};
$('close').onclick=()=>$('pop').classList.remove('on');
$('peaks').onclick=()=>{st.peaks=!st.peaks;save(st);show()};
$('lock').onclick=()=>{st.lock=!st.lock;save(st);show()};
document.querySelectorAll('[data-look]').forEach(b=>b.onclick=()=>{st.look=b.dataset.look;save(st);show()});
['speed','blend','strength','dark','bands'].forEach(id=>$(id).oninput=()=>{st[id]=+$(id).value;save(st);show()});
$('source').onchange=()=>{st.source=$('source').value;save(st);video.src=encodeURI(st.source)};
$('pickVideo').onclick=()=>{$('file').accept='video/*';$('file').click()};
$('pickAudio').onclick=()=>{$('file').accept='audio/*';$('file').click()};
$('file').onchange=()=>{let f=$('file').files&&$('file').files[0];if(!f)return;if(fileUrl)URL.revokeObjectURL(fileUrl);fileUrl=URL.createObjectURL(f);video.src=fileUrl;st.source=f.name;save(st);sources()};
sources();show();
let s=document.createElement('script');s.src='govee-chakra.js?v=20261006a';document.body.appendChild(s);
})();
