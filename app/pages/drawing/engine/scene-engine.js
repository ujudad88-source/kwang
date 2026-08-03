(function(){
  'use strict';
  function objectNode(c,o,index){const d=window.KENC_OBJECT_ENGINE.definition(o.type)||{};const transform=window.KENC_ATTACH_ENGINE.transform(c,o,0,d);return{id:o.id??index,type:'object',objectType:o.type,variant:o.variant,surface:transform.surface,parent:transform.parent,transform,data:o,children:[]};}
  function group(id,children=[]){return{id,type:'group',children};}
  function cabinetNode(c,index){const groups={door:group('door'),body:group('body'),inside:group('inside'),utility:group('utility'),holes:group('holes')};(c.objects||[]).forEach((o,i)=>{const node=objectNode(c,o,i);(groups[node.parent]||groups.body).children.push(node);});return{id:c.id??index,type:'cabinet',data:c,children:Object.values(groups)};}
  function build(state){window.KENC_OBJECT_ENGINE.normalizeState(state);return{type:'scene',engineVersion:'1.0.4',mode3d:state.mode3d||'single',children:(state.cabinets||[]).map(cabinetNode)};}
  function walk(node,fn){fn(node);(node.children||[]).forEach(x=>walk(x,fn));}
  function find(scene,id){let result=null;walk(scene,n=>{if(n.id===id)result=n;});return result;}
  window.KENC_SCENE_ENGINE={version:'1.0.4',build,walk,find};
})();