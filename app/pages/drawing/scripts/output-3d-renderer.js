(function(){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const el=(tag,a={},t='')=>{const e=document.createElementNS(NS,tag);Object.entries(a).forEach(([k,v])=>e.setAttribute(k,String(v)));if(t)e.textContent=t;return e;};
  const role=(o,s)=>window.KENC_CAD_MODEL?.roleOf?.(o,s)||(s==='inside'||o.type==='plate'?'internal':(['cut','emboss','anchor'].includes(o.type)?'cutout':(['groundBar','cableHook'].includes(o.type)?'utility':'external')));
  const colors={external:'#eef2f5',internal:'#e7ece8',cutout:'#fff1e7',utility:'#eee9f2'},strokes={external:'#303840',internal:'#384840',cutout:'#b45309',utility:'#55445f'};
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
    const d=window.KENC_OBJECT_REGISTRY?.definition?.(o.type)||window.KENC_OBJECT_DEFINITIONS?.[o.type]||{};
    window.KENC_ORIENTATION_CORRECTION?.clampObject?.(c,o);
    const place=window.KENC_ATTACH_ENGINE?.normalizePlacement?.(c,o,d);
    const b=window.KENC_ATTACH_ENGINE?.basis?.(c,place?.face||s,y0);
    if(!b)return null;
    const depth=window.KENC_ATTACH_ENGINE?.resolveDepth?.(o,d)||0;
    const origin={x:b.origin.x+b.u.x*(place?.x||0)+b.v.x*(place?.y||0)+b.normal.x*depth,
      y:b.origin.y+b.u.y*(place?.x||0)+b.v.y*(place?.y||0)+b.normal.y*depth,
      z:b.origin.z+b.u.z*(place?.x||0)+b.v.z*(place?.y||0)+b.normal.z*depth};
    const O=p(origin.x,origin.y,origin.z),pu=p(origin.x+b.u.x,origin.y+b.u.y,origin.z+b.u.z),pv=p(origin.x+b.v.x,origin.y+b.v.y,origin.z+b.v.z);
    const mirror=place?.mirror?-1:1;
    return{O,U:{x:(pu.x-O.x)*mirror,y:(pu.y-O.y)*mirror},V:{x:pv.x-O.x,y:pv.y-O.y}};
  }
  function objectRect(svg,c,o,s,y0){
    if(!o||o.visible===false||o.export===false||o.render3d===false)return;
    const b=basisFor(c,o,s,y0);if(!b)return;const r=role(o,s),ow=Number(o.w)||20,oh=Number(o.h)||20,{O,U,V}=b;
    const pts=[[0,0],[ow,0],[ow,oh],[0,oh]].map(([x,y])=>({x:O.x+U.x*x+V.x*y,y:O.y+U.y*x+V.y*y}));
    const poly=el('polygon',{points:pts.map(q=>`${q.x},${q.y}`).join(' '),fill:colors[r],stroke:strokes[r],'stroke-width':4,'vector-effect':'non-scaling-stroke'});svg.appendChild(poly);
    if(o.type==='vent'){
      const cxy=(u,v)=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v});
      for(let i=0;i<5;i++){
        const v=.14+i*.15;
        const q=[[.10,v-.025],[.90,v-.025],[.86,v+.07],[.14,v+.07]].map(([u,y])=>cxy(u,y));
        svg.appendChild(el('polygon',{points:q.map(a=>`${a.x},${a.y}`).join(' '),fill:'#89939b',stroke:'#27313a','stroke-width':2.2}));
        line(svg,cxy(.14,v+.07),cxy(.86,v+.07),{stroke:'#111827','stroke-width':3});
      }
      line(svg,cxy(.08,.08),cxy(.08,.91),{stroke:'#475569','stroke-width':3});line(svg,cxy(.92,.08),cxy(.92,.91),{stroke:'#475569','stroke-width':3});
    }else if(o.type==='key'){
      const cxy=(u,v)=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v});
      const variant=o.option||'키'; const mid=cxy(.5,.48);
      const bodyFill=variant==='탈착키'?'#111827':'#c9ced2';
      const bodyStroke=variant==='탈착키'?'#020617':'#475569';
      const q=[[.30,.08],[.70,.08],[.70,.92],[.30,.92]].map(([u,v])=>cxy(u,v));
      svg.appendChild(el('polygon',{points:q.map(a=>`${a.x},${a.y}`).join(' '),fill:bodyFill,stroke:bodyStroke,'stroke-width':2.5}));
      svg.appendChild(el('circle',{cx:mid.x,cy:mid.y-8,r:7,fill:variant==='탈착키'?'#030712':'#e5e7eb',stroke:'#111827','stroke-width':2}));
      line(svg,{x:mid.x,y:mid.y-14},{x:mid.x,y:mid.y-2},{stroke:variant==='탈착키'?'#d1d5db':'#475569','stroke-width':2});
      const label=cxy(.5,.78);svg.appendChild(el('text',{x:label.x,y:label.y,'text-anchor':'middle','font-size':9,'font-weight':800,fill:variant==='탈착키'?'#f8fafc':'#111827'},variant));
    }else if(o.type==='nameplate'){
      const tx=pts.reduce((a,q)=>a+q.x,0)/4,ty=pts.reduce((a,q)=>a+q.y,0)/4;svg.appendChild(el('text',{x:tx,y:ty+4,'text-anchor':'middle','font-size':12,'font-weight':800,fill:'#111827'},o.label||o.option));
    }else if(o.type==='acrylicWindow'){
      const cxy=(u,v)=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v});
      const inset=.11;const q=[[inset,inset],[1-inset,inset],[1-inset,1-inset],[inset,1-inset]].map(([u,v])=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v}));svg.appendChild(el('polygon',{points:q.map(x=>`${x.x},${x.y}`).join(' '),fill:'#d8f3ff','fill-opacity':.28,stroke:'#334155','stroke-width':3})); const h1=cxy(.22,.22),h2=cxy(.54,.25);line(svg,h1,h2,{stroke:'#ffffff','stroke-opacity':.9,'stroke-width':2});
    }else if(o.type==='doubleLock'){
      const cxy=(u,v)=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v});const m=cxy(.5,.45);svg.appendChild(el('circle',{cx:m.x,cy:m.y,r:8,fill:'#fff',stroke:'#111827','stroke-width':3}));svg.appendChild(el('text',{x:m.x,y:m.y+22,'text-anchor':'middle','font-size':10,'font-weight':800,fill:'#111827'},o.option));
    }else if(o.type==='groundBar'){
      const copper=(o.option||'').includes('동접지'),left=(o.option||'').includes('좌('),cxy=(u,v)=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v});
      const stroke=copper?'#6b2f0e':'#46515a',fill=copper?'#b65a22':'#a9b2b9',metal='#e5e7eb';
      const u0=left?.10:.72,dir=left?1:-1;
      const q=[[u0,.06],[u0+.18,.06],[u0+.18,.94],[u0,.94]].map(([u,v])=>cxy(u,v));svg.appendChild(el('polygon',{points:q.map(a=>`${a.x},${a.y}`).join(' '),fill,stroke,'stroke-width':2.3}));
      [.09,.91].forEach(v=>{const m=cxy(u0+.09,v);svg.appendChild(el('circle',{cx:m.x,cy:m.y,r:4.7,fill:metal,stroke,'stroke-width':1.5}));line(svg,{x:m.x-2.5,y:m.y},{x:m.x+2.5,y:m.y},{stroke,'stroke-width':1.2});});
      for(let i=0;i<6;i++){
        const v=.15+i*.14,start=cxy(left?.27:.73,v),end=cxy(left?.76:.24,v),nut=cxy(left?.80:.20,v);
        line(svg,start,end,{stroke,'stroke-width':3});svg.appendChild(el('circle',{cx:end.x,cy:end.y,r:5.5,fill:metal,stroke,'stroke-width':1.4}));
        svg.appendChild(el('circle',{cx:nut.x,cy:nut.y,r:3.4,fill,stroke,'stroke-width':1.2}));
      }
    }else if(o.type==='cableHook'){
      const left=(o.option||'').includes('왼쪽'),cxy=(u,v)=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v});
      const q=[cxy(.04,.36),cxy(.96,.36),cxy(.96,.57),cxy(.04,.57)];svg.appendChild(el('polygon',{points:q.map(a=>`${a.x},${a.y}`).join(' '),fill:'#c8d0d5',stroke:'#3f4b54','stroke-width':2.4}));
      const s1=cxy(left?.15:.85,.47),s2=cxy(left?.68:.32,.47),s3=cxy(left?.68:.32,.79),s4=cxy(left?.84:.16,.79),s5=cxy(left?.84:.16,.67);
      [ [s1,s2],[s2,s3],[s3,s4],[s4,s5] ].forEach(([a,b])=>line(svg,a,b,{stroke:'#3f4b54','stroke-width':5.2}));
      [.075,.925].forEach(u=>{for(let j=0;j<4;j++){const q=cxy(u,.39+j*.05);svg.appendChild(el('circle',{cx:q.x,cy:q.y,r:2.3,fill:'#6b7379',stroke:'#374151','stroke-width':.7}));}});
    }else if(o.type==='cut'){
      const round=(o.option||'')==='원형타공',red='#dc2626',cxy=(u,v)=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v});
      const center=cxy(.5,.5);
      if(round){
        const ex=Math.hypot(U.x*ow*.38,U.y*ow*.38),ey=Math.hypot(V.x*oh*.38,V.y*oh*.38);
        svg.appendChild(el('ellipse',{cx:center.x,cy:center.y,rx:Math.max(5,ex),ry:Math.max(5,ey),fill:'none',stroke:red,'stroke-width':4,'vector-effect':'non-scaling-stroke'}));
      }else{
        const q=[[.12,.12],[.88,.12],[.88,.88],[.12,.88]].map(([u,v])=>cxy(u,v));
        svg.appendChild(el('polygon',{points:q.map(a=>`${a.x},${a.y}`).join(' '),fill:'none',stroke:red,'stroke-width':4,'vector-effect':'non-scaling-stroke'}));
      }
      line(svg,cxy(.25,.25),cxy(.75,.75),{stroke:red,'stroke-width':4});
      line(svg,cxy(.75,.25),cxy(.25,.75),{stroke:red,'stroke-width':4});
    }else if(o.type==='emboss'){
      const round=(o.option||'').includes('원형'),cxy=(u,v)=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v});
      const center=cxy(.5,.5),dash='7 5';
      if(round){
        const ex=Math.hypot(U.x*ow*.34,U.y*ow*.34),ey=Math.hypot(V.x*oh*.34,V.y*oh*.34);
        svg.appendChild(el('ellipse',{cx:center.x,cy:center.y,rx:Math.max(5,ex),ry:Math.max(5,ey),fill:'#f8fafc','fill-opacity':.35,stroke:'#111827','stroke-width':3,'stroke-dasharray':dash,'vector-effect':'non-scaling-stroke'}));
      }else{
        const q=[[.16,.16],[.84,.16],[.84,.84],[.16,.84]].map(([u,v])=>cxy(u,v));
        svg.appendChild(el('polygon',{points:q.map(a=>`${a.x},${a.y}`).join(' '),fill:'#f8fafc','fill-opacity':.35,stroke:'#111827','stroke-width':3,'stroke-dasharray':dash,'vector-effect':'non-scaling-stroke'}));
      }
    }else if(o.type==='anchor'){
      const screw=(o.option||'').includes('피스'),cxy=(u,v)=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v}),m=cxy(.5,.5);
      const rx=Math.max(3,Math.hypot(U.x*ow*.38,U.y*ow*.38)),ry=Math.max(3,Math.hypot(V.x*oh*.38,V.y*oh*.38));
      svg.appendChild(el('ellipse',{cx:m.x,cy:m.y,rx,ry,fill:'#111827',stroke:'#6b7280','stroke-width':2.5,'vector-effect':'non-scaling-stroke'}));
      svg.appendChild(el('text',{x:m.x,y:m.y+Math.max(14,ry+12),'text-anchor':'middle','font-size':10,'font-weight':800,fill:'#111827'},screw?'Ø6':'Ø14'));
    }else if(o.type==='cover'){
      const cxy=(u,v)=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v});
      const polygon=svg.lastChild;if(polygon&&polygon.tagName==='polygon'){polygon.setAttribute('fill','#aab7ad');polygon.setAttribute('stroke','#374151');}
      [[.5,.10],[.5,.90],[.10,.5],[.90,.5]].forEach(([u,v])=>{const q=cxy(u,v);svg.appendChild(el('circle',{cx:q.x,cy:q.y,r:4.5,fill:'#e5e7eb',stroke:'#374151','stroke-width':1.6}));line(svg,{x:q.x-2.5,y:q.y},{x:q.x+2.5,y:q.y},{stroke:'#374151','stroke-width':1.2});line(svg,{x:q.x,y:q.y-2.5},{x:q.x,y:q.y+2.5},{stroke:'#374151','stroke-width':1.2});});
      const q=cxy(.5,.54);svg.appendChild(el('text',{x:q.x,y:q.y,'text-anchor':'middle','font-size':10,'font-weight':800,fill:'#26332b'},'타공덮개'));
    }else if(o.type==='plate'){
      const variant=(o.variant||'') || (o.option==='철속판'?'steel_plain':((o.option==='빼끄판'||o.option==='베크라이트 절연판')?'bakelite_yellow':'pvc_perforated'));
      const fill=variant==='bakelite_yellow'?'#d6a72b':variant==='steel_plain'?'#d1d5db':'#c7cccf';
      const polygon=svg.lastChild; if(polygon&&polygon.tagName==='polygon') polygon.setAttribute('fill',fill);
      const cxy=(u,v)=>({x:O.x+U.x*ow*u+V.x*oh*v,y:O.y+U.y*ow*u+V.y*oh*v});
      [[.07,.07],[.93,.07],[.07,.93],[.93,.93]].forEach(([u,v])=>{const q=cxy(u,v);svg.appendChild(el('circle',{cx:q.x,cy:q.y,r:5.2,fill:'#d1d5db',stroke:'#374151','stroke-width':1.4}));svg.appendChild(el('ellipse',{cx:q.x,cy:q.y,rx:3.3,ry:1.7,fill:'#111827',stroke:'#374151','stroke-width':.8,transform:`rotate(${u===v?-45:45} ${q.x} ${q.y})`}));});
      if(variant==='bakelite_yellow'){for(let i=2;i<10;i++){line(svg,cxy(.12,i/12),cxy(.88,i/12),{stroke:'#7c4a12','stroke-opacity':.22,'stroke-width':1});}}
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
    const order=['back','inside','left','right','top','bottom','front','door'];
    order.forEach(s=>(c.objects||[]).filter(o=>(o.surface||'front')===s).forEach(o=>{
      try{objectRect(svg,c,o,s,y0);}catch(error){console.error('[KENC Output 3D] object renderer isolated',o,error);}
    }));
    // 객체 오류나 겹침 이후에도 제작 전달 도면에서 함체 윤곽을 확실히 유지한다.
    [[A,E],[D,H],[E,F],[F,G],[G,H],[H,E],[A,B],[B,C],[C,D],[D,A]].forEach(([a,b])=>line(svg,a,b,{stroke:'#111827','stroke-width':3.2}));
    svg.appendChild(el('text',{x:350,y:625,'text-anchor':'middle','font-size':24,'font-weight':800,fill:'#111827'},`${c.width} × ${c.height} × ${c.depth} mm`));
    svg.appendChild(el('text',{x:350,y:656,'text-anchor':'middle','font-size':17,fill:'#475569'},`입체 등각 3D · 통합 부착방향 보정 · ${(c.objects||[]).length} EA`));
    return svg;
  }
  window.KENC3DOutputRenderer={render};
})();
