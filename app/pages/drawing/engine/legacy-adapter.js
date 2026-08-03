(function(){
  'use strict';
  let installed=false;
  function install(){if(installed||!window.KENC_DRAWING_API?.getState)return false;installed=true;const api=window.KENC_DRAWING_API;const originalRenderAll=api.renderAll?.bind(api);const originalRender3d=api.render3d?.bind(api);window.KENC_OBJECT_ENGINE.normalizeState(api.getState());
    if(originalRenderAll)api.renderAll=function(){window.KENC_PREVIEW_ENGINE.invalidate('renderAll:before');const r=originalRenderAll();window.KENC_PREVIEW_ENGINE.invalidate('renderAll:after');return r;};
    if(originalRender3d)api.render3d=function(){window.KENC_PREVIEW_ENGINE.invalidate('render3d:before');return originalRender3d();};
    window.KENC_PREVIEW_ENGINE.sync(api.getState());document.documentElement.dataset.kencObjectEngine='1.0.4';document.dispatchEvent(new CustomEvent('kenc:object-engine-ready',{detail:{version:'1.0.4'}}));return true;}
  if(!install()){document.addEventListener('kenc:drawing-api-ready',install,{once:true});setTimeout(install,0);}
})();
