import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";
import { firebaseConfig, ADMIN_UID } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const SETTINGS_REF = doc(db, "settings", "system");
const BUILDS = {
  classic: { name: "Classic", description: "안전 복구용 기존 화면" },
  kenc: { name: "KENC Professional", description: "업무·모바일 최적화" },
  cad: { name: "Autodesk CAD", description: "도면·고밀도 PC 작업 최적화" }
};
let globalBuild = "classic";
let previewBuild = null;
let unsubscribe = null;

function safeBuild(value){ return BUILDS[value] ? value : "classic"; }
function effectiveBuild(){ return previewBuild || globalBuild; }
function setActiveBuild(build, source="global"){
  build=safeBuild(build);
  document.body.dataset.build=build;
  document.documentElement.dataset.build=build;
  const label=document.getElementById("activeBuildLabel");
  if(label) label.textContent=`${BUILDS[build].name} · 관리자 지정 빌드 · 도면 엔진/객체 공통 유지`;
  const globalName=document.getElementById("globalBuildName");
  if(globalName) globalName.textContent=BUILDS[globalBuild].name;
  document.querySelectorAll("[data-build-card]").forEach(card=>card.classList.toggle("active",card.dataset.buildCard===build));
  document.querySelectorAll(".build-nav-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.target===window.__kencCurrentPanel));
  const state=document.querySelector(".cad-build-state"); if(state) state.textContent=`BUILD: ${BUILDS[build].name}${source==="preview"?" (PREVIEW)":""}`;
  localStorage.setItem("kenc-last-good-build",build);
}
function buildNavigation(){
  if(document.querySelector(".build-shell-nav")) return;
  const nav=document.createElement("aside"); nav.className="build-shell-nav"; nav.setAttribute("aria-label","KENC 빌드 내비게이션");
  nav.innerHTML=`<div class="build-nav-logo">KENC</div><div class="build-nav-items">
    <button class="build-nav-item" data-target="homePanel"><span>⌂</span>홈</button>
    <button class="build-nav-item" data-target="drawingPanel"><span>✎</span>도면</button>
    <button class="build-nav-item" data-target="rackPanel"><span>▦</span>랙</button>
    <button class="build-nav-item" data-target="boxPanel"><span>□</span>함</button>
    <button class="build-nav-item" data-target="materialPanel"><span>◫</span>자재</button>
  </div><div class="build-nav-spacer"></div><div class="build-nav-version">v1.1.0</div>`;
  document.body.appendChild(nav);
  nav.addEventListener("click",e=>{const b=e.target.closest("[data-target]");if(!b)return;goPanel(b.dataset.target)});
  const bar=document.createElement("div");bar.className="cad-commandbar";bar.innerHTML=`<strong>KENC CAD WORKSPACE</strong><button class="cad-tool" data-target="drawingPanel">DRAW</button><button class="cad-tool" data-target="rackPanel">RACK</button><button class="cad-tool" data-target="boxPanel">CABINET</button><button class="cad-tool" data-target="materialPanel">MATERIAL</button><span class="cad-command-spacer"></span><span class="cad-build-state"></span>`;document.body.appendChild(bar);bar.addEventListener("click",e=>{const b=e.target.closest("[data-target]");if(b)goPanel(b.dataset.target)});
}
function goPanel(target){
  const trigger=document.querySelector(`.part-card[data-panel="${target}"]`)||document.querySelector(`.bottom-nav-btn[data-target="${target}"]`);
  if(trigger){trigger.click();window.__kencCurrentPanel=target;document.querySelectorAll(".build-nav-item").forEach(b=>b.classList.toggle("active",b.dataset.target===target));}
}
function msg(text,ok=true){const el=document.getElementById("buildAdminMessage");if(el){el.textContent=text;el.style.color=ok?"#28724a":"#b43a3a"}}
async function applyGlobal(build){
  build=safeBuild(build);
  if(auth.currentUser?.uid!==ADMIN_UID){msg("관리자만 전체 빌드를 변경할 수 있습니다.",false);return}
  if(!confirm(`모든 직원의 화면을 ${BUILDS[build].name}(으)로 변경할까요?\n직원은 다음 로그인 또는 새로고침부터 적용됩니다.`)) return;
  try{await setDoc(SETTINGS_REF,{activeBuild:build,previousBuild:globalBuild,updatedAt:serverTimestamp(),updatedBy:auth.currentUser.uid},{merge:true});globalBuild=build;previewBuild=null;setActiveBuild(build);document.getElementById("cancelBuildPreview")?.setAttribute("hidden","");msg(`${BUILDS[build].name} 빌드를 전 직원에게 적용했습니다.`)}catch(error){console.error(error);msg("빌드 저장 실패: Firestore 규칙을 확인해 주세요.",false)}
}
function wireAdmin(){
  document.addEventListener("click",e=>{
    const preview=e.target.closest("[data-build-preview]");if(preview){previewBuild=safeBuild(preview.dataset.buildPreview);setActiveBuild(previewBuild,"preview");document.getElementById("cancelBuildPreview")?.removeAttribute("hidden");msg(`${BUILDS[previewBuild].name}은 현재 관리자 기기에서만 미리보기 중입니다.`);return}
    const apply=e.target.closest("[data-build-apply]");if(apply)applyGlobal(apply.dataset.buildApply);
  });
  document.getElementById("cancelBuildPreview")?.addEventListener("click",()=>{previewBuild=null;setActiveBuild(globalBuild);document.getElementById("cancelBuildPreview").hidden=true;msg("미리보기를 종료하고 전 직원 적용 빌드로 돌아왔습니다.")});
}
function subscribeSettings(){
  if(unsubscribe)unsubscribe();
  unsubscribe=onSnapshot(SETTINGS_REF,s=>{if(s.exists())globalBuild=safeBuild(s.data().activeBuild);else globalBuild="classic";if(!previewBuild)setActiveBuild(globalBuild);const gn=document.getElementById("globalBuildName");if(gn)gn.textContent=BUILDS[globalBuild].name;},err=>{console.warn("build settings",err);globalBuild=safeBuild(localStorage.getItem("kenc-last-good-build"));if(!previewBuild)setActiveBuild(globalBuild)});
}
document.addEventListener("DOMContentLoaded",()=>{buildNavigation();wireAdmin();setActiveBuild(safeBuild(localStorage.getItem("kenc-last-good-build")));document.addEventListener("click",e=>{const target=e.target.closest("[data-panel]")?.dataset.panel||e.target.closest("[data-target]")?.dataset.target;if(target)window.__kencCurrentPanel=target;});});
onAuthStateChanged(auth,user=>{if(user)subscribeSettings();else{globalBuild=safeBuild(localStorage.getItem("kenc-last-good-build"));setActiveBuild(globalBuild)}});
