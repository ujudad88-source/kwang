(function(){
 'use strict';const VERSION='2.2.5',KEY='kenc_attachment_profiles_v223';
 const num=v=>Number.isFinite(Number(v))?Number(v):0;
 function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){return{}}}
 function store(v){try{localStorage.setItem(KEY,JSON.stringify(v));return true}catch(_){return false}}
 const id=(type,face)=>`${type||'unknown'}::${face||'front'}`;
 function get(type,face){return load()[id(type,face)]||null}
 function saveFromObject(o){if(!o)return false;const all=load();all[id(o.type,o.surface)]={depthOffset:num(o.depthOffset),mirror:!!o.mirror,mirrorOverride:!!o.mirrorOverride,parent:o.parent||'',rot:num(o.rot),updatedAt:new Date().toISOString()};return store(all)}
 function apply(o,p){if(!o||!p)return false;o.depthOffset=Math.max(-30,Math.min(30,num(p.depthOffset)));o.mirror=!!p.mirror;o.mirrorOverride=!!p.mirrorOverride;if(p.parent)o.parent=p.parent;o.rot=num(p.rot);return true}
 function applyToSameType(state,type,face){const p=get(type,face);if(!p)return 0;let n=0;(state?.cabinets||[]).forEach(c=>(c.objects||[]).forEach(o=>{if(o.type===type&&o.surface===face){apply(o,p);window.KENC_ATTACHMENT_ADJUSTMENT?.normalize?.(c,o);n++;}}));return n}
 function clear(type,face){const all=load();delete all[id(type,face)];return store(all)}
 window.KENC_ATTACHMENT_PROFILES={version:VERSION,get,saveFromObject,apply,applyToSameType,clear,list:load};
})();
