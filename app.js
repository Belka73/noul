/* ==========================================================================
   🌟 너울(Noul) 메인 애플리케이션 로직 (app.js)
   - [기존 요소 100% 보존]: 3D 뷰어, 물리 엔진, 검색, 인터랙션 전체 유지
   - [흐름 완벽 유지]: 고민 서술 직후 다정한 한마디 연동 & 온기 텍스트 브릿지 생략
   - [완벽 해결]: 
     1. 2D 나비 마스크 반쪽 잘림 현상 nonzero 전환으로 완전 해결
     2. 3D 블렌더 GLB 날개에 1:1 정밀 텍스처 매핑 (억지 클리핑 제거로 축소 왜곡 방지)
     3. 2D 패턴 선택 시 2D 화면 및 3D 모델 실시간 100% 연동
   ========================================================================== */

var ALL_SCREENS = [
  'screen-cover', 'screen-menu', 'screen-gallery', 'screen-intro',
  'screen-opening', 'screen-survey', 'screen-survey-core-concern',
  'screen-survey-concern-reason', 'screen-post-concern-bridge',
  'screen-capture-guide', 'screen-shape-select', 'screen-survey-bridge',
  'screen-loading', 'screen-preview', 'screen-complete', 'screen-share'
];

var showcaseInterval = null;
var currentStepIdx = 0; // 0: 이름, 1: 고민다중, 2: 다정한한마디
var userSelections = { q1: [], q2: [], q1_custom: "", q2_custom: "", core_concern: "", concern_reason: "", q6_memo: "", q7_name: "" };

var completeTypeTimer = null;
var shareTypeTimer = null;
var autoTransitionTimer = null;
var reasonTypeTimer = null;
var postConcernTypeTimer = null;
var flightSafetyTimer = null;
var typeTimer = null;
var guideTypeTimer = null;
var surveyTitleTypeTimer = null;
var coreConcernTypeTimer = null;
var openingDelayTimer = null;

function clearAllTimers() {
  clearTimeout(typeTimer);
  clearTimeout(guideTypeTimer);
  clearTimeout(surveyTitleTypeTimer);
  clearTimeout(coreConcernTypeTimer);
  clearTimeout(reasonTypeTimer);
  clearTimeout(openingDelayTimer);
  clearTimeout(completeTypeTimer);
  clearTimeout(shareTypeTimer);
  clearTimeout(autoTransitionTimer);
  clearTimeout(postConcernTypeTimer);
  clearTimeout(flightSafetyTimer);
  if (showcaseInterval) { clearInterval(showcaseInterval); showcaseInterval = null; }
}

function showScreen(screenId) {
  clearAllTimers();
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });

  var target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    try {
      if (screenId === 'screen-cover') {
        stopBubblePhysics(); stopLoading3DScene(); stopShare3DScene();
      } else if (screenId === 'screen-opening') {
        stopBubblePhysics(); stopLoading3DScene(); stopShare3DScene(); resetOpeningFlow();
      } else if (screenId === 'screen-survey') {
        stopLoading3DScene(); stopShare3DScene(); renderSurveyStep();
      } else if (screenId === 'screen-survey-core-concern') {
        stopBubblePhysics(); stopLoading3DScene(); stopShare3DScene(); initCoreConcernScreen();
      } else if (screenId === 'screen-survey-concern-reason') {
        stopBubblePhysics(); stopLoading3DScene(); stopShare3DScene(); initConcernReasonScreen();
      } else if (screenId === 'screen-post-concern-bridge') {
        stopBubblePhysics(); stopLoading3DScene(); stopShare3DScene(); initPostConcernBridgeScreen();
      } else if (screenId === 'screen-capture-guide') {
        stopBubblePhysics(); stopLoading3DScene(); stopShare3DScene(); startCaptureGuideCinematicFlow();
      } else if (screenId === 'screen-shape-select') {
        stopBubblePhysics(); stopLoading3DScene(); stopShare3DScene();
        switchTab('wing'); updateHeroPreview(); drawAlignCanvas();
      } else if (screenId === 'screen-gallery') {
        stopBubblePhysics(); stopLoading3DScene(); stopShare3DScene(); initSpecimenGallery();
      } else if (screenId === 'screen-survey-bridge') {
        stopBubblePhysics(); stopLoading3DScene(); stopShare3DScene(); playBridgeTypingSequence();
      } else if (screenId === 'screen-loading') {
        stopBubblePhysics(); stopShare3DScene();
      } else if (screenId === 'screen-complete') {
        stopLoading3DScene(); stopShare3DScene(); playCompleteScreenSequence();
      } else if (screenId === 'screen-share') {
        stopLoading3DScene(); initShare3DScene(); playShareScreenSequence();
      } else {
        stopBubblePhysics(); stopLoading3DScene(); stopShare3DScene();
      }
    } catch(e) {
      console.warn("화면 진입 시각효과 경고:", e);
    }
  }
  updateDevScreenBadge();
}

function transitionToScreenWithFade(targetScreenId) {
  var curtain = document.getElementById('cinematic-transition-curtain');
  if (!curtain) { showScreen(targetScreenId); return; }
  curtain.classList.add('active-curtain');
  setTimeout(function() {
    showScreen(targetScreenId);
    requestAnimationFrame(function() {
      setTimeout(function() { curtain.classList.remove('active-curtain'); }, 50);
    });
  }, 320);
}

function updateDevScreenBadge() {
  var badge = document.getElementById('dev-current-screen-badge');
  if (!badge) return;
  var activeScreen = document.querySelector('.screen.active');
  var name = activeScreen ? activeScreen.id : 'none';
  if (name === 'screen-opening') name += ' (' + openingCurrentStep + '/3: 오프닝대사)';
  else if (name === 'screen-survey') {
    if (currentStepIdx === 0) name += ' (1/3: 이름)';
    else if (currentStepIdx === 1) name += ' (2/3: 고민선택)';
    else if (currentStepIdx === 2) name += ' (3/3: 다정한한마디)';
  } else if (name === 'screen-survey-core-concern') name += ' (핵심고민)';
  else if (name === 'screen-survey-concern-reason') name += ' (고민이유)';
  else if (name === 'screen-post-concern-bridge') name += ' (나비전환브릿지)';
  badge.innerText = '화면: ' + name;
}

// --------------------------------------------------------------------------
// 3D 나비 내부 공통 생성 헬퍼 함수
// --------------------------------------------------------------------------
function setupCommon3DScene(container, camZ, lookY) {
  if (!container || !window.THREE) return null;
  container.innerHTML = '';
  var w = container.clientWidth || window.innerWidth;
  var h = container.clientHeight || window.innerHeight;
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
  camera.position.set(0, 0, camZ || 7.5);
  camera.lookAt(0, lookY || 0, 0);

  var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  var amb = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(amb);
  var dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(3, 6, 8);
  scene.add(dir);

  return { scene: scene, camera: camera, renderer: renderer };
}

function loadButterflyModel(group, shapeId, antId, wingMat, whiteMat, scale, onLoaded) {
  if (!window.THREE || !THREE.GLTFLoader) return;
  var modelPath = '3DButterfly/' + (shapeId || 'crescent') + '.glb';
  var targetAnt = 'Antenna_' + (antId || 'ball');

  new THREE.GLTFLoader().load(modelPath, function(gltf) {
    var model = gltf.scene;
    var wL = null, wR = null;
    model.traverse(function(child) {
      if (child.isMesh) {
        var n = child.name;
        if (n.startsWith('Wing_L')) { wL = child; child.material = wingMat; }
        else if (n.startsWith('Wing_R')) { wR = child; child.material = wingMat; }
        else if (n.startsWith('Body')) { child.material = whiteMat; }
        else if (n.startsWith('Antenna_')) { child.material = whiteMat; child.visible = n.startsWith(targetAnt); }
      }
    });
    model.scale.set(scale, scale, scale);
    group.add(model);
    if (onLoaded) onLoaded(wL, wR);
  }, undefined, function() {});
}

// --------------------------------------------------------------------------
// 🌟 로딩 화면용 3D 블러 나비 씬
// --------------------------------------------------------------------------
var loadingScene, loadingCamera, loadingRenderer, loadingGroup, loadingWingL, loadingWingR;
var loadingAnimFrameId = null;

function initLoading3DScene() {
  stopLoading3DScene();
  var res = setupCommon3DScene(document.getElementById('loading-three-container'), 7.5, 0);
  if (!res) return;
  loadingScene = res.scene; loadingCamera = res.camera; loadingRenderer = res.renderer;

  var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.35 });
  loadingGroup = new THREE.Group();
  loadingGroup.rotation.set(0.25, -0.8, 0.35);
  loadingGroup.position.set(-0.28, -0.22, 0);

  loadButterflyModel(loadingGroup, selectedButterflyShape, selectedAntennaType, whiteMat, whiteMat, 0.95, function(l, r) {
    loadingWingL = l; loadingWingR = r;
  });
  loadingScene.add(loadingGroup);

  var clock = new THREE.Clock();
  (function animateLoading() {
    loadingAnimFrameId = requestAnimationFrame(animateLoading);
    var t = clock.getElapsedTime(), flap = Math.sin(t * 7.5) * 0.42;
    if (loadingWingL && loadingWingR) { loadingWingL.rotation.y = flap; loadingWingR.rotation.y = -flap; }
    loadingGroup.position.y = -0.22 + Math.sin(t * 2.2) * 0.08;
    loadingGroup.rotation.z = 0.35 + Math.sin(t * 1.5) * 0.04;
    loadingRenderer.render(loadingScene, loadingCamera);
  })();
}

function stopLoading3DScene() {
  if (loadingAnimFrameId) { cancelAnimationFrame(loadingAnimFrameId); loadingAnimFrameId = null; }
  var c = document.getElementById('loading-three-container');
  if (c) c.innerHTML = '';
}

// --------------------------------------------------------------------------
// 🌟 공유 화면용 선명한 3D 나비 씬
// --------------------------------------------------------------------------
var shareScene, shareCamera, shareRenderer, shareGroup, shareWingL, shareWingR;
var shareAnimFrameId = null;

