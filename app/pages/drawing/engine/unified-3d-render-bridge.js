(function(){
  'use strict';
  const VERSION='2.3.0';
  let cache={state:null,scene:null,key:''};
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  function stateKey(state){
    if(!state)return'';
    const cabs=state.cabinets||[];
    return [state.selectedCabinetId,state.selectedObjectId,state.mode3d,cabs.length,
      ...cabs.map(c=>[c.id,c.width,c.height,c.depth,(c.objects||[]).length,...(c.objects||[]).map(o=>[o.id,o.sceneId,o.type,o.x,o.y,o.w,o.h,o.rot,o.surface,o.parent,o.visible,o.render3d,o.export].join(':'))].join('|'))].join('~');
  }
  function sceneFor(state){
    if(!state)return null;
    const key=stateKey(state);
    if(cache.state===state&&cache.key===key&&cache.scene)return cache.scene;
    const scene=window.KENC_SCENE_ENGINE?.build?.(state)||null;
    cache={state,scene,key};
    return scene;
  }
  function cabinetNodes(state,mode='single',preferredCabinet=null){
    const scene=sceneFor(state);
    if(!scene)return[];
    const all=(scene.children||[]).filter(n=>n?.type==='cabinet'&&n.visible!==false);
    if(mode==='stack')return all;
    const preferredId=preferredCabinet?.id??state?.selectedCabinetId;
    return [all.find(n=>String(n.data?.id)===String(preferredId)||String(n.id)===String(preferredId))||all[0]].filter(Boolean);
  }
  function objectNodes(cabinetNode,options={}){
    const exportMode=!!options.exportMode;
    const mode=options.displayMode||'exterior';
    const groups=cabinetNode?.children||[];
    const nodes=[];
    groups.forEach(group=>(group.children||[]).forEach(node=>{
      const o=node?.data;
      if(!o||node.visible===false||o.visible===false||node.render?.threeD===false||o.render3d===false)return;
      if(exportMode&&(node.render?.export===false||o.export===false))return;
      if(mode==='exterior'&&(node.surface==='inside'||node.parent==='inside'))return;
      nodes.push(node);
    }));
    return nodes.sort((a,b)=>(num(a.zIndex)-num(b.zIndex))||String(a.id).localeCompare(String(b.id)));
  }
  function cabinets(state,options={}){
    const mode=options.mode||state?.mode3d||'single';
    return cabinetNodes(state,mode,options.preferredCabinet).map(node=>({
      node,
      cabinet:node.data,
      objects:objectNodes(node,options).map(objectNode=>({node:objectNode,object:objectNode.data,transform:objectNode.transform,surface:objectNode.surface,parent:objectNode.parent}))
    }));
  }
  function invalidate(reason='unknown'){
    cache={state:null,scene:null,key:''};
    document.dispatchEvent(new CustomEvent('kenc:unified-3d-invalidated',{detail:{reason,version:VERSION}}));
  }
  function diagnostics(state){
    const scene=sceneFor(state),sceneObjects=scene?window.KENC_SCENE_ENGINE?.flatten?.(scene,n=>n.type==='object')||[]:[];
    const sourceObjects=(state?.cabinets||[]).flatMap(c=>c.objects||[]);
    return{version:VERSION,ok:!!scene&&sceneObjects.length===sourceObjects.length,sourceObjects:sourceObjects.length,sceneObjects:sceneObjects.length,cabinets:scene?.children?.length||0};
  }
  ['kenc:preview-invalidated','kenc:scene-synced','kenc:object-changed','kenc:project-loaded'].forEach(name=>document.addEventListener(name,()=>{cache={state:null,scene:null,key:''};}));
  window.KENC_UNIFIED_3D_BRIDGE={version:VERSION,sceneFor,cabinetNodes,objectNodes,cabinets,invalidate,diagnostics};
})();
