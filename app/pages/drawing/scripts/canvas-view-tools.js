(function(){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const svg=document.getElementById('drawingCanvas');
  const shell=document.querySelector('#drawingPanel .drawing-pro-workspace');
  if(!svg||!shell) return;
  const buttons={
    fit:shell.querySelector('[data-view-action="fit"]'),
    grid:shell.querySelector('[data-view-action="grid"]'),
    center:shell.querySelector('[data-view-action="center"]')
  };
  let gridOn=false, centerOn=false, scheduled=false;
  let observer=null;
  const make=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));return el;};
  function state(){return window.KENC_DRAWING_API?.getState?.()||null;}
  function applyCanvasState(){
    scheduled=false;
    observer?.disconnect();
    const rootBg=svg.querySelector(':scope > rect:first-of-type');
    if(rootBg) rootBg.setAttribute('fill','transparent');
    svg.querySelectorAll('[data-kenc-view-overlay]').forEach(n=>n.remove());
    if(centerOn){
      const st=state(), l=st?.layout;
      if(l&&Number.isFinite(l.x)&&Number.isFinite(l.y)){
        const g=make('g',{'data-kenc-view-overlay':'center','pointer-events':'none'});
        const cx=l.x+l.w/2, cy=l.y+l.h/2;
        g.append(
          make('line',{x1:cx,y1:l.y-18,x2:cx,y2:l.y+l.h+18,class:'kenc-center-line'}),
          make('line',{x1:l.x-18,y1:cy,x2:l.x+l.w+18,y2:cy,class:'kenc-center-line'}),
          make('circle',{cx,cy,r:5,class:'kenc-center-point'})
        );
        svg.appendChild(g);
      }
    }
    const wrap=svg.closest('.drawing-v85-canvas-wrap');
    wrap?.classList.toggle('kenc-grid-on',gridOn);
    wrap?.classList.toggle('kenc-center-on',centerOn);
    buttons.grid?.classList.toggle('active',gridOn);
    buttons.center?.classList.toggle('active',centerOn);
    observer?.observe(svg,{childList:true,subtree:true});
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(applyCanvasState);}
  observer=new MutationObserver(schedule);
  observer.observe(svg,{childList:true,subtree:true});
  document.addEventListener('click',e=>{
    const btn=e.target.closest('#drawingPanel [data-view-action]');
    if(!btn)return;
    const action=btn.dataset.viewAction;
    if(!['fit','grid','center'].includes(action))return;
    e.preventDefault();e.stopImmediatePropagation();
    if(action==='grid') gridOn=!gridOn;
    if(action==='center') centerOn=!centerOn;
    if(action==='fit') svg.setAttribute('viewBox','0 0 760 700');
    schedule();
  },true);
  buttons.grid?.classList.remove('active');
  buttons.center?.classList.remove('active');
  schedule();
  window.KENCCanvasView={refresh:schedule,setGrid:v=>{gridOn=!!v;schedule();},setCenter:v=>{centerOn=!!v;schedule();}};
})();