function initShare3DScene() {
  stopShare3DScene();
  var res = setupCommon3DScene(document.getElementById('share-three-container'), 7.5, 0);
  if (!res) return;
  shareScene = res.scene; shareCamera = res.camera; shareRenderer = res.renderer;

  var texUrl = currentExtractedTexture || createFallbackDummyTexture('#ffffff', '#cfcfcf');
  var tex = new THREE.TextureLoader().load(texUrl);
  tex.flipY = false;
  var wingMat = new THREE.MeshBasicMaterial({ 
    map: tex, 
    side: THREE.DoubleSide, 
    transparent: true, 
    alphaTest: 0.05 
  });
  var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.35 });

  shareGroup = new THREE.Group();
  shareGroup.rotation.set(0.25, -0.8, 0.35);
  shareGroup.position.set(0, 0.45, 0);

  loadButterflyModel(shareGroup, selectedButterflyShape, selectedAntennaType, wingMat, whiteMat, 0.68, function(l, r) {
    shareWingL = l; shareWingR = r;
  });
  shareScene.add(shareGroup);

  var clock = new THREE.Clock();
  (function animateShare() {
    shareAnimFrameId = requestAnimationFrame(animateShare);
    var t = clock.getElapsedTime(), flap = Math.sin(t * 7.5) * 0.42;
    if (shareWingL && shareWingR) { shareWingL.rotation.y = flap; shareWingR.rotation.y = -flap; }
    shareGroup.position.y = 0.45 + Math.sin(t * 2.2) * 0.08;
    shareGroup.rotation.z = 0.35 + Math.sin(t * 1.5) * 0.04;
    shareRenderer.render(shareScene, shareCamera);
  })();
}

function stopShare3DScene() {
  if (shareAnimFrameId) { cancelAnimationFrame(shareAnimFrameId); shareAnimFrameId = null; }
  var c = document.getElementById('share-three-container');
  if (c) c.innerHTML = '';
}

// --------------------------------------------------------------------------
// 로딩 진행바 시퀀스
// --------------------------------------------------------------------------
function startAnswerShowcaseSequence() {
  if (showcaseInterval) { clearInterval(showcaseInterval); showcaseInterval = null; }
  initLoading3DScene();

  var pBar = document.getElementById('generation-progress-bar'), progress = 0;
  if (pBar) pBar.style.width = '0%';
  var intervalDelay = 100, stepIncrease = 100 / (30000 / intervalDelay);

  showcaseInterval = setInterval(function() {
    progress += stepIncrease;
    if (pBar) pBar.style.width = Math.min(100, progress) + '%';
    if (progress >= 100) {
      clearInterval(showcaseInterval); showcaseInterval = null;
      setTimeout(function() {
        var whiteFlash = document.getElementById('cinematic-white-flash');
        if (whiteFlash) whiteFlash.classList.add('flash-active');
        setTimeout(function() {
          stopLoading3DScene();
          var butterflyName = userSelections.q7_name ? userSelections.q7_name.trim() : "나비";
          var nameHeader = document.getElementById('preview-butterfly-name');
          if (nameHeader) nameHeader.innerText = '‘' + butterflyName + '’';

          var guideText = document.getElementById('preview-guide-text');
          if (guideText) {
            guideText.innerText = userSelections.q6_memo && userSelections.q6_memo.trim().length > 0 
              ? userSelections.q6_memo.trim() : "너의 찬란한 날갯짓을 응원해.";
          }
          initFullButterflyViewer(currentExtractedTexture || createFallbackDummyTexture());
          showScreen('screen-preview');
          setTimeout(function() { if (whiteFlash) whiteFlash.classList.remove('flash-active'); }, 1200);
        }, 1400);
      }, 1000);
    }
  }, intervalDelay);
}

// --------------------------------------------------------------------------
// 완료 및 공유 화면 텍스트 타이핑
// --------------------------------------------------------------------------
function playCompleteScreenSequence() {
  clearTimeout(completeTypeTimer); clearTimeout(autoTransitionTimer);
  var titleEl = document.getElementById('complete-typing-title');
  if (!titleEl) return;
  var rawName = userSelections.q7_name ? userSelections.q7_name.trim() : "나비";
  typeWriterText(titleEl, "하늘로 '" + rawName + "'이<br>너울 속으로 날아 올랐습니다.", function() {
    autoTransitionTimer = setTimeout(function() { transitionToScreenWithFade('screen-share'); }, 2000);
  });
}

function playShareScreenSequence() {
  clearTimeout(shareTypeTimer);
  var titleEl = document.getElementById('share-typing-title');
  var bottomDock = document.getElementById('share-bottom-dock');
  if (!titleEl) return;
  if (bottomDock) bottomDock.style.opacity = '0';
  typeWriterText(titleEl, "당신의 나비를 더 멀리 날려보세요.", function() {
    if (bottomDock) bottomDock.style.opacity = '1';
  });
}

var btnActionShare = document.getElementById('btn-action-share');
if (btnActionShare) {
  btnActionShare.onclick = function() {
    var rawName = userSelections.q7_name ? userSelections.q7_name.trim() : "나비";
    var rawMemo = userSelections.q6_memo && userSelections.q6_memo.trim().length > 0 ? userSelections.q6_memo.trim() : "너의 찬란한 날갯짓을 응원해.";
    var rawShape = selectedButterflyShape || "crescent";
    var baseUrl = window.location.href.split('?')[0].replace(/index\.html$/, '');
    if (!baseUrl.endsWith('/')) baseUrl += '/';
    var shareCardUrl = baseUrl + 'share.html?name=' + encodeURIComponent(rawName) + '&memo=' + encodeURIComponent(rawMemo) + '&shape=' + encodeURIComponent(rawShape);

    var shareData = { title: '너울(Noul) - ' + rawName, text: "내가 빚은 나비 '" + rawName + "'(이)가 도착했습니다.", url: shareCardUrl };
    if (navigator.share) navigator.share(shareData).catch(function() {});
    else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareCardUrl).then(function() { alert("나비 초대장 링크가 클립보드에 복사되었습니다!"); })
        .catch(function() { alert("링크 복사에 실패했습니다."); });
    } else alert("공유를 지원하지 않는 브라우저입니다.");
  };
}

var btnActionHome = document.getElementById('btn-action-home');
if (btnActionHome) btnActionHome.onclick = function() { location.reload(); };

// --------------------------------------------------------------------------
// DEV 전역 건너뛰기 이벤트
// --------------------------------------------------------------------------
function ensureDevDummyData() {
  if (!userSelections.q7_name) userSelections.q7_name = "테스트나비";
  if (!userSelections.q2 || userSelections.q2.length === 0) userSelections.q2 = ["완벽주의 강박", "비교중독", "수면 부족", "거절 공포", "텅 빈 잔고", "미래 막막함"];
  if (!userSelections.core_concern) userSelections.core_concern = userSelections.q2[0];
  if (!userSelections.concern_reason) userSelections.concern_reason = "항상 잘 해내야 한다는 마음이 앞서서요.";
  if (!userSelections.q6_memo) userSelections.q6_memo = "너의 찬란한 날갯짓을 응원해.";
  if (!currentExtractedTexture) currentExtractedTexture = createFallbackDummyTexture();
}

