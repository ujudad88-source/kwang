(function(){
  'use strict';
  let scene=null;
  function sync(state){scene=window.KENC_SCENE_ENGINE.build(state);document.dispatchEvent(new CustomEvent('kenc:scene-synced',{detail:{scene}}));return scene;}
  function current(){return scene;}
  function invalidate(reason='change'){const api=window.KENC_DRAWING_API;if(!api?.getState)return null;const s=sync(api.getState());document.dispatchEvent(new CustomEvent('kenc:preview-invalidated',{detail:{reason,scene:s}}));return s;}
  window.KENC_PREVIEW_ENGINE={version:'1.0.3',sync,current,invalidate};
})();
