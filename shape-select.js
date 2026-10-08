/* ==========================================================================
   🌟 너울(Noul) - 도안 맞추기 및 나비 커스텀 로직 (shape-select.js)
   - [로딩 텀 제거]: 전체 날개 무늬 2D 썸네일 즉각 사전 캐싱(Preload) 완비
   - [대칭 분기 철저]: 대칭 버튼 미선택 시 원본 사진 100% 그대로 텍스처 추출
   - [404 에러 방지]: 3D 패턴 파일 경로 매핑 정상화 및 안전 처리
   - [기능 보존 100%]: 핀치 줌, 드래그 이동, 블러 조절, 하단 캐러셀 전체 유지
   ========================================================================== */

// 🌟 기본 대체 텍스처 생성 함수
function createFallbackDummyTexture(color1, color2) {
  var c = document.createElement('canvas');
  c.width = 1000;
  c.height = 1000;
  var ctx = c.getContext('2d');
  var grad = ctx.createLinearGradient(0, 0, 1000, 1000);
  grad.addColorStop(0, color1 || '#ffffff');
  grad.addColorStop(1, color2 || '#e5e7eb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1000, 1000);
  return c.toDataURL('image/png');
}

var activeCustomTab = 'wing';
var selectedButterflyShape = 'crescent';
var selectedAntennaType = 'ball';
var selectedPatternId = 'crescent_none';

var patternImageCache = {};

// 🌟 [로딩 텀 제로화]: 무늬 탭 누르기 전에 이미지들을 백그라운드에서 즉시 사전 로드
function preloadAllPatternThumbnails() {
  if (typeof wingPatternDataset === 'undefined') return;
  Object.keys(wingPatternDataset).forEach(function(shapeKey) {
    var pList = wingPatternDataset[shapeKey] || [];
    pList.forEach(function(item) {
      if (item && item.path) {
        preloadPatternImage(item.path);
      }
    });
  });
}

function preloadPatternImage(path) {
  if (!path) return;
  if (!patternImageCache[path]) {
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.src = path;
    patternImageCache[path] = img;
  }
}

// 🌟 [404 에러 방어]: 실제 존재하는 3D 무늬 파일명 매핑 규칙 적용
function get3DPatternPath(shape, patternId) {
  if (!patternId || patternId.indexOf('none') > -1) return null;
  var patNum = patternId.split('_')[1] || "1";
  var shapeFilePrefix = shape;
  // 파일명 규칙 예외 보정
  if (shape === 'moon-halo') shapeFilePrefix = 'moon-halo';
  else if (shape === 'dawn-ray') shapeFilePrefix = 'dawn-ray';
  else if (shape === 'wave-fin') shapeFilePrefix = 'wave-fin';

  return '3DButterfly_pattern/' + shapeFilePrefix + '_pattern_3D_' + patNum + '.png';
}

function preloadSingleWingPattern(shape, patternId) {
  var path = get3DPatternPath(shape, patternId);
  if (!path) return;
  if (!patternImageCache[path]) {
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.src = path;
    patternImageCache[path] = img;
  }
}

function getSelectedPatternObject() {
  if (typeof wingPatternDataset === 'undefined') return null;
  var patterns = wingPatternDataset[selectedButterflyShape] || wingPatternDataset['crescent'] || [];
  return patterns.find(function(p) { return p.id === selectedPatternId; }) || patterns[0] || null;
}

var butterflyPathData = {};
if (typeof wingDataset !== 'undefined') {
  wingDataset.forEach(function(w) { butterflyPathData[w.id] = w; });
}

// --------------------------------------------------------------------------
// 🌟 2D 나비 외곽선 및 무늬 1:1 정밀 렌더러
// --------------------------------------------------------------------------
function updateHeroPreview() {
  var heroSvg = document.getElementById('hero-butterfly-svg');
  var heroPathContainer = document.getElementById('hero-path-container');
  if (!heroSvg || !heroPathContainer || typeof wingDataset === 'undefined') return;

  var currentWing = butterflyPathData[selectedButterflyShape] || wingDataset[0];
  var ant = antennaDataset.find(function(a) { return a.id === selectedAntennaType; }) || antennaDataset[0];

  heroSvg.setAttribute('viewBox', currentWing.viewBox || '0 0 1000 1000');

  var wingD = currentWing.wingD || currentWing.d;
  var bodyD = currentWing.bodyD || "";
  var pat = getSelectedPatternObject();

  var patternSvgEl = "";
  if (pat && pat.path) {
    preloadPatternImage(pat.path);
    preloadSingleWingPattern(selectedButterflyShape, selectedPatternId);
    patternSvgEl = 
      '<g opacity="0.95" style="mix-blend-mode: multiply;">' +
        '<image href="' + pat.path + '" x="0" y="0" width="1000" height="1000" preserveAspectRatio="none"/>' +
      '</g>';
  }

  heroPathContainer.innerHTML = 
    '<defs>' +
      '<mask id="butterfly-outside-mask" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1400" height="1400">' +
        '<rect x="-200" y="-200" width="1400" height="1400" fill="white"/>' +
        '<path d="' + wingD + '" fill="black" fill-rule="nonzero"/>' +
      '</mask>' +
      '<clipPath id="hero-wing-exact-clip">' +
        '<path d="' + wingD + '" fill-rule="nonzero"/>' +
      '</clipPath>' +
    '</defs>' +
    '<rect x="-200" y="-200" width="1400" height="1400" fill="rgba(0, 0, 0, 0.72)" mask="url(#butterfly-outside-mask)"/>' +
    '<g clip-path="url(#hero-wing-exact-clip)">' +
      patternSvgEl +
    '</g>' +
    (bodyD ? '<path d="' + bodyD + '" fill="#ffffff"/>' : '') +
    '<g transform="translate(' + currentWing.headX + ', ' + currentWing.headY + ')" filter="url(#antenna-subtle-contrast)" color="#ffffff">' +
      ant.render(10.5) +
    '</g>';
}

var carouselContainer = document.getElementById('arch-carousel-container');

// 🌟 [로딩 텀 제거 렌더러]: 이미지가 사전 캐시되어 즉시 표시됨
function renderCarouselItems() {
  if (!carouselContainer || typeof wingDataset === 'undefined') return;
  carouselContainer.innerHTML = '';
  
  var dataset = [];
  if (activeCustomTab === 'wing') {
    dataset = wingDataset;
  } else if (activeCustomTab === 'pattern') {
    if (typeof wingPatternDataset !== 'undefined') {
      dataset = wingPatternDataset[selectedButterflyShape] || wingPatternDataset['crescent'] || [];
    }
  } else if (activeCustomTab === 'antenna') {
    dataset = antennaDataset;
  }

  dataset.forEach(function(item) {
    var isActive = false;
    if (activeCustomTab === 'wing') isActive = (item.id === selectedButterflyShape);
    else if (activeCustomTab === 'pattern') isActive = (item.id === selectedPatternId);
    else if (activeCustomTab === 'antenna') isActive = (item.id === selectedAntennaType);

    var div = document.createElement('div');
    div.className = 'arch-track-item';
    var contentHtml = '';

    if (activeCustomTab === 'wing') {
      var wingPath = item.wingD || item.d;
      var bodyPath = item.bodyD || "";
      contentHtml = '<svg viewBox="' + item.viewBox + '" preserveAspectRatio="xMidYMid meet">' +
        '<path d="' + wingPath + '" fill="currentColor" fill-rule="nonzero"/>' +
        (bodyPath ? '<path d="' + bodyPath + '" fill="currentColor"/>' : '') +
        '</svg>';
    } else if (activeCustomTab === 'pattern') {
      if (item.path) {
        preloadPatternImage(item.path);
        preloadSingleWingPattern(selectedButterflyShape, item.id);
        contentHtml = '<img class="pattern-thumb-img" src="' + encodeURI(item.path) + '" alt="" onerror="this.style.display=\'none\'; if(this.nextElementSibling) this.nextElementSibling.style.display=\'block\';" />' +
          '<svg viewBox="0 0 40 40" style="display:none; width:65%; height:65%;"><circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" stroke-dasharray="2,2" stroke-width="1.2"/></svg>';
      } else {
        contentHtml = '<svg viewBox="0 0 40 40" preserveAspectRatio="xMidYMid meet">' + (item.thumb || '<circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" stroke-dasharray="3,3" stroke-width="1.5"/>') + '</svg>';
      }
    } else if (activeCustomTab === 'antenna') {
      contentHtml = '<svg viewBox="-26 -30 52 38" preserveAspectRatio="xMidYMid meet"><g>' + item.render(1.1) + '</g></svg>';
    }

    div.innerHTML = '<button type="button" class="shape-thumb-btn ' + (isActive ? 'active' : '') + '" data-type="' + activeCustomTab + '" data-id="' + item.id + '">' + contentHtml + '</button><span class="shape-item-label text-[11px] ' + (isActive ? 'font-bold text-white' : 'font-medium text-neutral-500') + ' tracking-tight">' + item.name + '</span>';
    carouselContainer.appendChild(div);
  });

  bindItemClickEvents();
  updateCarouselPadding();
  applyStraightSelection();

  setTimeout(function() {
    var activeBtn = carouselContainer.querySelector('.shape-thumb-btn.active');
    if (activeBtn) snapItemToExactCenter(activeBtn.closest('.arch-track-item'));
  }, 50);
}

function bindItemClickEvents() {
  if (!carouselContainer) return;
  carouselContainer.querySelectorAll('.shape-thumb-btn').forEach(function(btn) {
    btn.onclick = function() {
      setActiveItemVisual(btn);
      snapItemToExactCenter(btn.closest('.arch-track-item'));
    };
  });
}

function updateCarouselPadding() {
  if (!carouselContainer) return;
  var firstItem = carouselContainer.querySelector('.arch-track-item');
  if (firstItem) {
    var pad = Math.max(0, (carouselContainer.clientWidth - firstItem.offsetWidth) / 2);
    carouselContainer.style.paddingLeft = pad + 'px';
    carouselContainer.style.paddingRight = pad + 'px';
  }
}

function applyStraightSelection() {
  if (!carouselContainer) return;
  var cWidth = carouselContainer.clientWidth, centerX = carouselContainer.scrollLeft + (cWidth / 2);
  var items = carouselContainer.querySelectorAll('.arch-track-item');
  var centerDetectedItem = null, minDistance = Infinity;

  items.forEach(function(item) {
    var dist = Math.abs(centerX - (item.offsetLeft + item.offsetWidth / 2));
    if (dist < minDistance) { minDistance = dist; centerDetectedItem = item; }
    item.style.transform = 'none';
    item.style.opacity = Math.max(0.35, 1 - (dist / (cWidth * 0.42))).toFixed(2);
  });

  if (centerDetectedItem && minDistance <= 36) {
    var btn = centerDetectedItem.querySelector('.shape-thumb-btn');
    if (btn && !btn.classList.contains('active')) setActiveItemVisual(btn);
  }
}

function setActiveItemVisual(btn) {
  carouselContainer.querySelectorAll('.shape-thumb-btn').forEach(function(b) {
    b.classList.remove('active');
    var txt = b.parentElement.querySelector('.shape-item-label');
    if (txt) { txt.classList.remove('font-bold', 'text-white'); txt.classList.add('font-medium', 'text-neutral-500'); }
  });
  btn.classList.add('active');
  var activeTxt = btn.parentElement.querySelector('.shape-item-label');
  if (activeTxt) { activeTxt.classList.add('font-bold', 'text-white'); activeTxt.classList.remove('font-medium', 'text-neutral-500'); }

  var type = btn.getAttribute('data-type'), id = btn.getAttribute('data-id');
  if (type === 'wing') { 
    selectedButterflyShape = id; 
    var currentPatterns = (typeof wingPatternDataset !== 'undefined' && wingPatternDataset[selectedButterflyShape]) ? wingPatternDataset[selectedButterflyShape] : [];
    selectedPatternId = currentPatterns.length > 0 ? currentPatterns[0].id : (selectedButterflyShape + '_none');
    preloadSingleWingPattern(selectedButterflyShape, selectedPatternId);
    drawAlignCanvas(); 
  } else if (type === 'pattern') {
    selectedPatternId = id;
    var curObj = getSelectedPatternObject();
    if (curObj && curObj.path) preloadPatternImage(curObj.path);
    preloadSingleWingPattern(selectedButterflyShape, selectedPatternId);
    drawAlignCanvas();
  } else if (type === 'antenna') { 
    selectedAntennaType = id; 
  }
  updateHeroPreview();
}

function snapItemToExactCenter(itemElement) {
  if (!carouselContainer || !itemElement) return;
  var targetScroll = itemElement.offsetLeft - ((carouselContainer.clientWidth - itemElement.offsetWidth) / 2);
  carouselContainer.scrollTo({ left: targetScroll, behavior: 'smooth' });
}

function autoSnapToNearestCenter() {
  if (!carouselContainer) return;
  var centerX = carouselContainer.scrollLeft + (carouselContainer.clientWidth / 2);
  var closestItem = null, minDistance = Infinity;
  carouselContainer.querySelectorAll('.arch-track-item').forEach(function(item) {
    var dist = Math.abs(centerX - (item.offsetLeft + item.offsetWidth / 2));
    if (dist < minDistance) { minDistance = dist; closestItem = item; }
  });
  if (closestItem) {
    var btn = closestItem.querySelector('.shape-thumb-btn');
    if (btn) setActiveItemVisual(btn);
    snapItemToExactCenter(closestItem);
  }
}

if (carouselContainer) {
  var scrollTimer = null;
  carouselContainer.addEventListener('scroll', function() {
    applyStraightSelection();
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(autoSnapToNearestCenter, 100);
  }, { passive: true });
}

window.addEventListener('resize', function() {
  updateCarouselPadding(); 
  applyStraightSelection();
});

var tabWing = document.getElementById('tab-wing');
var tabPattern = document.getElementById('tab-pattern');
var tabAntenna = document.getElementById('tab-antenna');
var tabBlur = document.getElementById('tab-blur');
var shapeTitle = document.getElementById('shape-screen-title');
var shapeDesc = document.getElementById('shape-screen-desc');
var blurSliderBox = document.getElementById('blur-slider-box');
var carouselStage = document.getElementById('carousel-stage');

function switchTab(tabKey) {
  activeCustomTab = tabKey;
  [tabWing, tabPattern, tabAntenna, tabBlur].forEach(function(b) { if (b) b.classList.remove('active-tab'); });
  
  if (tabKey === 'wing') {
    if (shapeTitle) shapeTitle.innerText = "날개 형태 고르기";
    if (shapeDesc) shapeDesc.innerHTML = "<strong class='text-white'>[드래그]</strong> 이동, <strong class='text-white'>[두 손가락 핀치]</strong> 확대/축소";
  } else if (tabKey === 'pattern') {
    if (shapeTitle) shapeTitle.innerText = "날개 무늬 고르기";
    if (shapeDesc) shapeDesc.innerHTML = "원하는 고유 무늬를 선택해 날개에 새겨보세요";
    var currentPatterns = (typeof wingPatternDataset !== 'undefined' && wingPatternDataset[selectedButterflyShape]) ? wingPatternDataset[selectedButterflyShape] : [];
    if (!currentPatterns.some(function(p) { return p.id === selectedPatternId; })) {
      selectedPatternId = currentPatterns.length > 0 ? currentPatterns[0].id : (selectedButterflyShape + '_none');
    }
  } else if (tabKey === 'antenna') {
    if (shapeTitle) shapeTitle.innerText = "더듬이 모양 고르기";
    if (shapeDesc) shapeDesc.innerHTML = "나비의 인상을 결정할 더듬이를 선택해 보세요";
  } else if (tabKey === 'blur') {
    if (shapeTitle) shapeTitle.innerText = "질감 및 대칭 조정";
    if (shapeDesc) shapeDesc.innerHTML = "색상의 부드러움과 좌우 대칭을 조절해 보세요";
  }

  if (tabKey === 'wing' || tabKey === 'pattern' || tabKey === 'antenna') {
    var activeTabEl = tabKey === 'wing' ? tabWing : (tabKey === 'pattern' ? tabPattern : tabAntenna);
    if (activeTabEl) activeTabEl.classList.add('active-tab');
    if (blurSliderBox) blurSliderBox.classList.add('hidden-slider');
    if (carouselStage) carouselStage.style.display = 'flex';
    requestAnimationFrame(renderCarouselItems);
  } else if (tabKey === 'blur') {
    if (tabBlur) tabBlur.classList.add('active-tab');
    if (blurSliderBox) blurSliderBox.classList.remove('hidden-slider');
    if (carouselStage) carouselStage.style.display = 'none';
  }
}

if (tabWing) tabWing.onclick = function() { switchTab('wing'); };
if (tabPattern) tabPattern.onclick = function() { switchTab('pattern'); };
if (tabAntenna) tabAntenna.onclick = function() { switchTab('antenna'); };
if (tabBlur) tabBlur.onclick = function() { switchTab('blur'); };

var btnRephoto = document.getElementById('btn-rephoto-from-shape');
if (btnRephoto) {
  btnRephoto.onclick = function() {
    if (cameraInput) cameraInput.value = '';
    if (albumInput) albumInput.value = '';
    showScreen('screen-capture-guide');
  };
}

var btnConfirmShape = document.getElementById('btn-confirm-shape');
if (btnConfirmShape) {
  btnConfirmShape.onclick = function() {
    exportAlignedTexture();
    showScreen('screen-loading');
    startAnswerShowcaseSequence();
  };
}

// --------------------------------------------------------------------------
// 캔버스 드로잉 및 블러
// --------------------------------------------------------------------------
function executeReliableFastBlur(canvas, radius) {
  if (radius <= 0.2) return;
  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  var w = canvas.width, h = canvas.height;
  var imgData = ctx.getImageData(0, 0, w, h);
  var src = imgData.data;
  var r = Math.max(1, Math.round(radius)), kernelSize = r * 2 + 1;
  var temp = new Uint8ClampedArray(src.length);

  for (var y = 0; y < h; y++) {
    var rowStart = y * w * 4, rSum = 0, gSum = 0, bSum = 0, aSum = 0;
    for (var i = -r; i <= r; i++) {
      var px = Math.min(w - 1, Math.max(0, i)), pIndex = rowStart + px * 4;
      rSum += src[pIndex]; gSum += src[pIndex + 1]; bSum += src[pIndex + 2]; aSum += src[pIndex + 3];
    }
    for (var x = 0; x < w; x++) {
      var outIndex = rowStart + x * 4;
      temp[outIndex] = rSum / kernelSize; temp[outIndex + 1] = gSum / kernelSize; temp[outIndex + 2] = bSum / kernelSize; temp[outIndex + 3] = aSum / kernelSize;
      var remIdx = rowStart + Math.min(w - 1, Math.max(0, x - r)) * 4;
      var addIdx = rowStart + Math.min(w - 1, Math.max(0, x + r + 1)) * 4;
      rSum += src[addIdx] - src[remIdx]; gSum += src[addIdx + 1] - src[remIdx + 1]; bSum += src[addIdx + 2] - src[remIdx + 2]; aSum += src[addIdx + 3] - src[remIdx + 3];
    }
  }

  for (var x = 0; x < w; x++) {
    var rSum2 = 0, gSum2 = 0, bSum2 = 0, aSum2 = 0;
    for (var i = -r; i <= r; i++) {
      var py = Math.min(h - 1, Math.max(0, i)), pIndex2 = (py * w + x) * 4;
      rSum2 += temp[pIndex2]; gSum2 += temp[pIndex2 + 1]; bSum2 += temp[pIndex2 + 2]; aSum2 += temp[pIndex2 + 3];
    }
    for (var y = 0; y < h; y++) {
      var outIndex2 = (y * w + x) * 4;
      src[outIndex2] = rSum2 / kernelSize; src[outIndex2 + 1] = gSum2 / kernelSize; src[outIndex2 + 2] = bSum2 / kernelSize; src[outIndex2 + 3] = aSum2 / kernelSize;
      var remIdx2 = (Math.min(h - 1, Math.max(0, y - r)) * w + x) * 4;
      var addIdx2 = (Math.min(h - 1, Math.max(0, y + r + 1)) * w + x) * 4;
      rSum2 += temp[addIdx2] - temp[remIdx2]; gSum2 += temp[addIdx2 + 1] - temp[remIdx2 + 1]; bSum2 += temp[addIdx2 + 2] - temp[remIdx2 + 2]; aSum2 += temp[addIdx2 + 3] - temp[remIdx2 + 3];
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

var rawImage = new Image();
var alignCanvas = document.getElementById('align-canvas');
var actx = alignCanvas ? alignCanvas.getContext('2d', { willReadFrequently: true }) : null;
var imgX = 0, imgY = 0, imgScale = 1.0;
var isDragging = false, startX = 0, startY = 0, startPinchDist = 0, pinchStartScale = 1.0;
var currentExtractedTexture = null, currentBlurPx = 0, isSymmetryEnabled = false;

var blurSlider = document.getElementById('blur-slider');
var toggleSymmetryBtn = document.getElementById('toggle-symmetry-btn');

function updateSliderProgress(val, min, max) {
  if (!blurSlider) return;
  var minVal = parseFloat(min !== undefined ? min : (blurSlider.min || 0));
  var maxVal = parseFloat(max !== undefined ? max : (blurSlider.max || 25));
  var percent = Math.max(0, Math.min(100, ((parseFloat(val) - minVal) / (maxVal - minVal)) * 100));
  blurSlider.style.setProperty('--blur-percent', percent + '%');
}

function applyBlurValue(val) {
  currentBlurPx = parseFloat(val) || 0;
  updateSliderProgress(currentBlurPx);
  drawAlignCanvas();
}

if (blurSlider) {
  blurSlider.oninput = function(e) { applyBlurValue(e.target.value); };
  blurSlider.onchange = function(e) { applyBlurValue(e.target.value); };
}

if (toggleSymmetryBtn) {
  toggleSymmetryBtn.onclick = function() {
    isSymmetryEnabled = !isSymmetryEnabled;
    toggleSymmetryBtn.classList.toggle('toggle-active', isSymmetryEnabled);
    toggleSymmetryBtn.setAttribute('aria-pressed', isSymmetryEnabled ? 'true' : 'false');
    drawAlignCanvas();
  };
}

function handleFile(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      rawImage = img;
      if (blurSlider) { blurSlider.value = 0; currentBlurPx = 0; updateSliderProgress(0); }
      isSymmetryEnabled = false;
      if (toggleSymmetryBtn) { toggleSymmetryBtn.classList.remove('toggle-active'); toggleSymmetryBtn.setAttribute('aria-pressed', 'false'); }
      initAlignUI();
      showScreen('screen-shape-select');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

var cameraInput = document.getElementById('camera-input');
var albumInput = document.getElementById('album-input');
if (cameraInput) {
  cameraInput.onclick = function(e) { e.target.value = null; };
  cameraInput.onchange = function(e) { if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]); };
}
if (albumInput) {
  albumInput.onclick = function(e) { e.target.value = null; };
  albumInput.onchange = function(e) { if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]); };
}

function initAlignUI() {
  if (!rawImage || !rawImage.width || !alignCanvas) return;
  imgScale = alignCanvas.width / Math.min(rawImage.width, rawImage.height);
  imgX = (alignCanvas.width - rawImage.width * imgScale) / 2;
  imgY = (alignCanvas.height - rawImage.height * imgScale) / 2;
  drawAlignCanvas();
}

function drawAlignCanvas() {
  if (!alignCanvas || !actx) return;
  actx.clearRect(0, 0, alignCanvas.width, alignCanvas.height);
  if (!rawImage || !rawImage.width) return;

  var midX = alignCanvas.width / 2;
  var tempCanvas = document.createElement('canvas');
  tempCanvas.width = alignCanvas.width; tempCanvas.height = alignCanvas.height;
  var tctx = tempCanvas.getContext('2d', { willReadFrequently: true });
  tctx.drawImage(rawImage, imgX, imgY, rawImage.width * imgScale, rawImage.height * imgScale);

  if (currentBlurPx > 0) executeReliableFastBlur(tempCanvas, currentBlurPx * 0.9);

  // 🌟 [대칭 토글 엄격 분기]
  if (!isSymmetryEnabled) {
    actx.drawImage(tempCanvas, 0, 0);
  } else {
    actx.drawImage(tempCanvas, 0, 0, midX, alignCanvas.height, 0, 0, midX, alignCanvas.height);
    actx.save();
    actx.translate(alignCanvas.width, 0); actx.scale(-1, 1);
    actx.drawImage(tempCanvas, 0, 0, midX, alignCanvas.height, 0, 0, midX, alignCanvas.height);
    actx.restore();
  }
}

var interactiveFrame = document.getElementById('interactive-align-frame');
if (interactiveFrame && alignCanvas) {
  interactiveFrame.onmousedown = function(e) {
    isDragging = true;
    var rect = alignCanvas.getBoundingClientRect(), sFactor = alignCanvas.width / rect.width;
    startX = (e.clientX - rect.left) * sFactor - imgX; startY = (e.clientY - rect.top) * sFactor - imgY;
  };
  window.addEventListener('mousemove', function(e) {
    if (!isDragging || !alignCanvas) return;
    var rect = alignCanvas.getBoundingClientRect(), sFactor = alignCanvas.width / rect.width;
    imgX = (e.clientX - rect.left) * sFactor - startX; imgY = (e.clientY - rect.top) * sFactor - startY;
    drawAlignCanvas();
  });
  window.addEventListener('mouseup', function() { isDragging = false; });
  interactiveFrame.addEventListener('wheel', function(e) {
    e.preventDefault();
    imgScale *= (e.deltaY < 0 ? 1.06 : 0.94);
    drawAlignCanvas();
  }, { passive: false });

  interactiveFrame.addEventListener('touchstart', function(e) {
    var rect = alignCanvas.getBoundingClientRect(), sFactor = alignCanvas.width / rect.width;
    if (e.touches.length === 1) {
      isDragging = true;
      startX = (e.touches[0].clientX - rect.left) * sFactor - imgX; startY = (e.touches[0].clientY - rect.top) * sFactor - imgY;
    } else if (e.touches.length === 2) {
      isDragging = false;
      startPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchStartScale = imgScale;
    }
  }, { passive: false });

  window.addEventListener('touchmove', function(e) {
    if (!document.getElementById('screen-shape-select').classList.contains('active')) return;
    var rect = alignCanvas.getBoundingClientRect(), sFactor = alignCanvas.width / rect.width;
    if (e.touches.length === 1 && isDragging) {
      if (e.cancelable) e.preventDefault();
      imgX = (e.touches[0].clientX - rect.left) * sFactor - startX; imgY = (e.touches[0].clientY - rect.top) * sFactor - startY;
      drawAlignCanvas();
    } else if (e.touches.length === 2 && startPinchDist > 0) {
      if (e.cancelable) e.preventDefault();
      imgScale = pinchStartScale * (Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY) / startPinchDist);
      drawAlignCanvas();
    }
  }, { passive: false });
  window.addEventListener('touchend', function() { isDragging = false; startPinchDist = 0; });
}