document.addEventListener('click', function(e) {
  var target = e.target;
  if (!target) return;
  var btnNext = target.closest('#dev-btn-skip-next'), btnPrev = target.closest('#dev-btn-skip-prev');

  if (btnNext) {
    e.preventDefault(); e.stopPropagation();
    clearAllTimers();
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    var curId = (document.querySelector('.screen.active') || {}).id || 'screen-cover';

    if (curId === 'screen-cover' || curId === 'screen-menu') { showScreen('screen-opening'); return; }
    if (curId === 'screen-gallery' || curId === 'screen-intro') { showScreen('screen-menu'); return; }
    if (curId === 'screen-opening') {
      if (openingCurrentStep === 1) {
        openingCurrentStep = 2;
        if (elOpeningNextGroup) { elOpeningNextGroup.classList.remove('visible'); elOpeningNextGroup.classList.add('hidden'); }
        typeWriterText(elOpeningText, "꺼내어 보이지 못한 채,<br>응어리진 무언가... 쉽게 털어놓지 못할 것도 있겠지요.", function() {
          if (btnOpeningNext) btnOpeningNext.innerHTML = "다음으로";
          if (elOpeningNextGroup) { elOpeningNextGroup.classList.remove('hidden'); requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); }); }
        });
        updateDevScreenBadge(); return;
      } else if (openingCurrentStep === 2) {
        openingCurrentStep = 3;
        if (elOpeningNextGroup) { elOpeningNextGroup.classList.remove('visible'); elOpeningNextGroup.classList.add('hidden'); }
        typeWriterText(elOpeningText, "오늘 이곳에서,<br>당신의 마음 깊은 곳에 묻어둔 이야기를<br>조심스레 꺼내어보려 합니다.", function() {
          if (btnOpeningNext) btnOpeningNext.innerHTML = "다음으로";
          if (elOpeningNextGroup) { elOpeningNextGroup.classList.remove('hidden'); requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); }); }
        });
        updateDevScreenBadge(); return;
      } else if (openingCurrentStep === 3) { currentStepIdx = 0; showScreen('screen-survey'); return; }
    }
    if (curId === 'screen-survey') {
      if (currentStepIdx === 0) { if (!userSelections.q7_name) userSelections.q7_name = "테스트나비"; currentStepIdx = 1; renderSurveyStep(); return; }
      else if (currentStepIdx === 1) { ensureDevDummyData(); showScreen('screen-survey-core-concern'); return; }
      else if (currentStepIdx === 2) { ensureDevDummyData(); showScreen('screen-post-concern-bridge'); return; }
    } else if (curId === 'screen-survey-core-concern') { ensureDevDummyData(); showScreen('screen-survey-concern-reason'); return; }
    else if (curId === 'screen-survey-concern-reason') { ensureDevDummyData(); currentStepIdx = 2; showScreen('screen-survey'); return; }
    else if (curId === 'screen-post-concern-bridge') { showScreen('screen-capture-guide'); return; }
    else if (curId === 'screen-capture-guide') { showScreen('screen-shape-select'); return; }
    else if (curId === 'screen-shape-select') { ensureDevDummyData(); exportAlignedTexture(); showScreen('screen-loading'); startAnswerShowcaseSequence(); return; }
    else if (curId === 'screen-loading') {
      ensureDevDummyData();
      var butterflyName = userSelections.q7_name ? userSelections.q7_name.trim() : "나비";
      var nameHeader = document.getElementById('preview-butterfly-name');
      if (nameHeader) nameHeader.innerText = '‘' + butterflyName + '’';
      var guideText = document.getElementById('preview-guide-text');
      if (guideText) guideText.innerText = userSelections.q6_memo && userSelections.q6_memo.trim().length > 0 ? userSelections.q6_memo.trim() : "너의 찬란한 날갯짓을 응원해.";
      initFullButterflyViewer(currentExtractedTexture || createFallbackDummyTexture());
      showScreen('screen-preview'); return;
    } else if (curId === 'screen-preview') { ensureDevDummyData(); showScreen('screen-complete'); return; }
    else if (curId === 'screen-complete') { showScreen('screen-share'); return; }
    else if (curId === 'screen-share') { showScreen('screen-cover'); return; }
  }

  if (btnPrev) {
    e.preventDefault(); e.stopPropagation();
    clearAllTimers();
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    var curId = (document.querySelector('.screen.active') || {}).id || 'screen-cover';

    if (curId === 'screen-cover') { showScreen('screen-share'); return; }
    if (curId === 'screen-menu') { showScreen('screen-cover'); return; }
    if (curId === 'screen-gallery' || curId === 'screen-intro') { showScreen('screen-menu'); return; }
    if (curId === 'screen-opening') {
      if (openingCurrentStep === 3) {
        openingCurrentStep = 2;
        typeWriterText(elOpeningText, "꺼내어 보이지 못한 채,<br>응어리진 무언가... 쉽게 털어놓지 못할 것도 있겠지요.", function() {
          if (btnOpeningNext) btnOpeningNext.innerHTML = "다음으로";
        });
        updateDevScreenBadge(); return;
      } else if (openingCurrentStep === 2) {
        openingCurrentStep = 1;
        typeWriterText(elOpeningText, "안녕하세요?<br>지금, 걱정 없는 삶을 살아가고 있나요?", function() {
          if (btnOpeningNext) btnOpeningNext.innerHTML = "다음으로";
        });
        updateDevScreenBadge(); return;
      } else if (openingCurrentStep === 1) { showScreen('screen-cover'); return; }
    }
    if (curId === 'screen-survey') {
      if (currentStepIdx === 2) { showScreen('screen-survey-concern-reason'); return; }
      else if (currentStepIdx === 1) { currentStepIdx = 0; renderSurveyStep(); return; }
      else if (currentStepIdx === 0) {
        showScreen('screen-opening'); openingCurrentStep = 3;
        typeWriterText(elOpeningText, "오늘 이곳에서,<br>당신의 마음 깊은 곳에 묻어둔 이야기를<br>조심스레 꺼내어보려 합니다.", function() {
          if (btnOpeningNext) btnOpeningNext.innerHTML = "다음으로";
          if (elOpeningNextGroup) { elOpeningNextGroup.classList.remove('hidden'); requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); }); }
        });
        updateDevScreenBadge(); return;
      }
    } else if (curId === 'screen-survey-core-concern') { currentStepIdx = 1; showScreen('screen-survey'); return; }
    else if (curId === 'screen-survey-concern-reason') { showScreen('screen-survey-core-concern'); return; }
    else if (curId === 'screen-post-concern-bridge') { currentStepIdx = 2; showScreen('screen-survey'); return; }
    else if (curId === 'screen-capture-guide') { showScreen('screen-post-concern-bridge'); return; }
    else if (curId === 'screen-shape-select') { showScreen('screen-capture-guide'); return; }
    else if (curId === 'screen-loading') { showScreen('screen-shape-select'); return; }
    else if (curId === 'screen-preview') { showScreen('screen-loading'); startAnswerShowcaseSequence(); return; }
    else if (curId === 'screen-complete') { ensureDevDummyData(); initFullButterflyViewer(currentExtractedTexture || createFallbackDummyTexture()); showScreen('screen-preview'); return; }
    else if (curId === 'screen-share') { showScreen('screen-complete'); return; }
  }
}, true);

// --------------------------------------------------------------------------
// 기본 네비게이션 버튼 바인딩
// --------------------------------------------------------------------------
function bindAppNavEvents() {
  var binds = [
    ['btn-start-cover', function() { showScreen('screen-menu'); }],
    ['btn-menu-back', function() { showScreen('screen-cover'); }],
    ['menu-btn-create', function() { showScreen('screen-opening'); }],
    ['menu-btn-browse', function() { transitionToScreenWithFade('screen-gallery'); }],
    ['btn-gallery-back', function() { showScreen('screen-menu'); }],
    ['menu-btn-intro', function() { transitionToScreenWithFade('screen-intro'); }],
    ['btn-intro-back', function() { showScreen('screen-menu'); }],
    ['btn-intro-bottom-back', function() { showScreen('screen-menu'); }]
  ];
  binds.forEach(function(item) {
    var el = document.getElementById(item[0]);
    if (el) el.onclick = item[1];
  });
}
bindAppNavEvents();

// --------------------------------------------------------------------------
// 타이핑 플로우 유틸리티 및 오프닝
// --------------------------------------------------------------------------
var openingCurrentStep = 1;
var elOpeningText = document.getElementById('opening-text');
var elOpeningChoiceGroup = document.getElementById('opening-choice-group');
var elOpeningNextGroup = document.getElementById('opening-next-group');
var btnOpeningNext = document.getElementById('btn-opening-next');

function typeWriterText(targetElement, textWithHtml, onComplete) {
  clearTimeout(typeTimer);
  if (!targetElement) return;
  targetElement.innerHTML = "";
  var tokens = textWithHtml.match(/(<[^>]+>|[^<])/g) || [];
  var idx = 0, currentContent = "";

  (function nextChar() {
    if (idx < tokens.length) {
      var char = tokens[idx];
      currentContent += char;
      targetElement.innerHTML = currentContent;
      idx++;
      var delay = 85;
      if (char.startsWith('<')) delay = 0;
      else if (char === '?' || char === '.') delay = 450;
      else if (char === ',') delay = 250;
      typeTimer = setTimeout(nextChar, delay);
    } else {
      setTimeout(function() { if (onComplete) onComplete(); }, 200);
    }
  })();
}

function resetOpeningFlow() {
  clearTimeout(typeTimer); clearTimeout(openingDelayTimer);
  openingCurrentStep = 1;
  if (elOpeningText) elOpeningText.innerHTML = "";
  if (elOpeningChoiceGroup) { elOpeningChoiceGroup.classList.remove('visible'); elOpeningChoiceGroup.classList.add('hidden'); }
  if (elOpeningNextGroup) { elOpeningNextGroup.classList.add('hidden'); elOpeningNextGroup.classList.remove('visible'); }

  openingDelayTimer = setTimeout(function() {
    typeWriterText(elOpeningText, "안녕하세요?<br>지금, 걱정 없는 삶을 살아가고 있나요?", function() {
      if (btnOpeningNext) btnOpeningNext.innerHTML = "다음으로";
      if (elOpeningNextGroup) { elOpeningNextGroup.classList.remove('hidden'); requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); }); }
    });
  }, 2000);
}

if (btnOpeningNext) {
  btnOpeningNext.onclick = function() {
    if (openingCurrentStep === 1) {
      openingCurrentStep = 2;
      if (elOpeningNextGroup) { elOpeningNextGroup.classList.remove('visible'); elOpeningNextGroup.classList.add('hidden'); }
      typeWriterText(elOpeningText, "꺼내어 보이지 못한 채,<br>응어리진 무언가... 쉽게 털어놓지 못할 것도 있겠지요.", function() {
        btnOpeningNext.innerHTML = "다음으로";
        if (elOpeningNextGroup) { elOpeningNextGroup.classList.remove('hidden'); requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); }); }
      });
      updateDevScreenBadge();
    } else if (openingCurrentStep === 2) {
      openingCurrentStep = 3;
      if (elOpeningNextGroup) { elOpeningNextGroup.classList.remove('visible'); elOpeningNextGroup.classList.add('hidden'); }
      typeWriterText(elOpeningText, "오늘 이곳에서,<br>당신의 마음 깊은 곳에 묻어둔 이야기를<br>조심스레 꺼내어보려 합니다.", function() {
        btnOpeningNext.innerHTML = "다음으로";
        if (elOpeningNextGroup) { elOpeningNextGroup.classList.remove('hidden'); requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); }); }
      });
      updateDevScreenBadge();
    } else if (openingCurrentStep === 3) {
      currentStepIdx = 0;
      showScreen('screen-survey');
    }
  };
}

// --------------------------------------------------------------------------
// 나비 전환 브릿지 화면 로직
// --------------------------------------------------------------------------
function initPostConcernBridgeScreen() {
  clearTimeout(postConcernTypeTimer);
  var textEl = document.getElementById('post-concern-bridge-text');
  var nextGroup = document.getElementById('post-concern-bridge-next-group');
  var btnNext = document.getElementById('btn-post-concern-bridge-next');

  if (!textEl || !nextGroup) return;
  textEl.innerHTML = "";
  nextGroup.classList.add('hidden');
  nextGroup.classList.remove('visible');

  typeWriterText(textEl, "마음속 담아두었던 고민들을 모았어요.<br>이제 그 마음을 날려 보낼 나비를 빚어볼 차례입니다.", function() {
    if (btnNext) btnNext.innerHTML = "다음으로";
    nextGroup.classList.remove('hidden');
    requestAnimationFrame(function() { nextGroup.classList.add('visible'); });
  });
}

var btnPostConcernBridgeNext = document.getElementById('btn-post-concern-bridge-next');
if (btnPostConcernBridgeNext) {
  btnPostConcernBridgeNext.onclick = function() { showScreen('screen-capture-guide'); };
}

// --------------------------------------------------------------------------
// 촬영 가이드 화면 로직
// --------------------------------------------------------------------------
var guideTitleWrap = document.querySelector('.guide-title-wrapper');
var guideAnimatedTitle = document.getElementById('guide-animated-title');
var guideCenterCard = document.getElementById('guide-center-card');
var guideBottomDock = document.getElementById('guide-bottom-dock');

