(function(){
  'use strict';
  function objectNode(c,o,index){return{id:o.id??index,type:'object',objectType:o.type,variant:o.variant,surface:o.surface,transform:window.KENC_ATTACH_ENGINE.transform(c,o),data:o,children:[]};}
  function cabinetNode(c,index){const groups={door:[],body:[],inside:[],utility:[],holes:[]};(c.objects||[]).forEach((o,i)=>{const node=objectNode(c,o,i);if(o.category==='hole'||o.category==='formed')groups.holes.push(node);else if(o.category==='internal')groups.inside.push(node);else if(o.category==='utility')groups.utility.push(node);else if(o.doorBound)groups.door.push(node);else groups.body.push(node);});return{id:c.id??index,type:'cabinet',data:c,children:Object.entries(groups).map(([id,children])=>({id,type:'group',children}))};}
  function build(state){window.KENC_OBJECT_ENGINE.normalizeState(state);return{type:'scene',engineVersion:'1.0.3',mode3d:state.mode3d||'single',children:(state.cabinets||[]).map(cabinetNode)};}
  function walk(node,fn){fn(node);(node.children||[]).forEach(x=>walk(x,fn));}
  window.KENC_SCENE_ENGINE={version:'1.0.3',build,walk};
})();
