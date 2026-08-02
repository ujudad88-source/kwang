
(()=>{
 const shell=document.querySelector('#drawingPanel .drawing-pro-workspace');
 if(!shell) return;
 const canvasPanel=shell.querySelector('.drawing-canvas-panel');
 const previewPanel=shell.querySelector('.drawing-3d-panel');
 const clear=()=>{
   shell.classList.remove('focus-mode','focus-2d','focus-3d');
   document.body.classList.remove('drawing-focus-active');
   [canvasPanel,previewPanel].forEach(p=>p&&p.classList.remove('focus-active'));
 };
 const open=(panel,type)=>{
   clear();
   shell.classList.add('focus-mode','focus-'+type);
   document.body.classList.add('drawing-focus-active');
   panel.classList.add('focus-active');
   requestAnimationFrame(()=>{
     if(type==='3d') document.getElementById('drawing3dCanvas')?.setAttribute('viewBox','0 0 420 560');
     else document.getElementById('drawingCanvas')?.setAttribute('viewBox','0 0 760 700');
   });
 };
 // Capture phase replaces the older focus handler so only the intended panel can open.
 shell.addEventListener('click',e=>{
   const btn=e.target.closest('[data-focus-target]');
   if(!btn) return;
   e.preventDefault();e.stopImmediatePropagation();
   const is3d=btn.dataset.focusTarget==='drawing-3d-panel';
   const target=is3d?previewPanel:canvasPanel;
   if(shell.classList.contains('focus-mode')&&target?.classList.contains('focus-active')) clear();
   else if(target) open(target,is3d?'3d':'2d');
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&shell.classList.contains('focus-mode'))clear();},true);

 const svg=document.getElementById('drawing3dCanvas');
 const cameraButtons=[...shell.querySelectorAll('[data-3d-action]')];
 let camera='iso';
 const setCamera=mode=>{
   if(!svg) return;
   camera=mode==='front'?'front':'iso';
   svg.dataset.camera=camera;
   svg.setAttribute('viewBox','0 0 420 560');
   cameraButtons.forEach(b=>b.classList.toggle('active',b.dataset['3dAction']===camera));
 };
 shell.addEventListener('click',e=>{
   const btn=e.target.closest('[data-3d-action]');
   if(!btn) return;
   e.preventDefault();e.stopImmediatePropagation();
   const action=btn.dataset['3dAction'];
   if(action==='front'||action==='iso') setCamera(action);
   else if(action==='fit'){svg?.setAttribute('viewBox','0 0 420 560');}
 },true);
 if(svg){
   const observer=new MutationObserver(()=>{svg.dataset.camera=camera;});
   observer.observe(svg,{childList:true,subtree:true});
   setCamera('iso');
 }
})();
