(function(){
  'use strict';
  const VERSION='1.1.2';
  const EPS=.01;
  const byId=id=>document.getElementById(id);
  const num=v=>Number(v)||0;
  const uniq=a=>[...new Set(a)];
  const state=()=>window.KENC_DRAWING_API?.getState?.()||null;
  const def=o=>window.KENC_OBJECT_ENGINE?.definition?.(o.type)||window.KENC_OBJECT_REGISTRY?.definition?.(o.type)||{};
  const currentCabinet=s=>s?.cabinets?.find(c=>c.id===s.selectedCabinetId)||s?.cabinets?.[0]||null;
  let lastResult=null, timer=0, observer=null, decorating=false;

  const RULES={
    defaultEdge:15,
    edge:{vent:20,key:25,nameplate:15,acrylicWindow:20,doubleLock:10,cover:10,groundBar:10,cableHook:10,plate:10,cut:8,emboss:8,anchor:6},
    pair:{
      'key|vent':20,'nameplate|vent':10,'acrylicWindow|key':20,'acrylicWindow|vent':15,
      'doubleLock|key':15,'doubleLock|vent':15,'groundBar|cableHook':15,'plate|groundBar':10,'cableHook|plate':10
    },
    overlapAllowed:new Set(['cover|cut','cover|emboss','anchor|plate','cut|plate','emboss|plate'])
  };

  function pairKey(a,b){return [a,b].sort().join('|');}
  function rect(o){return{x:num(o.x),y:num(o.y),w:Math.max(0,num(o.w)),h:Math.max(0,num(o.h))};}
  function gap(a,b){
    const ax2=a.x+a.w, ay2=a.y+a.h, bx2=b.x+b.w, by2=b.y+b.h;
    const dx=Math.max(b.x-ax2,a.x-bx2,0),dy=Math.max(b.y-ay2,a.y-by2,0);
    return Math.hypot(dx,dy);
  }
  function overlap(a,b){return a.x < b.x+b.w-EPS && a.x+a.w > b.x+EPS && a.y < b.y+b.h-EPS && a.y+a.h > b.y+EPS;}
  function objectId(o,i){return String(o.sceneId||o.uid||o.id||`${o.type||'OBJ'}-${i+1}`);}
  function issue(kind,code,message,objects,meta={}){return{kind,code,message,objects:objects.map(String),meta};}
  function plane(cab,surface){return window.KENC_OBJECT_ENGINE?.plane?.(surface,cab)||(
    surface==='left'||surface==='right'?{width:num(cab.depth),height:num(cab.height)}:
    surface==='top'||surface==='bottom'?{width:num(cab.width),height:num(cab.depth)}:{width:num(cab.width),height:num(cab.height)}
  );}

  function inspectCabinet(cab){
    const issues=[],objects=cab?.objects||[];
    objects.forEach((o,i)=>{
      const id=objectId(o,i),r=rect(o),p=plane(cab,o.surface),edge=RULES.edge[o.type]??RULES.defaultEdge;
      const clear={left:r.x,top:r.y,right:p.width-(r.x+r.w),bottom:p.height-(r.y+r.h)};
      if(Math.min(clear.left,clear.top,clear.right,clear.bottom)<-EPS){
        issues.push(issue('error','OUTSIDE',`${def(o).label||o.type}가 함체 영역을 벗어났습니다.`,[id],{clear}));
      }else if(Math.min(clear.left,clear.top,clear.right,clear.bottom)<edge){
        issues.push(issue('warning','EDGE_CLEARANCE',`${def(o).label||o.type}의 절곡부 이격거리가 ${edge}mm 미만입니다.`,[id],{required:edge,clear}));
      }
    });
    for(let i=0;i<objects.length;i++)for(let j=i+1;j<objects.length;j++){
      const a=objects[i],b=objects[j]; if(a.surface!==b.surface)continue;
      const aid=objectId(a,i),bid=objectId(b,j),key=pairKey(a.type,b.type),ra=rect(a),rb=rect(b);
      if(overlap(ra,rb)){
        if(!RULES.overlapAllowed.has(key))issues.push(issue('error','OBJECT_COLLISION',`${def(a).label||a.type}와 ${def(b).label||b.type}가 겹칩니다.`,[aid,bid]));
      }else{
        const required=RULES.pair[key]??5,d=gap(ra,rb);
        if(d+EPS<required)issues.push(issue('warning','MIN_CLEARANCE',`${def(a).label||a.type}와 ${def(b).label||b.type}의 간격이 ${required}mm 미만입니다.`,[aid,bid],{required,actual:Math.round(d*10)/10}));
      }
    }
    return issues;
  }

  function run(s=state(),options={}){
    const issues=[];
    if(!s){issues.push(issue('error','NO_STATE','도면 상태를 찾을 수 없습니다.',[]));}
    else (s.cabinets||[]).forEach(c=>issues.push(...inspectCabinet(c)));
    const errors=issues.filter(x=>x.kind==='error'),warnings=issues.filter(x=>x.kind==='warning'),infos=issues.filter(x=>x.kind==='info');
    lastResult={version:VERSION,ok:errors.length===0,manufacturable:errors.length===0,issues,errors,warnings,infos,timestamp:new Date().toISOString()};
    window.KENC_COLLISION_RESULT=lastResult;
    document.documentElement.dataset.kencManufacturable=lastResult.ok?'yes':'no';
    updateBadge(lastResult);decorate(lastResult,s);
    if(!options.silent)document.dispatchEvent(new CustomEvent('kenc:collision-checked',{detail:lastResult}));
    return lastResult;
  }

  function objectIssueMap(result){
    const map=new Map();
    result.issues.forEach(x=>x.objects.forEach(id=>{
      const prev=map.get(String(id));
      if(!prev||prev.kind!=='error')map.set(String(id),x);
    }));
    return map;
  }
  function decorate(result,s){
    const svg=byId('drawingCanvas');if(!svg||decorating)return;
    decorating=true;
    try{
      const cab=currentCabinet(s),map=objectIssueMap(result);
      svg.querySelectorAll('g[data-id]').forEach(g=>{
        const raw=g.getAttribute('data-id');
        const o=(cab?.objects||[]).find(x=>String(x.id)===String(raw));
        const ids=o?[String(o.sceneId||o.uid||o.id),String(o.id)]:[String(raw)];
        const hit=ids.map(id=>map.get(id)).find(Boolean);
        g.classList.toggle('kenc-collision-error',hit?.kind==='error');
        g.classList.toggle('kenc-collision-warning',hit?.kind==='warning');
        let title=g.querySelector(':scope > title.kenc-collision-title');
        if(hit){if(!title){title=document.createElementNS('http://www.w3.org/2000/svg','title');title.setAttribute('class','kenc-collision-title');g.prepend(title);}title.textContent=hit.message;}
        else title?.remove();
      });
    }finally{decorating=false;}
  }

  function updateBadge(r){
    let badge=byId('kencCollisionBadge');
    if(!badge){
      const host=document.querySelector('.drawing-toolbar-actions');if(!host)return;
      badge=document.createElement('button');badge.type='button';badge.id='kencCollisionBadge';badge.className='drawing-action-btn kenc-collision-badge';badge.addEventListener('click',()=>showSummary(run()));host.appendChild(badge);
    }
    badge.classList.toggle('ok',r.ok);badge.classList.toggle('error',!r.ok);
    badge.textContent=r.ok?(r.warnings.length?`제작 가능 · 경고 ${r.warnings.length}`:'제작 가능'):`제작 불가 · 오류 ${r.errors.length}`;
    badge.title=r.issues.slice(0,8).map(x=>x.message).join('\n')||'충돌 및 이격거리 검사 정상';
  }

  function render(container,r){
    if(!container)return;
    const section=document.createElement('section');section.className='kenc-collision-section';
    section.innerHTML=`<div class="kenc-collision-summary ${r.ok?'ok':'error'}"><strong>${r.ok?'제작 가능':'제작 불가'}</strong><span>오류 ${r.errors.length} · 경고 ${r.warnings.length}</span></div>`;
    const list=document.createElement('div');list.className='kenc-collision-list';
    const items=r.issues.length?r.issues:[{kind:'ok',message:'객체 충돌, 절곡부 이격거리, 함체 영역 검사가 정상입니다.'}];
    items.slice(0,20).forEach(x=>{const row=document.createElement('div');row.className='kenc-collision-item '+x.kind;row.textContent=x.message;list.appendChild(row);});
    section.appendChild(list);container.appendChild(section);
  }
  function appendChecks(){
    const r=run();['drawingCheckResults','drawingReviewChecks'].forEach(id=>{const host=byId(id);if(host)render(host,r);});
  }
  function showSummary(r){
    const messages=r.issues.slice(0,12).map(x=>(x.kind==='error'?'오류: ':'경고: ')+x.message);
    alert(`${r.ok?'제작 가능':'제작 불가'}\n오류 ${r.errors.length} · 경고 ${r.warnings.length}${messages.length?'\n\n'+messages.join('\n'):''}`);
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>run(state(),{silent:true}),40);}
  function install(){
    byId('drawingRunCheckBtn')?.addEventListener('click',()=>setTimeout(appendChecks,0));
    byId('drawingReviewCheckBtn')?.addEventListener('click',()=>setTimeout(appendChecks,0));
    ['kenc:smart-snap','kenc:preview-invalidated','kenc:object-engine-ready','kenc:selection-changed'].forEach(n=>document.addEventListener(n,schedule));
    const svg=byId('drawingCanvas');if(svg){observer=new MutationObserver(m=>{if(!decorating&&m.some(x=>x.type==='childList'))schedule();});observer.observe(svg,{childList:true,subtree:true});}
    setTimeout(()=>run(),160);
  }
  window.KENC_COLLISION_ENGINE={version:VERSION,run,render,getResult:()=>lastResult,rules:RULES};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
