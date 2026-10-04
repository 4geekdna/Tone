#!/usr/bin/env node
'use strict';
/* Chakra Journey: add a video to the repo library (videos/manifest.json).
   Needs Node 18+ and ffmpeg/ffprobe on PATH. No npm install.

   node tools/add-video.js                 process every file in videos/incoming/
   node tools/add-video.js path/to/a.mp4   process one file (anywhere)
   options:
     --label "Name"   label shown in the Journey video menu (one file only)
     --compress       re-encode to H.264 720p / AAC 128k before adding
     --dry-run        analyze and print, change nothing
     --check          validate the manifest and that every file exists
     --root DIR       repo root (default: this script's parent folder)

   The audio is decoded to 8 kHz mono and run through chakra-dominant.js,
   the same code the page uses, so the timeline matches what Auto hears. */
const fs=require('fs'),path=require('path'),cp=require('child_process');
const D=require('../chakra-dominant.js');
const MAX_BYTES=95*1024*1024;
const VIDEO_EXT=/\.(mp4|m4v|mov|webm|m4a|mp3|wav)$/i;
function args(argv){
  let o={files:[],label:'',compress:false,dry:false,check:false,root:path.resolve(__dirname,'..')};
  for(let i=0;i<argv.length;i++){
    let a=argv[i];
    if(a==='--label')o.label=argv[++i]||'';
    else if(a==='--compress')o.compress=true;
    else if(a==='--dry-run')o.dry=true;
    else if(a==='--check')o.check=true;
    else if(a==='--root')o.root=path.resolve(argv[++i]||'.');
    else if(a==='-h'||a==='--help'){o.help=true}
    else o.files.push(a);
  }
  return o;
}
function slug(s){return String(s).toLowerCase().replace(/\.[a-z0-9]+$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'video'}
function labelFrom(file){return path.basename(file).replace(/\.[a-z0-9]+$/i,'').replace(/[_]+/g,' ').replace(/\s+/g,' ').trim()}
function readManifest(root){
  let p=path.join(root,'videos','manifest.json');
  try{let j=JSON.parse(fs.readFileSync(p,'utf8'));if(!Array.isArray(j.videos))j.videos=[];return j}
  catch(e){return {about:'Chakra Journey video library. Written by tools/add-video.js. See ADDING-VIDEOS.md.',videos:[]}}
}
function writeManifest(root,m){
  m.videos.sort((a,b)=>String(a.label).localeCompare(String(b.label)));
  fs.writeFileSync(path.join(root,'videos','manifest.json'),JSON.stringify(m,null,2)+'\n');
}
function need(bin){let r=cp.spawnSync(bin,['-version'],{encoding:'utf8'});if(r.error||r.status!==0)throw new Error(bin+' not found on PATH. Install ffmpeg first.')}
function duration(file){
  let r=cp.spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file],{encoding:'utf8'});
  let d=parseFloat(r.stdout);return Number.isFinite(d)?d:NaN;
}
function hasAudio(file){
  let r=cp.spawnSync('ffprobe',['-v','error','-select_streams','a','-show_entries','stream=index','-of','csv=p=0',file],{encoding:'utf8'});
  return /\d/.test(r.stdout||'');
}
function decode(file,sampleRate){
  let r=cp.spawnSync('ffmpeg',['-v','error','-i',file,'-vn','-ac','1','-ar',String(sampleRate),'-f','f32le','-'],{maxBuffer:1024*1024*1024});
  if(r.status!==0)throw new Error('ffmpeg could not decode '+file+': '+String(r.stderr||'').trim());
  let b=r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.length-(b.length%4)));
}
function compress(src,dst){
  let r=cp.spawnSync('ffmpeg',['-v','error','-y','-i',src,'-vf','scale=-2:min(720\\,ih)','-c:v','libx264','-preset','medium','-crf','28','-c:a','aac','-b:a','128k','-movflags','+faststart',dst],{encoding:'utf8'});
  if(r.status!==0)throw new Error('ffmpeg could not compress '+src+': '+r.stderr);
}
function analyzeFile(file){
  let sr=8000,samples=decode(file,sr);
  let a=D.analyzeSamples(samples,sr,{});
  return {duration:Math.round(a.duration*10)/10,timestamps:a.timestamps,segments:a.segments,estimated:a.estimated,found:a.found};
}
function clock(s){s=Math.round(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function summary(e){return e.timestamps.map((t,i)=>D.BANDS[i].name+' '+clock(t)).join(' · ')+(e.estimated?'  (estimated: '+e.found+'/7 found in order)':'')}
function check(root){
  let m=readManifest(root),bad=[],ids=new Set();
  m.videos.forEach(v=>{
    if(!v.id||!v.label||!v.file)bad.push('entry missing id/label/file: '+JSON.stringify(v));
    if(ids.has(v.id))bad.push('duplicate id '+v.id);ids.add(v.id);
    if(v.file&&!fs.existsSync(path.join(root,v.file)))bad.push('missing file '+v.file);
    if(!Array.isArray(v.timestamps)||v.timestamps.length!==7)bad.push(v.id+': timestamps must have 7 numbers');
    else for(let i=1;i<7;i++)if(!(v.timestamps[i]>v.timestamps[i-1]))bad.push(v.id+': timestamps must increase');
  });
  return {ok:!bad.length,problems:bad,count:m.videos.length};
}
function addOne(root,file,opt,m){
  if(!fs.existsSync(file))throw new Error('No such file: '+file);
  if(!hasAudio(file))throw new Error(file+' has no audio track; nothing to analyze.');
  let label=opt.label||labelFrom(file);
  let id=slug(label),base=id,n=2;
  while(m.videos.some(v=>v.id===id))id=base+'-'+(n++);
  let ext=opt.compress?'.mp4':path.extname(file).toLowerCase();
  let rel='videos/'+id+ext,dst=path.join(root,rel);
  let info=analyzeFile(file);
  let entry=Object.assign({id:id,label:label,file:rel},info,{analyzedAt:new Date().toISOString(),source:path.basename(file)});
  if(opt.dry)return {entry:entry,moved:false};
  if(opt.compress)compress(file,dst);
  else if(path.resolve(file)!==path.resolve(dst)){
    try{fs.renameSync(file,dst)}catch(e){fs.copyFileSync(file,dst);fs.unlinkSync(file)}
  }
  let size=fs.statSync(dst).size;
  if(size>MAX_BYTES){
    fs.renameSync(dst,file);
    throw new Error(path.basename(file)+' is '+Math.round(size/1048576)+' MB. GitHub refuses files over 100 MB; run again with --compress.');
  }
  entry.bytes=size;
  m.videos.push(entry);
  return {entry:entry,moved:true};
}
function main(){
  let o=args(process.argv.slice(2));
  if(o.help){console.log(fs.readFileSync(__filename,'utf8').split('*/')[0]);return 0}
  if(o.check){let r=check(o.root);console.log(r.ok?'manifest ok ('+r.count+' videos)':r.problems.join('\n'));return r.ok?0:1}
  need('ffmpeg');need('ffprobe');
  let files=o.files;
  if(!files.length){
    let inc=path.join(o.root,'videos','incoming');
    files=fs.existsSync(inc)?fs.readdirSync(inc).filter(f=>VIDEO_EXT.test(f)).map(f=>path.join(inc,f)):[];
    if(!files.length){console.log('Nothing in videos/incoming/.');return 0}
  }
  if(o.label&&files.length>1)throw new Error('--label works with one file at a time.');
  fs.mkdirSync(path.join(o.root,'videos'),{recursive:true});
  let m=readManifest(o.root),code=0;
  for(let f of files){
    try{
      let r=addOne(o.root,f,o,m);
      console.log((o.dry?'[dry run] ':'added ')+r.entry.id+' -> '+r.entry.file+'\n  '+summary(r.entry));
    }catch(e){console.error('skipped '+f+': '+e.message);code=1}
  }
  if(!o.dry)writeManifest(o.root,m);
  return code;
}
if(require.main===module){
  try{process.exitCode=main()}catch(e){console.error(e.message);process.exitCode=1}
}
module.exports={args:args,slug:slug,analyzeFile:analyzeFile,check:check,readManifest:readManifest};
