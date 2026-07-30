const menuButton = document.getElementById('menuButton');
const mobileMenu = document.getElementById('mobileMenu');
const globalSearch = document.getElementById('globalSearch');
const cards = [...document.querySelectorAll('.category-card')];
const emptyState = document.getElementById('emptyState');

menuButton.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

mobileMenu.addEventListener('click', (event) => {
  if (event.target.matches('a')) {
    mobileMenu.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('click', (event) => {
  if (!mobileMenu.contains(event.target) && !menuButton.contains(event.target)) {
    mobileMenu.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }
});

globalSearch.addEventListener('input', (event) => {
  const query = event.target.value.trim().toLowerCase();
  let visibleCount = 0;

  cards.forEach((card) => {
    const haystack = `${card.dataset.title} ${card.dataset.keywords}`.toLowerCase();
    const isMatch = haystack.includes(query);
    card.hidden = !isMatch;
    if (isMatch) visibleCount += 1;
  });

  emptyState.hidden = visibleCount !== 0;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // GitHub Pages 등 정적 배포 환경에서 등록 실패 시 앱 자체는 정상 작동합니다.
    });
  });
}
