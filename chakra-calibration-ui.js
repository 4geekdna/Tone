(function(){
const $=id=>document.getElementById(id), C=window.C||[];
function render(){
 const host=$("calibrationUI"); if(!host||!window.goveeCalibration)return;
 let i=+($("calChakra")?.value||0),p=window.goveeCalibration.get()[i]||{},devs=window.goveeCalibration.devices();
 $("calColor").value=p.color||C[i][4]; $("calBright").value=p.brightness??70; $("calBrightV").textContent=$("calBright").value+"%";
 host.innerHTML=devs.length?devs.map(d=>{let v=(p.devices&&p.devices[d.id]?.brightness)??p.brightness??70;return '<div class="row"><label>'+d.name+'</label><input type="range" min="1" max="100" value="'+v+'" data-caldev="'+d.id+'"><span class="v">'+v+'%</span></div>'}).join(""):'<div class="voice-note">Load Govee lights to adjust each light individually.</div>';
 host.querySelectorAll("[data-caldev]").forEach(e=>e.oninput=()=>{e.nextElementSibling.textContent=e.value+"%";window.goveeCalibration.setDevice(i,e.dataset.caldev,e.value)});
 document.documentElement.style.setProperty("--chakra",$("calColor").value);
}
function boot(){
 if(!$("calChakra"))return;
 $("calChakra").innerHTML=C.map((c,i)=>'<option value="'+i+'">'+c[0]+'</option>').join("");
 $("calChakra").onchange=render;
 $("calColor").oninput=()=>{let i=+$("calChakra").value;window.goveeCalibration.setColor(i,$("calColor").value);document.documentElement.style.setProperty("--chakra",$("calColor").value)};
 $("calBright").oninput=()=>{let i=+$("calChakra").value;$("calBrightV").textContent=$("calBright").value+"%";window.goveeCalibration.setMaster(i,$("calBright").value);render()};
 $("calReset").onclick=()=>{window.goveeCalibration.reset(+$("calChakra").value);render()};
 $("goveeLoad")?.addEventListener("click",()=>setTimeout(render,1200)); render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,50));else setTimeout(boot,50);
})();