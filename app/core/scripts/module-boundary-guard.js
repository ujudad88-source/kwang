(()=>{
  'use strict';
  const PAGE_ROOTS=['homePanel','boxPanel','rackPanel','materialPanel','drawingPanel','manualPanel','trainingPanel'];
  window.KENC_MODULES=Object.freeze({
    version:'004.0.0',
    roots:Object.freeze([...PAGE_ROOTS]),
    policy:'page-scoped-css-and-feature-scoped-js'
  });
  function validate(){
    const duplicateIds=[...document.querySelectorAll('[id]')]
      .map(el=>el.id).filter((id,i,a)=>a.indexOf(id)!==i);
    document.documentElement.dataset.kencModules='ready';
    document.documentElement.dataset.kencDuplicateIds=String(new Set(duplicateIds).size);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',validate,{once:true});
  else validate();
})();
