'use strict';
/* Static page checks plus the repo add-video tool. node --test tests/ */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'chakra-deploy.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([^"?]+)\?v=([^"]+)"><\/script>/g)].map(m=>({file:m[1],v:m[2]}));
const VERSION='v0.48';
const hasFfmpeg=!cp.spawnSync('ffmpeg',['-version']).error;

test('version '+VERSION+' in the title, the .sub line, and the Master Index card',()=>{
  assert.match(html,new RegExp('<title>Chakra Journey '+VERSION.replace('.','\\.')+'</title>'));
  assert.match(html,new RegExp('<p class="sub">'+VERSION.replace('.','\\.')+' '));
  let idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  assert.ok(idx.includes('CURRENT • '+VERSION));
  assert.ok(idx.includes('chakra-deploy.html?v=')&&idx.includes('-'+VERSION.replace('.','')+'"'));
  assert.ok(idx.includes('<footer>Release '+VERSION+' '));
});
test('every loaded script exists and parses',()=>{
  assert.ok(scripts.length>=15);
  for(let s of scripts){
    let src=fs.readFileSync(path.join(ROOT,s.file),'utf8');
    assert.doesNotThrow(()=>new vm.Script(src,{filename:s.file}),s.file);
  }
});
test('no microphone: no loaded script calls getUserMedia',()=>{
  for(let s of scripts){
    let src=fs.readFileSync(path.join(ROOT,s.file),'utf8');
    assert.ok(!/getUserMedia/.test(src),s.file+' must not use the microphone');
  }
});
test('new v0.44 modules are loaded in order',()=>{
  let order=scripts.map(s=>s.file);
  let at=f=>order.indexOf(f);
  assert.ok(at('chakra-dominant.js')>=0&&at('chakra-dominant.js')<at('chakra-journey-core.js'));
  assert.ok(at('chakra-video-library.js')>at('chakra-video-selector.js'));
  assert.ok(at('chakra-auto-mantra.js')>at('chakra-audio-lights.js'));
  for(let f of ['chakra-dominant.js','chakra-video-library.js','chakra-auto-mantra.js','chakra-video-selector.js'])
    assert.equal(scripts.find(s=>s.file===f).v,'20261004a',f+' cache-bust');
  assert.equal(scripts.find(s=>s.file==='chakra-journey-core.js').v,'20261005b','chakra-journey-core.js cache-bust');
  assert.equal(scripts.find(s=>s.file==='chakra-journey-v030.js').v,'20261005a','chakra-journey-v030.js cache-bust');
  assert.equal(scripts.find(s=>s.file==='chakra-audio-lights.js').v,'20261005b','chakra-audio-lights.js cache-bust');
  assert.equal(scripts.find(s=>s.file==='chakra-color-blend.js').v,'20261005a','chakra-color-blend.js cache-bust');
  assert.ok(at('chakra-color-blend.js')>=0&&at('chakra-color-blend.js')<at('chakra-audio-lights.js'));
});
test('breath cue does not scale the screen',()=>{
  assert.ok(!html.includes('scale(1.12)')&&!html.includes('scale(.88)'));
  assert.ok(!/#breathCue\{[^}]*transform/.test(html));
  let auto=fs.readFileSync(path.join(ROOT,'chakra-automation.js'),'utf8');
  assert.ok(auto.includes('autoBreath:false'));
  assert.ok(auto.includes('saved.breathCue===true'));
  assert.ok(!auto.includes('setTimeout(tick'));
  assert.equal(scripts.find(s=>s.file==='chakra-automation.js').v,'20261005c');
});
test('Auto sits next to the other progression modes in the markup',()=>{
  let sel=html.match(/<select id="mode">([\s\S]*?)<\/select>/)[1];
  assert.deepEqual([...sel.matchAll(/value="([a-z]+)"/g)].map(m=>m[1]),['timestamps','affirmation','timed','auto']);
});
test('never-touch values are unchanged',()=>{
  let core=fs.readFileSync(path.join(ROOT,'chakra-journey-core.js'),'utf8');
  assert.ok(core.includes('const ANALYZED=[0,102,194,277,366,450,536];'));
  assert.ok(core.includes('const VIDEO_FILES=["Quick Morning Chakra Alignment Sound Bath - 11 Minute Chakra Balancing Meditation Frequencies.mp4","Chakra01.mp4","chakra01.mp4"];'));
  assert.ok(!/speechSynthesis/.test(core));
});
test('no emoji in the new v0.44 files',()=>{
  for(let f of ['chakra-dominant.js','chakra-auto-mantra.js','chakra-video-library.js','chakra-video-selector.js','ADDING-VIDEOS.md','tools/add-video.js']){
    let s=fs.readFileSync(path.join(ROOT,f),'utf8');
    assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s),f);
  }
});
test('journey no longer aborts the run on one missing voice line',()=>{
  let core=fs.readFileSync(path.join(ROOT,'chakra-journey-core.js'),'utf8');
  assert.match(core,/function stopForMissingVoice\(msg\)\{showVoiceGap\(msg\);return false\}/);
  assert.ok(core.includes('setTimeout(()=>done(true),ms)'),'voice playback resolves if onended never fires');
  let bowl=fs.readFileSync(path.join(ROOT,'chakra-journey-v030.js'),'utf8');
  assert.ok(!bowl.includes('lg.connect(master.gain)'),'wobble must not drive the ramped gain');
  assert.ok(bowl.includes('linearRampToValueAtTime(vol'));
  assert.ok(bowl.includes('lg.connect(wob.gain)'));
  let rec=fs.readFileSync(path.join(ROOT,'chakra-session-record.js'),'utf8');
  assert.ok(rec.includes('createMediaElementSource'),'video still taps into the record bus');
  assert.ok(rec.includes('__cjRecBus'));
  assert.ok(rec.includes('gain.connect(ctx.destination)'),'speakers hear the video gain, not the pull node');
  assert.ok(rec.includes('__cjRecTapped.add(gain)'),'video gain is not copied onto the record bus a second time');
  assert.ok(rec.includes('chakra-audio-copy.js?v=20261005b'));
  assert.ok(rec.includes('silent.gain.value=0'));
  assert.equal(scripts.find(s=>s.file==='chakra-session-record.js').v,'20261005b');
  let copy=fs.readFileSync(path.join(ROOT,'chakra-audio-copy.js'),'utf8');
  assert.doesNotThrow(()=>new vm.Script(copy,{filename:'chakra-audio-copy.js'}));
  assert.ok(copy.includes('registerProcessor("cj-copy"'));
});
test('videos/manifest.json is valid',()=>{
  let r=require('../tools/add-video.js').check(ROOT);
  assert.ok(r.ok,r.problems.join('\n'));
});

