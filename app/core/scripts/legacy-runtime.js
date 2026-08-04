
    const panels = document.querySelectorAll(".panel");
    const partCards = document.querySelectorAll(".part-card");
    const homeButton = document.getElementById("homeButton");
    const backButton = document.getElementById("backButton");
    const breadcrumb = document.getElementById("breadcrumb");
    const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");
    const PANEL_LABELS = {
      homePanel: "첫 화면", drawingPanel: "손도면 생성", rackPanel: "랙 파트",
      boxPanel: "함 파트", materialPanel: "자재 파트", specGuidePanel: "명세서 작성 요령",
      manualPanel: "업무 매뉴얼", educationPanel: "교육 자료"
    };
    let currentPanelId = "homePanel";

    function validPanel(panelId) {
      return Boolean(panelId && document.getElementById(panelId)?.classList.contains("panel"));
    }

    function renderPanel(panelId, options = {}) {
      if (!validPanel(panelId)) panelId = "homePanel";
      const isBack = options.direction === "back";
      document.body.classList.toggle("nav-back", isBack);
      panels.forEach((panel) => panel.classList.toggle("active", panel.id === panelId));
      currentPanelId = panelId;

      const isHome = panelId === "homePanel";
      homeButton.style.display = isHome ? "none" : "inline-flex";
      backButton.classList.toggle("visible", !isHome);
      breadcrumb.classList.toggle("visible", !isHome);
      breadcrumbCurrent.textContent = PANEL_LABELS[panelId] || "현재 화면";
      document.querySelectorAll(".bottom-nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.target === panelId));
      if (panelId === "drawingPanel") applySelectedSpecToDrawing();
      haptic(10);
      window.scrollTo({ top: 0, behavior: options.instant ? "auto" : "smooth" });
      setTimeout(() => document.body.classList.remove("nav-back"), 260);
    }

    function navigateTo(panelId, options = {}) {
      if (!validPanel(panelId)) panelId = "homePanel";
      if (panelId === currentPanelId && !options.replace) return;
      const state = { appPanel: panelId };
      if (options.replace) history.replaceState(state, "", "#" + panelId);
      else history.pushState(state, "", "#" + panelId);
      renderPanel(panelId, { direction: options.direction || "forward", instant: options.instant });
    }

    function goBack() {
      if (currentPanelId === "homePanel") return;
      if (history.length > 1) history.back();
      else navigateTo("homePanel", { replace: true, direction: "back" });
    }

    partCards.forEach((card) => card.addEventListener("click", () => navigateTo(card.dataset.panel)));
    homeButton.addEventListener("click", () => navigateTo("homePanel"));
    backButton.addEventListener("click", goBack);
    document.querySelectorAll(".bottom-nav-btn").forEach((btn) => btn.addEventListener("click", () => navigateTo(btn.dataset.target)));

    window.addEventListener("popstate", (event) => {
      const panelId = event.state?.appPanel || (location.hash ? location.hash.slice(1) : "homePanel");
      renderPanel(validPanel(panelId) ? panelId : "homePanel", { direction: "back" });
    });

    // 최초 진입 상태를 앱 이력으로 등록합니다. 이후 iPhone 스와이프와 Android 뒤로가기가 같은 방식으로 동작합니다.
    const initialPanel = validPanel(location.hash.slice(1)) ? location.hash.slice(1) : "homePanel";
    history.replaceState({ appPanel: initialPanel }, "", "#" + initialPanel);
    renderPanel(initialPanel, { instant: true });

    function haptic(duration = 8) {
      try { if (navigator.vibrate) navigator.vibrate(duration); } catch (_) {}
    }
    document.addEventListener("click", (event) => {
      if (event.target.closest("button, .spec-table tbody tr")) haptic(6);
    }, { passive: true });

    const orientationMedia = window.matchMedia("(orientation: landscape)");
    function syncOrientationClass(){document.documentElement.classList.toggle("is-landscape", orientationMedia.matches);}
    syncOrientationClass();
    if (orientationMedia.addEventListener) orientationMedia.addEventListener("change", syncOrientationClass); else orientationMedia.addListener(syncOrientationClass);

    const drawingToolDefs = [
      {id:"vent",label:"환기구",icon:"▦",options:["와이드 절곡 루버형"],w:160,h:90},
      {id:"anchor",label:"앙카구멍",icon:"•",options:["앙카구멍"],w:18,h:18},
      {id:"key",label:"키종류",icon:"⌸",options:["탈착키","푸쉬버튼키","푸쉬핸들키"],w:42,h:120},
      {id:"nameplate",label:"명판",icon:"▭",options:["통신용","분전반용"],w:100,h:30},
      {id:"acrylicWindow",label:"투명아크릴창",icon:"▭",options:["기본형"],w:220,h:140},
      {id:"emboss",label:"타공형태",icon:"⊙",options:["엠보타공 원형","엠보타공 사각형"],w:90,h:90},
      {id:"cut",label:"타공",icon:"⊗",options:["원형타공","사각타공"],w:90,h:90},
      {id:"plate",label:"속판",icon:"□",options:["PVC속판","철속판","빼끄판"],w:180,h:130},
      {id:"groundBar",label:"접지",icon:"⏟",options:["철접지 · 상(위)","철접지 · 하(아래)","철접지 · 좌(왼쪽)","철접지 · 우(오른쪽)","동접지 · 상(위)","동접지 · 하(아래)","동접지 · 좌(왼쪽)","동접지 · 우(오른쪽)"],w:180,h:55},
      {id:"cableHook",label:"케이블 걸이",icon:"‹›",options:["왼쪽 <","오른쪽 >","수평"],w:55,h:75},
      {id:"cover",label:"타공 덮개",icon:"▣",options:["기본형"],w:110,h:90},
      {id:"doubleLock",label:"이중시건",icon:"⊃",options:["노출함용","카바용"],w:70,h:80}
    ];
    const drawingSurfaces=[
      {id:"front",label:"정면"},{id:"back",label:"뒷면"},{id:"inside",label:"내부"},{id:"left",label:"좌측"},{id:"right",label:"우측"},{id:"top",label:"상부"},{id:"bottom",label:"하부"}
    ];
    const drawingState={
      cabinets:[
        {id:1,name:"함체 1 (상단)",width:600,height:700,depth:130,material:"일반 철판",thickness:"1.6T",objects:[]},
        {id:2,name:"함체 2 (중단)",width:600,height:200,depth:130,material:"일반 철판",thickness:"1.6T",objects:[]},
        {id:3,name:"함체 3 (하단)",width:600,height:700,depth:130,material:"일반 철판",thickness:"1.6T",objects:[]}
      ],selectedCabinetId:1,nextCabinetId:4,nextObjectId:1,surface:"front",activeTool:"vent",toolOptions:{},selectedObjectId:null,drag:null,layout:null,mode3d:"single",stackPreview:"2d",stack3dView:{yaw:-35,pitch:-18,zoom:1,panX:0,panY:0},live3dView:{yaw:-35,pitch:-18,zoom:1,panX:0,panY:0},productionNotes:{paintColor:"",doorDirection:"",acrylic:"",silkPrint:"",memo:""}
    };
    drawingToolDefs.forEach(t=>drawingState.toolOptions[t.id]=t.options[0]);
    const $=id=>document.getElementById(id);
    const drawingWidthInput=$("drawingWidthInput"),drawingHeightInput=$("drawingHeightInput"),drawingDepthInput=$("drawingDepthInput"),drawingGenerateBtn=$("drawingGenerateBtn"),drawingSaveBtn=$("drawingSaveBtn"),drawingResetBtn=$("drawingResetBtn"),drawingExportBtn=$("drawingExportBtn"),drawingToolList=$("drawingToolList"),drawingTabbar=$("drawingTabbar"),drawingCanvas=$("drawingCanvas"),drawing3dCanvas=$("drawing3dCanvas"),drawingSelectedName=$("drawingSelectedName"),drawingObjectX=$("drawingObjectX"),drawingObjectY=$("drawingObjectY"),drawingObjectW=$("drawingObjectW"),drawingObjectH=$("drawingObjectH"),drawingObjectRotation=$("drawingObjectRotation"),drawingObjectLabel=$("drawingObjectLabel"),drawingObjectLabelField=$("drawingObjectLabelField"),drawingApplyBtn=$("drawingApplyBtn"),drawingDeleteBtn=$("drawingDeleteBtn"),drawingStatus=$("drawingStatus"),stackList=$("stackList"),stackPreviewCanvas=$("stackPreviewCanvas");
    const currentCabinet=()=>drawingState.cabinets.find(c=>c.id===drawingState.selectedCabinetId)||drawingState.cabinets[0];
    const currentObjects=()=>currentCabinet().objects;
    const toolById=id=>drawingToolDefs.find(t=>t.id===id);
    const svgEl=(tag,a={},txt="")=>{const n=document.createElementNS("http://www.w3.org/2000/svg",tag);Object.entries(a).forEach(([k,v])=>n.setAttribute(k,v));if(txt)n.textContent=txt;return n};
    const clamp=(v,a,b)=>Math.max(a,Math.min(v,b));
    function plane(surface,c=currentCabinet()){if(surface==="left"||surface==="right")return{width:c.depth,height:c.height};if(surface==="top"||surface==="bottom")return{width:c.width,height:c.depth};return{width:c.width,height:c.height}}
    function setStatus(t){drawingStatus.textContent=t}
    function syncInputs(){const c=currentCabinet();drawingWidthInput.value=c.width;drawingHeightInput.value=c.height;drawingDepthInput.value=c.depth;$("cabinetNameInput").value=c.name;$("cabinetWidthInput").value=c.width;$("cabinetHeightInput").value=c.height;$("cabinetDepthInput").value=c.depth;$("cabinetMaterialSelect").value=c.material;$("cabinetThicknessSelect").value=["1.0T","1.2T","1.4T","1.6T"].includes(c.thickness)?c.thickness:"1.6T"}
    function buildTools(){drawingToolList.innerHTML="";drawingToolDefs.forEach(t=>{const r=document.createElement("div");r.className="drawing-tool-row"+(drawingState.activeTool===t.id?" active":"");const b=document.createElement("button");b.className="drawing-tool-pick";b.type="button";b.textContent=t.icon;b.onclick=()=>{drawingState.activeTool=t.id;buildTools();setStatus(`${t.label} 배치 모드입니다.`)};const m=document.createElement("div");m.className="drawing-tool-meta";m.innerHTML=`<span class="drawing-tool-name">${t.label}</span>`;const sel=document.createElement("select");sel.className="drawing-tool-option";t.options.forEach(o=>sel.add(new Option(o,o)));sel.value=drawingState.toolOptions[t.id];sel.onchange=e=>{drawingState.toolOptions[t.id]=e.target.value;drawingState.activeTool=t.id;buildTools()};m.appendChild(sel);r.append(b,m);drawingToolList.appendChild(r)})}
    function buildTabs(){drawingTabbar.innerHTML="";drawingSurfaces.forEach(s=>{const b=document.createElement("button");b.className="drawing-view-tab"+(drawingState.surface===s.id?" active":"");b.textContent=s.label;b.onclick=()=>{drawingState.surface=s.id;drawingState.selectedObjectId=null;buildTabs();renderAll()};drawingTabbar.appendChild(b)})}
    function clampObj(o){const p=plane(o.surface);o.w=clamp(o.w,10,p.width);o.h=clamp(o.h,10,p.height);o.x=clamp(o.x,0,p.width-o.w);o.y=clamp(o.y,0,p.height-o.h)}
    function screenPoint(e,svg=drawingCanvas){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())}
    function toPlane(e){const q=screenPoint(e),l=drawingState.layout;return{x:(q.x-l.x)/l.s,y:(q.y-l.y)/l.s}}
    function selectedObj(){return currentObjects().find(o=>o.id===drawingState.selectedObjectId)||null}
    function updateObjectPanel(){const o=selectedObj(),dis=!o;[drawingObjectX,drawingObjectY,drawingObjectW,drawingObjectH,drawingObjectRotation,drawingApplyBtn,drawingDeleteBtn].forEach(x=>x.disabled=dis);drawingSelectedName.value=o?`${toolById(o.type).label} · ${o.option}`:"선택된 객체 없음";drawingObjectX.value=o?Math.round(o.x):"";drawingObjectY.value=o?Math.round(o.y):"";drawingObjectW.value=o?Math.round(o.w):"";drawingObjectH.value=o?Math.round(o.h):"";drawingObjectRotation.value=o?Math.round(o.rot||0):"";const isNameplate=!!o&&o.type==="nameplate";drawingObjectLabelField.classList.toggle("show",isNameplate);drawingObjectLabel.disabled=!isNameplate;drawingObjectLabel.value=isNameplate?(o.label||"명판"):""}
    function drawShape(g,o,x,y,w,h,is3d=false){const black="#1f2937",red="#e11d48",sw=is3d?1.3:2;
      if(o.type==="vent"){
        // KENC 표준 와이드 절곡 루버: 철판 자체를 프레스/절곡한 5단 형상
        const edge=is3d?"#cbd5e1":black, metal=is3d?"#64748b":"#f8fafc", shadow=is3d?"#0f172a":"#475569";
        const framePad=Math.max(1.5,Math.min(w,h)*.035), bladeH=h*.105, gap=h*.055;
        g.appendChild(svgEl("rect",{x,y,width:w,height:h,rx:Math.max(2,Math.min(w,h)*.035),fill:is3d?"#334155":"#fff",stroke:edge,"stroke-width":sw}));
        for(let i=0;i<5;i++){
          const by=y+h*.14+i*(bladeH+gap), bx=x+w*.075, bw=w*.85, lip=Math.max(2,h*.045);
          // 상단 절곡면
          g.appendChild(svgEl("polygon",{points:`${bx},${by+lip} ${bx+w*.045},${by} ${bx+bw-w*.045},${by} ${bx+bw},${by+lip}`,
            fill:metal,stroke:edge,"stroke-width":Math.max(.75,sw*.72),"stroke-linejoin":"round"}));
          // 전면 루버 날개
          g.appendChild(svgEl("polygon",{points:`${bx},${by+lip} ${bx+bw},${by+lip} ${bx+bw-w*.035},${by+bladeH} ${bx+w*.035},${by+bladeH}`,
            fill:is3d?"#475569":"#e2e8f0",stroke:edge,"stroke-width":Math.max(.75,sw*.72),"stroke-linejoin":"round"}));
          // 아래쪽 음영으로 절곡 깊이 표현
          g.appendChild(svgEl("line",{x1:bx+w*.04,y1:by+bladeH,x2:bx+bw-w*.04,y2:by+bladeH,stroke:shadow,"stroke-width":Math.max(.7,sw*.55),"stroke-opacity":is3d?.9:.65}));
        }
        if(!is3d) g.appendChild(svgEl("text",{x:x+w/2,y:y+h-.05*h,"text-anchor":"middle","font-size":Math.max(7,Math.min(11,w/17)),fill:"#475569","font-weight":700},"와이드 절곡 루버"));
      }
      else if(o.type==="anchor")g.appendChild(svgEl("circle",{cx:x+w/2,cy:y+h/2,r:Math.max(2,Math.min(w,h)*.22),fill:black}));
      else if(o.type==="key"){
        const silver=is3d?"#cbd5e1":"#e5e7eb", hi=is3d?"#f8fafc":"#ffffff", dark=is3d?"#111827":"#374151";
        if(o.option==="탈착키"){
          // 검정 사각 탈착키
          g.appendChild(svgEl("rect",{x:x+w*.18,y:y+h*.08,width:w*.64,height:h*.84,rx:Math.max(2,w*.09),fill:is3d?"#111827":"#1f2937",stroke:dark,"stroke-width":sw}));
          g.appendChild(svgEl("rect",{x:x+w*.30,y:y+h*.18,width:w*.40,height:h*.30,rx:Math.max(1,w*.05),fill:is3d?"#020617":"#111827",stroke:"#6b7280","stroke-width":Math.max(.8,sw*.65)}));
          g.appendChild(svgEl("circle",{cx:x+w*.5,cy:y+h*.68,r:Math.min(w,h)*.105,fill:"none",stroke:silver,"stroke-width":Math.max(1,sw*.8)}));
          g.appendChild(svgEl("line",{x1:x+w*.5,y1:y+h*.60,x2:x+w*.5,y2:y+h*.76,stroke:silver,"stroke-width":Math.max(1,sw*.75)}));
        }else if(o.option==="푸쉬버튼키"){
          // PUSHL 은색 매립형
          g.appendChild(svgEl("path",{d:`M ${x+w*.22} ${y+h*.16} Q ${x+w*.5} ${y-h*.02} ${x+w*.78} ${y+h*.16} L ${x+w*.78} ${y+h*.88} Q ${x+w*.5} ${y+h*.98} ${x+w*.22} ${y+h*.88} Z`,fill:silver,stroke:dark,"stroke-width":sw}));
          g.appendChild(svgEl("rect",{x:x+w*.34,y:y+h*.22,width:w*.32,height:h*.34,rx:Math.max(2,w*.08),fill:is3d?"#475569":"#9ca3af",stroke:dark,"stroke-width":Math.max(.8,sw*.65)}));
          g.appendChild(svgEl("text",{x:x+w*.5,y:y+h*.68,"text-anchor":"middle","font-size":Math.max(5,Math.min(9,w*.18)),fill:dark,"font-weight":800},"PUSH"));
          g.appendChild(svgEl("circle",{cx:x+w*.5,cy:y+h*.80,r:Math.min(w,h)*.075,fill:hi,stroke:dark,"stroke-width":Math.max(.8,sw*.65)}));
        }else{
          // 122mm 푸쉬핸들키
          g.appendChild(svgEl("rect",{x:x+w*.20,y:y+h*.04,width:w*.60,height:h*.92,rx:Math.max(4,w*.18),fill:silver,stroke:dark,"stroke-width":sw}));
          g.appendChild(svgEl("ellipse",{cx:x+w*.5,cy:y+h*.20,rx:w*.18,ry:h*.075,fill:is3d?"#475569":"#9ca3af",stroke:dark,"stroke-width":Math.max(.8,sw*.65)}));
          g.appendChild(svgEl("rect",{x:x+w*.34,y:y+h*.32,width:w*.32,height:h*.34,rx:Math.max(2,w*.07),fill:is3d?"#64748b":"#cbd5e1",stroke:dark,"stroke-width":Math.max(.8,sw*.65)}));
          g.appendChild(svgEl("text",{x:x+w*.5,y:y+h*.76,"text-anchor":"middle","font-size":Math.max(5,Math.min(9,w*.18)),fill:dark,"font-weight":800},"PUSH"));
          g.appendChild(svgEl("circle",{cx:x+w*.5,cy:y+h*.86,r:Math.min(w,h)*.065,fill:hi,stroke:dark,"stroke-width":Math.max(.8,sw*.65)}));
        }
      }
      else if(o.type==="nameplate"){
        const isComm=o.option!=="분전반용", fill=is3d?"#f8fafc":"#fffdf5", edge="#64748b";
        g.appendChild(svgEl("rect",{x,y,width:w,height:h,rx:Math.max(1,Math.min(w,h)*.08),fill,stroke:edge,"stroke-width":sw}));
        g.appendChild(svgEl("rect",{x:x+w*.025,y:y+h*.08,width:w*.95,height:h*.84,rx:Math.max(1,Math.min(w,h)*.05),fill:"none",stroke:"#cbd5e1","stroke-width":Math.max(.6,sw*.45)}));
        g.appendChild(svgEl("text",{x:x+w/2,y:y+h/2+Math.max(3,h*.12),"text-anchor":"middle","font-size":Math.max(7,Math.min(14,w/8)),fill:black,"font-weight":800},o.label|| (isComm?"통신용":"분전반용")));
      }
      else if(o.type==="acrylicWindow"){
        const frame=is3d?"#d1d5db":"#e5e7eb", edge="#4b5563", glass=is3d?"rgba(125,211,252,.22)":"rgba(186,230,253,.28)", inset=Math.max(3,Math.min(w,h)*.08);
        g.appendChild(svgEl("rect",{x,y,width:w,height:h,rx:Math.max(3,Math.min(w,h)*.04),fill:frame,stroke:edge,"stroke-width":sw}));
        g.appendChild(svgEl("rect",{x:x+inset,y:y+inset,width:Math.max(1,w-inset*2),height:Math.max(1,h-inset*2),rx:Math.max(2,Math.min(w,h)*.025),fill:glass,stroke:"#0891b2","stroke-width":Math.max(1,sw*.75)}));
        g.appendChild(svgEl("line",{x1:x+inset+w*.10,y1:y+inset+h*.08,x2:x+inset+w*.38,y2:y+inset+h*.34,stroke:"#e0f2fe","stroke-width":Math.max(1,sw*.8),"stroke-opacity":.8}));
        g.appendChild(svgEl("line",{x1:x+inset+w*.20,y1:y+inset+h*.06,x2:x+inset+w*.47,y2:y+inset+h*.31,stroke:"#bae6fd","stroke-width":Math.max(.7,sw*.55),"stroke-opacity":.65}));
      }
      else if(o.type==="emboss"){if(o.option.includes("원형")){const r=Math.min(w,h)*.3,cx=x+w/2,cy=y+h/2;g.appendChild(svgEl("circle",{cx,cy,r,fill:"none",stroke:black,"stroke-width":sw}));[[0,-1],[0,1],[-1,0],[1,0]].forEach(([dx,dy])=>g.appendChild(svgEl("line",{x1:cx+dx*(r+4),y1:cy+dy*(r+4),x2:cx+dx*(r+14),y2:cy+dy*(r+14),stroke:black,"stroke-width":sw})))}else g.appendChild(svgEl("rect",{x:x+w*.2,y:y+h*.2,width:w*.6,height:h*.6,fill:"none",stroke:black,"stroke-width":sw}))}
      else if(o.type==="cut"){const cx=x+w/2,cy=y+h/2;if(o.option==="원형타공")g.appendChild(svgEl("circle",{cx,cy,r:Math.min(w,h)*.38,fill:"none",stroke:red,"stroke-width":sw}));else g.appendChild(svgEl("rect",{x:x+w*.12,y:y+h*.12,width:w*.76,height:h*.76,fill:"none",stroke:red,"stroke-width":sw}));g.appendChild(svgEl("line",{x1:x+w*.25,y1:y+h*.25,x2:x+w*.75,y2:y+h*.75,stroke:red,"stroke-width":sw}));g.appendChild(svgEl("line",{x1:x+w*.75,y1:y+h*.25,x2:x+w*.25,y2:y+h*.75,stroke:red,"stroke-width":sw}))}
      else if(o.type==="plate"){
        const variant=(o.variant||"") || (o.option==="철속판"?"steel_plain":(o.option==="빼끄판"||o.option==="베크라이트 절연판")?"bakelite_yellow":"pvc_perforated");
        const edge=is3d?"#334155":"#374151", slotStroke=is3d?"#475569":"#4b5563";
        const fill=variant==="bakelite_yellow"?(is3d?"#c99b22":"#d6a72b"):variant==="steel_plain"?(is3d?"#b8bec3":"#d1d5db"):(is3d?"#aeb4b7":"#c7cccf");
        const radius=Math.max(2,Math.min(w,h)*.025);
        g.appendChild(svgEl("rect",{x,y,width:w,height:h,rx:radius,fill,stroke:edge,"stroke-width":sw}));
        g.appendChild(svgEl("rect",{x:x+w*.018,y:y+h*.018,width:w*.964,height:h*.964,rx:radius,fill:"none",stroke:is3d?"#e5e7eb":"#9ca3af","stroke-width":Math.max(.55,sw*.42),"stroke-opacity":.72}));
        const slot=(cx,cy,ang)=>{
          const sl=Math.max(8,Math.min(w,h)*.12), st=Math.max(3,Math.min(w,h)*.045);
          g.appendChild(svgEl("rect",{x:cx-sl/2,y:cy-st/2,width:sl,height:st,rx:st/2,fill:is3d?"#1f2937":"#fff",stroke:slotStroke,"stroke-width":Math.max(.65,sw*.55),transform:`rotate(${ang} ${cx} ${cy})`}));
        };
        slot(x+w*.07,y+h*.07,-45);slot(x+w*.93,y+h*.07,45);slot(x+w*.07,y+h*.93,45);slot(x+w*.93,y+h*.93,-45);
        if(variant==="pvc_perforated"){
          const cols=Math.max(8,Math.min(22,Math.round(w/9))),rows=Math.max(10,Math.min(28,Math.round(h/9)));
          const mx=w*.11,my=h*.11,dx=(w-mx*2)/(cols-1),dy=(h-my*2)/(rows-1),rr=Math.max(.55,Math.min(1.5,Math.min(w,h)/180));
          for(let iy=0;iy<rows;iy++)for(let ix=0;ix<cols;ix++){
            const px=x+mx+ix*dx,py=y+my+iy*dy;
            if((ix<2&&iy<2)||(ix>cols-3&&iy<2)||(ix<2&&iy>rows-3)||(ix>cols-3&&iy>rows-3))continue;
            g.appendChild(svgEl("circle",{cx:px,cy:py,r:rr,fill:is3d?"#475569":"#6b7280","fill-opacity":.88}));
          }
          g.appendChild(svgEl("circle",{cx:x+w*.5,cy:y+h*.5,r:Math.max(1.6,Math.min(w,h)*.018),fill:is3d?"#111827":"#fff",stroke:slotStroke,"stroke-width":Math.max(.7,sw*.55)}));
        }else if(variant==="steel_plain"){
          g.appendChild(svgEl("line",{x1:x+w*.12,y1:y+h*.18,x2:x+w*.70,y2:y+h*.18,stroke:is3d?"#eef2f5":"#f8fafc","stroke-width":Math.max(.8,sw*.55),"stroke-opacity":.65}));
        }else{
          g.appendChild(svgEl("line",{x1:x+w*.10,y1:y+h*.16,x2:x+w*.76,y2:y+h*.16,stroke:"#f4cf63","stroke-width":Math.max(.8,sw*.6),"stroke-opacity":.55}));
          g.appendChild(svgEl("line",{x1:x+w*.15,y1:y+h*.82,x2:x+w*.84,y2:y+h*.82,stroke:"#8a6414","stroke-width":Math.max(.7,sw*.5),"stroke-opacity":.45}));
        }
        g.appendChild(svgEl("text",{x:x+w/2,y:y+h/2+4,"text-anchor":"middle","font-size":Math.max(7,Math.min(13,w/9)),fill:variant==="bakelite_yellow"?"#513b0d":"#1f2937","font-weight":800,"paint-order":"stroke","stroke":fill,"stroke-width":Math.max(1,sw*1.1)},o.option||"속판"));
      }
      else if(o.type==="groundBar"){
        const material=o.option.includes("동접지")?"copper":"iron";
        const direction=o.option.includes("하(")?"down":o.option.includes("좌(")?"left":o.option.includes("우(")?"right":"up";
        g.appendChild(svgEl("image",{x,y,width:w,height:h,href:`assets/ground/${material}_${direction}.png`,"preserveAspectRatio":"xMidYMid meet"}));
      }
      else if(o.type==="cableHook"){
        if(o.option==="수평")g.appendChild(svgEl("image",{x,y,width:w,height:h,href:"assets/cable_hook_horizontal.png","preserveAspectRatio":"xMidYMid meet"}));
        else g.appendChild(svgEl("text",{x:x+w/2,y:y+h*.72,"text-anchor":"middle","font-size":Math.max(18,h*.75),fill:black},o.option.includes("왼쪽")?"<":">"));
      }
      else if(o.type==="cover"){g.appendChild(svgEl("rect",{x,y,width:w,height:h,fill:"none",stroke:black,"stroke-width":sw}));[[.5,.1],[.5,.9],[.1,.5],[.9,.5]].forEach(([a,b])=>g.appendChild(svgEl("circle",{cx:x+w*a,cy:y+h*b,r:Math.max(1.5,Math.min(w,h)*.035),fill:"none",stroke:black,"stroke-width":sw})))}
      else if(o.type==="doubleLock"){
        const metal=is3d?"#d1d5db":"#e5e7eb", edge="#374151";
        if(o.option==="카바용"){
          // 함 상부 중앙에 놓이는 얇은 철판 탭
          g.appendChild(svgEl("rect",{x:x+w*.12,y:y+h*.34,width:w*.76,height:h*.22,rx:Math.max(1,h*.035),fill:metal,stroke:edge,"stroke-width":sw}));
          g.appendChild(svgEl("circle",{cx:x+w*.5,cy:y+h*.45,r:Math.min(w,h)*.10,fill:"#fff",stroke:edge,"stroke-width":sw}));
        }else{
          // 문 안쪽에서 철판을 관통해 나온 원형 고리
          g.appendChild(svgEl("rect",{x:x+w*.38,y:y+h*.46,width:w*.24,height:h*.38,rx:Math.max(1,w*.04),fill:metal,stroke:edge,"stroke-width":sw}));
          g.appendChild(svgEl("ellipse",{cx:x+w*.5,cy:y+h*.34,rx:w*.22,ry:h*.22,fill:"none",stroke:edge,"stroke-width":Math.max(2,sw*1.35)}));
          g.appendChild(svgEl("ellipse",{cx:x+w*.5,cy:y+h*.34,rx:w*.10,ry:h*.11,fill:"#fff",stroke:edge,"stroke-width":Math.max(1,sw*.75)}));
        }
      }
    }
    function render2d(){const c=currentCabinet(),p=plane(drawingState.surface),vw=760,vh=700,pad={l:105,r:55,t:60,b:90},s=Math.min((vw-pad.l-pad.r)/p.width,(vh-pad.t-pad.b)/p.height),w=p.width*s,h=p.height*s,x=pad.l+(vw-pad.l-pad.r-w)/2,y=pad.t+(vh-pad.t-pad.b-h)/2;drawingState.layout={x,y,s,w,h,p};drawingCanvas.innerHTML="";drawingCanvas.append(svgEl("rect",{x:0,y:0,width:vw,height:vh,fill:"#fff"}),svgEl("text",{x:24,y:30,"font-size":16,"font-weight":800,fill:"#111827"},`${drawingSurfaces.find(v=>v.id===drawingState.surface).label} · ${c.name}`));drawingCanvas.appendChild(svgEl("rect",{x,y,width:w,height:h,fill:"#fff",stroke:"#111827","stroke-width":2}));
      currentObjects().filter(o=>o.surface===drawingState.surface).forEach(o=>{const sx=x+o.x*s,sy=y+o.y*s,sw=o.w*s,sh=o.h*s,g=svgEl("g",{"data-id":o.id,transform:`rotate(${o.rot||0} ${sx+sw/2} ${sy+sh/2})`,style:"cursor:grab"});drawShape(g,o,sx,sy,sw,sh);if(o.id===drawingState.selectedObjectId)g.appendChild(svgEl("rect",{x:sx-4,y:sy-4,width:sw+8,height:sh+8,fill:"none",stroke:"#2563eb","stroke-width":2,"stroke-dasharray":"6 4"}));g.appendChild(svgEl("rect",{x:sx-8,y:sy-8,width:sw+16,height:sh+16,fill:"transparent","data-id":o.id}));drawingCanvas.appendChild(g)});
      drawingCanvas.append(svgEl("line",{x1:x,y1:y+h+30,x2:x+w,y2:y+h+30,stroke:"#2563eb","stroke-width":1.8}),svgEl("text",{x:x+w/2,y:y+h+53,"text-anchor":"middle",fill:"#2563eb","font-size":15,"font-weight":800},`${p.width}`),svgEl("line",{x1:x-30,y1:y,x2:x-30,y2:y+h,stroke:"#2563eb","stroke-width":1.8}),svgEl("text",{x:x-42,y:y+h/2,"text-anchor":"middle",fill:"#2563eb","font-size":15,"font-weight":800,transform:`rotate(-90 ${x-42} ${y+h/2})`},`${p.height}`));
    }
    function drawCabinet3d(svg,c,ox,oy,scale,objects=true){
      const fw=c.width*scale,fh=c.height*scale,dep=Math.max(18,c.depth*scale*.55),depthPx=Math.max(1,c.depth*scale),diag=dep/depthPx;
      const A=[ox,oy+dep],B=[ox+fw,oy+dep],C=[ox+fw,oy+fh+dep],D=[ox,oy+fh+dep],E=[ox+dep,oy],F=[ox+fw+dep,oy],G=[ox+fw+dep,oy+fh],H=[ox+dep,oy+fh];
      const solid="#111827",sw=1.55;
      const line=(p1,p2)=>svg.appendChild(svgEl("line",{x1:p1[0],y1:p1[1],x2:p2[0],y2:p2[1],stroke:solid,"stroke-width":sw,"stroke-linecap":"round"}));
      [[A,B],[B,C],[C,D],[D,A],[E,F],[F,G],[G,H],[H,E],[A,E],[B,F],[C,G],[D,H]].forEach(([p1,p2])=>line(p1,p2));

      if(objects){
        const faces={
          back:{origin:E,ux:[1,0],vy:[0,1],opacity:.58},
          inside:{origin:[A[0]+dep*.92,A[1]-dep*.92],ux:[1,0],vy:[0,1],opacity:.96,mounted:true},
          left:{origin:A,ux:[diag,-diag],vy:[0,1],opacity:.78},
          right:{origin:B,ux:[diag,-diag],vy:[0,1],opacity:.92},
          top:{origin:E,ux:[1,0],vy:[-diag,diag],opacity:.9},
          bottom:{origin:H,ux:[1,0],vy:[-diag,diag],opacity:.82},
          front:{origin:A,ux:[1,0],vy:[0,1],opacity:1}
        };
        const order=["back","inside","left","right","top","bottom","front"];
        order.forEach(surface=>{
          const face=faces[surface];
          c.objects.filter(o=>o.surface===surface).forEach(o=>{
            const outer=svgEl("g",{
              transform:`matrix(${face.ux[0]} ${face.ux[1]} ${face.vy[0]} ${face.vy[1]} ${face.origin[0]} ${face.origin[1]})`,
              opacity:face.opacity
            });
            const inner=svgEl("g",{transform:`rotate(${o.rot||0} ${(o.x+o.w/2)*scale} ${(o.y+o.h/2)*scale})`});
            drawShape(inner,o,o.x*scale,o.y*scale,o.w*scale,o.h*scale,true);
            if(face.mounted){
              inner.setAttribute("filter","drop-shadow(2px 2px 1.4px rgba(17,24,39,.48))");
              const bx=o.x*scale,by=o.y*scale,bw=o.w*scale,bh=o.h*scale,br=Math.max(1.4,Math.min(3.2,Math.min(bw,bh)*.045));
              [[bx+br*2,by+br*2],[bx+bw-br*2,by+br*2],[bx+br*2,by+bh-br*2],[bx+bw-br*2,by+bh-br*2]].forEach(([cx,cy])=>inner.appendChild(svgEl("circle",{cx,cy,r:br,fill:"#64748b",stroke:"#f8fafc","stroke-width":Math.max(.7,br*.45),"vector-effect":"non-scaling-stroke"})));
            }
            outer.appendChild(inner);
            svg.appendChild(outer);
          });
        });
      }
      return{width:fw+dep,height:fh+dep}
    }
    function render3d(){
      if(window.KENC3DViewer&&typeof window.KENC3DViewer.render==="function"){
        window.KENC3DViewer.render({svg:drawing3dCanvas,state:drawingState,currentCabinet:currentCabinet()});
        return;
      }
      drawing3dCanvas.innerHTML="";drawing3dCanvas.appendChild(svgEl("rect",{x:0,y:0,width:420,height:560,fill:"#fff"}));if(drawingState.mode3d==="single"){const c=currentCabinet(),sc=Math.min(290/c.width,390/c.height,90/c.depth);drawCabinet3d(drawing3dCanvas,c,55,70,sc,true);drawing3dCanvas.appendChild(svgEl("text",{x:210,y:535,"text-anchor":"middle","font-size":13,fill:"#667085"},`${c.width} × ${c.height} × ${c.depth} mm`))}else{const total=drawingState.cabinets.reduce((a,c)=>a+c.height,0),maxW=Math.max(...drawingState.cabinets.map(c=>c.width)),maxD=Math.max(...drawingState.cabinets.map(c=>c.depth)),sc=Math.min(285/maxW,390/total,80/maxD);let y=55;drawingState.cabinets.forEach(c=>{drawCabinet3d(drawing3dCanvas,c,55,y,sc,true);y+=c.height*sc});drawing3dCanvas.appendChild(svgEl("text",{x:210,y:535,"text-anchor":"middle","font-size":13,fill:"#667085"},`적층 전체 높이 ${total} mm`))}
    }
    function addObjectAt(px,py){const t=toolById(drawingState.activeTool),option=drawingState.toolOptions[t.id];let ow=t.w,oh=t.h;if(t.id==="groundBar"&&(option.includes("좌(")||option.includes("우("))){ow=55;oh=180}else if(t.id==="cableHook"&&option==="수평"){ow=180;oh=55}else if(t.id==="nameplate"){ow=option==="분전반용"?150:100;oh=30}else if(t.id==="doubleLock"&&option==="카바용"){ow=90;oh=34}const o={id:drawingState.nextObjectId++,type:t.id,option,surface:drawingState.surface,x:px-ow/2,y:py-oh/2,w:ow,h:oh,rot:0,label:t.id==="nameplate"?(option==="분전반용"?"분전반용":"통신용"):""};clampObj(o);currentObjects().push(o);drawingState.selectedObjectId=o.id;renderAll();setStatus(`${t.label} 객체를 배치했습니다.`)}
    drawingCanvas.onpointerdown=e=>{const hit=e.target.closest("[data-id]");const q=toPlane(e);if(hit){const o=currentObjects().find(v=>v.id===Number(hit.dataset.id));drawingState.selectedObjectId=o.id;drawingState.drag={id:o.id,dx:q.x-o.x,dy:q.y-o.y};updateObjectPanel();render2d();e.preventDefault()}else if(q.x>=0&&q.y>=0&&q.x<=drawingState.layout.p.width&&q.y<=drawingState.layout.p.height)addObjectAt(q.x,q.y)};
    window.addEventListener("pointermove",e=>{if(!drawingState.drag)return;const o=currentObjects().find(v=>v.id===drawingState.drag.id),q=toPlane(e);o.x=q.x-drawingState.drag.dx;o.y=q.y-drawingState.drag.dy;clampObj(o);render2d();updateObjectPanel();e.preventDefault()},{passive:false});window.addEventListener("pointerup",()=>drawingState.drag=null);
    function applyObj(){const o=selectedObj();if(!o)return;o.x=Number(drawingObjectX.value)||0;o.y=Number(drawingObjectY.value)||0;o.w=Number(drawingObjectW.value)||o.w;o.h=Number(drawingObjectH.value)||o.h;o.rot=Number(drawingObjectRotation.value)||0;if(o.type==="nameplate")o.label=drawingObjectLabel.value.trim()||"명판";clampObj(o);renderAll()}
    function deleteObj(){const c=currentCabinet();c.objects=c.objects.filter(o=>o.id!==drawingState.selectedObjectId);drawingState.selectedObjectId=null;renderAll()}
    function renderStackList(){stackList.innerHTML="";drawingState.cabinets.forEach((c,i)=>{const b=document.createElement("div");b.setAttribute("role","button");b.tabIndex=0;b.className="stack-item"+(c.id===drawingState.selectedCabinetId?" active":"");b.innerHTML=`<span><span class="stack-item-title">${c.name}</span><span class="stack-item-size">${c.width} × ${c.height} × ${c.depth}</span></span><span class="stack-order"><button data-up="${c.id}">↑</button><button data-down="${c.id}">↓</button></span>`;b.onclick=e=>{if(e.target.dataset.up){moveCabinet(Number(e.target.dataset.up),-1);return}if(e.target.dataset.down){moveCabinet(Number(e.target.dataset.down),1);return}drawingState.selectedCabinetId=c.id;drawingState.selectedObjectId=null;syncInputs();renderAll()};stackList.appendChild(b)});const total=drawingState.cabinets.reduce((a,c)=>a+c.height,0),d=Math.max(...drawingState.cabinets.map(c=>c.depth));$("stackTotalHeight").textContent=total+" mm";$("stackTotalDepth").textContent=d+" mm";$("stackCount").textContent=drawingState.cabinets.length+" EA";$("stackInfoWidth").textContent=Math.max(...drawingState.cabinets.map(c=>c.width))+" mm";$("stackInfoHeight").textContent=total+" mm";$("stackInfoDepth").textContent=d+" mm";$("stackInfoCount").textContent=drawingState.cabinets.length+" EA"}
    function moveCabinet(id,dir){const i=drawingState.cabinets.findIndex(c=>c.id===id),j=i+dir;if(j<0||j>=drawingState.cabinets.length)return;[drawingState.cabinets[i],drawingState.cabinets[j]]=[drawingState.cabinets[j],drawingState.cabinets[i]];renderAll()}
    function projectStackPoint(x,y,z,view,center,scale){
      const yaw=view.yaw*Math.PI/180,pitch=view.pitch*Math.PI/180;
      let px=x-center.x,py=y-center.y,pz=z-center.z;
      const x1=px*Math.cos(yaw)+pz*Math.sin(yaw),z1=-px*Math.sin(yaw)+pz*Math.cos(yaw);
      const y1=py*Math.cos(pitch)-z1*Math.sin(pitch);
      return{x:260+(view.panX||0)+x1*scale*view.zoom,y:202+(view.panY||0)+y1*scale*view.zoom};
    }
    function renderRotatableStack3d(){
      const cs=drawingState.cabinets,total=cs.reduce((a,c)=>a+c.height,0),maxW=Math.max(...cs.map(c=>c.width)),maxD=Math.max(...cs.map(c=>c.depth));
      const view=drawingState.stack3dView||(drawingState.stack3dView={yaw:-35,pitch:-18,zoom:1,panX:0,panY:0});
      const center={x:maxW/2,y:total/2,z:maxD/2},scale=Math.min(320/maxW,330/total,180/maxD);
      let yOffset=0;
      const line=(p1,p2,attrs={})=>{const a=projectStackPoint(...p1,view,center,scale),b=projectStackPoint(...p2,view,center,scale);stackPreviewCanvas.appendChild(svgEl("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:"#111827","stroke-width":1.45,"stroke-linecap":"round","vector-effect":"non-scaling-stroke",...attrs}))};
      cs.forEach(c=>{
        const x0=(maxW-c.width)/2,z0=(maxD-c.depth)/2,y0=yOffset,y1=yOffset+c.height,x1=x0+c.width,z1=z0+c.depth;
        const pts={A:[x0,y0,z0],B:[x1,y0,z0],C:[x1,y1,z0],D:[x0,y1,z0],E:[x0,y0,z1],F:[x1,y0,z1],G:[x1,y1,z1],H:[x0,y1,z1]};
        [["A","B"],["B","C"],["C","D"],["D","A"],["E","F"],["F","G"],["G","H"],["H","E"],["A","E"],["B","F"],["C","G"],["D","H"]].forEach(([a,b])=>line(pts[a],pts[b]));
        const faceBases={
          front:{o:[x0,y0,z0],u:[1,0,0],v:[0,1,0],opacity:1},back:{o:[x0,y0,z1],u:[1,0,0],v:[0,1,0],opacity:.52},
          inside:{o:[x0,y0,z0+c.depth*.92],u:[1,0,0],v:[0,1,0],opacity:.96,mounted:true},left:{o:[x0,y0,z0],u:[0,0,1],v:[0,1,0],opacity:.76},
          right:{o:[x1,y0,z0],u:[0,0,1],v:[0,1,0],opacity:.9},top:{o:[x0,y0,z0],u:[1,0,0],v:[0,0,1],opacity:.86},bottom:{o:[x0,y1,z0],u:[1,0,0],v:[0,0,1],opacity:.78}
        };
        ["back","inside","left","right","top","bottom","front"].forEach(surface=>{
          const f=faceBases[surface],po=projectStackPoint(...f.o,view,center,scale),pu=projectStackPoint(f.o[0]+f.u[0],f.o[1]+f.u[1],f.o[2]+f.u[2],view,center,scale),pv=projectStackPoint(f.o[0]+f.v[0],f.o[1]+f.v[1],f.o[2]+f.v[2],view,center,scale);
          c.objects.filter(o=>o.surface===surface).forEach(o=>{
            const outer=svgEl("g",{transform:`matrix(${pu.x-po.x} ${pu.y-po.y} ${pv.x-po.x} ${pv.y-po.y} ${po.x} ${po.y})`,opacity:f.opacity});
            const inner=svgEl("g",{transform:`rotate(${o.rot||0} ${o.x+o.w/2} ${o.y+o.h/2})`});
            drawShape(inner,o,o.x,o.y,o.w,o.h,true);
            if(f.mounted){
              inner.setAttribute("filter","drop-shadow(2px 2px 1.4px rgba(17,24,39,.48))");
              const br=Math.max(1.4,Math.min(3.2,Math.min(o.w,o.h)*.045));
              [[o.x+br*2,o.y+br*2],[o.x+o.w-br*2,o.y+br*2],[o.x+br*2,o.y+o.h-br*2],[o.x+o.w-br*2,o.y+o.h-br*2]].forEach(([cx,cy])=>inner.appendChild(svgEl("circle",{cx,cy,r:br,fill:"#64748b",stroke:"#f8fafc","stroke-width":Math.max(.7,br*.45),"vector-effect":"non-scaling-stroke"})));
            }
            outer.appendChild(inner);stackPreviewCanvas.appendChild(outer);
          });
        });
        yOffset=y1;
      });
      stackPreviewCanvas.appendChild(svgEl("text",{x:260,y:416,"text-anchor":"middle","font-size":12,fill:"#667085","font-weight":700},`회전 ${Math.round(view.yaw)}° · 기울기 ${Math.round(view.pitch)}° · ${Math.round(view.zoom*100)}%`));
    }
    function renderStackPreview(){
      stackPreviewCanvas.innerHTML="";stackPreviewCanvas.appendChild(svgEl("rect",{x:0,y:0,width:520,height:430,fill:"#fff"}));
      const controls=$("stack3dControls"),toolbar=$("stackViewToolbar"),is3d=drawingState.stackPreview==="3d";controls.classList.toggle("active",is3d);toolbar?.classList.toggle("active",is3d);stackPreviewCanvas.dataset.rotateEnabled=is3d?"true":"false";const zi=$("stackZoomIndicator");if(zi)zi.textContent=Math.round((drawingState.stack3dView?.zoom||1)*100)+"%";
      if(is3d){renderRotatableStack3d();return}
      const total=drawingState.cabinets.reduce((a,c)=>a+c.height,0),maxW=Math.max(...drawingState.cabinets.map(c=>c.width)),sc=Math.min(270/maxW,330/total),x=90+(270-maxW*sc)/2;let y=40;drawingState.cabinets.forEach((c,i)=>{const w=c.width*sc,h=c.height*sc,cx=x+(maxW-c.width)*sc/2;stackPreviewCanvas.appendChild(svgEl("rect",{x:cx,y,width:w,height:h,fill:c.id===drawingState.selectedCabinetId?"#eaf1ff":"#fff",stroke:"#111827","stroke-width":1.4}));stackPreviewCanvas.appendChild(svgEl("text",{x:cx+w/2,y:y+h/2,"text-anchor":"middle","font-size":12,"font-weight":700,fill:"#475467"},`${c.width}×${c.height}×${c.depth}`));y+=h});stackPreviewCanvas.appendChild(svgEl("text",{x:225,y:405,"text-anchor":"middle","font-size":13,fill:"#1261cf","font-weight":800},`전체 높이 ${total} mm`))}
    function applyDimensions(){const c=currentCabinet();c.width=Math.max(50,Number(drawingWidthInput.value)||c.width);c.height=Math.max(50,Number(drawingHeightInput.value)||c.height);c.depth=Math.max(30,Number(drawingDepthInput.value)||c.depth);c.objects.forEach(clampObj);syncInputs();renderAll()}
    function applyCabinetProps(){const c=currentCabinet();c.name=$("cabinetNameInput").value.trim()||c.name;c.width=Math.max(50,Number($("cabinetWidthInput").value)||c.width);c.height=Math.max(50,Number($("cabinetHeightInput").value)||c.height);c.depth=Math.max(30,Number($("cabinetDepthInput").value)||c.depth);c.material=$("cabinetMaterialSelect").value;c.thickness=$("cabinetThicknessSelect").value;c.objects.forEach(clampObj);syncInputs();renderAll()}
    function addCabinet(){const base=currentCabinet(),c={id:drawingState.nextCabinetId++,name:`함체 ${drawingState.cabinets.length+1}`,width:base.width,height:base.height,depth:base.depth,material:base.material,thickness:base.thickness,objects:[]};drawingState.cabinets.push(c);drawingState.selectedCabinetId=c.id;syncInputs();renderAll()}
    function cloneCabinet(){const b=currentCabinet(),c=JSON.parse(JSON.stringify(b));c.id=drawingState.nextCabinetId++;c.name=b.name+" 복사";c.objects.forEach(o=>o.id=drawingState.nextObjectId++);drawingState.cabinets.push(c);drawingState.selectedCabinetId=c.id;syncInputs();renderAll()}
    function deleteCabinet(){if(drawingState.cabinets.length<=1){setStatus("함체는 최소 1개가 필요합니다.");return}drawingState.cabinets=drawingState.cabinets.filter(c=>c.id!==drawingState.selectedCabinetId);drawingState.selectedCabinetId=drawingState.cabinets[0].id;syncInputs();renderAll()}
    function renderAll(){buildTabs();render2d();render3d();renderStackList();renderStackPreview();updateObjectPanel()}
    function syncProductionNotesFromInputs(){const prev=drawingState.productionNotes||{};drawingState.productionNotes={...prev,memo:$("productionMemo").value.trim()}}
    function syncProductionNotesToInputs(){const n=drawingState.productionNotes||{};$("productionMemo").value=n.memo||""}
    function getProductionNoteLines(){syncProductionNotesFromInputs();const memo=(drawingState.productionNotes&&drawingState.productionNotes.memo||"").trim(),rows=[];if(!memo)return rows;memo.split(/\n+/).map(v=>v.trim()).filter(Boolean).forEach(line=>{let rest=line;while(rest.length>68){let cut=rest.lastIndexOf(" ",68);if(cut<28)cut=68;rows.push([rows.length===0?"기타 중요사항":"",rest.slice(0,cut).trim()]);rest=rest.slice(cut).trim()}if(rest)rows.push([rows.length===0?"기타 중요사항":"",rest])});return rows}
    function persistDrawing(){syncProductionNotesFromInputs();localStorage.setItem("gwangtelecom_drawing_v85",JSON.stringify(drawingState));setStatus("손도면 작업 상태를 저장했습니다.")}
    function reset(){if(!confirm("손도면 작업을 초기화하시겠습니까?"))return;localStorage.removeItem("gwangtelecom_drawing_v85");location.reload()}
    function exportPng(){const source=new XMLSerializer().serializeToString(drawingCanvas),blob=new Blob([source],{type:"image/svg+xml"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="광전기통신_현재면_손도면.svg";a.click();URL.revokeObjectURL(url)}
    function setExportProgress(show,text="파일을 생성하고 있습니다…"){const el=$("exportProgress");if(!el)return;el.textContent=text;el.classList.toggle("show",show)}
    function svgToImage(svg){return new Promise((resolve,reject)=>{const source=new XMLSerializer().serializeToString(svg),blob=new Blob([source],{type:"image/svg+xml;charset=utf-8"}),url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=e=>{URL.revokeObjectURL(url);reject(e)};img.src=url})}
    async function buildDrawingSheetCanvas(){
      setExportProgress(true,"전체 면 도면을 한 장으로 구성하고 있습니다…");
      const previousSurface=drawingState.surface,previousSelected=drawingState.selectedObjectId,previousMode3d=drawingState.mode3d;
      const captured=[];
      try{
        drawingState.selectedObjectId=null;
        for(const surface of drawingSurfaces){drawingState.surface=surface.id;render2d();captured.push({label:surface.label,img:await svgToImage(drawingCanvas)})}
        drawingState.mode3d="single";
        render3d();
        const output3d=(window.KENC3DOutputRenderer&&window.KENC3DOutputRenderer.render)?window.KENC3DOutputRenderer.render(drawingState,currentCabinet()):drawing3dCanvas;
        captured.push({label:"단독 함체",img:await svgToImage(output3d)});
      }finally{drawingState.surface=previousSurface;drawingState.selectedObjectId=previousSelected;drawingState.mode3d=previousMode3d;buildTabs();renderAll()}
      const noteLines=getProductionNoteLines(),noteH=noteLines.length?Math.max(190,90+noteLines.length*42):0;const canvas=document.createElement("canvas"),W=1800,H=2300+noteH,margin=70,gap=34,header=150,cellW=(W-margin*2-gap)/2,cellH=(2300-header-margin-gap*3)/4;
      canvas.width=W;canvas.height=H;const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);ctx.fillStyle="#172033";ctx.font="700 50px sans-serif";ctx.fillText("광전기통신 손도면 생성기",margin,70);ctx.font="26px sans-serif";ctx.fillStyle="#526174";const c=currentCabinet();ctx.fillText(`${c.name} · ${c.width} × ${c.height} × ${c.depth} mm · ${c.material} · ${c.thickness}`,margin,116);
      captured.forEach((item,i)=>{const col=i%2,row=Math.floor(i/2),x=margin+col*(cellW+gap),y=header+row*(cellH+gap);ctx.fillStyle="#f7f9fc";ctx.fillRect(x,y,cellW,cellH);ctx.strokeStyle="#c9d3e1";ctx.lineWidth=2;ctx.strokeRect(x,y,cellW,cellH);ctx.fillStyle="#174f91";ctx.font="700 28px sans-serif";ctx.fillText(item.label,x+22,y+38);const maxW=cellW-32,maxH=cellH-60,scale=Math.min(maxW/item.img.width,maxH/item.img.height),dw=item.img.width*scale,dh=item.img.height*scale;ctx.drawImage(item.img,x+(cellW-dw)/2,y+50+(maxH-dh)/2,dw,dh)});
      if(noteLines.length){const boxY=2300-20;ctx.fillStyle="#fff8f8";ctx.fillRect(margin,boxY,W-margin*2,noteH-70);ctx.strokeStyle="#e11d48";ctx.lineWidth=3;ctx.strokeRect(margin,boxY,W-margin*2,noteH-70);ctx.fillStyle="#a00f2d";ctx.font="700 30px sans-serif";ctx.fillText("제작 중요사항",margin+24,boxY+44);ctx.font="24px sans-serif";let ny=boxY+86;noteLines.forEach(([k,v])=>{ctx.fillStyle="#344054";ctx.font="700 23px sans-serif";if(k)ctx.fillText(`${k} :`,margin+30,ny);ctx.fillStyle="#111827";ctx.font="23px sans-serif";ctx.fillText(v,margin+(k?190:30),ny);ny+=40})}ctx.fillStyle="#7a8797";ctx.font="20px sans-serif";ctx.fillText(new Date().toLocaleString("ko-KR"),W-margin-260,H-24);setExportProgress(false);return canvas
    }
    function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
    function canvasToBlob(canvas,type="image/png",quality=.95){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("이미지 생성 실패")),type,quality))}
    function dataUrlBytes(dataUrl){const bin=atob(dataUrl.split(",")[1]),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
    function makePdfFromCanvas(canvas){
      const jpeg=dataUrlBytes(canvas.toDataURL("image/jpeg",.92)),enc=new TextEncoder(),parts=[],offsets=[0];let size=0;
      const add=v=>{const b=typeof v==="string"?enc.encode(v):v;parts.push(b);size+=b.length};
      add("%PDF-1.4\n%âãÏÓ\n");
      const obj=(n,body)=>{offsets[n]=size;add(`${n} 0 obj\n${body}\nendobj\n`)};
      obj(1,"<< /Type /Catalog /Pages 2 0 R >>");obj(2,"<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
      const pageW=595.28,pageH=841.89,ratio=Math.min(pageW/canvas.width,pageH/canvas.height),dw=canvas.width*ratio,dh=canvas.height*ratio,x=(pageW-dw)/2,y=(pageH-dh)/2,content=`q\n${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ`;
      obj(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
      offsets[4]=size;add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);add(jpeg);add("\nendstream\nendobj\n");obj(5,`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      const xref=size;add("xref\n0 6\n0000000000 65535 f \n");for(let i=1;i<=5;i++)add(String(offsets[i]).padStart(10,"0")+" 00000 n \n");add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);return new Blob(parts,{type:"application/pdf"})
    }
    async function getDrawingFiles(){const canvas=await buildDrawingSheetCanvas(),png=await canvasToBlob(canvas),pdf=makePdfFromCanvas(canvas);return{canvas,pngFile:new File([png],"광전기통신_손도면.png",{type:"image/png"}),pdfFile:new File([pdf],"광전기통신_손도면.pdf",{type:"application/pdf"})}}
    async function saveDrawingAs(kind){try{persistDrawing();const files=await getDrawingFiles();if(kind==="pdf")downloadBlob(files.pdfFile,files.pdfFile.name);else downloadBlob(files.pngFile,files.pngFile.name);setStatus(kind==="pdf"?"전체 면 PDF를 저장했습니다.":"전체 면 PNG를 저장했습니다.")}catch(e){console.error(e);setExportProgress(false);alert("파일 생성 중 오류가 발생했습니다.")}}
    function canShareFile(file){
      try{return !!(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))}catch(e){return false}
    }
    async function shareDrawingFile(kind){
      try{
        persistDrawing();
        const files=await getDrawingFiles(),file=kind==="pdf"?files.pdfFile:files.pngFile;
        if(canShareFile(file)){
          await navigator.share({title:"광전기통신 손도면",text:"광전기통신 손도면 생성기로 작성한 도면입니다.",files:[file]});
          setStatus("파일 공유창을 열었습니다.")
        }else{
          downloadBlob(file,file.name);
          alert("이 브라우저는 파일 직접 공유를 지원하지 않아 파일을 먼저 저장했습니다. 공유할 앱에서 저장된 파일을 첨부해 주세요.")
        }
      }catch(e){
        if(e&&e.name!=="AbortError"){console.error(e);setExportProgress(false);alert("공유 준비 중 오류가 발생했습니다.")}
      }
    }
    async function shareDrawingToKakao(){
      let file=null;
      try{
        persistDrawing();
        const files=await getDrawingFiles();
        file=files.pngFile;
        downloadBlob(file,file.name);
        if(canShareFile(file)){
          try{
            await navigator.share({title:"광전기통신 손도면",text:"광전기통신 손도면 생성기로 작성한 도면입니다.",files:[file]});
            alert("카카오톡 공유창에 이미지가 보이지 않으면, 기기에 저장된 ‘광전기통신_손도면.png’를 사진 또는 파일로 첨부해 주세요.")
          }catch(shareError){
            if(shareError&&shareError.name!=="AbortError")console.warn("카카오톡 파일 공유 실패",shareError);
            alert("도면 PNG를 기기에 저장했습니다. 카카오톡에서 ‘광전기통신_손도면.png’를 사진 또는 파일로 첨부해 주세요.")
          }
        }else{
          alert("이 기기에서는 카카오톡으로 파일을 직접 전달할 수 없어 도면 PNG를 저장했습니다. 카카오톡에서 저장된 이미지를 첨부해 주세요.")
        }
      }catch(e){
        console.error(e);setExportProgress(false);
        alert(file?"카카오톡 공유는 완료되지 않았지만 도면 PNG는 저장되었습니다. 저장된 파일을 직접 첨부해 주세요.":"카카오톡 공유용 도면을 만드는 중 오류가 발생했습니다.")
      }
    }

    function restore(){try{const v=JSON.parse(localStorage.getItem("gwangtelecom_drawing_v85"));if(v&&Array.isArray(v.cabinets))Object.assign(drawingState,v)}catch(e){console.warn(e)}}
    const stackPointers=new Map();let stackRotateDrag=null,stackPanDrag=null,stackPinchStart=null;
    const pointerDistance=()=>{const p=[...stackPointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)};
    const pointerCenter=()=>{const p=[...stackPointers.values()];return p.length<2?{x:0,y:0}:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}};
    function setStackViewPreset(name){
      const v=drawingState.stack3dView||(drawingState.stack3dView={yaw:-35,pitch:-18,zoom:1,panX:0,panY:0});
      const presets={front:{yaw:0,pitch:0},back:{yaw:180,pitch:0},left:{yaw:-90,pitch:0},right:{yaw:90,pitch:0},top:{yaw:0,pitch:-90},bottom:{yaw:0,pitch:90}};
      if(name==='fit'){Object.assign(v,{yaw:-35,pitch:-18,zoom:1,panX:0,panY:0})}
      else if(presets[name])Object.assign(v,presets[name],{panX:0,panY:0});
      renderStackPreview();
    }
    document.querySelectorAll('[data-stack-view]').forEach(b=>b.addEventListener('click',()=>setStackViewPreset(b.dataset.stackView)));
    stackPreviewCanvas.addEventListener("pointerdown",e=>{
      if(drawingState.stackPreview!=="3d")return;
      stackPreviewCanvas.setPointerCapture?.(e.pointerId);stackPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      const view=drawingState.stack3dView;
      const isPan=e.button===1||e.shiftKey;
      if(stackPointers.size===1){
        if(isPan){stackPanDrag={x:e.clientX,y:e.clientY,panX:view.panX||0,panY:view.panY||0};stackPreviewCanvas.dataset.panMode='true'}
        else stackRotateDrag={x:e.clientX,y:e.clientY,yaw:view.yaw,pitch:view.pitch};
      }else if(stackPointers.size===2){const c=pointerCenter();stackPinchStart={distance:pointerDistance(),zoom:view.zoom,centerX:c.x,centerY:c.y,panX:view.panX||0,panY:view.panY||0};stackRotateDrag=null;stackPanDrag=null;stackPreviewCanvas.dataset.panMode='true'}
      stackPreviewCanvas.classList.add("is-rotating");e.preventDefault()
    });
    stackPreviewCanvas.addEventListener("pointermove",e=>{
      if(!stackPointers.has(e.pointerId)||drawingState.stackPreview!=="3d")return;stackPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      const view=drawingState.stack3dView;
      if(stackPointers.size>=2&&stackPinchStart){const d=pointerDistance(),c=pointerCenter();if(d>0)view.zoom=clamp(stackPinchStart.zoom*d/stackPinchStart.distance,.3,8);view.panX=stackPinchStart.panX+(c.x-stackPinchStart.centerX);view.panY=stackPinchStart.panY+(c.y-stackPinchStart.centerY)}
      else if(stackPanDrag){view.panX=stackPanDrag.panX+(e.clientX-stackPanDrag.x);view.panY=stackPanDrag.panY+(e.clientY-stackPanDrag.y)}
      else if(stackRotateDrag){view.yaw=stackRotateDrag.yaw+(e.clientX-stackRotateDrag.x)*.65;view.pitch=clamp(stackRotateDrag.pitch+(e.clientY-stackRotateDrag.y)*.45,-89,89)}
      renderStackPreview();e.preventDefault()
    },{passive:false});
    const endStackPointer=e=>{stackPointers.delete(e.pointerId);if(stackPointers.size===1){const p=[...stackPointers.values()][0];stackRotateDrag={x:p.x,y:p.y,yaw:drawingState.stack3dView.yaw,pitch:drawingState.stack3dView.pitch};stackPinchStart=null}else if(stackPointers.size===0){stackRotateDrag=null;stackPanDrag=null;stackPinchStart=null;stackPreviewCanvas.classList.remove("is-rotating");delete stackPreviewCanvas.dataset.panMode}};
    stackPreviewCanvas.addEventListener("pointerup",endStackPointer);stackPreviewCanvas.addEventListener("pointercancel",endStackPointer);
    stackPreviewCanvas.addEventListener("wheel",e=>{if(drawingState.stackPreview!=="3d")return;const view=drawingState.stack3dView;if(e.shiftKey){view.panX=(view.panX||0)-e.deltaY*.35}else{const rect=stackPreviewCanvas.getBoundingClientRect(),mx=(e.clientX-rect.left)*(520/rect.width),my=(e.clientY-rect.top)*(430/rect.height),old=view.zoom,newZoom=clamp(old*Math.exp(-e.deltaY*.0015),.3,8),ratio=newZoom/old;view.panX=mx-260-(mx-260-(view.panX||0))*ratio;view.panY=my-202-(my-202-(view.panY||0))*ratio;view.zoom=newZoom}renderStackPreview();e.preventDefault()},{passive:false});
    stackPreviewCanvas.addEventListener('dblclick',e=>{if(drawingState.stackPreview!=="3d")return;const view=drawingState.stack3dView,rect=stackPreviewCanvas.getBoundingClientRect(),mx=(e.clientX-rect.left)*(520/rect.width),my=(e.clientY-rect.top)*(430/rect.height),old=view.zoom,newZoom=clamp(old*1.65,.3,8),ratio=newZoom/old;view.panX=mx-260-(mx-260-(view.panX||0))*ratio;view.panY=my-202-(my-202-(view.panY||0))*ratio;view.zoom=newZoom;renderStackPreview()});
    $("stack3dResetBtn").onclick=()=>setStackViewPreset('fit');
    window.kencDrawingState=drawingState;window.kencDrawingToolDefs=drawingToolDefs;window.kencDrawingSurfaces=drawingSurfaces;
    function drawingInit(){restore();drawingState.cabinets.forEach(c=>{if(!["1.0T","1.2T","1.4T","1.6T"].includes(c.thickness))c.thickness="1.6T"});if(!drawingState.stack3dView)drawingState.stack3dView={yaw:-35,pitch:-18,zoom:1,panX:0,panY:0};if(!drawingState.productionNotes)drawingState.productionNotes={memo:""};buildTools();syncInputs();syncProductionNotesToInputs();renderAll();drawingGenerateBtn.onclick=applyDimensions;drawingApplyBtn.onclick=applyObj;drawingDeleteBtn.onclick=deleteObj;drawingSaveBtn.onclick=()=>openShareModal("drawing-save");$("drawingShareBtn").onclick=()=>openShareModal("drawing-share");drawingResetBtn.onclick=reset;drawingExportBtn.onclick=exportPng;$("stackAddBtn").onclick=addCabinet;$("stackCloneBtn").onclick=cloneCabinet;$("stackDeleteBtn").onclick=deleteCabinet;$("cabinetApplyBtn").onclick=applyCabinetProps;document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{drawingState.mode3d=b.dataset.mode;document.querySelectorAll("[data-mode]").forEach(x=>x.classList.toggle("active",x===b));render3d()});document.querySelectorAll("[data-stack-preview]").forEach(b=>b.onclick=()=>{drawingState.stackPreview=b.dataset.stackPreview;document.querySelectorAll("[data-stack-preview]").forEach(x=>x.classList.toggle("active",x===b));renderStackPreview()});[drawingObjectX,drawingObjectY,drawingObjectW,drawingObjectH,drawingObjectRotation].forEach(i=>i.onchange=applyObj);drawingObjectLabel.oninput=()=>{const o=selectedObj();if(o&&o.type==="nameplate"){o.label=drawingObjectLabel.value;renderAll()}};["productionMemo"].forEach(id=>$(id).addEventListener("input",syncProductionNotesFromInputs))}
    window.KENC_DRAWING_API={
      getState:()=>drawingState,
      getCurrentCabinet:()=>currentCabinet(),
      render3d:()=>render3d(),
      renderAll:()=>renderAll(),
      drawObjectShape:(group,object,x,y,width,height,is3d=false)=>drawShape(group,object,x,y,width,height,is3d)
    };
    document.dispatchEvent(new CustomEvent("kenc:drawing-api-ready"));
    drawingInit();

    /*
      함 제품 데이터 수정 위치
      각 제품에는 회사에서 사용하는 품명(name)과 규격을 입력합니다.
      name = 회사 내부 품명
      width = 가로(W), height = 세로(H), depth = 깊이(D)

      입력 예시:
      "내함": {
        "제품 선택명": {
          name: "회사에서 사용하는 품명",
          width: 200,
          height: 300,
          depth: 100
        }
      }
    */
    const productData = {};
    const groundingBoxSizes = {};
    const trunkBoxSizes = {};
    const broadcastBoxSizes = {};
    const idfBoxSizes = {};
    const tvAmplifierBoxSizes = {};
    const productOptions = [
      "영업표준 단가표",
      "국선단자함",
      "IDF 중간단자함",
      "접지단자함",
      "PULL BOX",
      "TV증폭기/분배기 단자함",
      "방송/소방/인터폰/중간단자함"
    ];
    const relatedMaterialOptions = [
      "속판/빼끄판/단프라/철망",
      "단자대",
      "국선보호기/피뢰탄기반",
      "접지 단자대",
      "세대 덧박스"
    ];
    const productNotices = {
      "영업표준 단가표": ["광전기통신 기성품은 깊이 130입니다."],
      "국선단자함": [
        "10+25P를 예로 들면, 10은 가입자 보호기 10P 1개를 말하며, 25는 110블럭의 P수를 뜻합니다.",
        "가입자 보호기는 10P 단위로 나오며, 100이면 가입자 보호기 10P가 10개 구성됩니다."
      ],
      "IDF 중간단자함": [
        "IDF 중간단자함은 각 P수에 맞는 110블럭 고정용 브라켓이 용접되어 나갑니다."
      ],
      "접지단자함": [
        "접지함은 70SQ(스퀘어) 기준이며, SQ가 높을수록 함의 사이즈 치수가 커야 합니다."
      ],
      "PULL BOX": [
        "자사는 기본 1.6T 철판을 사용하여 제작합니다.",
        "현장에서는 주로 함석으로 제작된 풀박스를 사용하며, 함석제품은 가격이 저렴합니다. 함석제품은 300 × 300까지만 제작됩니다.",
        "풀박스 평카바 단가는 기본형 단가의 1/6로 계산합니다."
      ]
    };
    const standardSalesPriceData = [{"가로":200,"세로":300,"깊이":100,"연강내함":7700,"연강카바":8100,"매입연강":15800,"노출연강":15800,"스텐카바":18000,"매입스텐":25700,"올노출스텐":45000},{"가로":200,"세로":300,"깊이":130,"연강내함":8100,"연강카바":8100,"매입연강":16200,"노출연강":16200,"스텐카바":18000,"매입스텐":26100,"올노출스텐":47700},{"가로":200,"세로":300,"깊이":150,"연강내함":9000,"연강카바":8100,"매입연강":17100,"노출연강":17100,"스텐카바":18000,"매입스텐":27000,"올노출스텐":50400},{"가로":200,"세로":400,"깊이":100,"연강내함":9900,"연강카바":9900,"매입연강":19800,"노출연강":19800,"스텐카바":22500,"매입스텐":32400,"올노출스텐":59400},{"가로":250,"세로":350,"깊이":100,"연강내함":9900,"연강카바":9900,"매입연강":19800,"노출연강":19800,"스텐카바":22500,"매입스텐":32400,"올노출스텐":59400},{"가로":300,"세로":300,"깊이":100,"연강내함":9900,"연강카바":10800,"매입연강":20700,"노출연강":20700,"스텐카바":24300,"매입스텐":34200,"올노출스텐":63000},{"가로":300,"세로":300,"깊이":130,"연강내함":10800,"연강카바":10800,"매입연강":21600,"노출연강":21600,"스텐카바":24300,"매입스텐":35100,"올노출스텐":65700},{"가로":300,"세로":300,"깊이":150,"연강내함":11700,"연강카바":10800,"매입연강":22500,"노출연강":22500,"스텐카바":24300,"매입스텐":36000,"올노출스텐":68400},{"가로":300,"세로":400,"깊이":100,"연강내함":13500,"연강카바":14400,"매입연강":27900,"노출연강":27900,"스텐카바":27500,"매입스텐":41000,"올노출스텐":75600},{"가로":300,"세로":400,"깊이":130,"연강내함":14400,"연강카바":14400,"매입연강":28800,"노출연강":28800,"스텐카바":27500,"매입스텐":41900,"올노출스텐":79200},{"가로":300,"세로":400,"깊이":150,"연강내함":15300,"연강카바":14400,"매입연강":29700,"노출연강":29700,"스텐카바":27500,"매입스텐":42800,"올노출스텐":82800},{"가로":400,"세로":400,"깊이":100,"연강내함":15300,"연강카바":16200,"매입연강":31500,"노출연강":31500,"스텐카바":36000,"매입스텐":51300,"올노출스텐":94500},{"가로":400,"세로":400,"깊이":130,"연강내함":16200,"연강카바":16200,"매입연강":32400,"노출연강":32400,"스텐카바":36000,"매입스텐":52200,"올노출스텐":99000},{"가로":400,"세로":400,"깊이":150,"연강내함":17100,"연강카바":16200,"매입연강":33300,"노출연강":33300,"스텐카바":36000,"매입스텐":53100,"올노출스텐":103500},{"가로":400,"세로":500,"깊이":100,"연강내함":19800,"연강카바":20700,"매입연강":40500,"노출연강":40500,"스텐카바":40500,"매입스텐":60300,"올노출스텐":103500},{"가로":400,"세로":500,"깊이":130,"연강내함":20700,"연강카바":20700,"매입연강":41400,"노출연강":41400,"스텐카바":40500,"매입스텐":61200,"올노출스텐":108000},{"가로":400,"세로":500,"깊이":150,"연강내함":21600,"연강카바":20700,"매입연강":42300,"노출연강":42300,"스텐카바":40500,"매입스텐":62100,"올노출스텐":112500},{"가로":400,"세로":600,"깊이":100,"연강내함":22500,"연강카바":23400,"매입연강":45900,"노출연강":45900,"스텐카바":45000,"매입스텐":67500,"올노출스텐":117000},{"가로":400,"세로":600,"깊이":130,"연강내함":23400,"연강카바":23400,"매입연강":46800,"노출연강":46800,"스텐카바":45000,"매입스텐":68400,"올노출스텐":121500},{"가로":400,"세로":600,"깊이":150,"연강내함":24300,"연강카바":23400,"매입연강":47700,"노출연강":47700,"스텐카바":45000,"매입스텐":69300,"올노출스텐":126000},{"가로":400,"세로":700,"깊이":100,"연강내함":25200,"연강카바":26100,"매입연강":51300,"노출연강":51300,"스텐카바":50400,"매입스텐":75600,"올노출스텐":126000},{"가로":400,"세로":700,"깊이":130,"연강내함":26100,"연강카바":26100,"매입연강":52200,"노출연강":52200,"스텐카바":50400,"매입스텐":76500,"올노출스텐":130500},{"가로":400,"세로":700,"깊이":150,"연강내함":27000,"연강카바":26100,"매입연강":53100,"노출연강":53100,"스텐카바":50400,"매입스텐":77400,"올노출스텐":135000},{"가로":500,"세로":600,"깊이":130,"연강내함":27000,"연강카바":27000,"매입연강":54000,"노출연강":54000,"스텐카바":54000,"매입스텐":81000,"올노출스텐":135000},{"가로":500,"세로":600,"깊이":150,"연강내함":28800,"연강카바":27000,"매입연강":55800,"노출연강":55800,"스텐카바":54000,"매입스텐":82800,"올노출스텐":144000},{"가로":500,"세로":700,"깊이":130,"연강내함":32400,"연강카바":32400,"매입연강":64800,"노출연강":64800,"스텐카바":63000,"매입스텐":95400,"올노출스텐":162000},{"가로":500,"세로":700,"깊이":150,"연강내함":34200,"연강카바":32400,"매입연강":66600,"노출연강":66600,"스텐카바":63000,"매입스텐":97200,"올노출스텐":171000},{"가로":600,"세로":700,"깊이":130,"연강내함":38700,"연강카바":38700,"매입연강":77400,"노출연강":77400,"스텐카바":71100,"매입스텐":109800,"올노출스텐":189000},{"가로":600,"세로":700,"깊이":150,"연강내함":40500,"연강카바":38700,"매입연강":79200,"노출연강":79200,"스텐카바":71100,"매입스텐":111600,"올노출스텐":207000},{"가로":700,"세로":700,"깊이":130,"연강내함":43200,"연강카바":43200,"매입연강":86400,"노출연강":86400,"스텐카바":84600,"매입스텐":127800,"올노출스텐":220500},{"가로":700,"세로":700,"깊이":150,"연강내함":45000,"연강카바":43200,"매입연강":88200,"노출연강":88200,"스텐카바":84600,"매입스텐":129600,"올노출스텐":238500},{"가로":700,"세로":800,"깊이":130,"연강내함":49500,"연강카바":49500,"매입연강":99000,"노출연강":99000,"스텐카바":99000,"매입스텐":148500,"올노출스텐":252000},{"가로":700,"세로":800,"깊이":150,"연강내함":52200,"연강카바":49500,"매입연강":101700,"노출연강":101700,"스텐카바":99000,"매입스텐":151200,"올노출스텐":270000},{"가로":800,"세로":900,"깊이":130,"연강내함":56700,"연강카바":56700,"매입연강":113400,"노출연강":113400,"스텐카바":120600,"매입스텐":177300,"올노출스텐":306000},{"가로":800,"세로":900,"깊이":150,"연강내함":58500,"연강카바":56700,"매입연강":115200,"노출연강":115200,"스텐카바":120600,"매입스텐":179100,"올노출스텐":333000},{"가로":900,"세로":900,"깊이":130,"연강내함":58500,"연강카바":58500,"매입연강":117000,"노출연강":117000,"스텐카바":138600,"매입스텐":197100,"올노출스텐":333000},{"가로":900,"세로":900,"깊이":150,"연강내함":63000,"연강카바":58500,"매입연강":121500,"노출연강":121500,"스텐카바":138600,"매입스텐":201600,"올노출스텐":360000},{"가로":900,"세로":1000,"깊이":130,"연강내함":67500,"연강카바":67500,"매입연강":135000,"노출연강":135000,"스텐카바":159300,"매입스텐":226800,"올노출스텐":360000},{"가로":900,"세로":1000,"깊이":150,"연강내함":69300,"연강카바":67500,"매입연강":136800,"노출연강":136800,"스텐카바":159300,"매입스텐":228600,"올노출스텐":387000},{"가로":1000,"세로":1000,"깊이":130,"연강내함":76500,"연강카바":76500,"매입연강":153000,"노출연강":153000,"스텐카바":194400,"매입스텐":270900,"올노출스텐":387000},{"가로":1000,"세로":1000,"깊이":150,"연강내함":81000,"연강카바":76500,"매입연강":157500,"노출연강":157500,"스텐카바":194400,"매입스텐":275400,"올노출스텐":414000},{"가로":1000,"세로":1200,"깊이":130,"연강내함":88200,"연강카바":88200,"매입연강":176400,"노출연강":176400,"스텐카바":225000,"매입스텐":313200,"올노출스텐":414000},{"가로":1000,"세로":1200,"깊이":150,"연강내함":90900,"연강카바":88200,"매입연강":179100,"노출연강":179100,"스텐카바":225000,"매입스텐":315900,"올노출스텐":441000},{"가로":1000,"세로":1300,"깊이":130,"연강내함":99000,"연강카바":99000,"매입연강":198000,"노출연강":198000,"스텐카바":258300,"매입스텐":357300,"올노출스텐":441000},{"가로":1000,"세로":1300,"깊이":150,"연강내함":103500,"연강카바":99000,"매입연강":202500,"노출연강":202500,"스텐카바":258300,"매입스텐":361800,"올노출스텐":468000},{"가로":1000,"세로":1400,"깊이":130,"연강내함":108000,"연강카바":108000,"매입연강":216000,"노출연강":216000,"스텐카바":291600,"매입스텐":399600,"올노출스텐":468000},{"가로":1000,"세로":1400,"깊이":150,"연강내함":112500,"연강카바":108000,"매입연강":220500,"노출연강":220500,"스텐카바":291600,"매입스텐":404100,"올노출스텐":495000},{"가로":1000,"세로":1500,"깊이":130,"연강내함":121500,"연강카바":121500,"매입연강":243000,"노출연강":243000,"스텐카바":324900,"매입스텐":446400,"올노출스텐":495000},{"가로":1000,"세로":1500,"깊이":150,"연강내함":124200,"연강카바":121500,"매입연강":245700,"노출연강":250200,"스텐카바":324900,"매입스텐":449100,"올노출스텐":522000},{"가로":1200,"세로":1200,"깊이":130,"연강내함":108000,"연강카바":108000,"매입연강":216000,"노출연강":216000,"스텐카바":291600,"매입스텐":399600,"올노출스텐":468000},{"가로":1200,"세로":1200,"깊이":150,"연강내함":112500,"연강카바":108000,"매입연강":220500,"노출연강":220500,"스텐카바":291600,"매입스텐":404100,"올노출스텐":495000},{"가로":1200,"세로":1400,"깊이":130,"연강내함":126000,"연강카바":126000,"매입연강":252000,"노출연강":252000,"스텐카바":358200,"매입스텐":484200,"올노출스텐":522000},{"가로":1200,"세로":1400,"깊이":150,"연강내함":135000,"연강카바":126000,"매입연강":261000,"노출연강":261000,"스텐카바":358200,"매입스텐":493200,"올노출스텐":549000}];
    const trunkTerminalPriceData = [{"P수":"10+25","가로":250,"세로":350,"깊이":100,"매입연강":36500,"노출연강":40300,"매입스텐":51500},{"P수":"10+50","가로":250,"세로":350,"깊이":100,"매입연강":39000,"노출연강":42800,"매입스텐":54000},{"P수":"20+50","가로":250,"세로":350,"깊이":100,"매입연강":54000,"노출연강":57800,"매입스텐":69000},{"P수":"20+100","가로":300,"세로":400,"깊이":100,"매입연강":65500,"노출연강":70600,"매입스텐":82500},{"P수":"25+100","가로":400,"세로":400,"깊이":100,"매입연강":82000,"노출연강":85200,"매입스텐":105000},{"P수":"30+100","가로":400,"세로":400,"깊이":100,"매입연강":87000,"노출연강":90200,"매입스텐":110000},{"P수":"30+150","가로":400,"세로":400,"깊이":100,"매입연강":92000,"노출연강":95200,"매입스텐":115000},{"P수":"40+100","가로":400,"세로":400,"깊이":100,"매입연강":102000,"노출연강":105200,"매입스텐":125000},{"P수":"50+100","가로":400,"세로":400,"깊이":100,"매입연강":117000,"노출연강":120200,"매입스텐":140000},{"P수":"40+200","가로":500,"세로":400,"깊이":100,"매입연강":120000,"노출연강":124000,"매입스텐":144000},{"P수":"50+200","가로":500,"세로":400,"깊이":100,"매입연강":135000,"노출연강":139000,"매입스텐":159000},{"P수":"100+200","가로":500,"세로":600,"깊이":130,"매입연강":226000,"노출연강":231600,"매입스텐":258000},{"P수":"100+400","가로":600,"세로":700,"깊이":130,"매입연강":268000,"노출연강":275800,"매입스텐":308000},{"P수":"150+300","가로":600,"세로":700,"깊이":130,"매입연강":333000,"노출연강":340800,"매입스텐":373000},{"P수":"150+600","가로":700,"세로":800,"깊이":130,"매입연강":385000,"노출연강":395000,"매입스텐":445000},{"P수":"200+400","가로":700,"세로":800,"깊이":130,"매입연강":440000,"노출연강":450000,"매입스텐":500000}];
    const idfIntermediatePriceData = [{"P수":"25P","가로":200,"세로":300,"깊이":100,"매입연강":18500,"노출연강":21700,"매입스텐":30000},{"P수":"50P","가로":200,"세로":300,"깊이":100,"매입연강":21000,"노출연강":24200,"매입스텐":32500},{"P수":"100P","가로":400,"세로":300,"깊이":130,"매입연강":37000,"노출연강":42400,"매입스텐":54000},{"P수":"150P","가로":400,"세로":400,"깊이":130,"매입연강":49000,"노출연강":52400,"매입스텐":72000},{"P수":"200P","가로":400,"세로":400,"깊이":130,"매입연강":54000,"노출연강":57400,"매입스텐":77000},{"P수":"250P","가로":400,"세로":500,"깊이":130,"매입연강":67000,"노출연강":71200,"매입스텐":91000},{"P수":"300P","가로":400,"세로":500,"깊이":130,"매입연강":72000,"노출연강":76200,"매입스텐":96000},{"P수":"350P","가로":400,"세로":600,"깊이":130,"매입연강":83000,"노출연강":87800,"매입스텐":109000},{"P수":"400P","가로":400,"세로":600,"깊이":130,"매입연강":88000,"노출연강":92800,"매입스텐":114000},{"P수":"500P","가로":400,"세로":700,"깊이":130,"매입연강":103000,"노출연강":108300,"매입스텐":133000},{"P수":"600P","가로":700,"세로":500,"깊이":130,"매입연강":128000,"노출연강":134800,"매입스텐":164000},{"P수":"700P","가로":700,"세로":600,"깊이":130,"매입연강":148000,"노출연강":155800,"매입스텐":188000},{"P수":"800P","가로":700,"세로":600,"깊이":130,"매입연강":158000,"노출연강":165800,"매입스텐":198000},{"P수":"900P","가로":700,"세로":700,"깊이":130,"매입연강":182000,"노출연강":191200,"매입스텐":230000},{"P수":"1000P","가로":700,"세로":700,"깊이":130,"매입연강":192000,"노출연강":201200,"매입스텐":240000},{"P수":"1200P","가로":700,"세로":800,"깊이":130,"매입연강":220000,"노출연강":230000,"매입스텐":280000}];
    const groundingTerminalPriceData = [{"회선수":"1CCT","가로":200,"세로":300,"깊이":100,"매입연강":23500,"노출연강":26700,"매입스텐":35000},{"회선수":"2CCT","가로":200,"세로":300,"깊이":100,"매입연강":31000,"노출연강":34200,"매입스텐":42500},{"회선수":"3CCT","가로":300,"세로":300,"깊이":100,"매입연강":43500,"노출연강":47700,"매입스텐":59500},{"회선수":"4CCT","가로":400,"세로":400,"깊이":100,"매입연강":62000,"노출연강":65200,"매입스텐":85000},{"회선수":"5CCT","가로":500,"세로":400,"깊이":100,"매입연강":77500,"노출연강":81500,"매입스텐":101500},{"회선수":"6CCT","가로":500,"세로":400,"깊이":100,"매입연강":85000,"노출연강":89000,"매입스텐":109000},{"회선수":"7CCT","가로":600,"세로":400,"깊이":100,"매입연강":98500,"노출연강":103100,"매입스텐":124500},{"회선수":"8CCT","가로":600,"세로":400,"깊이":100,"매입연강":106000,"노출연강":110600,"매입스텐":132000},{"회선수":"9CCT","가로":700,"세로":400,"깊이":100,"매입연강":118500,"노출연강":123600,"매입스텐":148500},{"회선수":"10CCT","가로":700,"세로":400,"깊이":100,"매입연강":126000,"노출연강":131100,"매입스텐":156000}];
    const tvAmplifierDistributorPriceData = [{"가로":200,"세로":300,"깊이":130,"매입연강":17000,"노출연강":20400,"매입스텐":28500},{"가로":300,"세로":300,"깊이":130,"매입연강":22000,"노출연강":26400,"매입스텐":38000},{"가로":300,"세로":400,"깊이":130,"매입연강":27000,"노출연강":32400,"매입스텐":44000},{"가로":400,"세로":400,"깊이":130,"매입연강":34000,"노출연강":37400,"매입스텐":57000},{"가로":400,"세로":500,"깊이":130,"매입연강":42000,"노출연강":46200,"매입스텐":66000},{"가로":500,"세로":600,"깊이":130,"매입연강":56000,"노출연강":61600,"매입스텐":88000},{"가로":600,"세로":700,"깊이":130,"매입연강":78000,"노출연강":85800,"매입스텐":118000},{"가로":700,"세로":800,"깊이":130,"매입연강":100000,"노출연강":110000,"매입스텐":160000},{"가로":800,"세로":900,"깊이":130,"매입연강":116000,"노출연강":127600,"매입스텐":192000},{"가로":900,"세로":1000,"깊이":130,"매입연강":138000,"노출연강":151800,"매입스텐":246000}];
    const broadcastFireIntercomIntermediatePriceData = [{"회선수":"10P","가로":200,"세로":300,"깊이":100,"매입연강":18500,"노출연강":21700,"매입스텐":30000},{"회선수":"20P","가로":200,"세로":300,"깊이":100,"매입연강":18500,"노출연강":21700,"매입스텐":30000},{"회선수":"30P","가로":200,"세로":400,"깊이":100,"매입연강":22750,"노출연강":26550,"매입스텐":37750},{"회선수":"40P","가로":250,"세로":350,"깊이":100,"매입연강":24000,"노출연강":27800,"매입스텐":39000},{"회선수":"50P","가로":300,"세로":400,"깊이":100,"매입연강":31750,"노출연강":36850,"매입스텐":48750},{"회선수":"60P","가로":300,"세로":400,"깊이":100,"매입연강":33000,"노출연강":38100,"매입스텐":50000},{"회선수":"80P","가로":400,"세로":400,"깊이":100,"매입연강":42000,"노출연강":45200,"매입스텐":65000},{"회선수":"100P","가로":500,"세로":400,"깊이":100,"매입연강":52500,"노출연강":56500,"매입스텐":76500},{"회선수":"150P","가로":600,"세로":400,"깊이":100,"매입연강":64750,"노출연강":69350,"매입스텐":90750},{"회선수":"200P","가로":500,"세로":600,"깊이":130,"매입연강":81000,"노출연강":86600,"매입스텐":113000},{"회선수":"250P","가로":600,"세로":700,"깊이":130,"매입연강":109250,"노출연강":117050,"매입스텐":149250},{"회선수":"300P","가로":700,"세로":800,"깊이":130,"매입연강":137500,"노출연강":147500,"매입스텐":197500}];
    const plateMaterialPriceData = [
      {"가로":200,"세로":300,"PVC속판":1500,"빼끄판":7000,"단프라":1000,"철망":2000},
      {"가로":300,"세로":400,"PVC속판":2000,"빼끄판":10000,"단프라":1500,"철망":3500},
      {"가로":400,"세로":400,"PVC속판":2500,"빼끄판":14000,"단프라":2000,"철망":4000},
      {"가로":400,"세로":500,"PVC속판":3000,"빼끄판":20000,"단프라":2500,"철망":4500},
      {"가로":500,"세로":600,"PVC속판":4000,"빼끄판":28000,"단프라":3000,"철망":5000},
      {"가로":600,"세로":700,"PVC속판":5000,"빼끄판":38000,"단프라":3500,"철망":6000},
      {"가로":700,"세로":800,"PVC속판":7000,"빼끄판":50000,"단프라":4000,"철망":7000},
      {"가로":800,"세로":900,"PVC속판":9000,"빼끄판":70000,"단프라":4500,"철망":8000},
      {"가로":900,"세로":1000,"PVC속판":10000,"빼끄판":90000,"단프라":5000,"철망":10000}
    ];
    const terminalBlockPriceData = [
      {"규격":"10P 10A","단가":1250},
      {"규격":"10P 20A","단가":1360}
    ];
    const trunkProtectorLightningBasePriceData = [
      {"규격":"구형 보호기 10P","단가":15000},
      {"규격":"신형 보호기 10P","단가":15000},
      {"규격":"피뢰탄기반 50P","단가":82000},
      {"규격":"피뢰탄기반 100P","단가":137500},
      {"규격":"피뢰탄기반 신형 100P","단가":362500}
    ];
    const groundingTerminalBlockPriceData = [
      {"규격":"70SQ 1P","단가":7500},
      {"규격":"100SQ 1P","단가":12000},
      {"규격":"150SQ 1P","단가":17000},
      {"규격":"200SQ 1P","단가":22000}
    ];
    const householdExtensionBoxPriceData = [
      {"가로":400,"세로":300,"깊이":20,"연강":null,"ABS 사출":null},
      {"가로":400,"세로":300,"깊이":30,"연강":null,"ABS 사출":null},
      {"가로":400,"세로":500,"깊이":20,"연강":null,"ABS 사출":null},
      {"가로":400,"세로":500,"깊이":30,"연강":null,"ABS 사출":null},
      {"가로":400,"세로":600,"깊이":20,"연강":null,"ABS 사출":null},
      {"가로":400,"세로":600,"깊이":30,"연강":null,"ABS 사출":null},
      {"가로":400,"세로":700,"깊이":20,"연강":null,"ABS 사출":null},
      {"가로":400,"세로":700,"깊이":30,"연강":null,"ABS 사출":null}
    ];
    const pullBoxPriceData = [{"가로":100,"세로":100,"깊이":100,"기본형":6800,"도어형":10000,"앵글부착":13000},{"가로":150,"세로":150,"깊이":150,"기본형":9000,"도어형":10000,"앵글부착":13000},{"가로":200,"세로":200,"깊이":100,"기본형":10000,"도어형":13000,"앵글부착":16900},{"가로":200,"세로":200,"깊이":150,"기본형":11000,"도어형":14500,"앵글부착":18800},{"가로":200,"세로":200,"깊이":200,"기본형":12000,"도어형":16800,"앵글부착":21800},{"가로":250,"세로":250,"깊이":150,"기본형":14000,"도어형":19600,"앵글부착":25500},{"가로":250,"세로":250,"깊이":200,"기본형":15800,"도어형":22600,"앵글부착":29400},{"가로":300,"세로":300,"깊이":150,"기본형":17600,"도어형":25300,"앵글부착":32900},{"가로":300,"세로":300,"깊이":200,"기본형":20300,"도어형":28900,"앵글부착":37500},{"가로":300,"세로":300,"깊이":300,"기본형":25800,"도어형":36200,"앵글부착":47000},{"가로":400,"세로":400,"깊이":150,"기본형":27000,"도어형":38600,"앵글부착":50200},{"가로":400,"세로":400,"깊이":200,"기본형":30000,"도어형":43400,"앵글부착":56400},{"가로":400,"세로":400,"깊이":300,"기본형":38000,"도어형":53000,"앵글부착":68900},{"가로":400,"세로":500,"깊이":200,"기본형":38500,"도어형":54300,"앵글부착":70600},{"가로":500,"세로":500,"깊이":200,"기본형":43000,"도어형":60000,"앵글부착":78000},{"가로":400,"세로":400,"깊이":400,"기본형":45200,"도어형":62700,"앵글부착":81500},{"가로":400,"세로":500,"깊이":300,"기본형":47500,"도어형":66300,"앵글부착":86200},{"가로":500,"세로":500,"깊이":300,"기본형":52000,"도어형":72300,"앵글부착":94000},{"가로":500,"세로":600,"깊이":200,"기본형":52000,"도어형":72300,"앵글부착":94000},{"가로":400,"세로":500,"깊이":400,"기본형":56500,"도어형":78000,"앵글부착":101400},{"가로":600,"세로":600,"깊이":200,"기본형":57000,"도어형":79600,"앵글부착":103400},{"가로":500,"세로":500,"깊이":400,"기본형":61000,"도어형":84400,"앵글부착":109700},{"가로":500,"세로":600,"깊이":300,"기본형":52400,"도어형":86800,"앵글부착":112800},{"가로":600,"세로":600,"깊이":300,"기본형":67800,"도어형":94000,"앵글부착":122200},{"가로":500,"세로":600,"깊이":400,"기본형":73200,"도어형":101200,"앵글부착":131500},{"가로":600,"세로":600,"깊이":400,"기본형":78800,"도어형":108500,"앵글부착":141000},{"가로":700,"세로":700,"깊이":300,"기본형":85000,"도어형":118000,"앵글부착":153400},{"가로":700,"세로":800,"깊이":300,"기본형":98000,"도어형":135000,"앵글부착":175500},{"가로":700,"세로":700,"깊이":400,"기본형":98000,"도어형":135000,"앵글부착":175500},{"가로":700,"세로":700,"깊이":500,"기본형":110800,"도어형":152000,"앵글부착":197600},{"가로":700,"세로":800,"깊이":400,"기본형":112000,"도어형":154000,"앵글부착":200000},{"가로":800,"세로":800,"깊이":400,"기본형":119300,"도어형":164000,"앵글부착":213000},{"가로":700,"세로":700,"깊이":600,"기본형":123400,"도어형":168800,"앵글부착":218000},{"가로":700,"세로":800,"깊이":500,"기본형":126600,"도어형":173600,"앵글부착":226000},{"가로":800,"세로":800,"깊이":500,"기본형":133800,"도어형":183300,"앵글부착":238000},{"가로":700,"세로":700,"깊이":700,"기본형":136000,"도어형":185700,"앵글부착":241000},{"가로":700,"세로":800,"깊이":600,"기본형":141000,"도어형":193000,"앵글부착":250000},{"가로":800,"세로":800,"깊이":600,"기본형":148300,"도어형":203000,"앵글부착":264000},{"가로":700,"세로":800,"깊이":700,"기본형":155500,"도어형":212000,"앵글부착":276000},{"가로":700,"세로":800,"깊이":800,"기본형":170000,"도어형":232000,"앵글부착":301000}];




    const categorySelect = document.getElementById("categorySelect");
    const productSelect = document.getElementById("productSelect");
    const relatedMaterialSelect = document.getElementById("relatedMaterialSelect");
    const productNameDisplay = document.getElementById("productNameDisplay");
    const circuitField = document.getElementById("circuitField");
    const circuitSelect = document.getElementById("circuitSelect");
    const specField = document.getElementById("specField");
    const specSelect = document.getElementById("specSelect");

    const emptyState = document.getElementById("emptyState");
    const resultContent = document.getElementById("resultContent");
    const sizeMain = document.getElementById("sizeMain");
    const widthValue = document.getElementById("widthValue");
    const heightValue = document.getElementById("heightValue");
    const depthValue = document.getElementById("depthValue");
    const specTablePanel = document.getElementById("specTablePanel");
    const specTableTitle = document.getElementById("specTableTitle");
    const specTableDescription = document.getElementById("specTableDescription");
    const specTableEmpty = document.getElementById("specTableEmpty");
    const specTableWrap = document.getElementById("specTableWrap");
    const specTableHead = document.getElementById("specTableHead");
    const specTableBody = document.getElementById("specTableBody");
    const noticeContent = document.getElementById("noticeContent");
    const priceAdjustPanel = document.getElementById("priceAdjustPanel");
    const priceAdjustStatus = document.getElementById("priceAdjustStatus");
    const customRateInput = document.getElementById("customRateInput");
    const customRateApply = document.getElementById("customRateApply");
    const quickRateButtons = Array.from(document.querySelectorAll(".quick-rate-btn"));
    let priceAdjustmentRate = Math.max(0, Number(localStorage.getItem("gwang_price_adjustment_rate") || 0));
    let selectedSpecKey = localStorage.getItem("gwang_selected_spec_key") || "";
    let selectedSpecDimensions = null;
    const categoryText = document.getElementById("categoryText");
    const productNameText = document.getElementById("productNameText");
    const productText = document.getElementById("productText");

    function addOptions(selectElement, values, placeholder) {
      selectElement.innerHTML = `<option value="">${placeholder}</option>`;

      values.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        selectElement.appendChild(option);
      });
    }

    function resetProductName() {
      productNameDisplay.value = "제품을 선택하면 표시됩니다.";
    }

    function getProductSizeMap() {
      return null;
    }

    function renderProductNotice(selectedProduct = productSelect.value) {
      const notices = productNotices[selectedProduct] || [];
      noticeContent.innerHTML = "";

      if (!notices.length) {
        noticeContent.className = "notice-placeholder";
        noticeContent.textContent = "등록된 주의사항이 없습니다.";
        return;
      }

      noticeContent.className = "";
      notices.forEach((notice) => {
        const item = document.createElement("p");
        item.className = "notice-item";

        const check = document.createElement("span");
        check.className = "notice-check";
        check.textContent = "✓";
        check.setAttribute("aria-hidden", "true");

        const text = document.createElement("span");
        text.textContent = notice;

        item.append(check, text);
        noticeContent.appendChild(item);
      });
    }

    function adjustedPrice(value) {
      return Math.round(Number(value) * (1 + priceAdjustmentRate / 100));
    }

    function formatWon(value, applyAdjustment = false) {
      if (value === null || value === undefined || value === "") return "미등록";
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) return "미등록";
      const amount = applyAdjustment ? adjustedPrice(numericValue) : numericValue;
      return `${amount.toLocaleString("ko-KR")}원`;
    }

    function formatAdjustmentRate(rate) {
      const numericRate = Number(rate);
      if (!Number.isFinite(numericRate)) return "";
      return Number.isInteger(numericRate) ? String(numericRate) : numericRate.toFixed(1).replace(/\.0$/, "");
    }

    function renderPriceCell(cell, value) {
      cell.className = "price-cell";
      cell.textContent = "";

      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
        cell.textContent = "미등록";
        return;
      }

      if (priceAdjustmentRate > 0) {
        const mark = document.createElement("span");
        mark.className = "price-change-mark";
        mark.textContent = `▲${formatAdjustmentRate(priceAdjustmentRate)}%`;
        mark.setAttribute("aria-label", `기준단가 대비 ${formatAdjustmentRate(priceAdjustmentRate)}퍼센트 인상`);
        cell.appendChild(mark);
      }

      const priceText = document.createElement("span");
      priceText.textContent = formatWon(value, true);
      cell.appendChild(priceText);
    }

    function getActiveEnclosureSelection() {
      return productSelect.value || relatedMaterialSelect.value;
    }

    function specKey(product, item) {
      return [product, item["P수"] || item["회선수"] || item["규격"] || "", item["가로"] || "", item["세로"] || "", item["깊이"] || ""].join("|");
    }

    function updatePriceAdjustmentUi() {
      const sign = priceAdjustmentRate > 0 ? "+" : "";
      priceAdjustStatus.textContent = priceAdjustmentRate === 0 ? "현재 적용: 기준단가" : `현재 적용: 기준단가 ${sign}${priceAdjustmentRate}%`;
      customRateInput.value = priceAdjustmentRate;
      quickRateButtons.forEach(btn => btn.classList.toggle("active", Number(btn.dataset.rate) === priceAdjustmentRate));
    }

    function setPriceAdjustment(rate) {
      const parsed = Number(rate);
      if (!Number.isFinite(parsed) || parsed < 0) { alert("조정률은 0% 이상으로 입력해 주세요."); return; }
      priceAdjustmentRate = Math.round(parsed * 10) / 10;
      localStorage.setItem("gwang_price_adjustment_rate", String(priceAdjustmentRate));
      updatePriceAdjustmentUi();
      renderSpecificationTable(getActiveEnclosureSelection());
      haptic(12);
    }

    quickRateButtons.forEach(btn => btn.addEventListener("click", () => setPriceAdjustment(btn.dataset.rate)));
    customRateApply.addEventListener("click", () => setPriceAdjustment(customRateInput.value));
    customRateInput.addEventListener("keydown", e => { if (e.key === "Enter") setPriceAdjustment(customRateInput.value); });
    updatePriceAdjustmentUi();

    function renderSpecificationTable(selectedProduct = getActiveEnclosureSelection()) {
      specTableHead.innerHTML = "";
      specTableBody.innerHTML = "";
      priceAdjustPanel.hidden = !selectedProduct;

      let columns = [];
      let rows = [];

      if (selectedProduct === "영업표준 단가표") {
        specTableTitle.textContent = "영업표준 단가표";
        specTableDescription.textContent =
          `총 ${standardSalesPriceData.length}개 규격 · 금액은 원 단위입니다.`;
        columns = ["가로", "세로", "깊이", "연강내함", "연강카바", "매입연강", "노출연강", "스텐카바", "매입스텐", "올노출스텐"];
        rows = standardSalesPriceData;
      } else if (selectedProduct === "국선단자함") {
        specTableTitle.textContent = "국선단자함";
        specTableDescription.textContent =
          `총 ${trunkTerminalPriceData.length}개 규격 · 금액은 원 단위입니다.`;
        columns = ["P수", "가로", "세로", "깊이", "매입연강", "노출연강", "매입스텐"];
        rows = trunkTerminalPriceData;
      } else if (selectedProduct === "IDF 중간단자함") {
        specTableTitle.textContent = "IDF 중간단자함";
        specTableDescription.textContent =
          `총 ${idfIntermediatePriceData.length}개 규격 · 금액은 원 단위입니다.`;
        columns = ["P수", "가로", "세로", "깊이", "매입연강", "노출연강", "매입스텐"];
        rows = idfIntermediatePriceData;
      } else if (selectedProduct === "접지단자함") {
        specTableTitle.textContent = "접지단자함";
        specTableDescription.textContent =
          `총 ${groundingTerminalPriceData.length}개 규격 · 금액은 원 단위입니다.`;
        columns = ["회선수", "가로", "세로", "깊이", "매입연강", "노출연강", "매입스텐"];
        rows = groundingTerminalPriceData;
      } else if (selectedProduct === "TV증폭기/분배기 단자함") {
        specTableTitle.textContent = "TV증폭기/분배기 단자함";
        specTableDescription.textContent =
          `총 ${tvAmplifierDistributorPriceData.length}개 규격 · 금액은 원 단위입니다.`;
        columns = ["가로", "세로", "깊이", "매입연강", "노출연강", "매입스텐"];
        rows = tvAmplifierDistributorPriceData;
      } else if (selectedProduct === "방송/소방/인터폰/중간단자함") {
        specTableTitle.textContent = "방송/소방/인터폰/중간단자함";
        specTableDescription.textContent =
          `총 ${broadcastFireIntercomIntermediatePriceData.length}개 규격 · 금액은 원 단위입니다.`;
        columns = ["회선수", "가로", "세로", "깊이", "매입연강", "노출연강", "매입스텐"];
        rows = broadcastFireIntercomIntermediatePriceData;
      } else if (selectedProduct === "속판/빼끄판/단프라/철망") {
        specTableTitle.textContent = "속판/빼끄판/단프라/철망";
        specTableDescription.textContent =
          `총 ${plateMaterialPriceData.length}개 규격 · 금액은 원 단위입니다.`;
        columns = ["가로", "세로", "PVC속판", "빼끄판", "단프라", "철망"];
        rows = plateMaterialPriceData;
      } else if (selectedProduct === "단자대") {
        specTableTitle.textContent = "단자대";
        specTableDescription.textContent =
          `총 ${terminalBlockPriceData.length}개 규격 · 금액은 원 단위입니다.`;
        columns = ["규격", "단가"];
        rows = terminalBlockPriceData;
      } else if (selectedProduct === "국선보호기/피뢰탄기반") {
        specTableTitle.textContent = "국선보호기/피뢰탄기반";
        specTableDescription.textContent =
          `총 ${trunkProtectorLightningBasePriceData.length}개 규격 · 금액은 원 단위입니다.`;
        columns = ["규격", "단가"];
        rows = trunkProtectorLightningBasePriceData;
      } else if (selectedProduct === "접지 단자대") {
        specTableTitle.textContent = "접지 단자대";
        specTableDescription.textContent =
          `총 ${groundingTerminalBlockPriceData.length}개 규격 · 금액은 원 단위입니다.`;
        columns = ["규격", "단가"];
        rows = groundingTerminalBlockPriceData;
      } else if (selectedProduct === "세대 덧박스") {
        specTableTitle.textContent = "세대 덧박스";
        specTableDescription.textContent =
          `총 ${householdExtensionBoxPriceData.length}개 규격 · 단가 미등록 항목은 미등록으로 표시됩니다.`;
        columns = ["가로", "세로", "깊이", "연강", "ABS 사출"];
        rows = householdExtensionBoxPriceData;
      } else if (selectedProduct === "PULL BOX") {
        specTableTitle.textContent = "PULL BOX";
        specTableDescription.textContent =
          `총 ${pullBoxPriceData.length}개 규격 · 금액은 원 단위입니다.`;
        columns = ["가로", "세로", "깊이", "기본형", "도어형", "앵글부착"];
        rows = pullBoxPriceData;
      } else {
        specTableTitle.textContent = "제품 규격표";
        specTableDescription.textContent = "제품을 선택하면 전체 규격표가 표시됩니다.";
        specTableEmpty.textContent = "등록된 제품이 없습니다.";
        specTableEmpty.hidden = false;
        specTableWrap.hidden = true;
        priceAdjustPanel.hidden = true;
        return;
      }

      const headerRow = document.createElement("tr");
      columns.forEach((column) => {
        const th = document.createElement("th");
        th.textContent = column;
        headerRow.appendChild(th);
      });
      specTableHead.appendChild(headerRow);

      rows.forEach((item) => {
        const row = document.createElement("tr");
        const key = specKey(selectedProduct, item);
        row.tabIndex = 0;
        row.dataset.specKey = key;
        row.classList.toggle("is-selected", key === selectedSpecKey);
        const selectRow = () => {
          selectedSpecKey = key;
          const hasDrawingDepth = Number.isFinite(Number(item["깊이"])) && Number(item["깊이"]) > 0;
          if (hasDrawingDepth) {
            selectedSpecDimensions = { width:Number(item["가로"]), height:Number(item["세로"]), depth:Number(item["깊이"]), product:selectedProduct };
            localStorage.setItem("gwang_selected_spec_dimensions", JSON.stringify(selectedSpecDimensions));
          }
          localStorage.setItem("gwang_selected_spec_key", selectedSpecKey);
          specTableBody.querySelectorAll("tr").forEach(tr => tr.classList.toggle("is-selected", tr === row));
          haptic(12);
        };
        row.addEventListener("click", selectRow);
        row.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectRow(); } });
        columns.forEach((column) => {
          const cell = document.createElement("td");
          const isPrice = !["P수", "회선수", "규격", "가로", "세로", "깊이"].includes(column);
          if (isPrice) {
            renderPriceCell(cell, item[column]);
          } else {
            cell.textContent = item[column];
          }
          row.appendChild(cell);
        });
        specTableBody.appendChild(row);
      });

      specTableEmpty.hidden = true;
      specTableWrap.hidden = false;
    }


    function applySelectedSpecToDrawing() {
      try {
        const saved = selectedSpecDimensions || JSON.parse(localStorage.getItem("gwang_selected_spec_dimensions") || "null");
        if (!saved || !saved.width || !saved.height || !saved.depth) return;
        const w = document.getElementById("drawingWidthInput"), h = document.getElementById("drawingHeightInput"), d = document.getElementById("drawingDepthInput");
        if (w && h && d) { w.value = saved.width; h.value = saved.height; d.value = saved.depth; }
        const status = document.getElementById("drawingStatus");
        if (status) status.textContent = `${saved.product || "선택 제품"} · ${saved.width} × ${saved.height} × ${saved.depth} 규격을 불러왔습니다.`;
      } catch (_) {}
    }

    function setSelectionMode() {
      circuitField.hidden = false;
      circuitSelect.disabled = true;
      specField.hidden = true;
      specSelect.disabled = true;
    }


    function resetResult(message = "제품을 선택하면 해당 제품의 규격표가 표시됩니다.") {
      emptyState.textContent = message;
      emptyState.hidden = false;
      resultContent.hidden = true;
    }

    function showResult(category, product, item) {
      if (!item) {
        resetProductName();
        resetResult(`${product} 제품의 정보가 아직 등록되지 않았습니다.`);
        return;
      }

      const companyProductName = product || item.name || "품명 미등록";
      productNameDisplay.value = companyProductName;

      const hasSize =
        item.width !== undefined &&
        item.height !== undefined &&
        item.depth !== undefined;

      if (!hasSize) {
        resetResult(`${companyProductName} 제품의 규격이 아직 등록되지 않았습니다.`);
        return;
      }

      sizeMain.textContent = `W ${item.width} × H ${item.height} × D ${item.depth} mm`;
      widthValue.textContent = `${item.width} mm`;
      heightValue.textContent = `${item.height} mm`;
      depthValue.textContent = `${item.depth} mm`;

      emptyState.hidden = true;
      resultContent.hidden = false;
    }

    addOptions(categorySelect, [], "제품분류 선택");
    addOptions(productSelect, productOptions, "함 제품을 선택하세요");
    addOptions(relatedMaterialSelect, relatedMaterialOptions, "관련 자재를 선택하세요");
    setSelectionMode(productSelect.value);
    renderSpecificationTable(productSelect.value || relatedMaterialSelect.value);

    categorySelect.addEventListener("change", () => {
      productNameDisplay.value = "";
      resetResult("");
    });

    function handleEnclosureSelection(sourceSelect, otherSelect) {
      if (sourceSelect.value) otherSelect.value = "";
      const selectedValue = sourceSelect.value || otherSelect.value;
      renderProductNotice(selectedValue);
      productNameDisplay.value = "";
      addOptions(circuitSelect, [], "등록된 회선수 없음");
      addOptions(specSelect, [], "등록된 규격 없음");
      setSelectionMode();
      renderSpecificationTable(selectedValue);
      resetResult("");
    }

    productSelect.addEventListener("change", () => {
      handleEnclosureSelection(productSelect, relatedMaterialSelect);
    });

    relatedMaterialSelect.addEventListener("change", () => {
      handleEnclosureSelection(relatedMaterialSelect, productSelect);
    });

    circuitSelect.addEventListener("change", () => {
      resetResult("");
    });

    specSelect.addEventListener("change", () => {
      resetResult("");
    });

      renderProductNotice();

    // V58 랙 파트 레이아웃 기본 동작
    const rackProductSelect = document.getElementById("rackProductSelect");
    const rackProductImage = document.getElementById("rackProductImage");
    const rackImagePlaceholder = document.getElementById("rackImagePlaceholder");
    const rackPriceArea = document.getElementById("rackPriceArea");

    rackProductSelect.addEventListener("change", () => {
      rackPriceArea.textContent = rackProductSelect.value
        ? `${rackProductSelect.value} 제품의 규격 및 가격 정보가 표시됩니다.`
        : "제품을 선택하면 해당 랙의 규격 및 가격 정보가 이곳에 표시됩니다.";

      if (typeof updateRackProductImage === "function") {
        updateRackProductImage();
      }
    });

    // V59 자재 파트 레이아웃 기본 동작
    const materialGroupSelect = document.getElementById("materialGroupSelect");
    const materialProductImage = document.getElementById("materialProductImage");
    const materialImagePlaceholder = document.getElementById("materialImagePlaceholder");
    const materialPriceArea = document.getElementById("materialPriceArea");
    const materialPriceAdjustStatus = document.getElementById("materialPriceAdjustStatus");
    const materialQuickRateButtons = [...document.querySelectorAll("[data-material-rate]")];
    const materialCustomRateInput = document.getElementById("materialCustomRateInput");
    const materialCustomRateApply = document.getElementById("materialCustomRateApply");
    const materialInfoTitle = document.getElementById("materialInfoTitle");
    const materialUsage = document.getElementById("materialUsage");
    const materialNote = document.getElementById("materialNote");
    const materialSearchInput = document.getElementById("materialSearchInput");
    const materialSearchBtn = document.getElementById("materialSearchBtn");

    // v1.0.0: 3D 미리보기를 선택 객체 설정 우측으로 재배치하고 공유 도면 하부면 우측에 단독 함체 입체도를 포함.
    // v0.0.20: 제품군 미선택 시 전체 제품군 통합검색 및 제품군 배지 표시.
    // v0.0.19: 제품군 내 품목명·규격 한 글자 실시간 부분검색 적용.
    // v0.0.16: 세부 품목 선택창 제거 및 다중 규격 펼침 구조 적용.
    // v0.0.26: FDF 최종 단가, 자재 단가 조정 계산기, 계층형 표 열 배치를 수정.
    const materialCatalog = {
      "통합배선": [
            {
                  "id": "modular-jack",
                  "name": "모듈라잭",
                  "spec": "미등록",
                  "size": "",
                  "price": null,
                  "remark": "",
                  "image": "",
                  "usage": "",
                  "note": ""
            },
            {
                  "id": "110-block",
                  "name": "110블럭",
                  "image": "",
                  "usage": "",
                  "note": "",
                  "variants": [
                        {
                              "id": "110-block-24p",
                              "spec": "24P",
                              "size": "",
                              "price": null,
                              "remark": ""
                        },
                        {
                              "id": "110-block-25p",
                              "spec": "25P",
                              "size": "",
                              "price": null,
                              "remark": ""
                        },
                        {
                              "id": "110-block-50p",
                              "spec": "50P",
                              "size": "",
                              "price": null,
                              "remark": ""
                        },
                        {
                              "id": "110-block-100p",
                              "spec": "100P",
                              "size": "",
                              "price": null,
                              "remark": ""
                        }
                  ]
            }
      ],
      "광": [
            {
                  "id": "fdf",
                  "name": "광분배함(FDF)",
                  "image": "",
                  "usage": "광케이블의 접속·분배·정리 및 광어댑터 수용에 사용합니다.",
                  "note": "설치 방식과 심선 수, 함체 규격 및 어댑터 포함 여부를 확인하세요.",
                  "children": [
                        {
                              "id": "fdf-mini-steel",
                              "name": "MINI STEEL",
                              "image": "",
                              "usage": "소규모 광회선의 벽부 또는 소형 공간 설치용 광분배함입니다.",
                              "note": "함과 어댑터가 포함된 단가입니다.",
                              "variants": [
                                    {
                                          "id": "fdf-mini-4c",
                                          "spec": "FDF 4C",
                                          "size": "118×136×45",
                                          "price": 8000,
                                          "remark": ""
                                    },
                                    {
                                          "id": "fdf-mini-6c",
                                          "spec": "FDF 6C",
                                          "size": "118×136×45",
                                          "price": 9000,
                                          "remark": ""
                                    },
                                    {
                                          "id": "fdf-mini-8c",
                                          "spec": "FDF 8C",
                                          "size": "118×136×45",
                                          "price": 10000,
                                          "remark": ""
                                    },
                                    {
                                          "id": "fdf-mini-12c",
                                          "spec": "FDF 12C",
                                          "size": "140×190×45",
                                          "price": 18000,
                                          "remark": ""
                                    }
                              ]
                        },
                        {
                              "id": "fdf-rack-type",
                              "name": "RACK TYPE",
                              "image": "",
                              "usage": "19인치 랙에 장착하여 광회선을 접속·분배하는 광패치패널형 FDF입니다.",
                              "note": "랙 유닛(1U·2U)과 심선 수를 함께 확인하세요.",
                              "variants": [
                                    {
                                          "id": "fdf-rack-4c-1u",
                                          "spec": "FDF 4C 1U",
                                          "size": "480×300×44",
                                          "price": 20000,
                                          "remark": "1U"
                                    },
                                    {
                                          "id": "fdf-rack-8c-1u",
                                          "spec": "FDF 8C 1U",
                                          "size": "480×300×44",
                                          "price": 22000,
                                          "remark": "1U"
                                    },
                                    {
                                          "id": "fdf-rack-12c-1u",
                                          "spec": "FDF 12C 1U",
                                          "size": "480×300×44",
                                          "price": 24000,
                                          "remark": "1U"
                                    },
                                    {
                                          "id": "fdf-rack-24c-1u",
                                          "spec": "FDF 24C 1U",
                                          "size": "480×300×44",
                                          "price": 30000,
                                          "remark": "1U"
                                    },
                                    {
                                          "id": "fdf-rack-36c-2u",
                                          "spec": "FDF 36C 2U",
                                          "size": "480×300×88",
                                          "price": 44000,
                                          "remark": "2U"
                                    },
                                    {
                                          "id": "fdf-rack-48c-2u",
                                          "spec": "FDF 48C 2U",
                                          "size": "480×300×88",
                                          "price": 50000,
                                          "remark": "2U"
                                    }
                              ]
                        },
                        {
                              "id": "fdf-wall-type",
                              "name": "WALL TYPE",
                              "image": "",
                              "usage": "벽부형 함체에 광접속 및 분배 부품을 수용하는 옥내용 광분배함입니다.",
                              "note": "비고의 함 규격과 심선 수를 함께 확인하세요.",
                              "variants": [
                                    {
                                          "id": "fdf-wall-48c",
                                          "spec": "FDF 48C",
                                          "size": "310×310×100",
                                          "price": 47800,
                                          "remark": "48함"
                                    },
                                    {
                                          "id": "fdf-wall-56c",
                                          "spec": "FDF 56C",
                                          "size": "350×330×100",
                                          "price": 72700,
                                          "remark": "72함"
                                    },
                                    {
                                          "id": "fdf-wall-60c",
                                          "spec": "FDF 60C",
                                          "size": "350×330×100",
                                          "price": 73600,
                                          "remark": "72함"
                                    },
                                    {
                                          "id": "fdf-wall-64c",
                                          "spec": "FDF 64C",
                                          "size": "350×330×100",
                                          "price": 74500,
                                          "remark": "72함"
                                    },
                                    {
                                          "id": "fdf-wall-68c",
                                          "spec": "FDF 68C",
                                          "size": "350×330×100",
                                          "price": 75400,
                                          "remark": "72함"
                                    },
                                    {
                                          "id": "fdf-wall-72c",
                                          "spec": "FDF 72C",
                                          "size": "350×330×100",
                                          "price": 76400,
                                          "remark": "72함"
                                    },
                                    {
                                          "id": "fdf-wall-76c",
                                          "spec": "FDF 76C",
                                          "size": "350×330×100",
                                          "price": 80700,
                                          "remark": "96함"
                                    },
                                    {
                                          "id": "fdf-wall-80c",
                                          "spec": "FDF 80C",
                                          "size": "350×330×100",
                                          "price": 81700,
                                          "remark": "96함"
                                    },
                                    {
                                          "id": "fdf-wall-84c",
                                          "spec": "FDF 84C",
                                          "size": "350×330×100",
                                          "price": 82600,
                                          "remark": "96함"
                                    },
                                    {
                                          "id": "fdf-wall-88c",
                                          "spec": "FDF 88C",
                                          "size": "350×330×100",
                                          "price": 83500,
                                          "remark": "96함"
                                    },
                                    {
                                          "id": "fdf-wall-92c",
                                          "spec": "FDF 92C",
                                          "size": "350×330×100",
                                          "price": 84400,
                                          "remark": "96함"
                                    },
                                    {
                                          "id": "fdf-wall-96c",
                                          "spec": "FDF 96C",
                                          "size": "350×330×100",
                                          "price": 85300,
                                          "remark": "96함"
                                    },
                                    {
                                          "id": "fdf-wall-100c",
                                          "spec": "FDF 100C",
                                          "size": "350×410×100",
                                          "price": 92000,
                                          "remark": "120함"
                                    },
                                    {
                                          "id": "fdf-wall-104c",
                                          "spec": "FDF 104C",
                                          "size": "350×410×100",
                                          "price": 92900,
                                          "remark": "120함"
                                    },
                                    {
                                          "id": "fdf-wall-108c",
                                          "spec": "FDF 108C",
                                          "size": "350×410×100",
                                          "price": 93800,
                                          "remark": "120함"
                                    },
                                    {
                                          "id": "fdf-wall-112c",
                                          "spec": "FDF 112C",
                                          "size": "350×410×100",
                                          "price": 94800,
                                          "remark": "120함"
                                    },
                                    {
                                          "id": "fdf-wall-116c",
                                          "spec": "FDF 116C",
                                          "size": "350×410×100",
                                          "price": 95700,
                                          "remark": "120함"
                                    },
                                    {
                                          "id": "fdf-wall-120c",
                                          "spec": "FDF 120C",
                                          "size": "350×410×100",
                                          "price": 96600,
                                          "remark": "120함"
                                    },
                                    {
                                          "id": "fdf-wall-124c",
                                          "spec": "FDF 124C",
                                          "size": "350×488×100",
                                          "price": 99800,
                                          "remark": "144함"
                                    },
                                    {
                                          "id": "fdf-wall-128c",
                                          "spec": "FDF 128C",
                                          "size": "350×488×100",
                                          "price": 100700,
                                          "remark": "144함"
                                    },
                                    {
                                          "id": "fdf-wall-132c",
                                          "spec": "FDF 132C",
                                          "size": "350×488×100",
                                          "price": 101700,
                                          "remark": "144함"
                                    },
                                    {
                                          "id": "fdf-wall-136c",
                                          "spec": "FDF 136C",
                                          "size": "350×488×100",
                                          "price": 102600,
                                          "remark": "144함"
                                    },
                                    {
                                          "id": "fdf-wall-140c",
                                          "spec": "FDF 140C",
                                          "size": "350×488×100",
                                          "price": 103500,
                                          "remark": "144함"
                                    },
                                    {
                                          "id": "fdf-wall-144c",
                                          "spec": "FDF 144C",
                                          "size": "350×488×100",
                                          "price": 104400,
                                          "remark": "144함"
                                    },
                                    {
                                          "id": "fdf-wall-148c",
                                          "spec": "FDF 148C",
                                          "size": "350×490×100",
                                          "price": 137500,
                                          "remark": "176함"
                                    },
                                    {
                                          "id": "fdf-wall-152c",
                                          "spec": "FDF 152C",
                                          "size": "350×490×100",
                                          "price": 138500,
                                          "remark": "176함"
                                    },
                                    {
                                          "id": "fdf-wall-156c",
                                          "spec": "FDF 156C",
                                          "size": "350×490×100",
                                          "price": 139400,
                                          "remark": "176함"
                                    },
                                    {
                                          "id": "fdf-wall-164c",
                                          "spec": "FDF 164C",
                                          "size": "350×490×100",
                                          "price": 141200,
                                          "remark": "176함"
                                    },
                                    {
                                          "id": "fdf-wall-168c",
                                          "spec": "FDF 168C",
                                          "size": "350×490×100",
                                          "price": 142100,
                                          "remark": "176함"
                                    },
                                    {
                                          "id": "fdf-wall-172c",
                                          "spec": "FDF 172C",
                                          "size": "350×490×100",
                                          "price": 143100,
                                          "remark": "176함"
                                    },
                                    {
                                          "id": "fdf-wall-176c",
                                          "spec": "FDF 176C",
                                          "size": "350×490×100",
                                          "price": 143200,
                                          "remark": "176함"
                                    },
                                    {
                                          "id": "fdf-wall-180c",
                                          "spec": "FDF 180C",
                                          "size": "350×520×100",
                                          "price": 167900,
                                          "remark": "192함"
                                    },
                                    {
                                          "id": "fdf-wall-184c",
                                          "spec": "FDF 184C",
                                          "size": "350×520×100",
                                          "price": 168800,
                                          "remark": "192함"
                                    },
                                    {
                                          "id": "fdf-wall-188c",
                                          "spec": "FDF 188C",
                                          "size": "350×520×100",
                                          "price": 169700,
                                          "remark": "192함"
                                    },
                                    {
                                          "id": "fdf-wall-216c",
                                          "spec": "FDF 216C",
                                          "size": "350×610×90",
                                          "price": 222200,
                                          "remark": "228함"
                                    },
                                    {
                                          "id": "fdf-wall-224c",
                                          "spec": "FDF 224C",
                                          "size": "350×610×90",
                                          "price": 224000,
                                          "remark": "228함"
                                    },
                                    {
                                          "id": "fdf-wall-280c",
                                          "spec": "FDF 280C",
                                          "size": "350×770×90",
                                          "price": 271400,
                                          "remark": "288함"
                                    }
                              ]
                        }
                  ]
            },
            {
                  "id": "optical-closure",
                  "name": "광접속함",
                  "spec": "미등록",
                  "size": "",
                  "price": null,
                  "remark": "",
                  "image": "",
                  "usage": "",
                  "note": ""
            },
            {
                  "id": "optical-patch-panel",
                  "name": "광패치판넬",
                  "spec": "미등록",
                  "size": "",
                  "price": null,
                  "remark": "",
                  "image": "",
                  "usage": "",
                  "note": ""
            },
            {
                  "id": "optical-adapter",
                  "name": "광어댑터",
                  "spec": "미등록",
                  "size": "",
                  "price": null,
                  "remark": "",
                  "image": "",
                  "usage": "",
                  "note": ""
            },
            {
                  "id": "optical-pigtail",
                  "name": "광피그테일",
                  "spec": "미등록",
                  "size": "",
                  "price": null,
                  "remark": "",
                  "image": "",
                  "usage": "",
                  "note": ""
            },
            {
                  "id": "optical-jumper",
                  "name": "광점퍼코드",
                  "spec": "미등록",
                  "size": "",
                  "price": null,
                  "remark": "",
                  "image": "",
                  "usage": "",
                  "note": ""
            },
            {
                  "id": "plc-splitter",
                  "name": "PLC Splitter",
                  "spec": "미등록",
                  "size": "",
                  "price": null,
                  "remark": "",
                  "image": "",
                  "usage": "",
                  "note": ""
            },
            {
                  "id": "optical-attenuator",
                  "name": "광감쇠기",
                  "spec": "미등록",
                  "size": "",
                  "price": null,
                  "remark": "",
                  "image": "",
                  "usage": "",
                  "note": ""
            },
            {
                  "id": "optical-coupler",
                  "name": "광커플러",
                  "spec": "미등록",
                  "size": "",
                  "price": null,
                  "remark": "",
                  "image": "",
                  "usage": "",
                  "note": ""
            },
            {
                  "id": "optical-tray",
                  "name": "광트레이",
                  "spec": "미등록",
                  "size": "",
                  "price": null,
                  "remark": "",
                  "image": "",
                  "usage": "",
                  "note": ""
            },
            {
                  "id": "splice-sleeve",
                  "name": "광융착슬리브",
                  "spec": "미등록",
                  "size": "",
                  "price": null,
                  "remark": "",
                  "image": "",
                  "usage": "",
                  "note": ""
            },
            {
                  "id": "optical-etc",
                  "name": "기타",
                  "spec": "미등록",
                  "size": "",
                  "price": null,
                  "remark": "",
                  "image": "",
                  "usage": "",
                  "note": ""
            }
      ],
      "TV": []
};

    const expandedMaterialItems = new Set();
    let selectedMaterialKey = "";

    let materialPriceAdjustmentRate = Math.max(0, Number(localStorage.getItem("gwang_material_price_adjustment_rate") || 0));

    function formatMaterialAdjustmentRate(value) {
      const rounded = Math.round(Number(value) * 10) / 10;
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    }

    function getAdjustedMaterialPrice(value) {
      return Math.round(Number(value) * (1 + materialPriceAdjustmentRate / 100));
    }

    function formatMaterialPrice(value) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "미등록";
      const adjusted = getAdjustedMaterialPrice(value);
      const mark = materialPriceAdjustmentRate > 0 ? `<span class="material-rate-mark" aria-label="기준단가 대비 ${formatMaterialAdjustmentRate(materialPriceAdjustmentRate)}퍼센트 인상">▲${formatMaterialAdjustmentRate(materialPriceAdjustmentRate)}%</span>` : "";
      return `${mark}${adjusted.toLocaleString("ko-KR")}원`;
    }

    function syncMaterialPriceAdjustmentUI() {
      const rateText = formatMaterialAdjustmentRate(materialPriceAdjustmentRate);
      materialPriceAdjustStatus.textContent = materialPriceAdjustmentRate === 0 ? "현재 적용: 기준단가" : `현재 적용: 기준단가 +${rateText}%`;
      materialCustomRateInput.value = rateText;
      materialQuickRateButtons.forEach(button => button.classList.toggle("active", Number(button.dataset.materialRate) === materialPriceAdjustmentRate));
    }

    function setMaterialPriceAdjustmentRate(rate) {
      const parsed = Number(rate);
      materialPriceAdjustmentRate = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 10) / 10) : 0;
      localStorage.setItem("gwang_material_price_adjustment_rate", String(materialPriceAdjustmentRate));
      syncMaterialPriceAdjustmentUI();
      renderMaterialTable(materialGroupSelect.value);
    }

    function resetMaterialInfo() {
      materialInfoTitle.textContent = "품목을 선택하면 해당 자재의 정보가 표시됩니다.";
      materialUsage.textContent = "등록된 용도가 없습니다.";
      materialNote.textContent = "등록된 참고사항이 없습니다.";
    }

    function showMaterialImage(item) {
      materialProductImage.removeAttribute("src");
      materialProductImage.style.display = "none";
      materialImagePlaceholder.hidden = false;
      const title = materialImagePlaceholder.querySelector("strong");
      const description = materialImagePlaceholder.querySelector("span");

      if (item && item.image) {
        materialProductImage.src = item.image;
        materialProductImage.alt = `${item.name} 제품 이미지`;
        materialProductImage.style.display = "block";
        materialImagePlaceholder.hidden = true;
        return;
      }

      title.textContent = item ? `${item.name} 이미지 준비중` : "자재 제품 이미지 영역";
      description.textContent = item
        ? "등록된 제품 이미지가 없습니다."
        : "제품군을 선택한 후 규격 및 단가에서 품목을 선택하세요.";
    }

    function findMaterialItem(itemId) {
      const items = materialCatalog[materialGroupSelect.value] || [];
      return items.find(item => item.id === itemId) || null;
    }

    function applyMaterialSelection(item, variant, groupName = materialGroupSelect.value) {
      selectedMaterialKey = `${groupName}:${variant ? variant.id : item.id}`;
      window.currentMaterialSelectionName = variant ? `${item.name} ${variant.spec}` : item.name;
      window.currentMaterialSelectionGroup = groupName;
      document.querySelectorAll(".material-price-row, .material-variant-row").forEach(row => {
        const selected = row.dataset.selectionKey === selectedMaterialKey;
        row.classList.toggle("selected", selected);
        row.setAttribute("aria-selected", selected ? "true" : "false");
      });
      showMaterialImage(item);
      materialInfoTitle.textContent = variant ? `${item.name} · ${variant.spec}` : item.name;
      materialUsage.textContent = item.usage || "등록된 용도가 없습니다.";
      materialNote.textContent = item.note || "등록된 참고사항이 없습니다.";
    }

    function toggleMaterialVariants(itemId) {
      if (expandedMaterialItems.has(itemId)) expandedMaterialItems.delete(itemId);
      else expandedMaterialItems.add(itemId);
      renderMaterialTable(materialGroupSelect.value);
    }

    function makeSelectableRow(row, callback) {
      row.tabIndex = 0;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", "false");
      row.addEventListener("click", callback);
      row.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          callback();
        }
      });
    }

    function escapeMaterialHTML(value) {
      return String(value ?? "").replace(/[&<>"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
    }

    function highlightMaterialMatch(value, keyword) {
      const text = String(value ?? "");
      if (!keyword) return escapeMaterialHTML(text);
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return escapeMaterialHTML(text).replace(new RegExp(`(${escapedKeyword})`, "gi"), '<mark class="material-search-mark">$1</mark>');
    }

    function materialTextMatches(value, keyword) {
      return String(value || "").toLocaleLowerCase("ko-KR").includes(keyword.toLocaleLowerCase("ko-KR"));
    }

    function getMaterialSearchResults(items, keyword, groupName) {
      if (!keyword) return items.map(item => ({ item, groupName, nameMatched: false, matchedVariants: null, matchedChildren: null }));
      return items.map(item => {
        const nameMatched = materialTextMatches(item.name, keyword);
        const matchedVariants = Array.isArray(item.variants)
          ? item.variants.filter(variant => [variant.spec, variant.size, variant.remark].some(value => materialTextMatches(value, keyword)))
          : [];
        const specMatched = !item.variants && !item.children && [item.spec, item.size, item.remark].some(value => materialTextMatches(value, keyword));
        const matchedChildren = Array.isArray(item.children)
          ? item.children.map(child => {
              const childNameMatched = materialTextMatches(child.name, keyword);
              const childVariants = (child.variants || []).filter(variant => [variant.spec, variant.size, variant.remark].some(value => materialTextMatches(value, keyword)));
              return (childNameMatched || childVariants.length) ? { child, childNameMatched, matchedVariants: childVariants } : null;
            }).filter(Boolean)
          : [];
        return (nameMatched || specMatched || matchedVariants.length || matchedChildren.length)
          ? { item, groupName, nameMatched, specMatched, matchedVariants, matchedChildren }
          : null;
      }).filter(Boolean);
    }

    function getMaterialResults(groupName, keyword) {
      if (groupName) return getMaterialSearchResults(materialCatalog[groupName] || [], keyword, groupName);
      if (!keyword) return [];
      return Object.entries(materialCatalog).flatMap(([catalogGroup, items]) =>
        getMaterialSearchResults(items, keyword, catalogGroup)
      );
    }

    function makeExpandButton(label, expanded, controlsId) {
      return `<button class="material-expand-btn" type="button" aria-expanded="${expanded ? "true" : "false"}" aria-controls="${controlsId}"><span class="material-expand-icon" aria-hidden="true"></span><span>${expanded ? label.replace("보기", "닫기") : label}</span></button>`;
    }

    function appendVariantRows(tbody, parentItem, variants, resultGroup, keyword, isGlobalSearch, prefixName) {
      variants.forEach(variant => {
        const variantRow = document.createElement("tr");
        variantRow.className = "material-variant-row";
        variantRow.dataset.itemId = parentItem.id;
        variantRow.dataset.groupName = resultGroup;
        variantRow.dataset.selectionKey = `${resultGroup}:${variant.id}`;
        const badge = isGlobalSearch ? `<span class="material-group-badge">${escapeMaterialHTML(resultGroup)}</span>` : "";
        const itemCellName = prefixName === "" ? "" : (prefixName || parentItem.name);
        variantRow.innerHTML = `<td class="material-variant-name">${badge}${escapeMaterialHTML(itemCellName)}</td><td><strong>${highlightMaterialMatch(variant.spec || "미등록", keyword)}</strong></td><td>${highlightMaterialMatch(variant.size || "-", keyword)}</td><td>${formatMaterialPrice(variant.price)}</td><td>${highlightMaterialMatch(variant.remark || "-", keyword)}</td>`;
        makeSelectableRow(variantRow, () => applyMaterialSelection(parentItem, variant, resultGroup));
        tbody.appendChild(variantRow);
      });
    }

    function renderMaterialTable(groupName) {
      const keyword = materialSearchInput.value.trim();
      const selectedGroupItems = materialCatalog[groupName] || [];
      const searchResults = getMaterialResults(groupName, keyword);
      const isGlobalSearch = !groupName && Boolean(keyword);
      materialPriceArea.className = "material-price-placeholder";
      materialPriceArea.innerHTML = "";

      if (!groupName && !keyword) {
        materialPriceArea.textContent = "제품군을 선택하거나 검색어를 입력하면 품목, 규격 및 단가 정보가 이곳에 표시됩니다.";
        return;
      }
      if (groupName && !selectedGroupItems.length) {
        materialPriceArea.textContent = `${groupName} 제품군의 등록된 품목이 없습니다.`;
        return;
      }
      if (keyword && !searchResults.length) {
        materialPriceArea.innerHTML = `<strong>검색 결과가 없습니다.</strong><br>품목명 또는 규격을 다시 확인해 주세요.`;
        return;
      }

      materialPriceArea.className = "material-price-table-wrap";
      if (keyword) {
        const status = document.createElement("div");
        status.className = "material-search-status";
        status.textContent = isGlobalSearch ? `전체 제품군 · “${keyword}” 검색 결과 ${searchResults.length}개 품목` : `“${keyword}” 검색 결과 ${searchResults.length}개 품목`;
        materialPriceArea.appendChild(status);
      }
      const table = document.createElement("table");
      table.className = "material-price-table";
      table.innerHTML = "<thead><tr><th>품목</th><th>규격</th><th>사이즈</th><th>단가</th><th>비고</th></tr></thead>";
      const tbody = document.createElement("tbody");

      searchResults.forEach(result => {
        const item = result.item;
        const resultGroup = result.groupName;
        const badge = isGlobalSearch ? `<span class="material-group-badge">${escapeMaterialHTML(resultGroup)}</span>` : "";
        const hasChildren = Array.isArray(item.children) && item.children.length > 0;
        const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
        const row = document.createElement("tr");
        row.className = "material-price-row";
        row.dataset.itemId = item.id;
        row.dataset.groupName = resultGroup;
        row.dataset.selectionKey = `${resultGroup}:${item.id}`;

        if (hasChildren) {
          const parentKey = `${resultGroup}:${item.id}`;
          const searchChildren = keyword ? result.matchedChildren : null;
          const isExpanded = expandedMaterialItems.has(parentKey) || (keyword && (result.nameMatched || (searchChildren && searchChildren.length)));
          row.innerHTML = `<td>${badge}<strong>${highlightMaterialMatch(item.name, keyword)}</strong></td><td class="material-expand-cell">${makeExpandButton("분류 보기", isExpanded, `children-${item.id}`)}</td><td>-</td><td class="material-empty-price">&nbsp;</td><td>-</td>`;
          row.querySelector(".material-expand-btn").addEventListener("click", event => {
            event.stopPropagation();
            applyMaterialSelection(item, null, resultGroup);
            if (expandedMaterialItems.has(parentKey)) expandedMaterialItems.delete(parentKey); else expandedMaterialItems.add(parentKey);
            renderMaterialTable(materialGroupSelect.value);
          });
          tbody.appendChild(row);
          if (isExpanded) {
            const childrenToRender = keyword && searchChildren && searchChildren.length ? searchChildren : item.children.map(child => ({ child, childNameMatched:false, matchedVariants:[] }));
            childrenToRender.forEach(childResult => {
              const child = childResult.child;
              const childKey = `${resultGroup}:${item.id}:${child.id}`;
              const childExpanded = expandedMaterialItems.has(childKey) || (keyword && (childResult.childNameMatched || childResult.matchedVariants.length));
              const childRow = document.createElement("tr");
              childRow.className = "material-price-row material-category-row";
              childRow.dataset.selectionKey = `${resultGroup}:${child.id}`;
              childRow.innerHTML = `<td class="material-variant-name"><strong>${highlightMaterialMatch(child.name, keyword)}</strong></td><td class="material-expand-cell">${makeExpandButton("규격 보기", childExpanded, `variants-${child.id}`)}</td><td>-</td><td class="material-empty-price">&nbsp;</td><td>-</td>`;
              childRow.querySelector(".material-expand-btn").addEventListener("click", event => {
                event.stopPropagation();
                applyMaterialSelection({...child, name:child.name}, null, resultGroup);
                if (expandedMaterialItems.has(childKey)) expandedMaterialItems.delete(childKey); else expandedMaterialItems.add(childKey);
                renderMaterialTable(materialGroupSelect.value);
              });
              tbody.appendChild(childRow);
              if (childExpanded) {
                const variants = keyword && childResult.matchedVariants.length ? childResult.matchedVariants : child.variants;
                appendVariantRows(tbody, {...child, name:"FDF"}, variants, resultGroup, keyword, isGlobalSearch, "FDF");
              }
            });
          }
        } else if (hasVariants) {
          const expandKey = `${resultGroup}:${item.id}`;
          const searchMatchedVariants = keyword ? result.matchedVariants : null;
          const isExpanded = expandedMaterialItems.has(expandKey) || (keyword && searchMatchedVariants.length > 0);
          row.innerHTML = `<td>${badge}<strong>${highlightMaterialMatch(item.name, keyword)}</strong></td><td class="material-expand-cell">${makeExpandButton("규격 보기", isExpanded, `variants-${item.id}`)}</td><td>-</td><td class="material-empty-price">&nbsp;</td><td>-</td>`;
          row.querySelector(".material-expand-btn").addEventListener("click", event => {
            event.stopPropagation();
            applyMaterialSelection(item, null, resultGroup);
            if (expandedMaterialItems.has(expandKey)) expandedMaterialItems.delete(expandKey); else expandedMaterialItems.add(expandKey);
            renderMaterialTable(materialGroupSelect.value);
          });
          tbody.appendChild(row);
          if (isExpanded) appendVariantRows(tbody, item, keyword && searchMatchedVariants.length ? searchMatchedVariants : item.variants, resultGroup, keyword, isGlobalSearch, item.name);
        } else {
          row.innerHTML = `<td>${badge}<strong>${highlightMaterialMatch(item.name, keyword)}</strong></td><td>${highlightMaterialMatch(item.spec || "미등록", keyword)}</td><td>${highlightMaterialMatch(item.size || "-", keyword)}</td><td>${formatMaterialPrice(item.price)}</td><td>${highlightMaterialMatch(item.remark || "-", keyword)}</td>`;
          makeSelectableRow(row, () => applyMaterialSelection(item, null, resultGroup));
          tbody.appendChild(row);
        }
      });

      table.appendChild(tbody);
      materialPriceArea.appendChild(table);
      if (selectedMaterialKey) {
        document.querySelectorAll("[data-selection-key]").forEach(row => {
          const selected = row.dataset.selectionKey === selectedMaterialKey;
          row.classList.toggle("selected", selected);
          row.setAttribute("aria-selected", selected ? "true" : "false");
        });
      }
    }

    Object.keys(materialCatalog).forEach(groupName => {
      const option = document.createElement("option");
      option.value = groupName;
      option.textContent = groupName;
      materialGroupSelect.appendChild(option);
    });

    materialGroupSelect.addEventListener("change", () => {
      expandedMaterialItems.clear();
      selectedMaterialKey = "";
      window.currentMaterialSelectionName = "";
      window.currentMaterialSelectionGroup = "";
      materialSearchInput.value = "";
      materialSearchInput.placeholder = materialGroupSelect.value
        ? `${materialGroupSelect.value}에서 품목 또는 규격 검색`
        : "전체 제품군에서 품목 또는 규격 검색";
      renderMaterialTable(materialGroupSelect.value);
      showMaterialImage(null);
      resetMaterialInfo();
      // v0.0.22: 제품군 변경만으로 검색창을 자동 활성화하지 않습니다.
      // 사용자가 검색창을 직접 선택했을 때만 모바일 키보드가 열립니다.
    });

    materialSearchInput.addEventListener("input", () => {
      renderMaterialTable(materialGroupSelect.value);
    });

    materialSearchInput.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        renderMaterialTable(materialGroupSelect.value);
      }
    });

    materialSearchBtn.addEventListener("click", () => {
      renderMaterialTable(materialGroupSelect.value);
    });

    materialQuickRateButtons.forEach(button => button.addEventListener("click", () => setMaterialPriceAdjustmentRate(button.dataset.materialRate)));
    materialCustomRateApply.addEventListener("click", () => setMaterialPriceAdjustmentRate(materialCustomRateInput.value));
    materialCustomRateInput.addEventListener("keydown", event => { if (event.key === "Enter") setMaterialPriceAdjustmentRate(materialCustomRateInput.value); });
    materialCustomRateInput.addEventListener("input", () => { if (Number(materialCustomRateInput.value) < 0) materialCustomRateInput.value = "0"; });
    syncMaterialPriceAdjustmentUI();

    renderMaterialTable("");
    showMaterialImage(null);
    resetMaterialInfo();

  