function startCaptureGuideCinematicFlow() {
  clearTimeout(guideTypeTimer);
  if (guideTitleWrap) guideTitleWrap.classList.remove('moved-to-top');
  if (guideAnimatedTitle) guideAnimatedTitle.innerHTML = "";
  if (guideCenterCard) guideCenterCard.classList.remove('revealed');
  if (guideBottomDock) guideBottomDock.classList.remove('revealed');

  var introMessage = "고치에서 깨어날 당신의 나비는<br>어떤 모습인가요?";
  var tokens = introMessage.match(/(<[^>]+>|[^<])/g) || [];
  var idx = 0, curText = "";

  (function typeNext() {
    if (idx < tokens.length) {
      var char = tokens[idx];
      curText += char;
      if (guideAnimatedTitle) guideAnimatedTitle.innerHTML = curText;
      idx++;
      var delay = (char.startsWith('<') ? 0 : (char === '?' || char === '.' ? 400 : 80));
      guideTypeTimer = setTimeout(typeNext, delay);
    } else {
      setTimeout(function() {
        if (guideTitleWrap) guideTitleWrap.classList.add('moved-to-top');
        setTimeout(function() {
          if (guideCenterCard) guideCenterCard.classList.add('revealed');
          if (guideBottomDock) guideBottomDock.classList.add('revealed');
        }, 450);
      }, 350);
    }
  })();
}

// --------------------------------------------------------------------------
// Supabase 연동 & 형태 선택
// --------------------------------------------------------------------------
var SUPABASE_URL = 'https://djmdzsbfsobsutphragw.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbWR6c2Jmc29ic3V0cGhyYWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4ODQ3NTgsImV4cCI6MjEwNTQ2MDc1OH0.BC7llaSjbq6cYhDlRqrwJaycpQ6gSNcp5LgYBeM6WEM';
var supabase = null;
try { if (window.supabase) supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch (err) {}

var activeCustomTab = 'wing';
var selectedButterflyShape = 'crescent';
var selectedAntennaType = 'ball';
var selectedPatternId = 'crescent_none';

var patternImageCache = {};

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
// 🌟 2D 나비 외곽선 및 무늬 1:1 정밀 렌더러 (원본 1000x1000 기준)
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
    // 1000x1000 규격 대지 기준 1:1 직접 렌더링
    patternSvgEl = 
      '<g opacity="0.95" style="mix-blend-mode: multiply;">' +
        '<image href="' + pat.path + '" x="0" y="0" width="1000" height="1000" preserveAspectRatio="none"/>' +
      '</g>';
  }

  // 1:1 원본 좌표계 기반 마스크 (nonzero 적용으로 반쪽 가려짐 해결)
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
    // 1. 날개 외곽을 가리는 반투명 암전 마스크
    '<rect x="-200" y="-200" width="1400" height="1400" fill="rgba(0, 0, 0, 0.72)" mask="url(#butterfly-outside-mask)"/>' +
    // 2. 날개 안쪽에만 1:1로 얹히는 고유 무늬
    '<g clip-path="url(#hero-wing-exact-clip)">' +
      patternSvgEl +
    '</g>' +
    // 3. 날개와 1:1로 맞물리는 원본 대칭 몸통
    (bodyD ? '<path d="' + bodyD + '" fill="#ffffff"/>' : '') +
    // 4. 머리 정수리 좌표에 정렬되는 더듬이
    '<g transform="translate(' + currentWing.headX + ', ' + currentWing.headY + ')" filter="url(#antenna-subtle-contrast)" color="#ffffff">' +
      ant.render(10.5) +
    '</g>';
}

var carouselContainer = document.getElementById('arch-carousel-container');

function renderCarouselItems() {
  if (!carouselContainer || typeof wingDataset === 'undefined') return;
  carouselContainer.innerHTML = '';
  
  var dataset = [];
  if (activeCustomTab === 'wing') dataset = wingDataset;
  else if (activeCustomTab === 'pattern') {
    dataset = (typeof wingPatternDataset !== 'undefined' && wingPatternDataset[selectedButterflyShape]) 
      ? wingPatternDataset[selectedButterflyShape] 
      : (wingPatternDataset['crescent'] || []);
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
        contentHtml = '<img class="pattern-thumb-img" src="' + item.path + '" alt="' + item.name + '" />';
      } else {
        contentHtml = '<svg viewBox="0 0 40 40" preserveAspectRatio="xMidYMid meet">' + (item.thumb || '<circle cx="20" cy="20" r="14" fill="none" stroke="currentColor"/>') + '</svg>';
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
    selectedPatternId = currentPatterns.length > 0 ? currentPatterns[0].id : 'crescent_none';
    drawAlignCanvas(); 
  } else if (type === 'pattern') {
    selectedPatternId = id;
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
  updateCarouselPadding(); applyStraightSelection(); resizeBubblePhysicsCanvas();
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
// 🌟 3D GLB 모델용 정밀 텍스처 추출 로직
// - 블렌더 3D 모델의 날개 메시 전체에 100% 비율로 완벽하게 입혀지도록 1:1 합성
// --------------------------------------------------------------------------
function drawPatternSymmetricOnCanvas(ctx, patImg, targetWidth, targetHeight) {
  if (!patImg || !patImg.width) return;

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.95;
  ctx.drawImage(patImg, 0, 0, targetWidth, targetHeight);
  ctx.restore();
}

function exportAlignedTexture() {
  if (!rawImage || !rawImage.width || !alignCanvas) {
    currentExtractedTexture = createFallbackDummyTexture(); return;
  }
  var baseCanvas = document.createElement('canvas');
  baseCanvas.width = alignCanvas.width; baseCanvas.height = alignCanvas.height;
  var bctx = baseCanvas.getContext('2d', { willReadFrequently: true });
  bctx.drawImage(rawImage, imgX, imgY, rawImage.width * imgScale, rawImage.height * imgScale);

  if (currentBlurPx > 0) executeReliableFastBlur(baseCanvas, currentBlurPx * 0.9);

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

  // 1000x1000 고해상도 정사각형 텍스처 캔버스 생성 (3D 블렌더 날개 UV 정밀 매핑)
  var outW = 1000, outH = 1000;
  var finalCanvas = document.createElement('canvas');
  finalCanvas.width = outW; finalCanvas.height = outH;
  var fctx = finalCanvas.getContext('2d');

  // 사용자 사진 텍스처를 3D 평면 규격에 1:1로 정확하게 렌더링
  fctx.drawImage(baseCanvas, 0, 0, alignCanvas.width, alignCanvas.height, 0, 0, outW, outH);

  // 날개 무늬(패턴) 1:1 합성
  var pat = getSelectedPatternObject();
  if (pat && pat.path) {
    var cachedImg = patternImageCache[pat.path];
    if (cachedImg && cachedImg.complete) {
      drawPatternSymmetricOnCanvas(fctx, cachedImg, outW, outH);
    } else {
      var pImg = new Image();
      pImg.crossOrigin = "anonymous";
      pImg.onload = function() {
        patternImageCache[pat.path] = pImg;
      };
      pImg.src = pat.path;
    }
  }

  currentExtractedTexture = finalCanvas.toDataURL('image/png');
}

function createFallbackDummyTexture(colorA, colorB) {
  var c = document.createElement('canvas'); c.width = 512; c.height = 512;
  var ctx = c.getContext('2d'), grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, colorA || '#2a5298'); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, colorB || '#1e3c72');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath(); ctx.arc(256, 256, 130, 0, Math.PI * 2); ctx.fill();
  return c.toDataURL('image/png');
}

// --------------------------------------------------------------------------
// 설문조사
// --------------------------------------------------------------------------
var surveyQuestions = [
  { title: "당신의 이름은 무엇인가요?", desc: "" },
  {
    title: "당신을 붙잡고 있는 것은 무엇인가요?",
    desc: "(다중 선택)",
    category: "#마주친 마음의 고민",
    options: [
      "비교중독", "만성 피로", "텅 빈 잔고", "완벽주의 강박", "미래 막막함", "거절 공포", "지나간 후회", "가면 증후군", "스마트폰 중독", "결정 장애",
      "눈치 보기", "벼락치기 습관", "타인 인정 욕구", "번아웃 무기력", "억지 미소", "취업 압박감", "수면 부족", "실패 공포증", "잦은 감정 기복", "뒤처짐 조급함",
      "고립감과 외로움", "쓸데없는 잡생각", "꼰대와 갑질", "자책과 자기 비하", "억지 인연 유지", "학점·스펙 압박", "충동구매 후회", "시작의 두려움", "단톡방 알림 감옥", "과도한 책임감",
      "부모님 잔소리", "과열된 머릿속", "애매한 재능", "만성 무기력", "타인의 무례함", "겉도는 관계", "질투와 열등감", "끝없는 미루기", "건강 악화", "타인의 오해",
      "월세·생활비 압박", "도파민 중독", "좁아진 시야", "낮은 자존감", "겉만 번지르르함", "감정 쓰레기통 역할", "무리한 부탁", "고립된 혼밥", "흐려진 목표", "그냥 온갖 귀찮음"
    ]
  },
  { title: "나에게, 그리고 우리에게 건넬 다정한 한마디를 적어주세요.", desc: "" }
];

