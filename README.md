# KENC UI 2.0 · Build 003.2

## 이번 리빌드 범위
- 확정 로그인 디자인 개선
- Clean White Modern 홈 대시보드 전면 리빌드
- PC 고정 사이드 내비게이션
- 모바일 하단 내비게이션 유지 및 반응형 최적화
- 공통 카드·입력창·헤더 디자인 시스템 적용
- 기존 Firebase, 함, 랙, 자재, 관리자 기능 보존
- 손도면 엔진과 객체 데이터 보존

## 다음 빌드 예정
Build 003.2: 함·랙·자재 화면의 구조적 리빌드
Build 003.2: 손도면 Workspace 구조 리빌드

# 광전기통신 영업지원시스템 v1.1.0

Firebase 기반으로 전환한 첫 번째 메이저 버전입니다. 기존 v0.0.32 기능을 유지하면서 직원 개인번호 로그인, Firebase 관리자 로그인, 사용자 관리 화면을 추가했습니다.

## 이번 버전의 핵심 변경

- Firebase 프로젝트 `kwang-sales-system` 연결
- 직원 로그인: 개인번호 입력 → Firebase 익명 인증 → Firestore 해시 문서 확인
- 관리자 로그인: Firebase 이메일/비밀번호 인증
- 관리자 UID `FEa3XBOSPMcEUumBo0aJrYkdvl12`만 사용자 관리 화면 접근 허용
- 관리자 화면에서 직원 추가·수정·사용 중지·삭제
- 개인번호는 브라우저에서 SHA-256 해시로 변환한 뒤 문서 ID로 저장
- 개인번호 원문은 Firestore에 저장하지 않음
- Firebase 연결 실패 시 `data/users.json` 비상 로그인 유지
- 손도면 생성과 기존 제품·단가 기능은 v0.0.32 상태 유지

## GitHub 배포 전 반드시 해야 할 Firebase 설정

### 1. Firestore 보안 규칙 등록

Firebase 콘솔에서 다음 경로로 이동합니다.

`Firestore Database → 규칙`

배포 ZIP에 포함된 `firestore.rules` 파일을 열어 전체 내용을 복사한 뒤 Firebase 규칙 편집기에 붙여 넣고 **게시**를 누릅니다.

규칙이 게시되지 않으면 관리자 로그인은 되더라도 직원 추가와 직원 목록 조회가 실패합니다.

### 2. Authentication 설정 확인

`Authentication → 로그인 방법`에서 다음 두 항목이 사용 설정되어 있어야 합니다.

- 익명
- 이메일/비밀번호

### 3. 승인된 도메인 확인

`Authentication → 설정 → 승인된 도메인`에서 GitHub Pages 도메인이 포함되어 있는지 확인합니다.

- `ujudad88-source.github.io`

없다면 추가합니다.

## GitHub 업로드 방법

ZIP 압축을 해제한 뒤 내부 파일과 폴더를 GitHub 저장소의 기존 파일 위에 그대로 업로드합니다.

중요 파일:

- `index.html`
- `js/firebase-config.js`
- `js/firebase-auth.js`
- `service-worker.js`
- `firestore.rules` — GitHub에서 실행되는 파일이 아니라 Firebase 콘솔에 붙여 넣는 설정 파일

GitHub Pages 반영 후 기존 캐시가 남아 있으면 브라우저를 완전히 종료했다가 다시 열거나, 사이트 데이터를 삭제한 뒤 접속합니다.

## 최초 직원 등록

1. 로그인 화면에서 `관리자 로그인` 선택
2. 관리자 이메일 `ujudad88@gmail.com` 입력
3. Firebase Authentication에서 만든 관리자 비밀번호 입력
4. 로그인 후 자동으로 열리는 `사용자 관리` 화면에서 개인번호·이름·직급 입력
5. `직원 저장` 선택
6. 직원은 등록한 개인번호로 즉시 로그인 가능

## 사용자 관리 기준

- `조회 사용자`: 현재 제품·단가 조회, 검색, 손도면 작성 및 공유
- `편집자`: 다음 단계에서 단가·자재 편집 권한을 연결할 예정
- `사용 가능` 해제: 직원 문서는 유지하지만 로그인을 차단
- 개인번호 변경: 기존 직원 삭제 후 새 번호로 다시 등록

## 보안 주의사항

Spark 무료 구조에서는 직원 로그인이 익명 Authentication과 개인번호 해시 문서 조회를 결합한 방식입니다. 개인번호 원문은 저장하지 않지만, 서버 기반 커스텀 인증만큼 강력하지는 않습니다.

