(function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const roleOf=(o,s)=>window.KENC_CAD_MODEL?.roleOf?.(o,s)||(s==='inside'||o.type==='plate'?'internal':(['cut','emboss','anchor'].includes(o.type)?'cutout':(['groundBar','cableHook'].includes(o.type)?'utility':'external')));
  const objectMaterial={face:[0.16,0.19,0.23,0.96],faceSoft:[0.22,0.25,0.29,0.92],glass:[0.48,0.58,0.66,0.16],void:[0.015,0.025,0.04,0.98],edge:[0.88,0.92,0.96,1],detail:[0.72,0.78,0.84,1],dark:[0.04,0.06,0.09,1]};
  const defaults=()=>({yaw:-35,pitch:-18,zoom:1.12,panX:0,panY:0,displayMode:'exterior'});
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
    if(surface==='front'){
      const placement=window.KENC_CAD_MODEL?.frontObjectPlacement?.(c,o,mode,y0);
      if(placement){
        return mat4Mul(translate(placement.center.x,placement.center.y,placement.center.z),mat4Mul(rotY(placement.angle),scale(sx,sy,sz)));
      }
      tx=-w/2+x+ow/2;tz=d/2+th/2+2;
    }
    else if(surface==='back'){tx=w/2-x-ow/2;tz=-d/2-th/2;}
    else if(surface==='inside'){tx=-w/2+x+ow/2;tz=-d/2+Math.max(20,d*.28);sz=Math.max(4,Math.min(10,d*.04));}
    else if(surface==='left'){tx=-w/2-th/2;tz=d/2-x-ow/2;sx=th;sz=ow;}
    else if(surface==='right'){tx=w/2+th/2;tz=-d/2+x+ow/2;sx=th;sz=ow;}
    else if(surface==='top'){tx=-w/2+x+ow/2;ty=y0-h/2-th/2;tz=-d/2+y+oh/2;sy=th;sz=oh;}
    else if(surface==='bottom'){tx=-w/2+x+ow/2;ty=y0+h/2+th/2;tz=d/2-y-oh/2;sy=th;sz=oh;}
    return mat4Mul(translate(tx,ty,tz),scale(sx,sy,sz));
  }
  function localBox(baseM,tx,ty,tz,sx,sy,sz,face=objectMaterial.face,edge=objectMaterial.edge,showFace=true){
    const m=mat4Mul(baseM,mat4Mul(translate(tx,ty,tz),scale(sx,sy,sz)));
    drawBox(m,face,edge,showFace);
  }
  function addObjectDetails(c,y0,o,surface,baseM,role){
    const type=o.type||'';
    const face=type==='acrylicWindow'?objectMaterial.glass:(type==='cut'||type==='anchor'?objectMaterial.void:objectMaterial.face);
    drawBox(baseM,face,objectMaterial.edge,type!=='cut'&&type!=='anchor');

    if(type==='vent'){
      // KENC 표준 5단 와이드 절곡 루버. 판에 붙인 그릴이 아니라 절곡 날개가 전방으로 돌출된다.
      localBox(baseM,0,0,.535,.94,.92,.028,[0.20,0.24,0.29,.98],objectMaterial.edge,true);
      const bladeMetal=[0.43,0.48,0.54,1], bladeEdge=[0.86,0.90,0.94,1], bladeShadow=[0.08,0.10,0.13,1];
      for(let i=0;i<5;i++){
        const yy=-.33+i*.165;
        // 절곡 상면과 전면 날개를 분리해 실제 깊이를 만든다.
        localBox(baseM,0,yy-.025,.61,.82,.045,.15,bladeMetal,bladeEdge,true);
        localBox(baseM,0,yy+.045,.69,.82,.095,.055,[0.30,0.34,0.39,1],bladeEdge,true);
        localBox(baseM,0,yy+.092,.735,.74,.018,.025,bladeShadow,bladeShadow,true);
      }
      localBox(baseM,0,0,.755,.86,.84,.028,[0,0,0,0],bladeEdge,false);
    }else if(type==='key'){
      const chrome=[0.72,0.76,0.80,1], chromeHi=[0.90,0.92,0.94,1], black=[0.035,0.045,0.06,1];
      if(o.option==='탈착키'){
        localBox(baseM,0,0,.58,.62,.88,.12,black,[.35,.38,.42,1],true);
        localBox(baseM,0,-.18,.66,.34,.30,.08,[.01,.015,.02,1],[.35,.38,.42,1],true);
        localBox(baseM,0,.20,.68,.16,.16,.06,[0,0,0,0],chromeHi,false);
        localBox(baseM,0,.29,.70,.035,.19,.035,chromeHi,chromeHi,true);
      }else if(o.option==='푸쉬버튼키'){
        localBox(baseM,0,0,.58,.58,.92,.11,chrome,[.25,.28,.32,1],true);
        localBox(baseM,0,-.18,.67,.31,.34,.08,[.24,.28,.33,1],[.12,.14,.17,1],true);
        localBox(baseM,0,.17,.67,.34,.12,.07,chromeHi,[.35,.38,.42,1],true);
        localBox(baseM,0,.34,.68,.13,.13,.07,chromeHi,[.20,.22,.25,1],true);
      }else{
        localBox(baseM,0,0,.58,.58,.94,.11,chrome,[.25,.28,.32,1],true);
        localBox(baseM,0,-.29,.67,.33,.12,.07,[.25,.29,.34,1],[.14,.16,.19,1],true);
        localBox(baseM,0,-.01,.67,.30,.34,.075,[.45,.49,.54,1],[.22,.25,.28,1],true);
        localBox(baseM,0,.26,.68,.33,.11,.07,chromeHi,[.30,.32,.35,1],true);
        localBox(baseM,0,.39,.68,.12,.12,.07,chromeHi,[.20,.22,.25,1],true);
      }
    }else if(type==='nameplate'){
      localBox(baseM,0,0,.58,.96,.92,.055,[.96,.96,.91,1],[.32,.35,.39,1],true);
      localBox(baseM,0,0,.615,.90,.78,.018,[0,0,0,0],[.72,.75,.78,1],false);
    }else if(type==='acrylicWindow'){
      // ABS 프레임 + 투명 아크릴 + 실제 돌출 두께
      localBox(baseM,0,0,.57,.98,.98,.075,[.78,.80,.82,1],[.25,.28,.32,1],true);
      localBox(baseM,0,0,.625,.84,.84,.035,[.35,.70,.86,.20],[.18,.62,.78,.85],true);
      localBox(baseM,-.18,-.20,.652,.30,.028,.012,[.88,.96,1,.70],[.88,.96,1,.70],true);
      localBox(baseM,-.05,-.12,.653,.34,.022,.010,[.76,.92,1,.55],[.76,.92,1,.55],true);
    }else if(type==='doubleLock'){
      const steel=[.72,.75,.78,1], edge=[.25,.28,.31,1];
      if(o.option==='카바용'){
        localBox(baseM,0,0,.60,.84,.22,.075,steel,edge,true);
        localBox(baseM,0,0,.67,.20,.20,.055,[0,0,0,0],edge,false);
      }else{
        localBox(baseM,0,.20,.59,.24,.38,.10,steel,edge,true);
        localBox(baseM,0,-.12,.67,.46,.46,.085,[0,0,0,0],edge,false);
        localBox(baseM,0,-.12,.69,.20,.20,.055,[0,0,0,0],edge,false);
      }
    }else if(type==='emboss'){
      localBox(baseM,0,0,.57,.62,.62,.08,objectMaterial.faceSoft,objectMaterial.detail,true);
      localBox(baseM,0,0,.63,.34,.34,.05,objectMaterial.dark,objectMaterial.detail,true);
    }else if(type==='cut'){
      localBox(baseM,0,0,.58,.76,.76,.03,[0,0,0,0],objectMaterial.edge,false);
      localBox(baseM,0,0,.60,.04,.86,.03,objectMaterial.detail,objectMaterial.detail,true);
      localBox(baseM,0,0,.60,.86,.04,.03,objectMaterial.detail,objectMaterial.detail,true);
    }else if(type==='anchor'){
      localBox(baseM,0,0,.60,.34,.34,.10,objectMaterial.dark,objectMaterial.edge,true);
    }else if(type==='plate'){
      const variant=(o.variant||'') || (o.option==='철속판'?'steel_plain':((o.option==='빼끄판'||o.option==='베크라이트 절연판')?'bakelite_yellow':'pvc_perforated'));
      const pvc=[.57,.60,.61,1], pvcEdge=[.18,.22,.24,1], steel=[.72,.75,.77,1], steelEdge=[.22,.25,.28,1], bak=[.78,.57,.10,1], bakEdge=[.31,.22,.05,1];
      const face=variant==='bakelite_yellow'?bak:(variant==='steel_plain'?steel:pvc), edge=variant==='bakelite_yellow'?bakEdge:(variant==='steel_plain'?steelEdge:pvcEdge);
      const thick=variant==='bakelite_yellow'?.070:(variant==='steel_plain'?.032:.060);
      localBox(baseM,0,0,.56,.94,.94,thick,face,edge,true);
      // 얇은 가장자리와 실제 판 두께를 구분하는 안쪽 테두리
      localBox(baseM,0,0,.565,.88,.88,.012,[0,0,0,0],variant==='bakelite_yellow'?[.92,.72,.22,1]:[.84,.87,.88,1],false);
      // 네 모서리 장공: 실제 관통부처럼 어두운 슬롯과 밝은 가장자리
      [[-.405,-.405,-45],[.405,-.405,45],[-.405,.405,45],[.405,.405,-45]].forEach(([x,y,a])=>{
        const sm=mat4Mul(baseM,mat4Mul(translate(x,y,.08),rotateZ(a*Math.PI/180)));
        localBox(sm,0,0,0,.12,.035,.025,[.035,.045,.055,1],edge,true);
      });
      if(variant==='pvc_perforated'){
        // 확대 시에도 과부하가 없도록 대표 미세 타공을 실제 깊이 점으로 표시
        for(let iy=-5;iy<=5;iy++)for(let ix=-4;ix<=4;ix++){
          if((Math.abs(ix)>=4&&Math.abs(iy)>=4))continue;
          localBox(baseM,ix*.085,iy*.072,.078,.013,.013,.020,[.10,.12,.13,1],pvcEdge,true);
        }
        localBox(baseM,0,0,.082,.034,.034,.022,[.05,.06,.07,1],pvcEdge,true);
      }else if(variant==='steel_plain'){
        localBox(baseM,-.12,-.30,.08,.48,.008,.008,[.93,.95,.96,.55],[.93,.95,.96,.55],true);
      }else{
        localBox(baseM,-.08,-.30,.09,.56,.008,.008,[.94,.74,.22,.55],[.94,.74,.22,.55],true);
      }
    }else if(type==='groundBar'){
      localBox(baseM,0,0,.58,.84,.28,.10,objectMaterial.faceSoft,objectMaterial.edge,true);
      for(let i=-3;i<=3;i++) localBox(baseM,i*.11,0,.65,.035,.09,.05,objectMaterial.dark,objectMaterial.detail,true);
    }else if(type==='cableHook'){
      if(o.option==='수평'){
        localBox(baseM,0,-.24,.58,.78,.12,.10,objectMaterial.faceSoft,objectMaterial.edge,true);
        localBox(baseM,-.34,.08,.58,.10,.54,.10,objectMaterial.faceSoft,objectMaterial.edge,true);
        localBox(baseM,.34,.08,.58,.10,.54,.10,objectMaterial.faceSoft,objectMaterial.edge,true);
      }else{
        const dir=o.option&&o.option.includes('왼쪽')?-1:1;
        localBox(baseM,dir*.18,0,.58,.12,.78,.10,objectMaterial.faceSoft,objectMaterial.edge,true);
        localBox(baseM,0,.30,.58,.48,.12,.10,objectMaterial.faceSoft,objectMaterial.edge,true);
      }
    }else if(type==='cover'){
      localBox(baseM,0,0,.56,.88,.88,.04,[0,0,0,0],objectMaterial.detail,false);
      [[0,-.38],[0,.38],[-.38,0],[.38,0]].forEach(([x,y])=>localBox(baseM,x,y,.62,.045,.045,.05,objectMaterial.dark,objectMaterial.detail,true));
    }else if(type==='doubleLock'){
      localBox(baseM,.10,0,.58,.18,.78,.10,objectMaterial.faceSoft,objectMaterial.edge,true);
      localBox(baseM,-.18,.28,.58,.44,.12,.10,objectMaterial.faceSoft,objectMaterial.edge,true);
    }
  }
  function cabinetParts(c,yCenter,mode){
    const w=+c.width,h=+c.height,d=+c.depth,t=Math.max(6,Math.min(18,d*.08));const out=[];
    const bodyAlpha=mode==='xray'?.07:(mode==='open'?.09:(mode==='section'?.12:(mode==='exploded'?.13:.28))),edge=[.78,.86,.94,1];
    const push=(name,m,color=[.25,.29,.34,bodyAlpha],show=true)=>show&&out.push({name,m,color,edge});
    push('back',mat4Mul(translate(0,yCenter,-d/2+t/2),scale(w,h,t)));
    push('left',mat4Mul(translate(-w/2+t/2,yCenter,0),scale(t,h,d)));
    push('right',mat4Mul(translate(w/2-t/2,yCenter,0),scale(t,h,d)),undefined,mode!=='section');
    push('top',mat4Mul(translate(0,yCenter-h/2+t/2,0),scale(w,t,d)));
    push('bottom',mat4Mul(translate(0,yCenter+h/2-t/2,0),scale(w,t,d)));
    if(mode==='exterior'||mode==='xray')push('door',mat4Mul(translate(0,yCenter,d/2+t/2),scale(w,h,t)),[.20,.24,.29,mode==='xray'?.055:.34]);
    if(mode==='open'||mode==='exploded'){
      const pose=window.KENC_CAD_MODEL?.doorPose?.(c,mode,yCenter)||{angle:(mode==='open'?82:8)*Math.PI/180,hingeX:w/2+(mode==='exploded'?w*.60:0),hingeY:yCenter,hingeZ:d/2+(mode==='exploded'?w*.60:0)*.15};
      const door=mat4Mul(translate(pose.hingeX,pose.hingeY,pose.hingeZ),mat4Mul(rotY(pose.angle),mat4Mul(translate(-w/2,0,0),scale(w,h,t))));push('door',door,[.24,.28,.32,mode==='open'?.075:.18]);
    }
    if(mode==='exploded')push('rear-exploded',mat4Mul(translate(w*.22,yCenter,-d/2-Math.max(d*1.8,w*.22)),scale(w,h,t)),[.20,.24,.29,.22]);
    return out;
  }
  function sceneBounds(cabs){const total=cabs.reduce((a,c)=>a+(+c.height||0),0),maxW=Math.max(...cabs.map(c=>+c.width||1)),maxD=Math.max(...cabs.map(c=>+c.depth||1));return{total,maxW,maxD,size:Math.max(total,maxW,maxD)};}
  function renderWebGL(ctx){ctxCache=ctx;ensureCanvas(ctx.svg);const s=ctx.state,v=s.live3dView||(s.live3dView=defaults()),cabs=(s.mode3d==='stack'?s.cabinets:[ctx.currentCabinet]).filter(Boolean);if(!cabs.length)return;
    resize();gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.018,.035,.058,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
    const b=sceneBounds(cabs),aspect=canvas.width/canvas.height,mode=v.displayMode||'exterior',frameFactor=mode==='exploded'?.72:(mode==='open'?.62:.56),span=b.size*frameFactor/Math.max(v.zoom,.05);const proj=ortho(-span*aspect,span*aspect,span,-span,-b.size*5,b.size*5);const cam=mat4Mul(translate((v.panX||0)*b.size/350,(v.panY||0)*b.size/350,0),mat4Mul(rotX(v.pitch*Math.PI/180),rotY(v.yaw*Math.PI/180)));const vp=mat4Mul(proj,cam);
    const revealAll=['xray','open','section','exploded'].includes(mode);
    let off=-b.total/2;
    const cabinetQueue=[],objectQueue=[];
    cabs.forEach(c=>{const yCenter=off+(+c.height||0)/2;off+=+c.height||0;
      cabinetParts(c,yCenter,mode).forEach(p=>cabinetQueue.push({p,c,yCenter}));
      (c.objects||[]).forEach(o=>{const surface=o.surface||'front';if(mode==='exterior'&&surface==='inside')return;objectQueue.push({c,yCenter,o,surface,role:roleOf(o,surface),m:faceTransform(c,yCenter,surface,o,mode)});});
    });
    if(revealAll)gl.depthMask(false);
    cabinetQueue.forEach(({p})=>drawBox(mat4Mul(vp,p.m),p.color,p.edge,true));
    gl.depthMask(true);
    if(revealAll)gl.disable(gl.DEPTH_TEST);
    objectQueue.forEach(({c,yCenter,o,surface,role,m})=>addObjectDetails(c,yCenter,o,surface,mat4Mul(vp,m),role));
    if(revealAll)gl.enable(gl.DEPTH_TEST);
    syncButtons();}
  function ensureCanvas(svg){if(canvas&&canvas.isConnected)return;const wrap=svg.parentElement;canvas=document.createElement('canvas');canvas.className='kenc-webgl-3d-canvas';canvas.setAttribute('aria-label','WebGL 실시간 3D 미리보기');svg.style.display='none';wrap.appendChild(canvas);gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});if(!gl){svg.style.display='';canvas.remove();canvas=null;return;}initGL();bindCanvas();}
  function resize(){if(!canvas)return;const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);const w=Math.max(2,Math.round(r.width*dpr)),h=Math.max(2,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
  function redraw(){if(ctxCache&&gl)renderWebGL(ctxCache);}
  function setPreset(name){const v=view();if(name==='front')Object.assign(v,{yaw:0,pitch:0,zoom:1.12,panX:0,panY:0});else Object.assign(v,{yaw:-35,pitch:-18,zoom:1.12,panX:0,panY:0});redraw();}
  function setMode(m){view().displayMode=m;redraw();}
  function syncButtons(){const v=view();document.querySelectorAll('#drawingPanel [data-3d-view-mode]').forEach(b=>b.classList.toggle('active',b.dataset['3dViewMode']===v.displayMode));}
  function bindCanvas(){
    canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const v=view();drag={x:e.clientX,y:e.clientY,yaw:v.yaw,pitch:v.pitch,panX:v.panX||0,panY:v.panY||0,pan:e.button===1||e.button===2||e.shiftKey};e.preventDefault();});
    canvas.addEventListener('pointermove',e=>{if(!drag||!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const v=view();if(pointers.size>=2){const pts=[...pointers.values()],dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),cx=(pts[0].x+pts[1].x)/2,cy=(pts[0].y+pts[1].y)/2;if(!pinch)pinch={dist,zoom:v.zoom,cx,cy,panX:v.panX||0,panY:v.panY||0};v.zoom=clamp(pinch.zoom*dist/Math.max(pinch.dist,1),.25,7);v.panX=pinch.panX+cx-pinch.cx;v.panY=pinch.panY+cy-pinch.cy;}else if(drag.pan){v.panX=drag.panX+e.clientX-drag.x;v.panY=drag.panY+e.clientY-drag.y;}else{v.yaw=drag.yaw+(e.clientX-drag.x)*.55;v.pitch=clamp(drag.pitch+(e.clientY-drag.y)*.45,-89,89);}redraw();e.preventDefault();});
    const end=e=>{pointers.delete(e.pointerId);if(!pointers.size){drag=null;pinch=null;}};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{const v=view();v.zoom=clamp(v.zoom*Math.exp(-e.deltaY*.0015),.25,7);redraw();e.preventDefault();},{passive:false});canvas.addEventListener('dblclick',()=>setPreset('reset'));window.addEventListener('resize',redraw);
  }
  document.addEventListener('click',e=>{const mb=e.target.closest('#drawingPanel [data-3d-view-mode]');if(mb){e.preventDefault();e.stopImmediatePropagation();setMode(mb.dataset['3dViewMode']);return;}const b=e.target.closest('#drawingPanel [data-3d-action]');if(!b)return;const a=b.dataset['3dAction'];if(['front','iso','fit','reset'].includes(a)){e.preventDefault();e.stopImmediatePropagation();setPreset(a==='front'?'front':'reset');}},true);
  window.KENC3DViewer={render:renderWebGL,reset:()=>setPreset('reset'),setMode};
  const boot=()=>setTimeout(()=>window.KENC_DRAWING_API?.renderAll?.(),0);
  if(window.KENC_DRAWING_API)boot();else document.addEventListener('kenc:drawing-api-ready',boot,{once:true});
})();
