/* ==========================================================================
   🌟 너울(Noul) 메인 애플리케이션 로직 (app.js)
   - 아이폰 17 화면비 및 애니메이션/위치 보정 반영 완료
   - 나비 7종 .glb 동적 로드 및 3종 더듬이 가시성 제어
   - 날개 무음영(MeshBasicMaterial) & 몸통/더듬이 전용 음영(MeshStandardMaterial) 분리
   - 후광 배경 순수 화이트 글로우 전환 (RGB 색번짐/노이즈 완벽 차단)
   - 로딩 완료 화면 문구 정리 및 나비 확대
   ========================================================================== */

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(function(s) {
    s.classList.remove('active');
  });
  var target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    if (screenId === 'screen-shape-select') {
      switchTab('wing');
      updateHeroPreview();
      drawAlignCanvas();
    } else if (screenId === 'screen-gallery') {
      initSpecimenGallery();
    }
  }
  updateDevScreenBadge();
}

document.getElementById('btn-start-cover').addEventListener('click', function() { showScreen('screen-menu'); });
document.getElementById('btn-menu-back').addEventListener('click', function() { showScreen('screen-cover'); });
document.getElementById('menu-btn-create').addEventListener('click', function() { showScreen('screen-opening'); resetOpeningFlow(); });
document.getElementById('btn-opening-back').addEventListener('click', function() { clearTimeout(typeTimer); showScreen('screen-menu'); });
document.getElementById('btn-guide-back-to-menu').addEventListener('click', function() { showScreen('screen-menu'); });

// 나비 둘러보기 클릭 시 박제 갤러리로 이동
document.getElementById('menu-btn-browse').addEventListener('click', function() { showScreen('screen-gallery'); });
document.getElementById('btn-gallery-back').addEventListener('click', function() { showScreen('screen-menu'); });

document.getElementById('menu-btn-intro').addEventListener('click', function() { showScreen('screen-intro'); });
document.getElementById('btn-intro-back').addEventListener('click', function() { showScreen('screen-menu'); });
document.getElementById('btn-intro-bottom-back').addEventListener('click', function() { showScreen('screen-menu'); });

var openingCurrentStep = 1;
var elOpeningText = document.getElementById('opening-text');
var elOpeningChoiceGroup = document.getElementById('opening-choice-group');
var elOpeningNextGroup = document.getElementById('opening-next-group');
var btnOpeningNext = document.getElementById('btn-opening-next');
var typeTimer = null;

function typeWriterText(textWithHtml, onComplete) {
  clearTimeout(typeTimer);
  elOpeningText.innerHTML = "";
  var tokens = textWithHtml.match(/(<[^>]+>|[^<])/g) || [];
  var idx = 0;
  var currentContent = "";

  function nextChar() {
    if (idx < tokens.length) {
      var char = tokens[idx];
      currentContent += char;
      elOpeningText.innerHTML = currentContent;
      idx++;
      var delay = 100;
      if (char.startsWith('<')) delay = 0;
      else if (char === '?' || char === '.') delay = 500;
      else if (char === ',') delay = 300;
      typeTimer = setTimeout(nextChar, delay);
    } else {
      setTimeout(function() { if (onComplete) onComplete(); }, 250);
    }
  }
  nextChar();
}

function resetOpeningFlow() {
  clearTimeout(typeTimer);
  openingCurrentStep = 1;
  elOpeningChoiceGroup.classList.remove('visible');
  elOpeningChoiceGroup.classList.add('hidden');
  elOpeningNextGroup.classList.add('hidden');
  elOpeningNextGroup.classList.remove('visible');

  typeWriterText("안녕하세요?<br>이곳에는 우연히 발걸음하셨나요?", function() {
    elOpeningChoiceGroup.classList.remove('hidden');
    requestAnimationFrame(function() {
      elOpeningChoiceGroup.classList.add('visible');
    });
  });
}

document.getElementById('btn-opening-yes').addEventListener('click', function() {
  openingCurrentStep = 2;
  elOpeningChoiceGroup.classList.remove('visible');
  elOpeningChoiceGroup.classList.add('hidden');
  typeWriterText("우연한 발걸음이어도 좋습니다.<br>내면의 무언가가 이곳으로 이끌었을지도<br>모르겠네요.", function() {
    btnOpeningNext.innerHTML = "다음으로 ≫";
    elOpeningNextGroup.classList.remove('hidden');
    requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); });
  });
});

document.getElementById('btn-opening-no').addEventListener('click', function() {
  openingCurrentStep = 2;
  elOpeningChoiceGroup.classList.remove('visible');
  elOpeningChoiceGroup.classList.add('hidden');
  typeWriterText("찾아와 주셨군요.<br>당신을 맞이할 준비가 되어 있었습니다.", function() {
    btnOpeningNext.innerHTML = "다음으로 ≫";
    elOpeningNextGroup.classList.remove('hidden');
    requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); });
  });
});

btnOpeningNext.addEventListener('click', function() {
  if (openingCurrentStep === 2) {
    openingCurrentStep = 3;
    elOpeningNextGroup.classList.remove('visible');
    elOpeningNextGroup.classList.add('hidden');
    typeWriterText("오늘 이곳에서, 깊은 곳에 잠들어 있던<br><strong class='text-white font-bold'>당신의 나비를 깨워볼까요?</strong>", function() {
      btnOpeningNext.innerHTML = "나비 깨우기 ≫";
      elOpeningNextGroup.classList.remove('hidden');
      requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); });
    });
  } else if (openingCurrentStep === 3) {
    startCaptureGuideCinematicFlow();
  }
});

/* 🌟 촬영 안내 타이핑 후 상단 이동 애니메이션 로직 */
var guideTitleWrap = document.querySelector('.guide-title-wrapper');
var guideAnimatedTitle = document.getElementById('guide-animated-title');
var guideCenterCard = document.getElementById('guide-center-card');
var guideBottomDock = document.getElementById('guide-bottom-dock');
var guideTypeTimer = null;

function startCaptureGuideCinematicFlow() {
  showScreen('screen-capture-guide');
  clearTimeout(guideTypeTimer);
  
  if (guideTitleWrap) guideTitleWrap.classList.remove('moved-to-top');
  guideAnimatedTitle.innerHTML = "";
  guideCenterCard.classList.remove('revealed');
  guideBottomDock.classList.remove('revealed');

  var introMessage = "고치에서 깨어날 당신의 나비는<br>어떤 모습인가요?";
  var tokens = introMessage.match(/(<[^>]+>|[^<])/g) || [];
  var idx = 0;
  var curText = "";

  function typeNext() {
    if (idx < tokens.length) {
      var char = tokens[idx];
      curText += char;
      guideAnimatedTitle.innerHTML = curText;
      idx++;
      var delay = 90;
      if (char.startsWith('<')) delay = 0;
      else if (char === '?' || char === '.') delay = 400;
      guideTypeTimer = setTimeout(typeNext, delay);
    } else {
      setTimeout(function() {
        if (guideTitleWrap) guideTitleWrap.classList.add('moved-to-top');
        setTimeout(function() {
          guideCenterCard.classList.add('revealed');
          guideBottomDock.classList.add('revealed');
        }, 500);
      }, 350);
    }
  }
  setTimeout(typeNext, 250);
}

var SUPABASE_URL = 'https://djmdzsbfsobsutphragw.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbWR6c2Jmc29ic3V0cGhyYWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4ODQ3NTgsImV4cCI6MjEwNTQ2MDc1OH0.BC7llaSjbq6cYhDlRqrwJaycpQ6gSNcp5LgYBeM6WEM';
var supabase = null;
try {
  if (window.supabase) supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.warn("Supabase 연결 지연:", err);
}

var activeCustomTab = 'wing';
var selectedButterflyShape = 'crescent';
var selectedAntennaType = 'ball';

var butterflyPathData = {};
wingDataset.forEach(function(w) { butterflyPathData[w.id] = w; });

