(function(){
  'use strict';
  const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  function thickness(c){const d=num(c?.depth,100);return Math.max(6,Math.min(18,d*.08));}
  function doorPose(c,mode='exterior',yCenter=0){
    const w=num(c?.width,600),d=num(c?.depth,130),t=thickness(c);
    const moving=mode==='open'||mode==='exploded';
    const angleDeg=mode==='open'?82:(mode==='exploded'?8:0);
    const explode=mode==='exploded'?w*.60:0;
    return {moving,angleDeg,angle:angleDeg*Math.PI/180,hingeX:w/2+explode,hingeY:yCenter,hingeZ:d/2+explode*.15,t,w,d};
  }
  function rotateDoorPoint(p,pose){
    const c=Math.cos(pose.angle),s=Math.sin(pose.angle);
    return {x:pose.hingeX+c*p.x+s*p.z,y:pose.hingeY+p.y,z:pose.hingeZ-s*p.x+c*p.z};
  }
  function frontPoint(c,x,y,zOffset=0,mode='exterior',yCenter=0){
    const w=num(c?.width,600),h=num(c?.height,700),d=num(c?.depth,130),pose=doorPose(c,mode,yCenter);
    const local={x:-w+x,y:y-h/2,z:pose.t+zOffset};
    if(pose.moving)return rotateDoorPoint(local,pose);
    return {x:-w/2+x,y:yCenter+y-h/2,z:d/2+pose.t+zOffset};
  }
  function frontObjectPlacement(c,o,mode='exterior',yCenter=0){
    const ow=num(o?.w,20),oh=num(o?.h,20),x=num(o?.x),y=num(o?.y);
    const th=Math.max(3,Math.min(12,num(c?.depth,100)*.05));
    const center=frontPoint(c,x+ow/2,y+oh/2,th/2+2,mode,yCenter);
    const pose=doorPose(c,mode,yCenter);
    return {center,angle:pose.moving?pose.angle:0,angleDeg:pose.moving?pose.angleDeg:0,width:ow,height:oh,depth:th,pose};
  }
  function frontObjectCorners(c,o,mode='exterior',yCenter=0){
    const x=num(o?.x),y=num(o?.y),w=num(o?.w,20),h=num(o?.h,20),th=Math.max(3,Math.min(12,num(c?.depth,100)*.05));
    const z=th+2;
    return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([px,py])=>frontPoint(c,px,py,z,mode,yCenter));
  }
  function roleOf(o,surface){return surface==='inside'||o?.type==='plate'?'internal':(['cut','emboss','anchor'].includes(o?.type)?'cutout':(['groundBar','cableHook'].includes(o?.type)?'utility':'external'));}
  window.KENC_CAD_MODEL={thickness,doorPose,rotateDoorPoint,frontPoint,frontObjectPlacement,frontObjectCorners,roleOf};
})();
