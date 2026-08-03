(function(){
  'use strict';
  const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const add=(a,b,m=1)=>({x:a.x+b.x*m,y:a.y+b.y*m,z:a.z+b.z*m});
  function basis(c,surface,y0=0){const w=n(c.width,600),h=n(c.height,700),d=n(c.depth,130),e=1.2,setback=Math.min(Math.max(18,d*.2),Math.max(22,d*.34));const m={front:{origin:{x:-w/2,y:y0,z:d/2+e},u:{x:1,y:0,z:0},v:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}},back:{origin:{x:w/2,y:y0,z:-d/2-e},u:{x:-1,y:0,z:0},v:{x:0,y:1,z:0},normal:{x:0,y:0,z:-1}},inside:{origin:{x:-w/2,y:y0,z:-d/2+setback},u:{x:1,y:0,z:0},v:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}},left:{origin:{x:-w/2-e,y:y0,z:d/2},u:{x:0,y:0,z:-1},v:{x:0,y:1,z:0},normal:{x:-1,y:0,z:0}},right:{origin:{x:w/2+e,y:y0,z:-d/2},u:{x:0,y:0,z:1},v:{x:0,y:1,z:0},normal:{x:1,y:0,z:0}},top:{origin:{x:-w/2,y:y0-e,z:-d/2},u:{x:1,y:0,z:0},v:{x:0,y:0,z:1},normal:{x:0,y:-1,z:0}},bottom:{origin:{x:-w/2,y:y0+h+e,z:d/2},u:{x:1,y:0,z:0},v:{x:0,y:0,z:-1},normal:{x:0,y:1,z:0}}};return m[surface]||m.front;}
  function point(c,o,y0=0,z=0){const b=basis(c,o.surface||'front',y0);return add(add(add(b.origin,b.u,n(o.x)+n(o.w)/2),b.v,n(o.y)+n(o.h)/2),b.normal,z+n(o.depth)/2);}
  function transform(c,o,y0=0){const b=basis(c,o.surface||'front',y0);return{basis:b,center:point(c,o,y0),width:n(o.w),height:n(o.h),depth:n(o.depth),rotation:n(o.rot),mirror:!!o.mirror};}
  window.KENC_ATTACH_ENGINE={version:'1.0.3',basis,point,transform};
})();
