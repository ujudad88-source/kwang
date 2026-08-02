
(()=>{
 const canvas=document.getElementById('drawingCanvas');
 if(!canvas) return;
 let activePointer=null;
 const stopPageGesture=(e)=>{
   if(activePointer===null || e.pointerId!==activePointer) return;
   if(e.cancelable) e.preventDefault();
 };
 canvas.addEventListener('pointerdown',(e)=>{
   activePointer=e.pointerId;
   document.body.classList.add('drawing-object-dragging');
   try{ canvas.setPointerCapture(e.pointerId); }catch(_){ }
   if(e.cancelable) e.preventDefault();
 },{passive:false,capture:true});
 canvas.addEventListener('pointermove',stopPageGesture,{passive:false,capture:true});
 const release=(e)=>{
   if(activePointer!==null && (!e || e.pointerId===activePointer)){
     try{ if(e && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); }catch(_){ }
     activePointer=null;
     document.body.classList.remove('drawing-object-dragging');
   }
 };
 canvas.addEventListener('pointerup',release,{passive:false,capture:true});
 canvas.addEventListener('pointercancel',release,{passive:false,capture:true});
 window.addEventListener('blur',()=>release());
 document.addEventListener('visibilitychange',()=>{if(document.hidden) release();});
})();
