(function(){
  'use strict';
  const VERSION='2.1.1';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const key=o=>String(o?.uuid||o?.id||'');
  const cabinetKey=c=>String(c?.uuid||c?.id||'');
  const pick=o=>({type:o?.type||'',option:o?.option||'',surface:o?.surface||'',x:Number(o?.x||0),y:Number(o?.y||0),w:Number(o?.w||0),h:Number(o?.h||0),rot:Number(o?.rot||0),materialId:o?.materialId||''});
  const same=(a,b)=>JSON.stringify(pick(a))===JSON.stringify(pick(b));
  function indexObjects(c){const m=new Map();(c?.objects||[]).forEach(o=>{const k=key(o);if(k)m.set(k,o);});return m;}
  function comparePacks(savedPack,currentPack){
    const result={added:[],removed:[],changed:[],unchanged:[],cabinets:[],summary:{added:0,removed:0,changed:0,unchanged:0}};
    const savedC=new Map((savedPack?.state?.cabinets||[]).map(c=>[cabinetKey(c),c]));
    const currentC=new Map((currentPack?.state?.cabinets||[]).map(c=>[cabinetKey(c),c]));
    const ids=new Set([...savedC.keys(),...currentC.keys()]);
    ids.forEach(cid=>{
      const s=savedC.get(cid),c=currentC.get(cid),entry={cabinetId:cid,label:c?.name||s?.name||'함체',added:[],removed:[],changed:[],unchanged:[]};
      const sm=indexObjects(s),cm=indexObjects(c),oids=new Set([...sm.keys(),...cm.keys()]);
      oids.forEach(oid=>{const a=sm.get(oid),b=cm.get(oid),item={cabinetId:cid,objectId:oid,saved:a?clone(a):null,current:b?clone(b):null,label:b?.name||b?.type||a?.name||a?.type||'객체'};
        if(!a&&b){entry.added.push(item);result.added.push(item);}else if(a&&!b){entry.removed.push(item);result.removed.push(item);}else if(!same(a,b)){entry.changed.push(item);result.changed.push(item);}else{entry.unchanged.push(item);result.unchanged.push(item);}
      });
      result.cabinets.push(entry);
    });
    result.summary={added:result.added.length,removed:result.removed.length,changed:result.changed.length,unchanged:result.unchanged.length};return result;
  }
  function compareHistory(id){const item=window.KENC_PROJECT_HISTORY?.list?.().find(x=>x.id===id);const current=window.KENC_PROJECT_ENGINE?.packageProject?.();return item&&current?comparePacks(item.pack,current):null;}
  function restoreCabinet(historyId,cabinetId){
    const item=window.KENC_PROJECT_HISTORY?.list?.().find(x=>x.id===historyId);if(!item)throw new Error('선택한 기록을 찾을 수 없습니다.');
    const current=window.KENC_DRAWING_API?.getState?.();if(!current)throw new Error('도면 상태를 찾을 수 없습니다.');
    const saved=(item.pack?.state?.cabinets||[]).find(c=>cabinetKey(c)===cabinetId);if(!saved)throw new Error('선택한 함체의 이전 상태가 없습니다.');
    window.KENC_PROJECT_HISTORY?.create?.('함체 선택 복원 직전','pre-cabinet-restore');
    const idx=(current.cabinets||[]).findIndex(c=>cabinetKey(c)===cabinetId);
    if(idx>=0)current.cabinets[idx]=clone(saved);else current.cabinets.push(clone(saved));
    window.KENC_PROJECT_ENGINE?.normalizeState?.(current);window.KENC_DRAWING_API?.renderAll?.();window.KENC_PREVIEW_ENGINE?.invalidate?.('cabinet-restore');
    document.dispatchEvent(new CustomEvent('kenc:cabinet-restored',{detail:{historyId,cabinetId}}));return saved;
  }
  function restoreObject(historyId,cabinetId,objectId){
    const item=window.KENC_PROJECT_HISTORY?.list?.().find(x=>x.id===historyId);if(!item)throw new Error('선택한 기록을 찾을 수 없습니다.');
    const current=window.KENC_DRAWING_API?.getState?.();const cabinet=(current?.cabinets||[]).find(c=>cabinetKey(c)===cabinetId);if(!cabinet)throw new Error('현재 함체를 찾을 수 없습니다.');
    const savedCab=(item.pack?.state?.cabinets||[]).find(c=>cabinetKey(c)===cabinetId);const savedObj=(savedCab?.objects||[]).find(o=>key(o)===objectId);
    window.KENC_PROJECT_HISTORY?.create?.('객체 선택 복원 직전','pre-object-restore');
    const idx=(cabinet.objects||[]).findIndex(o=>key(o)===objectId);
    if(savedObj){if(idx>=0)cabinet.objects[idx]=clone(savedObj);else cabinet.objects.push(clone(savedObj));}else if(idx>=0)cabinet.objects.splice(idx,1);
    window.KENC_PROJECT_ENGINE?.normalizeState?.(current);window.KENC_DRAWING_API?.renderAll?.();window.KENC_PREVIEW_ENGINE?.invalidate?.('object-restore');return savedObj||null;
  }
  window.KENC_PROJECT_DIFF={version:VERSION,comparePacks,compareHistory,restoreCabinet,restoreObject};
})();