// --------------------------------------------------------------------------
// 🌟 [핵심 수정]: 텍스처 추출 시 대칭 OFF이면 원본 사진 그대로 내보냄
// --------------------------------------------------------------------------
function exportAlignedTexture() {
  if (!rawImage || !rawImage.width || !alignCanvas) {
    currentExtractedTexture = createFallbackDummyTexture(); return;
  }
  var baseCanvas = document.createElement('canvas');
  baseCanvas.width = alignCanvas.width; baseCanvas.height = alignCanvas.height;
  var bctx = baseCanvas.getContext('2d', { willReadFrequently: true });
  bctx.drawImage(rawImage, imgX, imgY, rawImage.width * imgScale, rawImage.height * imgScale);

  if (currentBlurPx > 0) executeReliableFastBlur(baseCanvas, currentBlurPx * 0.9);

  // 🌟 사용자가 버튼을 켰을 때만 대칭 적용. 안 켰으면 원본 그대로 통과
  if (isSymmetryEnabled) {
    var midX = alignCanvas.width / 2, symCanvas = document.createElement('canvas');
    symCanvas.width = alignCanvas.width; symCanvas.height = alignCanvas.height;
    var sctx = symCanvas.getContext('2d');
    sctx.drawImage(baseCanvas, 0, 0, midX, alignCanvas.height, 0, 0, midX, alignCanvas.height);
    sctx.save(); sctx.translate(alignCanvas.width, 0); sctx.scale(-1, 1);
    sctx.drawImage(baseCanvas, 0, 0, midX, alignCanvas.height, 0, 0, midX, alignCanvas.height);
    sctx.restore();
    baseCanvas = symCanvas;
  }

  var outW = 1000, outH = 1000;
  var finalCanvas = document.createElement('canvas');
  finalCanvas.width = outW; finalCanvas.height = outH;
  var fctx = finalCanvas.getContext('2d');

  fctx.drawImage(baseCanvas, 0, 0, alignCanvas.width, alignCanvas.height, 0, 0, outW, outH);

  var singleWingPatternPath = get3DPatternPath(selectedButterflyShape, selectedPatternId);
  if (singleWingPatternPath) {
    var pImg = patternImageCache[singleWingPatternPath];
    if (!pImg) {
      pImg = new Image();
      pImg.crossOrigin = "anonymous";
      pImg.src = singleWingPatternPath;
      patternImageCache[singleWingPatternPath] = pImg;
    }
    if (pImg.complete && pImg.naturalWidth > 0) {
      fctx.save();
      fctx.globalCompositeOperation = 'multiply';
      fctx.globalAlpha = 0.95;
      fctx.drawImage(pImg, 0, 0, outW, outH);
      fctx.restore();
    }
  }

  currentExtractedTexture = finalCanvas.toDataURL('image/png');
}

// 🌟 앱 시작 시 무늬 썸네일 즉시 백그라운드 프리로드 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', preloadAllPatternThumbnails);
} else {
  preloadAllPatternThumbnails();
}