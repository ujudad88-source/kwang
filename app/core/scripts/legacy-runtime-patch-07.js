
(function(){
 const shell=document.querySelector('.drawing-pro-workspace'); if(!shell) return;
 const panels={
  'drawing-canvas-panel':shell.querySelector('.drawing-canvas-panel'),
  'drawing-3d-panel':shell.querySelector('.drawing-3d-panel')
 };
 function clearFocus(){shell.classList.remove('focus-mode');document.body.classList.remove('drawing-focus-active');Object.values(panels).forEach(p=>p&&p.classList.remove('focus-active'));}
 shell.addEventListener('click',function(e){
  const focus=e.target.closest('[data-focus-target]');
  if(focus){const target=panels[focus.dataset.focusTarget];if(target){if(shell.classList.contains('focus-mode')&&target.classList.contains('focus-active')){clearFocus();}else{clearFocus();shell.classList.add('focus-mode');document.body.classList.add('drawing-focus-active');target.classList.add('focus-active');} }return;}
  const tab=e.target.closest('[data-dock-tab]');
  if(tab){shell.querySelectorAll('[data-dock-tab]').forEach(b=>b.classList.toggle('active',b===tab));shell.querySelectorAll('[data-dock-pane]').forEach(p=>p.classList.toggle('active',p.dataset.dockPane===tab.dataset.dockTab));return;}
  const proxy=e.target.closest('[data-proxy-click]');if(proxy){document.getElementById(proxy.dataset.proxyClick)?.click();return;}
  const va=e.target.closest('[data-view-action]');if(va){if(va.dataset.viewAction==='grid'){va.classList.toggle('active');shell.querySelector('.drawing-v85-canvas-wrap')?.classList.toggle('grid-hidden');}else if(va.dataset.viewAction==='fit'){const svg=document.getElementById('drawingCanvas');if(svg){svg.setAttribute('viewBox','0 0 760 700');}}else if(va.dataset.viewAction==='center'){document.getElementById('drawingCanvas')?.scrollIntoView({block:'center'});}return;}
  const a3=e.target.closest('[data-3d-action]');if(a3){const svg=document.getElementById('drawing3dCanvas');if(svg){svg.setAttribute('viewBox','0 0 420 560');}return;}
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearFocus();});
 const collapse=document.getElementById('drawingDockCollapse');collapse?.addEventListener('click',()=>{const dock=collapse.closest('.drawing-bottom-dock');dock.classList.toggle('collapsed');collapse.textContent=dock.classList.contains('collapsed')?'펼치기':'접기';});
 // Lightweight history: records visible status changes without touching drawing engine.
 const status=document.getElementById('drawingStatus'), list=document.getElementById('drawingHistoryList'), count=document.getElementById('drawingHistoryCount');let history=[];
 function log(msg){msg=(msg||'').trim();if(!msg||history[0]?.msg===msg)return;history.unshift({msg,time:new Date()});history=history.slice(0,30);if(count)count.textContent=history.length;if(list){list.innerHTML='';history.forEach(x=>{const row=document.createElement('div');row.className='drawing-history-item';row.innerHTML='<time>'+x.time.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+'</time><span></span>';row.querySelector('span').textContent=x.msg;list.appendChild(row);});}}
 if(status){new MutationObserver(()=>log(status.textContent)).observe(status,{childList:true,subtree:true,characterData:true});log('Professional Workspace 시작');}
 document.getElementById('drawingRunCheckBtn')?.addEventListener('click',()=>{const out=document.getElementById('drawingCheckResults');if(!out)return;const checks=[];const w=+document.getElementById('drawingWidthInput')?.value,h=+document.getElementById('drawingHeightInput')?.value,d=+document.getElementById('drawingDepthInput')?.value;checks.push({ok:w>0&&h>0&&d>0,text:'함체 규격 입력 확인'});const canvas=document.getElementById('drawingCanvas');checks.push({ok:(canvas?.children.length||0)>0,text:'2D 도면 생성 상태 확인'});const memo=document.getElementById('productionMemo')?.value.trim();checks.push({ok:!!memo,text:memo?'제작 중요사항 작성됨':'제작 중요사항이 비어 있습니다'});const selected=document.getElementById('drawingSelectedName')?.value;const label=document.getElementById('drawingObjectLabel')?.value.trim();checks.push({ok:selected!=='명판'||!!label,text:selected==='명판'&&!label?'선택된 명판의 명판명을 확인하세요':'명판 문구 확인'});out.innerHTML='';checks.forEach(c=>{const el=document.createElement('div');el.className='drawing-check-item '+(c.ok?'ok':'warn');el.textContent=c.text;out.appendChild(el);});log('도면 검사 실행');});
})();
