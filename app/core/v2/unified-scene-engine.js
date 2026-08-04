(function(){
  'use strict';
  const VERSION='2.0.0';
  function build(state=window.KENC_DRAWING_API?.getState?.()){
    if(!state)return null;window.KENC_PROJECT_ENGINE?.normalizeState(state);
    const legacy=window.KENC_SCENE_ENGINE?.build?.(state);
    return {id:'KENC-PROJECT-SCENE',version:VERSION,project:state.project,cabinets:(state.cabinets||[]).map((c,i)=>({uuid:c.uuid,index:i,parametric:c.parametric,objects:(c.objects||[]).map(o=>({uuid:o.uuid,type:o.type,variant:o.variant||o.option,materialId:o.materialId,surface:o.surface,transform:{x:o.x,y:o.y,w:o.w,h:o.h,rotation:o.rot||0,depth:o.depth||0},manufacturing:o.manufacturing||null}))})),legacyScene:legacy};
  }
  window.KENC_UNIFIED_SCENE={version:VERSION,build};
})();
