(function(){
  'use strict';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const registry=window.KENC_OBJECT_REGISTRY;
  const variantMap=window.KENC_OBJECT_VARIANTS||{};
  const listeners=new Map();
  const emit=(name,detail)=>{(listeners.get(name)||[]).forEach(fn=>{try{fn(detail)}catch(e){console.error(e)}});document.dispatchEvent(new CustomEvent('kenc:object-engine:'+name,{detail}));};
  const on=(name,fn)=>{const list=listeners.get(name)||[];list.push(fn);listeners.set(name,list);return()=>listeners.set(name,list.filter(x=>x!==fn));};
  function definition(type){return registry?.definition(type)||window.KENC_OBJECT_DEFINITIONS?.[type]||null;}
  function resolveVariant(type,option){const d=definition(type);return variantMap[type]?.[option]||option||d?.defaultVariant||'default';}
  function normalizeObject(input,cabinet){
    const o=input||{},d=definition(o.type)||{};
    o.schemaVersion=2;o.variant=resolveVariant(o.type,o.option||o.variant);o.option=o.option||o.variant;
    o.surface=o.surface||d.mounts?.[0]||'front';
    if(d.mounts?.length&&!d.mounts.includes(o.surface))o.surface=d.mounts[0];
    o.x=num(o.x);o.y=num(o.y);o.w=Math.max(1,num(o.w,d.defaultSize?.w||20));o.h=Math.max(1,num(o.h,d.defaultSize?.h||20));o.rot=num(o.rot);
    o.depth=num(o.depth,d.depth||0);o.category=o.category||d.category||'external';o.doorBound=typeof o.doorBound==='boolean'?o.doorBound:!!d.doorBound;
    o.mirror=typeof o.mirror==='boolean'?o.mirror:!!d.mirror;o.meta=o.meta&&typeof o.meta==='object'?o.meta:{};
    if(cabinet) clampObject(o,cabinet);
    return o;
  }
  function plane(surface,c){if(surface==='left'||surface==='right')return{width:num(c.depth,130),height:num(c.height,700)};if(surface==='top'||surface==='bottom')return{width:num(c.width,600),height:num(c.depth,130)};return{width:num(c.width,600),height:num(c.height,700)};}
  function clampObject(o,c){const p=plane(o.surface,c);o.w=Math.min(Math.max(1,o.w),p.width);o.h=Math.min(Math.max(1,o.h),p.height);o.x=Math.min(Math.max(0,o.x),Math.max(0,p.width-o.w));o.y=Math.min(Math.max(0,o.y),Math.max(0,p.height-o.h));return o;}
  function normalizeCabinet(c){c.objects=Array.isArray(c.objects)?c.objects:[];c.objects.forEach(o=>normalizeObject(o,c));c.schemaVersion=2;return c;}
  function normalizeState(s){if(!s||typeof s!=='object')return s;s.cabinets=Array.isArray(s.cabinets)?s.cabinets:[];s.cabinets.forEach(normalizeCabinet);s.engineVersion='1.0.4';return s;}
  function addObject(cabinet,input){const o=normalizeObject(clone(input),cabinet);cabinet.objects.push(o);emit('added',{cabinet,object:o});return o;}
  function updateObject(cabinet,id,patch){const o=cabinet.objects.find(x=>x.id===id);if(!o)return null;Object.assign(o,clone(patch));normalizeObject(o,cabinet);emit('updated',{cabinet,object:o,patch});return o;}
  function removeObject(cabinet,id){const i=cabinet.objects.findIndex(x=>x.id===id);if(i<0)return null;const [o]=cabinet.objects.splice(i,1);emit('removed',{cabinet,object:o});return o;}
  function serialize(state){return JSON.stringify(normalizeState(clone(state)));}
  function deserialize(text){return normalizeState(JSON.parse(text));}
  window.KENC_OBJECT_ENGINE={version:'1.0.4',definition,resolveVariant,normalizeObject,normalizeCabinet,normalizeState,plane,clampObject,addObject,updateObject,removeObject,serialize,deserialize,on,emit};
})();