function updateHeroPreview() {
  var heroPathContainer = document.getElementById('hero-path-container');
  if (!heroPathContainer) return;

  var currentWing = butterflyPathData[selectedButterflyShape] || wingDataset[0];
  var ant = antennaDataset.find(function(a) { return a.id === selectedAntennaType; }) || antennaDataset[0];

  var scale = 140 / Math.max(currentWing.w, currentWing.h);
  var offsetX = (160 - currentWing.w * scale) / 2;
  var offsetY = (160 - currentWing.h * scale) / 2;

  var headTargetX = offsetX + (currentWing.headX * scale);
  var headTargetY = offsetY + (currentWing.headY * scale) + 0.4;

  var wingD = currentWing.wingD || currentWing.d;
  var bodyD = currentWing.bodyD || "";

  heroPathContainer.innerHTML = 
    '<defs>' +
      '<mask id="butterfly-outside-mask">' +
        '<rect x="-50" y="-50" width="260" height="260" fill="white"/>' +
        '<g transform="translate(' + offsetX + ', ' + offsetY + ') scale(' + scale + ')">' +
          '<path d="' + wingD + '" fill="black"/>' +
        '</g>' +
      '</mask>' +
    '</defs>' +
    '<rect x="-50" y="-50" width="260" height="260" fill="rgba(0, 0, 0, 0.75)" mask="url(#butterfly-outside-mask)"/>' +
    (bodyD ? '<g transform="translate(' + offsetX + ', ' + offsetY + ') scale(' + scale + ')"><path d="' + bodyD + '" fill="#ffffff"/></g>' : '') +
    '<g transform="translate(' + headTargetX + ', ' + headTargetY + ')" filter="url(#antenna-subtle-contrast)" color="#ffffff">' +
      ant.render(scale * 1.05) +
    '</g>';

  var loadingSvg = document.getElementById('loading-butterfly-svg');
  if (loadingSvg) {
    loadingSvg.setAttribute('viewBox', currentWing.viewBox);
    var loadingPath = document.getElementById('loading-wing-path');
    if (loadingPath) loadingPath.setAttribute('d', currentWing.d);
  }
}

/* 가로 캐러셀 렌더러 */
var carouselContainer = document.getElementById('arch-carousel-container');

function renderCarouselItems() {
  carouselContainer.innerHTML = '';
  if (activeCustomTab === 'wing') {
    wingDataset.forEach(function(w) {
      var isActive = w.id === selectedButterflyShape;
      var div = document.createElement('div');
      div.className = 'arch-track-item';
      div.innerHTML = '<button type="button" class="shape-thumb-btn ' + (isActive ? 'active' : '') + '" data-type="wing" data-id="' + w.id + '"><svg viewBox="' + w.viewBox + '" preserveAspectRatio="xMidYMid meet"><path d="' + w.d + '"/></svg></button><span class="shape-item-label text-[11px] ' + (isActive ? 'font-bold text-white' : 'font-medium text-neutral-500') + ' tracking-tight">' + w.name + '</span>';
      carouselContainer.appendChild(div);
    });
  } else if (activeCustomTab === 'antenna') {
    antennaDataset.forEach(function(a) {
      var isActive = a.id === selectedAntennaType;
      var div = document.createElement('div');
      div.className = 'arch-track-item';
      div.innerHTML = '<button type="button" class="shape-thumb-btn ' + (isActive ? 'active' : '') + '" data-type="antenna" data-id="' + a.id + '"><svg viewBox="-26 -30 52 38" preserveAspectRatio="xMidYMid meet"><g>' + a.render(1.1) + '</g></svg></button><span class="shape-item-label text-[11px] ' + (isActive ? 'font-bold text-white' : 'font-medium text-neutral-500') + ' tracking-tight">' + a.name + '</span>';
      carouselContainer.appendChild(div);
    });
  }

  bindItemClickEvents();
  updateCarouselPadding();
  applyStraightSelection();

  setTimeout(function() {
    var activeBtn = carouselContainer.querySelector('.shape-thumb-btn.active');
    if (activeBtn) snapItemToExactCenter(activeBtn.closest('.arch-track-item'));
  }, 50);
}

function bindItemClickEvents() {
  carouselContainer.querySelectorAll('.shape-thumb-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      setActiveItemVisual(btn);
      snapItemToExactCenter(btn.closest('.arch-track-item'));
    });
  });
}

function updateCarouselPadding() {
  if (!carouselContainer) return;
  var cWidth = carouselContainer.clientWidth;
  var firstItem = carouselContainer.querySelector('.arch-track-item');
  if (firstItem) {
    var itemWidth = firstItem.offsetWidth;
    var pad = Math.max(0, (cWidth - itemWidth) / 2);
    carouselContainer.style.paddingLeft = pad + 'px';
    carouselContainer.style.paddingRight = pad + 'px';
  }
}

function applyStraightSelection() {
  if (!carouselContainer) return;
  var cWidth = carouselContainer.clientWidth;
  var scrollLeft = carouselContainer.scrollLeft;
  var centerX = scrollLeft + (cWidth / 2);
  var items = carouselContainer.querySelectorAll('.arch-track-item');
  var CENTER_THRESHOLD = 36;
  var centerDetectedItem = null;
  var minDistance = Infinity;

  items.forEach(function(item) {
    var itemCenterX = item.offsetLeft + (item.offsetWidth / 2);
    var dist = Math.abs(centerX - itemCenterX);
    if (dist < minDistance) {
      minDistance = dist;
      centerDetectedItem = item;
    }
    item.style.transform = 'none';
    var opacityRatio = Math.max(0.35, 1 - (dist / (cWidth * 0.42)));
    item.style.opacity = opacityRatio.toFixed(2);
  });

  if (centerDetectedItem && minDistance <= CENTER_THRESHOLD) {
    var btn = centerDetectedItem.querySelector('.shape-thumb-btn');
    if (btn && !btn.classList.contains('active')) {
      setActiveItemVisual(btn);
    }
  }
}

function setActiveItemVisual(btn) {
  carouselContainer.querySelectorAll('.shape-thumb-btn').forEach(function(b) {
    b.classList.remove('active');
    var txt = b.parentElement.querySelector('.shape-item-label');
    if (txt) {
      txt.classList.remove('font-bold', 'text-white');
      txt.classList.add('font-medium', 'text-neutral-500');
    }
  });

  btn.classList.add('active');
  var activeTxt = btn.parentElement.querySelector('.shape-item-label');
  if (activeTxt) {
    activeTxt.classList.add('font-bold', 'text-white');
    activeTxt.classList.remove('font-medium', 'text-neutral-500');
  }

  var type = btn.getAttribute('data-type');
  var id = btn.getAttribute('data-id');
  if (type === 'wing') {
    selectedButterflyShape = id;
    drawAlignCanvas();
  } else if (type === 'antenna') {
    selectedAntennaType = id;
  }

  updateHeroPreview();
}

function snapItemToExactCenter(itemElement) {
  if (!carouselContainer || !itemElement) return;
  var cWidth = carouselContainer.clientWidth;
  var itemWidth = itemElement.offsetWidth;
  var targetScroll = itemElement.offsetLeft - ((cWidth - itemWidth) / 2);
  carouselContainer.scrollTo({ left: targetScroll, behavior: 'smooth' });
}

function autoSnapToNearestCenter() {
  if (!carouselContainer) return;
  var cWidth = carouselContainer.clientWidth;
  var scrollLeft = carouselContainer.scrollLeft;
  var centerX = scrollLeft + (cWidth / 2);
  var closestItem = null;
  var minDistance = Infinity;
  var items = carouselContainer.querySelectorAll('.arch-track-item');

  items.forEach(function(item) {
    var itemCenterX = item.offsetLeft + (item.offsetWidth / 2);
    var dist = Math.abs(centerX - itemCenterX);
    if (dist < minDistance) {
      minDistance = dist;
      closestItem = item;
    }
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
    scrollTimer = setTimeout(function() { autoSnapToNearestCenter(); }, 100);
  }, { passive: true });
}

window.addEventListener('resize', function() {
  updateCarouselPadding();
  applyStraightSelection();
});

/* 하단 알약 탭 제어 (날개 | 더듬이 | 흐림도) */
var tabWing = document.getElementById('tab-wing');
var tabAntenna = document.getElementById('tab-antenna');
var tabBlur = document.getElementById('tab-blur');
var shapeTitle = document.getElementById('shape-screen-title');
var shapeDesc = document.getElementById('shape-screen-desc');
var blurSliderBox = document.getElementById('blur-slider-box');
var carouselStage = document.getElementById('carousel-stage');

function switchTab(tabKey) {
  activeCustomTab = tabKey;
  [tabWing, tabAntenna, tabBlur].forEach(function(b) { if (b) b.classList.remove('active-tab'); });

  if (tabKey === 'wing') {
    tabWing.classList.add('active-tab');
    shapeTitle.innerText = "날개 형태 고르기";
    shapeDesc.innerHTML = "<strong class='text-white'>[드래그]</strong> 이동, <strong class='text-white'>[두 손가락 핀치]</strong> 확대/축소";
    if (blurSliderBox) blurSliderBox.classList.add('hidden-slider');
    if (carouselStage) carouselStage.style.display = 'flex';
    renderCarouselItems();
  } else if (tabKey === 'antenna') {
    tabAntenna.classList.add('active-tab');
    shapeTitle.innerText = "더듬이 고르기";
    shapeDesc.innerText = "나비의 감각을 깨울 더듬이 모양을 선택해 주세요.";
    if (blurSliderBox) blurSliderBox.classList.add('hidden-slider');
    if (carouselStage) carouselStage.style.display = 'flex';
    renderCarouselItems();
  } else if (tabKey === 'blur') {
    tabBlur.classList.add('active-tab');
    shapeTitle.innerText = "사진 흐림도 조절";
    shapeDesc.innerText = "슬라이더를 좌우로 움직여 날개 배경의 번짐 정도를 조절해 보세요.";
    if (blurSliderBox) blurSliderBox.classList.remove('hidden-slider');
    if (carouselStage) carouselStage.style.display = 'none';
  }
}

