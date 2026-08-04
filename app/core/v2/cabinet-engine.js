(function(){
  'use strict';
  const VERSION='2.2.0',num=(v,f)=>Number.isFinite(Number(v))?Number(v):f;
  function thicknessValue(v){const m=String(v??'1.6').match(/[\d.]+/);return Math.max(.6,num(m?.[0],1.6));}
  function normalize(c,index=0){
    if(!c)return c;window.KENC_UUID?.ensure(c,'uuid');
    c.width=Math.max(100,num(c.width,600));c.height=Math.max(100,num(c.height,700));c.depth=Math.max(40,num(c.depth,130));
    c.thicknessMm=thicknessValue(c.thickness);c.schemaVersion=3;c.name=c.name||`함체 ${index+1}`;
    c.parametric={
      body:{width:c.width,height:c.height,depth:c.depth,thickness:c.thicknessMm,bendRadius:Math.max(1.5,c.thicknessMm*1.5)},
      door:{width:c.width-4,height:c.height-4,thickness:c.thicknessMm,returnDepth:18,gap:2},
      hinge:{enabled:false,side:'right'},
      gasket:{enabled:false},
      studs:{enabled:false}
    };
    return c;
  }
  function rebuild(c){return normalize(c);}
  window.KENC_CABINET_ENGINE={version:VERSION,normalize,rebuild,thicknessValue};
})();
