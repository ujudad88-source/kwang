(function(){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const el=(tag,a={},t='')=>{const e=document.createElementNS(NS,tag);Object.entries(a).forEach(([k,v])=>e.setAttribute(k,String(v)));if(t)e.textContent=t;return e;};
  const role=(o,s)=>window.KENC_CAD_MODEL?.roleOf?.(o,s)||(s==='inside'||o.type==='plate'?'internal':(['cut','emboss','anchor'].includes(o.type)?'cutout':(['groundBar','cableHook'].includes(o.type)?'utility':'external')));
  const colors={external:'#dbeafe',internal:'#dcfce7',cutout:'#ffedd5',utility:'#f3e8ff'},strokes={external:'#2563eb',internal:'#16a34a',cutout:'#ea580c',utility:'#9333ea'};
  let projectPoint=(x,y,z)=>({x:350+x,y:330+y});
  function makeIsometricProjector(c){
    const yaw=-35*Math.PI/180,pitch=-24*Math.PI/180,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const raw=(x,y,z)=>{const x1=cy*x-sy*z,z1=sy*x+cy*z,y1=cp*y-sp*z1;return{x:x1,y:y1}};
    const w=+c.width||600,h=+c.height||700,d=+c.depth||130;
    const corners=[];[-w/2,w/2].forEach(x=>[-h/2,h/2].forEach(y=>[-d/2,d/2].forEach(z=>corners.push(raw(x,y,z)))));
    const minX=Math.min(...corners.map(q=>q.x)),maxX=Math.max(...corners.map(q=>q.x)),minY=Math.min(...corners.map(q=>q.y)),maxY=Math.max(...corners.map(q=>q.y));
    const sc=Math.min(430/Math.max(1,maxX-minX),430/Math.max(1,maxY-minY));
    const cx=(minX+maxX)/2,cy2=(minY+maxY)/2;
    return (x,y,z)=>{const q=raw(x,y,z);return{x:350+(q.x-cx)*sc,y:320+(q.y-cy2)*sc}};
  }
  function p(x,y,z){return projectPoint(x,y,z);}
  function line(svg,a,b,attrs={}){svg.appendChild(el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#111827','stroke-width':3,'stroke-linecap':'round',...attrs}));}
  function basisFor(c,o,s,y0){
    const w=+c.width,h=+c.height,d=+c.depth,x=+o.x||0,y=+o.y||0;let O,U,V;
    const vec=(a,b)=>({x:b.x-a.x,y:b.y-a.y});
    if(s==='front'){O=p(-w/2+x,y0-h/2+y,d/2+5);U=vec(O,p(-w/2+x+1,y0-h/2+y,d/2+5));V=vec(O,p(-w/2+x,y0-h/2+y+1,d/2+5));}
    else if(s==='inside'){O=p(-w/2+x,y0-h/2+y,-d/2+Math.max(20,d*.28));U=vec(O,p(-w/2+x+1,y0-h/2+y,-d/2+Math.max(20,d*.28)));V=vec(O,p(-w/2+x,y0-h/2+y+1,-d/2+Math.max(20,d*.28)));}
    else if(s==='back'){O=p(w/2-x,y0-h/2+y,-d/2-3);U=vec(O,p(w/2-x-1,y0-h/2+y,-d/2-3));V=vec(O,p(w/2-x,y0-h/2+y+1,-d/2-3));}
    else if(s==='left'){O=p(-w/2,y0-h/2+y,d/2-x);U=vec(O,p(-w/2,y0-h/2+y,d/2-x-1));V=vec(O,p(-w/2,y0-h/2+y+1,d/2-x));}
    else if(s==='right'){O=p(w/2,y0-h/2+y,-d/2+x);U=vec(O,p(w/2,y0-h/2+y,-d/2+x+1));V=vec(O,p(w/2,y0-h/2+y+1,-d/2+x));}
    else if(s==='top'){O=p(-w/2+x,y0-h/2,d/2-y);U=vec(O,p(-w/2+x+1,y0-h/2,d/2-y));V=vec(O,p(-w/2+x,y0-h/2,d/2-y-1));}
    else if(s==='bottom'){O=p(-w/2+x,y0+h/2,-d/2+y);U=vec(O,p(-w/2+x+1,y0+h/2,-d/2+y));V=vec(O,p(-w/2+x,y0+h/2,-d/2+y+1));}
    else return null;return{O,U,V};
  }
  function objectRect(svg,c,o,s,y0){
    const b=basisFor(c,o,s,y0);if(!b)return;const r=role(o,s),ow=Number(o.w)||20,oh=Number(o.h)||20,{O,U,V}=b;
    const pts=[[0,0],[ow,0],[ow,oh],[0,oh]].map(([x,y])=>({x:O.x+U.x*x+V.x*y,y:O.y+U.y*x+V.y*y}));
    const poly=el('polygon',{points:pts.map(q=>`${q.x},${q.y}`).join(' '),fill:colors[r],stroke:strokes[r],'stroke-width':4,'vector-effect':'non-scaling-stroke'});svg.appendChild(poly);
    if(o.type==='vent'){
      for(let i=0;i<5;i++){const yy=oh*(.15+i*.145);const a={x:O.x+U.x*ow*.12+V.x*yy,y:O.y+U.y*ow*.12+V.y*yy},b2={x:O.x+U.x*ow*.88+V.x*yy,y:O.y+U.y*ow*.88+V.y*yy};line(svg,a,b2,{stroke:'#111827','stroke-width':2});}
    }else if(o.type==='key'){
      const cxy=(u,v)=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v});
      const a=cxy(.36,.12),b2=cxy(.64,.88);line(svg,a,{x:b2.x-U.x*ow*.28,y:b2.y-U.y*ow*.28},{stroke:'#374151','stroke-width':5});
      const mid=cxy(.5,.72);svg.appendChild(el('circle',{cx:mid.x,cy:mid.y,r:5,fill:'#fff',stroke:'#111827','stroke-width':2}));
      const label=cxy(.5,.50);svg.appendChild(el('text',{x:label.x,y:label.y,'text-anchor':'middle','font-size':10,'font-weight':800,fill:'#111827'},o.option));
    }else if(o.type==='nameplate'){
      const tx=pts.reduce((a,q)=>a+q.x,0)/4,ty=pts.reduce((a,q)=>a+q.y,0)/4;svg.appendChild(el('text',{x:tx,y:ty+4,'text-anchor':'middle','font-size':12,'font-weight':800,fill:'#111827'},o.label||o.option));
    }else if(o.type==='acrylicWindow'){
      const inset=.10;const q=[[inset,inset],[1-inset,inset],[1-inset,1-inset],[inset,1-inset]].map(([u,v])=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v}));svg.appendChild(el('polygon',{points:q.map(x=>`${x.x},${x.y}`).join(' '),fill:'#bae6fd','fill-opacity':.35,stroke:'#0891b2','stroke-width':3}));
    }else if(o.type==='doubleLock'){
      const cxy=(u,v)=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v});const m=cxy(.5,.45);svg.appendChild(el('circle',{cx:m.x,cy:m.y,r:8,fill:'#fff',stroke:'#111827','stroke-width':3}));svg.appendChild(el('text',{x:m.x,y:m.y+22,'text-anchor':'middle','font-size':10,'font-weight':800,fill:'#111827'},o.option));
    }else if(o.type==='plate'){
      const variant=(o.variant||'') || (o.option==='철속판'?'steel_plain':((o.option==='빼끄판'||o.option==='베크라이트 절연판')?'bakelite_yellow':'pvc_perforated'));
      const fill=variant==='bakelite_yellow'?'#d6a72b':variant==='steel_plain'?'#d1d5db':'#c7cccf';
      const polygon=svg.lastChild; if(polygon&&polygon.tagName==='polygon') polygon.setAttribute('fill',fill);
      const cxy=(u,v)=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v});
      [[.07,.07],[.93,.07],[.07,.93],[.93,.93]].forEach(([u,v])=>{const q=cxy(u,v);svg.appendChild(el('ellipse',{cx:q.x,cy:q.y,rx:5,ry:2.5,fill:'#fff',stroke:'#374151','stroke-width':1.5,transform:`rotate(${u===v?-45:45} ${q.x} ${q.y})`}));});
      if(variant==='pvc_perforated'){
        for(let iy=2;iy<=10;iy++)for(let ix=2;ix<=8;ix++){const u=ix/10,v=iy/12;if((ix<3&&iy<3)||(ix>7&&iy<3)||(ix<3&&iy>9)||(ix>7&&iy>9))continue;const q=cxy(u,v);svg.appendChild(el('circle',{cx:q.x,cy:q.y,r:1.15,fill:'#4b5563'}));}
        const q=cxy(.5,.5);svg.appendChild(el('circle',{cx:q.x,cy:q.y,r:3.2,fill:'#fff',stroke:'#374151','stroke-width':1.3}));
      }
      const q=cxy(.5,.54);svg.appendChild(el('text',{x:q.x,y:q.y,'text-anchor':'middle','font-size':11,'font-weight':800,fill:variant==='bakelite_yellow'?'#513b0d':'#111827'},o.option||'속판'));
    }else{
      const tx=pts.reduce((a,q)=>a+q.x,0)/4,ty=pts.reduce((a,q)=>a+q.y,0)/4;const label=o.label||o.option||({plate:'PVC속판',cut:'타공',groundBar:'접지'}[o.type])||o.type;svg.appendChild(el('text',{x:tx,y:ty+4,'text-anchor':'middle','font-size':13,'font-weight':800,fill:'#111827'},label));
    }
  }
  function render(state,cabinet){
    const svg=el('svg',{xmlns:NS,viewBox:'0 0 700 700',width:700,height:700});svg.appendChild(el('rect',{width:700,height:700,fill:'#fff'}));
    const c=cabinet,w=+c.width,h=+c.height,d=+c.depth,y0=0;projectPoint=makeIsometricProjector(c);
    const A=p(-w/2,-h/2,d/2),B=p(w/2,-h/2,d/2),C=p(w/2,h/2,d/2),D=p(-w/2,h/2,d/2),E=p(-w/2,-h/2,-d/2),F=p(w/2,-h/2,-d/2),G=p(w/2,h/2,-d/2),H=p(-w/2,h/2,-d/2);
    svg.appendChild(el('polygon',{points:[E,F,B,A].map(q=>`${q.x},${q.y}`).join(' '),fill:'#f8fafc',stroke:'#111827','stroke-width':3}));
    svg.appendChild(el('polygon',{points:[B,F,G,C].map(q=>`${q.x},${q.y}`).join(' '),fill:'#e5e7eb',stroke:'#111827','stroke-width':3}));
    svg.appendChild(el('polygon',{points:[A,B,C,D].map(q=>`${q.x},${q.y}`).join(' '),fill:'#ffffff','fill-opacity':.86,stroke:'#111827','stroke-width':3}));
    [[A,E],[D,H],[E,F],[F,G],[G,H],[H,E],[A,B],[B,C],[C,D],[D,A]].forEach(([a,b])=>line(svg,a,b));
    const order=['back','inside','left','right','top','bottom','front'];order.forEach(s=>(c.objects||[]).filter(o=>(o.surface||'front')===s).forEach(o=>objectRect(svg,c,o,s,y0)));
    svg.appendChild(el('text',{x:350,y:625,'text-anchor':'middle','font-size':24,'font-weight':800,fill:'#111827'},`${c.width} × ${c.height} × ${c.depth} mm`));
    svg.appendChild(el('text',{x:350,y:656,'text-anchor':'middle','font-size':17,fill:'#475569'},`입체 등각 3D · 배치 객체 ${(c.objects||[]).length} EA`));
    return svg;
  }
  window.KENC3DOutputRenderer={render};
})();
