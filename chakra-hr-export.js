(function(){
  var KEY="hr_airpods_pro3_v1";
  function $(id){return document.getElementById(id)}
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){return null}}
  function write(v){try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}}
  function num(v){var n=Number(v);return isFinite(n)?n:null}
  function parseText(text){
    var bpm=[];
    var lines=String(text||"").split(/\r?\n/);
    lines.forEach(function(line){
      var m=line.match(/(\d{2,3}(?:\.\d+)?)/g);
      if(!m)return;
      m.forEach(function(x){var n=num(x);if(n&&n>=30&&n<=220)bpm.push(Math.round(n))});
    });
    if(bpm.length)return bpm;
    try{
      var j=JSON.parse(text);
      var bag=[];
      JSON.stringify(j,function(k,v){if(/bpm|heart|rate/i.test(k)&&num(v))bag.push(Math.round(num(v)));return v});
      return bag.filter(function(n){return n>=30&&n<=220});
    }catch(e){return []}
  }
  function pack(bpm,source){
    var start=bpm.length?bpm[0]:null;
    var end=bpm.length?bpm[bpm.length-1]:null;
    var change=start!=null&&end!=null?end-start:null;
    return {
      file:"chakra-hr-export",
      source:source||null,
      skipped:!bpm.length,
      reason:bpm.length?null:"Not AirPods Pro 3",
      sessionStart:null,
      sessionEnd:new Date().toISOString(),
      startBpm:start,
      endBpm:end,
      changeBpm:change,
      direction:change==null?null:change<0?"down":change>0?"up":"flat"
    };
  }
  function download(obj){
    var blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});
    var a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="chakra-hr-export.json";
    document.body.appendChild(a);a.click();a.remove();
  }
  function mount(){
    var host=$("starfleetExport");
    if(!host||$("hrExport"))return;
    var panel=host.closest(".panel")||host.parentNode;
    var box=document.createElement("div");
    box.className="panel";
    box.innerHTML='<b>Heart rate export</b><p class="voice-note">AirPods Pro 3 only. Other buds skip. Drop a Health export, then export the change. This file is not the Starfleet outbox.</p><input id="hrFile" type="file" accept=".csv,.json,text/csv,application/json"><div class="voice-tools"><button class="btn" id="hrExport" type="button">Export heart rate</button></div><div id="hrReadout" class="muted"></div>';
    panel.parentNode.insertBefore(box,panel.nextSibling);
    $("hrFile").addEventListener("change",function(){
      var f=this.files&&this.files[0];
      if(!f)return;
      var reader=new FileReader();
      reader.onload=function(){
        var bpm=parseText(reader.result);
        write({source:"AirPods Pro 3",bpm:bpm});
        $("hrReadout").textContent=bpm.length?(bpm[0]+" to "+bpm[bpm.length-1]+" bpm"):"No beats in that file. Export will skip.";
      };
      reader.readAsText(f);
    });
    $("hrExport").addEventListener("click",function(){
      var saved=read();
      var bpm=saved&&saved.bpm||[];
      download(pack(bpm,bpm.length?"AirPods Pro 3":null));
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();
