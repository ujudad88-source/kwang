
(function(){
  function go(panel){
    if(!panel || !document.getElementById(panel)) return;
    const original=document.querySelector('.bottom-nav-btn[data-target="'+panel+'"]');
    if(original){ original.click(); return; }
    document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===panel));
    location.hash=panel;
  }
  document.querySelectorAll('.ui2-side-btn').forEach(btn=>btn.addEventListener('click',()=>go(btn.dataset.target)));
  document.querySelectorAll('.ui2-home [data-panel]').forEach(btn=>btn.addEventListener('click',()=>go(btn.dataset.panel)));
  const nameSource=document.getElementById('userName');
  const welcome=document.getElementById('homeWelcomeName');
  function syncName(){if(nameSource&&welcome){const t=(nameSource.textContent||'사용자').trim();welcome.textContent=t.replace(/\s+(사원|주임|대리|과장|차장|부장|이사|대표|관리자)$/,'')||'사용자';}}
  syncName();
  if(nameSource)new MutationObserver(syncName).observe(nameSource,{childList:true,subtree:true,characterData:true});
  const panels=[...document.querySelectorAll('.panel')];
  const syncActive=()=>{const active=panels.find(p=>p.classList.contains('active'));document.querySelectorAll('.ui2-side-btn').forEach(b=>b.classList.toggle('active',b.dataset.target===active?.id));};
  new MutationObserver(syncActive).observe(document.querySelector('main.page'),{subtree:true,attributes:true,attributeFilter:['class']});
  syncActive();
})();
