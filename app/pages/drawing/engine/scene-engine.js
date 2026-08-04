(function(){
  'use strict';
  const VERSION='1.1.0';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const GROUPS=['body','door','inside','utility','holes','covers','guides'];
  const uid=(prefix,n)=>`${prefix}-${String(n).padStart(3,'0')}`;
  function group(id,label=id){return{id,type:'group',label,visible:true,locked:false,children:[]};}
  function classify(def,o,transform){
    if(transform.parent==='door')return'door';
    if(transform.parent==='inside')return'inside';
    if(transform.parent==='holes'||def.category==='hole')return'holes';
    if(def.category==='cover')return'covers';
    if(def.category==='utility'||['groundBar','cableHook'].includes(o.type))return'utility';
    return'body';
  }
  function objectNode(c,o,index){
    const d=window.KENC_OBJECT_ENGINE.definition(o.type)||{};
    const transform=window.KENC_ATTACH_ENGINE.transform(c,o,0,d);
    const id=o.sceneId||o.uid||uid(String(o.type||'OBJ').toUpperCase(),o.id??index+1);
    o.sceneId=id;
    return {id,type:'object',objectId:o.id,objectType:o.type,name:d.label||o.type,variant:o.variant||o.option,
      parent:classify(d,o,transform),surface:transform.surface,transform,
      visible:o.visible!==false,locked:!!o.locked,selected:false,zIndex:Number(o.zIndex)||0,
      render:{twoD:o.render2d!==false,threeD:o.render3d!==false,preview:o.preview!==false,export:o.export!==false},
      data:o,children:[]};
  }
  function cabinetNode(c,index,state){
    const groups=Object.fromEntries(GROUPS.map(x=>[x,group(x,x)]));
    (c.objects||[]).forEach((o,i)=>{const n=objectNode(c,o,i);n.selected=c.id===state.selectedCabinetId&&o.id===state.selectedObjectId;groups[n.parent]?.children.push(n)});
    Object.values(groups).forEach(g=>g.children.sort((a,b)=>a.zIndex-b.zIndex));
    return{id:c.sceneId||uid('CAB',c.id??index+1),type:'cabinet',name:c.name||`함체 ${index+1}`,visible:true,locked:false,data:c,children:Object.values(groups)};
  }
  function build(state){
    window.KENC_OBJECT_ENGINE.normalizeState(state);
    return{id:'KENC-SCENE',type:'scene',engineVersion:VERSION,mode3d:state.mode3d||'single',selectedCabinetId:state.selectedCabinetId,selectedObjectId:state.selectedObjectId,children:(state.cabinets||[]).map((c,i)=>cabinetNode(c,i,state))};
  }
  function walk(node,fn,parent=null){fn(node,parent);(node.children||[]).forEach(x=>walk(x,fn,node));}
  function find(scene,id){let r=null;walk(scene,n=>{if(n.id===id||n.objectId===id)r=n});return r;}
  function selected(scene){let r=null;walk(scene,n=>{if(n.selected)r=n});return r;}
  function flatten(scene,filter=()=>true){const out=[];walk(scene,n=>{if(filter(n))out.push(n)});return out;}
  function snapshot(scene){return clone(scene);}
  window.KENC_SCENE_ENGINE={version:VERSION,build,walk,find,selected,flatten,snapshot,groups:GROUPS};
})();