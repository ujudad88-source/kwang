(function(){
  'use strict';
  function snapshot(state){const scene=window.KENC_SCENE_ENGINE.build(state);return{schema:'kenc-scene',version:'1.0.3',createdAt:new Date().toISOString(),scene};}
  function json(state,pretty=false){return JSON.stringify(snapshot(state),null,pretty?2:0);}
  window.KENC_EXPORT_ENGINE={version:'1.0.3',snapshot,json};
})();
