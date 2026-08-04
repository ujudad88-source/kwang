(function(){
  'use strict';
  const VERSION='2.1.1', CURRENT_SCHEMA=3, MIN_SCHEMA=1;
  const clone=v=>JSON.parse(JSON.stringify(v));
  const num=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
  function stateOf(raw){
    if(raw?.format==='KENC_PROJECT'&&raw.state)return {pack:raw,state:raw.state,wrapped:false};
    if(raw?.state&&Array.isArray(raw.state.cabinets))return {pack:raw,state:raw.state,wrapped:false};
    if(Array.isArray(raw?.cabinets))return {pack:null,state:raw,wrapped:true};
    return {pack:null,state:null,wrapped:false};
  }
  function countObjects(state){return (state?.cabinets||[]).reduce((n,c)=>n+(Array.isArray(c.objects)?c.objects.length:0),0);}
  function inspect(raw){
    const errors=[],warnings=[],repairs=[];const found=stateOf(raw);const state=found.state;
    if(!state){errors.push('도면 상태(cabinets)를 찾을 수 없습니다.');return {ok:false,errors,warnings,repairs,raw};}
    const schema=num(raw?.schemaVersion??state.schemaVersion,found.wrapped?1:CURRENT_SCHEMA);
    if(schema>CURRENT_SCHEMA)errors.push(`이 파일은 더 새로운 Schema ${schema} 형식입니다.`);
    if(schema<MIN_SCHEMA)errors.push(`지원하지 않는 Schema ${schema} 형식입니다.`);
    if(found.wrapped){warnings.push('구버전 원시 도면 파일입니다. KENC 프로젝트 형식으로 변환됩니다.');repairs.push('프로젝트 포장 형식 생성');}
    if(raw?.format&&raw.format!=='KENC_PROJECT')warnings.push(`알 수 없는 파일 형식 표시: ${raw.format}`);
    if(!Array.isArray(state.cabinets)){errors.push('함체 목록이 배열이 아닙니다.');}
    const cabinets=Array.isArray(state.cabinets)?state.cabinets:[];
    const seen=new Set();
    cabinets.forEach((c,ci)=>{
      if(!c||typeof c!=='object'){errors.push(`${ci+1}번째 함체 데이터가 손상되었습니다.`);return;}
      ['width','height','depth'].forEach(k=>{if(!Number.isFinite(Number(c[k]))||Number(c[k])<=0){warnings.push(`${ci+1}번째 함체 ${k} 값이 유효하지 않아 기본값으로 복구됩니다.`);repairs.push(`함체 ${ci+1} ${k} 복구`);}});
      if(!Array.isArray(c.objects)){warnings.push(`${ci+1}번째 함체의 객체 목록이 없어 빈 목록으로 복구됩니다.`);repairs.push(`함체 ${ci+1} 객체 목록 생성`);return;}
      c.objects.forEach((o,oi)=>{
        if(!o||typeof o!=='object'){warnings.push(`${ci+1}번째 함체의 ${oi+1}번째 객체가 제거됩니다.`);repairs.push('손상 객체 제거');return;}
        const id=o.uuid||o.id;if(id&&seen.has(id))warnings.push(`중복 객체 ID가 발견되어 새 UUID가 부여됩니다: ${id}`);if(id)seen.add(id);
        if(!o.type)warnings.push(`${ci+1}번째 함체의 객체 ${oi+1}에 종류 정보가 없습니다.`);
      });
    });
    if(schema<CURRENT_SCHEMA){warnings.push(`Schema ${schema} → ${CURRENT_SCHEMA} 자동 변환이 필요합니다.`);repairs.push('스키마 자동 변환');}
    return {ok:errors.length===0,errors,warnings:[...new Set(warnings)],repairs:[...new Set(repairs)],schema,cabinetCount:cabinets.length,objectCount:countObjects(state),found,raw};
  }
  function repairState(input){
    const state=clone(input);state.cabinets=Array.isArray(state.cabinets)?state.cabinets.filter(c=>c&&typeof c==='object'):[];
    state.cabinets.forEach((c,ci)=>{
      c.width=num(c.width,500);c.height=num(c.height,700);c.depth=num(c.depth,200);
      c.objects=Array.isArray(c.objects)?c.objects.filter(o=>o&&typeof o==='object'):[];
      const ids=new Set();c.objects.forEach(o=>{if(!o.uuid||ids.has(o.uuid))o.uuid=window.KENC_UUID?.create?.()||`obj-${Date.now()}-${Math.random()}`;ids.add(o.uuid);o.x=num(o.x,0);o.y=num(o.y,0);o.w=Math.max(1,num(o.w,40));o.h=Math.max(1,num(o.h,40));o.rot=num(o.rot,0);o.surface=o.surface||'front';});
      if(!c.uuid)c.uuid=window.KENC_UUID?.create?.()||`cab-${ci}-${Date.now()}`;
    });
    return window.KENC_PROJECT_ENGINE?.normalizeState?.(state)||state;
  }
  function prepare(raw){
    const report=inspect(raw);if(!report.ok)return {report,package:null};
    const original=report.found.state;const state=repairState(original);
    const pack={format:'KENC_PROJECT',fileVersion:VERSION,schemaVersion:CURRENT_SCHEMA,project:state.project,state,scene:null,exportedAt:raw?.exportedAt||new Date().toISOString(),migratedFrom:{schemaVersion:report.schema,fileVersion:raw?.fileVersion||null}};
    return {report,package:pack};
  }
  async function prepareFile(file){
    if(!file)throw new Error('파일이 선택되지 않았습니다.');
    if(file.size>25*1024*1024)throw new Error('프로젝트 파일은 25MB 이하만 열 수 있습니다.');
    let raw;try{raw=JSON.parse(await file.text());}catch(_){throw new Error('JSON 구조를 읽을 수 없는 손상된 파일입니다.');}
    const result=prepare(raw);result.file={name:file.name,size:file.size};return result;
  }
  function compareCurrent(pack){
    const current=window.KENC_DRAWING_API?.getState?.();const incoming=pack?.state;
    if(!current||!incoming)return null;
    const curObjects=countObjects(current),newObjects=countObjects(incoming);
    return {currentCabinets:(current.cabinets||[]).length,incomingCabinets:(incoming.cabinets||[]).length,currentObjects:curObjects,incomingObjects:newObjects,cabinetDelta:(incoming.cabinets||[]).length-(current.cabinets||[]).length,objectDelta:newObjects-curObjects};
  }
  window.KENC_PROJECT_COMPATIBILITY={version:VERSION,currentSchema:CURRENT_SCHEMA,inspect,prepare,prepareFile,compareCurrent};
})();
