(()=>{
 'use strict';
 const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
 function buildWorkspace(){
  const panel=$('#drawingPanel'); if(!panel||panel.dataset.build004==='1') return; panel.dataset.build004='1';
  const main=$('.drawing-v85-main',panel), palette=$('.drawing-palette-panel',main), canvas=$('.drawing-canvas-panel',main), props=$('.drawing-properties-panel',main), preview=$('.drawing-3d-panel',main);
  if(main&&palette&&canvas&&props&&preview){
   main.classList.add('build004-main');
   const rail=document.createElement('div'); rail.className='build004-right-rail';
   main.insertBefore(rail,preview); rail.append(preview,props);
   setupInspector(props,panel);
  }
  const stack=$('.stack-section',panel), stackCard=stack?.children?.[0], review=$('.drawing-review-workbench',stack);
  const dock=$('.drawing-bottom-dock',panel), notesCard=$('.production-config-card',dock), history=$('[data-dock-pane="history"]',dock);
  if(stack&&stackCard&&review){
   stack.classList.add('build004-bottom'); stackCard.classList.add('build004-stack-card');
   const historyCard=document.createElement('section'); historyCard.className='drawing-v85-card build004-history-card';
   historyCard.innerHTML='<div class="drawing-v85-card-head"><span>작업 이력</span><small>최근 변경 기록</small></div>';
   if(history){ history.classList.add('active'); history.style.display='block'; historyCard.append(history); }
   stack.append(historyCard);
   if(notesCard) addNotesToReview(review,notesCard);
  }
  setupViewTools(panel);
  setupMobileDrag(panel);
  updateVersion();
 }
 function setupInspector(props,panel){
  const config=$('.cabinet-config-section',panel); if(!config) return;
  const body=$('.drawing-settings-wrap',props); if(!body) return;
  const tabs=document.createElement('div'); tabs.className='build004-inspector-tabs';
  tabs.innerHTML='<button class="active" data-inspector="object" type="button">객체 속성</button><button data-inspector="cabinet" type="button">함체 속성</button>';
  const objectPane=document.createElement('div'); objectPane.className='build004-inspector-pane active'; objectPane.dataset.inspectorPane='object';
  body.parentNode.insertBefore(tabs,body); objectPane.append(body); tabs.after(objectPane);
  const cabinetPane=document.createElement('div'); cabinetPane.className='build004-inspector-pane'; cabinetPane.dataset.inspectorPane='cabinet'; cabinetPane.append(config); objectPane.after(cabinetPane);
  $$('.build004-inspector-tabs button',props).forEach(btn=>btn.addEventListener('click',()=>{
   $$('.build004-inspector-tabs button',props).forEach(b=>b.classList.toggle('active',b===btn));
   $$('.build004-inspector-pane',props).forEach(p=>p.classList.toggle('active',p.dataset.inspectorPane===btn.dataset.inspector));
  }));
 }
 function addNotesToReview(review,notesCard){
  const tabs=$('.drawing-review-tabs',review), body=$('.drawing-review-body',review); if(!tabs||!body) return;
  const tab=document.createElement('button'); tab.type='button'; tab.dataset.reviewTab='notes'; tab.textContent='제작 중요사항'; tabs.prepend(tab);
  const pane=document.createElement('section'); pane.className='drawing-review-pane'; pane.dataset.reviewPane='notes';
  const noteSection=$('.production-notes-section',notesCard), checklist=document.createElement('div'); checklist.className='build004-note-card';
  checklist.innerHTML='<h4>제작 확인 체크리스트</h4><div class="build004-checklist"><label><input type="checkbox"> 도장 색상 및 마감 확인</label><label><input type="checkbox"> 케이블 인입 위치 확인</label><label><input type="checkbox"> 명판 문구 및 부착 위치 확인</label><label><input type="checkbox"> 접지 단자 연결 위치 확인</label><label><input type="checkbox"> 시건·아크릴창·타공 확인</label><label><input type="checkbox"> 내부 부속품 및 배선 경로 확인</label></div>';
  const layout=document.createElement('div'); layout.className='build004-notes-layout';
  if(noteSection){ noteSection.className='build004-note-card'; const h=$('h4',noteSection); if(h) h.textContent='제작 중요사항'; layout.append(noteSection,checklist); }
  pane.append(layout); body.prepend(pane);
  tab.addEventListener('click',()=>activateReview(review,'notes'));
 }
 function activateReview(review,name){
  $$('[data-review-tab]',review).forEach(b=>b.classList.toggle('active',b.dataset.reviewTab===name));
  $$('[data-review-pane]',review).forEach(p=>p.classList.toggle('active',p.dataset.reviewPane===name));
 }
 function setupViewTools(panel){
  const wrap=$('.drawing-v85-canvas-wrap',panel), svg=$('#drawingCanvas',panel), gridBtn=$('[data-view-action="grid"]',panel), centerBtn=$('[data-view-action="center"]',panel), fitBtn=$('[data-view-action="fit"]',panel);
  if(!svg||!wrap) return;
  if(gridBtn){
   const fresh=gridBtn.cloneNode(true); gridBtn.replaceWith(fresh);
   fresh.addEventListener('click',e=>{e.preventDefault(); const hidden=wrap.classList.toggle('grid-hidden'); fresh.classList.toggle('active',!hidden); fresh.setAttribute('aria-pressed',String(!hidden));});
  }
  if(fitBtn){
   const fresh=fitBtn.cloneNode(true); fitBtn.replaceWith(fresh);
   fresh.addEventListener('click',e=>{e.preventDefault(); svg.setAttribute('viewBox','0 0 760 700'); svg.style.transform=''; wrap.scrollTop=0;wrap.scrollLeft=0;});
  }
  if(centerBtn){
   const fresh=centerBtn.cloneNode(true); centerBtn.replaceWith(fresh);
   fresh.addEventListener('click',e=>{e.preventDefault(); centerSelected(panel,svg,wrap,fresh);});
  }
 }
 function centerSelected(panel,svg,wrap,btn){
  const sid=window.kencDrawingState?.selectedObjectId; const selected=(sid!=null?svg.querySelector(`[data-id="${sid}"]`):null) || svg.querySelector('[data-id]');
  if(!selected){ btn.classList.add('disabled'); setTimeout(()=>btn.classList.remove('disabled'),700); return; }
  let box; try{box=selected.getBBox();}catch(_){return;}
  if(!box||!isFinite(box.x)) return;
  const pad=Math.max(30,Math.max(box.width,box.height)*.7), x=Math.max(0,box.x-pad), y=Math.max(0,box.y-pad), w=Math.max(120,box.width+pad*2), h=Math.max(120,box.height+pad*2);
  svg.setAttribute('viewBox',`${x} ${y} ${w} ${h}`); wrap.classList.add('center-flash'); setTimeout(()=>wrap.classList.remove('center-flash'),500);
 }
 function setupMobileDrag(panel){
  const svg=$('#drawingCanvas',panel); if(!svg) return;
  const stop=e=>{ if(e.cancelable)e.preventDefault(); e.stopPropagation(); };
  svg.addEventListener('touchmove',stop,{passive:false});
  svg.addEventListener('pointerdown',()=>document.body.classList.add('drawing-object-dragging'),{capture:true});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>svg.addEventListener(ev,()=>document.body.classList.remove('drawing-object-dragging'),{capture:true}));
 }
 function updateVersion(){
  document.title='KENC 광전기통신 영업지원시스템 UI 2.0 Build 004';
  $$('body *').forEach(el=>{if(el.children.length===0&&/Build 003\.7/.test(el.textContent||''))el.textContent=(el.textContent||'').replace(/Build 003\.7/g,'Build 004');});
 }
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',buildWorkspace); else buildWorkspace();
 setTimeout(buildWorkspace,600);
})();
