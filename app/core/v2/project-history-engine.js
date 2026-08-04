(function(){
  'use strict';
  const VERSION='2.1.1';
  const STORAGE_KEY='kenc.project.history.v3';
  const MAX_ITEMS=12;
  const clone=v=>JSON.parse(JSON.stringify(v));

  function load(){
    try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(v)?v:[];}catch(_){return [];}
  }
  function save(items){localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,MAX_ITEMS)));}
  function summarize(pack){
    const cabinets=pack?.state?.cabinets||[];
    return {cabinetCount:cabinets.length,objectCount:cabinets.reduce((n,c)=>n+(c.objects?.length||0),0),projectName:pack?.project?.name||'KENC 프로젝트'};
  }
  function create(label='수동 스냅샷',reason='manual'){
    const pack=window.KENC_PROJECT_ENGINE?.packageProject?.();if(!pack)throw new Error('프로젝트 상태를 만들 수 없습니다.');
    const item={id:window.KENC_UUID?.create?.()||String(Date.now()),createdAt:new Date().toISOString(),label:String(label||'스냅샷'),reason,summary:summarize(pack),pack:clone(pack)};
    const items=load();items.unshift(item);save(items);document.dispatchEvent(new CustomEvent('kenc:history-changed'));return item;
  }
  function restore(id){
    const item=load().find(x=>x.id===id);if(!item)throw new Error('선택한 기록을 찾을 수 없습니다.');
    create('복원 직전 자동 백업','pre-restore');
    window.KENC_PROJECT_ENGINE?.applyPackage?.(clone(item.pack));
    document.dispatchEvent(new CustomEvent('kenc:history-restored',{detail:{item}}));return item;
  }
  function remove(id){const next=load().filter(x=>x.id!==id);save(next);document.dispatchEvent(new CustomEvent('kenc:history-changed'));return next;}
  function clear(){localStorage.removeItem(STORAGE_KEY);document.dispatchEvent(new CustomEvent('kenc:history-changed'));}
  function compare(id){
    const item=load().find(x=>x.id===id);if(!item)return null;
    const current=window.KENC_PROJECT_ENGINE?.packageProject?.();if(!current)return null;
    const a=summarize(item.pack),b=summarize(current);
    return {saved:a,current:b,cabinetDelta:b.cabinetCount-a.cabinetCount,objectDelta:b.objectCount-a.objectCount};
  }
  window.KENC_PROJECT_HISTORY={version:VERSION,maxItems:MAX_ITEMS,list:load,create,restore,remove,clear,compare};
})();
