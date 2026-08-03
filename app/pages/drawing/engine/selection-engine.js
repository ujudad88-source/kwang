(function(){
 'use strict';
 const listeners=new Set();let current=null;
 function select(scene,id){if(!scene)return null;window.KENC_SCENE_ENGINE.walk(scene,n=>{if(n.type==='object')n.selected=(n.id===id||n.objectId===id)});current=window.KENC_SCENE_ENGINE.selected(scene);listeners.forEach(fn=>fn(current));document.dispatchEvent(new CustomEvent('kenc:selection-changed',{detail:current}));return current;}
 function clear(scene){return select(scene,null)}
 function onChange(fn){listeners.add(fn);return()=>listeners.delete(fn)}
 function bounds(node){if(!node||node.type!=='object')return null;const o=node.data;return{x:o.x,y:o.y,width:o.w,height:o.h,rotation:o.rot||0,surface:o.surface};}
 window.KENC_SELECTION_ENGINE={version:'1.0.5',select,clear,onChange,bounds,get current(){return current}};
})();