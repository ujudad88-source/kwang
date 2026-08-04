(function(){
  'use strict';
  const VERSION='1.1.2';
  const STORAGE_KEY='kenc.smartSnap.enabled';
  const THRESHOLD=8;
  const SAFE_MARGIN=20;
  let enabled=true;
  let bypass=false;
  let lastGuides=[];

  try{enabled=localStorage.getItem(STORAGE_KEY)!=='0';}catch(_){enabled=true;}
  const finite=v=>Number.isFinite(Number(v));
  const dist=(a,b)=>Math.abs(Number(a)-Number(b));
  const plane=(cab,surface)=>window.KENC_OBJECT_ENGINE?.plane?.(surface,cab)||(
    surface==='left'||surface==='right'?{width:Number(cab?.depth)||130,height:Number(cab?.height)||700}:
    surface==='top'||surface==='bottom'?{width:Number(cab?.width)||600,height:Number(cab?.depth)||130}:
    {width:Number(cab?.width)||600,height:Number(cab?.height)||700}
  );

  function candidates(cab,obj){
    const p=plane(cab,obj.surface), xs=[],ys=[];
    const push=(arr,value,kind,label)=>{if(finite(value))arr.push({value:Number(value),kind,label});};
    push(xs,SAFE_MARGIN,'safe','좌측 안전거리');
    push(xs,p.width/2,'center','세로 중심선');
    push(xs,p.width-SAFE_MARGIN,'safe','우측 안전거리');
    push(ys,SAFE_MARGIN,'safe','상단 안전거리');
    push(ys,p.height/2,'center','가로 중심선');
    push(ys,p.height-SAFE_MARGIN,'safe','하단 안전거리');
    (cab?.objects||[]).filter(o=>o!==obj&&o.surface===obj.surface).forEach(o=>{
      push(xs,o.x,'object','객체 좌측');push(xs,o.x+o.w/2,'object','객체 중심');push(xs,o.x+o.w,'object','객체 우측');
      push(ys,o.y,'object','객체 상단');push(ys,o.y+o.h/2,'object','객체 중심');push(ys,o.y+o.h,'object','객체 하단');
    });
    return{p,xs,ys};
  }

  function nearest(values, anchors){
    let best=null;
    values.forEach(v=>anchors.forEach(a=>{const d=dist(v.value,a.value);if(d<=THRESHOLD&&(!best||d<best.d))best={d,source:v,target:a};}));
    return best;
  }

  function apply(obj,cab,options={}){
    lastGuides=[];
    if(!enabled||bypass||options.bypass||!obj||!cab)return obj;
    const {p,xs,ys}=candidates(cab,obj);
    const xAnchors=[{value:obj.x,offset:0},{value:obj.x+obj.w/2,offset:obj.w/2},{value:obj.x+obj.w,offset:obj.w}];
    const yAnchors=[{value:obj.y,offset:0},{value:obj.y+obj.h/2,offset:obj.h/2},{value:obj.y+obj.h,offset:obj.h}];
    const bx=nearest(xs,xAnchors),by=nearest(ys,yAnchors);
    if(bx){obj.x=bx.target.value-bx.source.offset;lastGuides.push({axis:'x',value:bx.target.value,label:bx.target.label,kind:bx.target.kind});}
    if(by){obj.y=by.target.value-by.source.offset;lastGuides.push({axis:'y',value:by.target.value,label:by.target.label,kind:by.target.kind});}
    obj.x=Math.max(0,Math.min(Number(obj.x)||0,Math.max(0,p.width-(Number(obj.w)||0))));
    obj.y=Math.max(0,Math.min(Number(obj.y)||0,Math.max(0,p.height-(Number(obj.h)||0))));
    obj.meta=obj.meta||{};obj.meta.snap=lastGuides.map(g=>({axis:g.axis,value:g.value,label:g.label}));
    document.dispatchEvent(new CustomEvent('kenc:smart-snap',{detail:{object:obj,guides:lastGuides,source:options.source||'unknown'}}));
    setTimeout(drawGuides,0);
    return obj;
  }

  function drawGuides(){
    const svg=document.getElementById('drawingCanvas');
    const state=window.KENC_DRAWING_API?.getState?.();
    if(!svg||!state?.layout||!lastGuides.length)return;
    svg.querySelectorAll('.kenc-snap-guide').forEach(n=>n.remove());
    const {x,y,s}=state.layout;
    const p=state.layout.p;
    lastGuides.forEach(g=>{
      const line=document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('class','kenc-snap-guide '+g.kind);
      if(g.axis==='x'){line.setAttribute('x1',x+g.value*s);line.setAttribute('x2',x+g.value*s);line.setAttribute('y1',y);line.setAttribute('y2',y+p.height*s);}
      else{line.setAttribute('x1',x);line.setAttribute('x2',x+p.width*s);line.setAttribute('y1',y+g.value*s);line.setAttribute('y2',y+g.value*s);}
      svg.appendChild(line);
    });
    clearTimeout(drawGuides.timer);drawGuides.timer=setTimeout(()=>svg.querySelectorAll('.kenc-snap-guide').forEach(n=>n.remove()),650);
  }

  function setEnabled(value){enabled=!!value;try{localStorage.setItem(STORAGE_KEY,enabled?'1':'0')}catch(_){}updateUI();document.documentElement.dataset.kencSmartSnap=enabled?'on':'off';}
  function toggle(){setEnabled(!enabled);return enabled;}
  function updateUI(){const btn=document.getElementById('drawingSmartSnapBtn');if(btn){btn.classList.toggle('active',enabled);btn.setAttribute('aria-pressed',String(enabled));btn.textContent=enabled?'스냅 ON':'스냅 OFF';}}
  function installUI(){
    if(document.getElementById('drawingSmartSnapBtn'))return updateUI();
    const actions=document.querySelector('.drawing-toolbar-actions');if(!actions)return;
    const btn=document.createElement('button');btn.id='drawingSmartSnapBtn';btn.type='button';btn.className='drawing-action-btn kenc-smart-snap-btn';btn.title='중심선·안전거리·다른 객체 선에 자동 정렬 (Alt를 누르면 일시 해제)';
    btn.addEventListener('click',toggle);actions.insertBefore(btn,actions.firstChild);updateUI();
  }
  window.addEventListener('keydown',e=>{if(e.key==='Alt'){bypass=true;document.documentElement.dataset.kencSmartSnapBypass='on';}});
  window.addEventListener('keyup',e=>{if(e.key==='Alt'){bypass=false;delete document.documentElement.dataset.kencSmartSnapBypass;}});
  window.addEventListener('blur',()=>{bypass=false;delete document.documentElement.dataset.kencSmartSnapBypass;});
  window.KENC_SMART_SNAP={version:VERSION,apply,toggle,setEnabled,isEnabled:()=>enabled,getGuides:()=>lastGuides.slice(),threshold:THRESHOLD,safeMargin:SAFE_MARGIN};
  document.documentElement.dataset.kencSmartSnap=enabled?'on':'off';
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI,{once:true});else installUI();
})();
