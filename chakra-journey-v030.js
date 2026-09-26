(function(){
'use strict';
const $=id=>document.getElementById(id);
let bowl=null,testTimer=null,testIndex=0;
function ac(){try{return (typeof ctx!=='undefined'&&ctx)?ctx:audio()}catch(e){return null}}
function volume(){return Math.max(0.0001,+($('tv')?.value||0.18))}
function style(){return $('style')?.value||'crystal'}
function hallOn(){let el=$('hallEffect');return !el||el.checked}
function bowlWet(){if(!hallOn())return 0;let mix=$('reverbMix')?+$('reverbMix').value:.065;return Math.max(0,Math.min(.72,.32*(mix/.065)))}
function makeIR(a,seconds=5.2,decay=3.2){let len=Math.floor(a.sampleRate*seconds),b=a.createBuffer(2,len,a.sampleRate);for(let ch=0;ch<2;ch++){let d=b.getChannelData(ch);for(let i=0;i<len;i++){let x=1-i/len;d[i]=(Math.random()*2-1)*Math.pow(x,decay)*(0.75+0.25*Math.sin(i/a.sampleRate*6.28*.31))}}return b}
function fadeOut(engine,seconds=2.6){if(!engine)return;let a=engine.a,n=a.currentTime;try{engine.master.gain.cancelScheduledValues(n);engine.master.gain.setValueAtTime(Math.max(.0001,engine.master.gain.value),n);engine.master.gain.exponentialRampToValueAtTime(.0001,n+seconds)}catch(e){}setTimeout(()=>{engine.nodes.forEach(x=>{try{x.stop()}catch(e){}});try{engine.lfo.stop()}catch(e){}},(seconds+.2)*1000)}
function partialsFor(name){
 let profile=window.CJToneProfiles&&window.CJToneProfiles[name];
 if(profile&&profile.partials)return {partials:profile.partials.map(p=>[p[0],p[1],p[2]||'sine',p[3]||0]),attack:profile.attack||2.8,wobble:profile.wobble||0};
 if(name==='pure')return {partials:[[1,1,'sine',0]],attack:1.6,wobble:0};
 if(name==='tibetan')return {partials:[[.5,.12,'sine',-5],[1,.70,'sine',0],[1.98,.22,'triangle',4],[2.71,.13,'sine',-7],[4.16,.055,'sine',9]],attack:2.2,wobble:.045};
 if(name==='warm')return {partials:[[.5,.10,'sine',0],[1,.72,'sine',-2],[1.5,.12,'sine',3],[2.01,.13,'triangle',-4],[3.02,.055,'sine',7]],attack:2.6,wobble:.028};
 return {partials:[[1,.68,'sine',-3],[1.0027,.34,'sine',4],[2.006,.19,'sine',-6],[2.71,.11,'sine',8],[3.93,.065,'sine',-10],[5.18,.028,'sine',11]],attack:2.8,wobble:name==='crystal'?0.045:0.025};
}
function buildBowl(c){let a=ac();if(!a)return null;if(a.state==='suspended')a.resume().catch(()=>{});let now=a.currentTime,master=a.createGain(),body=a.createBiquadFilter(),dry=a.createGain(),wet=a.createGain(),conv=a.createConvolver(),pan=a.createStereoPanner?a.createStereoPanner():null;
let shape=partialsFor(style()),wetGain=bowlWet();
master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(volume(),now+Math.max(.4,shape.attack));body.type='lowpass';body.frequency.value=Math.min(6200,c[2]*7.5);body.Q.value=.32;dry.gain.value=wetGain>0?0.68:1;wet.gain.value=wetGain;conv.buffer=makeIR(a);master.connect(body);body.connect(dry);dry.connect(a.destination);body.connect(conv);conv.connect(wet);if(pan){wet.connect(pan);pan.pan.value=.08;pan.connect(a.destination)}else wet.connect(a.destination);
let nodes=[];shape.partials.forEach(([m,v,type,det],i)=>{let o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=c[2]*m;o.detune.value=det;g.gain.value=v*(i?1:.95);o.connect(g);g.connect(master);o.start(now);nodes.push(o)});
let lfo=a.createOscillator(),lg=a.createGain();lfo.frequency.value=style()==='crystal'?0.115:0.085;lg.gain.value=shape.wobble;lfo.connect(lg);lg.connect(master.gain);lfo.start(now);
return {a,master,dry,wet,nodes,lfo,freq:c[2]}}
function applyHallLive(){if(!bowl)return;let a=ac();if(!a)return;let wet=bowlWet();try{bowl.wet.gain.setTargetAtTime(wet,a.currentTime,.08);bowl.dry.gain.setTargetAtTime(wet>0?0.68:1,a.currentTime,.08)}catch(e){}}
window.stopTone=function(seconds=2.6){if(!bowl)return;let old=bowl;bowl=null;fadeOut(old,seconds)};
window.startTone=function(c){try{if(typeof useTone==='function'&&!useTone())return}catch(e){}let old=bowl;bowl=buildBowl(c);if(old)fadeOut(old,2.8)};
window.duck=function(on){let a=ac();if(bowl&&a){let target=Math.max(.0001,volume()*(on?0.20:1));try{bowl.master.gain.cancelScheduledValues(a.currentTime);bowl.master.gain.setTargetAtTime(target,a.currentTime,on?0.35:0.65)}catch(e){}}try{let v=$('player');if(v&&typeof useYT==='function'&&useYT())v.volume=Math.max(0,Math.min(1,(on?+($('dv')?.value||12):+($('yv')?.value||65))/100))}catch(e){}};
window.__cjStartTone=window.startTone;
window.__cjStopTone=window.stopTone;
window.__cjDuck=window.duck;
window.__cjApplyHall=applyHallLive;
function stopTest(){clearTimeout(testTimer);testTimer=null;window.stopTone(1.5);let b=$('testTone');if(b)b.textContent='Test Tone'}
function testTone(){if(testTimer){stopTest();return}try{if(typeof run!=='undefined'&&run)return status('Stop the journey before testing a tone')}catch(e){}let i=(typeof cur!=='undefined'&&cur>=0)?cur:testIndex,c=window.C?.[i]||window.C?.[0];if(!c)return;window.startTone(c);let b=$('testTone');if(b)b.textContent='Stop Test';if(typeof status==='function')status('Testing '+c[0]+' • '+c[2]+' Hz • '+($('style')?.selectedOptions?.[0]?.textContent||style()));testTimer=setTimeout(stopTest,10000)}
function returnSetup(){if(typeof window.CJReturnToMain==='function'){window.CJReturnToMain(false);return}try{if(typeof stop==='function')stop()}catch(e){}document.body.classList.remove('immersive','exhale');document.body.dataset.chakra='';window.scrollTo({top:0,behavior:'smooth'});setTimeout(()=>{let p=$('play');if(p)p.scrollIntoView({behavior:'smooth',block:'center'})},250)}
function install(){
 if(!$('returnSetup')){let b=document.createElement('button');b.id='returnSetup';b.type='button';b.textContent='← Main';b.onclick=returnSetup;b.style.cssText='position:fixed;z-index:9999;left:max(12px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top));border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:9px 13px;background:rgba(15,15,20,.72);backdrop-filter:blur(12px);color:white;font-weight:700;display:none';document.body.appendChild(b);let show=()=>b.style.display=(document.body.classList.contains('immersive')||document.body.classList.contains('journey-on'))?'block':'none';let obs=new MutationObserver(show);obs.observe(document.body,{attributes:true,attributeFilter:['class']});show()}
 let tv=$('tv');if(tv&&!$('testTone')){let row=tv.closest('.row'),box=document.createElement('div');box.className='voice-tools';box.innerHTML='<button class="btn" id="testTone" type="button">Test Tone</button><button class="btn" id="nextTestTone" type="button">Next Chakra</button>';row.insertAdjacentElement('afterend',box);$('testTone').onclick=testTone;$('nextTestTone').onclick=()=>{testIndex=(testIndex+1)%7;if(testTimer){stopTest();setTimeout(testTone,250)}else if(typeof status==='function'){let c=window.C[testIndex];status('Tone test chakra: '+c[0]+' • '+c[2]+' Hz')}}}
 if(tv)tv.addEventListener('input',()=>{if(bowl){let a=ac();try{bowl.master.gain.setTargetAtTime(volume(),a.currentTime,.12)}catch(e){}}});
 let st=$('style');if(st)st.addEventListener('change',()=>{if(testTimer){stopTest();setTimeout(testTone,250)}});
 let hall=$('hallEffect'),rev=$('reverbMix');
 if(hall)hall.addEventListener('change',applyHallLive);
 if(rev)rev.addEventListener('input',applyHallLive);
}
window.CJReturnToSetup=returnSetup;window.CJTestTone=testTone;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
