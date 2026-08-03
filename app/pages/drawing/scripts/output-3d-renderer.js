(function(){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const el=(tag,a={},t='')=>{const e=document.createElementNS(NS,tag);Object.entries(a).forEach(([k,v])=>e.setAttribute(k,String(v)));if(t)e.textContent=t;return e;};
  const role=(o,s)=>window.KENC_CAD_MODEL?.roleOf?.(o,s)||(s==='inside'||o.type==='plate'?'internal':(['cut','emboss','anchor'].includes(o.type)?'cutout':(['groundBar','cableHook'].includes(o.type)?'utility':'external')));
  const colors={external:'#dbeafe',internal:'#dcfce7',cutout:'#ffedd5',utility:'#f3e8ff'},strokes={external:'#2563eb',internal:'#16a34a',cutout:'#ea580c',utility:'#9333ea'};
  function p(x,y,z,sc){return{x:350+(x-z*.42)*sc,y:330+(y+z*.28)*sc};}
  function line(svg,a,b,attrs={}){svg.appendChild(el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#111827','stroke-width':3,'stroke-linecap':'round',...attrs}));}
  function worldDoorPoint(c,mode,x,y,z=0){
    const pose=window.KENC_CAD_MODEL?.doorPose?.(c,mode,0);
    if(!pose||!pose.moving)return{x,y,z:(+c.depth||130)/2+z};
    return window.KENC_CAD_MODEL.rotateDoorPoint({x:x-(+c.width||600)/2,y,z},pose);
  }
  function basisFor(c,o,s,sc,y0,mode){
    const w=+c.width,h=+c.height,d=+c.depth,x=+o.x||0,y=+o.y||0;
    let O,U,V;
    if(s==='front'){
      const fp=window.KENC_CAD_MODEL?.frontPoint;
      const a=fp?fp(c,x,y,5,mode,y0):worldDoorPoint(c,mode,x,y-h/2,4);
      const au=fp?fp(c,x+1,y,5,mode,y0):worldDoorPoint(c,mode,x+1,y-h/2,4);
      const av=fp?fp(c,x,y+1,5,mode,y0):worldDoorPoint(c,mode,x,y-h/2+1,4);
      O=p(a.x,a.y,a.z,sc);const pu=p(au.x,au.y,au.z,sc),pv=p(av.x,av.y,av.z,sc);U={x:pu.x-O.x,y:pu.y-O.y};V={x:pv.x-O.x,y:pv.y-O.y};
    }
    else if(s==='inside'){O=p(-w/2+x,y0-h/2+y,-d/2+Math.max(20,d*.28),sc);U={x:sc,y:0};V={x:0,y:sc};}
    else if(s==='back'){O=p(w/2-x,y0-h/2+y,-d/2-3,sc);U={x:-sc,y:0};V={x:0,y:sc};}
    else if(s==='left'){O=p(-w/2,y0-h/2+y,d/2-x,sc);const Ou=p(-w/2,y0-h/2+y,d/2-x-1,sc),Ov=p(-w/2,y0-h/2+y+1,d/2-x,sc);U={x:Ou.x-O.x,y:Ou.y-O.y};V={x:Ov.x-O.x,y:Ov.y-O.y};}
    else if(s==='right'){O=p(w/2,y0-h/2+y,-d/2+x,sc);const Ou=p(w/2,y0-h/2+y,-d/2+x+1,sc),Ov=p(w/2,y0-h/2+y+1,-d/2+x,sc);U={x:Ou.x-O.x,y:Ou.y-O.y};V={x:Ov.x-O.x,y:Ov.y-O.y};}
    else if(s==='top'){O=p(-w/2+x,y0-h/2,d/2-y,sc);const Ou=p(-w/2+x+1,y0-h/2,d/2-y,sc),Ov=p(-w/2+x,y0-h/2,d/2-y-1,sc);U={x:Ou.x-O.x,y:Ou.y-O.y};V={x:Ov.x-O.x,y:Ov.y-O.y};}
    else if(s==='bottom'){O=p(-w/2+x,y0+h/2,-d/2+y,sc);const Ou=p(-w/2+x+1,y0+h/2,-d/2+y,sc),Ov=p(-w/2+x,y0+h/2,-d/2+y+1,sc);U={x:Ou.x-O.x,y:Ou.y-O.y};V={x:Ov.x-O.x,y:Ov.y-O.y};}
    else return null;
    return {O,U,V};
  }
  function objectRect(svg,c,o,s,sc,y0,mode){
    const b=basisFor(c,o,s,sc,y0,mode); if(!b)return;
    const r=role(o,s),ow=Number(o.w)||20,oh=Number(o.h)||20,{O,U,V}=b;
    const pts=[[0,0],[ow,0],[ow,oh],[0,oh]].map(([x,y])=>({x:O.x+U.x*x+V.x*y,y:O.y+U.y*x+V.y*y}));
    const poly=el('polygon',{points:pts.map(q=>`${q.x},${q.y}`).join(' '),fill:colors[r],stroke:strokes[r],'stroke-width':4,'vector-effect':'non-scaling-stroke'});
    if(o.rot){const cx=pts.reduce((a,q)=>a+q.x,0)/4,cy=pts.reduce((a,q)=>a+q.y,0)/4;poly.setAttribute('transform',`rotate(${o.rot} ${cx} ${cy})`);} svg.appendChild(poly);
    const tx=pts.reduce((a,q)=>a+q.x,0)/4,ty=pts.reduce((a,q)=>a+q.y,0)/4;
    const label=o.label||o.option||({vent:'환기구',nameplate:'명판',plate:'PVC속판',cut:'타공',groundBar:'접지'}[o.type])||o.type;
    if(o.type==='vent'){for(let i=1;i<=5;i++){const a={x:O.x+U.x*ow*.18+V.x*oh*i/6,y:O.y+U.y*ow*.18+V.y*oh*i/6},b2={x:O.x+U.x*ow*.82+V.x*oh*i/6,y:O.y+U.y*ow*.82+V.y*oh*i/6};line(svg,a,b2,{stroke:'#111827','stroke-width':2});}}
    else svg.appendChild(el('text',{x:tx,y:ty+5,'text-anchor':'middle','font-size':Math.max(12,Math.min(22,Math.min(ow,oh)*sc*.13)),'font-weight':800,fill:'#111827'},label));
  }
  function render(state,cabinet){
    const svg=el('svg',{xmlns:NS,viewBox:'0 0 700 700',width:700,height:700});svg.appendChild(el('rect',{width:700,height:700,fill:'#fff'}));
    const c=cabinet,w=+c.width,h=+c.height,d=+c.depth,sc=Math.min(400/w,450/h,145/d),y0=0,mode=state?.live3dView?.displayMode||'exterior';
    const A=p(-w/2,-h/2,d/2,sc),B=p(w/2,-h/2,d/2,sc),C=p(w/2,h/2,d/2,sc),D=p(-w/2,h/2,d/2,sc),E=p(-w/2,-h/2,-d/2,sc),F=p(w/2,-h/2,-d/2,sc),G=p(w/2,h/2,-d/2,sc),H=p(-w/2,h/2,-d/2,sc);
    svg.appendChild(el('polygon',{points:[B,F,G,C].map(q=>`${q.x},${q.y}`).join(' '),fill:'#eef2f7',stroke:'#111827','stroke-width':3}));
    svg.appendChild(el('polygon',{points:[E,F,B,A].map(q=>`${q.x},${q.y}`).join(' '),fill:'#f1f5f9',stroke:'#111827','stroke-width':3}));
    [[A,E],[D,H],[E,F],[F,G],[G,H],[H,E],[A,B],[B,C],[C,D],[D,A]].forEach(([a,b])=>line(svg,a,b));
    if(mode==='open'||mode==='exploded'){
      const dc=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([x,y])=>{const q=worldDoorPoint(c,mode,x+w/2,y,0);return p(q.x,q.y,q.z,sc)});
      svg.appendChild(el('polygon',{points:dc.map(q=>`${q.x},${q.y}`).join(' '),fill:'#f8fafc',stroke:'#111827','stroke-width':3}));
    } else svg.appendChild(el('polygon',{points:[A,B,C,D].map(q=>`${q.x},${q.y}`).join(' '),fill:'#f8fafc',stroke:'#111827','stroke-width':3}));
    const order=['back','inside','left','right','top','bottom','front'];order.forEach(s=>(c.objects||[]).filter(o=>(o.surface||'front')===s).forEach(o=>objectRect(svg,c,o,s,sc,y0,mode)));
    svg.appendChild(el('text',{x:350,y:630,'text-anchor':'middle','font-size':24,'font-weight':800,fill:'#111827'},`${c.width} × ${c.height} × ${c.depth} mm`));
    svg.appendChild(el('text',{x:350,y:662,'text-anchor':'middle','font-size':17,fill:'#475569'},`출력 전용 3D · 배치 객체 ${(c.objects||[]).length} EA`));
    return svg;
  }
  window.KENC3DOutputRenderer={render};
})();
