(function(){
  'use strict';
  const VERSION='2.2.5';
  const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const api=()=>window.KENC_DRAWING_API;
  const defOf=t=>window.KENC_OBJECT_ENGINE?.definition?.(t)||{};
  function selected(){const a=api();if(!a?.getState)return{};const state=a.getState(),cab=a.getCurrentCabinet?.(),obj=(cab?.objects||[]).find(x=>x.id===state.selectedObjectId);return{a,state,cab,obj};}
  function rememberDefaults(o){o.meta=o.meta&&typeof o.meta==='object'?o.meta:{};if(!o.meta.attachmentDefaults)o.meta.attachmentDefaults={x:num(o.x),y:num(o.y),depthOffset:num(o.depthOffset),surface:o.surface||'front',parent:o.parent||'',mirror:!!o.mirror,mirrorOverride:!!o.mirrorOverride};return o.meta.attachmentDefaults;}
  function clampDepth(o){const d=defOf(o.type),base=Math.max(2,num(d.depth,4));const limit=Math.max(30,base*4);o.depthOffset=Math.max(-limit,Math.min(limit,num(o.depthOffset)));}
  function normalize(c,o){if(!c||!o)return o;rememberDefaults(o);clampDepth(o);window.KENC_ORIENTATION_CORRECTION?.clampObject?.(c,o);return o;}
  function update(o,patch,c){if(!o||!c)return false;rememberDefaults(o);Object.assign(o,patch||{});normalize(c,o);return true;}
  function toggleMirror(o,c){return update(o,{mirror:!o.mirror,mirrorOverride:true},c);}
  function setParent(o,parent,c){return update(o,{parent},c);}
  function reset(o,c){if(!o||!c)return false;const d=rememberDefaults(o);Object.assign(o,{x:d.x,y:d.y,depthOffset:d.depthOffset,surface:d.surface,parent:d.parent,mirror:d.mirror,mirrorOverride:d.mirrorOverride});normalize(c,o);return true;}
  function autoCorrectAll(state){let count=0;(state?.cabinets||[]).forEach(c=>(c.objects||[]).forEach(o=>{const before=JSON.stringify([o.surface,o.parent,o.mirror,o.x,o.y,o.depthOffset]);normalize(c,o);const after=JSON.stringify([o.surface,o.parent,o.mirror,o.x,o.y,o.depthOffset]);if(before!==after)count++;}));return count;}
  function commit(label='attachment-adjustment'){const {a,state}=selected();if(!a||!state)return;window.KENC_HISTORY_ENGINE?.capture?.(state,label);a.renderAll?.();document.dispatchEvent(new CustomEvent('kenc:attachment-adjusted',{detail:{label}}));}
  function applySelected(patch,label='attachment-adjustment'){const {obj,cab}=selected();if(!obj||!cab)return false;update(obj,patch,cab);commit(label);return true;}
  function correctAll(){const {a,state}=selected();if(!a||!state)return 0;window.KENC_HISTORY_ENGINE?.capture?.(state,'before-auto-correction');const count=autoCorrectAll(state);a.renderAll?.();document.dispatchEvent(new CustomEvent('kenc:attachment-adjusted',{detail:{label:'auto-correct-all',count}}));return count;}
  window.KENC_ATTACHMENT_ADJUSTMENT={version:VERSION,selected,rememberDefaults,normalize,update,toggleMirror,setParent,reset,autoCorrectAll,applySelected,correctAll,commit};
})();
