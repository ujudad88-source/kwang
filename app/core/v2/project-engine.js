(function(){
  'use strict';
  const VERSION='2.0.0',SCHEMA=3,clone=v=>JSON.parse(JSON.stringify(v));
  const api=()=>window.KENC_DRAWING_API;
  function normalizeState(state){
    if(!state||typeof state!=='object')throw new Error('유효한 도면 상태가 아닙니다.');
    state.schemaVersion=SCHEMA;state.engineVersion=VERSION;state.project=state.project||{};
    window.KENC_UUID?.ensure(state.project,'uuid');state.project.name=state.project.name||'KENC 프로젝트';
    state.project.createdAt=state.project.createdAt||new Date().toISOString();state.project.updatedAt=new Date().toISOString();
    state.cabinets=Array.isArray(state.cabinets)?state.cabinets:[];
    state.cabinets.forEach((c,i)=>{window.KENC_CABINET_ENGINE?.normalize(c,i);c.objects=Array.isArray(c.objects)?c.objects:[];c.objects.forEach(o=>{window.KENC_UUID?.ensure(o,'uuid');o.schemaVersion=SCHEMA;window.KENC_MATERIAL_ENGINE?.normalizeObject(o);});});
    return state;
  }
  function packageProject(state=api()?.getState?.()){
    const s=normalizeState(clone(state));
    const scene=window.KENC_SCENE_ENGINE?.build?.(s)||null;
    return {format:'KENC_PROJECT',fileVersion:VERSION,schemaVersion:SCHEMA,project:s.project,state:s,scene,exportedAt:new Date().toISOString()};
  }
  function download(filename){
    const pack=packageProject(),safe=(filename||pack.project.name||'KENC_Project').replace(/[\\/:*?"<>|]+/g,'_');
    const blob=new Blob([JSON.stringify(pack,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`${safe}.kenc`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
    return pack;
  }
  function applyPackage(pack){
    if(pack?.format!=='KENC_PROJECT'||!pack.state)throw new Error('KENC 프로젝트 파일이 아닙니다.');
    const current=api()?.getState?.();if(!current)throw new Error('도면 엔진을 찾을 수 없습니다.');
    const incoming=normalizeState(clone(pack.state));Object.keys(current).forEach(k=>delete current[k]);Object.assign(current,incoming);
    api()?.renderAll?.();window.KENC_PREVIEW_ENGINE?.invalidate?.('project-import');
    document.dispatchEvent(new CustomEvent('kenc:project-loaded',{detail:{project:incoming.project}}));return incoming;
  }
  async function openFile(file){const text=await file.text();return applyPackage(JSON.parse(text));}
  function newProject(){
    const current=api()?.getState?.();if(!current)return null;
    current.project={uuid:window.KENC_UUID.create(),name:'새 KENC 프로젝트',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    normalizeState(current);api()?.renderAll?.();return current;
  }
  window.KENC_PROJECT_ENGINE={version:VERSION,schemaVersion:SCHEMA,normalizeState,packageProject,download,openFile,applyPackage,newProject};
})();
