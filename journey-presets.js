(function(){
const KEY='cj_journey_presets_v1';
const ids=['mode','dur','count','gap','between','yv','dv','goveeOn','goveeBright','voice','voicePreset','autoModel','model','speed','stability','similarity','voiceStyle','speakerBoost','warmthFreq','reverbMix','vv','style','tv'];
const $=id=>document.getElementById(id);
function presets(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
function write(v){localStorage.setItem(KEY,JSON.stringify(v))}
function val(id){const e=$(id);if(!e)return null;return e.type==='checkbox'?e.checked:e.value}
function set(id,v){const e=$(id);if(!e||v==null)return;e.type==='checkbox'?e.checked=!!v:e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}
function capture(){
 const config={};ids.forEach(id=>config[id]=val(id));
 config.source=document.querySelector('#tabs button.on')?.dataset.s||'both';
 config.timestamps=[...document.querySelectorAll('[data-ts]')].map(e=>e.value);
 try{config.lightCalibration=JSON.parse(localStorage.getItem('cj_govee_calibration')||'null')}catch(e){}
 try{config.selectedLights=JSON.parse(localStorage.getItem('govee_selected_devices')||localStorage.getItem('cj_govee_selected')||'null')}catch(e){}
 return config;
}
function apply(c){
 if(!c)return;ids.forEach(id=>set(id,c[id]));
 if(c.timestamps)c.timestamps.forEach((v,i)=>{const e=document.querySelector('[data-ts="'+i+'"]');if(e)e.value=v});
 if(c.source){const b=document.querySelector('#tabs button[data-s="'+c.source+'"]');if(b)b.click()}
 if(c.lightCalibration)localStorage.setItem('cj_govee_calibration',JSON.stringify(c.lightCalibration));
 if(c.selectedLights){localStorage.setItem('govee_selected_devices',JSON.stringify(c.selectedLights));localStorage.setItem('cj_govee_selected',JSON.stringify(c.selectedLights))}
 if(typeof window.goveeLoadLights==='function')setTimeout(()=>window.goveeLoadLights(),150);
}
function render(){const s=$('journeyPresetSelect');if(!s)return;const p=presets();s.innerHTML='<option value="">Choose saved journey…</option>'+p.map(x=>'<option value="'+x.id+'">'+x.name.replace(/[<&]/g,'')+'</option>').join('');$('journeyPresetInfo').textContent=p.length?p.length+' saved journey'+(p.length===1?'':'s'):'No saved journeys yet.'}
function save(){let name=prompt('Name this journey configuration:','My Chakra Journey');if(!name)return;let p=presets(),existing=p.find(x=>x.name.toLowerCase()===name.toLowerCase()),item={id:existing?.id||String(Date.now()),name:name.trim(),saved:new Date().toISOString(),config:capture()};if(existing)p[p.indexOf(existing)]=item;else p.push(item);write(p);render();$('journeyPresetSelect').value=item.id;$('journeyPresetInfo').textContent='Saved “'+item.name+'”';}
function load(){let id=$('journeyPresetSelect').value,item=presets().find(x=>x.id===id);if(!item)return;apply(item.config);$('journeyPresetInfo').textContent='Loaded “'+item.name+'”';}
function del(){let id=$('journeyPresetSelect').value;if(!id)return;let p=presets(),item=p.find(x=>x.id===id);if(!item||!confirm('Delete “'+item.name+'”?'))return;write(p.filter(x=>x.id!==id));render()}
function boot(){render();$('journeyPresetSave')?.addEventListener('click',save);$('journeyPresetLoad')?.addEventListener('click',load);$('journeyPresetDelete')?.addEventListener('click',del)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();