(function(){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const el=(tag,a={},t='')=>{const e=document.createElementNS(NS,tag);Object.entries(a).forEach(([k,v])=>e.setAttribute(k,String(v)));if(t)e.textContent=t;return e;};
  const role=(o,s)=>s==='inside'||o.type==='plate'?'internal':(['cut','emboss','anchor'].includes(o.type)?'cutout':(['groundBar','cableHook'].includes(o.type)?'utility':'external'));
  const colors={external:'#dbeafe',internal:'#dcfce7',cutout:'#ffedd5',utility:'#f3e8ff'},strokes={external:'#2563eb',internal:'#16a34a',cutout:'#ea580c',utility:'#9333ea'};
  function p(x,y,z,sc){return{x:350+(x-z*.42)*sc,y:330+(y+z*.28)*sc};}
  function line(svg,a,b,attrs={}){svg.appendChild(el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#111827','stroke-width':3,'stroke-linecap':'round',...attrs}));}
  function objectRect(svg,c,o,s,sc,y0){const r=role(o,s),w=c.width,h=c.height,d=c.depth;let base,u,v;
    if(s==='front'){base=p(-w/2+o.x,y0-h/2+o.y,d/2+3,sc);u={x:sc,y:0};v={x:0,y:sc};}
    else if(s==='inside'){base=p(-w/2+o.x,y0-h/2+o.y,-d/2+Math.max(20,d*.28),sc);u={x:sc,y:0};v={x:0,y:sc};}
    else if(s==='back'){base=p(w/2-o.x,y0-h/2+o.y,-d/2-3,sc);u={x:-sc,y:0};v={x:0,y:sc};}
    else return;
    const pts=[[0,0],[o.w,0],[o.w,o.h],[0,o.h]].map(([x,y])=>`${base.x+u.x*x+v.x*y},${base.y+u.y*x+v.y*y}`).join(' ');
    svg.appendChild(el('polygon',{points:pts,fill:colors[r],stroke:strokes[r],'stroke-width':4,'vector-effect':'non-scaling-stroke'}));
    const tx=base.x+u.x*o.w/2+v.x*o.h/2,ty=base.y+u.y*o.w/2+v.y*o.h/2;
    svg.appendChild(el('text',{x:tx,y:ty+5,'text-anchor':'middle','font-size':Math.max(12,Math.min(23,o.w*sc*.12)),'font-weight':800,fill:'#111827'},o.option||o.label||o.type));
    if(o.type==='vent'){for(let i=1;i<=5;i++){const yy=o.h*i/6;line(svg,{x:base.x+u.x*o.w*.18+v.x*yy,y:base.y+u.y*o.w*.18+v.y*yy},{x:base.x+u.x*o.w*.82+v.x*yy,y:base.y+u.y*o.w*.82+v.y*yy},{stroke:'#111827','stroke-width':2});}}
  }
  function render(state,cabinet){const svg=el('svg',{xmlns:NS,viewBox:'0 0 700 700',width:700,height:700});svg.appendChild(el('rect',{width:700,height:700,fill:'#fff'}));const c=cabinet,w=c.width,h=c.height,d=c.depth,sc=Math.min(430/w,470/h,150/d),y0=0;
    const A=p(-w/2,-h/2,d/2,sc),B=p(w/2,-h/2,d/2,sc),C=p(w/2,h/2,d/2,sc),D=p(-w/2,h/2,d/2,sc),E=p(-w/2,-h/2,-d/2,sc),F=p(w/2,-h/2,-d/2,sc),G=p(w/2,h/2,-d/2,sc),H=p(-w/2,h/2,-d/2,sc);
    svg.appendChild(el('polygon',{points:[A,B,C,D].map(q=>`${q.x},${q.y}`).join(' '),fill:'#f8fafc',stroke:'#111827','stroke-width':3}));svg.appendChild(el('polygon',{points:[B,F,G,C].map(q=>`${q.x},${q.y}`).join(' '),fill:'#eef2f7',stroke:'#111827','stroke-width':3}));svg.appendChild(el('polygon',{points:[E,F,B,A].map(q=>`${q.x},${q.y}`).join(' '),fill:'#f1f5f9',stroke:'#111827','stroke-width':3}));
    [[A,E],[D,H],[E,F],[F,G],[G,H],[H,E],[A,B],[B,C],[C,D],[D,A]].forEach(([a,b])=>line(svg,a,b));
    (c.objects||[]).forEach(o=>objectRect(svg,c,o,o.surface||'front',sc,y0));
    svg.appendChild(el('text',{x:350,y:630,'text-anchor':'middle','font-size':24,'font-weight':800,fill:'#111827'},`${c.width} × ${c.height} × ${c.depth} mm`));
    svg.appendChild(el('text',{x:350,y:662,'text-anchor':'middle','font-size':17,fill:'#475569'},'출력 전용 3D · 내부/외부 객체 분류 표시'));
    return svg;
  }
  window.KENC3DOutputRenderer={render};
})();