function buildAdaptiveVerticalRows(items) {
  var rows = [], i = 0;
  while (i < items.length) {
    var targetCount = 3;
    var candidate = items.slice(i, i + targetCount);
    if (candidate.reduce(function(s, w) { return s + w.length; }, 0) > 12 && candidate.length > 2) targetCount = 2;
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
var elSelectedConcernChips = document.getElementById('selected-concern-chips');
var surveyCustomInputAnchor = document.getElementById('survey-custom-input-anchor');
var inputCustomKeyword = document.getElementById('input-custom-keyword');
var btnCustomKeywordClear = document.getElementById('btn-custom-keyword-clear');

function typeWriterSurveyTitle(titleHtml, onComplete) {
  clearTimeout(surveyTitleTypeTimer);
  if (!elTitle) return;
  elTitle.innerHTML = "";
  var tokens = titleHtml.match(/(<[^>]+>|[^<])/g) || [];
  var idx = 0, currentContent = "";

  (function nextChar() {
    if (idx < tokens.length) {
      var char = tokens[idx];
      currentContent += char;
      elTitle.innerHTML = currentContent;
      idx++;
      var delay = (char.startsWith('<') ? 0 : (char === '?' || char === '.' ? 350 : 80));
      surveyTitleTypeTimer = setTimeout(nextChar, delay);
    } else if (onComplete) setTimeout(onComplete, 150);
  })();
}

function updateCustomInputBarState() {
  if (!inputCustomKeyword) return;
  var currentCustom = (currentStepIdx === 1) ? (userSelections.q2_custom || "") : "";
  inputCustomKeyword.value = currentCustom;
  if (btnCustomKeywordClear) btnCustomKeywordClear.classList.toggle('hidden', currentCustom.trim().length === 0);
}

function renderSurveyStep() {
  var q = surveyQuestions[currentStepIdx];
  if (!q) return;

  if (elProgressBar) elProgressBar.style.width = (currentStepIdx === 0 ? 25 : (currentStepIdx === 1 ? 50 : 90)) + '%';
  if (btnSurveyPrev) btnSurveyPrev.classList.toggle('invisible', currentStepIdx === 0);
  if (btnSurveyNext) btnSurveyNext.innerText = (currentStepIdx === 2) ? "다음으로" : "다음 질문으로";

  var titleBox = document.querySelector('.survey-title-box');
  if (titleBox) titleBox.style.display = 'flex';

  if (currentStepIdx === 0) {
    stopBubblePhysics(); typeWriterSurveyTitle(q.title);
    if (elDesc) elDesc.innerHTML = q.desc;
    if (surveyChipWrapper) surveyChipWrapper.classList.add('hidden');
    if (elField6) { elField6.classList.add('hidden'); elField6.classList.remove('flex'); }
    if (elField7) { elField7.classList.remove('hidden'); elField7.classList.add('flex'); }
    if (surveyCustomInputAnchor) { surveyCustomInputAnchor.classList.remove('custom-anchor-visible'); surveyCustomInputAnchor.classList.add('custom-anchor-hidden'); }
  } else if (currentStepIdx === 1) {
    stopBubblePhysics(); typeWriterSurveyTitle(q.title);
    if (elDesc) elDesc.innerHTML = q.desc;
    if (surveyChipWrapper) surveyChipWrapper.classList.remove('hidden');
    if (elField6) { elField6.classList.add('hidden'); elField6.classList.remove('flex'); }
    if (elField7) { elField7.classList.add('hidden'); elField7.classList.remove('flex'); }
    if (surveyCustomInputAnchor) { surveyCustomInputAnchor.classList.remove('custom-anchor-hidden'); surveyCustomInputAnchor.classList.add('custom-anchor-visible'); }
    updateCustomInputBarState(); renderVerticalScrollChips();
  } else if (currentStepIdx === 2) {
    typeWriterSurveyTitle(q.title);
    if (elDesc) elDesc.innerHTML = q.desc;
    if (surveyChipWrapper) surveyChipWrapper.classList.add('hidden');
    if (elField7) { elField7.classList.add('hidden'); elField7.classList.remove('flex'); }
    if (surveyCustomInputAnchor) { surveyCustomInputAnchor.classList.remove('custom-anchor-visible'); surveyCustomInputAnchor.classList.add('custom-anchor-hidden'); }
    if (elField6) { elField6.classList.remove('hidden'); elField6.classList.add('flex'); }

    var memoBox = elField6 ? elField6.querySelector('.glass-input-card-v2') : null;
    var memoCounterWrap = memoCounter ? memoCounter.parentElement : null;
    if (memoBox) { memoBox.style.opacity = '1'; memoBox.style.transform = 'translateY(0)'; }
    if (memoCounterWrap) memoCounterWrap.style.opacity = '1';
    if (elSelectedConcernChips) { elSelectedConcernChips.innerHTML = ''; elSelectedConcernChips.style.display = 'none'; }
    startBubblePhysics();
  }
  validateSurveyStep();
  updateDevScreenBadge();
}

function updateChipStyle(chip, isSelected) {
  chip.classList.toggle('chip-selected', isSelected);
  chip.classList.toggle('chip-unselected', !isSelected);
  if (isSelected) {
    chip.style.setProperty('background', '#ffffff', 'important');
    chip.style.setProperty('border', 'none', 'important');
    chip.style.setProperty('color', '#000000', 'important');
    chip.style.setProperty('font-weight', '700', 'important');
    chip.style.setProperty('box-shadow', '0 0 18px 2px rgba(255, 255, 255, 0.5)', 'important');
  } else {
    chip.style.setProperty('background', 'rgba(255, 255, 255, 0.08)', 'important');
    chip.style.setProperty('border', '1px solid rgba(255, 255, 255, 0.14)', 'important');
    chip.style.setProperty('color', '#a3a3a3', 'important');
    chip.style.setProperty('font-weight', '500', 'important');
    chip.style.setProperty('box-shadow', 'none', 'important');
  }
}

function renderVerticalScrollChips() {
  if (!elOrganicContainer || !surveyChipWrapper) return;
  var rows = buildAdaptiveVerticalRows(surveyQuestions[currentStepIdx].options || []);
  elOrganicContainer.innerHTML = ''; surveyChipWrapper.scrollTop = 0;

  rows.forEach(function(rowItems) {
    var rowDiv = document.createElement('div');
    rowDiv.className = 'flex items-center justify-center gap-1.5 w-full';
    rowItems.forEach(function(item) {
      var chip = document.createElement('button');
      chip.type = 'button'; chip.className = 'chip-base'; chip.innerText = item;
      var isSelected = userSelections.q2.indexOf(item) > -1;
      updateChipStyle(chip, isSelected);

      chip.onclick = function() {
        var idx = userSelections.q2.indexOf(item);
        if (idx > -1) userSelections.q2.splice(idx, 1);
        else userSelections.q2.push(item);
        updateChipStyle(chip, userSelections.q2.indexOf(item) > -1);
        validateSurveyStep();
      };
      rowDiv.appendChild(chip);
    });
    elOrganicContainer.appendChild(rowDiv);
  });
}

if (inputCustomKeyword) {
  inputCustomKeyword.oninput = function(e) {
    var val = e.target.value;
    if (currentStepIdx === 1) userSelections.q2_custom = val;
    if (btnCustomKeywordClear) btnCustomKeywordClear.classList.toggle('hidden', val.trim().length === 0);
    validateSurveyStep();
  };
}

if (btnCustomKeywordClear) {
  btnCustomKeywordClear.onclick = function(e) {
    e.stopPropagation();
    if (inputCustomKeyword) { inputCustomKeyword.value = ""; inputCustomKeyword.focus(); }
    if (currentStepIdx === 1) userSelections.q2_custom = "";
    btnCustomKeywordClear.classList.add('hidden');
    validateSurveyStep();
  };
}

function validateSurveyStep() {
  if (!btnSurveyNext) return;
  var isValid = false;
  if (currentStepIdx === 0) isValid = userSelections.q7_name.trim().length > 0;
  else if (currentStepIdx === 1) isValid = userSelections.q2.length > 0 || (userSelections.q2_custom && userSelections.q2_custom.trim().length > 0);
  else if (currentStepIdx === 2) isValid = true;
  btnSurveyNext.disabled = !isValid;
}

if (inputQ6Memo) {
  inputQ6Memo.oninput = function(e) {
    userSelections.q6_memo = e.target.value;
    if (memoCounter) memoCounter.innerText = e.target.value.length + '/50';
    validateSurveyStep();
  };
}

if (inputQ7Name) {
  inputQ7Name.oninput = function(e) {
    userSelections.q7_name = e.target.value.trim();
    if (charCounter) charCounter.innerText = e.target.value.length + '/10';
    validateSurveyStep();
  };
}

if (btnSurveyNext) {
  btnSurveyNext.onclick = function() {
    if (currentStepIdx === 0) { currentStepIdx = 1; renderSurveyStep(); }
    else if (currentStepIdx === 1) {
      if (userSelections.q2_custom && userSelections.q2_custom.trim()) {
        var c = userSelections.q2_custom.trim();
        if (userSelections.q2.indexOf(c) === -1) userSelections.q2.unshift(c);
      }
      if (!userSelections.q2 || userSelections.q2.length === 0) {
        userSelections.q2 = ["비교중독", "수면 부족", "완벽주의 강박", "거절 공포", "텅 빈 잔고", "미래 막막함"];
      }
      showScreen('screen-survey-core-concern');
    } else if (currentStepIdx === 2) {
      showScreen('screen-post-concern-bridge');
    }
  };
}

if (btnSurveyPrev) {
  btnSurveyPrev.onclick = function() {
    if (currentStepIdx === 2) showScreen('screen-survey-concern-reason');
    else if (currentStepIdx === 1) { currentStepIdx = 0; renderSurveyStep(); }
  };
}

// --------------------------------------------------------------------------
// 핵심 고민 화면 시네마틱 플로우
// --------------------------------------------------------------------------
var elCoreConcernTitleWrap = document.getElementById('core-concern-title-wrapper');
var elCoreConcernTitle = document.getElementById('core-concern-title');
var elCoreConcernContainer = document.getElementById('core-concern-scroll-container');
var elCoreConcernGrid = document.getElementById('core-concern-scroll-grid');
var btnCoreConcernNext = document.getElementById('btn-core-concern-next');
var btnCoreConcernPrev = document.getElementById('btn-core-concern-prev');

function calculateRowDistribution(totalCount) {
  if (totalCount <= 0) return [];
  if (totalCount <= 3) return [totalCount];
  if (totalCount === 4) return [2, 2];
  if (totalCount === 5) return [2, 3];
  if (totalCount <= 10) {
    var b3 = Math.floor(totalCount / 3), r3 = totalCount % 3;
    return r3 === 0 ? [b3, b3, b3] : (r3 === 1 ? [b3, b3, b3 + 1] : [b3, b3 + 1, b3 + 1]);
  }
  var b5 = Math.floor(totalCount / 5), r5 = totalCount % 5, rows5 = [b5, b5, b5, b5, b5];
  for (var r = 0; r < r5; r++) rows5[4 - r]++;
  return rows5;
}

function initCoreConcernScreen() {
  clearTimeout(coreConcernTypeTimer);
  if (elCoreConcernTitleWrap) elCoreConcernTitleWrap.classList.remove('moved-to-top');
  if (elCoreConcernTitle) elCoreConcernTitle.innerHTML = "";
  if (elCoreConcernContainer) elCoreConcernContainer.classList.remove('revealed');

  var selectedItems = [].concat(userSelections.q2 || []);
  if (userSelections.q2_custom && userSelections.q2_custom.trim()) {
    var cCustom = userSelections.q2_custom.trim();
    if (selectedItems.indexOf(cCustom) === -1) selectedItems.unshift(cCustom);
  }
  if (selectedItems.length === 0) {
    selectedItems = ["완벽주의 강박", "비교중독", "수면 부족", "거절 공포", "텅 빈 잔고", "미래 막막함"];
    userSelections.q2 = [].concat(selectedItems);
  }
  if (!userSelections.core_concern && selectedItems.length > 0) userSelections.core_concern = selectedItems[0];
  if (btnCoreConcernNext) btnCoreConcernNext.disabled = !userSelections.core_concern;
  if (elCoreConcernGrid) elCoreConcernGrid.innerHTML = '';

  var distribution = calculateRowDistribution(selectedItems.length), itemCursor = 0;
  distribution.forEach(function(countInRow) {
    var rowDiv = document.createElement('div');
    rowDiv.className = 'core-concern-row';
    for (var i = 0; i < countInRow && itemCursor < selectedItems.length; i++) {
      (function() {
        var item = selectedItems[itemCursor];
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'core-concern-text-btn'; btn.innerText = item;
        btn.classList.add(userSelections.core_concern === item ? 'core-concern-selected' : 'core-concern-unselected');

        btn.onclick = function() {
          userSelections.core_concern = item;
          elCoreConcernGrid.querySelectorAll('.core-concern-text-btn').forEach(function(b) {
            b.classList.remove('core-concern-selected'); b.classList.add('core-concern-unselected');
          });
          btn.classList.remove('core-concern-unselected'); btn.classList.add('core-concern-selected');
          if (btnCoreConcernNext) btnCoreConcernNext.disabled = false;
        };
        rowDiv.appendChild(btn); itemCursor++;
      })();
    }
    elCoreConcernGrid.appendChild(rowDiv);
  });

  if (elCoreConcernContainer) {
    setTimeout(function() {
      elCoreConcernContainer.scrollLeft = Math.max(0, (elCoreConcernContainer.scrollWidth - elCoreConcernContainer.clientWidth) / 2);
    }, 50);

    var isDown = false, startXCoord = 0, scrollLeftVal = 0;
    elCoreConcernContainer.onmousedown = function(e) {
      isDown = true; startXCoord = e.pageX - elCoreConcernContainer.offsetLeft; scrollLeftVal = elCoreConcernContainer.scrollLeft;
    };
    elCoreConcernContainer.onmouseleave = function() { isDown = false; };
    elCoreConcernContainer.onmouseup = function() { isDown = false; };
    elCoreConcernContainer.onmousemove = function(e) {
      if (!isDown) return;
      e.preventDefault();
      elCoreConcernContainer.scrollLeft = scrollLeftVal - ((e.pageX - elCoreConcernContainer.offsetLeft) - startXCoord) * 1.5;
    };
  }

  var tokens = "이 중에서 가장 꺼내기 힘든 것은<br>무엇인가요?".match(/(<[^>]+>|[^<])/g) || [];
  var idx = 0, curText = "";
  (function typeNextCoreChar() {
    if (idx < tokens.length) {
      var char = tokens[idx]; curText += char;
      if (elCoreConcernTitle) elCoreConcernTitle.innerHTML = curText;
      idx++;
      coreConcernTypeTimer = setTimeout(typeNextCoreChar, char.startsWith('<') ? 0 : (char === '?' || char === '.' ? 350 : 75));
    } else {
      setTimeout(function() {
        if (elCoreConcernTitleWrap) elCoreConcernTitleWrap.classList.add('moved-to-top');
        setTimeout(function() { if (elCoreConcernContainer) elCoreConcernContainer.classList.add('revealed'); }, 450);
      }, 350);
    }
  })();
}

if (btnCoreConcernNext) btnCoreConcernNext.onclick = function() { if (userSelections.core_concern) showScreen('screen-survey-concern-reason'); };
if (btnCoreConcernPrev) btnCoreConcernPrev.onclick = function() { currentStepIdx = 1; showScreen('screen-survey'); };

// --------------------------------------------------------------------------
// 핵심 고민 이유 작성 화면 로직 (서술 작성)
// --------------------------------------------------------------------------
var elConcernReasonTitle = document.getElementById('concern-reason-title');
var inputConcernReason = document.getElementById('input-concern-reason');
var concernReasonCounter = document.getElementById('concern-reason-counter');
var btnConcernReasonNext = document.getElementById('btn-concern-reason-next');
var btnConcernReasonPrev = document.getElementById('btn-concern-reason-prev');
var elConcernReasonKeywordDisplay = document.getElementById('concern-reason-picked-keyword-display');

function initConcernReasonScreen() {
  clearTimeout(reasonTypeTimer);
  if (elConcernReasonKeywordDisplay) elConcernReasonKeywordDisplay.innerText = userSelections.core_concern || "고민";
  if (elConcernReasonTitle) elConcernReasonTitle.innerHTML = "";

  var tokens = "가장 힘들었던 이유는 무엇인가요?".match(/(<[^>]+>|[^<])/g) || [];
  var idx = 0, cur = "";
  (function typeReasonChar() {
    if (idx < tokens.length) {
      var char = tokens[idx]; cur += char;
      if (elConcernReasonTitle) elConcernReasonTitle.innerHTML = cur;
      idx++;
      reasonTypeTimer = setTimeout(typeReasonChar, char.startsWith('<') ? 0 : (char === '?' || char === '.' ? 320 : 70));
    }
  })();

  if (inputConcernReason) {
    inputConcernReason.value = userSelections.concern_reason || "";
    if (concernReasonCounter) concernReasonCounter.innerText = (userSelections.concern_reason ? userSelections.concern_reason.length : 0) + '/100';
  }
}

if (inputConcernReason) {
  inputConcernReason.oninput = function(e) {
    userSelections.concern_reason = e.target.value;
    if (concernReasonCounter) concernReasonCounter.innerText = e.target.value.length + '/100';
  };
}

if (btnConcernReasonNext) {
  btnConcernReasonNext.onclick = function() { currentStepIdx = 2; showScreen('screen-survey'); };
}
if (btnConcernReasonPrev) {
  btnConcernReasonPrev.onclick = function() { showScreen('screen-survey-core-concern'); };
}

// --------------------------------------------------------------------------
// 말풍선 물리 레이어
// --------------------------------------------------------------------------
var bubbleCanvas = null, bctx = null, bubbleAnimFrameId = null;

function resizeBubblePhysicsCanvas() {
  bubbleCanvas = document.getElementById('bubble-physics-canvas');
  if (!bubbleCanvas || !bubbleCanvas.parentElement) return;
  var rect = bubbleCanvas.parentElement.getBoundingClientRect();
  bubbleCanvas.width = rect.width; bubbleCanvas.height = rect.height;
}

function startBubblePhysics() {
  stopBubblePhysics();
  bubbleCanvas = document.getElementById('bubble-physics-canvas');
  if (!bubbleCanvas) return;
  resizeBubblePhysicsCanvas();
  bctx = bubbleCanvas.getContext('2d');
  if (bctx) bctx.clearRect(0, 0, bubbleCanvas.width, bubbleCanvas.height);
}

function stopBubblePhysics() {
  if (bubbleAnimFrameId) { cancelAnimationFrame(bubbleAnimFrameId); bubbleAnimFrameId = null; }
  if (bubbleCanvas && bctx) bctx.clearRect(0, 0, bubbleCanvas.width, bubbleCanvas.height);
}

// --------------------------------------------------------------------------
// 나비 뷰어 및 인터랙션 로직
// --------------------------------------------------------------------------
var fullScene, fullCamera, fullRenderer, fullGroup, leftWingMesh, rightWingMesh, antennaMesh;
var isFlyingAway = false, animFrameId = null;
var initialRotL = { x: 0, y: 0, z: 0 }, initialRotR = { x: 0, y: 0, z: 0 };
var DEFAULT_ROT_X = 0, DEFAULT_ROT_Y = 0, butterflyRotX = DEFAULT_ROT_X, butterflyRotY = DEFAULT_ROT_Y;
var isUserDragging = false, lastPointerX = 0, lastPointerY = 0, previewStartTime = 0;
var isPressingScreen = false, pressStartTime = 0, isChargeTriggered = false, chargeProgress = 0, chargeVibrateInterval = null;
var particleCanvas = null, pctx = null, energyParticles = [], isFlyingTransitionTriggered = false;

function triggerDeviceVibrate(durationMs, intensity) {
  try {
    if (navigator.vibrate) navigator.vibrate(durationMs || 40);
    else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.haptic) {
      window.webkit.messageHandlers.haptic.postMessage({ type: 'impactMedium' });
    }
  } catch(e) {}
}

async function saveButterflyToSupabase() {
  try {
    specimenButterfliesData.unshift({
      id: Date.now(), name: userSelections.q7_name || '나비',
      wingId: selectedButterflyShape, antId: selectedAntennaType, patternId: selectedPatternId, q1: [],
      core_concern: userSelections.core_concern || (userSelections.q2 && userSelections.q2[0]) || "",
      memo: userSelections.q6_memo || '', textureUrl: currentExtractedTexture,
      date: new Date().toISOString().slice(0, 10).replace(/-/g, '. ')
    });

    if (!supabase) return;
    await supabase.from('butterflies').insert([{
      name: userSelections.q7_name || '이름없는 나비', wing_shape: selectedButterflyShape, antenna_type: selectedAntennaType,
      q1: [], q2: userSelections.q2, core_concern: userSelections.core_concern, q3: [], q4: [], q5: [],
      memo: userSelections.q6_memo || '', revisit_date: null, email: null, texture_url: currentExtractedTexture
    }]);
  } catch (err) { console.error("Supabase 나비 저장 에러:", err); }
}

function initFullButterflyViewer(textureURL) {
  var container = document.getElementById('three-container');
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  if (!container || !window.THREE) return;
  container.innerHTML = ''; container.style.opacity = '1';

  var glowBg = document.querySelector('.preview-ethereal-glow-bg');
  if (glowBg) glowBg.style.opacity = '1';

  var width = window.innerWidth, height = window.innerHeight;
  fullScene = new THREE.Scene();
  fullCamera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
  fullCamera.position.set(0, 0, 8.8); fullCamera.lookAt(0, 0, 0);

  fullRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  fullRenderer.setSize(width, height);
  fullRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(fullRenderer.domElement);

  fullScene.add(new THREE.AmbientLight(0xffffff, 0.95));
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(0, 5, 10); fullScene.add(dirLight);

  var userTexture = new THREE.TextureLoader().load(textureURL);
  userTexture.flipY = false;

  fullGroup = new THREE.Group();
  butterflyRotX = DEFAULT_ROT_X; butterflyRotY = DEFAULT_ROT_Y;
  fullGroup.rotation.set(butterflyRotX, butterflyRotY, 0);
  fullGroup.position.set(0, -7.0, 0);

  previewStartTime = performance.now();
  isFlyingAway = false; isFlyingTransitionTriggered = false; resetChargeState();

  // 3D 블렌더 날개 메시에 텍스처를 1:1 완벽 안착
  var wingMat = new THREE.MeshBasicMaterial({ 
    map: userTexture, 
    side: THREE.DoubleSide, 
    transparent: true, 
    alphaTest: 0.05 
  });
  var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.0 });
  var targetAnt = 'Antenna_' + selectedAntennaType;

  if (window.THREE && THREE.GLTFLoader) {
    try {
      new THREE.GLTFLoader().load('3DButterfly/' + selectedButterflyShape + '.glb', function(gltf) {
        leftWingMesh = null; rightWingMesh = null; antennaMesh = null;
        gltf.scene.traverse(function(child) {
          if (child.isMesh) {
            var n = child.name;
            if (n.startsWith('Wing_L')) { leftWingMesh = child; child.material = wingMat; initialRotL = { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z }; }
            else if (n.startsWith('Wing_R')) { rightWingMesh = child; child.material = wingMat; initialRotR = { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z }; }
            else if (n.startsWith('Body')) { child.material = whiteMat; }
            else if (n.startsWith('Antenna_')) { child.material = whiteMat; child.visible = n.startsWith(targetAnt); if (child.visible) antennaMesh = child; }
          }
        });
        gltf.scene.scale.set(0.76, 0.76, 0.76);
        fullGroup.add(gltf.scene);
      });
    } catch(err) {}
  }

  fullScene.add(fullGroup);
  initEnergyParticleSystem();
  var clock = new THREE.Clock();

  (function animate() {
    animFrameId = requestAnimationFrame(animate);
    var time = clock.getElapsedTime(), now = performance.now(), elapsedSec = (now - previewStartTime) / 1000;

    if (!isUserDragging) {
      butterflyRotX += (DEFAULT_ROT_X - butterflyRotX) * 0.05;
      var diffY = (DEFAULT_ROT_Y - butterflyRotY);
      butterflyRotY += Math.atan2(Math.sin(diffY), Math.cos(diffY)) * 0.05;
    }
    fullGroup.rotation.x = butterflyRotX; fullGroup.rotation.y = butterflyRotY;

    if (isPressingScreen && !isFlyingAway) {
      var pressDuration = (now - pressStartTime) / 1000;
      if (pressDuration >= 2.0) {
        if (!isChargeTriggered) { isChargeTriggered = true; startChargeVibrationLoop(); }
        var currentChargeSec = Math.max(0, pressDuration - 2.0);
        chargeProgress = Math.min(1.0, currentChargeSec / 2.0);
        updateChargeUIAndCamera(chargeProgress, currentChargeSec);
        spawnEnergyParticles();
      }
    }

    if (!isFlyingAway) {
      if (elapsedSec < 3.6) {
        var progress = Math.min(1.0, elapsedSec / 3.6);
        fullGroup.position.y = -7.0 + 7.0 * (1.0 - Math.pow(1.0 - progress, 3));
        var flap = Math.sin(time * 36.0 * (1.0 - progress * 0.65)) * (0.85 * Math.pow(1.0 - progress, 1.4));
        if (leftWingMesh && rightWingMesh) {
          leftWingMesh.rotation.y = initialRotL.y + 0.25 + flap; rightWingMesh.rotation.y = initialRotR.y - 0.25 - flap;
        }
      } else {
        fullGroup.position.y = 0;
        if (leftWingMesh && rightWingMesh) {
          leftWingMesh.rotation.y = initialRotL.y + 0.25; rightWingMesh.rotation.y = initialRotR.y - 0.25;
        }
      }
    } else {
      var flyAngle = Math.sin(time * 26.0) * 0.75;
      if (leftWingMesh && rightWingMesh) {
        leftWingMesh.rotation.y = initialRotL.y + 0.28 + flyAngle; rightWingMesh.rotation.y = initialRotR.y - 0.28 - flyAngle;
      }
      fullGroup.position.y += 0.09; fullGroup.position.z -= 0.04;

      if (fullGroup.position.y > 4.6 && !isFlyingTransitionTriggered) {
        isFlyingTransitionTriggered = true;
        clearTimeout(flightSafetyTimer);
        saveButterflyToSupabase();
        if (container) container.style.opacity = '0';
        var glowBgEl = document.querySelector('.preview-ethereal-glow-bg');
        if (glowBgEl) glowBgEl.style.opacity = '0';
        var headerUIEl = document.getElementById('preview-header-ui');
        if (headerUIEl) headerUIEl.style.opacity = '0';
        var footerUIEl = document.getElementById('preview-footer-ui');
        if (footerUIEl) { footerUIEl.style.setProperty('display', 'none', 'important'); footerUIEl.style.opacity = '0'; }

        var globalCurtain = document.getElementById('cinematic-transition-curtain');
        if (globalCurtain) globalCurtain.classList.add('active-curtain');

        setTimeout(function() {
          showScreen('screen-complete');
          setTimeout(function() { if (globalCurtain) globalCurtain.classList.remove('active-curtain'); }, 80);
          isFlyingAway = false; isFlyingTransitionTriggered = false;
          if (container) container.style.opacity = '1';
          if (glowBgEl) glowBgEl.style.opacity = '1';
          resetChargeState();
        }, 2000);
      }
    }
    renderEnergyParticles();
    fullRenderer.render(fullScene, fullCamera);
  })();
  bindInteractiveEvents(container);
}