tabWing.addEventListener('click', function() { switchTab('wing'); });
tabAntenna.addEventListener('click', function() { switchTab('antenna'); });
if (tabBlur) tabBlur.addEventListener('click', function() { switchTab('blur'); });

document.getElementById('btn-rephoto-from-shape').addEventListener('click', function() {
  cameraInput.value = '';
  albumInput.value = '';
  startCaptureGuideCinematicFlow();
});

document.getElementById('btn-confirm-shape').addEventListener('click', function() {
  exportAlignedTexture();
  currentStepIdx = 0;
  renderSurveyStep();
  showScreen('screen-survey');
});

/* 🌟 사진 조작 및 슬라이더 (흐림도 실시간 연동 강화) */
var rawImage = new Image();
var alignCanvas = document.getElementById('align-canvas');
var actx = alignCanvas.getContext('2d');
var imgX = 0, imgY = 0, imgScale = 1.0;
var isDragging = false;
var startX = 0, startY = 0;
var startPinchDist = 0, pinchStartScale = 1.0;
var currentExtractedTexture = null;
var currentBlurPx = 0;

var blurSlider = document.getElementById('blur-slider');

function applyBlurValue(val) {
  currentBlurPx = parseFloat(val) || 0;
  drawAlignCanvas();
}

if (blurSlider) {
  blurSlider.addEventListener('input', function(e) {
    applyBlurValue(e.target.value);
  });
  blurSlider.addEventListener('change', function(e) {
    applyBlurValue(e.target.value);
  });
}

function handleFile(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      rawImage = img;
      if (blurSlider) {
        blurSlider.value = 0;
        currentBlurPx = 0;
      }
      initAlignUI();
      showScreen('screen-shape-select');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

var cameraInput = document.getElementById('camera-input');
var albumInput = document.getElementById('album-input');
cameraInput.addEventListener('click', function(e) { e.target.value = null; });
albumInput.addEventListener('click', function(e) { e.target.value = null; });
cameraInput.addEventListener('change', function(e) {
  if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
});
albumInput.addEventListener('change', function(e) {
  if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
});

function initAlignUI() {
  if (!rawImage || !rawImage.width || rawImage.width === 0) return;
  var baseScale = alignCanvas.width / Math.min(rawImage.width, rawImage.height);
  imgScale = baseScale;
  imgX = (alignCanvas.width - rawImage.width * imgScale) / 2;
  imgY = (alignCanvas.height - rawImage.height * imgScale) / 2;
  drawAlignCanvas();
}

function drawAlignCanvas() {
  actx.clearRect(0, 0, alignCanvas.width, alignCanvas.height);
  if (!rawImage || !rawImage.width || rawImage.width === 0) return;

  actx.save();
  if (currentBlurPx > 0) {
    actx.filter = 'blur(' + currentBlurPx + 'px)';
  } else {
    actx.filter = 'none';
  }
  actx.drawImage(rawImage, imgX, imgY, rawImage.width * imgScale, rawImage.height * imgScale);
  actx.restore();
}

var interactiveFrame = document.getElementById('interactive-align-frame');

interactiveFrame.addEventListener('mousedown', function(e) {
  isDragging = true;
  var rect = alignCanvas.getBoundingClientRect();
  var scaleFactor = alignCanvas.width / rect.width;
  startX = (e.clientX - rect.left) * scaleFactor - imgX;
  startY = (e.clientY - rect.top) * scaleFactor - imgY;
});

window.addEventListener('mousemove', function(e) {
  if (!isDragging) return;
  var rect = alignCanvas.getBoundingClientRect();
  var scaleFactor = alignCanvas.width / rect.width;
  imgX = (e.clientX - rect.left) * scaleFactor - startX;
  imgY = (e.clientY - rect.top) * scaleFactor - startY;
  drawAlignCanvas();
});

window.addEventListener('mouseup', function() { isDragging = false; });

interactiveFrame.addEventListener('wheel', function(e) {
  e.preventDefault();
  var zoom = e.deltaY < 0 ? 1.06 : 0.94;
  imgScale *= zoom;
  drawAlignCanvas();
}, { passive: false });

interactiveFrame.addEventListener('touchstart', function(e) {
  var rect = alignCanvas.getBoundingClientRect();
  var scaleFactor = alignCanvas.width / rect.width;
  if (e.touches.length === 1) {
    isDragging = true;
    startX = (e.touches[0].clientX - rect.left) * scaleFactor - imgX;
    startY = (e.touches[0].clientY - rect.top) * scaleFactor - imgY;
  } else if (e.touches.length === 2) {
    isDragging = false;
    startPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    pinchStartScale = imgScale;
  }
}, { passive: false });

window.addEventListener('touchmove', function(e) {
  if (!document.getElementById('screen-shape-select').classList.contains('active')) return;
  var rect = alignCanvas.getBoundingClientRect();
  var scaleFactor = alignCanvas.width / rect.width;
  if (e.touches.length === 1 && isDragging) {
    if (e.cancelable) e.preventDefault();
    imgX = (e.touches[0].clientX - rect.left) * scaleFactor - startX;
    imgY = (e.touches[0].clientY - rect.top) * scaleFactor - startY;
    drawAlignCanvas();
  } else if (e.touches.length === 2 && startPinchDist > 0) {
    if (e.cancelable) e.preventDefault();
    var currentDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    var factor = currentDist / startPinchDist;
    imgScale = pinchStartScale * factor;
    drawAlignCanvas();
  }
}, { passive: false });

window.addEventListener('touchend', function() { isDragging = false; startPinchDist = 0; });

function exportAlignedTexture() {
  var size = 1024;
  var dreamCanvas = document.createElement('canvas');
  dreamCanvas.width = size;
  dreamCanvas.height = size;
  var dctx = dreamCanvas.getContext('2d');
  dctx.fillStyle = "#ffffff";
  dctx.fillRect(0, 0, size, size);

  var scaleRatio = size / alignCanvas.width;
  if (rawImage && rawImage.width) {
    dctx.save();
    if (currentBlurPx > 0) {
      dctx.filter = 'blur(' + (currentBlurPx * scaleRatio) + 'px)';
    }
    dctx.drawImage(rawImage, imgX * scaleRatio, imgY * scaleRatio, rawImage.width * imgScale * scaleRatio, rawImage.height * imgScale * scaleRatio);
    dctx.restore();
  }
  currentExtractedTexture = dreamCanvas.toDataURL('image/jpeg', 0.85);
}

function createFallbackDummyTexture(colorA, colorB) {
  var c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  var ctx = c.getContext('2d');
  var grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, colorA || '#2a5298');
  grad.addColorStop(0.5, '#ffffff');
  grad.addColorStop(1, colorB || '#1e3c72');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(256, 256, 130, 0, Math.PI * 2);
  ctx.fill();
  return c.toDataURL('image/jpeg', 0.85);
}

