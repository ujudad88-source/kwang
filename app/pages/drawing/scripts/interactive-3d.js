(function(){
  "use strict";
  const NS="http://www.w3.org/2000/svg";
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const svgEl=(tag,attrs={},text="")=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(text)e.textContent=text;return e;};
  const add=(a,b,m=1)=>({x:a.x+b.x*m,y:a.y+b.y*m,z:a.z+b.z*m});
  const avg=(arr,key)=>arr.reduce((s,p)=>s+p[key],0)/Math.max(arr.length,1);
  let svg=null,dragging=null,pointers=new Map(),pinch=null;
  const defaults=()=>({yaw:-35,pitch:-18,zoom:1,panX:0,panY:0,displayMode:"exterior"});
  function state(){return window.KENC_DRAWING_API?.getState?.();}
  function view(){const s=state();if(!s)return defaults();return s.live3dView||(s.live3dView=defaults());}
  function normalizeView(v){if(!v.displayMode)v.displayMode="exterior";return v;}
  function objectRole(o,surface){
    if(surface==="inside" || o.type==="plate") return "internal";
    if(o.type==="cut" || o.type==="emboss" || o.type==="anchor") return "cutout";
    if(o.type==="groundBar" || o.type==="cableHook") return "utility";
    return "external";
  }
  function roleColor(role){return role==="internal"?"#d9e2ec":role==="cutout"?"#d9e2ec":role==="utility"?"#d9e2ec":"#d9e2ec";}
  function rotate(p,v){
    const yaw=v.yaw*Math.PI/180,pitch=v.pitch*Math.PI/180;
    const x1=p.x*Math.cos(yaw)+p.z*Math.sin(yaw);
    const z1=-p.x*Math.sin(yaw)+p.z*Math.cos(yaw);
    return{x:x1,y:p.y*Math.cos(pitch)-z1*Math.sin(pitch),z:p.y*Math.sin(pitch)+z1*Math.cos(pitch)};
  }
  function project(p,v,scale){const q=rotate(p,v);return{x:210+(v.panX||0)+q.x*scale*v.zoom,y:270+(v.panY||0)+q.y*scale*v.zoom,z:q.z};}
  function cabinetGeometry(c,yOffset,totalH){
    const w=+c.width||1,h=+c.height||1,d=+c.depth||1,y0=yOffset-totalH/2;
    const pts=[[-w/2,y0,-d/2],[w/2,y0,-d/2],[w/2,y0+h,-d/2],[-w/2,y0+h,-d/2],[-w/2,y0,d/2],[w/2,y0,d/2],[w/2,y0+h,d/2],[-w/2,y0+h,d/2]].map(([x,y,z])=>({x,y,z}));
    return{pts,y0,w,h,d,edges:[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],faces:[
      {name:"back",idx:[0,1,2,3]},{name:"front",idx:[4,5,6,7]},{name:"left",idx:[0,4,7,3]},
      {name:"right",idx:[1,5,6,2]},{name:"top",idx:[0,1,5,4]},{name:"bottom",idx:[3,2,6,7]}
    ]};
  }
  function doorBasis(c,y0,angleDeg=-82,explode=0){
    const w=+c.width,h=+c.height,d=+c.depth,th=angleDeg*Math.PI/180;
    const hinge={x:-w/2-explode,y:y0,z:d/2+explode*.18};
    return{origin:hinge,u:{x:Math.cos(th),y:0,z:-Math.sin(th)},v:{x:0,y:1,z:0},normal:{x:Math.sin(th),y:0,z:Math.cos(th)}};
  }
  function faceBasis(c,y0,surface,mode){
    const w=+c.width,h=+c.height,d=+c.depth,eps=1.2;
    if(surface==="front" && (mode==="open"||mode==="exploded")) return doorBasis(c,y0,mode==="open"?-82:-8,mode==="exploded"?w*.52:0);
    const internalSetback=Math.min(Math.max(18,d*.20),Math.max(22,d*.34));
    const map={
      front:{origin:{x:-w/2,y:y0,z:d/2+eps+3},u:{x:1,y:0,z:0},v:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}},
      back:{origin:{x:w/2,y:y0,z:-d/2-eps},u:{x:-1,y:0,z:0},v:{x:0,y:1,z:0},normal:{x:0,y:0,z:-1}},
      inside:{origin:{x:-w/2,y:y0,z:-d/2+internalSetback},u:{x:1,y:0,z:0},v:{x:0,y:1,z:0},normal:{x:0,y:0,z:1},mountDepth:internalSetback},
      left:{origin:{x:-w/2-eps,y:y0,z:d/2},u:{x:0,y:0,z:-1},v:{x:0,y:1,z:0},normal:{x:-1,y:0,z:0}},
      right:{origin:{x:w/2+eps,y:y0,z:-d/2},u:{x:0,y:0,z:1},v:{x:0,y:1,z:0},normal:{x:1,y:0,z:0}},
      top:{origin:{x:-w/2,y:y0-eps,z:-d/2},u:{x:1,y:0,z:0},v:{x:0,y:0,z:1},normal:{x:0,y:-1,z:0}},
      bottom:{origin:{x:-w/2,y:y0+h+eps,z:d/2},u:{x:1,y:0,z:0},v:{x:0,y:0,z:-1},normal:{x:0,y:1,z:0}}
    };
    return map[surface]||map.front;
  }
  function renderObjectGroup(root,c,y0,v,scale,mode){
    const draw=window.KENC_DRAWING_API?.drawObjectShape;if(typeof draw!=="function")return;
    const visible=mode==="exterior"?["front","back","left","right","top","bottom"]:["inside","back","left","right","top","bottom","front"];
    const entries=[];
    visible.forEach(surface=>{
      const f=faceBasis(c,y0,surface,mode),po=project(f.origin,v,scale),pu=project(add(f.origin,f.u),v,scale),pv=project(add(f.origin,f.v),v,scale);
      const a=pu.x-po.x,b=pu.y-po.y,cc=pv.x-po.x,d=pv.y-po.y;
      (c.objects||[]).filter(o=>(o.surface||"front")===surface).forEach(o=>{
        const center3=add(add(f.origin,f.u,(+o.x||0)+(+o.w||0)/2),f.v,(+o.y||0)+(+o.h||0)/2);
        entries.push({surface,o,f,a,b,cc,d,po,role:objectRole(o,surface),depth:rotate(center3,v).z});
      });
    });
    entries.sort((x,y)=>x.depth-y.depth).forEach(({surface,o,f,a,b,cc,d,po,role})=>{
      const opacity=1,color=roleColor(role);
      const outer=svgEl("g",{transform:`matrix(${a} ${b} ${cc} ${d} ${po.x} ${po.y})`,opacity,class:`kenc-3d-object kenc-object-${surface} kenc-role-${role}`,"data-kenc-3d-object":o.id||"","data-surface":surface,"data-role":role,"style":`--kenc-object-color:${color}`});
      const ox=+o.x||0,oy=+o.y||0,ow=Math.max(+o.w||10,10),oh=Math.max(+o.h||10,10);
      const pad=Math.max(4,Math.min(12,Math.min(ow,oh)*.10));
      if(role==="internal"){
        const depth=Math.max(10,Math.min(28,f.mountDepth||18));
        const corners=[[ox,oy],[ox+ow,oy],[ox+ow,oy+oh],[ox,oy+oh]];
        corners.forEach(([cx,cy])=>{
          const base=add(add(f.origin,f.u,cx),f.v,cy),back=add(base,f.normal,-depth);
          const p1=project(back,v,scale),p2=project(base,v,scale);
          root.appendChild(svgEl("line",{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,class:"kenc-3d-mount-standoff",style:`--kenc-object-color:${color}`}));
          root.appendChild(svgEl("circle",{cx:p2.x,cy:p2.y,r:2.2,class:"kenc-3d-mount-point",style:`--kenc-object-color:${color}`}));
        });
      }
      outer.appendChild(svgEl("rect",{x:ox-pad,y:oy-pad,width:ow+pad*2,height:oh+pad*2,rx:Math.min(8,pad),class:"kenc-3d-object-halo"}));
      if(role==="internal") outer.appendChild(svgEl("rect",{x:ox,y:oy,width:ow,height:oh,rx:2,class:"kenc-3d-internal-panel-fill"}));
      const inner=svgEl("g",{transform:`rotate(${+o.rot||0} ${ox+ow/2} ${oy+oh/2})`,class:"kenc-3d-object-shape"});
      draw(inner,o,ox,oy,ow,oh,true);
      inner.querySelectorAll("*").forEach(el=>{if(el.hasAttribute("stroke-dasharray"))el.removeAttribute("stroke-dasharray");el.classList.add("kenc-3d-object-part");});
      outer.appendChild(inner);root.appendChild(outer);
    });
  }
  function polyPoints(points){return points.map(p=>`${p.x},${p.y}`).join(" ");}
  function renderCabinet(root,c,g,v,scale,mode,index){
    const projected=g.pts.map(p=>project(p,v,scale));
    const faceOpacity=mode==="xray"?.12:(mode==="section"?.18:.30);
    const faces=g.faces.filter(f=>!(mode==="section"&&f.name==="front") && !((mode==="open"||mode==="exploded")&&f.name==="front"));
    const sorted=faces.map(f=>({f,p:f.idx.map(i=>projected[i]),z:avg(f.idx.map(i=>rotate(g.pts[i],v)),"z")})).sort((a,b)=>a.z-b.z);
    sorted.forEach(({f,p})=>root.appendChild(svgEl("polygon",{points:polyPoints(p),class:`kenc-3d-face kenc-face-${f.name}`,"data-mode":mode,opacity:faceOpacity})));
    g.edges.forEach(([a,b])=>root.appendChild(svgEl("line",{x1:projected[a].x,y1:projected[a].y,x2:projected[b].x,y2:projected[b].y,class:"kenc-3d-edge"})));
    if(mode==="open"||mode==="exploded"){
      const db=doorBasis(c,g.y0,mode==="open"?-82:-8,mode==="exploded"?g.w*.52:0);
      const p0=project(db.origin,v,scale),p1=project(add(db.origin,db.u,g.w),v,scale),p2=project(add(add(db.origin,db.u,g.w),db.v,g.h),v,scale),p3=project(add(db.origin,db.v,g.h),v,scale);
      root.appendChild(svgEl("polygon",{points:polyPoints([p0,p1,p2,p3]),class:"kenc-3d-door",opacity:mode==="exploded"?.22:.34}));
      [[p0,p1],[p1,p2],[p2,p3],[p3,p0]].forEach(([a,b])=>root.appendChild(svgEl("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:"kenc-3d-edge kenc-door-edge"})));
    }
    if(mode==="exploded"){
      const rearShift={x:g.w*.24,y:0,z:-Math.max(g.d*1.65,g.w*.18)};
      const rp=[0,1,2,3].map(i=>project(add(g.pts[i],rearShift),v,scale));
      root.appendChild(svgEl("polygon",{points:polyPoints(rp),class:"kenc-3d-exploded-rear",opacity:.20}));
      [[0,1],[1,2],[2,3],[3,0]].forEach(([a,b])=>root.appendChild(svgEl("line",{x1:rp[a].x,y1:rp[a].y,x2:rp[b].x,y2:rp[b].y,class:"kenc-3d-edge kenc-exploded-edge"})));
      [0,1,2,3].forEach(i=>{const baseP=project(g.pts[i],v,scale);root.appendChild(svgEl("line",{x1:baseP.x,y1:baseP.y,x2:rp[i].x,y2:rp[i].y,class:"kenc-3d-explode-guide"}));});
      const db=doorBasis(c,g.y0,-8,g.w*.52);
      const dp=[project(db.origin,v,scale),project(add(db.origin,db.u,g.w),v,scale),project(add(add(db.origin,db.u,g.w),db.v,g.h),v,scale),project(add(db.origin,db.v,g.h),v,scale)];
      [0,1,2,3].forEach((i)=>{const source=project(g.pts[[4,5,6,7][i]],v,scale);root.appendChild(svgEl("line",{x1:source.x,y1:source.y,x2:dp[i].x,y2:dp[i].y,class:"kenc-3d-explode-guide"}));});
    }
    renderObjectGroup(root,c,g.y0,v,scale,mode);
  }
  function render(ctx){
    svg=ctx.svg;const s=ctx.state,v=normalizeView(s.live3dView||(s.live3dView=defaults()));
    svg.innerHTML="";svg.setAttribute("viewBox","0 0 420 560");svg.classList.add("kenc-interactive-3d");svg.dataset.displayMode=v.displayMode;
    svg.appendChild(svgEl("rect",{x:0,y:0,width:420,height:560,class:"kenc-3d-bg"}));
    const cabinets=s.mode3d==="stack"?s.cabinets:[ctx.currentCabinet];
    const safeCabinets=(cabinets||[]).filter(Boolean);if(!safeCabinets.length)return;
    const totalH=safeCabinets.reduce((a,c)=>a+(+c.height||0),0),maxW=Math.max(...safeCabinets.map(c=>+c.width||1)),maxD=Math.max(...safeCabinets.map(c=>+c.depth||1));
    const base=Math.min(300/Math.max(maxW,1),370/Math.max(totalH,1),150/Math.max(maxD,1));
    let off=0;safeCabinets.forEach((c,i)=>{const g=cabinetGeometry(c,off,totalH);off+=+c.height||0;renderCabinet(svg,c,g,v,base,v.displayMode,i);});
    svg.appendChild(svgEl("circle",{cx:210+(v.panX||0),cy:270+(v.panY||0),r:2.5,class:"kenc-3d-origin"}));
    const label=s.mode3d==="stack"?`적층 ${safeCabinets.length}EA · 전체 높이 ${totalH} mm`:`${ctx.currentCabinet.width} × ${ctx.currentCabinet.height} × ${ctx.currentCabinet.depth} mm`;
    svg.appendChild(svgEl("text",{x:210,y:535,"text-anchor":"middle",class:"kenc-3d-label"},label));svg.dataset.zoom=Math.round(v.zoom*100)+"%";
    syncButtons();
  }
  function redraw(){window.KENC_DRAWING_API?.render3d?.();}
  function setPreset(name){const v=normalizeView(view());if(name==="front")Object.assign(v,{yaw:0,pitch:0,zoom:1,panX:0,panY:0});else Object.assign(v,{yaw:-35,pitch:-18,zoom:1,panX:0,panY:0});redraw();}
  function setDisplayMode(mode){const v=normalizeView(view());v.displayMode=mode;redraw();}
  function syncButtons(){const v=normalizeView(view());document.querySelectorAll('#drawingPanel [data-3d-view-mode]').forEach(b=>b.classList.toggle('active',b.dataset['3dViewMode']===v.displayMode));}
  function ensureModeControls(panel){
    const controls=panel?.querySelector('.drawing-pro-3d-controls');if(!controls||controls.querySelector('[data-3d-view-mode]'))return;
    const group=document.createElement('div');group.className='kenc-3d-view-modes';group.setAttribute('aria-label','3D 보기 모드');
    [["exterior","외관"],["xray","투명"],["open","문열기"],["section","단면"],["exploded","폭발도"]].forEach(([mode,label])=>{const b=document.createElement('button');b.type='button';b.dataset['3dViewMode']=mode;b.textContent=label;group.appendChild(b);});
    controls.prepend(group);
  }
  function bind(){
    svg=document.getElementById("drawing3dCanvas");if(!svg||svg.dataset.kencInteractiveBound)return;svg.dataset.kencInteractiveBound="1";const panel=svg.closest('.drawing-3d-panel');ensureModeControls(panel);
    document.addEventListener('click',e=>{
      const modeBtn=e.target.closest('#drawingPanel [data-3d-view-mode]');if(modeBtn){e.preventDefault();e.stopImmediatePropagation();setDisplayMode(modeBtn.dataset['3dViewMode']);return;}
      const btn=e.target.closest('#drawingPanel [data-3d-action]');if(!btn)return;const a=btn.dataset['3dAction'];if(!['front','iso','fit','reset'].includes(a))return;e.preventDefault();e.stopImmediatePropagation();setPreset(a==='front'?'front':'reset');
    },true);
    svg.addEventListener('pointerdown',e=>{svg.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const v=view();dragging={x:e.clientX,y:e.clientY,yaw:v.yaw,pitch:v.pitch,panX:v.panX||0,panY:v.panY||0,pan:e.button===1||e.button===2||e.shiftKey};svg.classList.add('is-interacting');e.preventDefault();});
    svg.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!dragging)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const v=view();if(pointers.size>=2){const pts=[...pointers.values()],dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),cx=(pts[0].x+pts[1].x)/2,cy=(pts[0].y+pts[1].y)/2;if(!pinch)pinch={dist,zoom:v.zoom,cx,cy,panX:v.panX||0,panY:v.panY||0};v.zoom=clamp(pinch.zoom*dist/Math.max(pinch.dist,1),.25,6);v.panX=pinch.panX+(cx-pinch.cx);v.panY=pinch.panY+(cy-pinch.cy);}else if(dragging.pan){v.panX=dragging.panX+(e.clientX-dragging.x);v.panY=dragging.panY+(e.clientY-dragging.y);}else{v.yaw=dragging.yaw+(e.clientX-dragging.x)*.55;v.pitch=clamp(dragging.pitch+(e.clientY-dragging.y)*.45,-89,89);}redraw();e.preventDefault();});
    const end=e=>{pointers.delete(e.pointerId);if(!pointers.size){dragging=null;pinch=null;svg.classList.remove('is-interacting');}};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);svg.addEventListener('contextmenu',e=>e.preventDefault());
    svg.addEventListener('wheel',e=>{const v=view();v.zoom=clamp(v.zoom*Math.exp(-e.deltaY*.0015),.25,6);redraw();e.preventDefault();},{passive:false});svg.addEventListener('dblclick',()=>setPreset('reset'));
    const note=panel?.querySelector('.drawing-3d-note');if(note)note.textContent='외관·투명·문열기·단면·폭발도 지원 · 왼쪽 드래그: 자유 회전 · 휠: 확대/축소 · 휠/오른쪽 드래그: 이동 · 더블클릭: 시점 초기화';redraw();
  }
  window.KENC3DViewer={render,reset:()=>setPreset('reset'),setMode:setDisplayMode};
  if(window.KENC_DRAWING_API)bind();else document.addEventListener('kenc:drawing-api-ready',bind,{once:true});document.addEventListener('DOMContentLoaded',bind,{once:true});
})();