function initEnergyParticleSystem() {
  particleCanvas = document.getElementById('energy-particles-canvas');
  if (!particleCanvas) return;
  particleCanvas.width = window.innerWidth; particleCanvas.height = window.innerHeight;
  pctx = particleCanvas.getContext('2d'); energyParticles = [];
}

function spawnEnergyParticles() {
  if (!pctx) return;
  var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  for (var i = 0; i < 2; i++) {
    var angle = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 80;
    energyParticles.push({
      x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * 0.8, vy: -Math.random() * 1.5 - 0.5,
      size: Math.random() * 2.8 + 1.2, alpha: 1.0, decay: Math.random() * 0.015 + 0.01
    });
  }
}

function renderEnergyParticles() {
  if (!pctx || !particleCanvas) return;
  pctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  for (var i = energyParticles.length - 1; i >= 0; i--) {
    var p = energyParticles[i];
    p.x += p.vx; p.y += p.vy; p.alpha -= p.decay;
    if (p.alpha <= 0) { energyParticles.splice(i, 1); continue; }
    pctx.save();
    pctx.fillStyle = 'rgba(255, 255, 255, ' + p.alpha + ')';
    pctx.beginPath(); pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); pctx.fill();
    pctx.restore();
  }
}

function updateChargeUIAndCamera(progress, currentChargeSec) {
  if (isFlyingAway) return;
  var chargeWidget = document.getElementById('energy-charge-widget');
  var innerFill = document.getElementById('charge-inner-fill');
  var headerUI = document.getElementById('preview-header-ui');
  var footerUI = document.getElementById('preview-footer-ui');

  if (chargeWidget) { chargeWidget.classList.remove('hidden'); chargeWidget.style.setProperty('display', 'flex', 'important'); }
  var currentSize = 22 + (96 - 22) * progress;
  if (innerFill) { innerFill.style.width = currentSize + 'px'; innerFill.style.height = currentSize + 'px'; }
  if (fullCamera) fullCamera.position.z = 8.8 - (2.6 * progress);

  if (headerUI) headerUI.style.opacity = Math.max(0, 1.0 - Math.min(1.0, currentChargeSec / 1.5));
  if (footerUI) { footerUI.style.display = 'flex'; footerUI.style.opacity = '1'; }

  var flyLabel = document.getElementById('preview-fly-label');
  if (flyLabel) flyLabel.innerText = progress >= 1.0 ? "위로 쓸어 올려주세요" : "화면을 길게 눌러주세요.";
}