/* 설문 데이터 및 표시 로직 */
var surveyQuestions = [
  {
    title: "당신은 어떤 나비인가요?",
    desc: "자신을 소개해 주세요. (다중 선택)",
    category: "#나의 고유한 모습",
    options: [
      "야행성", "아침형", "집돌이·집순이", "외향형", "계획파", "즉흥파", "사색가", "행동파", "마이웨이", "눈치러",
      "완벽주의", "단순명쾌", "유리멘탈", "무념무상", "일벌레", "게으른 완벽주의", "벼락치기파", "루틴러", "커피수액러", "산책러",
      "숏폼중독", "미식가", "집콕프로", "바깥바람파", "혼자가 편한", "과묵한 편", "다정다감", "리액션 장인", "경청러", "분위기 메이커",
      "낯가림러", "관찰자", "칼퇴사수형", "프로공감러", "생각 부자", "담담이", "긍정회로", "쿨내진동", "쿠쿠다스", "말랑멘탈",
      "호기심 천국", "느긋이", "조급이", "현실주의자", "낭만주의자", "감성파", "멀티태스커", "한우물파", "아이디어 뱅크", "직진러"
    ]
  },
  {
    title: "고치에서 나온 당신,<br>어떤 여정을 떠날 건가요?",
    desc: "향하고 싶은 방향을 골라주세요. (다중 선택)",
    category: "#향하고 싶은 여정",
    options: [
      "취업 뽀개기", "칼퇴 보장", "자취방 독립", "내 작은 카페", "자격증 합격", "목표 어학 점수", "해외 한 달 살기", "1,000만 원 저축", "내 브랜드 론칭", "숙면 8시간",
      "콘서트 올콘", "운동 습관화", "포트폴리오 완성", "악연 손절", "첫 월급 선물", "창작물 완판", "바다 여행", "완벽주의 탈출", "채널 1만 구독", "면접 당당함",
      "학자금 완납", "좋아하는 일로 밥벌이", "운전면허 드라이브", "온전한 호캉스", "완독 10권", "바디프로필", "나만의 작업실", "타인 시선 무시", "팀 프로젝트 대박", "쿨한 멘탈",
      "내 집 마련 기반", "악기 마스터", "고요한 밤산책", "다정한 연애", "단골 아지트", "집밥 챙겨먹기", "번아웃 브레이크", "거절하는 용기", "내 스타일대로", "워홀·교환학생",
      "매일 셀프 칭찬", "개인 전시·팝업", "수면 패턴 정상화", "공모전 수상", "대범한 배짱", "주말 카페 멍때리기", "가족 여행 보내기", "하루 종일 넷플릭스", "비교 끊기", "그냥 오늘 행복"
    ]
  },
  {
    title: "긴 여정을 위해<br>챙겨가야 할 것은?",
    desc: "비행 동안 나비가 품고 갈 마음을 골라주세요. (다중 선택)",
    category: "#품고 날아갈 마음",
    options: [
      "흔들려도 그냥 둠", "남 눈치 안 보고 멍때림", "망해도 별일 아니라고 넘김", "내 속도대로 천천히 감", "할 만큼 했다고 인정함", "억지로 애쓰지 않음", "싫은 건 싫다고 생각함", "오늘 하루만 버텨봄", "완벽하지 않아도 만족함", "혼자만의 침묵을 즐김",
      "남의 말 한 귀로 흘림", "당장 답을 찾지 않음", "아무 계획 없이 흘러감", "내 감정에 솔직해짐", "쉬는 것에 당당해짐", "안 되는 건 쿨하게 포기함", "넘어져도 급하게 안 일어남", "나를 가장 먼저 챙김", "작은 틈을 내어 숨을 쉼", "그때그때 마음 가는 대로 함",
      "타인의 기대에서 한 발 물러섬", "서두르지 않는 뻔뻔함", "실수해도 씩씩하게 웃기", "지금 이대로 충분하다는 안도", "세상 참견 차단하기", "실패를 경험으로 치기", "내 선택을 끝까지 믿기", "억지 인연 붙잡지 않기", "감정 기복에 휘둘리지 않기", "나만의 속도 존중하기",
      "작은 일에 일희일비 안 하기", "거절 앞에 당당해지기", "지나간 일 곱씹지 않기", "타인과의 비교 단호히 끊기", "힘 빼고 유연하게 살기", "있는 그대로의 나 사랑하기", "번아웃 전에 먼저 멈추기", "단단한 자기 확신 갖기", "굳이 설명하지 않는 대범함", "안 풀릴 땐 일단 자고 보기",
      "세상 기준에 나를 맞추지 않기", "사소한 즐거움 먼저 찾기", "묵묵히 내 보폭 유지하기", "미움받을 약간의 용기", "쓸데없는 자책 지우기", "혼자만의 시간 지켜내기", "무리한 부탁 딱 자르기", "앞날을 기대하는 설렘", "어떤 순간에도 자책하지 않기", "그냥 오늘 하루 즐기기"
    ]
  },
  {
    title: "비행 중 마주친 나의 천적은?",
    desc: "날갯짓을 가로막는 것은 무엇일까요? (다중 선택)",
    category: "#마주친 마음의 천적",
    options: [
      "비교중독", "만성 피로", "텅 빈 잔고", "완벽주의 강박", "미래 막막함", "거절 공포", "지나간 후회", "가면 증후군", "스마트폰 중독", "결정 장애",
      "눈치 보기", "벼락치기 습관", "타인 인정 욕구", "번아웃 무기력", "억지 미소", "취업 압박감", "수면 부족", "실패 공포증", "잦은 감정 기복", "뒤처짐 조급함",
      "고립감과 외로움", "쓸데없는 잡생각", "꼰대와 갑질", "자책과 자기 비하", "억지 인연 유지", "학점·스펙 압박", "충동구매 후회", "시작의 두려움", "단톡방 알림 감옥", "과도한 책임감",
      "부모님 잔소리", "과열된 머릿속", "애매한 재능", "만성 무기력", "타인의 무례함", "겉도는 관계", "질투와 열등감", "끝없는 미루기", "건강 악화", "타인의 오해",
      "월세·생활비 압박", "도파민 중독", "좁아진 시야", "낮은 자존감", "겉만 번지르르함", "감정 쓰레기통 역할", "무리한 부탁", "고립된 혼밥", "흐려진 목표", "그냥 온갖 귀찮음"
    ]
  },
  {
    title: "그 천적을 맞닥뜨렸을 때,<br>어떻게 맞설 건가요?",
    desc: "비장의 한 수를 골라주세요. (다중 선택)",
    category: "#나만의 비장의 한 수",
    options: [
      '"어쩌라고" 마인드', "일단 푹 자기", "칼같은 단호함", "한 귀로 흘리기", "연락 차단 모드", "뻔뻔한 배짱", '"그럴 수 있지"', "빠른 손절", "나만의 속도", "미련 없는 포기",
      "쿨한 넘김", "거절하는 용기", "침묵의 멍때리기", "스스로 토닥이기", "당당한 마이웨이", "무반응과 무관심", "셀프 칭찬", "혼자만의 고요", "딴청 피우기", "근거 없는 자신감",
      "할 말은 하기", "맛있는 한 끼", "단단한 자기 확신", "일희일비 안 하기", "억지 웃음 멈추기", "타인 기대 던지기", "내 보폭 지키기", "씩씩한 리셋", "망해도 고(Go)", "즉각 브레이크",
      "시선 차단 선글라스", "감정 분리하기", "지나간 일 잊기", "힘 빼고 유연함", "눈치 안 보기", "있는 그대로 긍정", "선 긋기", "방어막 치기", "소신 지키기", "작은 일탈",
      "유쾌한 무시", "대범한 무덤덤함", "질문 가볍게 넘기기", "내 기분 우선", "무리한 부탁 쳐내기", "혼밥의 자유", "심호흡 한 번", "비교 스위치 끄기", "굳은살 멘탈", "그냥 오늘 하루 즐기기"
    ]
  },
  {
    title: "나비에게 전하고 싶은 한마디는?",
    desc: "먼 훗날 다시 마주할 나비에게 건넬 응원을 남겨주세요."
  },
  {
    title: "먼 하늘 너울 속으로 날아오를 나비의 이름은?",
    desc: "나비에게 고유한 이름을 붙여주세요."
  }
];

var userSelections = {
  q1: [], q2: [], q3: [], q4: [], q5: [],
  q6_memo: "",
  q7_name: ""
};

var currentStepIdx = 0;

function buildAdaptiveVerticalRows(items) {
  var rows = [];
  var i = 0;
  while (i < items.length) {
    var targetCount = 3;
    var candidate = items.slice(i, i + targetCount);
    var totalChars = candidate.reduce(function(sum, word) { return sum + word.length; }, 0);
    if (totalChars > 12 && candidate.length > 2) targetCount = 2;
    var actualRow = items.slice(i, i + targetCount);
    rows.push(actualRow);
    i += actualRow.length;
  }
  return rows;
}

var elTitle = document.getElementById('question-title');
var elDesc = document.getElementById('question-desc');
var elProgressBar = document.getElementById('progress-bar');
var surveyChipWrapper = document.getElementById('survey-chip-wrapper');
var elOrganicContainer = document.getElementById('organic-chip-container');
var elField6 = document.getElementById('field-step-6');
var elField7 = document.getElementById('field-step-7');
var btnSurveyNext = document.getElementById('btn-survey-next');
var btnSurveyPrev = document.getElementById('btn-survey-prev');
var inputQ6Memo = document.getElementById('input-q6-memo');
var memoCounter = document.getElementById('memo-counter');
var inputQ7Name = document.getElementById('input-q7-name');
var charCounter = document.getElementById('char-counter');

var surveyTitleTypeTimer = null;

