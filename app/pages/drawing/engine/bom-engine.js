(function(){
  'use strict';
  const VERSION='1.2.1';
  const $=id=>document.getElementById(id);
  const getState=()=>window.KENC_DRAWING_API?.getState?.()||null;
  const getDef=o=>window.KENC_OBJECT_ENGINE?.definition?.(o.type)||window.KENC_OBJECT_REGISTRY?.definition?.(o.type)||{};
  const SURFACE={door:'문',front:'전면',back:'후면',left:'좌측면',right:'우측면',top:'상부면',bottom:'하부면',inside:'내부'};
  const PROCESS={vent:'절곡',key:'타공·조립',nameplate:'부착',acrylicWindow:'사각타공·조립',doubleLock:'타공·용접/조립',plate:'내부조립',groundBar:'볼트체결',cableHook:'태그용접',cut:'타공',emboss:'프레스',anchor:'타공',cover:'나사체결'};
  const VARIANT_LABELS={
    wide_louver:'와이드 절곡 루버',detach:'탈착키',push_button:'푸쉬버튼키',push_handle:'푸쉬핸들키',communication_100x30:'통신용 100×30',distribution_150x30:'분전반용 150×30',framed_clear:'투명아크릴창',exposed:'노출함용',cover_top_center:'카바용',pvc_perforated:'PVC속판',steel_plain:'철속판',bakelite_yellow:'빼끄판',copper_left:'동접지 좌',copper_right:'동접지 우',steel_left:'철접지 좌',steel_right:'철접지 우',left_tag_weld:'케이블걸이 좌',right_tag_weld:'케이블걸이 우',inside_horizontal_tag_weld:'케이블걸이 수평',round:'원형타공',square:'사각타공',round_knockout:'엠보 원형',square_knockout:'엠보 사각',anchor_14:'앙카구멍 Ø14',screw_6:'피스구멍 Ø6',four_screw:'타공덮개'};
  let last=null,timer=0;

  function label(o){return VARIANT_LABELS[o.variant]||o.label||getDef(o).label||o.type;}
  function build(s=getState()){
    const rows=[],cabs=s?.cabinets||[];
    cabs.forEach((cab,ci)=>(cab.objects||[]).forEach(o=>rows.push({cabinet:cab.name||cab.label||`함체 ${ci+1}`,type:o.type,label:label(o),variant:o.variant||'',surface:SURFACE[o.surface]||o.surface||'',process:PROCESS[o.type]||'조립',qty:1})));
    const map=new Map();
    rows.forEach(r=>{const key=[r.label,r.surface,r.process].join('|'),prev=map.get(key);if(prev)prev.qty++;else map.set(key,{...r});});
    const items=[...map.values()].sort((a,b)=>a.process.localeCompare(b.process,'ko')||a.label.localeCompare(b.label,'ko'));
    const processes={};items.forEach(x=>processes[x.process]=(processes[x.process]||0)+x.qty);
    last={version:VERSION,items,processes,total:rows.length,cabinetCount:cabs.length,timestamp:new Date().toISOString()};
    window.KENC_BOM_RESULT=last;return last;
  }

  function render(target=$('drawingBomList')){
    if(!target)return;const bom=build();target.innerHTML='';
    const summary=document.createElement('div');summary.className='kenc-bom-summary';summary.innerHTML=`<strong>객체 ${bom.total} EA</strong><span>함체 ${bom.cabinetCount}개 · 공정 ${Object.keys(bom.processes).length}종</span><button type="button" id="kencBomCsvBtn">CSV 저장</button>`;target.appendChild(summary);
    if(!bom.items.length){target.insertAdjacentHTML('beforeend','<div class="drawing-bom-row"><span>배치된 객체가 없습니다.</span><em>0 EA</em></div>');return;}
    bom.items.forEach(x=>{const row=document.createElement('div');row.className='drawing-bom-row kenc-bom-detail';row.innerHTML=`<div><strong>${x.label}</strong><small>${x.surface} · ${x.process}</small></div><em>${x.qty} EA</em>`;target.appendChild(row);});
    const process=document.createElement('div');process.className='kenc-process-summary';process.innerHTML='<strong>제작 공정 집계</strong>'+Object.entries(bom.processes).map(([k,v])=>`<span>${k}<em>${v} EA</em></span>`).join('');target.appendChild(process);
    $('kencBomCsvBtn')?.addEventListener('click',exportCsv);
  }
  function exportCsv(){
    const bom=last||build(),lines=[['품명','설치 위치','제작 공정','수량']];bom.items.forEach(x=>lines.push([x.label,x.surface,x.process,x.qty]));
    const csv='\ufeff'+lines.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`KENC_BOM_${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(render,80);}
  function install(){
    document.querySelectorAll('[data-review-tab="bom"]').forEach(b=>b.addEventListener('click',()=>setTimeout(render,0)));
    ['kenc:preview-invalidated','kenc:object-engine-ready','kenc:manufacturing-checked'].forEach(n=>document.addEventListener(n,schedule));
    setTimeout(render,300);
  }
  window.KENC_BOM_ENGINE={version:VERSION,build,render,exportCsv,getResult:()=>last};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
