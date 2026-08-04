(function(){
  'use strict';
  const VERSION='2.2.1';
  const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const face=v=>window.KENC_ATTACH_ENGINE?.canonicalFace?.(v)||String(v||'front').toLowerCase();
  const defs=()=>window.KENC_OBJECT_DEFINITIONS||[];
  const defOf=t=>defs().find(d=>d.id===t)||{};
  function clampObject(c,o){
    const d=defOf(o.type), f=face(o.surface||d.mounts?.[0]||'front');
    o.surface=f;
    const plane=window.KENC_ATTACH_ENGINE?.dimensions?.(c,f)||{width:num(c.width,600),height:num(c.height,700)};
    o.w=Math.max(1,num(o.w,d.defaultSize?.w||20)); o.h=Math.max(1,num(o.h,d.defaultSize?.h||20));
    o.x=Math.max(0,Math.min(num(o.x),Math.max(0,plane.width-o.w)));
    o.y=Math.max(0,Math.min(num(o.y),Math.max(0,plane.height-o.h)));
    o.rot=((num(o.rot)%360)+360)%360;
    o.parent=window.KENC_ATTACH_ENGINE?.resolveParent?.(o,d)||o.parent||'body';
    o.mirror=window.KENC_ATTACH_ENGINE?.resolveMirror?.(o,d)||false;
    o.depthOffset=num(o.depthOffset,0);
    // Door-mounted external objects remain children of the door even when legacy files call the face front.
    if((f==='front'||f==='door')&&(d.doorBound||['vent','key','nameplate','acrylicWindow','cover','doubleLock'].includes(o.type)))o.parent='door';
    if(o.type==='plate'){o.surface='inside';o.parent='inside';o.mirror=false;}
    if(o.type==='groundBar'){
      if(!['left','right'].includes(o.surface))o.surface='left';
      const copper=String(o.option||o.variant||'').includes('동')||String(o.variant||'').includes('copper');
      const right=o.surface==='right';
      o.option=`${copper?'동접지':'철접지'} ${right?'우(왼쪽 돌출)':'좌(오른쪽 돌출)'}`;
      o.variant=`${copper?'copper':'steel'}_${right?'right':'left'}`;o.mirror=right;o.parent='utility';
    }
    if(o.type==='cableHook'){
      if(!['left','right','inside'].includes(o.surface))o.surface='left';
      const right=o.surface==='right', inside=o.surface==='inside';
      o.option=inside?'내부 수평':(right?'오른쪽':'왼쪽');
      o.variant=inside?'inside_horizontal':`${right?'right':'left'}_tag_weld`;o.mirror=right;o.parent='utility';
    }
    o.meta=Object.assign({},o.meta,{placementNormalizedBy:VERSION});
    return o;
  }
  function normalizeCabinet(c){(c.objects||[]).forEach(o=>clampObject(c,o));return c;}
  function normalizeState(s){(s?.cabinets||[]).forEach(normalizeCabinet);return s;}
  function audit(s){const issues=[];(s?.cabinets||[]).forEach((c,ci)=>(c.objects||[]).forEach((o,oi)=>{
    const d=defOf(o.type),f=face(o.surface),pl=window.KENC_ATTACH_ENGINE?.normalizePlacement?.(c,o,d);
    if(d.mounts?.length&&!d.mounts.map(face).includes(f))issues.push({level:'error',cabinet:ci,object:oi,message:`${o.type}: 지원하지 않는 부착면 ${f}`});
    if(pl&&pl.parent!==o.parent)issues.push({level:'warning',cabinet:ci,object:oi,message:`${o.type}: 부모 그룹 ${o.parent} → ${pl.parent}`});
  }));return{version:VERSION,ok:!issues.some(x=>x.level==='error'),issues};}
  function run(){const s=window.KENC_DRAWING_API?.getState?.();if(!s)return;normalizeState(s);window.KENC_DRAWING_API?.renderAll?.();}
  document.addEventListener('DOMContentLoaded',()=>setTimeout(run,120));
  document.addEventListener('kenc:project-loaded',()=>setTimeout(run,0));
  window.KENC_ORIENTATION_CORRECTION={version:VERSION,clampObject,normalizeCabinet,normalizeState,audit,run};
})();
