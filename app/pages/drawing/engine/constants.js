(function(){
  'use strict';
  const FACES=Object.freeze({FRONT:'front',BACK:'back',INSIDE:'inside',LEFT:'left',RIGHT:'right',TOP:'top',BOTTOM:'bottom',DOOR:'door'});
  const FACE_ALIASES=Object.freeze({rear:'back',inner:'inside',internal:'inside',frontdoor:'door'});
  const ANCHORS=Object.freeze({TOP_LEFT:'top-left',TOP_CENTER:'top-center',TOP_RIGHT:'top-right',CENTER_LEFT:'center-left',CENTER:'center',CENTER_RIGHT:'center-right',BOTTOM_LEFT:'bottom-left',BOTTOM_CENTER:'bottom-center',BOTTOM_RIGHT:'bottom-right',FREE:'free'});
  const PARENTS=Object.freeze({DOOR:'door',BODY:'body',INSIDE:'inside',UTILITY:'utility',HOLES:'holes'});
  const DEPTH_LAYERS=Object.freeze({CUT:-0.1,STEEL:0,INSIDE:2,PLATE:20,OUTSIDE:1.6,OVERLAY:3});
  window.KENC_ENGINE_CONSTANTS={version:'1.0.4',FACES,FACE_ALIASES,ANCHORS,PARENTS,DEPTH_LAYERS};
})();