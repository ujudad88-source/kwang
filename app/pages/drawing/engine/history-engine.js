(function(){
 'use strict';const MAX=100;let undoStack=[],redoStack=[],last='';
 const clone=v=>JSON.parse(JSON.stringify(v));
 function capture(state,label='change'){const s=JSON.stringify(state);if(s===last)return;undoStack.push({label,state:clone(state)});if(undoStack.length>MAX)undoStack.shift();redoStack=[];last=s;emit()}
 function restore(target,src){Object.keys(target).forEach(k=>delete target[k]);Object.assign(target,clone(src));}
 function undo(state){if(undoStack.length<2)return false;const cur=undoStack.pop();redoStack.push(cur);const prev=undoStack[undoStack.length-1];restore(state,prev.state);last=JSON.stringify(state);emit();return true}
 function redo(state){const next=redoStack.pop();if(!next)return false;undoStack.push(next);restore(state,next.state);last=JSON.stringify(state);emit();return true}
 function emit(){document.dispatchEvent(new CustomEvent('kenc:history-changed',{detail:{undo:undoStack.length>1,redo:redoStack.length>0,count:undoStack.length}}))}
 window.KENC_HISTORY_ENGINE={version:'1.0.5',capture,undo,redo,get status(){return{undo:undoStack.length>1,redo:redoStack.length>0,count:undoStack.length}}};
})();