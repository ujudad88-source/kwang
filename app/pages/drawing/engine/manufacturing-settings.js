(function(){
  'use strict';
  const VERSION='1.2.1';
  const KEY='kenc_manufacturing_rules_v114';
  const LABELS={vent:'환기구',key:'키',nameplate:'명판',acrylicWindow:'투명아크릴창',doubleLock:'이중시건',plate:'속판',groundBar:'접지',cableHook:'케이블걸이',cut:'타공',emboss:'엠보타공',anchor:'구멍',cover:'타공덮개'};
  const clone=v=>JSON.parse(JSON.stringify(v));
  const defaults=()=>clone(window.KENC_MANUFACTURING_RULES_ENGINE?.defaults||window.KENC_MANUFACTURING_RULES_ENGINE?.rules||{});
  let settings={};
  function load(){
    try{settings=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){settings={};}
    return settings;
  }
  function merge(base,custom){
    const out=clone(base||{});
    Object.keys(custom||{}).forEach(type=>{
      out[type]=out[type]||{};
      if(custom[type].edge)out[type].edge={...(out[type].edge||{}),...custom[type].edge};
      if(custom[type].recommended)out[type].recommended={...(out[type].recommended||{}),...custom[type].recommended};
    });
    return out;
  }
  function effective(){return merge(defaults(),settings);}
  function apply(){
    const e=effective();
    if(window.KENC_MANUFACTURING_RULES_ENGINE?.setRules)window.KENC_MANUFACTURING_RULES_ENGINE.setRules(e);
    document.dispatchEvent(new CustomEvent('kenc:manufacturing-settings-changed',{detail:e}));
    return e;
  }
  function save(next){settings=clone(next||{});localStorage.setItem(KEY,JSON.stringify(settings));apply();}
  function reset(){settings={};localStorage.removeItem(KEY);apply();}
  function ensureDialog(){
    let dialog=document.getElementById('kencManufacturingSettingsDialog');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='kencManufacturingSettingsDialog';dialog.className='kenc-rules-dialog';
    dialog.innerHTML=`<form method="dialog" class="kenc-rules-panel"><header><div><strong>제작 규칙 설정</strong><small>객체별 최소 제작 여유(mm)</small></div><button value="cancel" aria-label="닫기">×</button></header><div class="kenc-rules-grid" id="kencRulesGrid"></div><footer><button type="button" id="kencRulesReset">기본값 복원</button><span></span><button value="cancel">취소</button><button type="button" class="primary" id="kencRulesSave">저장</button></footer></form>`;
    document.body.appendChild(dialog);
    dialog.querySelector('#kencRulesReset').addEventListener('click',()=>{if(confirm('제작 규칙을 기본값으로 되돌릴까요?')){reset();renderGrid(dialog);}});
    dialog.querySelector('#kencRulesSave').addEventListener('click',()=>{
      const next={};
      dialog.querySelectorAll('[data-rule-type]').forEach(row=>{
        const type=row.dataset.ruleType;next[type]={edge:{}};
        row.querySelectorAll('input[data-side]').forEach(input=>next[type].edge[input.dataset.side]=Math.max(0,Number(input.value)||0));
      });
      save(next);dialog.close();
    });
    return dialog;
  }
  function renderGrid(dialog=ensureDialog()){
    const grid=dialog.querySelector('#kencRulesGrid'),e=effective();grid.innerHTML='';
    Object.keys(e).forEach(type=>{
      const edge=e[type]?.edge;if(!edge)return;
      const row=document.createElement('section');row.dataset.ruleType=type;row.className='kenc-rule-row';
      row.innerHTML=`<strong>${LABELS[type]||type}</strong><div>${['top','right','bottom','left'].map(side=>`<label><span>${{top:'상',right:'우',bottom:'하',left:'좌'}[side]}</span><input data-side="${side}" type="number" min="0" step="1" value="${Number(edge[side])||0}"></label>`).join('')}</div>`;
      grid.appendChild(row);
    });
  }
  function open(){const d=ensureDialog();renderGrid(d);d.showModal();}
  function install(){
    load();apply();
    const host=document.querySelector('.drawing-toolbar-actions');
    if(host&&!document.getElementById('kencManufacturingSettingsBtn')){
      const b=document.createElement('button');b.type='button';b.id='kencManufacturingSettingsBtn';b.className='drawing-action-btn';b.textContent='제작 규칙 설정';b.addEventListener('click',open);host.appendChild(b);
    }
  }
  window.KENC_MANUFACTURING_SETTINGS={version:VERSION,load,effective,apply,save,reset,open};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
