(function(){
  "use strict";
  const NS="http://www.w3.org/2000/svg";
  const $=(s,r=document)=>r.querySelector(s);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const svgEl=(tag,attrs={},text="")=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(text)e.textContent=text;return e;};
  let svg=null, dragging=null, pointers=new Map(), pinch=null;
  const defaults=()=>({yaw:-35,pitch:-18,zoom:1,panX:0,panY:0});
  function state(){return window.KENC_DRAWING_API?.getState?.();}
  function view(){const s=state(); if(!s)return defaults(); return s.live3dView||(s.live3dView=defaults());}
  function rotate(p,v){
    const y=v.yaw*Math.PI/180, x=v.pitch*Math.PI/180;
    const x1=p.x*Math.cos(y)+p.z*Math.sin(y), z1=-p.x*Math.sin(y)+p.z*Math.cos(y);
    return {x:x1,y:p.y*Math.cos(x)-z1*Math.sin(x),z:p.y*Math.sin(x)+z1*Math.cos(x)};
  }
  function project(p,v,scale){const q=rotate(p,v);return{x:210+(v.panX||0)+q.x*scale*v.zoom,y:270+(v.panY||0)+q.y*scale*v.zoom,z:q.z};}
  function cabinetGeometry(c,yOffset,totalH){
    const w=c.width,h=c.height,d=c.depth, y0=yOffset-totalH/2;
    const pts=[[-w/2,y0,-d/2],[w/2,y0,-d/2],[w/2,y0+h,-d/2],[-w/2,y0+h,-d/2],[-w/2,y0,d/2],[w/2,y0,d/2],[w/2,y0+h,d/2],[-w/2,y0+h,d/2]].map(([x,y,z])=>({x,y,z}));
    return {pts,edges:[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]};
  }
  function render(ctx){
    svg=ctx.svg; const s=ctx.state, v=s.live3dView||(s.live3dView=defaults());
    svg.innerHTML=""; svg.setAttribute("viewBox","0 0 420 560"); svg.classList.add("kenc-interactive-3d");
    svg.appendChild(svgEl("rect",{x:0,y:0,width:420,height:560,class:"kenc-3d-bg"}));
    const cabinets=s.mode3d==="stack"?s.cabinets:[ctx.currentCabinet];
    const totalH=cabinets.reduce((a,c)=>a+c.height,0), maxW=Math.max(...cabinets.map(c=>c.width)), maxD=Math.max(...cabinets.map(c=>c.depth));
    const base=Math.min(300/Math.max(maxW,1),370/Math.max(totalH,1),150/Math.max(maxD,1));
    let off=0; const all=[];
    cabinets.forEach((c,i)=>{const g=cabinetGeometry(c,off,totalH);off+=c.height;const projected=g.pts.map(p=>project(p,v,base));all.push({c,g,projected,i});});
    // rear lines first for depth cue
    all.forEach(({g,projected,i})=>g.edges.forEach(([a,b],ei)=>{const pa=projected[a],pb=projected[b];const line=svgEl("line",{x1:pa.x,y1:pa.y,x2:pb.x,y2:pb.y,class:ei<4?"kenc-3d-edge rear":"kenc-3d-edge"});svg.appendChild(line);}));
    // center crosshair and labels
    svg.appendChild(svgEl("circle",{cx:210+(v.panX||0),cy:270+(v.panY||0),r:2.5,class:"kenc-3d-origin"}));
    const label=s.mode3d==="stack"?`적층 ${cabinets.length}EA · 전체 높이 ${totalH} mm`:`${ctx.currentCabinet.width} × ${ctx.currentCabinet.height} × ${ctx.currentCabinet.depth} mm`;
    svg.appendChild(svgEl("text",{x:210,y:535,"text-anchor":"middle",class:"kenc-3d-label"},label));
    svg.dataset.zoom=Math.round(v.zoom*100)+"%";
  }
  function redraw(){const api=window.KENC_DRAWING_API;if(api)api.render3d();}
  function setPreset(name){const v=view(); if(name==="front")Object.assign(v,{yaw:0,pitch:0,zoom:1,panX:0,panY:0});else if(name==="iso")Object.assign(v,{yaw:-35,pitch:-18,zoom:1,panX:0,panY:0});else Object.assign(v,defaults()); redraw();syncButtons(name);}
  function syncButtons(name){document.querySelectorAll('[data-3d-action]').forEach(b=>b.classList.toggle('active',b.dataset['3dAction']===name));}
  function bind(){
    svg=document.getElementById("drawing3dCanvas"); if(!svg||svg.dataset.kencInteractiveBound)return; svg.dataset.kencInteractiveBound="1";
    const panel=svg.closest('.drawing-3d-panel');
    panel?.querySelectorAll('[data-3d-action]').forEach(btn=>btn.addEventListener('click',()=>{const a=btn.dataset['3dAction'];if(a==='front'||a==='iso'||a==='fit'||a==='reset')setPreset(a==='fit'?'reset':a);}));
    svg.addEventListener('pointerdown',e=>{svg.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const v=view();dragging={x:e.clientX,y:e.clientY,yaw:v.yaw,pitch:v.pitch,panX:v.panX||0,panY:v.panY||0,pan:e.button===1||e.button===2||e.shiftKey};svg.classList.add('is-interacting');e.preventDefault();});
    svg.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!dragging)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const v=view();if(pointers.size>=2){const pts=[...pointers.values()];const dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);const cx=(pts[0].x+pts[1].x)/2,cy=(pts[0].y+pts[1].y)/2;if(!pinch)pinch={dist,zoom:v.zoom,cx,cy,panX:v.panX||0,panY:v.panY||0};v.zoom=clamp(pinch.zoom*dist/Math.max(pinch.dist,1),.25,6);v.panX=pinch.panX+(cx-pinch.cx);v.panY=pinch.panY+(cy-pinch.cy);}else if(dragging.pan){v.panX=dragging.panX+(e.clientX-dragging.x);v.panY=dragging.panY+(e.clientY-dragging.y);}else{v.yaw=dragging.yaw+(e.clientX-dragging.x)*.55;v.pitch=clamp(dragging.pitch+(e.clientY-dragging.y)*.45,-89,89);}redraw();e.preventDefault();});
    const end=e=>{pointers.delete(e.pointerId);if(!pointers.size){dragging=null;pinch=null;svg.classList.remove('is-interacting');}};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);svg.addEventListener('contextmenu',e=>e.preventDefault());
    svg.addEventListener('wheel',e=>{const v=view();if(e.ctrlKey||e.metaKey||!e.shiftKey){v.zoom=clamp(v.zoom*Math.exp(-e.deltaY*.0015),.25,6);}else{v.panX-=e.deltaX*.35;v.panY-=e.deltaY*.35;}redraw();e.preventDefault();},{passive:false});
    svg.addEventListener('dblclick',()=>setPreset('reset'));
    const note=panel?.querySelector('.drawing-3d-note');if(note)note.textContent='왼쪽 드래그: 자유 회전 · 휠: 확대/축소 · 휠/오른쪽 드래그: 이동 · 더블클릭: 시점 초기화';
    redraw();
  }
  window.KENC3DViewer={render,reset:()=>setPreset('reset')};
  if(window.KENC_DRAWING_API)bind();else document.addEventListener('kenc:drawing-api-ready',bind,{once:true});
  document.addEventListener('DOMContentLoaded',bind,{once:true});
})();