function typeWriterSurveyTitle(titleHtml) {
  clearTimeout(surveyTitleTypeTimer);
  elTitle.innerHTML = "";
  var tokens = titleHtml.match(/(<[^>]+>|[^<])/g) || [];
  var idx = 0;
  var currentContent = "";

  function nextChar() {
    if (idx < tokens.length) {
      var char = tokens[idx];
      currentContent += char;
      elTitle.innerHTML = currentContent;
      idx++;
      var delay = 85;
      if (char.startsWith('<')) delay = 0;
      else if (char === '?' || char === '.') delay = 350;
      else if (char === ',') delay = 200;
      surveyTitleTypeTimer = setTimeout(nextChar, delay);
    }
  }
  nextChar();
}

function renderSurveyStep() {
  var q = surveyQuestions[currentStepIdx];
  typeWriterSurveyTitle(q.title);
  elDesc.innerHTML = q.desc;
  
  elProgressBar.style.width = (((currentStepIdx + 1) / 7) * 100) + '%';

  btnSurveyPrev.classList.toggle('invisible', currentStepIdx === 0);
  btnSurveyNext.innerText = currentStepIdx === 6 ? "완성된 나비 만나기" : "다음 질문으로";

  if (currentStepIdx < 5) {
    surveyChipWrapper.classList.remove('hidden');
    elField6.classList.add('hidden');
    elField6.classList.remove('flex');
    elField7.classList.add('hidden');
    elField7.classList.remove('flex');
    renderVerticalScrollChips();
  } else if (currentStepIdx === 5) {
    surveyChipWrapper.classList.add('hidden');
    elField6.classList.remove('hidden');
    elField6.classList.add('flex');
    elField7.classList.add('hidden');
    elField7.classList.remove('flex');
  } else {
    surveyChipWrapper.classList.add('hidden');
    elField6.classList.add('hidden');
    elField6.classList.remove('flex');
    elField7.classList.remove('hidden');
    elField7.classList.add('flex');
  }

  validateSurveyStep();
  updateDevScreenBadge();
}

function updateChipStyle(chip, isSelected) {
  if (isSelected) {
    chip.classList.remove('chip-unselected');
    chip.classList.add('chip-selected');
    chip.style.setProperty('background', '#ffffff', 'important');
    chip.style.setProperty('border', 'none', 'important');
    chip.style.setProperty('color', '#000000', 'important');
    chip.style.setProperty('font-weight', '700', 'important');
    chip.style.setProperty('box-shadow', '0 0 18px 2px rgba(255, 255, 255, 0.5)', 'important');
  } else {
    chip.classList.remove('chip-selected');
    chip.classList.add('chip-unselected');
    chip.style.setProperty('background', 'rgba(255, 255, 255, 0.08)', 'important');
    chip.style.setProperty('border', '1px solid rgba(255, 255, 255, 0.14)', 'important');
    chip.style.setProperty('color', '#a3a3a3', 'important');
    chip.style.setProperty('font-weight', '500', 'important');
    chip.style.setProperty('box-shadow', 'none', 'important');
  }
}

function renderVerticalScrollChips() {
  var q = surveyQuestions[currentStepIdx];
  var allOptions = q.options || [];
  var rows = buildAdaptiveVerticalRows(allOptions);
  var stateKey = 'q' + (currentStepIdx + 1);

  elOrganicContainer.innerHTML = '';
  surveyChipWrapper.scrollTop = 0;

  rows.forEach(function(rowItems) {
    var rowDiv = document.createElement('div');
    rowDiv.className = 'flex items-center justify-center gap-1.5 w-full';

    rowItems.forEach(function(item) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip-base';
      chip.innerText = item;
      var isSelected = userSelections[stateKey].indexOf(item) > -1;
      updateChipStyle(chip, isSelected);

      chip.addEventListener('click', function() {
        var idx = userSelections[stateKey].indexOf(item);
        var nextState = false;
        if (idx > -1) {
          userSelections[stateKey].splice(idx, 1);
          nextState = false;
        } else {
          userSelections[stateKey].push(item);
          nextState = true;
        }
        updateChipStyle(chip, nextState);
        validateSurveyStep();
      });
      rowDiv.appendChild(chip);
    });
    elOrganicContainer.appendChild(rowDiv);
  });
}

function validateSurveyStep() {
  var isValid = false;
  if (currentStepIdx === 0) isValid = userSelections.q1.length > 0;
  else if (currentStepIdx === 1) isValid = userSelections.q2.length > 0;
  else if (currentStepIdx === 2) isValid = userSelections.q3.length > 0;
  else if (currentStepIdx === 3) isValid = userSelections.q4.length > 0;
  else if (currentStepIdx === 4) isValid = userSelections.q5.length > 0;
  else if (currentStepIdx === 5) isValid = true;
  else if (currentStepIdx === 6) isValid = userSelections.q7_name.trim().length > 0;
  btnSurveyNext.disabled = !isValid;
}

inputQ6Memo.addEventListener('input', function(e) {
  userSelections.q6_memo = e.target.value;
  memoCounter.innerText = e.target.value.length + '/50';
  validateSurveyStep();
});

inputQ7Name.addEventListener('input', function(e) {
  userSelections.q7_name = e.target.value.trim();
  charCounter.innerText = e.target.value.length + '/10';
  validateSurveyStep();
});

var showcaseInterval = null;

/* 🌟 1번 사진 수정사항 완벽 반영: 상단 텍스트 및 영문 문구 삭제, 본문 문구 수정, 나비 확대 */
function startAnswerShowcaseSequence() {
  if (showcaseInterval) {
    clearInterval(showcaseInterval);
    showcaseInterval = null;
  }

  var showcaseCard = document.getElementById('showcase-card');
  var showcaseCategory = document.getElementById('showcase-category');
  var showcaseAnswers = document.getElementById('showcase-answers');
  var progressBar = document.getElementById('generation-progress-bar');
  var stepDots = document.querySelectorAll('.step-dot');
  var loadingSvg = document.getElementById('loading-butterfly-svg');
  var blackCurtain = document.getElementById('cinematic-black-curtain');
  var whiteFlash = document.getElementById('cinematic-white-flash');
  var mainTitle = document.getElementById('loading-main-title');
  var subDesc = document.getElementById('loading-sub-desc');

  var butterflyName = userSelections.q7_name ? userSelections.q7_name.trim() : "나비";

  var steps = [
    { key: 'q1', category: '#나의 고유한 모습', fallback: ["차분한", "나만의 속도"] },
    { key: 'q2', category: '#향하고 싶은 여정', fallback: ["자유로운 비행", "나만의 작업실"] },
    { key: 'q3', category: '#품고 날아갈 마음', fallback: ["단단한 자기 확신", "서두르지 않기"] },
    { key: 'q4', category: '#마주친 마음의 천적', fallback: ["비교와 조급함", "번아웃 무기력"] },
    { key: 'q5', category: '#나만의 비장의 한 수', fallback: ["유연한 태도", "그냥 오늘 하루 즐기기"] },
    { isFinal: true, category: '#마침내 깨어난 날갯짓', name: butterflyName }
  ];

  var currentShowcaseIdx = 0;
  var totalSteps = steps.length;
  var stepDuration = 5000;

  function renderStep(idx) {
    var item = steps[idx];
    showcaseCard.classList.remove('visible-state');
    showcaseCard.classList.add('hidden-state');

    setTimeout(function() {
      showcaseCategory.innerText = item.category;

      if (item.isFinal) {
        if (blackCurtain) blackCurtain.classList.add('fade-active');
        
        // 🌟 1번 사진 요청사항: 상단 텍스트 완전 제거
        if (mainTitle) {
          mainTitle.innerHTML = '';
          mainTitle.style.display = 'none';
        }
        if (subDesc) {
          subDesc.innerText = '';
          subDesc.style.display = 'none';
        }

        // 🌟 1번 사진 요청사항: 중앙 나비 크기 대폭 확대 (w-36 h-36)
        if (loadingSvg) {
          loadingSvg.classList.remove('text-white', 'w-20', 'h-20');
          loadingSvg.classList.add('w-36', 'h-36', 'scale-110');
          loadingSvg.style.filter = "drop-shadow(0 0 45px rgba(255, 255, 255, 1))";
        }

        // 🌟 1번 사진 요청사항: 영문 SOUL AWAKENING 삭제, '이제 마음 깊은 곳에서 숨쉬던' 삭제
        showcaseAnswers.innerHTML = '<div class="py-2 px-2 text-center w-full space-y-2"><p class="text-[1.12rem] font-bold text-white leading-relaxed break-keep drop-shadow-lg"><strong class="text-white font-extrabold underline decoration-white/40 underline-offset-4">‘' + item.name + '’</strong>(이)가<br>찬란한 빛의 날개를 펴고 깨어납니다.</p></div>';
      } else {
        var answers = (userSelections[item.key] && userSelections[item.key].length > 0) 
                        ? userSelections[item.key] 
                        : item.fallback;
        showcaseAnswers.innerHTML = answers.map(function(ans) {
          return '<span class="px-3.5 py-1.5 rounded-full bg-white/20 border border-white/30 text-white font-semibold text-xs tracking-tight shadow-sm">' + ans + '</span>';
        }).join('');
      }

      stepDots.forEach(function(dot, dIdx) {
        if (dIdx === idx) {
          dot.classList.remove('bg-white/30');
          dot.classList.add('bg-white', 'scale-125');
        } else {
          dot.classList.remove('bg-white', 'scale-125');
          dot.classList.add('bg-white/30');
        }
      });

      var percent = Math.min(100, Math.round(((idx + 1) / totalSteps) * 100));
      if (progressBar) progressBar.style.width = percent + '%';

      showcaseCard.classList.remove('hidden-state');
      showcaseCard.classList.add('visible-state');
    }, 400);
  }

  renderStep(0);

  showcaseInterval = setInterval(function() {
    currentShowcaseIdx++;
    if (currentShowcaseIdx < totalSteps) {
      renderStep(currentShowcaseIdx);
    } else {
      clearInterval(showcaseInterval);
      showcaseInterval = null;
      setTimeout(function() {
        if (whiteFlash) whiteFlash.classList.add('flash-active');
        setTimeout(function() {
          var nameHeader = document.getElementById('preview-butterfly-name');
          if (nameHeader) nameHeader.innerText = '‘' + butterflyName + '’';
          showScreen('screen-preview');
          initFullButterflyViewer(currentExtractedTexture || createFallbackDummyTexture());
          setTimeout(function() {
            if (whiteFlash) whiteFlash.classList.remove('flash-active');
          }, 450);
        }, 650);
      }, 4600);
    }
  }, stepDuration);
}

