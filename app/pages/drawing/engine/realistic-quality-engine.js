(function(){
  'use strict';
  const VERSION='1.2.1',KEY='kenc_render_quality_v120';
  const state=()=>window.KENC_DRAWING_API?.getState?.();
  function current(){return localStorage.getItem(KEY)||'realistic';}
  function apply(mode=current()){
    mode=mode==='cad'?'cad':'realistic';localStorage.setItem(KEY,mode);document.documentElement.dataset.kencRenderQuality=mode;
    const s=state();if(s){s.live3dView=s.live3dView||{};s.live3dView.quality=mode;}
    const b=document.getElementById('kencRenderQualityBtn');if(b){b.textContent=mode==='realistic'?'실사 품질':'CAD 품질';b.classList.toggle('active',mode==='realistic');}
    window.KENC_DRAWING_API?.render3d?.();return mode;
  }
  function toggle(){return apply(current()==='realistic'?'cad':'realistic');}
  function install(){apply();const host=document.querySelector('.drawing-toolbar-actions');if(!host||document.getElementById('kencRenderQualityBtn'))return;const b=document.createElement('button');b.type='button';b.id='kencRenderQualityBtn';b.className='drawing-action-btn';b.title='실사형 재질과 제작 디테일 전환';b.addEventListener('click',toggle);host.prepend(b);apply();}
  window.KENC_REALISTIC_QUALITY={version:VERSION,current,apply,toggle};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
