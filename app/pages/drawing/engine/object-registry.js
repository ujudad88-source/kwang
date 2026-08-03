(function(){
  'use strict';
  const definitions=new Map(),renderers=new Map();
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  function validateDefinition(d){
    if(!d||typeof d!=='object')throw new TypeError('Object definition must be an object');
    if(!d.id||typeof d.id!=='string')throw new Error('Object definition requires a string id');
    if(!Array.isArray(d.mounts)||!d.mounts.length)throw new Error('Object definition '+d.id+' requires mounts');
    return d;
  }
  function registerDefinition(def){const d=validateDefinition(clone(def));definitions.set(d.id,Object.freeze(d));return definitions.get(d.id);}
  function registerRenderer(id,kind,fn){if(typeof fn!=='function')throw new TypeError('Renderer must be a function');const r=renderers.get(id)||{};r[kind]=fn;renderers.set(id,r);return fn;}
  function definition(id){return definitions.get(id)||null;}
  function renderer(id,kind){return renderers.get(id)?.[kind]||null;}
  function list(){return Array.from(definitions.values());}
  function has(id){return definitions.has(id);}
  window.KENC_OBJECT_REGISTRY={version:'1.0.4',registerDefinition,registerRenderer,definition,renderer,list,has};
})();