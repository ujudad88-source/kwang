(function(){
  'use strict';
  const VERSION='1.2.1';
  const api=()=>window.KENC_DRAWING_API;
  const selected=()=>{const a=api();if(!a)return{};const s=a.getState(),c=a.getCurrentCabinet(),o=(c?.objects||[]).find(x=>x.id===s.selectedObjectId);return{s,c,o,a};};
  const center=(o,c)=>{o.x=Math.max(0,(c.width-o.w)/2);o.y=Math.max(0,(c.height-o.h)/2);};
  function recommendedPosition(o,c){
    const margin=30;
    const pos={x:o.x,y:o.y};
    switch(o.type){
      case 'vent': pos.x=(c.width-o.w)/2;pos.y=Math.max(margin,c.height*.18-o.h/2);break;
      case 'nameplate': pos.x=(c.width-o.w)/2;pos.y=margin;break;
      case 'key': pos.x=Math.max(margin,c.width-o.w-margin);pos.y=(c.height-o.h)/2;break;
      case 'acrylicWindow': pos.x=(c.width-o.w)/2;pos.y=(c.height-o.h)/2;break;
      case 'doubleLock': pos.x=(c.width-o.w)/2;pos.y=o.option==='카바용'?0:margin;break;
      case 'plate': pos.x=(c.width-o.w)/2;pos.y=(c.height-o.h)/2;break;
      case 'groundBar': pos.x=o.surface==='right'?Math.max(0,c.depth-o.w-margin):margin;pos.y=(c.height-o.h)/2;break;
      case 'cableHook': pos.x=Math.max(margin,(c.width-o.w)/2);pos.y=(c.height-o.h)/2;break;
      default: center(pos,c);
    }
    return pos;
  }
  function avoidOverlap(o,c){
    const others=(c.objects||[]).filter(x=>x!==o&&x.surface===o.surface);
    const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    let guard=0;
    while(others.some(x=>hit(o,x))&&guard++<30){o.y+=10;if(o.y+o.h>c.height){o.y=20;o.x+=10;}}
  }
  function applyRecommended(){const{x:o,c,a}= {x:selected().o,c:selected().c,a:selected().a};if(!o||!c)return;const p=recommendedPosition(o,c);o.x=Math.round(p.x);o.y=Math.round(p.y);avoidOverlap(o,c);a.renderAll();document.dispatchEvent(new CustomEvent('kenc:placement-assisted',{detail:{object:o}}));}
  function alignSurface(mode){const{c,a,s}=selected();if(!c)return;const objs=(c.objects||[]).filter(o=>o.surface===s.surface);if(!objs.length)return;
    if(mode==='centerX')objs.forEach(o=>o.x=Math.round((c.width-o.w)/2));
    if(mode==='centerY')objs.forEach(o=>o.y=Math.round((c.height-o.h)/2));
    if(mode==='distributeY'&&objs.length>2){const sorted=[...objs].sort((a,b)=>a.y-b.y),top=sorted[0].y,bottom=sorted.at(-1).y+sorted.at(-1).h,total=sorted.reduce((n,o)=>n+o.h,0),gap=Math.max(0,(bottom-top-total)/(sorted.length-1));let y=top;sorted.forEach(o=>{o.y=Math.round(y);y+=o.h+gap;});}
    a.renderAll();
  }
  function install(){const host=document.querySelector('.drawing-toolbar-actions');if(!host||document.getElementById('kencPlacementAssistBtn'))return;
    const sep=document.createElement('span');sep.className='drawing-toolbar-sep';sep.setAttribute('aria-hidden','true');host.prepend(sep);
    const b=document.createElement('button');b.type='button';b.id='kencPlacementAssistBtn';b.className='drawing-action-btn';b.textContent='권장 배치';b.title='선택 객체를 제작 권장 위치로 이동';b.addEventListener('click',applyRecommended);host.prepend(b);
    const bx=document.createElement('button');bx.type='button';bx.className='drawing-action-btn';bx.textContent='가로 중앙';bx.addEventListener('click',()=>alignSurface('centerX'));host.prepend(bx);
    const by=document.createElement('button');by.type='button';by.className='drawing-action-btn';by.textContent='세로 정렬';by.addEventListener('click',()=>alignSurface('distributeY'));host.prepend(by);
  }
  window.KENC_PLACEMENT_ASSISTANT={version:VERSION,recommendedPosition,applyRecommended,alignSurface};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