btnSurveyNext.addEventListener('click', function() {
  if (currentStepIdx < 6) {
    currentStepIdx++;
    renderSurveyStep();
  } else {
    showScreen('screen-loading');
    startAnswerShowcaseSequence();
  }
});

btnSurveyPrev.addEventListener('click', function() {
  if (currentStepIdx > 0) {
    currentStepIdx--;
    renderSurveyStep();
  }
});

/* 3D 엔진 : Three.js 뷰어 */
var fullScene, fullCamera, fullRenderer, fullGroup;
var leftWingMesh, rightWingMesh, antennaMesh;
var isFlyingAway = false, touchStartY = 0;
var animFrameId = null;

var initialRotL = { x: 0, y: 0, z: 0 };
var initialRotR = { x: 0, y: 0, z: 0 };

async function saveButterflyToSupabase() {
  try {
    if (!supabase) return;
    await supabase
      .from('butterflies')
      .insert([
        {
          name: userSelections.q7_name || '이름없는 나비',
          wing_shape: selectedButterflyShape,
          antenna_type: selectedAntennaType,
          q1: userSelections.q1,
          q2: userSelections.q2,
          q3: userSelections.q3,
          q4: userSelections.q4,
          q5: userSelections.q5,
          memo: userSelections.q6_memo || '',
          revisit_date: null,
          email: null,
          texture_url: currentExtractedTexture
        }
      ]);
  } catch (err) {
    console.error("Supabase 연동 에러:", err);
  }
}

/* 🌟 2번 사진 수정사항 반영:
   1) 날개: MeshBasicMaterial로 음영 경계선 완전 제거
   2) 몸통/더듬이: MeshStandardMaterial로 입체 음영 적용
   3) 뒤쪽 후광: 텍스처 노이즈(RGB 픽셀 점) 유발하던 Three.js 스프라이트를 제거하고 클린 CSS 후광 연동
*/
function initFullButterflyViewer(textureURL) {
  var container = document.getElementById('three-container');
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  container.innerHTML = '';

  var width = window.innerWidth;
  var height = window.innerHeight;

  fullScene = new THREE.Scene();
  fullCamera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
  fullCamera.position.set(0, 0, 8.8);
  fullCamera.lookAt(0, 0, 0);

  fullRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  fullRenderer.setSize(width, height);
  fullRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(fullRenderer.domElement);

  // 몸통과 더듬이에 입체감을 주기 위한 조명
  var ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  fullScene.add(ambientLight);
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(0, 5, 10);
  fullScene.add(dirLight);

  var textureLoader = new THREE.TextureLoader();
  var userTexture = textureLoader.load(textureURL);
  userTexture.flipY = false;

  fullGroup = new THREE.Group();

  // 🌟 [핵심] 날개: 빛/그림자 계산을 받지 않아 펄럭일 때 음영 경계선이 안 생김!
  var wingMat = new THREE.MeshBasicMaterial({
    map: userTexture,
    side: THREE.DoubleSide
  });

  // 🌟 [핵심] 몸통 및 더듬이: 조명 음영이 들어가는 PBR 재질 적용
  var whiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    roughness: 0.35,
    metalness: 0.0
  });

  var modelPath = '3DButterfly/' + selectedButterflyShape + '.glb';
  var targetAntennaPrefix = 'Antenna_' + selectedAntennaType;

  var gltfLoader = new THREE.GLTFLoader();
  gltfLoader.load(modelPath, function(gltf) {
    var model = gltf.scene;

    leftWingMesh = null;
    rightWingMesh = null;
    antennaMesh = null;

    model.traverse(function(child) {
      if (child.isMesh) {
        var name = child.name;
        if (name.startsWith('Wing_L')) {
          leftWingMesh = child;
          child.material = wingMat;
          initialRotL = { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z };
        } else if (name.startsWith('Wing_R')) {
          rightWingMesh = child;
          child.material = wingMat;
          initialRotR = { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z };
        } 
        else if (name.startsWith('Body')) {
          child.material = whiteMat;
        } 
        else if (name.startsWith('Antenna_')) {
          child.material = whiteMat;
          if (name.startsWith(targetAntennaPrefix)) {
            child.visible = true;
            antennaMesh = child;
          } else {
            child.visible = false;
          }
        }
      }
    });

    model.scale.set(0.9, 0.9, 0.9);
    model.rotation.x = 0;
    model.position.set(0, 0, 0);

    fullGroup.add(model);
  }, undefined, function(err) {
    console.error(modelPath + " 로드 오류:", err);
  });

  fullGroup.position.set(0, 0, 0);
  fullScene.add(fullGroup);

  var clock = new THREE.Clock();
  function animate() {
    animFrameId = requestAnimationFrame(animate);
    var time = clock.getElapsedTime();

    var flapSpeed = (!isFlyingAway) ? 5.2 : 22.0;
    var flapIntensity = (!isFlyingAway) ? 0.48 : 0.72;
    var flapAngle = Math.sin(time * flapSpeed) * flapIntensity;

    if (leftWingMesh && rightWingMesh) {
      leftWingMesh.rotation.y = initialRotL.y + flapAngle;
      rightWingMesh.rotation.y = initialRotR.y - flapAngle;
      leftWingMesh.rotation.z = initialRotL.z;
      rightWingMesh.rotation.z = initialRotR.z;
    }

    if (!isFlyingAway) {
      fullGroup.position.y = Math.sin(time * 1.8) * 0.12;
    } else {
      fullGroup.position.y += 0.16;
      fullGroup.position.z -= 0.08;

      if (fullGroup.position.y > 9.0) {
        saveButterflyToSupabase();
        var completeDesc = document.getElementById('complete-desc');
        if (completeDesc) {
          completeDesc.innerHTML = '<strong>‘' + (userSelections.q7_name || "나비") + '’</strong>(이)가 빛의 날개를 펴고 너울 속으로 합류했습니다.';
        }
        showScreen('screen-complete');
        isFlyingAway = false;
      }
    }
    fullRenderer.render(fullScene, fullCamera);
  }
  animate();

  bindSwipeEvents(container);
}

