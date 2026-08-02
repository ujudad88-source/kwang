import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";
import { firebaseConfig, ADMIN_UID, ADMIN_EMAIL } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const EMPLOYEE_COLLECTION = "employeeAccess";
const FALLBACK_URL = "./data/users.json";
const SESSION_PROFILE_KEY = "gwangtelecom-v100-profile";

let fallbackUsers = [];
let currentProfile = null;

function $(id) { return document.getElementById(id); }

async function sha256(value) {
  const data = new TextEncoder().encode(String(value || "").trim());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeProfile(data, extra = {}) {
  return {
    name: String(data?.name || "사용자"),
    position: String(data?.position || ""),
    role: String(data?.role || "viewer"),
    active: data?.active !== false,
    ...extra
  };
}

function saveProfile(profile) {
  currentProfile = profile;
  sessionStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(profile));
}

function readSavedProfile() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_PROFILE_KEY) || "null");
  } catch {
    return null;
  }
}

function clearSavedProfile() {
  currentProfile = null;
  sessionStorage.removeItem(SESSION_PROFILE_KEY);
}

function showAuthenticatedUser(profile) {
  const authScreen = $("authScreen");
  const userBadge = $("userBadge");
  const userRole = $("userRole");
  const userName = $("userName");
  const userAvatar = userBadge?.querySelector(".user-avatar");
  const lockButton = $("lockButton");
  const adminButton = $("adminManageButton");

  userRole.textContent = profile.role === "admin" ? "관리자" : (profile.role || "사용자");
  userName.textContent = `${profile.name}${profile.position ? ` ${profile.position}` : ""}`;
  if (userAvatar) userAvatar.textContent = profile.name.charAt(0);
  userBadge?.classList.add("active");
  if (lockButton) lockButton.hidden = false;
  if (adminButton) adminButton.hidden = profile.role !== "admin";
  if (authScreen) authScreen.hidden = true;
  document.body.classList.remove("auth-locked");
}

function showLoginScreen(message = "") {
  const authScreen = $("authScreen");
  const userBadge = $("userBadge");
  const lockButton = $("lockButton");
  const adminButton = $("adminManageButton");
  const authPassword = $("authPassword");
  const authError = $("authError");
  const authStatus = $("authStatus");

  userBadge?.classList.remove("active");
  if (lockButton) lockButton.hidden = true;
  if (adminButton) adminButton.hidden = true;
  document.body.classList.add("auth-locked");
  if (authScreen) authScreen.hidden = false;
  if (authPassword) authPassword.value = "";
  if (authError) authError.textContent = message;
  if (authStatus) authStatus.textContent = "";
}

