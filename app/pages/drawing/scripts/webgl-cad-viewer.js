(function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const roleOf=(o,s)=>s==='inside'||o.type==='plate'?'internal':(['cut','emboss','anchor'].includes(o.type)?'cutout':(['groundBar','cableHook'].includes(o.type)?'utility':'external'));
  const roleColor={external:[0.22,0.74,0.98,1],internal:[0.20,0.83,0.60,1],cutout:[0.96,0.62,0.08,1],utility:[0.76,0.52,0.98,1]};
  const defaults=()=>({yaw:-35,pitch:-18,zoom:1,panX:0,panY:0,displayMode:'exterior'});
  let canvas,gl,program,posLoc,colorLoc,mvpLoc,buffer,ctxCache,drag=null,pointers=new Map(),pinch=null;
  function state(){return window.KENC_DRAWING_API?.getState?.();}
  function view(){const s=state(); if(!s)return defaults(); return s.live3dView||(s.live3dView=defaults());}
  function mat4Identity(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
  function mat4Mul(a,b){const o=new Array(16).fill(0);for(let r=0;r<4;r++)for(let c=0;c<4;c++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
  function translate(x,y,z){const m=mat4Identity();m[12]=x;m[13]=y;m[14]=z;return m;}
  function scale(x,y,z){const m=mat4Identity();m[0]=x;m[5]=y;m[10]=z;return m;}
  function rotX(a){const c=Math.cos(a),s=Math.sin(a),m=mat4Identity();m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;}
  function rotY(a){const c=Math.cos(a),s=Math.sin(a),m=mat4Identity();m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;}
  function ortho(l,r,b,t,n,f){const m=mat4Identity();m[0]=2/(r-l);m[5]=2/(t-b);m[10]=-2/(f-n);m[12]=-(r+l)/(r-l);m[13]=-(t+b)/(t-b);m[14]=-(f+n)/(f-n);return m;}
  function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  function initGL(){
    const vs=`attribute vec3 a_position;uniform mat4 u_mvp;void main(){gl_Position=u_mvp*vec4(a_position,1.0);}`;
    const fs=`precision mediump float;uniform vec4 u_color;void main(){gl_FragColor=u_color;}`;
    program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
    posLoc=gl.getAttribLocation(program,'a_position');colorLoc=gl.getUniformLocation(program,'u_color');mvpLoc=gl.getUniformLocation(program,'u_mvp');buffer=gl.createBuffer();
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  }
  const cubeVerts=[-0.5,-0.5,-0.5, .5,-.5,-.5, .5,.5,-.5, -.5,-.5,-.5, .5,.5,-.5, -.5,.5,-.5,
    -.5,-.5,.5, .5,.5,.5, .5,-.5,.5, -.5,-.5,.5, -.5,.5,.5, .5,.5,.5,
    -.5,-.5,-.5, -.5,.5,-.5, -.5,.5,.5, -.5,-.5,-.5, -.5,.5,.5, -.5,-.5,.5,
    .5,-.5,-.5, .5,-.5,.5, .5,.5,.5, .5,-.5,-.5, .5,.5,.5, .5,.5,-.5,
    -.5,-.5,-.5, -.5,-.5,.5, .5,-.5,.5, -.5,-.5,-.5, .5,-.5,.5, .5,-.5,-.5,
    -.5,.5,-.5, .5,.5,.5, -.5,.5,.5, -.5,.5,-.5, .5,.5,-.5, .5,.5,.5];
  const edgeVerts=[-.5,-.5,-.5,.5,-.5,-.5,.5,-.5,-.5,.5,.5,-.5,.5,.5,-.5,-.5,.5,-.5,-.5,.5,-.5,-.5,-.5,-.5,
    -.5,-.5,.5,.5,-.5,.5,.5,-.5,.5,.5,.5,.5,.5,.5,.5,-.5,.5,.5,-.5,.5,.5,-.5,-.5,.5,
    -.5,-.5,-.5,-.5,-.5,.5,.5,-.5,-.5,.5,-.5,.5,.5,.5,-.5,.5,.5,.5,-.5,.5,-.5,-.5,.5,.5];
  function drawGeom(vertices,mode,color,matrix){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(posLoc);gl.vertexAttribPointer(posLoc,3,gl.FLOAT,false,0,0);gl.uniform4fv(colorLoc,color);gl.uniformMatrix4fv(mvpLoc,false,new Float32Array(matrix));gl.drawArrays(mode,0,vertices.length/3);}
  function drawBox(m,color,edge=[0.85,0.92,1,1],face=true){if(face)drawGeom(cubeVerts,gl.TRIANGLES,color,m);drawGeom(edgeVerts,gl.LINES,edge,m);}
  function faceTransform(c,y0,surface,o,mode){const w=c.width,h=c.height,d=c.depth,ow=o.w||20,oh=o.h||20,x=o.x||0,y=o.y||0,th=Math.max(3,Math.min(12,d*.05));let tx=0,ty=y0+y+oh/2-h/2,tz=0,sx=ow,sy=oh,sz=th;
    if(surface==='front'){tx=-w/2+x+ow/2;tz=d/2+th/2+2;if(mode==='open'||mode==='exploded'){const ang=(mode==='open'?-82:-8)*Math.PI/180,ex=mode==='exploded'?w*.60:0;const lx=x+ow/2;tx=-w/2-ex+Math.cos(ang)*lx;tz=d/2+ex*.15-Math.sin(ang)*lx;return mat4Mul(translate(tx,ty,tz),mat4Mul(rotY(-ang),scale(sx,sy,sz)));}}
    else if(surface==='back'){tx=w/2-x-ow/2;tz=-d/2-th/2;}
    else if(surface==='inside'){tx=-w/2+x+ow/2;tz=-d/2+Math.max(20,d*.28);sz=Math.max(4,Math.min(10,d*.04));}
    else if(surface==='left'){tx=-w/2-th/2;tz=d/2-x-ow/2;sx=th;sz=ow;}
    else if(surface==='right'){tx=w/2+th/2;tz=-d/2+x+ow/2;sx=th;sz=ow;}
    else if(surface==='top'){tx=-w/2+x+ow/2;ty=y0-h/2-th/2;tz=-d/2+y+oh/2;sy=th;sz=oh;}
    else if(surface==='bottom'){tx=-w/2+x+ow/2;ty=y0+h/2+th/2;tz=d/2-y-oh/2;sy=th;sz=oh;}
    return mat4Mul(translate(tx,ty,tz),scale(sx,sy,sz));
  }
  function addObjectDetails(c,y0,o,surface,baseM,role){
    const col=roleColor[role]||roleColor.external; drawBox(baseM,[col[0],col[1],col[2],role==='internal'?.46:.78],col,true);
    if(o.type==='vent'){const n=5;for(let i=0;i<n;i++){const yy=((i-(n-1)/2)/(n+1))*(o.h||60);const m=mat4Mul(baseM,mat4Mul(translate(0,yy/(o.h||60),.56),scale(.72,.035,.1)));drawBox(m,[.04,.08,.12,1],col,true);}}
    if(o.type==='nameplate'){const m=mat4Mul(baseM,mat4Mul(translate(0,0,.56),scale(.72,.18,.08)));drawBox(m,[.94,.96,.98,1],col,true);}
    if(o.type==='cut'||o.type==='anchor'){drawBox(baseM,[.03,.05,.08,.95],col,false);}
  }
  function cabinetParts(c,yCenter,mode){
    const w=+c.width,h=+c.height,d=+c.depth,t=Math.max(6,Math.min(18,d*.08));const out=[];
    const bodyAlpha=mode==='xray'?.12:(mode==='section'?.16:.28),edge=[.78,.86,.94,1];
    const push=(name,m,color=[.25,.29,.34,bodyAlpha],show=true)=>show&&out.push({name,m,color,edge});
    push('back',mat4Mul(translate(0,yCenter,-d/2+t/2),scale(w,h,t)));
    push('left',mat4Mul(translate(-w/2+t/2,yCenter,0),scale(t,h,d)));
    push('right',mat4Mul(translate(w/2-t/2,yCenter,0),scale(t,h,d)),undefined,mode!=='section');
    push('top',mat4Mul(translate(0,yCenter-h/2+t/2,0),scale(w,t,d)));
    push('bottom',mat4Mul(translate(0,yCenter+h/2-t/2,0),scale(w,t,d)));
    if(mode==='exterior'||mode==='xray')push('door',mat4Mul(translate(0,yCenter,d/2+t/2),scale(w,h,t)),[.20,.24,.29,mode==='xray'?.10:.34]);
    if(mode==='open'||mode==='exploded'){
      const ang=(mode==='open'?-82:-8)*Math.PI/180,ex=mode==='exploded'?w*.60:0;
      const door=mat4Mul(translate(-w/2-ex,yCenter,d/2+ex*.15),mat4Mul(rotY(-ang),mat4Mul(translate(w/2,0,0),scale(w,h,t))));push('door',door,[.24,.28,.32,.32]);
    }
    if(mode==='exploded')push('rear-exploded',mat4Mul(translate(w*.22,yCenter,-d/2-Math.max(d*1.8,w*.22)),scale(w,h,t)),[.20,.24,.29,.22]);
    return out;
  }
  function sceneBounds(cabs){const total=cabs.reduce((a,c)=>a+(+c.height||0),0),maxW=Math.max(...cabs.map(c=>+c.width||1)),maxD=Math.max(...cabs.map(c=>+c.depth||1));return{total,maxW,maxD,size:Math.max(total,maxW,maxD)};}
  function renderWebGL(ctx){ctxCache=ctx;ensureCanvas(ctx.svg);const s=ctx.state,v=s.live3dView||(s.live3dView=defaults()),cabs=(s.mode3d==='stack'?s.cabinets:[ctx.currentCabinet]).filter(Boolean);if(!cabs.length)return;
    resize();gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.018,.035,.058,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
    const b=sceneBounds(cabs),aspect=canvas.width/canvas.height,span=b.size*0.72/Math.max(v.zoom,.05);const proj=ortho(-span*aspect,span*aspect,span,-span,-b.size*5,b.size*5);const cam=mat4Mul(translate((v.panX||0)*b.size/350,(v.panY||0)*b.size/350,0),mat4Mul(rotX(v.pitch*Math.PI/180),rotY(v.yaw*Math.PI/180)));const vp=mat4Mul(proj,cam);
    let off=-b.total/2;cabs.forEach(c=>{const yCenter=off+(+c.height||0)/2;off+=+c.height||0;cabinetParts(c,yCenter,v.displayMode||'exterior').forEach(p=>drawBox(mat4Mul(vp,p.m),p.color,p.edge,true));
      (c.objects||[]).forEach(o=>{const surface=o.surface||'front';if((v.displayMode==='exterior')&&surface==='inside')return;const role=roleOf(o,surface),m=faceTransform(c,yCenter,surface,o,v.displayMode||'exterior');addObjectDetails(c,yCenter,o,surface,mat4Mul(vp,m),role);});
    });syncButtons();}
  function ensureCanvas(svg){if(canvas&&canvas.isConnected)return;const wrap=svg.parentElement;canvas=document.createElement('canvas');canvas.className='kenc-webgl-3d-canvas';canvas.setAttribute('aria-label','WebGL 실시간 3D 미리보기');svg.style.display='none';wrap.appendChild(canvas);gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});if(!gl){svg.style.display='';canvas.remove();canvas=null;return;}initGL();bindCanvas();}
  function resize(){if(!canvas)return;const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);const w=Math.max(2,Math.round(r.width*dpr)),h=Math.max(2,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
  function redraw(){if(ctxCache&&gl)renderWebGL(ctxCache);}
  function setPreset(name){const v=view();if(name==='front')Object.assign(v,{yaw:0,pitch:0,zoom:1,panX:0,panY:0});else Object.assign(v,{yaw:-35,pitch:-18,zoom:1,panX:0,panY:0});redraw();}
  function setMode(m){view().displayMode=m;redraw();}
  function syncButtons(){const v=view();document.querySelectorAll('#drawingPanel [data-3d-view-mode]').forEach(b=>b.classList.toggle('active',b.dataset['3dViewMode']===v.displayMode));}
  function bindCanvas(){
    canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const v=view();drag={x:e.clientX,y:e.clientY,yaw:v.yaw,pitch:v.pitch,panX:v.panX||0,panY:v.panY||0,pan:e.button===1||e.button===2||e.shiftKey};e.preventDefault();});
    canvas.addEventListener('pointermove',e=>{if(!drag||!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const v=view();if(pointers.size>=2){const pts=[...pointers.values()],dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),cx=(pts[0].x+pts[1].x)/2,cy=(pts[0].y+pts[1].y)/2;if(!pinch)pinch={dist,zoom:v.zoom,cx,cy,panX:v.panX||0,panY:v.panY||0};v.zoom=clamp(pinch.zoom*dist/Math.max(pinch.dist,1),.25,7);v.panX=pinch.panX+cx-pinch.cx;v.panY=pinch.panY+cy-pinch.cy;}else if(drag.pan){v.panX=drag.panX+e.clientX-drag.x;v.panY=drag.panY+e.clientY-drag.y;}else{v.yaw=drag.yaw+(e.clientX-drag.x)*.55;v.pitch=clamp(drag.pitch+(e.clientY-drag.y)*.45,-89,89);}redraw();e.preventDefault();});
    const end=e=>{pointers.delete(e.pointerId);if(!pointers.size){drag=null;pinch=null;}};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{const v=view();v.zoom=clamp(v.zoom*Math.exp(-e.deltaY*.0015),.25,7);redraw();e.preventDefault();},{passive:false});canvas.addEventListener('dblclick',()=>setPreset('reset'));window.addEventListener('resize',redraw);
  }
  document.addEventListener('click',e=>{const mb=e.target.closest('#drawingPanel [data-3d-view-mode]');if(mb){e.preventDefault();e.stopImmediatePropagation();setMode(mb.dataset['3dViewMode']);return;}const b=e.target.closest('#drawingPanel [data-3d-action]');if(!b)return;const a=b.dataset['3dAction'];if(['front','iso','fit','reset'].includes(a)){e.preventDefault();e.stopImmediatePropagation();setPreset(a==='front'?'front':'reset');}},true);
  window.KENC3DViewer={render:renderWebGL,reset:()=>setPreset('reset'),setMode};
})();