test('add-video tool: drop folder -> analyzed manifest entry',{skip:!hasFfmpeg&&'ffmpeg not installed'},()=>{
  let dir=fs.mkdtempSync(path.join(os.tmpdir(),'cj-add-'));
  fs.mkdirSync(path.join(dir,'videos','incoming'),{recursive:true});
  // seven 12 s note tones C D E F G A B with a C3 hum
  let notes=[261.6,293.7,329.6,349.2,392,440,493.9];
  let expr=notes.map((hz,i)=>'between(t,'+(i*12)+','+((i+1)*12)+')*0.3*sin(2*PI*'+hz+'*t)').join('+')+'+0.2*sin(2*PI*130.8*t)';
  let out=path.join(dir,'videos','incoming','Test Bowls.mp4');
  let r=cp.spawnSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=black:s=160x90:d=84','-f','lavfi','-i',"aevalsrc='"+expr+"':s=44100:d=84",'-shortest','-c:v','libx264','-c:a','aac','-b:a','128k',out],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  r=cp.spawnSync(process.execPath,[path.join(ROOT,'tools','add-video.js'),'--root',dir],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr+r.stdout);
  let m=JSON.parse(fs.readFileSync(path.join(dir,'videos','manifest.json'),'utf8'));
  assert.equal(m.videos.length,1);
  let v=m.videos[0];
  assert.equal(v.id,'test-bowls');
  assert.equal(v.file,'videos/test-bowls.mp4');
  assert.ok(fs.existsSync(path.join(dir,v.file)));
  assert.ok(!fs.existsSync(out),'file moved out of incoming');
  assert.equal(v.found,7);
  v.timestamps.forEach((t,i)=>assert.ok(Math.abs(t-i*12)<=2,'mark '+i+': '+t));
  assert.ok(require('../tools/add-video.js').check(dir).ok);
});
test('regression: the default video timeline matches the hand-analyzed ANALYZED marks',{skip:!hasFfmpeg&&'ffmpeg not installed'},()=>{
  let f=path.join(ROOT,'Quick Morning Chakra Alignment Sound Bath - 11 Minute Chakra Balancing Meditation Frequencies.mp4');
  let a=require('../tools/add-video.js').analyzeFile(f);
  let expected=[0,102,194,277,366,450,536];
  assert.equal(a.found,7);
  a.timestamps.forEach((t,i)=>assert.ok(Math.abs(t-expected[i])<=3,'mark '+i+': '+t+' vs '+expected[i]));
});