async function loadFallbackUsers() {
  try {
    const response = await fetch(FALLBACK_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("fallback load failed");
    const data = await response.json();
    fallbackUsers = Array.isArray(data?.users) ? data.users : [];
  } catch (error) {
    console.warn("비상 사용자 목록을 불러오지 못했습니다.", error);
    fallbackUsers = [];
  }
}

async function findFallbackUser(number) {
  const value = String(number || "").trim();
  const direct = fallbackUsers.find((u) => String(u.number || "").trim() === value);
  if (direct) return normalizeProfile(direct, { source: "fallback" });
  const hash = await sha256(value);
  const matched = fallbackUsers.find((u) => u.numberHash === hash);
  return matched ? normalizeProfile(matched, { source: "fallback" }) : null;
}

async function employeeLogin(number) {
  const value = String(number || "").trim();
  if (value.length < 4) throw new Error("개인번호를 4자리 이상 입력해 주세요.");

  try {
    await setPersistence(auth, browserSessionPersistence);
    if (!auth.currentUser || !auth.currentUser.isAnonymous) {
      if (auth.currentUser) await signOut(auth);
      await signInAnonymously(auth);
    }

    const hash = await sha256(value);
    const snapshot = await getDoc(doc(db, EMPLOYEE_COLLECTION, hash));
    if (!snapshot.exists()) throw new Error("등록되지 않은 개인번호입니다.");
    const profile = normalizeProfile(snapshot.data(), {
      role: snapshot.data().role || "viewer",
      uid: auth.currentUser.uid,
      source: "firebase"
    });
    if (!profile.active) throw new Error("사용이 중지된 계정입니다.");
    saveProfile(profile);
    return profile;
  } catch (firebaseError) {
    console.warn("Firebase 직원 인증 실패, 비상 사용자 목록을 확인합니다.", firebaseError);
    const fallback = await findFallbackUser(value);
    if (fallback) {
      saveProfile(fallback);
      return fallback;
    }
    throw firebaseError;
  }
}

async function adminLogin(email, password) {
  await setPersistence(auth, browserSessionPersistence);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  if (credential.user.uid !== ADMIN_UID) {
    await signOut(auth);
    throw new Error("관리자 권한이 없는 계정입니다.");
  }
  const profile = {
    name: "황철준",
    position: "관리자",
    role: "admin",
    active: true,
    uid: credential.user.uid,
    email: credential.user.email,
    source: "firebase"
  };
  saveProfile(profile);
  return profile;
}

async function logout() {
  clearSavedProfile();
  try { await signOut(auth); } catch (error) { console.warn(error); }
  closeAdminPanel();
  showLoginScreen();
}

function setLoginMode(mode) {
  const employeeForm = $("authForm");
  const adminForm = $("adminAuthForm");
  const employeeTab = $("employeeLoginTab");
  const adminTab = $("adminLoginTab");
  const isAdmin = mode === "admin";
  employeeForm.hidden = isAdmin;
  adminForm.hidden = !isAdmin;
  employeeTab.classList.toggle("active", !isAdmin);
  adminTab.classList.toggle("active", isAdmin);
}

function openAdminPanel() {
  if (currentProfile?.role !== "admin") return;
  $("adminPanel").hidden = false;
  document.body.classList.add("admin-panel-open");
  loadEmployeeList();
}

function closeAdminPanel() {
  const panel = $("adminPanel");
  if (panel) panel.hidden = true;
  document.body.classList.remove("admin-panel-open");
}

function roleLabel(role) {
  return role === "editor" ? "편집자" : "조회 사용자";
}

async function loadEmployeeList() {
  const tbody = $("employeeTableBody");
  const status = $("adminStatus");
  tbody.innerHTML = '<tr><td colspan="6">불러오는 중…</td></tr>';
  try {
    const snap = await getDocs(query(collection(db, EMPLOYEE_COLLECTION), orderBy("name")));
    const rows = [];
    snap.forEach((item) => rows.push({ id: item.id, ...item.data() }));
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6">등록된 직원이 없습니다.</td></tr>';
    } else {
      tbody.innerHTML = rows.map((row) => `
        <tr data-id="${row.id}">
          <td>${escapeHtml(row.name || "")}</td>
          <td>${escapeHtml(row.position || "")}</td>
          <td>${escapeHtml(roleLabel(row.role))}</td>
          <td><span class="admin-state ${row.active === false ? "off" : "on"}">${row.active === false ? "중지" : "사용"}</span></td>
          <td class="admin-hash" title="${row.id}">${row.id.slice(0, 10)}…</td>
          <td>
            <button class="admin-mini edit" data-action="edit" type="button">수정</button>
            <button class="admin-mini danger" data-action="delete" type="button">삭제</button>
          </td>
        </tr>`).join("");
    }
    status.textContent = `직원 ${rows.length}명`;
  } catch (error) {
    console.error(error);
    tbody.innerHTML = '<tr><td colspan="6">목록을 불러오지 못했습니다. Firestore 규칙을 확인해 주세요.</td></tr>';
    status.textContent = "불러오기 실패";
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function resetEmployeeForm() {
  $("employeeEditId").value = "";
  $("employeeNumber").value = "";
  $("employeeNumber").disabled = false;
  $("employeeName").value = "";
  $("employeePosition").value = "";
  $("employeeRole").value = "viewer";
  $("employeeActive").checked = true;
  $("employeeFormTitle").textContent = "직원 추가";
  $("employeeSaveButton").textContent = "직원 저장";
  $("employeeCancelEdit").hidden = true;
}

async function saveEmployee(event) {
  event.preventDefault();
  const editId = $("employeeEditId").value;
  const number = $("employeeNumber").value.trim();
  const name = $("employeeName").value.trim();
  const position = $("employeePosition").value.trim();
  const role = $("employeeRole").value;
  const active = $("employeeActive").checked;
  const message = $("employeeFormMessage");

  if (!name || !position) {
    message.textContent = "이름과 직급을 입력해 주세요.";
    return;
  }
  if (!editId && number.length < 4) {
    message.textContent = "개인번호를 4자리 이상 입력해 주세요.";
    return;
  }

  try {
    message.textContent = "저장 중…";
    if (editId) {
      await updateDoc(doc(db, EMPLOYEE_COLLECTION, editId), {
        name, position, role, active, updatedAt: serverTimestamp()
      });
    } else {
      const id = await sha256(number);
      const existing = await getDoc(doc(db, EMPLOYEE_COLLECTION, id));
      if (existing.exists()) throw new Error("이미 등록된 개인번호입니다.");
      await setDoc(doc(db, EMPLOYEE_COLLECTION, id), {
        name, position, role, active,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
    }
    message.textContent = "저장되었습니다.";
    resetEmployeeForm();
    await loadEmployeeList();
  } catch (error) {
    console.error(error);
    message.textContent = error.message || "저장하지 못했습니다.";
  }
}

async function handleEmployeeTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest("tr[data-id]");
  const id = row.dataset.id;
  const snapshot = await getDoc(doc(db, EMPLOYEE_COLLECTION, id));
  if (!snapshot.exists()) return;
  const data = snapshot.data();

  if (button.dataset.action === "edit") {
    $("employeeEditId").value = id;
    $("employeeNumber").value = "등록된 번호는 보안상 표시하지 않습니다";
    $("employeeNumber").disabled = true;
    $("employeeName").value = data.name || "";
    $("employeePosition").value = data.position || "";
    $("employeeRole").value = data.role || "viewer";
    $("employeeActive").checked = data.active !== false;
    $("employeeFormTitle").textContent = "직원 수정";
    $("employeeSaveButton").textContent = "변경 저장";
    $("employeeCancelEdit").hidden = false;
    $("employeeName").focus();
  } else if (button.dataset.action === "delete") {
    if (!confirm(`${data.name || "직원"} 계정을 삭제하시겠습니까?`)) return;
    await deleteDoc(doc(db, EMPLOYEE_COLLECTION, id));
    await loadEmployeeList();
  }
}

function bindUI() {
  const authForm = $("authForm");
  const adminAuthForm = $("adminAuthForm");
  const authPassword = $("authPassword");
  const authToggle = $("authToggle");
  const authError = $("authError");
  const authStatus = $("authStatus");
  const authSubmit = $("authSubmit");
  const networkStatus = $("networkStatus");

  const syncNetworkStatus = () => { if (networkStatus) networkStatus.textContent = navigator.onLine ? "온라인" : "오프라인"; };
  syncNetworkStatus();
  addEventListener("online", syncNetworkStatus);
  addEventListener("offline", syncNetworkStatus);

  $("employeeLoginTab").addEventListener("click", () => setLoginMode("employee"));
  $("adminLoginTab").addEventListener("click", () => setLoginMode("admin"));
  $("adminBackToEmployee").addEventListener("click", () => setLoginMode("employee"));

  $("authClear").addEventListener("click", () => { authPassword.value = ""; authError.textContent = ""; authStatus.textContent = ""; authPassword.focus(); });
  $("authRefresh").addEventListener("click", () => location.reload());
  authToggle.addEventListener("click", () => {
    const hidden = authPassword.type === "password";
    authPassword.type = hidden ? "text" : "password";
    authToggle.setAttribute("aria-label", hidden ? "개인번호 숨기기" : "개인번호 표시");
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authError.textContent = "";
    authStatus.textContent = "Firebase에서 개인번호를 확인하고 있습니다…";
    authSubmit.disabled = true;
    try {
      const profile = await employeeLogin(authPassword.value);
      authStatus.textContent = profile.source === "fallback" ? "비상 로그인으로 접속했습니다." : "인증되었습니다.";
      showAuthenticatedUser(profile);
    } catch (error) {
      authError.textContent = error.message || "로그인하지 못했습니다.";
      authStatus.textContent = "";
    } finally {
      authSubmit.disabled = false;
    }
  });

  adminAuthForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorEl = $("adminAuthError");
    const statusEl = $("adminAuthStatus");
    const button = $("adminAuthSubmit");
    errorEl.textContent = "";
    statusEl.textContent = "관리자 계정을 확인하고 있습니다…";
    button.disabled = true;
    try {
      const profile = await adminLogin($("adminEmail").value.trim(), $("adminPassword").value);
      statusEl.textContent = "관리자 인증 완료";
      showAuthenticatedUser(profile);
      openAdminPanel();
    } catch (error) {
      errorEl.textContent = error.message || "관리자 로그인에 실패했습니다.";
      statusEl.textContent = "";
    } finally {
      button.disabled = false;
    }
  });

  $("lockButton").addEventListener("click", logout);
  $("adminManageButton").addEventListener("click", openAdminPanel);
  $("adminPanelClose").addEventListener("click", closeAdminPanel);
  $("adminPanelBackdrop").addEventListener("click", closeAdminPanel);
  $("employeeForm").addEventListener("submit", saveEmployee);
  $("employeeCancelEdit").addEventListener("click", resetEmployeeForm);
  $("employeeRefreshButton").addEventListener("click", loadEmployeeList);
  $("employeeTableBody").addEventListener("click", handleEmployeeTableClick);
}

async function boot() {
  await loadFallbackUsers();
  bindUI();
  resetEmployeeForm();
  const saved = readSavedProfile();
  onAuthStateChanged(auth, (user) => {
    if (saved && (saved.source === "fallback" || user)) {
      currentProfile = saved;
      showAuthenticatedUser(saved);
    }
  });
}

document.addEventListener("DOMContentLoaded", boot);

export { auth, db, ADMIN_UID, ADMIN_EMAIL };
