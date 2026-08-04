(function(){
  'use strict';
  const VERSION='1.2.1';
  const $=id=>document.getElementById(id);
  const num=v=>Number(v)||0;
  const getState=()=>window.KENC_DRAWING_API?.getState?.()||null;
  const getDef=o=>window.KENC_OBJECT_ENGINE?.definition?.(o.type)||window.KENC_OBJECT_REGISTRY?.definition?.(o.type)||{};
  let lastResult=null,timer=0;

  const DEFAULT_RULES={
    vent:{process:['절곡','환기 가공'],edge:{top:30,left:25,right:25,bottom:25},recommended:{surface:['door','front','back','left','right','top','bottom']}},
    key:{process:['타공','조립'],edge:{top:30,left:30,right:30,bottom:30},recommended:{surface:['door','front']}},
    nameplate:{process:['부착'],edge:{top:15,left:15,right:15,bottom:15},recommended:{surface:['door','front','back']}},
    acrylicWindow:{process:['사각 타공','프레임 조립'],edge:{top:25,left:25,right:25,bottom:25},recommended:{surface:['door','front','back','left','right']}},
    doubleLock:{process:['타공','용접/조립'],edge:{top:15,left:15,right:15,bottom:15}},
    plate:{process:['내부 조립'],edge:{top:15,left:15,right:15,bottom:15},recommended:{surface:['inside']}},
    groundBar:{process:['타공','볼트 체결'],edge:{top:10,left:10,right:10,bottom:10},recommended:{surface:['left','right']}},
    cableHook:{process:['태그용접'],edge:{top:10,left:10,right:10,bottom:10},recommended:{surface:['left','right','inside']}},
    cut:{process:['타공'],edge:{top:12,left:12,right:12,bottom:12}},
    emboss:{process:['프레스'],edge:{top:15,left:15,right:15,bottom:15}},
    anchor:{process:['타공'],edge:{top:8,left:8,right:8,bottom:8}},
    cover:{process:['타공','나사 체결'],edge:{top:10,left:10,right:10,bottom:10}}
  };

  let RULES=JSON.parse(JSON.stringify(DEFAULT_RULES));
  function setRules(next){RULES=JSON.parse(JSON.stringify(next||DEFAULT_RULES));return RULES;}

  function plane(cab,surface){
    return window.KENC_OBJECT_ENGINE?.plane?.(surface,cab)||(
      surface==='left'||surface==='right'?{width:num(cab.depth),height:num(cab.height)}:
      surface==='top'||surface==='bottom'?{width:num(cab.width),height:num(cab.depth)}:{width:num(cab.width),height:num(cab.height)}
    );
  }
  function objectName(o){const d=getDef(o);return d.label||o.type||'객체';}
  function issue(kind,code,message,o,meta={}){return{kind,code,message,objectId:String(o?.sceneId||o?.uid||o?.id||''),type:o?.type||'',meta};}

  function inspectObject(cab,o){
    const out=[],rule=RULES[o.type]||{},p=plane(cab,o.surface),r={x:num(o.x),y:num(o.y),w:num(o.w),h:num(o.h)};
    const clear={left:r.x,top:r.y,right:p.width-(r.x+r.w),bottom:p.height-(r.y+r.h)};
    if(rule.recommended?.surface&&!rule.recommended.surface.includes(o.surface)){
      out.push(issue('error','INVALID_SURFACE',`${objectName(o)}는 ${rule.recommended.surface.join('·')} 면에만 배치할 수 있습니다.`,o,{surface:o.surface}));
    }
    Object.entries(rule.edge||{}).forEach(([side,required])=>{
      if(clear[side]<required)out.push(issue(clear[side]<0?'error':'warning','MANUFACTURING_EDGE',`${objectName(o)}의 ${side} 제작 여유가 ${required}mm 미만입니다.`,o,{side,required,actual:Math.round(clear[side]*10)/10}));
    });
    if(o.type==='plate'&&o.surface!=='inside')out.push(issue('error','PLATE_PARENT','속판은 함체 내부에 고정되어야 합니다.',o));
    if(o.type==='groundBar'&&!['left','right'].includes(o.surface))out.push(issue('error','GROUND_SIDE','접지는 좌측면 또는 우측면에만 적용합니다.',o));
    if(o.type==='doubleLock'&&String(o.variant||'').includes('cover')&&o.surface!=='top')out.push(issue('warning','COVER_LOCK_POSITION','카바용 이중시건은 상부면 중앙 배치를 권장합니다.',o));
    if(o.type==='cover'){
      const related=(cab.objects||[]).some(x=>x!==o&&x.surface===o.surface&&['cut','emboss'].includes(x.type)&&Math.abs((num(x.x)+num(x.w)/2)-(r.x+r.w/2))<Math.max(r.w,num(x.w))/2&&Math.abs((num(x.y)+num(x.h)/2)-(r.y+r.h/2))<Math.max(r.h,num(x.h))/2);
      if(!related)out.push(issue('info','COVER_WITHOUT_HOLE','타공덮개 아래에 연결된 타공 또는 엠보타공이 없습니다.',o));
    }
    return out;
  }

  function run(s=getState(),options={}){
    const issues=[];
    if(!s)issues.push({kind:'error',code:'NO_STATE',message:'도면 상태를 찾을 수 없습니다.',objectId:'',type:'',meta:{}});
    else (s.cabinets||[]).forEach(c=>(c.objects||[]).forEach(o=>issues.push(...inspectObject(c,o))));
    const collision=window.KENC_COLLISION_ENGINE?.run?.(s,{silent:true});
    if(collision?.issues)collision.issues.forEach(x=>issues.push({...x,source:'collision'}));
    const errors=issues.filter(x=>x.kind==='error'),warnings=issues.filter(x=>x.kind==='warning'),infos=issues.filter(x=>x.kind==='info');
    lastResult={version:VERSION,ok:errors.length===0,issues,errors,warnings,infos,timestamp:new Date().toISOString()};
    window.KENC_MANUFACTURING_RESULT=lastResult;
    updateBadge(lastResult);
    if(!options.silent)document.dispatchEvent(new CustomEvent('kenc:manufacturing-checked',{detail:lastResult}));
    return lastResult;
  }

  function updateBadge(r){
    let b=$('kencManufacturingBadge');
    if(!b){
      const host=document.querySelector('.drawing-toolbar-actions');if(!host)return;
      b=document.createElement('button');b.type='button';b.id='kencManufacturingBadge';b.className='drawing-action-btn kenc-manufacturing-badge';
      b.addEventListener('click',()=>showSummary(run()));host.appendChild(b);
    }
    b.classList.toggle('ok',r.ok);b.classList.toggle('error',!r.ok);
    b.textContent=r.ok?(r.warnings.length?`제작 규칙 · 경고 ${r.warnings.length}`:'제작 규칙 정상'):`제작 규칙 · 오류 ${r.errors.length}`;
  }

  function render(container,r=run(getState(),{silent:true})){
    if(!container)return;
    container.querySelectorAll('.kenc-manufacturing-section').forEach(x=>x.remove());
    const section=document.createElement('section');section.className='kenc-manufacturing-section';
    section.innerHTML=`<div class="kenc-manufacturing-summary ${r.ok?'ok':'error'}"><strong>${r.ok?'제작 규칙 통과':'제작 규칙 미통과'}</strong><span>오류 ${r.errors.length} · 경고 ${r.warnings.length} · 안내 ${r.infos.length}</span></div>`;
    const list=document.createElement('div');list.className='kenc-manufacturing-list';
    (r.issues.length?r.issues:[{kind:'ok',message:'현재 등록된 제작 규칙을 모두 통과했습니다.'}]).slice(0,30).forEach(x=>{const row=document.createElement('div');row.className='kenc-manufacturing-item '+x.kind;row.textContent=x.message;list.appendChild(row);});
    section.appendChild(list);container.appendChild(section);
  }

  function showSummary(r){
    const lines=r.issues.slice(0,15).map(x=>`${x.kind==='error'?'오류':x.kind==='warning'?'경고':'안내'}: ${x.message}`);
    alert(`${r.ok?'제작 규칙 통과':'제작 규칙 미통과'}\n오류 ${r.errors.length} · 경고 ${r.warnings.length} · 안내 ${r.infos.length}${lines.length?'\n\n'+lines.join('\n'):''}`);
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>run(getState(),{silent:true}),60);}
  function install(){
    $('drawingRunCheckBtn')?.addEventListener('click',()=>setTimeout(()=>render($('drawingCheckResults')),0));
    $('drawingReviewCheckBtn')?.addEventListener('click',()=>setTimeout(()=>render($('drawingReviewChecks')),0));
    ['kenc:preview-invalidated','kenc:smart-snap','kenc:collision-checked','kenc:object-engine-ready','kenc:manufacturing-settings-changed'].forEach(n=>document.addEventListener(n,schedule));
    setTimeout(()=>run(),220);
  }
  window.KENC_MANUFACTURING_RULES_ENGINE={version:VERSION,defaults:DEFAULT_RULES,get rules(){return RULES;},setRules,run,render,getResult:()=>lastResult};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
