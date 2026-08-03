(function(){
'use strict';
const V='1.0.6';
function contextPayload(ctx,kind){const o=ctx.object||{},spec=window.KENC_OBJECT_LIBRARY.describe(o)||{};return {id:o.type,kind,variant:o.variant||o.option,label:spec.label||o.type,surface:o.surface,transform:ctx.transform||null,size:{w:o.w,h:o.h,d:o.depth??spec.size?.d??0},material:spec.material||null,geometry:spec.geometry||null,exportMark:spec.exportMark||null,object:o};}
function render(type,kind,ctx){const custom=window.KENC_OBJECT_REGISTRY.renderer(type,kind);return custom?custom(ctx):contextPayload(ctx,kind)}
function renderNode(node,kind){if(!node||node.type!=='object')return null;const o=node.data;return render(o.type,kind,{object:o,transform:node.transform,node});}
function scene(scene,kind){return window.KENC_SCENE_ENGINE.flatten(scene,n=>n.type==='object'&&n.render?.[kind==='2d'?'twoD':kind==='3d'?'threeD':kind]!==false).map(n=>renderNode(n,kind)).filter(Boolean)}
window.KENC_OBJECT_RENDERER_BRIDGE={version:V,contextPayload,render,renderNode,scene};
})();
