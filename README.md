# 광전기통신 영업지원시스템 v1.0.1

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


## v1.0.1 KENC Theme Engine
- 설정의 `테마` 버튼에서 10개 디자인을 즉시 전환할 수 있습니다.
- 선택 테마는 해당 브라우저에 저장되며 다음 접속 시 유지됩니다.
- 도면 생성 엔진과 기존 객체(접지, 투명아크릴창, 이중시건, 명판 등)는 변경하지 않았습니다.
- 모바일 로그인, 관리자 사용자 관리, 공통 헤더의 화면 넘침을 개선했습니다.