function startChargeVibrationLoop() {
  if (chargeVibrateInterval) clearInterval(chargeVibrateInterval);
  triggerDeviceVibrate(45, 0.6);
  chargeVibrateInterval = setInterval(function() {
    if (!isPressingScreen || !isChargeTriggered || isFlyingAway) {
      clearInterval(chargeVibrateInterval); chargeVibrateInterval = null; return;
    }
    triggerDeviceVibrate(Math.round(25 + (chargeProgress * 60)), 0.4 + (chargeProgress * 0.6));
  }, 110);
}

function resetChargeState() {
  isPressingScreen = false; isChargeTriggered = false; chargeProgress = 0;
  if (chargeVibrateInterval) { clearInterval(chargeVibrateInterval); chargeVibrateInterval = null; }

  var chargeWidget = document.getElementById('energy-charge-widget');
  var innerFill = document.getElementById('charge-inner-fill');
  var headerUI = document.getElementById('preview-header-ui');
  var footerUI = document.getElementById('preview-footer-ui');

  if (chargeWidget) { chargeWidget.classList.add('hidden'); chargeWidget.style.setProperty('display', 'none', 'important'); }
  if (innerFill) { innerFill.style.width = '22px'; innerFill.style.height = '22px'; }
  if (fullCamera) fullCamera.position.z = 8.8;
  if (headerUI) headerUI.style.opacity = 1.0;
  if (footerUI && !isFlyingAway) { footerUI.style.display = 'flex'; footerUI.style.opacity = 1.0; footerUI.style.pointerEvents = 'none'; }

  var flyLabel = document.getElementById('preview-fly-label');
  if (flyLabel) flyLabel.innerText = "화면을 길게 눌러주세요.";
}

