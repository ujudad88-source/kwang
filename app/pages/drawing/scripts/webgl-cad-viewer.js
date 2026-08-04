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
      // KENC 2.1.1 실제형 와이드 절곡 루버: 철판 절개, 5단 일체 절곡 날개, 양끝 보강 절곡과 내부 음영.
      const frame=[.39,.43,.47,1],edge=[.12,.15,.18,1],hi=[.84,.88,.91,1],shadow=[.025,.035,.05,.96];
      localBox(baseM,0,0,.532,.96,.94,.030,frame,edge,true);
      localBox(baseM,0,0,.548,.88,.86,.018,shadow,edge,true);
      // 좌우 절곡 보강부는 별도 부착물이 아니라 원판의 접힌 가장자리로 표현한다.
      localBox(baseM,-.445,0,.592,.055,.88,.090,frame,edge,true);
      localBox(baseM,.445,0,.592,.055,.88,.090,frame,edge,true);
      for(let i=0;i<5;i++){
        const yy=-.34+i*.17;
        // 절개 틈과 내부 암부
        localBox(baseM,0,yy+.053,.592,.78,.050,.040,shadow,shadow,true);
        // 절곡 상면: 철판에서 앞으로 기울어 올라오는 면
        localBox(baseM,0,yy-.018,.635,.80,.052,.165,[.48,.52,.56,1],hi,true);
        // 루버 전면 립과 아래쪽 접힘
        localBox(baseM,0,yy+.060,.722,.80,.095,.045,[.31,.35,.39,1],edge,true);
        localBox(baseM,0,yy+.105,.744,.74,.018,.022,[.10,.12,.15,1],edge,true);
        // 양끝 절곡 캡
        localBox(baseM,-.402,yy+.030,.678,.030,.130,.090,[.40,.44,.48,1],edge,true);
        localBox(baseM,.402,yy+.030,.678,.030,.130,.090,[.40,.44,.48,1],edge,true);
      }
      localBox(baseM,-.16,-.425,.765,.48,.010,.008,hi,hi,true);
    }else if(type==='key'){
      const chrome=[0.70,0.74,0.78,1], chromeHi=[0.94,0.96,0.98,1], chromeDark=[0.24,0.27,0.31,1], black=[0.018,0.024,0.032,1], blackSoft=[0.06,0.07,0.085,1];
      if(o.option==='탈착키'){
        // 검정 탈착키: 매립 하우징, 회전 코어, 탈착 슬롯과 작은 손잡이까지 분리한다.
        localBox(baseM,0,0,.575,.64,.90,.105,blackSoft,[.20,.23,.27,1],true);
        localBox(baseM,0,-.16,.655,.38,.42,.085,black,[.32,.35,.39,1],true);
        localDisc(baseM,0,-.16,.704,.145,.145,[.025,.032,.043,1],[.66,.70,.74,1],36);
        localBox(baseM,0,-.16,.730,.035,.205,.026,chromeHi,chromeHi,true);
        localBox(baseM,0,.25,.675,.18,.18,.065,chrome,[.25,.28,.31,1],true);
        localBox(baseM,0,.34,.710,.055,.22,.038,chromeHi,chromeHi,true);
        localBox(baseM,-.17,-.39,.635,.22,.018,.012,[.14,.16,.19,1],[.14,.16,.19,1],true);
      }else if(o.option==='푸쉬버튼키'){
        // 푸쉬버튼키: 브러시드 금속 베젤, 검정 매립부, 원형 푸시 버튼.
        localBox(baseM,0,0,.575,.60,.92,.105,chrome,chromeDark,true);
        localBox(baseM,0,-.15,.655,.36,.44,.080,chromeDark,[.14,.16,.19,1],true);
        localDisc(baseM,0,-.15,.708,.148,.148,[.12,.14,.17,1],chromeHi,38);
        localDisc(baseM,0,-.15,.735,.095,.095,[.63,.67,.71,1],[.96,.98,1,1],38);
        localBox(baseM,0,.20,.682,.38,.13,.070,chromeHi,chromeDark,true);
        localBox(baseM,0,.37,.690,.14,.14,.068,chromeHi,chromeDark,true);
        localBox(baseM,-.15,-.405,.634,.25,.018,.012,chromeHi,chromeHi,true);
      }else{
        // 푸쉬핸들키: 긴 매립 베이스, 중앙 푸시 패들, 하부 회전부와 손잡이.
        localBox(baseM,0,0,.570,.58,.96,.105,chrome,chromeDark,true);
        localBox(baseM,0,-.30,.655,.36,.13,.068,chromeDark,[.14,.16,.19,1],true);
        localBox(baseM,0,-.02,.668,.32,.38,.082,[.42,.46,.50,1],[.16,.18,.21,1],true);
        localBox(baseM,0,-.06,.718,.24,.24,.028,[.61,.65,.69,1],chromeHi,true);
        localBox(baseM,0,.27,.686,.38,.12,.067,chromeHi,chromeDark,true);
        localDisc(baseM,0,.40,.713,.075,.075,chromeHi,chromeDark,36);
        localBox(baseM,0,.44,.745,.042,.19,.028,chromeHi,chromeHi,true);
        localBox(baseM,-.14,-.425,.632,.25,.017,.010,chromeHi,chromeHi,true);
      }
    }else if(type==='nameplate'){
      // 얇은 백색 명판과 접착층, 가장자리 라운드감을 3겹으로 표현한다.
      const plate=[.95,.95,.91,1],rim=[.42,.45,.49,1],shadow=[.12,.14,.16,.38];
      localBox(baseM,.012,.016,.562,.965,.925,.040,shadow,rim,true);
      localBox(baseM,0,0,.595,.96,.92,.050,plate,rim,true);
      localBox(baseM,0,0,.626,.90,.79,.014,[.985,.985,.96,1],[.70,.73,.76,1],true);
      localBox(baseM,-.15,-.29,.642,.52,.012,.009,[1,1,1,.78],[1,1,1,.78],true);
    }else if(type==='acrylicWindow'){
      // ABS 프레임 + 고무 패킹 + 투명 아크릴 + 모서리 반사선을 별도 깊이로 구성한다.
      const frame=[.73,.76,.78,1],frameDark=[.19,.22,.25,1],gasket=[.035,.045,.055,1];
      localBox(baseM,.014,.014,.558,.99,.99,.070,[.12,.15,.17,.34],frameDark,true);
      localBox(baseM,0,0,.588,.98,.98,.076,frame,frameDark,true);
      localBox(baseM,0,0,.626,.89,.89,.034,gasket,gasket,true);
      localBox(baseM,0,0,.650,.82,.82,.032,[.28,.69,.88,.17],[.12,.55,.74,.88],true);
      localBox(baseM,-.18,-.22,.673,.30,.030,.010,[.94,.98,1,.80],[.94,.98,1,.80],true);
      localBox(baseM,-.04,-.13,.674,.40,.019,.009,[.80,.94,1,.60],[.80,.94,1,.60],true);
      localBox(baseM,.30,.02,.672,.020,.66,.008,[.72,.91,1,.32],[.72,.91,1,.32],true);
    }else if(type==='doubleLock'){
      const steel=[.69,.73,.77,1],steelHi=[.91,.94,.96,1],edge=[.20,.23,.27,1],voidC=[.008,.012,.018,1];
      if(o.option==='카바용'){
        // 상부 중앙의 얇은 철판 탭, 뿌리 절곡, 원형 자물쇠 구멍.
        localBox(baseM,0,.12,.580,.90,.25,.070,steel,edge,true);
        localBox(baseM,0,-.03,.635,.52,.16,.065,steelHi,edge,true);
        localDisc(baseM,0,-.03,.678,.105,.105,voidC,edge,40);
        localBox(baseM,-.16,.21,.628,.28,.022,.012,steelHi,steelHi,true);
      }else{
        // 문 철판을 관통해 안쪽에서 나온 원형 고리와 보강판.
        localBox(baseM,0,.22,.575,.30,.42,.095,steel,edge,true);
        localBox(baseM,0,.13,.632,.48,.16,.060,steelHi,edge,true);
        localDisc(baseM,0,-.13,.670,.245,.245,steel,edge,48);
        localDisc(baseM,0,-.13,.692,.135,.135,voidC,edge,48);
        localBox(baseM,0,.03,.690,.095,.30,.065,steel,edge,true);
        localBox(baseM,-.13,.37,.637,.24,.020,.012,steelHi,steelHi,true);
      }
    }else if(type==='cover'){
      // 타공덮개: 얇은 절곡 덮개, 사방 나사, 십자홈, 접촉 그림자.
      const face=[.45,.53,.48,1],edge=[.14,.18,.15,1],shine=[.80,.86,.82,1],screw=[.74,.78,.81,1],shadow=[.05,.07,.06,.40];
      localBox(baseM,.018,.018,.555,.92,.88,.068,shadow,edge,true);
      localBox(baseM,0,0,.596,.90,.86,.058,face,edge,true);
      localBox(baseM,0,0,.628,.84,.80,.013,[.52,.60,.55,.40],shine,false);
      localBox(baseM,-.12,-.34,.646,.58,.014,.008,shine,shine,true);
      [[0,-.37],[0,.37],[-.39,0],[.39,0]].forEach(([x,y])=>{
        localDisc(baseM,x,y,.663,.054,.054,screw,edge,30);
        localDisc(baseM,x,y,.678,.034,.034,[.88,.90,.92,1],edge,30);
        localBox(baseM,x,y,.694,.064,.012,.008,edge,edge,true);
        localBox(baseM,x,y,.695,.012,.064,.008,edge,edge,true);
      });
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
      const pvc=[.54,.57,.58,1], pvcEdge=[.14,.17,.18,1], steel=[.68,.71,.73,1], steelEdge=[.18,.21,.24,1], bak=[.60,.36,.10,1], bakEdge=[.24,.13,.035,1];
      const face=variant==='bakelite_yellow'?bak:(variant==='steel_plain'?steel:pvc), edge=variant==='bakelite_yellow'?bakEdge:(variant==='steel_plain'?steelEdge:pvcEdge);
      const thick=variant==='bakelite_yellow'?.082:(variant==='steel_plain'?.036:.068);
      // 뒤쪽 접촉 그림자와 판재 본체
      localBox(baseM,.018,.018,.522,.95,.95,.030,[.03,.04,.05,.38],edge,true);
      localBox(baseM,0,0,.56,.94,.94,thick,face,edge,true);
      localBox(baseM,-.13,-.40,.605,.58,.010,.008,variant==='bakelite_yellow'?[.86,.58,.20,.65]:[.91,.93,.94,.56],edge,true);
      // 4개의 고정 스페이서·와셔·장공을 실제 체결 구조처럼 겹겹이 표현
      [[-.405,-.405,-45],[.405,-.405,45],[-.405,.405,45],[.405,.405,-45]].forEach(([x,y,a])=>{
        const sm=mat4Mul(baseM,mat4Mul(translate(x,y,.08),rotateZ(a*Math.PI/180)));
        localBox(sm,0,0,0,.13,.040,.028,[.025,.032,.04,1],edge,true);
        localDisc(baseM,x,y,.635,.055,.055,[.77,.80,.82,1],[.20,.23,.26,1],28);
        localDisc(baseM,x,y,.655,.026,.026,[.16,.18,.20,1],[.08,.10,.12,1],28);
      });
      if(variant==='pvc_perforated'){
        // PVC 속판은 촘촘한 대표 타공을 실제 관통 깊이로 표현한다.
        for(let iy=-6;iy<=6;iy++)for(let ix=-5;ix<=5;ix++){
          if(Math.abs(ix)>=5&&Math.abs(iy)>=5)continue;
          localDisc(baseM,ix*.073,iy*.064,.612,.011,.011,[.035,.045,.05,1],pvcEdge,14);
        }
        localDisc(baseM,0,0,.630,.027,.027,[.035,.045,.05,1],pvcEdge,20);
      }else if(variant==='steel_plain'){
        // 분체도장 평판의 약한 롤러 반사
        for(let i=-3;i<=3;i++) localBox(baseM,-.04+i*.11,-.18,.615,.006,.48,.006,[.90,.92,.93,.14],[.90,.92,.93,.14],true);
      }else{
        // 베크라이트의 적층 결
        for(let i=-4;i<=4;i++) localBox(baseM,0,i*.09,.616,.74,.006,.006,[.83,.57,.21,.23],[.83,.57,.21,.23],true);
      }
    }else if(type==='groundBar'){
      const copper=(o.option||'').includes('동접지'), left=(o.option||'').includes('좌(');
      const face=copper?[.70,.31,.08,1]:[.58,.63,.67,1], edge=copper?[.25,.09,.02,1]:[.17,.20,.23,1], bright=copper?[.98,.60,.24,1]:[.90,.93,.95,1], dark=copper?[.22,.07,.015,1]:[.12,.15,.18,1];
      const bx=left?-.34:.34,dir=left?1:-1;
      // 접지바 본체, 벽면 이격 스페이서와 양끝 고정 볼트
      localBox(baseM,bx,0,.57,.18,.88,.078,face,edge,true);
      localBox(baseM,bx-dir*.025,0,.532,.095,.76,.050,dark,edge,true);
      localBox(baseM,bx-.030,0,.616,.018,.80,.012,bright,bright,true);
      [-.39,.39].forEach(yy=>{
        localDisc(baseM,bx,yy,.631,.066,.066,[.78,.81,.83,1],edge,30);
        localDisc(baseM,bx,yy,.654,.034,.034,dark,edge,30);
        localBox(baseM,bx,yy,.671,.050,.012,.008,bright,bright,true);
      });
      // 6개 단자: 나사축, 와셔, 육각 너트가 부착면 반대쪽으로 돌출
      for(let i=-2.5;i<=2.5;i++){
        const yy=i*.14,sx=bx+dir*.12;
        localBox(baseM,sx+dir*.13,yy,.614,.27,.030,.030,dark,edge,true);
        localDisc(baseM,sx+dir*.29,yy,.632,.082,.082,[.80,.82,.83,1],edge,24);
        localDisc(baseM,sx+dir*.29,yy,.653,.054,.054,face,edge,6);
        localDisc(baseM,sx+dir*.29,yy,.674,.022,.022,bright,bright,18);
      }
    }else if(type==='cableHook'){
      const left=(o.option||'').includes('왼쪽'), face=[.62,.67,.70,1], edge=[.18,.22,.25,1], hi=[.90,.93,.95,1], weld=[.30,.34,.37,1];
      const dir=left?1:-1;
      // 측판에 완전히 밀착되는 긴 베이스와 양단 연속 태그용접 비드
      localBox(baseM,0,-.08,.57,.90,.18,.078,face,edge,true);
      localBox(baseM,0,-.08,.615,.82,.018,.010,hi,hi,true);
      for(const x of [-.43,.43]){
        localBox(baseM,x,-.08,.625,.055,.25,.045,weld,edge,true);
        for(let j=-2;j<=2;j++) localDisc(baseM,x,-.08+j*.045,.651,.024,.024,[.43,.47,.50,1],edge,14);
      }
      // 절곡 받침과 U형 끝단: 개방 방향은 좌우 면에 따라 자동 반전
      localBox(baseM,-dir*.12,.11,.602,.58,.105,.095,face,edge,true);
      localBox(baseM,dir*.205,.29,.604,.105,.42,.095,face,edge,true);
      localBox(baseM,dir*.285,.47,.606,.25,.095,.095,face,edge,true);
      localBox(baseM,dir*.365,.39,.608,.095,.22,.095,face,edge,true);
      localBox(baseM,-dir*.10,.145,.654,.50,.012,.010,hi,hi,true);
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
