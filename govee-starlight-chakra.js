(function(){
const LS='cj_starlight_profiles_v1',REPORT='cj_govee_capability_report',$=id=>document.getElementById(id);
const DEFAULTS=[
 {name:'Root',nebula:'#B00020',accent:'#FF3B30',stars:'#FFD7C7',brightness:58,starBrightness:38},
 {name:'Sacral',nebula:'#FF6A00',accent:'#FFB000',stars:'#FFE0B2',brightness:62,starBrightness:42},
 {name:'Solar Plexus',nebula:'#FFD000',accent:'#FFF176',stars:'#FFF8D0',brightness:66,starBrightness:46},
 {name:'Heart',nebula:'#21C45A',accent:'#FF6FAE',stars:'#E8FFF0',brightness:58,starBrightness:40},
 {name:'Throat',nebula:'#168BFF',accent:'#55D6FF',stars:'#E2F4FF',brightness:55,starBrightness:44},
 {name:'Third Eye',nebula:'#3F37C9',accent:'#7B2CBF',stars:'#D9D7FF',brightness:48,starBrightness:50},
 {name:'Crown',nebula:'#8E44FF',accent:'#E6D7FF',stars:'#FFFFFF',brightness:52,starBrightness:58}
];
const SCENE_WORDS=[['star','galaxy','milky','night','space','universe','dream','aurora'],['star','sunset','fire','orange','dream','galaxy'],['star','sun','gold','sunrise','dream','galaxy'],['star','forest','spring','dream','aurora','galaxy'],['star','ocean','blue','night','aurora','galaxy'],['star','galaxy','milky','night','space','universe','dream','aurora'],['star','galaxy','milky','universe','dream','aurora','night']];
const PROJECTOR_SKUS=/^H609[345]$/i,hex=h=>parseInt(h.replace('#',''),16),key=()=>((($('goveeKey')||{}).value)||localStorage.getItem('govee-api-key')||'').trim(),uuid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
function profiles(){try{return JSON.parse(localStorage.getItem(LS)||'null')||DEFAULTS}catch(e){return DEFAULTS}} function save(x){localStorage.setItem(LS,JSON.stringify(x))}
function report(){try{return JSON.parse(localStorage.getItem(REPORT)||'{}')}catch(e){return{}}}
function candidates(){let r=report(),list=r.reports||r.devices||[];return list.filter(d=>{let s=((d.deviceName||d.name||'')+' '+(d.sku||'')).toLowerCase();return /projector|nebula|galaxy/.test(s)||PROJECTOR_SKUS.test(d.sku||'')})}
function storedPicked(){try{return JSON.parse(localStorage.getItem('cj_govee_picked')||localStorage.getItem('govee-selected')||'{}')||{}}catch(e){return{}}}
function isTicked(d){if(typeof window.goveeIsPicked==='function')return window.goveeIsPicked(d);let id=d.device||d.sku||d.model;return !!storedPicked()[id]}
function ticked(){return candidates().filter(isTicked)}
const NO_TICK='No ticked projector — tick it in Govee Lights';
function cap(d,type,instance){return (d.capabilities||[]).find(c=>c.type===type&&c.instance===instance)}
const SEGMENT_OVERRIDES={H7075:3,H7076:4,H6046:10,H6047:10};
function spanOf(r){if(!r||r.max==null||r.min==null)return 0;let n=r.max-r.min+1;return n>0?n:0}
function segmentCount(field,sku){
  field=field||{};
  let options=Array.isArray(field.options)?field.options:[];
  let ambiguous=false,count=0,values=[];
  if(options.length){count=options.length;values=options.map(x=>x.value)}
  else{
    let sizeN=typeof field.size==='number'?field.size:spanOf(field.size);
    let elN=spanOf(field.elementRange);
    if(sizeN&&elN&&sizeN!==elN)ambiguous=true;
    count=sizeN&&elN?Math.min(sizeN,elN):(sizeN||elN);
    let start=field.elementRange&&field.elementRange.min!=null?field.elementRange.min:(field.size&&field.size.min!=null?field.size.min:1);
    values=Array.from({length:count},(_,i)=>start+i);
  }
  let ov=SEGMENT_OVERRIDES[String(sku||'').toUpperCase()];
  if(ov){count=ov;values=values.slice(0,ov);while(values.length<ov)values.push(values.length+1)}
  return {count:count,ambiguous:ambiguous,values:values};
}
function segments(c,sku){if(!c)return[];let f=(c.parameters?.fields||[]).find(x=>x.fieldName==='segment');return segmentCount(f,sku).values}
function advertised(d,instance){return (d.capabilities||[]).find(c=>c.instance===instance)||null}
async function send(d,c){if(window.CJGovee)return window.CJGovee.control(d,c,{lane:c&&c.instance==='powerSwitch'&&c.value===0?'off':'color',slotKey:c&&c.instance});throw Error('Govee client missing')}
function sceneScore(name,i){let s=String(name||'').toLowerCase(),words=SCENE_WORDS[i]||SCENE_WORDS[0],score=0;words.forEach((w,n)=>{if(s.includes(w))score+=100-n*7});if(/star|galaxy|milky|space|universe/.test(s))score+=150;return score}
function normalizeScene(x){return typeof x==='string'?{name:x,value:null,type:'devices.capabilities.dynamic_scene',instance:'lightScene'}:x}
function bestScene(d,i){let all=[...(d.dynamicScenes||[]),...(d.diyScenes||[])].map(normalizeScene).filter(x=>x&&x.name);all.sort((a,b)=>sceneScore(b.name,i)-sceneScore(a.name,i));return all.length&&sceneScore(all[0].name,i)>0?all[0]:null}
async function applyScene(d,i){let s=bestScene(d,i);if(!s||s.value==null)return null;let inst=s.instance||'lightScene',ad=advertised(d,inst),type=ad&&ad.type||s.type||'devices.capabilities.dynamic_scene',instance=ad&&ad.instance||inst;try{await send(d,{type:type,instance:instance,value:s.value})}catch(e){if(!/404/.test(String(e&&e.message)))throw e;let alt=String(type).indexOf('diy_color')>=0?'devices.capabilities.dynamic_scene':'devices.capabilities.diy_color_setting';await send(d,{type:alt,instance:instance,value:s.value})}return s.name}
async function applyColors(d,p){if(cap(d,'devices.capabilities.range','brightness')){await sleep(520);await send(d,{type:'devices.capabilities.range',instance:'brightness',value:p.brightness}).catch(()=>{})}if(cap(d,'devices.capabilities.color_setting','colorRgb')){await sleep(520);await send(d,{type:'devices.capabilities.color_setting',instance:'colorRgb',value:hex(p.nebula)}).catch(()=>{})}let sc=cap(d,'devices.capabilities.segment_color_setting','segmentedColorRgb'),sb=cap(d,'devices.capabilities.segment_color_setting','segmentedBrightness'),sg=segments(sc||sb,d.sku);if(sc&&sg.length){let thirds=[[],[],[]];sg.forEach((x,n)=>thirds[n%3].push(x));for(const [n,a] of thirds.entries())if(a.length){await sleep(520);await send(d,{type:'devices.capabilities.segment_color_setting',instance:'segmentedColorRgb',value:{segment:a,rgb:hex([p.nebula,p.accent,p.stars][n])}}).catch(()=>{})}}if(sb&&sg.length){await sleep(520);await send(d,{type:'devices.capabilities.segment_color_setting',instance:'segmentedBrightness',value:{segment:sg,brightness:p.starBrightness}}).catch(()=>{})}}
async function apply(i){let all=candidates(),ds=all.filter(isTicked),p=profiles()[i]||DEFAULTS[i],used=[];if(!all.length)throw Error('No Star Light Projector found. Run Inspect Device Capabilities first.');if(!ds.length)throw Error(NO_TICK);for(const d of ds){await send(d,{type:'devices.capabilities.on_off',instance:'powerSwitch',value:1}).catch(()=>{});await applyColors(d,p);let scene=null;try{await sleep(600);scene=await applyScene(d,i)}catch(e){}used.push({device:d.deviceName||d.name||d.sku,scene:scene||'chakra palette'})}let st=$('status');if(st)st.textContent=used.map(x=>x.device+' → '+x.scene).join(' • ');return used}
async function off(){for(const d of candidates()){await send(d,{type:'devices.capabilities.on_off',instance:'powerSwitch',value:0}).catch(()=>{});await sleep(520)}}
function render(){let host=$('starlightDefaults');if(!host)return;let ps=profiles(),opts=ps.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('');host.innerHTML=`<div class="row"><label>Chakra</label><select id="starChakra">${opts}</select></div><div id="starEditor"></div><div class="voice-tools"><button class="btn play" id="starTest">Test Star Field</button><button class="btn" id="starReset">Reset Defaults</button></div><div id="starScenePick" class="voice-note"></div><div class="voice-note">Auto mode uses the actual projector's best available star/galaxy/night/aurora scene. Chakra colors are first applied to all exposed RGB/segment channels; the animated scene is then activated so the star-field motion is preserved when the device scene owns its colors.</div>`;function edit(){let i=+$('starChakra').value,p=profiles()[i],ds=candidates(),choices=ds.map(d=>{let s=bestScene(d,i);return `${d.deviceName||d.name||d.sku}: ${s?s.name:'chakra palette only'}${isTicked(d)?'':' (not ticked)'}`});$('starScenePick').innerHTML='<b>Auto scene:</b> '+(choices.join(' • ')||'Run Inspect Device Capabilities first');$('starEditor').innerHTML=`<div class="row"><label>Nebula</label><input id="starNeb" class="calColor" type="color" value="${p.nebula}"></div><div class="row"><label>Accent</label><input id="starAcc" class="calColor" type="color" value="${p.accent}"></div><div class="row"><label>Stars</label><input id="starStars" class="calColor" type="color" value="${p.stars}"></div><div class="row"><label>Projector</label><input id="starBright" type="range" min="1" max="100" value="${p.brightness}"><span class="v">${p.brightness}%</span></div><div class="row"><label>Star field</label><input id="starStarBright" type="range" min="1" max="100" value="${p.starBrightness}"><span class="v">${p.starBrightness}%</span></div>`;['starNeb','starAcc','starStars','starBright','starStarBright'].forEach(id=>$(id).oninput=()=>{let a=profiles(),q=a[i];q.nebula=$('starNeb').value;q.accent=$('starAcc').value;q.stars=$('starStars').value;q.brightness=+$('starBright').value;q.starBrightness=+$('starStarBright').value;save(a);edit()})}$('starChakra').onchange=edit;$('starTest').onclick=async()=>{let b=$('starTest');b.disabled=true;b.textContent='Testing…';try{let a=await apply(+$('starChakra').value);b.textContent='✓ '+a.length+' projector'+(a.length===1?'':'s')}catch(e){b.textContent=e.message}setTimeout(()=>{b.disabled=false;b.textContent='Test Star Field'},2600)};$('starReset').onclick=()=>{localStorage.removeItem(LS);render()};edit()}
window.CJStarlight={defaults:DEFAULTS,profiles,apply,off,bestScene,candidates,ticked,segmentCount,applyScene};window.addEventListener('govee-capabilities-updated',render);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();