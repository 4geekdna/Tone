(function(){
const C=window.C||[], LS="cj_auto_v2", OUT="starfleet_chakra_outbox";
const defaults=[
 {breath:[4,6],voice:{speed:.80,stability:.72,similarity:.83,style:.02,warmth:210,reverb:.05}},
 {breath:[4,6],voice:{speed:.84,stability:.69,similarity:.83,style:.05,warmth:195,reverb:.055}},
 {breath:[4,5],voice:{speed:.88,stability:.66,similarity:.84,style:.08,warmth:185,reverb:.05}},
 {breath:[5,6],voice:{speed:.82,stability:.69,similarity:.84,style:.04,warmth:180,reverb:.065}},
 {breath:[4,6],voice:{speed:.86,stability:.70,similarity:.85,style:.04,warmth:165,reverb:.06}},
 {breath:[5,7],voice:{speed:.78,stability:.71,similarity:.84,style:.03,warmth:150,reverb:.075}},
 {breath:[6,8],voice:{speed:.75,stability:.72,similarity:.83,style:.02,warmth:140,reverb:.08}}
];
let active=-1,session=null,breathTimer=null;
const $=id=>document.getElementById(id);
function cfg(){let x={immersive:true,autoVoice:true,autoBreath:true};try{x={...x,...JSON.parse(localStorage.getItem(LS)||"{}")}}catch(e){}return x}
function setv(id,v){let e=$(id);if(e){e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}}
function applyVoice(i){if(!cfg().autoVoice||i<0||!defaults[i])return;let v=defaults[i].voice;setv("speed",v.speed);setv("stability",v.stability);setv("similarity",v.similarity);setv("voiceStyle",v.style);setv("warmthFreq",v.warmth);setv("reverbMix",v.reverb)}
function breath(i){clearTimeout(breathTimer);let el=$("breathCue");if(!el||i<0)return;let p=defaults[i].breath,inhale=true;function tick(){if(active!==i)return;let sec=inhale?p[0]:p[1];el.textContent=inhale?"INHALE":"EXHALE";document.body.classList.toggle("exhale",!inhale);el.style.setProperty("--breath",sec+"s");inhale=!inhale;breathTimer=setTimeout(tick,sec*1000)}tick()}
function activate(i){active=i;document.body.dataset.chakra=i;if(i>=0&&C[i]){document.documentElement.style.setProperty("--chakra",C[i][4]);applyVoice(i);if(cfg().autoBreath)breath(i)}else{clearTimeout(breathTimer)}}
function mantra(chakra,index,text){if(session)session.mantras.push({at:new Date().toISOString(),chakra,index:index+1,text})}
function sessionStart(){session={schema:"starfleet.chakra-journey.v1",id:(crypto.randomUUID?crypto.randomUUID():Date.now()+""),startedAt:new Date().toISOString(),app:"Tone/Chakra Journey",mantras:[],chakras:[],settings:{mode:$("mode")?.value,count:+($("count")?.value||0),source:localStorage.getItem("cj_src")||"both",adaptiveVoice:true,adaptiveBreathing:true}};document.body.classList.toggle("immersive",cfg().immersive)}
function sessionEnd(status){if(!session)return;session.endedAt=new Date().toISOString();session.status=status;session.durationSeconds=Math.round((Date.parse(session.endedAt)-Date.parse(session.startedAt))/1000);let q=[];try{q=JSON.parse(localStorage.getItem(OUT)||"[]")}catch(e){}q.push(session);localStorage.setItem(OUT,JSON.stringify(q.slice(-100)));window.dispatchEvent(new CustomEvent("starfleet-session-ready",{detail:session}));session=null;document.body.classList.remove("immersive","exhale");clearTimeout(breathTimer)}
function exportOutbox(){let data=localStorage.getItem(OUT)||"[]",a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type:"application/json"}));a.download="starfleet-chakra-sessions.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
window.chakraAuto={activate,mantra,sessionStart,sessionEnd,exportOutbox,defaults};
document.addEventListener("DOMContentLoaded",()=>{let b=$("starfleetExport");if(b)b.onclick=exportOutbox;});
})();