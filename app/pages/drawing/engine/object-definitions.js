(function(){
  'use strict';
  const R=window.KENC_OBJECT_REGISTRY;
  const defs=[
    {id:'vent',category:'external',label:'환기구',defaultVariant:'wide_louver',mounts:['door','front','back','left','right','top','bottom'],doorBound:true,anchor:'free',mirrorPolicy:'auto',defaultSize:{w:160,h:90},depth:4,depthLayer:'outside'},
    {id:'anchor',category:'hole',label:'구멍',defaultVariant:'anchor_14',mounts:['door','front','back','left','right','top','bottom'],doorBound:true,anchor:'free',mirrorPolicy:'none',defaultSize:{w:14,h:14},depth:0,depthLayer:'cut'},
    {id:'key',category:'external',label:'키종류',defaultVariant:'detach',mounts:['door','front'],doorBound:true,anchor:'free',mirrorPolicy:'auto',defaultSize:{w:42,h:120},depth:8,depthLayer:'outside'},
    {id:'nameplate',category:'external',label:'명판',defaultVariant:'communication_100x30',mounts:['door','front','back'],doorBound:true,anchor:'free',mirrorPolicy:'back',defaultSize:{w:100,h:30},depth:2,depthLayer:'outside'},
    {id:'acrylicWindow',category:'cutout',label:'투명아크릴창',defaultVariant:'framed_clear',mounts:['door','front','back','left','right'],doorBound:true,anchor:'free',mirrorPolicy:'auto',defaultSize:{w:220,h:140},depth:7,depthLayer:'outside'},
    {id:'emboss',category:'formed',label:'엠보타공',defaultVariant:'round_knockout',mounts:['door','front','back','left','right','top','bottom'],doorBound:true,anchor:'free',mirrorPolicy:'none',defaultSize:{w:90,h:90},depth:1.2,depthLayer:'cut'},
    {id:'cut',category:'hole',label:'타공',defaultVariant:'round',mounts:['door','front','back','left','right','top','bottom'],doorBound:true,anchor:'free',mirrorPolicy:'none',defaultSize:{w:90,h:90},depth:0,depthLayer:'cut'},
    {id:'plate',category:'internal',label:'속판',defaultVariant:'pvc_perforated',mounts:['inside'],doorBound:false,anchor:'free',mirrorPolicy:'none',defaultSize:{w:180,h:130},depth:6,depthLayer:'plate'},
    {id:'groundBar',category:'utility',label:'접지',defaultVariant:'copper_left',mounts:['left','right'],doorBound:false,anchor:'free',mirrorPolicy:'opposite-side',defaultSize:{w:180,h:55},depth:10,depthLayer:'inside'},
    {id:'cableHook',category:'utility',label:'케이블걸이',defaultVariant:'left_tag_weld',mounts:['left','right','inside'],doorBound:false,anchor:'free',mirrorPolicy:'opposite-side',defaultSize:{w:180,h:45},depth:28,depthLayer:'inside'},
    {id:'cover',category:'external',label:'타공덮개',defaultVariant:'four_screw',mounts:['door','front','back','left','right'],doorBound:true,anchor:'free',mirrorPolicy:'auto',defaultSize:{w:110,h:90},depth:4,depthLayer:'overlay'},
    {id:'doubleLock',category:'external',label:'이중시건',defaultVariant:'exposed',mounts:['door','front','top'],doorBound:true,anchor:'free',mirrorPolicy:'none',defaultSize:{w:70,h:80},depth:18,depthLayer:'outside'}
  ];
  defs.forEach(d=>R.registerDefinition(d));
  const variants={vent:{'와이드 절곡 루버형':'wide_louver','일반형':'wide_louver','루버형':'wide_louver'},anchor:{'앙카구멍':'anchor_14','앙카구멍 Ø14':'anchor_14','피스구멍 Ø6':'screw_6'},key:{'탈착키':'detach','푸쉬버튼키':'push_button','푸쉬핸들키':'push_handle'},nameplate:{'기본형':'communication_100x30','통신용':'communication_100x30','분전반용':'distribution_150x30'},acrylicWindow:{'기본형':'framed_clear'},emboss:{'엠보타공 원형':'round_knockout','엠보타공 사각형':'square_knockout','엠보타공 사각':'square_knockout'},cut:{'원형타공':'round','사각타공':'square'},plate:{'PVC속판':'pvc_perforated','철속판':'steel_plain','빼끄판':'bakelite_yellow','베크라이트 절연판':'bakelite_yellow'},groundBar:{'철접지 · 좌(왼쪽)':'steel_left','철접지 · 우(오른쪽)':'steel_right','동접지 · 좌(왼쪽)':'copper_left','동접지 · 우(오른쪽)':'copper_right'},cableHook:{'왼쪽 <':'left_tag_weld','오른쪽 >':'right_tag_weld','수평':'inside_horizontal_tag_weld'},cover:{'기본형':'four_screw','4점 나사형':'four_screw'},doubleLock:{'기본형':'exposed','노출함용':'exposed','카바용':'cover_top_center'}};
  window.KENC_OBJECT_DEFINITIONS=Object.freeze(Object.fromEntries(defs.map(d=>[d.id,R.definition(d.id)])));
  window.KENC_OBJECT_VARIANTS=Object.freeze(variants);
})();