- 직원 번호는 최소 6자리 권장
- 생년월일, 전화번호 뒷자리, `123456` 같은 번호 금지
- 관리자 비밀번호는 직원과 공유 금지
- `firebase-config.js`는 웹 연결 정보이며 비밀키가 아님
- 서비스 계정 JSON 또는 private key는 GitHub에 업로드 금지

## 포함 파일

- `index.html`: 기존 시스템과 Firebase 로그인 UI
- `js/firebase-config.js`: Firebase 웹 설정 및 관리자 UID
- `js/firebase-auth.js`: 직원·관리자 인증 및 사용자 관리
- `firestore.rules`: Firestore 접근 권한 규칙
- `firestore.indexes.json`: 향후 인덱스 확장용
- `data/users.json`: Firebase 장애 시 비상 로그인용
- `drawing_srcdoc_v82.html`: 손도면 생성 모듈

## 장점과 한계

**장점:** 직원 등록 후 GitHub 재업로드 없이 즉시 로그인할 수 있고, 개인번호 원문이 데이터베이스에 남지 않습니다.

**한계:** 무료 Spark 요금제이므로 직원 개인번호 인증은 서버 검증 방식이 아닙니다. 관리자 권한은 Firebase 이메일 계정과 고정 UID로 보호되며, 중요한 수정 기능은 관리자에게만 제공합니다.


## v1.1.0 관리자 통제형 다중 빌드 검증판

- Classic: 기존 구조를 유지하는 복구용 빌드
- KENC Professional: 사이드 내비게이션·업무 대시보드·모바일 최적화
- Autodesk CAD: 상단 도구막대·객체 팔레트·고밀도 도면 작업 중심
- 관리자만 `시스템 관리`에서 미리보기 및 전 직원 적용 가능
- 직원은 Firebase `settings/system.activeBuild`에 지정된 빌드만 사용
- 접지, 투명아크릴창, 이중시건, 명판 등 손도면 객체와 엔진은 공통이며 변경하지 않음
- 새 firestore.rules를 반드시 다시 게시해야 전체 적용 기능이 작동함


## v1.2.1 UI 검증판
- Build UI - Login v2.0 (15번 노션 스타일) 전면 적용
- 로그인, 홈, 함, 랙, 자재, 도면, 관리자 화면 디자인 시스템 통합
- 기존 Firebase 인증, 사용자 관리, 제품/단가 데이터, 도면 객체 및 공유 기능 유지
- 다중 빌드 선택 UI는 숨김 처리하고 단일 KENC 디자인으로 고정


## v1.2.1 브랜딩 개선
- 홈 상단 KENC/광전기통신 락업 디자인 적용
- 로그인 소개 문구 간격 및 위계 정돈
- 실제 제품과 혼동되는 임의 그림 아이콘 제거
- 통신함·분전반·세대단자함을 텍스트 기반 제품군 배지로 교체


## UI 2.0 Build 003.2
- 헤더 영역 넘침 방지 및 사용자·잠금 컨트롤 반응형 재배치
- PC 좌측 메뉴 접기/펼치기 및 상태 저장
- 모바일 슬라이드 메뉴와 배경 스크림
- 함·랙·자재 화면 공통 제품 업무 레이아웃 적용
- 기존 Firebase, 데이터, 손도면 엔진 및 객체 보존


## UI 2.0 Build 003.2
- 손도면 생성기를 CAD형 3열 Workspace로 재배치
- 객체 팔레트, 도면 캔버스, 속성, 3D 미리보기 영역 분리
- 태블릿 및 모바일 작업 순서 최적화
- 기존 객체 ID, 데이터 구조, 좌표·회전·공유 엔진 유지


## Build 003.2 안정화
- Professional Dark 첫 번째 시안 기준의 2D 중심 CAD 배치
- 데스크톱 4열/중형 3열/태블릿·모바일 단일 열 반응형
- 데스크톱 하단 내비게이션 비표시 및 모바일 전용 유지
- 2D·3D 집중 모드를 뷰포트 전체화면으로 격리해 겹침 방지
- 도면 캔버스 높이 제한과 패널 내부 스크롤 적용
- 다크 화면 글자 크기와 명암 대비 보강


## Build 003.4
Professional Dark 색상 통일, 객체 팔레트 정렬, 반응형 작업공간 및 모바일 드래그 스크롤 방지를 적용했습니다. 기존 도면 객체 엔진은 변경하지 않았습니다.


## Build 003.6
집중 모드, 3D 카메라 조작, 제작 중요사항 및 함체 속성 영역의 반응형 안정화 패치입니다.


## Build 004.0.0 architecture
See `ARCHITECTURE_LEVEL3_LEVEL4.md`. Existing behavior is preserved through an immutable compatibility layer; all new work belongs in isolated page/component modules.
