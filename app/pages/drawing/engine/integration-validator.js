(function(){
  'use strict';
  const VERSION='1.1.1';
  const byId=id=>document.getElementById(id);
  const finite=v=>Number.isFinite(Number(v));
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const getState=()=>window.KENC_DRAWING_API?.getState?.()||null;
  const selectedCabinet=(state)=>state?.cabinets?.find(c=>c.id===state.selectedCabinetId)||state?.cabinets?.[0]||null;
  const defFor=o=>window.KENC_OBJECT_ENGINE?.definition?.(o.type)||window.KENC_OBJECT_REGISTRY?.definition?.(o.type)||null;
  const planeFor=(cab,o)=>window.KENC_OBJECT_ENGINE?.plane?.(o.surface,cab)||{width:cab?.width||0,height:cab?.height||0};

  function checkObject(cab,o,index){
    const errors=[],warnings=[];
    const def=defFor(o);
    if(!o.type) errors.push('객체 종류 누락');
    if(!def) errors.push('객체 정의 미등록');
    if(!finite(o.x)||!finite(o.y)||!finite(o.w)||!finite(o.h)) errors.push('좌표 또는 규격 오류');
    if(Number(o.w)<=0||Number(o.h)<=0) errors.push('가로·세로가 0 이하');
    const p=planeFor(cab,o);
    if(Number(o.x)<-.01||Number(o.y)<-.01||Number(o.x)+Number(o.w)>Number(p.width)+.01||Number(o.y)+Number(o.h)>Number(p.height)+.01) errors.push('함체 영역 이탈');
    if(def?.mounts?.length&&!def.mounts.includes(o.surface)) errors.push('지원하지 않는 부착면');
    const transform=window.KENC_ATTACH_ENGINE?.transform?.(cab,o,0,def||{});
    if(!transform||!finite(transform.center?.x)||!finite(transform.center?.y)||!finite(transform.center?.z)) errors.push('3D 좌표 변환 실패');
    const kinds=['2d','3d','export'];
    kinds.forEach(kind=>{ if(!window.KENC_OBJECT_REGISTRY?.renderer?.(o.type,kind)) warnings.push(kind.toUpperCase()+' 렌더러 미등록'); });
    const expectedParent=window.KENC_ATTACH_ENGINE?.resolveParent?.(o,def||{});
    if(transform?.parent&&expectedParent&&transform.parent!==expectedParent) warnings.push('부모 그룹 불일치');
    return {id:o.sceneId||o.uid||o.id||`${o.type||'OBJ'}-${index+1}`,type:o.type||'unknown',label:def?.label||o.type||'객체',errors,warnings,ok:errors.length===0};
  }

  function run(state=getState()){
    const errors=[],warnings=[],objects=[];
    if(!state){errors.push('도면 상태 API를 찾을 수 없습니다.');return result(state,objects,errors,warnings);}
    try{window.KENC_OBJECT_ENGINE?.normalizeState?.(state);}catch(e){errors.push('객체 정규화 실패: '+e.message);}
    const ids=new Set();
    (state.cabinets||[]).forEach((cab,ci)=>{
      if(!finite(cab.width)||!finite(cab.height)||!finite(cab.depth)||Number(cab.width)<=0||Number(cab.height)<=0||Number(cab.depth)<=0) errors.push(`함체 ${ci+1} 규격 오류`);
      (cab.objects||[]).forEach((o,oi)=>{
        const item=checkObject(cab,o,oi); objects.push(item);
        const key=String(item.id);
        if(ids.has(key)) item.warnings.push('중복 객체 ID');
        ids.add(key);
      });
    });
    const scene=window.KENC_SCENE_ENGINE?.build?.(state);
    if(!scene) errors.push('Scene Graph 생성 실패');
    else {
      const sceneObjects=window.KENC_SCENE_ENGINE?.flatten?.(scene,n=>n.type==='object')||[];
      if(sceneObjects.length!==objects.length) errors.push(`Scene 객체 수 불일치 (${sceneObjects.length}/${objects.length})`);
    }
    const attach=window.KENC_ATTACH_ENGINE?.selfTest?.();
    if(attach&&!attach.ok) errors.push('Attach Engine 자체 검사 실패');
    const diagnostics=window.KENC_ENGINE_DIAGNOSTICS?.run?.();
    if(diagnostics&&!diagnostics.ok) errors.push(...(diagnostics.errors||[]));
    objects.forEach(o=>{errors.push(...o.errors.map(x=>`${o.label}: ${x}`));warnings.push(...o.warnings.map(x=>`${o.label}: ${x}`));});
    return result(state,objects,errors,warnings,scene);
  }

  function result(state,objects,errors,warnings,scene=null){
    const rendererCoverage={twoD:0,threeD:0,export:0};
    objects.forEach(o=>{
      if(window.KENC_OBJECT_REGISTRY?.renderer?.(o.type,'2d'))rendererCoverage.twoD++;
      if(window.KENC_OBJECT_REGISTRY?.renderer?.(o.type,'3d'))rendererCoverage.threeD++;
      if(window.KENC_OBJECT_REGISTRY?.renderer?.(o.type,'export'))rendererCoverage.export++;
    });
    const r={version:VERSION,ok:errors.length===0,state:clone(state),scene,objects,errors:[...new Set(errors)],warnings:[...new Set(warnings)],rendererCoverage,totalObjects:objects.length,timestamp:new Date().toISOString()};
    window.KENC_INTEGRATION_RESULT=r;
    document.documentElement.dataset.kencIntegration=r.ok?'ok':'error';
    document.dispatchEvent(new CustomEvent('kenc:integration-validated',{detail:r}));
    updateBadge(r);
    return r;
  }

  function updateBadge(r){
    const badge=byId('kencIntegrationBadge');
    if(!badge)return;
    badge.className='drawing-integration-badge '+(r.ok?'ok':'warn');
    badge.textContent=r.ok?`통합 정상 · ${r.totalObjects}개 객체`:`통합 확인 · ${r.errors.length}건`;
    badge.title=r.ok?'2D·3D·전달도면 엔진 연결이 정상입니다.':r.errors.slice(0,5).join('\n');
  }

  function render(container,r,compact=false){
    if(!container)return;
    const coverage=`2D ${r.rendererCoverage.twoD}/${r.totalObjects} · 3D ${r.rendererCoverage.threeD}/${r.totalObjects} · 출력 ${r.rendererCoverage.export}/${r.totalObjects}`;
    const summary=document.createElement('div');
    summary.className='kenc-integration-summary '+(r.ok?'ok':'warn');
    summary.innerHTML=`<strong>${r.ok?'엔진 통합 검사 정상':'엔진 통합 확인 필요'}</strong><span>${coverage}</span>`;
    const details=document.createElement('div'); details.className='kenc-integration-details';
    const items=[];
    if(r.errors.length)r.errors.slice(0,12).forEach(x=>items.push({kind:'error',text:x}));
    if(r.warnings.length)r.warnings.slice(0,8).forEach(x=>items.push({kind:'warn',text:x}));
    if(!items.length)items.push({kind:'ok',text:'객체 좌표·부착면·Scene Graph·렌더러 연결이 일치합니다.'});
    items.forEach(x=>{const d=document.createElement('div');d.className='kenc-integration-item '+x.kind;d.textContent=x.text;details.appendChild(d);});
    if(compact){container.appendChild(summary);return;}
    container.appendChild(summary);container.appendChild(details);
  }

  function appendToChecks(){
    const r=run();
    const out=byId('drawingCheckResults');
    const review=byId('drawingReviewChecks');
    if(out){const wrap=document.createElement('section');wrap.className='kenc-integration-section';render(wrap,r);out.appendChild(wrap);}
    if(review){const wrap=document.createElement('section');wrap.className='kenc-integration-section';render(wrap,r);review.appendChild(wrap);}
  }

  function install(){
    byId('drawingRunCheckBtn')?.addEventListener('click',()=>setTimeout(appendToChecks,0));
    byId('drawingReviewCheckBtn')?.addEventListener('click',()=>setTimeout(appendToChecks,0));
    document.addEventListener('kenc:object-engine-ready',()=>run(),{once:true});
    setTimeout(()=>run(),120);
  }
  window.KENC_INTEGRATION_VALIDATOR={version:VERSION,run,render,checkObject};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
