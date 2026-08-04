(function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const roleOf=(o,s)=>window.KENC_CAD_MODEL?.roleOf?.(o,s)||(s==='inside'||o.type==='plate'?'internal':(['cut','emboss','anchor'].includes(o.type)?'cutout':(['groundBar','cableHook'].includes(o.type)?'utility':'external')));
  const objectMaterial={face:[0.28,0.31,0.34,0.98],faceSoft:[0.42,0.45,0.48,0.96],glass:[0.38,0.72,0.88,0.18],void:[0.008,0.012,0.018,0.99],edge:[0.90,0.93,0.95,1],detail:[0.78,0.81,0.84,1],dark:[0.025,0.035,0.045,1]};
  const defaults=()=>({yaw:-35,pitch:-18,zoom:1.12,panX:0,panY:0,displayMode:'exterior',quality:'realistic'});
  let canvas,gl,program,posLoc,colorLoc,mvpLoc,buffer,ctxCache,drag=null,pointers=new Map(),pinch=null;
  function state(){return window.KENC_DRAWING_API?.getState?.();}
  function view(){const s=state(); if(!s)return defaults(); return s.live3dView||(s.live3dView=defaults());}
  function mat4Identity(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
  function mat4Mul(a,b){const o=new Array(16).fill(0);for(let r=0;r<4;r++)for(let c=0;c<4;c++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
  function translate(x,y,z){const m=mat4Identity();m[12]=x;m[13]=y;m[14]=z;return m;}
  function scale(x,y,z){const m=mat4Identity();m[0]=x;m[5]=y;m[10]=z;return m;}
  function rotX(a){const c=Math.cos(a),s=Math.sin(a),m=mat4Identity();m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;}
  function rotY(a){const c=Math.cos(a),s=Math.sin(a),m=mat4Identity();m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;}
  function rotateZ(a){const c=Math.cos(a),s=Math.sin(a),m=mat4Identity();m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;}
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
  function localDisc(baseM,tx,ty,tz,rx,ry,face=objectMaterial.dark,edge=objectMaterial.edge,segments=40){
    const fan=[0,0,0];
    for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;fan.push(Math.cos(a)*.5,Math.sin(a)*.5,0);}
    const loop=[];for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;loop.push(Math.cos(a)*.5,Math.sin(a)*.5,0);}
    const m=mat4Mul(baseM,mat4Mul(translate(tx,ty,tz),scale(rx*2,ry*2,1)));
    drawGeom(fan,gl.TRIANGLE_FAN,face,m);drawGeom(loop,gl.LINE_LOOP,edge,m);
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
      const round=(o.option||'').includes('원형');
      // 얕게 눌린 프레스 자국과 점선 절개 예정부. 내부는 막혀 있어 관통되지 않는다.
      if(round){
        localDisc(baseM,0,.018,.606,.365,.365,[.17,.20,.24,.96],[.48,.53,.59,1],48);
        localDisc(baseM,0,-.012,.626,.325,.325,[.23,.26,.30,.96],[.86,.90,.94,1],48);
        localDisc(baseM,-.07,-.09,.642,.22,.045,[.76,.80,.84,.42],[.76,.80,.84,.42],32);
      }else{
        localBox(baseM,0,.018,.606,.72,.72,.035,[.17,.20,.24,.96],[.48,.53,.59,1],true);
        localBox(baseM,0,-.012,.628,.64,.64,.020,[.23,.26,.30,.96],[.86,.90,.94,1],false);
        localBox(baseM,-.08,-.27,.642,.42,.025,.012,[.76,.80,.84,.42],[.76,.80,.84,.42],true);
      }
    }else if(type==='cut'){
      const round=(o.option||'')==='원형타공';
      // 실제 관통부: 어두운 공극, 철판 림, 안쪽 깊이 그림자를 별도 레이어로 표현한다.
      if(round){
        localDisc(baseM,0,0,.606,.405,.405,[.02,.03,.05,1],[.86,.90,.94,1],48);
        localDisc(baseM,0,.020,.635,.342,.342,[.005,.008,.014,1],[.20,.24,.29,1],48);
        localDisc(baseM,-.08,-.12,.652,.22,.032,[.90,.94,.98,.36],[.90,.94,.98,.36],32);
      }else{
        localBox(baseM,0,0,.606,.82,.82,.045,[0,0,0,0],[.86,.90,.94,1],false);
        localBox(baseM,0,.020,.634,.72,.72,.050,[.005,.008,.014,1],[.20,.24,.29,1],true);
        localBox(baseM,-.08,-.31,.655,.46,.024,.014,[.90,.94,.98,.36],[.90,.94,.98,.36],true);
      }
    }else if(type==='anchor'){
      const screw=(o.option||'').includes('피스'), ring=screw?.22:.38, inner=screw?.15:.29;
      localDisc(baseM,0,0,.606,ring,ring,[.76,.80,.84,1],[.24,.28,.32,1],40);
      localDisc(baseM,0,.018,.638,inner,inner,[.005,.008,.014,1],[.10,.13,.16,1],40);
      localDisc(baseM,-.08,-.10,.655,inner*.60,.025,[.92,.95,.98,.42],[.92,.95,.98,.42],28);
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
      const copper=(o.option||'').includes('동접지'), left=(o.option||'').includes('좌(');
      const face=copper?[.72,.36,.12,1]:[.62,.67,.71,1], edge=copper?[.30,.13,.04,1]:[.22,.26,.30,1], bright=copper?[.95,.58,.28,1]:[.86,.90,.93,1];
      const bx=left?-.34:.34;
      localBox(baseM,bx,0,.58,.18,.88,.075,face,edge,true);
      localBox(baseM,bx-.035,0,.622,.025,.80,.014,bright,bright,true);
      for(let i=-2.5;i<=2.5;i++){
        const yy=i*.14, dir=left?1:-1, sx=bx+dir*.12;
        localBox(baseM,sx+dir*.16,yy,.62,.32,.035,.035,edge,edge,true);
        localBox(baseM,sx+dir*.34,yy,.63,.075,.075,.055,face,edge,true);
        localBox(baseM,sx+dir*.34,yy,.664,.028,.028,.012,bright,bright,true);
      }
      localBox(baseM,bx,-.39,.63,.07,.07,.04,[.03,.04,.05,1],edge,true);
      localBox(baseM,bx,.39,.63,.07,.07,.04,[.03,.04,.05,1],edge,true);
    }else if(type==='cableHook'){
      const left=(o.option||'').includes('왼쪽'), face=[.68,.72,.75,1], edge=[.25,.29,.33,1], weld=[.40,.44,.48,1];
      localBox(baseM,0,-.08,.58,.88,.18,.075,face,edge,true);
      // 양 끝 태그용접부
      localBox(baseM,-.40,-.08,.63,.055,.25,.045,weld,edge,true);
      localBox(baseM,.40,-.08,.63,.055,.25,.045,weld,edge,true);
      // 절곡된 케이블 받침: 좌/우 방향에 따라 개방부 반전
      const dir=left?1:-1;
      localBox(baseM,-dir*.10,.12,.60,.55,.10,.09,face,edge,true);
      localBox(baseM,dir*.20,.30,.60,.10,.40,.09,face,edge,true);
      localBox(baseM,dir*.28,.46,.60,.22,.09,.09,face,edge,true);
    }else if(type==='cover'){
      const face=[.48,.55,.50,1],edge=[.16,.20,.17,1],shine=[.78,.84,.80,1],screw=[.76,.80,.83,1];
      localBox(baseM,.018,.018,.565,.90,.86,.070,[.18,.22,.19,.36],edge,true);
      localBox(baseM,0,0,.60,.90,.86,.055,face,edge,true);
      localBox(baseM,-.12,-.34,.635,.58,.015,.010,shine,shine,true);
      [[0,-.37],[0,.37],[-.39,0],[.39,0]].forEach(([x,y])=>{
        localDisc(baseM,x,y,.655,.050,.050,screw,edge,28);
        localBox(baseM,x,y,.687,.060,.012,.008,edge,edge,true);
        localBox(baseM,x,y,.688,.012,.060,.008,edge,edge,true);
      });
    }else if(type==='doubleLock'){
      localBox(baseM,.10,0,.58,.18,.78,.10,objectMaterial.faceSoft,objectMaterial.edge,true);
      localBox(baseM,-.18,.28,.58,.44,.12,.10,objectMaterial.faceSoft,objectMaterial.edge,true);
    }
  }
  function cabinetParts(c,yCenter,mode){
    const w=+c.width,h=+c.height,d=+c.depth,t=Math.max(6,Math.min(18,d*.08));const out=[];
    const realistic=(view().quality||'realistic')==='realistic';
    const bodyAlpha=mode==='xray'?.07:(mode==='open'?.09:(mode==='section'?.12:(mode==='exploded'?.13:.28))),edge=[.78,.86,.94,1];
    const powder=realistic?[.40,.43,.45,bodyAlpha]:[.25,.29,.34,bodyAlpha];
    const push=(name,m,color=powder,show=true,customEdge=edge)=>show&&out.push({name,m,color,edge:customEdge});
    const part=(base,tx,ty,tz,sx,sy,sz)=>mat4Mul(base,mat4Mul(translate(tx,ty,tz),scale(sx,sy,sz)));

    // 본체는 실제 절곡 조립체처럼 후판·측판·상하판을 독립 부품으로 구성한다.
    push('back',mat4Mul(translate(0,yCenter,-d/2+t/2),scale(w,h,t)));
    push('left',mat4Mul(translate(-w/2+t/2,yCenter,0),scale(t,h,d)));
    push('right',mat4Mul(translate(w/2-t/2,yCenter,0),scale(t,h,d)),undefined,mode!=='section');
    push('top',mat4Mul(translate(0,yCenter-h/2+t/2,0),scale(w,t,d)));
    push('bottom',mat4Mul(translate(0,yCenter+h/2-t/2,0),scale(w,t,d)));

    // 전면 개구부 절곡 리턴과 모서리 접합선을 넣어 단순 박스 느낌을 줄인다.
    const returnW=Math.max(8,Math.min(18,w*.028)),returnD=Math.max(4,t*.42),frontZ=d/2-returnD/2;
    const returnColor=realistic?[.50,.53,.55,Math.max(bodyAlpha,.70)]:[.34,.38,.42,Math.max(bodyAlpha,.55)];
    push('body-return-top',mat4Mul(translate(0,yCenter-h/2+returnW/2,frontZ),scale(w-returnW*2,returnW,returnD)),returnColor);
    push('body-return-bottom',mat4Mul(translate(0,yCenter+h/2-returnW/2,frontZ),scale(w-returnW*2,returnW,returnD)),returnColor);
    push('body-return-left',mat4Mul(translate(-w/2+returnW/2,yCenter,frontZ),scale(returnW,h-returnW*2,returnD)),returnColor);
    push('body-return-right',mat4Mul(translate(w/2-returnW/2,yCenter,frontZ),scale(returnW,h-returnW*2,returnD)),returnColor,mode!=='section');

    if(realistic){
      const seam=[.16,.18,.20,.75],seamEdge=[.42,.45,.48,.8],sw=Math.max(1.5,t*.10);
      [[-w/2+t*.55,-h/2+t*.55],[w/2-t*.55,-h/2+t*.55],[-w/2+t*.55,h/2-t*.55],[w/2-t*.55,h/2-t*.55]].forEach(([sx,sy],i)=>{
        if(mode==='section'&&(i===1||i===3))return;
        push('corner-seam',mat4Mul(translate(sx,yCenter+sy,-d/2+t*.62),scale(sw,Math.max(16,h*.065),sw)),seam,true,seamEdge);
      });
      // 속판 고정 스터드 4개. 내부 구조 식별용이며 문과 독립적으로 고정된다.
      const stud=[.62,.65,.67,1],studEdge=[.23,.25,.28,1],studZ=-d/2+Math.max(18,d*.22);
      [[-.36,-.36],[.36,-.36],[-.36,.36],[.36,.36]].forEach(([px,py])=>{
        push('mounting-stud',mat4Mul(translate(px*w,yCenter+py*h,studZ),scale(Math.max(5,t*.38),Math.max(5,t*.38),Math.max(12,d*.10))),stud,true,studEdge);
      });
    }

    const flange=Math.max(10,Math.min(24,w*.035)),gap=Math.max(2,Math.min(5,w*.006));
    const doorColor=realistic?[.57,.59,.60,mode==='xray'?.055:.98]:[.46,.49,.51,mode==='xray'?.055:.96];
    const flangeTop=realistic?[.67,.69,.70,.99]:[.61,.64,.66,.98];
    const flangeBottom=realistic?[.43,.45,.46,.99]:[.38,.41,.43,.98];
    const gasket=[.035,.042,.047,mode==='xray'?.10:.96],gasketEdge=[.09,.10,.11,1];

    function addDoorAssembly(base,alphaMode){
      push('door',mat4Mul(base,scale(w,h,t)),[doorColor[0],doorColor[1],doorColor[2],alphaMode]);
      push('door-top-flange',part(base,0,-h/2+flange/2,t*.58,w-gap*2,flange,Math.max(2,t*.24)),flangeTop);
      push('door-bottom-flange',part(base,0,h/2-flange/2,t*.58,w-gap*2,flange,Math.max(2,t*.24)),flangeBottom);
      push('door-left-flange',part(base,-w/2+flange/2,0,t*.58,flange,h-flange*2,Math.max(2,t*.24)),realistic?[.60,.62,.63,.99]:[.55,.58,.60,.98]);
      push('door-right-flange',part(base,w/2-flange/2,0,t*.58,flange,h-flange*2,Math.max(2,t*.24)),realistic?[.38,.40,.41,.99]:[.34,.37,.39,.98]);
      if(realistic){
        const gw=Math.max(4,Math.min(9,w*.012)),gz=-t*.57;
        push('gasket-top',part(base,0,-h/2+flange+gw/2,gz,w-flange*2-gw*2,gw,Math.max(2,t*.16)),gasket,true,gasketEdge);
        push('gasket-bottom',part(base,0,h/2-flange-gw/2,gz,w-flange*2-gw*2,gw,Math.max(2,t*.16)),gasket,true,gasketEdge);
        push('gasket-left',part(base,-w/2+flange+gw/2,0,gz,gw,h-flange*2-gw*2,Math.max(2,t*.16)),gasket,true,gasketEdge);
        push('gasket-right',part(base,w/2-flange-gw/2,0,gz,gw,h-flange*2-gw*2,Math.max(2,t*.16)),gasket,true,gasketEdge);
      }
    }

    if(mode==='exterior'||mode==='xray'){
      const base=translate(0,yCenter,d/2+t/2);
      addDoorAssembly(base,mode==='xray'?.055:.98);
      // 실제 경첩은 본체측 리프·문측 리프·중앙 배럴을 분리해 표현한다.
      [yCenter-h*.30,yCenter+h*.30].forEach(hy=>{
        const hh=Math.max(28,h*.10),hx=w/2+t*.60,hz=d/2+t*.62;
        push('hinge-body-leaf',mat4Mul(translate(w/2-t*.10,hy,hz-t*.18),scale(t*.32,hh*.78,t*.28)),[.30,.32,.33,1]);
        push('hinge-door-leaf',mat4Mul(translate(w/2+t*.78,hy,hz+t*.12),scale(t*.34,hh*.78,t*.28)),[.42,.44,.45,1]);
        push('hinge-barrel',mat4Mul(translate(hx,hy,hz),scale(t*.62,hh,t*.62)),[.22,.24,.25,1]);
        if(realistic){
          push('hinge-pin-top',mat4Mul(translate(hx,hy-hh*.53,hz),scale(t*.75,t*.14,t*.75)),[.62,.64,.65,1]);
          push('hinge-pin-bottom',mat4Mul(translate(hx,hy+hh*.53,hz),scale(t*.75,t*.14,t*.75)),[.42,.44,.45,1]);
        }
      });
    }
    if(mode==='open'||mode==='exploded'){
      const pose=window.KENC_CAD_MODEL?.doorPose?.(c,mode,yCenter)||{angle:(mode==='open'?82:8)*Math.PI/180,hingeX:w/2+(mode==='exploded'?w*.60:0),hingeY:yCenter,hingeZ:d/2+(mode==='exploded'?w*.60:0)*.15};
      const base=mat4Mul(translate(pose.hingeX,pose.hingeY,pose.hingeZ),mat4Mul(rotY(pose.angle),translate(-w/2,0,0)));
      addDoorAssembly(base,mode==='open'?.18:.30);
      const hh=Math.max(28,h*.10);
      [-h*.30,h*.30].forEach(ly=>{
        push('hinge-door-open',part(base,w/2+t*.18,ly,t*.16,t*.62,hh,t*.62),[.24,.26,.27,1]);
      });
    }
    if(mode==='exploded')push('rear-exploded',mat4Mul(translate(w*.22,yCenter,-d/2-Math.max(d*1.8,w*.22)),scale(w,h,t)),[.20,.24,.29,.22]);
    return out;
  }
  function sceneBounds(cabs){const total=cabs.reduce((a,c)=>a+(+c.height||0),0),maxW=Math.max(...cabs.map(c=>+c.width||1)),maxD=Math.max(...cabs.map(c=>+c.depth||1));return{total,maxW,maxD,size:Math.max(total,maxW,maxD)};}
  function renderWebGL(ctx){ctxCache=ctx;ensureCanvas(ctx.svg);const s=ctx.state,v=s.live3dView||(s.live3dView=defaults()),cabs=(s.mode3d==='stack'?s.cabinets:[ctx.currentCabinet]).filter(Boolean);if(!cabs.length)return;
    resize();gl.viewport(0,0,canvas.width,canvas.height);const realistic=(v.quality||'realistic')==='realistic';gl.clearColor(realistic?.035:.018,realistic?.045:.035,realistic?.055:.058,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
    const b=sceneBounds(cabs),aspect=canvas.width/canvas.height,mode=v.displayMode||'exterior',frameFactor=mode==='exploded'?.72:(mode==='open'?.62:.56),span=b.size*frameFactor/Math.max(v.zoom,.05);const proj=ortho(-span*aspect,span*aspect,span,-span,-b.size*5,b.size*5);const cam=mat4Mul(translate((v.panX||0)*b.size/350,(v.panY||0)*b.size/350,0),mat4Mul(rotX(v.pitch*Math.PI/180),rotY(v.yaw*Math.PI/180)));const vp=mat4Mul(proj,cam);
    const revealAll=['xray','open','section','exploded'].includes(mode);
    let off=-b.total/2;
    const cabinetQueue=[],objectQueue=[];
    cabs.forEach(c=>{const yCenter=off+(+c.height||0)/2;off+=+c.height||0;
      cabinetParts(c,yCenter,mode).forEach(p=>cabinetQueue.push({p,c,yCenter}));
      (c.objects||[]).forEach(o=>{const surface=o.surface||'front';if(mode==='exterior'&&surface==='inside')return;objectQueue.push({c,yCenter,o,surface,role:roleOf(o,surface),m:faceTransform(c,yCenter,surface,o,mode)});});
    });
    if(realistic&&mode!=='exploded'){const floor=mat4Mul(vp,mat4Mul(translate(0,b.total*.53,-b.maxD*.12),scale(b.maxW*1.35,Math.max(3,b.size*.012),b.maxD*1.65)));drawBox(floor,[.01,.015,.02,.20],[.03,.04,.05,.08],true);}
    if(revealAll)gl.depthMask(false);
    cabinetQueue.forEach(({p})=>drawBox(mat4Mul(vp,p.m),p.color,p.edge,true));
    gl.depthMask(true);
    if(revealAll)gl.disable(gl.DEPTH_TEST);
    objectQueue.forEach(({c,yCenter,o,surface,role,m})=>addObjectDetails(c,yCenter,o,surface,mat4Mul(vp,m),role));
    if(revealAll)gl.enable(gl.DEPTH_TEST);
    syncButtons();}
  function ensureCanvas(svg){if(canvas&&canvas.isConnected)return;const wrap=svg.parentElement;canvas=document.createElement('canvas');canvas.className='kenc-webgl-3d-canvas';canvas.setAttribute('aria-label','WebGL 실시간 3D 미리보기');svg.style.display='none';wrap.appendChild(canvas);gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});if(!gl){svg.style.display='';canvas.remove();canvas=null;return;}initGL();bindCanvas();}
  function resize(){if(!canvas)return;const r=canvas.getBoundingClientRect(),quality=view().quality||'realistic',dpr=Math.min(window.devicePixelRatio||1,quality==='realistic'?2.5:1.6);const w=Math.max(2,Math.round(r.width*dpr)),h=Math.max(2,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
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
