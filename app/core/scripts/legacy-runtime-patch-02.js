
(function () {
  const rackImageMap = window.rackImageMap || {};

  function findRackSelect() {
    return document.getElementById("rackProductSelect")
      || document.getElementById("rackSelect")
      || document.querySelector('#rackPanel select')
      || document.querySelector('select[id*="rack" i]')
      || document.querySelector('select[name*="rack" i]');
  }

  function findRackImage() {
    return document.getElementById("rackProductImage")
      || document.getElementById("rackImage")
      || document.querySelector('#rackPanel img')
      || document.querySelector('img[id*="rack" i]');
  }

  function findRackPlaceholder() {
    return document.getElementById("rackImagePlaceholder")
      || document.querySelector('#rackPanel .image-placeholder')
      || document.querySelector('#rackPanel [class*="placeholder"]');
  }

  function updateRackProductImage() {
    const select = findRackSelect();
    const image = findRackImage();
    const placeholder = findRackPlaceholder();

    if (!select || !image) return;

    const selectedName = select.value || select.options[select.selectedIndex]?.textContent.trim() || "";
    const imageSource = rackImageMap[selectedName];

    if (imageSource) {
      image.src = imageSource;
      image.alt = selectedName + " 제품 이미지";
      image.style.display = "block";
      image.style.maxWidth = "100%";
      image.style.width = "auto";
      image.style.height = "auto";
      image.style.maxHeight = "72vh";
      image.style.objectFit = "contain";
      image.style.objectPosition = "center";
      image.style.imageRendering = "auto";
      if (placeholder) {
        placeholder.hidden = true;
        placeholder.style.display = "none";
      }
    } else {
      image.removeAttribute("src");
      image.style.display = "none";
      if (placeholder) {
        placeholder.hidden = false;
        placeholder.style.display = "";
        const strong = placeholder.querySelector("strong");
        const message = placeholder.querySelector("span");
        if (selectedName === '19" 캐비닛 랙') {
          if (strong) strong.textContent = '19" 캐비닛 랙 이미지 등록 대기';
          if (message) message.textContent = "다음에 추가하는 이미지가 이 영역에 표시됩니다.";
        } else {
          if (strong) strong.textContent = "랙 제품 이미지 영역";
          if (message) message.textContent = "제품을 선택하면 등록된 이미지가 표시됩니다.";
        }
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const select = findRackSelect();
    if (!select) return;

    select.addEventListener("change", updateRackProductImage);
    requestAnimationFrame(updateRackProductImage);
  });
})();
