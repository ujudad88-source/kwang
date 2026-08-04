(function(){
  'use strict';
  function toast(msg,error=false){let n=document.getElementById('kencProjectToast');if(!n){n=document.createElement('div');n.id='kencProjectToast';document.body.appendChild(n);}n.textContent=msg;n.className=error?'is-error':'is-ok';clearTimeout(n._t);n._t=setTimeout(()=>n.className='',2400);}
  function mount(){
    if(document.getElementById('kencProjectToolbar'))return;
    const bar=document.createElement('div');bar.id='kencProjectToolbar';bar.innerHTML='<strong>KENC 2.0</strong><button type="button" data-kenc-project="save">프로젝트 저장</button><button type="button" data-kenc-project="open">프로젝트 열기</button><button type="button" data-kenc-project="snapshot">스냅샷</button><span data-kenc-project-status>Schema 3 · 준비</span><input hidden type="file" accept=".kenc,application/json" data-kenc-project-file>';
    document.body.appendChild(bar);const file=bar.querySelector('[data-kenc-project-file]');
    bar.addEventListener('click',e=>{const action=e.target?.dataset?.kencProject;if(!action)return;try{if(action==='save'){window.KENC_PROJECT_ENGINE.download();toast('KENC 프로젝트를 저장했습니다.');}else if(action==='open')file.click();else if(action==='snapshot'){const snap=window.KENC_UNIFIED_SCENE.build();window.KENC_LAST_PROJECT_SNAPSHOT=snap;toast(`스냅샷 완료 · 함체 ${snap?.cabinets?.length||0}개`);}}catch(err){toast(err.message,true);}});
    file.addEventListener('change',async()=>{if(!file.files?.[0])return;try{await window.KENC_PROJECT_ENGINE.openFile(file.files[0]);toast('프로젝트를 불러왔습니다.');}catch(err){toast(err.message,true);}finally{file.value='';}});
    const boot=()=>{const s=window.KENC_DRAWING_API?.getState?.();if(s){window.KENC_PROJECT_ENGINE.normalizeState(s);bar.querySelector('[data-kenc-project-status]').textContent=`Schema 3 · 함체 ${s.cabinets?.length||0}개`;}};
    if(window.KENC_DRAWING_API)boot();else document.addEventListener('kenc:drawing-api-ready',boot,{once:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
