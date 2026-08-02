
(function(){
  'use strict';
  const body=document.body, sidebar=document.getElementById('ui2Sidebar'), toggle=document.getElementById('ui2SidebarToggle'), headerMenu=document.getElementById('ui2HeaderMenu');
  if(!sidebar) return;
  const scrim=document.createElement('div');scrim.className='ui2-sidebar-scrim';scrim.setAttribute('aria-hidden','true');document.body.appendChild(scrim);
  const desktop=()=>window.matchMedia('(min-width:901px)').matches;
  function setCollapsed(collapsed,persist=true){
    body.classList.toggle('ui2-sidebar-collapsed',collapsed);
    toggle?.setAttribute('aria-expanded',String(!collapsed));headerMenu?.setAttribute('aria-expanded',String(!collapsed));
    if(toggle){const t=toggle.querySelector('span');if(t)t.textContent=collapsed?'펼치기':'접기';}
    if(persist) localStorage.setItem('kenc-ui2-sidebar',collapsed?'collapsed':'open');
  }
  function closeMobile(){sidebar.classList.remove('mobile-open');scrim.classList.remove('open');}
  function toggleSidebar(){
    if(desktop()) setCollapsed(!body.classList.contains('ui2-sidebar-collapsed'));
    else {const open=!sidebar.classList.contains('mobile-open');sidebar.classList.toggle('mobile-open',open);scrim.classList.toggle('open',open);}
  }
  toggle?.addEventListener('click',toggleSidebar);headerMenu?.addEventListener('click',toggleSidebar);scrim.addEventListener('click',closeMobile);
  sidebar.querySelectorAll('[data-target]').forEach(b=>b.addEventListener('click',()=>{if(!desktop())closeMobile();}));
  const saved=localStorage.getItem('kenc-ui2-sidebar');if(desktop())setCollapsed(saved==='collapsed',false);
  window.addEventListener('resize',()=>{if(desktop())closeMobile();else body.classList.remove('ui2-sidebar-collapsed');});
  // Build 003.2 module overview cards. They are visual-only and preserve all existing controls and data logic.
  const modules={
    boxPanel:[['규격 조회','통신함·분전반·세대단자함 규격'],['표준 단가','재질별 영업 표준 단가 확인'],['즉시 적용','선택 결과와 계산을 한 화면에서']],
    rackPanel:[['제품 조회','통신·장비 RACK 규격'],['이미지 확인','선택 제품 이미지와 상세정보'],['업무 공유','제품 정보를 빠르게 공유']],
    materialPanel:[['통합 검색','제품군 미선택 상태에서도 검색'],['단가 관리','기준가와 인상률 즉시 반영'],['규격 비교','품목·규격·단가를 한 번에 확인']]
  };
  Object.entries(modules).forEach(([id,items])=>{const panel=document.getElementById(id);if(!panel||panel.querySelector('.ui2-module-overview'))return;const head=panel.querySelector(':scope > .section-head');if(!head)return;const wrap=document.createElement('div');wrap.className='ui2-module-overview';items.forEach((item,i)=>{const a=document.createElement('article');a.innerHTML='<i>'+['01','02','03'][i]+'</i><span><strong>'+item[0]+'</strong><small>'+item[1]+'</small></span>';wrap.appendChild(a)});head.insertAdjacentElement('afterend',wrap);panel.classList.add('ui2-product-module');});
})();
