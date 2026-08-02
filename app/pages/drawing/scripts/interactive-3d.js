(function(){
  "use strict";
  const NS="http://www.w3.org/2000/svg";
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const svgEl=(tag,attrs={},text="")=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(text)e.textContent=text;return e;};
  let svg=null, dragging=null, pointers=new Map(), pinch=null;
  const defaults=()=>({yaw:-35,pitch:-18,zoom:1,panX:0,panY:0});
  function state(){return window.KENC_DRAWING_API?.getState?.();}
  function view(){const s=state();if(!s)return defaults();return s.live3dView||(s.live3dView=defaults());}
  function rotate(p,v){
    const yaw=v.yaw*Math.PI/180,pitch=v.pitch*Math.PI/180;
    const x1=p.x*Math.cos(yaw)+p.z*Math.sin(yaw);
    const z1=-p.x*Math.sin(yaw)+p.z*Math.cos(yaw);
    return{x:x1,y:p.y*Math.cos(pitch)-z1*Math.sin(pitch),z:p.y*Math.sin(pitch)+z1*Math.cos(pitch)};
  }
  function project(p,v,scale){const q=rotate(p,v);return{x:210+(v.panX||0)+q.x*scale*v.zoom,y:270+(v.panY||0)+q.y*scale*v.zoom,z:q.z};}
  function cabinetGeometry(c,yOffset,totalH){
    const w=c.width,h=c.height,d=c.depth,y0=yOffset-totalH/2;
    const pts=[[-w/2,y0,-d/2],[w/2,y0,-d/2],[w/2,y0+h,-d/2],[-w/2,y0+h,-d/2],[-w/2,y0,d/2],[w/2,y0,d/2],[w/2,y0+h,d/2],[-w/2,y0+h,d/2]].map(([x,y,z])=>({x,y,z}));
    return{pts,y0,edges:[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]};
  }
  function faceBasis(c,y0,surface){
    const w=c.width,h=c.height,d=c.depth;
    const map={
      front:{origin:{x:-w/2,y:y0,z:-d/2},u:{x:1,y:0,z:0},v:{x:0,y:1,z:0},opacity:1},
      back:{origin:{x:-w/2,y:y0,z:d/2},u:{x:1,y:0,z:0},v:{x:0,y:1,z:0},opacity:.58},
      inside:{origin:{x:-w/2,y:y0,z:-d/2+d*.92},u:{x:1,y:0,z:0},v:{x:0,y:1,z:0},opacity:.96,mounted:true},
      left:{origin:{x:-w/2,y:y0,z:-d/2},u:{x:0,y:0,z:1},v:{x:0,y:1,z:0},opacity:.8},
      right:{origin:{x:w/2,y:y0,z:-d/2},u:{x:0,y:0,z:1},v:{x:0,y:1,z:0},opacity:.92},
      top:{origin:{x:-w/2,y:y0,z:-d/2},u:{x:1,y:0,z:0},v:{x:0,y:0,z:1},opacity:.9},
      bottom:{origin:{x:-w/2,y:y0+h,z:-d/2},u:{x:1,y:0,z:0},v:{x:0,y:0,z:1},opacity:.84}
    };
    return map[surface]||map.front;
  }
  function plus(a,b,m=1){return{x:a.x+b.x*m,y:a.y+b.y*m,z:a.z+b.z*m};}
  function renderObjects(root,c,y0,v,scale){
    const draw=window.KENC_DRAWING_API?.drawObjectShape;
    if(typeof draw!=="function")return;
    const order=["back","inside","left","right","top","bottom","front"];
    order.forEach(surface=>{
      const f=faceBasis(c,y0,surface);
      const po=project(f.origin,v,scale),pu=project(plus(f.origin,f.u),v,scale),pv=project(plus(f.origin,f.v),v,scale);
      const a=pu.x-po.x,b=pu.y-po.y,cc=pv.x-po.x,d=pv.y-po.y;
      (c.objects||[]).filter(o=>o.surface===surface).forEach(o=>{
        const outer=svgEl("g",{transform:`matrix(${a} ${b} ${cc} ${d} ${po.x} ${po.y})`,opacity:f.opacity,"data-kenc-3d-object":o.id});
        const inner=svgEl("g",{transform:`rotate(${o.rot||0} ${o.x+o.w/2} ${o.y+o.h/2})`});
        draw(inner,o,o.x,o.y,o.w,o.h,true);
        if(f.mounted)inner.setAttribute("filter","drop-shadow(2px 2px 1.4px rgba(15,23,42,.48))");
        outer.appendChild(inner);root.appendChild(outer);
      });
    });
  }
  function render(ctx){
    svg=ctx.svg;const s=ctx.state,v=s.live3dView||(s.live3dView=defaults());
    svg.innerHTML="";svg.setAttribute("viewBox","0 0 420 560");svg.classList.add("kenc-interactive-3d");
    svg.appendChild(svgEl("rect",{x:0,y:0,width:420,height:560,class:"kenc-3d-bg"}));
    const cabinets=s.mode3d==="stack"?s.cabinets:[ctx.currentCabinet];
    const totalH=cabinets.reduce((a,c)=>a+c.height,0),maxW=Math.max(...cabinets.map(c=>c.width)),maxD=Math.max(...cabinets.map(c=>c.depth));
    const base=Math.min(300/Math.max(maxW,1),370/Math.max(totalH,1),150/Math.max(maxD,1));
    let off=0;const all=[];
    cabinets.forEach((c,i)=>{const g=cabinetGeometry(c,off,totalH);off+=c.height;all.push({c,g,projected:g.pts.map(p=>project(p,v,base)),i});});
    all.forEach(({g,projected})=>g.edges.forEach(([a,b])=>svg.appendChild(svgEl("line",{x1:projected[a].x,y1:projected[a].y,x2:projected[b].x,y2:projected[b].y,class:"kenc-3d-edge"}))));
    all.forEach(({c,g})=>renderObjects(svg,c,g.y0,v,base));
    svg.appendChild(svgEl("circle",{cx:210+(v.panX||0),cy:270+(v.panY||0),r:2.5,class:"kenc-3d-origin"}));
    const label=s.mode3d==="stack"?`적층 ${cabinets.length}EA · 전체 높이 ${totalH} mm`:`${ctx.currentCabinet.width} × ${ctx.currentCabinet.height} × ${ctx.currentCabinet.depth} mm`;
    svg.appendChild(svgEl("text",{x:210,y:535,"text-anchor":"middle",class:"kenc-3d-label"},label));
    svg.dataset.zoom=Math.round(v.zoom*100)+"%";
  }
  function redraw(){window.KENC_DRAWING_API?.render3d?.();}
  function setPreset(name){
    const v=view();
    if(name==="front")Object.assign(v,{yaw:0,pitch:0,zoom:1,panX:0,panY:0});
    else Object.assign(v,defaults());
    redraw();syncButtons(name==="front"?"front":"reset");
  }
  function syncButtons(name){document.querySelectorAll('[data-3d-action]').forEach(b=>b.classList.toggle('active',b.dataset['3dAction']===name));}
  function bind(){
    svg=document.getElementById("drawing3dCanvas");if(!svg||svg.dataset.kencInteractiveBound)return;svg.dataset.kencInteractiveBound="1";
    const panel=svg.closest('.drawing-3d-panel');
    document.addEventListener('click',e=>{const btn=e.target.closest('#drawingPanel [data-3d-action]');if(!btn)return;const a=btn.dataset['3dAction'];if(!['front','iso','fit','reset'].includes(a))return;e.preventDefault();e.stopImmediatePropagation();setPreset(a==='front'?'front':'reset');},true);
    svg.addEventListener('pointerdown',e=>{svg.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const v=view();dragging={x:e.clientX,y:e.clientY,yaw:v.yaw,pitch:v.pitch,panX:v.panX||0,panY:v.panY||0,pan:e.button===1||e.button===2||e.shiftKey};svg.classList.add('is-interacting');e.preventDefault();});
    svg.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!dragging)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const v=view();if(pointers.size>=2){const pts=[...pointers.values()],dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),cx=(pts[0].x+pts[1].x)/2,cy=(pts[0].y+pts[1].y)/2;if(!pinch)pinch={dist,zoom:v.zoom,cx,cy,panX:v.panX||0,panY:v.panY||0};v.zoom=clamp(pinch.zoom*dist/Math.max(pinch.dist,1),.25,6);v.panX=pinch.panX+(cx-pinch.cx);v.panY=pinch.panY+(cy-pinch.cy);}else if(dragging.pan){v.panX=dragging.panX+(e.clientX-dragging.x);v.panY=dragging.panY+(e.clientY-dragging.y);}else{v.yaw=dragging.yaw+(e.clientX-dragging.x)*.55;v.pitch=clamp(dragging.pitch+(e.clientY-dragging.y)*.45,-89,89);}redraw();e.preventDefault();});
    const end=e=>{pointers.delete(e.pointerId);if(!pointers.size){dragging=null;pinch=null;svg.classList.remove('is-interacting');}};
    svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);svg.addEventListener('contextmenu',e=>e.preventDefault());
    svg.addEventListener('wheel',e=>{const v=view();v.zoom=clamp(v.zoom*Math.exp(-e.deltaY*.0015),.25,6);redraw();e.preventDefault();},{passive:false});
    svg.addEventListener('dblclick',()=>setPreset('reset'));
    const note=panel?.querySelector('.drawing-3d-note');if(note)note.textContent='왼쪽 드래그: 자유 회전 · 휠: 확대/축소 · 휠/오른쪽 드래그: 이동 · 더블클릭: 시점 초기화';
    redraw();
  }
  window.KENC3DViewer={render,reset:()=>setPreset('reset')};
  if(window.KENC_DRAWING_API)bind();else document.addEventListener('kenc:drawing-api-ready',bind,{once:true});
  document.addEventListener('DOMContentLoaded',bind,{once:true});
})();
