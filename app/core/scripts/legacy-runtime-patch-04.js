
  // 서비스 워커 등록: 설치 후 오프라인에서도 주요 화면과 이미지를 사용할 수 있습니다.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./service-worker.js').catch(function (error) {
        console.warn('서비스 워커 등록 실패:', error);
      });
    });
  }
