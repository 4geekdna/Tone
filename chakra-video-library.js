(function(){
'use strict';
/* Chakra Journey v0.44 — Add video.
   Pick a video on the phone or paste a direct video link. The audio is
   decoded on the device, CJDominant finds the primary-chakra timeline,
   and the video is saved with its 7 journey marks:
   - files: stored on this device in IndexedDB cj_video_library_v1
   - links: only the link and the marks are stored; the link must allow
     cross-origin reads (CORS) or the sound cannot be analyzed
   Repo videos listed in videos/manifest.json (tools/add-video.js) show
   up as a Library group. See ADDING-VIDEOS.md. */
const DB='cj_video_library_v1',STORE='videos',MANIFEST='videos/manifest.json',MAX_ANALYZE=600*1024*1024;
const D=window.CJDominant;
const $=id=>document.getElementById(id);
let items=[],repo=[],objectUrl='',pickMode='file',pickedFile=null,busy=false;
function idb(){return new Promise((ok,no)=>{try{let q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{let db=q.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'})};q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)}catch(e){no(e)}})}
async function tx(mode,fn){let db=await idb();return await new Promise((ok,no)=>{let t=db.transaction(STORE,mode),st=t.objectStore(STORE),out;try{out=fn(st)}catch(e){no(e);return}t.oncomplete=()=>ok(out&&'result' in out?out.result:out);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)})}
async function listLocal(){try{let r=await tx('readonly',st=>st.getAll());return Array.isArray(r)?r:[]}catch(e){return[]}}
async function getLocal(id){try{return await tx('readonly',st=>st.get(id))||null}catch(e){return null}}
async function putLocal(item){return await tx('readwrite',st=>st.put(item))}
async function delLocal(id){try{await tx('readwrite',st=>st.delete(id))}catch(e){}}
async function loadManifest(){
  try{
    let r=await fetch(MANIFEST,{cache:'no-cache'});
    if(!r.ok)return[];
    let j=await r.json();
    return (Array.isArray(j.videos)?j.videos:[]).filter(v=>v&&v.id&&v.file&&v.label);
  }catch(e){return[]}
}
function clock(s){s=Math.max(0,Math.round(+s||0));return Math.floor(s/60)+':'+(s%60<10?'0':'')+(s%60)}
function names(){return (window.C||[]).map(c=>c[0])}
function marksText(ts){let n=names();return (ts||[]).map((t,i)=>(n[i]||'')+' '+clock(t)).join(' · ')}
function setMarks(ts){
  if(!Array.isArray(ts)||ts.length!==7)return false;
  let last=null;
  ts.forEach((t,i)=>{let el=document.querySelector('[data-ts="'+i+'"]');if(el){el.value=clock(t);last=el}});
  if(last)last.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}
function options(){
  let out=repo.map(v=>({id:'repo:'+v.id,label:v.label}));
  items.slice().sort((a,b)=>(a.addedAt||0)-(b.addedAt||0)).forEach(v=>out.push({id:'lib:'+v.id,label:v.label}));
  if(typeof window.CJVideoOptions==='function')window.CJVideoOptions(out);
  markRemove();
}
async function refresh(){
  let pair=await Promise.all([loadManifest(),listLocal()]);
  repo=pair[0];items=pair[1].map(x=>Object.assign({},x,{blob:undefined}));
  options();
}
function note(t){let n=$('videoChoiceNote');if(n)n.textContent=t}
function player(){return $('player')}
function load(src,cross,keepTime){
  let p=player();if(!p)return;
  let t=keepTime?p.currentTime:0,was=!p.paused;
  p.pause();
  if(cross)p.crossOrigin='anonymous';else{try{p.removeAttribute('crossorigin')}catch(e){}}
  p.src=src;
  try{p.load()}catch(e){}
  if(keepTime||was)p.addEventListener('loadedmetadata',function once(){if(keepTime&&Number.isFinite(t))p.currentTime=Math.min(t,Math.max(0,(p.duration||t)-.1));if(was)p.play().catch(()=>{})},{once:true});
  if(window.CJAudioLights&&typeof window.CJAudioLights.start==='function'){try{window.CJAudioLights.start()}catch(e){}}
}
function describe(v){
  let s=v.timestamps&&v.timestamps.length===7?marksText(v.timestamps):'';
  if(v.estimated)return 'No clear 7-step bowl sequence in this video, so the marks are spaced evenly. Auto mode follows the sound live.'+(s?' '+s:'');
  return s?'Detected: '+s:'Auto mode follows the sound live.';
}
async function play(id,keepTime){
  setTimeout(markRemove,0);
  if(id.indexOf('repo:')===0){
    let v=repo.find(x=>'repo:'+x.id===id);if(!v)return;
    load(encodeURI(v.file),false,keepTime);setMarks(v.timestamps);note(describe(v));return;
  }
  let v=await getLocal(id.slice(4));
  if(!v){note('That video is no longer on this device.');return}
  if(v.kind==='url'){load(v.url,true,keepTime);setMarks(v.timestamps);note(describe(v));return}
  if(v.blob){
    if(objectUrl){try{URL.revokeObjectURL(objectUrl)}catch(e){}}
    objectUrl=URL.createObjectURL(v.blob);
    load(objectUrl,false,keepTime);setMarks(v.timestamps);note(describe(v));return;
  }
  setMarks(v.timestamps);
  note('Only the timeline was saved for '+v.label+'. Choose the file again to play it.');
  openSheet();pickMode='file';paintSheet();
}
/* Decode to mono at a low rate (enough for 80–2200 Hz) to keep memory small. */
function offline(){
  let O=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!O)return null;
  for(let sr of [8000,16000,22050,44100]){try{return new O(1,sr,sr)}catch(e){}}
  return null;
}
function decode(ab){
  return new Promise((ok,no)=>{
    let c=offline();
    if(!c){no(new Error('This browser cannot decode audio offline.'));return}
    try{
      let p=c.decodeAudioData(ab,ok,e=>no(e||new Error('decode failed')));
      if(p&&p.then)p.then(ok,no);
    }catch(e){no(e)}
  });
}
function mono(buf){
  if(buf.numberOfChannels<2)return buf.getChannelData(0);
  let a=buf.getChannelData(0),b=buf.getChannelData(1),out=new Float32Array(a.length);
  for(let i=0;i<a.length;i++)out[i]=(a[i]+b[i])*.5;
  return out;
}
async function analyze(ab,say){
  say('Reading the audio…');
  await new Promise(r=>setTimeout(r,30));
  let buf=await decode(ab);
  say('Finding the chakra timeline…');
  await new Promise(r=>setTimeout(r,30));
  return D.analyzeSamples(mono(buf),buf.sampleRate,{});
}
function isYouTube(u){return /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i.test(u.hostname)}
async function fromUrl(raw,say){
  let u;try{u=new URL(raw)}catch(e){throw new Error('Paste a full link that starts with https://')}
  if(!/^https?:$/.test(u.protocol))throw new Error('Paste a full link that starts with https://');
  if(isYouTube(u))throw new Error('YouTube links cannot be used. YouTube does not let web pages read its audio, so the chakra cannot be detected. Download the video to your phone and choose it here.');
  say('Checking the link…');
  let r;
  try{r=await fetch(u.href,{mode:'cors'})}catch(e){throw new Error('This site does not allow its audio to be read by other pages (cross-origin). Download the video to your phone and choose it here.')}
  if(!r.ok)throw new Error('The link answered '+r.status+'.');
  let type=r.headers.get('content-type')||'';
  if(/text\/html/i.test(type))throw new Error('That link is a web page, not a video file. Use a direct link to the .mp4 file.');
  let len=+r.headers.get('content-length')||0;
  if(len>MAX_ANALYZE)return {analysis:null,url:u.href};
  say('Downloading for analysis…');
  let ab=await r.arrayBuffer();
  return {analysis:await analyze(ab,say),url:u.href};
}
function even(duration){return D.timestampsFromSegments([],duration).timestamps}
function slug(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function sheetStatus(t){let el=$('addStatus');if(el)el.textContent=t}
async function save(){
  if(busy)return;
  let label=($('addName').value||'').trim();
  busy=true;$('addGo').disabled=true;
  try{
    let item={id:slug(),addedAt:Date.now(),segments:[],timestamps:null,estimated:true,found:0};
    let result=null;
    if(pickMode==='url'){
      let raw=($('addUrl').value||'').trim();
      if(!raw)throw new Error('Paste a direct video link first.');
      let got=await fromUrl(raw,sheetStatus);
      result=got.analysis;item.kind='url';item.url=got.url;
      if(!label)label=decodeURIComponent(got.url.split('/').pop().split('?')[0]||'Video link').replace(/\.[a-z0-9]+$/i,'');
    }else{
      let f=pickedFile;
      if(!f)throw new Error('Choose a video first.');
      item.kind='file';item.name=f.name;item.size=f.size;item.blob=f;
      if(!label)label=f.name.replace(/\.[a-z0-9]+$/i,'');
      if(f.size<=MAX_ANALYZE){
        try{result=await analyze(await f.arrayBuffer(),sheetStatus)}catch(e){result=null}
      }
    }
    item.label=label||'My video';
    if(result){item.duration=Math.round(result.duration);item.segments=result.segments;item.timestamps=result.timestamps;item.estimated=result.estimated;item.found=result.found}
    else{item.timestamps=even(item.duration||660);item.estimated=true}
    sheetStatus('Saving…');
    try{await putLocal(item)}catch(e){
      if(item.blob){delete item.blob;await putLocal(item);sheetStatus('Saved the timeline only (not enough storage for the file).')}else throw e;
    }
    await refresh();
    closeSheet();
    if(typeof window.CJSelectVideo==='function')window.CJSelectVideo('lib:'+item.id,false);
    note((result?'':'Could not read this audio, so the marks are spaced evenly. Auto mode follows the sound live. ')+describe(item));
  }catch(e){sheetStatus(e&&e.message?e.message:'Could not add this video.')}
  finally{busy=false;let g=$('addGo');if(g)g.disabled=false}
}
async function removeCurrent(){
  let id=typeof window.CJCurrentVideoId==='function'?window.CJCurrentVideoId():'';
  if(id.indexOf('lib:')!==0)return;
  let v=items.find(x=>'lib:'+x.id===id);
  if(!confirm('Remove '+(v?v.label:'this video')+' from this device?'))return;
  await delLocal(id.slice(4));
  await refresh();
  if(typeof window.CJSelectVideo==='function')window.CJSelectVideo('default',false);
}
function markRemove(){
  let b=$('removeVideo');if(!b)return;
  let id=typeof window.CJCurrentVideoId==='function'?window.CJCurrentVideoId():'';
  b.style.display=id.indexOf('lib:')===0?'':'none';
}
function paintSheet(){
  let s=$('addVideoSheet');if(!s)return;
  s.querySelectorAll('[data-k]').forEach(b=>b.classList.toggle('on',b.dataset.k===pickMode));
  s.querySelectorAll('[data-pane]').forEach(p=>p.style.display=p.dataset.pane===pickMode?'':'none');
}
function openSheet(){let s=$('addVideoSheet');if(s){s.style.display='block';sheetStatus('')}}
function closeSheet(){let s=$('addVideoSheet');if(s)s.style.display='none';pickedFile=null;let n=$('addFileName');if(n)n.textContent='No video chosen';let u=$('addUrl');if(u)u.value='';let nm=$('addName');if(nm)nm.value=''}
function install(){
  let note=$('videoChoiceNote');
  if(!note||$('addVideoSheet')||!D)return;
  let st=document.createElement('style');
  st.textContent='#chooseVideoFile{display:none!important}.lib-actions{display:flex;gap:8px;margin:8px 0 2px}.lib-actions .btn{flex:1;padding:9px}#addVideoSheet{display:none;margin-top:10px;padding:12px;border-radius:14px;background:#15151b;border:1px solid #35353f}.add-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px}.add-tabs button{border:0;border-radius:10px;padding:10px;color:#fff;background:#2a2a32;font-weight:600}.add-tabs button.on{background:#fff;color:#111}#addVideoSheet .btn{width:100%;margin-top:6px}#addStatus{min-height:18px;margin-top:8px}';
  document.head.appendChild(st);
  let bar=document.createElement('div');
  bar.className='lib-actions';
  bar.innerHTML='<button class="btn" id="addVideo" type="button">Add video</button><button class="btn" id="removeVideo" type="button" style="display:none">Remove</button>';
  note.insertAdjacentElement('afterend',bar);
  let sheet=document.createElement('div');
  sheet.id='addVideoSheet';
  sheet.innerHTML='<div class="add-tabs"><button type="button" data-k="file" class="on">From this device</button><button type="button" data-k="url">From a link</button></div>'+
    '<div data-pane="file"><button class="btn" id="addPick" type="button">Choose video</button><div class="voice-note" id="addFileName">No video chosen</div></div>'+
    '<div data-pane="url" style="display:none"><div class="row"><label>Link</label><input id="addUrl" type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://…/video.mp4"></div><div class="voice-note">A direct link to an .mp4 file on a site that allows cross-origin reads. YouTube links cannot be analyzed.</div></div>'+
    '<div class="row"><label>Name</label><input id="addName" placeholder="Optional" autocomplete="off"></div>'+
    '<button class="btn play" id="addGo" type="button">Analyze and save</button><button class="btn" id="addCancel" type="button">Cancel</button>'+
    '<div class="voice-note" id="addStatus"></div>';
  bar.insertAdjacentElement('afterend',sheet);
  let input=document.createElement('input');
  input.type='file';input.accept='video/*,audio/*';input.id='addVideoFile';input.hidden=true;
  input.addEventListener('change',()=>{let f=input.files&&input.files[0];input.value='';if(!f)return;pickedFile=f;$('addFileName').textContent=f.name+' · '+Math.round(f.size/1048576)+' MB'});
  document.body.appendChild(input);
  $('addVideo').onclick=()=>{let s=$('addVideoSheet');if(s.style.display==='block')closeSheet();else{openSheet();paintSheet()}};
  $('removeVideo').onclick=removeCurrent;
  $('addPick').onclick=()=>input.click();
  $('addGo').onclick=save;
  $('addCancel').onclick=closeSheet;
  sheet.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{pickMode=b.dataset.k;paintSheet();sheetStatus('')});
  let sel=$('journeyVideo');if(sel)sel.addEventListener('change',()=>setTimeout(markRemove,0));
  refresh();
}
window.CJVideoLibrary={play:play,refresh:refresh,setMarks:setMarks,list:()=>items.slice(),repo:()=>repo.slice(),analyze:analyze,fromUrl:fromUrl,remove:delLocal};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