function bindSwipeEvents(targetEl) {
  targetEl.addEventListener('touchstart', function(e) {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  targetEl.addEventListener('touchend', function(e) {
    var deltaY = touchStartY - e.changedTouches[0].clientY;
    if (deltaY > 50 && !isFlyingAway) isFlyingAway = true;
  }, { passive: true });

  var isMouseDown = false;
  targetEl.addEventListener('mousedown', function(e) {
    isMouseDown = true;
    touchStartY = e.clientY;
  });
  targetEl.addEventListener('mouseup', function(e) {
    if (!isMouseDown) return;
    isMouseDown = false;
    if ((touchStartY - e.clientY) > 50 && !isFlyingAway) isFlyingAway = true;
  });
}

/* ==========================================================================
   🌟 나비 둘러보기 박제 전시관 로직
   ========================================================================== */

var specimenButterfliesData = [
  { 
    id: 1, name: "윤슬", wingId: "crescent", antId: "crescent", x: 190, y: 220, scale: 2.10,
    tags: ["야행성", "사색가", "자유로운 비행", "단단한 자기 확신", "나만의 속도", "사소한 즐거움"],
    memo: "잔잔한 물결 위로 부서지는 햇살처럼 늘 반짝이기를.",
    date: "2026. 10. 24"
  },
  { 
    id: 2, name: "칼퇴기원", wingId: "ember", antId: "ball", x: 490, y: 180, scale: 1.05,
    tags: ["칼퇴사수형", "쿨내진동", "칼퇴 보장", '"어쩌라고" 마인드', "빠른 손절"],
    memo: "오늘 하루도 버텨낸 나 자신, 정시 퇴근의 자유를 누려라!",
    date: "2026. 10. 25"
  },
  { 
    id: 3, name: "바람결", wingId: "petal", antId: "star", x: 710, y: 200, scale: 1.45,
    tags: ["산책러", "낭만주의자", "바다 여행", "내 속도대로 천천히 감", "심호흡 한 번"],
    memo: "불어오는 바람에 모든 걱정을 실어 날려 보내자.",
    date: "2026. 11. 02"
  },
  { 
    id: 4, name: "다정", wingId: "wave-fin", antId: "ball", x: 350, y: 440, scale: 1.10,
    tags: ["다정다감", "프로공감러", "다정한 연애", "스스로 토닥이기", "온전한 호캉스"],
    memo: "세상에 다정한 온기를 건네는 존재이기를.",
    date: "2026. 10. 28"
  },
  { 
    id: 5, name: "시온", wingId: "moon-halo", antId: "crescent", x: 610, y: 460, scale: 2.20,
    tags: ["완벽주의", "단단한 자기 확신", "나만의 작업실", "소신 지키기", "있는 그대로 긍정"],
    memo: "어둠이 깊을수록 나의 빛은 더욱 선명해질 거야.",
    date: "2026. 11. 10"
  },
  { 
    id: 6, name: "새벽별", wingId: "dawn-ray", antId: "star", x: 160, y: 720, scale: 0.95,
    tags: ["야행성", "아이디어 뱅크", "창작물 완판", "앞날을 기대하는 설렘"],
    memo: "새벽 공기 속에 피어난 꿈들을 마침내 현실로 이뤄내길.",
    date: "2026. 10. 30"
  },
  { 
    id: 7, name: "온기", wingId: "starlight", antId: "ball", x: 440, y: 730, scale: 1.75,
    tags: ["경청러", "담담이", "있는 그대로의 나 사랑하기", "심호흡 한 번", "단골 아지트"],
    memo: "추운 계절이 지나면 반드시 따스한 봄날이 찾아올 거야.",
    date: "2026. 11. 15"
  },
  { 
    id: 8, name: "달그림자", wingId: "crescent", antId: "star", x: 700, y: 750, scale: 1.15,
    tags: ["혼자가 편한", "과묵한 편", "고요한 밤산책", "혼자만의 침묵을 즐김"],
    memo: "말없이 곁을 지켜주는 달빛처럼 고요하게 머물다 가길.",
    date: "2026. 10. 29"
  },
  { 
    id: 9, name: "초록비", wingId: "petal", antId: "crescent", x: 260, y: 1040, scale: 1.85,
    tags: ["감성파", "루틴러", "자취방 독립", "작은 틈을 내어 숨을 쉼", "집밥 챙겨먹기"],
    memo: "메마른 마음에 촉촉한 단비가 내리듯 평온하기를.",
    date: "2026. 11. 05"
  },
  { 
    id: 10, name: "너울", wingId: "wave-fin", antId: "star", x: 600, y: 1050, scale: 1.25,
    tags: ["분위기 메이커", "직진러", "그냥 오늘 행복", "그냥 오늘 하루 즐기기", "씩씩한 리셋"],
    memo: "수많은 작은 날갯짓이 모여 만들어낼 찬란한 너울의 파도.",
    date: "2026. 11. 20"
  }
];

var galleryViewport = document.getElementById('gallery-pan-viewport');
var specimenBoard = document.getElementById('gallery-specimen-board');
var specimenContainer = document.getElementById('specimen-items-container');

var panX = -170, panY = -10;
var isPanning = false;
var panStartX = 0, panStartY = 0;

function initSpecimenGallery() {
  if (!specimenContainer) return;
  specimenContainer.innerHTML = '';

  clampPanPosition();
  applySpecimenBoardTransform();

  specimenButterfliesData.forEach(function(item) {
    var wing = butterflyPathData[item.wingId] || wingDataset[0];
    var ant = antennaDataset.find(function(a) { return a.id === item.antId; }) || antennaDataset[0];

    var card = document.createElement('div');
    card.className = 'specimen-card-item';
    card.style.left = item.x + 'px';
    card.style.top = item.y + 'px';
    card.style.transform = 'translate(-50%, -50%) scale(' + item.scale + ')';

    var scaleRatio = 110 / Math.max(wing.w, wing.h);
    
    card.innerHTML = 
      '<div class="specimen-butterfly-wrap">' +
        '<div class="specimen-pin-head"></div>' +
        '<svg class="specimen-shadow-drop" width="130" height="110" viewBox="0 0 ' + wing.w + ' ' + wing.h + '" style="overflow: visible;">' +
          '<path d="' + wing.d + '" fill="#ffffff" stroke="none"/>' +
          '<g transform="translate(' + wing.headX + ',' + wing.headY + ')" color="#ffffff">' +
            ant.render(scaleRatio * 0.95) +
          '</g>' +
        '</svg>' +
      '</div>' +
      '<div class="specimen-pill-label">' +
        '<span class="label-text">' + item.name + '</span>' +
      '</div>';

    card.addEventListener('click', function(e) {
      e.stopPropagation();
      openSpecimen3DModal(item, createFallbackDummyTexture('#ffffff', '#e0e0e0'));
    });

    specimenContainer.appendChild(card);
  });

  bindGalleryPanEvents();
}

function clampPanPosition() {
  if (!galleryViewport || !specimenBoard) return;
  var vpW = galleryViewport.clientWidth;
  var vpH = galleryViewport.clientHeight;
  var boardW = 860;
  var boardH = 1320;

  var minX = vpW - boardW;
  var maxX = 0;
  var minY = vpH - boardH;
  var maxY = 0;

  panX = Math.min(maxX, Math.max(minX, panX));
  panY = Math.min(maxY, Math.max(minY, panY));
}

function applySpecimenBoardTransform() {
  if (!specimenBoard) return;
  specimenBoard.style.transform = 'translate3d(' + panX + 'px, ' + panY + 'px, 0)';
}

function bindGalleryPanEvents() {
  if (!galleryViewport) return;

  function onPointerDown(clientX, clientY) {
    isPanning = true;
    panStartX = clientX - panX;
    panStartY = clientY - panY;
  }

  function onPointerMove(clientX, clientY) {
    if (!isPanning) return;
    panX = clientX - panStartX;
    panY = clientY - panStartY;
    clampPanPosition();
    applySpecimenBoardTransform();
  }

  function onPointerUp() {
    isPanning = false;
  }

  galleryViewport.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  window.addEventListener('touchmove', function(e) {
    if (isPanning && e.touches.length === 1) onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  window.addEventListener('touchend', onPointerUp, { passive: true });

  galleryViewport.addEventListener('mousedown', function(e) {
    onPointerDown(e.clientX, e.clientY);
  });
  window.addEventListener('mousemove', function(e) {
    if (isPanning) onPointerMove(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', onPointerUp);
}

// 3D 모달
var modalThreeScene, modalThreeCamera, modalThreeRenderer;
var modalWingL, modalWingR;
var modalAnimFrameId = null;

function openSpecimen3DModal(item, textureUrl) {
  var modal = document.getElementById('specimen-detail-modal');
  var nameEl = document.getElementById('modal-butterfly-name');
  var tagsEl = document.getElementById('modal-specimen-tags');
  var memoEl = document.getElementById('modal-specimen-memo');
  var dateEl = document.getElementById('modal-specimen-date');
  var container = document.getElementById('specimen-three-container');

  nameEl.innerText = '‘' + item.name + '’';
  
  if (tagsEl) {
    var tags = item.tags || ["사색가", "자유로운 비행", "단단한 자기 확신"];
    tagsEl.innerHTML = tags.map(function(t) {
      return '<span class="specimen-glass-pill">#' + t + '</span>';
    }).join('');
  }

  if (memoEl) {
    memoEl.innerText = item.memo ? ('"' + item.memo + '"') : '"천천히 가도 괜찮아. 어둠 속에서도 너만의 고유한 빛이 있으니까."';
  }

  if (dateEl) {
    dateEl.innerText = item.date || "2026. 10. 24";
  }

  modal.classList.remove('hidden');

  container.innerHTML = '';
  if (modalAnimFrameId) {
    cancelAnimationFrame(modalAnimFrameId);
    modalAnimFrameId = null;
  }

  var w = container.clientWidth || 320;
  var h = container.clientHeight || 210;

  modalThreeScene = new THREE.Scene();
  modalThreeCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
  modalThreeCamera.position.set(0, 0, 7.3);
  modalThreeCamera.lookAt(0, -0.35, 0);

  modalThreeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  modalThreeRenderer.setSize(w, h);
  modalThreeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(modalThreeRenderer.domElement);

  var amb = new THREE.AmbientLight(0xffffff, 0.95);
  modalThreeScene.add(amb);
  var dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(0, 5, 8);
  modalThreeScene.add(dir);

  var tex = new THREE.TextureLoader().load(textureUrl);
  tex.flipY = false;

  var wingMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.3 });

  var targetAntennaPrefix = 'Antenna_' + item.antId;
  var modelPath = '3DButterfly/' + (item.wingId || 'crescent') + '.glb';
  var group = new THREE.Group();

  new THREE.GLTFLoader().load(modelPath, function(gltf) {
    var model = gltf.scene;
    modalWingL = null; modalWingR = null;

    model.traverse(function(child) {
      if (child.isMesh) {
        var name = child.name;
        if (name.startsWith('Wing_L')) {
          modalWingL = child; child.material = wingMat;
        } else if (name.startsWith('Wing_R')) {
          modalWingR = child; child.material = wingMat;
        } else if (name.startsWith('Body')) {
          child.material = whiteMat;
        } else if (name.startsWith('Antenna_')) {
          child.material = whiteMat;
          child.visible = name.startsWith(targetAntennaPrefix);
        }
      }
    });

    model.scale.set(0.88, 0.88, 0.88);
    model.position.set(0, -0.35, 0);
    group.add(model);
  }, undefined, function(err) {
    console.error("모달 3D 모델 로드 오류:", err);
  });

  modalThreeScene.add(group);

  var clock = new THREE.Clock();
  function modalAnimate() {
    modalAnimFrameId = requestAnimationFrame(modalAnimate);
    var t = clock.getElapsedTime();
    var flap = Math.sin(t * 6.5) * 0.45;

    if (modalWingL && modalWingR) {
      modalWingL.rotation.y = flap;
      modalWingR.rotation.y = -flap;
    }
    group.rotation.y = Math.sin(t * 0.8) * 0.35;
    group.position.y = -0.35 + Math.sin(t * 2.0) * 0.08;

    modalThreeRenderer.render(modalThreeScene, modalThreeCamera);
  }
  modalAnimate();
}

document.getElementById('btn-close-specimen-modal').addEventListener('click', function() {
  var modal = document.getElementById('specimen-detail-modal');
  modal.classList.add('hidden');
  if (modalAnimFrameId) {
    cancelAnimationFrame(modalAnimFrameId);
    modalAnimFrameId = null;
  }
});

function updateDevScreenBadge() {
  var badge = document.getElementById('dev-current-screen-badge');
  if (!badge) return;
  var activeScreen = document.querySelector('.screen.active');
  var name = activeScreen ? activeScreen.id : 'none';
  if (name === 'screen-survey') name += ' (문항 ' + (currentStepIdx + 1) + '/7)';
  badge.innerText = '화면: ' + name;
}

document.getElementById('dev-btn-skip-next').addEventListener('click', function() {
  clearTimeout(typeTimer);
  clearTimeout(guideTypeTimer);
  clearTimeout(surveyTitleTypeTimer);
  if (showcaseInterval) { clearInterval(showcaseInterval); showcaseInterval = null; }
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }

  var activeScreen = document.querySelector('.screen.active');
  var activeId = activeScreen ? activeScreen.id : 'screen-cover';

  if (activeId === 'screen-cover') showScreen('screen-menu');
  else if (activeId === 'screen-menu') showScreen('screen-gallery');
  else if (activeId === 'screen-gallery') showScreen('screen-intro');
  else if (activeId === 'screen-intro') { showScreen('screen-opening'); resetOpeningFlow(); }
  else if (activeId === 'screen-opening') startCaptureGuideCinematicFlow();
  else if (activeId === 'screen-capture-guide') {
    showScreen('screen-shape-select');
    setTimeout(function() {
      actx.fillStyle = "#ffffff";
      actx.fillRect(0, 0, alignCanvas.width, alignCanvas.height);
      actx.fillStyle = "#222222";
      actx.beginPath();
      actx.arc(300, 300, 140, 0, Math.PI * 2);
      actx.fill();
      drawAlignCanvas();
    }, 30);
  } else if (activeId === 'screen-shape-select') {
    exportAlignedTexture();
    currentStepIdx = 0;
    renderSurveyStep();
    showScreen('screen-survey');
  } else if (activeId === 'screen-survey') {
    if (currentStepIdx === 0 && userSelections.q1.length === 0) userSelections.q1 = ["야행성", "사색가"];
    if (currentStepIdx === 1 && userSelections.q2.length === 0) userSelections.q2 = ["칼퇴 보장", "바다 여행"];
    if (currentStepIdx === 2 && userSelections.q3.length === 0) userSelections.q3 = ["내 속도대로 천천히 감"];
    if (currentStepIdx === 3 && userSelections.q4.length === 0) userSelections.q4 = ["완벽주의 강박"];
    if (currentStepIdx === 4 && userSelections.q5.length === 0) userSelections.q5 = ["쿨한 넘김"];
    if (currentStepIdx === 5 && !userSelections.q6_memo) {
      userSelections.q6_memo = "찬란하게 빛나길 바라.";
      inputQ6Memo.value = userSelections.q6_memo;
      memoCounter.innerText = userSelections.q6_memo.length + '/50';
    }
    if (currentStepIdx < 6) {
      currentStepIdx++;
      renderSurveyStep();
    } else {
      if (!userSelections.q7_name) {
        userSelections.q7_name = "테스트나비";
        inputQ7Name.value = "테스트나비";
        charCounter.innerText = userSelections.q7_name.length + '/10';
      }
      showScreen('screen-loading');
      startAnswerShowcaseSequence();
    }
  } else if (activeId === 'screen-loading') {
    var butterflyName = userSelections.q7_name ? userSelections.q7_name.trim() : "나비";
    var nameHeader = document.getElementById('preview-butterfly-name');
    if (nameHeader) nameHeader.innerText = '‘' + butterflyName + '’';
    showScreen('screen-preview');
    initFullButterflyViewer(currentExtractedTexture || createFallbackDummyTexture());
  } else if (activeId === 'screen-preview') {
    showScreen('screen-complete');
  } else if (activeId === 'screen-complete') {
    showScreen('screen-cover');
  }
});

document.getElementById('dev-btn-skip-prev').addEventListener('click', function() {
  clearTimeout(typeTimer);
  clearTimeout(guideTypeTimer);
  clearTimeout(surveyTitleTypeTimer);
  if (showcaseInterval) { clearInterval(showcaseInterval); showcaseInterval = null; }
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }

  var activeScreen = document.querySelector('.screen.active');
  var activeId = activeScreen ? activeScreen.id : 'screen-cover';

  if (activeId === 'screen-complete') {
    showScreen('screen-preview');
    initFullButterflyViewer(currentExtractedTexture || createFallbackDummyTexture());
  } else if (activeId === 'screen-preview') {
    showScreen('screen-loading');
    startAnswerShowcaseSequence();
  } else if (activeId === 'screen-loading') {
    currentStepIdx = 6;
    renderSurveyStep();
    showScreen('screen-survey');
  } else if (activeId === 'screen-survey') {
    if (currentStepIdx > 0) {
      currentStepIdx--;
      renderSurveyStep();
    } else {
      showScreen('screen-shape-select');
    }
  } else if (activeId === 'screen-shape-select') {
    startCaptureGuideCinematicFlow();
  } else if (activeId === 'screen-capture-guide') {
    showScreen('screen-opening');
    resetOpeningFlow();
  } else if (activeId === 'screen-opening') {
    showScreen('screen-intro');
  } else if (activeId === 'screen-intro') {
    showScreen('screen-gallery');
  } else if (activeId === 'screen-gallery') {
    showScreen('screen-menu');
  } else if (activeId === 'screen-menu') {
    showScreen('screen-cover');
  }
});

updateDevScreenBadge();