function bindInteractiveEvents(targetEl) {
  var touchStartY = 0, touchStartX = 0;
  function handlePointerStart(clientX, clientY) {
    if (isFlyingAway) return;
    isUserDragging = true; lastPointerX = clientX; lastPointerY = clientY; touchStartX = clientX; touchStartY = clientY;
    var chargeWidget = document.getElementById('energy-charge-widget');
    if (chargeWidget) { chargeWidget.style.left = clientX + 'px'; chargeWidget.style.top = clientY + 'px'; }
    isPressingScreen = true; pressStartTime = performance.now();
  }
  function handlePointerMove(clientX, clientY) {
    if (!isUserDragging || isFlyingAway) return;
    var deltaX = clientX - lastPointerX, deltaY = clientY - lastPointerY;
    if (!isChargeTriggered) {
      if (Math.hypot(clientX - touchStartX, clientY - touchStartY) > 15) pressStartTime = performance.now();
      butterflyRotY += deltaX * 0.013;
      butterflyRotX = Math.max(-1.4, Math.min(1.4, butterflyRotX + deltaY * 0.013));
    }
    lastPointerX = clientX; lastPointerY = clientY;
  }
  function handlePointerEnd(clientX, clientY) {
    if (!isUserDragging) return;
    isUserDragging = false;
    var swipeDeltaY = touchStartY - clientY;
    var chargeWidget = document.getElementById('energy-charge-widget');
    if (chargeWidget) { chargeWidget.classList.add('hidden'); chargeWidget.style.setProperty('display', 'none', 'important'); }
    if (chargeVibrateInterval) { clearInterval(chargeVibrateInterval); chargeVibrateInterval = null; }

    if (isChargeTriggered && chargeProgress >= 1.0 && swipeDeltaY > 40 && !isFlyingAway) {
      isFlyingAway = true;
      triggerDeviceVibrate(180, 1.0);
      var footerUI = document.getElementById('preview-footer-ui');
      if (footerUI) { footerUI.style.setProperty('display', 'none', 'important'); footerUI.style.opacity = '0'; footerUI.style.pointerEvents = 'none'; }
      clearTimeout(flightSafetyTimer);
      flightSafetyTimer = setTimeout(function() {
        if (!isFlyingTransitionTriggered) {
          isFlyingTransitionTriggered = true; saveButterflyToSupabase(); showScreen('screen-complete');
        }
      }, 3500);
    } else resetChargeState();
  }

  targetEl.oncontextmenu = function(e) { e.preventDefault(); return false; };
  targetEl.ontouchstart = function(e) { if (e.touches.length === 1) handlePointerStart(e.touches[0].clientX, e.touches[0].clientY); };
  window.addEventListener('touchmove', function(e) { if (isUserDragging && e.touches.length === 1) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  window.addEventListener('touchend', function(e) { if (e.changedTouches.length > 0) handlePointerEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY); }, { passive: true });
  window.addEventListener('touchcancel', function(e) { if (e.changedTouches.length > 0) handlePointerEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY); else resetChargeState(); }, { passive: true });
  targetEl.onmousedown = function(e) { handlePointerStart(e.clientX, e.clientY); };
  window.addEventListener('mousemove', function(e) { if (isUserDragging) handlePointerMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', function(e) { handlePointerEnd(e.clientX, e.clientY); });
}

// --------------------------------------------------------------------------
// 나비 둘러보기 표본실 갤러리 및 검색 필터 로직
// --------------------------------------------------------------------------
var specimenButterfliesData = [];
var specimenContainer = document.getElementById('specimen-items-container');
var gallerySpawnTimers = [];

function renderFilteredGallery(searchQuery) {
  if (!specimenContainer) return;
  specimenContainer.innerHTML = '';
  gallerySpawnTimers.forEach(function(t) { clearTimeout(t); });
  gallerySpawnTimers = [];

  var q = (searchQuery || "").trim().toLowerCase();
  var filteredData = specimenButterfliesData.filter(function(item) {
    if (!q) return true;
    return (item.name || "").toLowerCase().indexOf(q) > -1 || (item.core_concern || "").toLowerCase().indexOf(q) > -1;
  });

  if (filteredData.length === 0) {
    specimenContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: #777777; font-size: 13px;">' +
      (q ? '검색된 나비가 없습니다.' : '아직 날려보낸 나비가 없습니다.<br>첫 번째 나비를 깨워보세요.') + '</div>';
    return;
  }

  var cardElements = [];
  filteredData.forEach(function(item) {
    var wing = butterflyPathData[item.wingId] || wingDataset[0];
    var ant = antennaDataset.find(function(a) { return a.id === item.antId; }) || antennaDataset[0];
    var card = document.createElement('div');
    card.className = 'specimen-card-item';
    var rawName = item.name || "나비";
    var displayName = rawName.length > 10 ? rawName.slice(0, 10) + '...' : rawName;

    card.innerHTML = 
      '<div class="specimen-butterfly-wrap"><div class="specimen-pin-head"></div>' +
      '<svg class="specimen-shadow-drop" width="130" height="110" viewBox="0 0 ' + wing.w + ' ' + wing.h + '" style="overflow: visible;">' +
      '<path d="' + wing.d + '" fill="#ffffff" stroke="none"/><g transform="translate(' + wing.headX + ',' + wing.headY + ')" color="#ffffff">' +
      ant.render((110 / Math.max(wing.w, wing.h)) * 0.95) + '</g></svg></div>' +
      '<div class="specimen-pill-label"><span class="label-text" title="' + rawName + '">' + displayName + '</span></div>';

    card.onclick = function(e) {
      e.stopPropagation();
      if (specimenContainer) specimenContainer.querySelectorAll('.specimen-pill-label').forEach(function(l) { l.classList.remove('active-touched'); });
      var curLbl = card.querySelector('.specimen-pill-label');
      if (curLbl) curLbl.classList.add('active-touched');
      openSpecimen3DModal(item, item.textureUrl || createFallbackDummyTexture('#ffffff', '#e0e0e0'));
    };
    specimenContainer.appendChild(card);
    cardElements.push(card);
  });

  cardElements.forEach(function(cardEl, idx) {
    var timer = setTimeout(function() { if (cardEl) cardEl.classList.add('revealed'); }, idx * 60);
    gallerySpawnTimers.push(timer);
  });
}

var gallerySearchInput = document.getElementById('gallery-search-input');
if (gallerySearchInput) gallerySearchInput.oninput = function(e) { renderFilteredGallery(e.target.value); };

async function initSpecimenGallery() {
  if (gallerySearchInput) gallerySearchInput.value = "";
  if (supabase) {
    try {
      var res = await supabase.from('butterflies').select('*').order('id', { ascending: false }).limit(50);
      if (res.data && res.data.length > 0) {
        specimenButterfliesData = res.data.map(function(item) {
          return {
            id: item.id, name: item.name || "나비", wingId: item.wing_shape || "crescent", antId: item.antenna_type || "ball",
            q1: [], core_concern: item.core_concern || "", memo: item.memo || "", textureUrl: item.texture_url || null,
            date: item.created_at ? new Date(item.created_at).toISOString().slice(0, 10).replace(/-/g, '. ') : "2026. 10. 24"
          };
        });
      }
    } catch (err) { console.error("Supabase 데이터 조회 오류:", err); }
  }
  renderFilteredGallery("");
}

// --------------------------------------------------------------------------
// 3D 표본실 모달
// --------------------------------------------------------------------------
var modalThreeScene, modalThreeCamera, modalThreeRenderer, modalGroup, modalWingL, modalWingR, modalAnimFrameId = null;

function openSpecimen3DModal(item, textureUrl) {
  var modal = document.getElementById('specimen-detail-modal');
  var nameEl = document.getElementById('modal-butterfly-name');
  var tagsEl = document.getElementById('modal-specimen-tags');
  var memoEl = document.getElementById('modal-specimen-memo');
  var dateEl = document.getElementById('modal-specimen-date');
  var container = document.getElementById('specimen-three-container');

  if (nameEl) nameEl.innerText = '‘' + item.name + '’';
  if (tagsEl) {
    var coreTag = item.core_concern || (item.tags && item.tags[item.tags.length - 1]);
    tagsEl.innerHTML = coreTag ? '<span class="specimen-glass-pill bg-white text-black font-bold border-white" style="box-shadow: 0 0 12px rgba(255, 255, 255, 0.45);">#' + coreTag + '</span>' : '';
  }
  if (memoEl) memoEl.innerText = (item.memo || item.q6_memo) ? ('"' + (item.memo || item.q6_memo) + '"') : '"너의 찬란한 날갯짓을 응원해."';
  if (dateEl) dateEl.innerText = item.date || "2026. 10. 24";
  if (modal) modal.classList.remove('hidden');

  if (modalAnimFrameId) { cancelAnimationFrame(modalAnimFrameId); modalAnimFrameId = null; }
  var res = setupCommon3DScene(container, 7.3, -0.35);
  if (!res) return;
  modalThreeScene = res.scene; modalThreeCamera = res.camera; modalThreeRenderer = res.renderer;

  var tex = new THREE.TextureLoader().load(textureUrl);
  tex.flipY = false;
  var wingMat = new THREE.MeshBasicMaterial({ 
    map: tex, 
    side: THREE.DoubleSide, 
    transparent: true, 
    alphaTest: 0.05 
  });
  var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.3 });

  modalGroup = new THREE.Group();
  modalGroup.position.set(0, -0.35, 0);

  loadButterflyModel(modalGroup, item.wingId, item.antId, wingMat, whiteMat, 0.88, function(l, r) {
    modalWingL = l; modalWingR = r;
  });
  modalThreeScene.add(modalGroup);

  var clock = new THREE.Clock();
  (function modalAnimate() {
    modalAnimFrameId = requestAnimationFrame(modalAnimate);
    var t = clock.getElapsedTime(), flap = Math.sin(t * 6.5) * 0.45;
    if (modalWingL && modalWingR) { modalWingL.rotation.y = flap; modalWingR.rotation.y = -flap; }
    modalGroup.rotation.y = Math.sin(t * 0.8) * 0.35;
    modalGroup.position.y = -0.35 + Math.sin(t * 2.0) * 0.08;
    modalThreeRenderer.render(modalThreeScene, modalThreeCamera);
  })();
}

var btnCloseSpecimenModal = document.getElementById('btn-close-specimen-modal');
if (btnCloseSpecimenModal) {
  btnCloseSpecimenModal.onclick = function() {
    var modal = document.getElementById('specimen-detail-modal');
    if (modal) modal.classList.add('hidden');
    if (modalAnimFrameId) { cancelAnimationFrame(modalAnimFrameId); modalAnimFrameId = null; }
  };
}

// 앱 시작
updateDevScreenBadge();