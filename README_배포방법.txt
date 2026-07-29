# 광전기통신 제품정보 V77 PWA

이 폴더는 PC·안드로이드·아이폰에서 주소로 실행하고 홈 화면에 설치할 수 있는 배포용 웹앱입니다.

## 가장 쉬운 배포: Netlify Drop
1. ZIP 압축을 풉니다.
2. Netlify Drop 사이트에 이 폴더 전체를 끌어다 놓습니다.
3. 생성된 https 주소를 저장합니다.
4. 아이폰 Safari에서 주소를 열고 공유 → 홈 화면에 추가를 누릅니다.

## GitHub Pages 배포
1. GitHub 계정을 만듭니다.
2. 새 저장소를 만들고 Public으로 설정합니다.
3. 이 폴더의 파일을 저장소 최상위에 업로드합니다.
4. Settings → Pages → Deploy from a branch → main / root → Save를 누릅니다.
5. 표시되는 https 주소로 접속합니다.

## 업데이트 방법
index.html 또는 assets 파일을 새 버전으로 교체한 뒤 다시 업로드합니다. service-worker.js의 CACHE_NAME 버전도 올리면 모바일 캐시가 새 버전으로 갱신됩니다.
