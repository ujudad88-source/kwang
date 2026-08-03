(function(){
  'use strict';
  const C=window.KENC_ENGINE_CONSTANTS||{};
  const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const canonicalFace=f=>C.FACE_ALIASES?.[String(f||'').toLowerCase()]||String(f||'front').toLowerCase();
  const add=(a,b,m=1)=>({x:a.x+b.x*m,y:a.y+b.y*m,z:a.z+b.z*m});
  const mul=(a,m)=>({x:a.x*m,y:a.y*m,z:a.z*m});
  function dimensions(c,face){const w=n(c.width,600),h=n(c.height,700),d=n(c.depth,130);face=canonicalFace(face);return(face==='left'||face==='right')?{width:d,height:h}:(face==='top'||face==='bottom')?{width:w,height:d}:{width:w,height:h};}
  function basis(c,face,y0=0){
    const w=n(c.width,600),h=n(c.height,700),d=n(c.depth,130),t=n(c.thickness,1.6),e=t/2;
    const setback=Math.min(Math.max(18,d*.2),Math.max(22,d*.34)); face=canonicalFace(face);
    const map={
      front:{origin:{x:-w/2,y:y0,z:d/2+e},u:{x:1,y:0,z:0},v:{x:0,y:1,z:0},normal:{x:0,y:0,z:1},rotation:{x:0,y:0,z:0}},
      door:{origin:{x:-w/2,y:y0,z:d/2+e},u:{x:1,y:0,z:0},v:{x:0,y:1,z:0},normal:{x:0,y:0,z:1},rotation:{x:0,y:0,z:0}},
      back:{origin:{x:w/2,y:y0,z:-d/2-e},u:{x:-1,y:0,z:0},v:{x:0,y:1,z:0},normal:{x:0,y:0,z:-1},rotation:{x:0,y:Math.PI,z:0}},
      inside:{origin:{x:-w/2,y:y0,z:-d/2+setback},u:{x:1,y:0,z:0},v:{x:0,y:1,z:0},normal:{x:0,y:0,z:1},rotation:{x:0,y:0,z:0}},
      left:{origin:{x:-w/2-e,y:y0,z:d/2},u:{x:0,y:0,z:-1},v:{x:0,y:1,z:0},normal:{x:-1,y:0,z:0},rotation:{x:0,y:-Math.PI/2,z:0}},
      right:{origin:{x:w/2+e,y:y0,z:-d/2},u:{x:0,y:0,z:1},v:{x:0,y:1,z:0},normal:{x:1,y:0,z:0},rotation:{x:0,y:Math.PI/2,z:0}},
      top:{origin:{x:-w/2,y:y0-e,z:-d/2},u:{x:1,y:0,z:0},v:{x:0,y:0,z:1},normal:{x:0,y:-1,z:0},rotation:{x:-Math.PI/2,y:0,z:0}},
      bottom:{origin:{x:-w/2,y:y0+h+e,z:d/2},u:{x:1,y:0,z:0},v:{x:0,y:0,z:-1},normal:{x:0,y:1,z:0},rotation:{x:Math.PI/2,y:0,z:0}}
    };return map[face]||map.front;
  }
  function anchorOffset(anchor,p,o){
    const w=n(o.w),h=n(o.h),maxX=Math.max(0,p.width-w),maxY=Math.max(0,p.height-h),a=String(anchor||'free').toLowerCase();
    const x=a.includes('left')?0:a.includes('right')?maxX:a==='free'?n(o.x):maxX/2;
    const y=a.includes('top')?0:a.includes('bottom')?maxY:a==='free'?n(o.y):maxY/2;
    return{x,y};
  }
  function resolveParent(o,d){if(o.parent)return o.parent;if(o.surface==='inside'||d.category==='internal')return'inside';if(d.category==='hole'||d.category==='formed')return'holes';if(d.category==='utility')return'utility';return(o.surface==='door'||o.doorBound||d.doorBound)?'door':'body';}
  function resolveMirror(o,d){if(typeof o.mirror==='boolean'&&o.mirrorOverride)return o.mirror;const policy=d.mirrorPolicy||'none',f=canonicalFace(o.surface);if(policy==='opposite-side')return f==='right';if(policy==='back')return f==='back';if(policy==='auto')return f==='right'||f==='back'||f==='bottom';return !!o.mirror;}
  function resolveDepth(o,d){const layer=o.depthLayer||d.depthLayer||((d.category==='hole'||d.category==='formed')?'cut':d.category==='internal'?'plate':d.category==='utility'?'inside':'outside');const base=C.DEPTH_LAYERS?.[String(layer).toUpperCase()]??0;return n(o.depthOffset,base)+n(o.depth,d.depth||0)/2;}
  function normalizePlacement(c,o,d={}){const face=canonicalFace(o.surface||d.mounts?.[0]||'front'),p=dimensions(c,face),a=anchorOffset(o.anchor||d.anchor||'free',p,o);return{face,plane:p,x:a.x,y:a.y,parent:resolveParent({...o,surface:face},d),mirror:resolveMirror({...o,surface:face},d),depth:resolveDepth(o,d)};}
  function point(c,o,y0=0,d={}){const place=normalizePlacement(c,o,d),b=basis(c,place.face,y0);return add(add(add(b.origin,b.u,place.x+n(o.w)/2),b.v,place.y+n(o.h)/2),b.normal,place.depth);}
  function transform(c,o,y0=0,d={}){const place=normalizePlacement(c,o,d),b=basis(c,place.face,y0);return{basis:b,center:point(c,o,y0,d),width:n(o.w),height:n(o.h),depth:n(o.depth,d.depth||0),rotation:n(o.rot)+n(d.rotationOffset),faceRotation:b.rotation,mirror:place.mirror,parent:place.parent,surface:place.face,local:{x:place.x,y:place.y},anchor:o.anchor||d.anchor||'free'};}
  function corners(c,o,y0=0,d={}){const t=transform(c,o,y0,d),b=t.basis,halfW=t.width/2,halfH=t.height/2;return[[-halfW,-halfH],[halfW,-halfH],[halfW,halfH],[-halfW,halfH]].map(([x,y])=>add(add(t.center,b.u,x),b.v,y));}
  function selfTest(){const cab={width:600,height:700,depth:130,thickness:1.6};const cases=['front','back','left','right','top','bottom','inside','door'].map(surface=>transform(cab,{surface,x:10,y:20,w:100,h:50,depth:4},{},{}));return{ok:cases.every(x=>Number.isFinite(x.center.x+x.center.y+x.center.z)),cases};}
  window.KENC_ATTACH_ENGINE={version:'1.0.4',canonicalFace,dimensions,basis,anchorOffset,resolveParent,resolveMirror,resolveDepth,normalizePlacement,point,transform,corners,selfTest};
})();