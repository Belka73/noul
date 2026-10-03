/* ==========================================================================
   🌟 너울(Noul) 메인 애플리케이션 로직 (app.js)
   - [DEV 완벽 복원]: 브라우저 전역 클릭 위임 라우터
   - [로딩 화면]: 사용자가 선택한 3D 나비 순백색(패턴 미적용) + 살짝 왼쪽 아래 이동 + 30초 로딩
   - [완료 화면]: 타이핑 완료 후 2초 후 자동 이동
   - [공유 화면]: 상단/중앙에 선명한 3D 나비 + 문장 및 공유 버튼 바
   - [대사/흐름 수정]: 1번, 2번, 3번, 4번 이후 신규 화면, 5번 키워드 글로우 단독 표시 반영
   - [수정 완료]: 마음속 진입 브릿지(2번 사진) 이후 '고민 다중 선택 알약 화면' 정상 연동
   - [수정 완료]: 1번 사진(이유 작성) 직후 '당신에 대해 잘 알게 됐어요...' 브릿지 화면 연동
   - [버그 해결]: 브릿지 화면("마지막 온기를 채울 차례예요") 직후 "다정한 한마디 적기" 화면 정상 렌더링 복원
   - [버그 해결]: 브릿지 함수 중복 선언 제거 및 프리뷰 비행 후 완료 화면 전환 안전장치 추가
   ========================================================================== */

var ALL_SCREENS = [
  'screen-cover',
  'screen-menu',
  'screen-gallery',
  'screen-intro',
  'screen-opening',
  'screen-survey',
  'screen-post-survey-intro',
  'screen-survey-core-concern',
  'screen-survey-concern-reason',
  'screen-post-concern-bridge',
  'screen-capture-guide',
  'screen-shape-select',
  'screen-survey-bridge',
  'screen-loading',
  'screen-preview',
  'screen-complete',
  'screen-share'
];

// DEV 네비게이션 및 전역 상태 변수
var showcaseInterval = null;
var currentStepIdx = 0; // 0: 이름, 1: 성향, 2: 고민다중, 3: 위로메모
var userSelections = { q1: [], q2: [], q1_custom: "", q2_custom: "", core_concern: "", concern_reason: "", q6_memo: "", q7_name: "" };

var completeTypeTimer = null;
var shareTypeTimer = null;
var autoTransitionTimer = null;
var reasonTypeTimer = null;
var postSurveyTypeTimer = null;
var postConcernTypeTimer = null;
var flightSafetyTimer = null;

function showScreen(screenId) {
  clearTimeout(typeTimer);
  clearTimeout(guideTypeTimer);
  clearTimeout(surveyTitleTypeTimer);
  clearTimeout(coreConcernTypeTimer);
  clearTimeout(reasonTypeTimer);
  clearTimeout(openingDelayTimer);
  clearTimeout(completeTypeTimer);
  clearTimeout(shareTypeTimer);
  clearTimeout(autoTransitionTimer);
  clearTimeout(postSurveyTypeTimer);
  clearTimeout(postConcernTypeTimer);
  clearTimeout(flightSafetyTimer);

  document.querySelectorAll('.screen').forEach(function(s) {
    s.classList.remove('active');
  });

  var target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    try {
      if (screenId === 'screen-cover') {
        stopBubblePhysics();
        stopLoading3DScene();
        stopShare3DScene();
      } else if (screenId === 'screen-opening') {
        stopBubblePhysics();
        stopLoading3DScene();
        stopShare3DScene();
        resetOpeningFlow();
      } else if (screenId === 'screen-survey') {
        stopLoading3DScene();
        stopShare3DScene();
        renderSurveyStep();
      } else if (screenId === 'screen-post-survey-intro') {
        stopBubblePhysics();
        stopLoading3DScene();
        stopShare3DScene();
        initPostSurveyIntroScreen();
      } else if (screenId === 'screen-survey-core-concern') {
        stopBubblePhysics();
        stopLoading3DScene();
        stopShare3DScene();
        initCoreConcernScreen();
      } else if (screenId === 'screen-survey-concern-reason') {
        stopBubblePhysics();
        stopLoading3DScene();
        stopShare3DScene();
        initConcernReasonScreen();
      } else if (screenId === 'screen-post-concern-bridge') {
        stopBubblePhysics();
        stopLoading3DScene();
        stopShare3DScene();
        initPostConcernBridgeScreen();
      } else if (screenId === 'screen-capture-guide') {
        stopBubblePhysics();
        stopLoading3DScene();
        stopShare3DScene();
        startCaptureGuideCinematicFlow();
      } else if (screenId === 'screen-shape-select') {
        stopBubblePhysics();
        stopLoading3DScene();
        stopShare3DScene();
        switchTab('wing');
        updateHeroPreview();
        drawAlignCanvas();
      } else if (screenId === 'screen-gallery') {
        stopBubblePhysics();
        stopLoading3DScene();
        stopShare3DScene();
        initSpecimenGallery();
      } else if (screenId === 'screen-survey-bridge') {
        stopBubblePhysics();
        stopLoading3DScene();
        stopShare3DScene();
        playBridgeTypingSequence();
      } else if (screenId === 'screen-loading') {
        stopBubblePhysics();
        stopShare3DScene();
      } else if (screenId === 'screen-complete') {
        stopLoading3DScene();
        stopShare3DScene();
        playCompleteScreenSequence();
      } else if (screenId === 'screen-share') {
        stopLoading3DScene();
        initShare3DScene();
        playShareScreenSequence();
      } else {
        stopBubblePhysics();
        stopLoading3DScene();
        stopShare3DScene();
      }
    } catch(e) {
      console.warn("화면 진입 시각효과 경고:", e);
    }
  }
  updateDevScreenBadge();
}

// 검은색 페이드 인/아웃 전환 헬퍼 함수
function transitionToScreenWithFade(targetScreenId) {
  var curtain = document.getElementById('cinematic-transition-curtain');
  if (!curtain) {
    showScreen(targetScreenId);
    return;
  }

  curtain.classList.add('active-curtain');
  setTimeout(function() {
    showScreen(targetScreenId);
    requestAnimationFrame(function() {
      setTimeout(function() {
        curtain.classList.remove('active-curtain');
      }, 50);
    });
  }, 320);
}

function updateDevScreenBadge() {
  var badge = document.getElementById('dev-current-screen-badge');
  if (!badge) return;
  var activeScreen = document.querySelector('.screen.active');
  var name = activeScreen ? activeScreen.id : 'none';
  if (name === 'screen-opening') {
    name += ' (' + openingCurrentStep + '/4: 오프닝대사)';
  } else if (name === 'screen-survey') {
    if (currentStepIdx === 0) name += ' (1/4: 이름)';
    else if (currentStepIdx === 1) name += ' (2/4: 성향)';
    else if (currentStepIdx === 2) name += ' (3/4: 고민선택)';
    else if (currentStepIdx === 3) name += ' (4/4: 위로메모)';
  } else if (name === 'screen-post-survey-intro') {
    name += ' (마음속진입)';
  } else if (name === 'screen-survey-core-concern') {
    name += ' (핵심고민)';
  } else if (name === 'screen-survey-concern-reason') {
    name += ' (고민이유)';
  } else if (name === 'screen-post-concern-bridge') {
    name += ' (나비전환브릿지)';
  } else if (name === 'screen-survey-bridge') {
    name += ' (온기충전브릿지)';
  }
  badge.innerText = '화면: ' + name;
}

// --------------------------------------------------------------------------
// 🌟 로딩 화면용 3D 블러 나비 씬
// --------------------------------------------------------------------------
var loadingScene, loadingCamera, loadingRenderer, loadingGroup;
var loadingWingL, loadingWingR;
var loadingAnimFrameId = null;

function initLoading3DScene() {
  stopLoading3DScene();
  var container = document.getElementById('loading-three-container');
  if (!container || !window.THREE) return;
  container.innerHTML = '';

  var w = window.innerWidth;
  var h = window.innerHeight;

  loadingScene = new THREE.Scene();
  loadingCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
  loadingCamera.position.set(0, 0, 7.5);
  loadingCamera.lookAt(0, 0, 0);

  loadingRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  loadingRenderer.setSize(w, h);
  loadingRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(loadingRenderer.domElement);

  var amb = new THREE.AmbientLight(0xffffff, 1.0);
  loadingScene.add(amb);
  var dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(3, 6, 8);
  loadingScene.add(dir);

  var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.35 });

  var shapeId = selectedButterflyShape || 'crescent';
  var antId = selectedAntennaType || 'ball';
  var modelPath = '3DButterfly/' + shapeId + '.glb';
  var targetAntennaPrefix = 'Antenna_' + antId;

  loadingGroup = new THREE.Group();
  loadingGroup.rotation.set(0.25, -0.8, 0.35);
  loadingGroup.position.set(-0.28, -0.22, 0);

  if (window.THREE && THREE.GLTFLoader) {
    try {
      new THREE.GLTFLoader().load(modelPath, function(gltf) {
        var model = gltf.scene;
        loadingWingL = null; loadingWingR = null;

        model.traverse(function(child) {
          if (child.isMesh) {
            var name = child.name;
            if (name.startsWith('Wing_L')) { loadingWingL = child; child.material = whiteMat; }
            else if (name.startsWith('Wing_R')) { loadingWingR = child; child.material = whiteMat; }
            else if (name.startsWith('Body')) { child.material = whiteMat; }
            else if (name.startsWith('Antenna_')) { child.material = whiteMat; child.visible = name.startsWith(targetAntennaPrefix); }
          }
        });

        model.scale.set(0.95, 0.95, 0.95);
        loadingGroup.add(model);
      }, undefined, function() {});
    } catch(err) {}
  }

  loadingScene.add(loadingGroup);
  var clock = new THREE.Clock();

  function animateLoading() {
    loadingAnimFrameId = requestAnimationFrame(animateLoading);
    var t = clock.getElapsedTime();
    var flap = Math.sin(t * 7.5) * 0.42;

    if (loadingWingL && loadingWingR) {
      loadingWingL.rotation.y = flap;
      loadingWingR.rotation.y = -flap;
    }
    loadingGroup.position.y = -0.22 + Math.sin(t * 2.2) * 0.08;
    loadingGroup.rotation.z = 0.35 + Math.sin(t * 1.5) * 0.04;

    loadingRenderer.render(loadingScene, loadingCamera);
  }
  animateLoading();
}

function stopLoading3DScene() {
  if (loadingAnimFrameId) {
    cancelAnimationFrame(loadingAnimFrameId);
    loadingAnimFrameId = null;
  }
  var container = document.getElementById('loading-three-container');
  if (container) container.innerHTML = '';
}

// --------------------------------------------------------------------------
// 🌟 공유 화면용 선명한 3D 나비 씬
// --------------------------------------------------------------------------
var shareScene, shareCamera, shareRenderer, shareGroup;
var shareWingL, shareWingR;
var shareAnimFrameId = null;

function initShare3DScene() {
  stopShare3DScene();
  var container = document.getElementById('share-three-container');
  if (!container || !window.THREE) return;
  container.innerHTML = '';

  var w = window.innerWidth;
  var h = window.innerHeight;

  shareScene = new THREE.Scene();
  shareCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
  shareCamera.position.set(0, 0, 7.5);
  shareCamera.lookAt(0, 0, 0);

  shareRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  shareRenderer.setSize(w, h);
  shareRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(shareRenderer.domElement);

  var amb = new THREE.AmbientLight(0xffffff, 1.05);
  shareScene.add(amb);
  var dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(3, 6, 8);
  shareScene.add(dir);

  var texUrl = currentExtractedTexture || createFallbackDummyTexture('#ffffff', '#cfcfcf');
  var tex = new THREE.TextureLoader().load(texUrl);
  tex.flipY = false;

  var wingMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.35 });

  var shapeId = selectedButterflyShape || 'crescent';
  var antId = selectedAntennaType || 'ball';
  var modelPath = '3DButterfly/' + shapeId + '.glb';
  var targetAntennaPrefix = 'Antenna_' + antId;

  shareGroup = new THREE.Group();
  shareGroup.rotation.set(0.25, -0.8, 0.35);
  shareGroup.position.set(0, 0.45, 0);

  if (window.THREE && THREE.GLTFLoader) {
    try {
      new THREE.GLTFLoader().load(modelPath, function(gltf) {
        var model = gltf.scene;
        shareWingL = null; shareWingR = null;

        model.traverse(function(child) {
          if (child.isMesh) {
            var name = child.name;
            if (name.startsWith('Wing_L')) { shareWingL = child; child.material = wingMat; }
            else if (name.startsWith('Wing_R')) { shareWingR = child; child.material = wingMat; }
            else if (name.startsWith('Body')) { child.material = whiteMat; }
            else if (name.startsWith('Antenna_')) { child.material = whiteMat; child.visible = name.startsWith(targetAntennaPrefix); }
          }
        });

        model.scale.set(0.68, 0.68, 0.68);
        shareGroup.add(model);
      }, undefined, function() {});
    } catch(err) {}
  }

  shareScene.add(shareGroup);
  var clock = new THREE.Clock();

  function animateShare() {
    shareAnimFrameId = requestAnimationFrame(animateShare);
    var t = clock.getElapsedTime();
    var flap = Math.sin(t * 7.5) * 0.42;

    if (shareWingL && shareWingR) {
      shareWingL.rotation.y = flap;
      shareWingR.rotation.y = -flap;
    }
    shareGroup.position.y = 0.45 + Math.sin(t * 2.2) * 0.08;
    shareGroup.rotation.z = 0.35 + Math.sin(t * 1.5) * 0.04;

    shareRenderer.render(shareScene, shareCamera);
  }
  animateShare();
}

function stopShare3DScene() {
  if (shareAnimFrameId) {
    cancelAnimationFrame(shareAnimFrameId);
    shareAnimFrameId = null;
  }
  var container = document.getElementById('share-three-container');
  if (container) container.innerHTML = '';
}

// --------------------------------------------------------------------------
// 🌟 로딩 진행바 시퀀스
// --------------------------------------------------------------------------
function startAnswerShowcaseSequence() {
  if (showcaseInterval) { clearInterval(showcaseInterval); showcaseInterval = null; }
  
  initLoading3DScene();

  var pBar = document.getElementById('generation-progress-bar');
  var progress = 0;
  if (pBar) pBar.style.width = '0%';

  var intervalDelay = 100;
  var stepIncrease = 100 / (30000 / intervalDelay);

  showcaseInterval = setInterval(function() {
    progress += stepIncrease;
    if (pBar) pBar.style.width = Math.min(100, progress) + '%';

    if (progress >= 100) {
      clearInterval(showcaseInterval);
      showcaseInterval = null;

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
              ? userSelections.q6_memo.trim() 
              : "너의 찬란한 날갯짓을 응원해.";
          }

          initFullButterflyViewer(currentExtractedTexture || createFallbackDummyTexture());
          showScreen('screen-preview');

          setTimeout(function() {
            if (whiteFlash) whiteFlash.classList.remove('flash-active');
          }, 1200);
        }, 1400);
      }, 1000);
    }
  }, intervalDelay);
}

// --------------------------------------------------------------------------
// 🌟 완료 화면 및 공유 화면 시퀀스
// --------------------------------------------------------------------------
function playCompleteScreenSequence() {
  clearTimeout(completeTypeTimer);
  clearTimeout(autoTransitionTimer);

  var titleEl = document.getElementById('complete-typing-title');
  if (!titleEl) return;
  titleEl.innerHTML = "";

  var rawName = userSelections.q7_name ? userSelections.q7_name.trim() : "나비";
  var targetText = "하늘로 '" + rawName + "'이<br>너울 속으로 날아 올랐습니다.";

  typeWriterText(titleEl, targetText, function() {
    autoTransitionTimer = setTimeout(function() {
      transitionToScreenWithFade('screen-share');
    }, 2000);
  });
}

function playShareScreenSequence() {
  clearTimeout(shareTypeTimer);

  var titleEl = document.getElementById('share-typing-title');
  var bottomDock = document.getElementById('share-bottom-dock');
  if (!titleEl) return;
  titleEl.innerHTML = "";
  if (bottomDock) bottomDock.style.opacity = '0';

  var targetText = "당신의 나비를 더 멀리 날려보세요.";

  typeWriterText(titleEl, targetText, function() {
    if (bottomDock) {
      bottomDock.style.opacity = '1';
    }
  });
}

var btnActionShare = document.getElementById('btn-action-share');
if (btnActionShare) {
  btnActionShare.onclick = function() {
    var rawName = userSelections.q7_name ? userSelections.q7_name.trim() : "나비";
    var rawMemo = userSelections.q6_memo && userSelections.q6_memo.trim().length > 0
      ? userSelections.q6_memo.trim()
      : "너의 찬란한 날갯짓을 응원해.";
    var rawShape = selectedButterflyShape || "crescent";

    var baseUrl = window.location.href.split('?')[0].replace(/index\.html$/, '');
    if (!baseUrl.endsWith('/')) baseUrl += '/';
    var shareCardUrl = baseUrl + 'share.html?name=' + encodeURIComponent(rawName) +
                       '&memo=' + encodeURIComponent(rawMemo) +
                       '&shape=' + encodeURIComponent(rawShape);

    var shareData = {
      title: '너울(Noul) - ' + rawName,
      text: "내가 빚은 나비 '" + rawName + "'(이)가 도착했습니다.",
      url: shareCardUrl
    };

    if (navigator.share) {
      navigator.share(shareData).catch(function() {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareCardUrl).then(function() {
        alert("나비 초대장 링크가 클립보드에 복사되었습니다!");
      }).catch(function() {
        alert("링크 복사에 실패했습니다.");
      });
    } else {
      alert("공유를 지원하지 않는 브라우저입니다.");
    }
  };
}

var btnActionHome = document.getElementById('btn-action-home');
if (btnActionHome) {
  btnActionHome.onclick = function() {
    location.reload();
  };
}

// --------------------------------------------------------------------------
// DEV 전역 이벤트 위임 바인딩
// --------------------------------------------------------------------------
document.addEventListener('click', function(e) {
  var target = e.target;
  if (!target) return;

  var btnNext = target.closest('#dev-btn-skip-next');
  var btnPrev = target.closest('#dev-btn-skip-prev');

  if (btnNext) {
    e.preventDefault();
    e.stopPropagation();

    clearTimeout(typeTimer);
    clearTimeout(guideTypeTimer);
    clearTimeout(surveyTitleTypeTimer);
    clearTimeout(coreConcernTypeTimer);
    clearTimeout(reasonTypeTimer);
    clearTimeout(openingDelayTimer);
    clearTimeout(completeTypeTimer);
    clearTimeout(shareTypeTimer);
    clearTimeout(autoTransitionTimer);
    clearTimeout(postSurveyTypeTimer);
    clearTimeout(postConcernTypeTimer);
    clearTimeout(flightSafetyTimer);

    if (showcaseInterval) { clearInterval(showcaseInterval); showcaseInterval = null; }
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }

    var activeScreen = document.querySelector('.screen.active');
    var curId = activeScreen ? activeScreen.id : 'screen-cover';

    if (curId === 'screen-opening') {
      if (openingCurrentStep === 1) {
        openingCurrentStep = 2;
        if (elOpeningNextGroup) {
          elOpeningNextGroup.classList.remove('visible');
          elOpeningNextGroup.classList.add('hidden');
        }
        typeWriterText(elOpeningText, "꺼내어 보이지 못한 채,<br>응어리진 무언가... 쉽게 털어놓지 못할 것도 있겠지요.", function() {
          if (btnOpeningNext) btnOpeningNext.innerHTML = "다음으로";
          if (elOpeningNextGroup) {
            elOpeningNextGroup.classList.remove('hidden');
            requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); });
          }
        });
        updateDevScreenBadge();
        return;
      } else if (openingCurrentStep === 2) {
        openingCurrentStep = 3;
        if (elOpeningNextGroup) {
          elOpeningNextGroup.classList.remove('visible');
          elOpeningNextGroup.classList.add('hidden');
        }
        typeWriterText(elOpeningText, "오늘 이곳에서,<br>당신의 마음 깊은 곳에 묻어둔 이야기를<br>조심스레 꺼내어보려 합니다.", function() {
          if (btnOpeningNext) btnOpeningNext.innerHTML = "다음으로";
          if (elOpeningNextGroup) {
            elOpeningNextGroup.classList.remove('hidden');
            requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); });
          }
        });
        updateDevScreenBadge();
        return;
      } else if (openingCurrentStep === 3) {
        openingCurrentStep = 4;
        if (elOpeningNextGroup) {
          elOpeningNextGroup.classList.remove('visible');
          elOpeningNextGroup.classList.add('hidden');
        }
        typeWriterText(elOpeningText, "먼저 당신에 대해<br>몇 가지 알려주세요.", function() {
          if (btnOpeningNext) btnOpeningNext.innerHTML = "다음으로";
          if (elOpeningNextGroup) {
            elOpeningNextGroup.classList.remove('hidden');
            requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); });
          }
        });
        updateDevScreenBadge();
        return;
      } else if (openingCurrentStep === 4) {
        currentStepIdx = 0;
        showScreen('screen-survey');
        return;
      }
    }

    if (curId === 'screen-survey') {
      if (currentStepIdx === 0) {
        if (!userSelections.q7_name) userSelections.q7_name = "테스트나비";
        currentStepIdx = 1;
        renderSurveyStep();
        return;
      } else if (currentStepIdx === 1) {
        if (userSelections.q1.length === 0) userSelections.q1 = ["야행성", "사색가"];
        showScreen('screen-post-survey-intro');
        return;
      } else if (currentStepIdx === 2) {
        if (userSelections.q2.length === 0) userSelections.q2 = ["완벽주의 강박", "비교중독", "수면 부족", "거절 공포", "텅 빈 잔고", "미래 막막함"];
        showScreen('screen-survey-core-concern');
        return;
      } else if (currentStepIdx === 3) {
        exportAlignedTexture();
        showScreen('screen-loading');
        startAnswerShowcaseSequence();
        return;
      }
    } else if (curId === 'screen-post-survey-intro') {
      currentStepIdx = 2;
      showScreen('screen-survey');
      return;
    } else if (curId === 'screen-survey-core-concern') {
      if (!userSelections.core_concern && userSelections.q2.length > 0) {
        userSelections.core_concern = userSelections.q2[0];
      }
      showScreen('screen-survey-concern-reason');
      return;
    } else if (curId === 'screen-survey-concern-reason') {
      if (!userSelections.concern_reason) {
        userSelections.concern_reason = "항상 잘 해내야 한다는 마음이 앞서서요.";
      }
      showScreen('screen-post-concern-bridge');
      return;
    } else if (curId === 'screen-post-concern-bridge') {
      showScreen('screen-capture-guide');
      return;
    } else if (curId === 'screen-capture-guide') {
      showScreen('screen-shape-select');
      return;
    } else if (curId === 'screen-shape-select') {
      exportAlignedTexture();
      showScreen('screen-survey-bridge');
      return;
    } else if (curId === 'screen-survey-bridge') {
      currentStepIdx = 3;
      showScreen('screen-survey');
      return;
    }

    var curIdx = ALL_SCREENS.indexOf(curId);
    if (curIdx === -1) curIdx = 0;
    var nextIdx = (curIdx + 1) % ALL_SCREENS.length;
    var targetId = ALL_SCREENS[nextIdx];

    if (targetId === 'screen-survey') {
      currentStepIdx = 0;
    } else if (targetId === 'screen-survey-core-concern') {
      if (userSelections.q2.length === 0) userSelections.q2 = ["완벽주의 강박", "비교중독", "수면 부족", "거절 공포", "텅 빈 잔고", "미래 막막함"];
    } else if (targetId === 'screen-shape-select') {
      setTimeout(function() {
        if (alignCanvas && actx) {
          actx.fillStyle = "#ffffff";
          actx.fillRect(0, 0, alignCanvas.width, alignCanvas.height);
          actx.fillStyle = "#222222";
          actx.beginPath();
          actx.arc(300, 300, 140, 0, Math.PI * 2);
          drawAlignCanvas();
        }
      }, 30);
    } else if (targetId === 'screen-loading') {
      if (!userSelections.q7_name) userSelections.q7_name = "테스트나비";
      if (userSelections.q1.length === 0) userSelections.q1 = ["야행성", "사색가"];
      if (userSelections.q2.length === 0) userSelections.q2 = ["완벽주의 강박", "비교중독"];
      if (!userSelections.core_concern) userSelections.core_concern = "완벽주의 강박";
      if (!userSelections.q6_memo) userSelections.q6_memo = "모든 순간이 찬란하기를.";
      exportAlignedTexture();
      startAnswerShowcaseSequence();
    } else if (targetId === 'screen-preview') {
      var butterflyName = userSelections.q7_name ? userSelections.q7_name.trim() : "나비";
      var nameHeader = document.getElementById('preview-butterfly-name');
      if (nameHeader) nameHeader.innerText = '‘' + butterflyName + '’';

      var guideText = document.getElementById('preview-guide-text');
      if (guideText) {
        guideText.innerText = userSelections.q6_memo && userSelections.q6_memo.trim().length > 0 
              ? userSelections.q6_memo.trim() 
              : "너의 찬란한 날갯짓을 응원해.";
      }

      initFullButterflyViewer(currentExtractedTexture || createFallbackDummyTexture());
    }

    showScreen(targetId);
    return;
  }

  if (btnPrev) {
    e.preventDefault();
    e.stopPropagation();

    clearTimeout(typeTimer);
    clearTimeout(guideTypeTimer);
    clearTimeout(surveyTitleTypeTimer);
    clearTimeout(coreConcernTypeTimer);
    clearTimeout(reasonTypeTimer);
    clearTimeout(openingDelayTimer);
    clearTimeout(completeTypeTimer);
    clearTimeout(shareTypeTimer);
    clearTimeout(autoTransitionTimer);
    clearTimeout(postSurveyTypeTimer);
    clearTimeout(postConcernTypeTimer);
    clearTimeout(flightSafetyTimer);

    if (showcaseInterval) { clearInterval(showcaseInterval); showcaseInterval = null; }
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }

    var activeScreen = document.querySelector('.screen.active');
    var curId = activeScreen ? activeScreen.id : 'screen-cover';

    if (curId === 'screen-opening') {
      if (openingCurrentStep === 4) {
        openingCurrentStep = 3;
        typeWriterText(elOpeningText, "오늘 이곳에서,<br>당신의 마음 깊은 곳에 묻어둔 이야기를<br>조심스레 꺼내어보려 합니다.", function() {
          if (btnOpeningNext) btnOpeningNext.innerHTML = "다음으로";
        });
        updateDevScreenBadge();
        return;
      } else if (openingCurrentStep === 3) {
        openingCurrentStep = 2;
        typeWriterText(elOpeningText, "꺼내어 보이지 못한 채,<br>응어리진 무언가... 쉽게 털어놓지 못할 것도 있겠지요.", function() {
          if (btnOpeningNext) btnOpeningNext.innerHTML = "다음으로";
        });
        updateDevScreenBadge();
        return;
      } else if (openingCurrentStep === 2) {
        openingCurrentStep = 1;
        typeWriterText(elOpeningText, "안녕하세요?<br>지금, 걱정 없는 삶을 살아가고 있나요?", function() {
          if (btnOpeningNext) btnOpeningNext.innerHTML = "다음으로";
        });
        updateDevScreenBadge();
        return;
      } else if (openingCurrentStep === 1) {
        showScreen('screen-intro');
        return;
      }
    }

    if (curId === 'screen-survey') {
      if (currentStepIdx === 3) {
        showScreen('screen-survey-bridge');
        return;
      } else if (currentStepIdx === 2) {
        showScreen('screen-post-survey-intro');
        return;
      } else if (currentStepIdx === 1) {
        currentStepIdx = 0;
        renderSurveyStep();
        return;
      } else if (currentStepIdx === 0) {
        showScreen('screen-opening');
        openingCurrentStep = 4;
        typeWriterText(elOpeningText, "먼저 당신에 대해<br>몇 가지 알려주세요.", function() {
          if (btnOpeningNext) btnOpeningNext.innerHTML = "다음으로";
          if (elOpeningNextGroup) {
            elOpeningNextGroup.classList.remove('hidden');
            elOpeningNextGroup.classList.add('visible');
          }
        });
        updateDevScreenBadge();
        return;
      }
    } else if (curId === 'screen-post-survey-intro') {
      currentStepIdx = 1;
      showScreen('screen-survey');
      return;
    } else if (curId === 'screen-survey-core-concern') {
      currentStepIdx = 2;
      showScreen('screen-survey');
      return;
    } else if (curId === 'screen-survey-concern-reason') {
      showScreen('screen-survey-core-concern');
      return;
    } else if (curId === 'screen-post-concern-bridge') {
      showScreen('screen-survey-concern-reason');
      return;
    } else if (curId === 'screen-capture-guide') {
      showScreen('screen-post-concern-bridge');
      return;
    } else if (curId === 'screen-shape-select') {
      showScreen('screen-capture-guide');
      return;
    } else if (curId === 'screen-survey-bridge') {
      showScreen('screen-shape-select');
      return;
    }

    var curIdx = ALL_SCREENS.indexOf(curId);
    if (curIdx === -1) curIdx = 0;
    var prevIdx = (curIdx - 1 + ALL_SCREENS.length) % ALL_SCREENS.length;
    var targetId = ALL_SCREENS[prevIdx];

    if (targetId === 'screen-survey') {
      currentStepIdx = 3;
    }

    showScreen(targetId);
    return;
  }
}, true);

// --------------------------------------------------------------------------
// 기본 버튼 이벤트 바인딩
// --------------------------------------------------------------------------
function bindAppNavEvents() {
  var bStartCover = document.getElementById('btn-start-cover');
  if (bStartCover) bStartCover.onclick = function() { showScreen('screen-menu'); };

  var bMenuBack = document.getElementById('btn-menu-back');
  if (bMenuBack) bMenuBack.onclick = function() { showScreen('screen-cover'); };

  var mCreate = document.getElementById('menu-btn-create');
  if (mCreate) mCreate.onclick = function() { showScreen('screen-opening'); };

  var mBrowse = document.getElementById('menu-btn-browse');
  if (mBrowse) mBrowse.onclick = function() { transitionToScreenWithFade('screen-gallery'); };

  var bGalBack = document.getElementById('btn-gallery-back');
  if (bGalBack) bGalBack.onclick = function() { showScreen('screen-menu'); };

  var mIntro = document.getElementById('menu-btn-intro');
  if (mIntro) mIntro.onclick = function() { transitionToScreenWithFade('screen-intro'); };

  var bIntroBack = document.getElementById('btn-intro-back');
  if (bIntroBack) bIntroBack.onclick = function() { showScreen('screen-menu'); };

  var bIntroBtmBack = document.getElementById('btn-intro-bottom-back');
  if (bIntroBtmBack) bIntroBtmBack.onclick = function() { showScreen('screen-menu'); };
}
bindAppNavEvents();

// --------------------------------------------------------------------------
// 오프닝 및 타이핑 플로우
// --------------------------------------------------------------------------
var openingCurrentStep = 1;
var elOpeningText = document.getElementById('opening-text');
var elOpeningChoiceGroup = document.getElementById('opening-choice-group');
var elOpeningNextGroup = document.getElementById('opening-next-group');
var btnOpeningNext = document.getElementById('btn-opening-next');
var typeTimer = null;
var openingDelayTimer = null;

function typeWriterText(targetElement, textWithHtml, onComplete) {
  clearTimeout(typeTimer);
  if (!targetElement) return;
  targetElement.innerHTML = "";
  var tokens = textWithHtml.match(/(<[^>]+>|[^<])/g) || [];
  var idx = 0;
  var currentContent = "";

  function nextChar() {
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
  }
  nextChar();
}

function resetOpeningFlow() {
  clearTimeout(typeTimer);
  clearTimeout(openingDelayTimer);
  openingCurrentStep = 1;
  if (elOpeningText) elOpeningText.innerHTML = "";
  if (elOpeningChoiceGroup) {
    elOpeningChoiceGroup.classList.remove('visible');
    elOpeningChoiceGroup.classList.add('hidden');
  }
  if (elOpeningNextGroup) {
    elOpeningNextGroup.classList.add('hidden');
    elOpeningNextGroup.classList.remove('visible');
  }

  openingDelayTimer = setTimeout(function() {
    typeWriterText(elOpeningText, "안녕하세요?<br>지금, 걱정 없는 삶을 살아가고 있나요?", function() {
      if (btnOpeningNext) btnOpeningNext.innerHTML = "다음으로";
      if (elOpeningNextGroup) {
        elOpeningNextGroup.classList.remove('hidden');
        requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); });
      }
    });
  }, 2000);
}

if (btnOpeningNext) {
  btnOpeningNext.onclick = function() {
    if (openingCurrentStep === 1) {
      openingCurrentStep = 2;
      if (elOpeningNextGroup) {
        elOpeningNextGroup.classList.remove('visible');
        elOpeningNextGroup.classList.add('hidden');
      }
      typeWriterText(elOpeningText, "꺼내어 보이지 못한 채,<br>응어리진 무언가... 쉽게 털어놓지 못할 것도 있겠지요.", function() {
        btnOpeningNext.innerHTML = "다음으로";
        if (elOpeningNextGroup) {
          elOpeningNextGroup.classList.remove('hidden');
          requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); });
        }
      });
      updateDevScreenBadge();
    } else if (openingCurrentStep === 2) {
      openingCurrentStep = 3;
      if (elOpeningNextGroup) {
        elOpeningNextGroup.classList.remove('visible');
        elOpeningNextGroup.classList.add('hidden');
      }
      typeWriterText(elOpeningText, "오늘 이곳에서,<br>당신의 마음 깊은 곳에 묻어둔 이야기를<br>조심스레 꺼내어보려 합니다.", function() {
        btnOpeningNext.innerHTML = "다음으로";
        if (elOpeningNextGroup) {
          elOpeningNextGroup.classList.remove('hidden');
          requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); });
        }
      });
      updateDevScreenBadge();
    } else if (openingCurrentStep === 3) {
      openingCurrentStep = 4;
      if (elOpeningNextGroup) {
        elOpeningNextGroup.classList.remove('visible');
        elOpeningNextGroup.classList.add('hidden');
      }
      typeWriterText(elOpeningText, "먼저 당신에 대해<br>몇 가지 알려주세요.", function() {
        btnOpeningNext.innerHTML = "다음으로";
        if (elOpeningNextGroup) {
          elOpeningNextGroup.classList.remove('hidden');
          requestAnimationFrame(function() { elOpeningNextGroup.classList.add('visible'); });
        }
      });
      updateDevScreenBadge();
    } else if (openingCurrentStep === 4) {
      currentStepIdx = 0;
      showScreen('screen-survey');
    }
  };
}

// --------------------------------------------------------------------------
// 🌟 2번 사진 (마음 깊은 곳 진입 브릿지 화면 로직)
// --------------------------------------------------------------------------
function initPostSurveyIntroScreen() {
  clearTimeout(postSurveyTypeTimer);
  var textEl = document.getElementById('post-survey-intro-text');
  var nextGroup = document.getElementById('post-survey-intro-next-group');
  var btnNext = document.getElementById('btn-post-survey-intro-next');

  if (!textEl || !nextGroup) return;
  textEl.innerHTML = "";
  nextGroup.classList.add('hidden');
  nextGroup.classList.remove('visible');

  var msg = "좋아요,<br>이제 당신의 마음 깊은 곳에 들어가 볼게요.";
  typeWriterText(textEl, msg, function() {
    if (btnNext) btnNext.innerHTML = "다음으로";
    nextGroup.classList.remove('hidden');
    requestAnimationFrame(function() { nextGroup.classList.add('visible'); });
  });
}

var btnPostSurveyNext = document.getElementById('btn-post-survey-intro-next');
if (btnPostSurveyNext) {
  btnPostSurveyNext.onclick = function() {
    currentStepIdx = 2; // 고민 다중 선택 알약 페이지
    showScreen('screen-survey');
  };
}

// --------------------------------------------------------------------------
// 🌟 1번 사진 직후 글만 나오는 브릿지 화면 로직 (단일화 완료)
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

  var msg = "당신에 대해 잘 알게 됐어요.<br>그 마음을 너울 속을 유영할 찬란한 날개로 바꿀 차례입니다.";
  typeWriterText(textEl, msg, function() {
    if (btnNext) btnNext.innerHTML = "다음으로";
    nextGroup.classList.remove('hidden');
    requestAnimationFrame(function() { nextGroup.classList.add('visible'); });
  });
}

var btnPostConcernBridgeNext = document.getElementById('btn-post-concern-bridge-next');
if (btnPostConcernBridgeNext) {
  btnPostConcernBridgeNext.onclick = function() {
    showScreen('screen-capture-guide');
  };
}

// --------------------------------------------------------------------------
// 브릿지 페이지 대사 반영 (온기 충전 브릿지)
// --------------------------------------------------------------------------
function playBridgeTypingSequence() {
  var textEl = document.getElementById('bridge-typing-text');
  var nextGroup = document.getElementById('bridge-next-group');
  if (!textEl || !nextGroup) return;

  nextGroup.classList.add('hidden');
  nextGroup.classList.remove('visible');

  var msg = "이제 거의 다 왔어요.<br>마지막 온기를 채울 차례예요.";
  typeWriterText(textEl, msg, function() {
    nextGroup.classList.remove('hidden');
    requestAnimationFrame(function() { nextGroup.classList.add('visible'); });
  });
}

// [버그 해결] 여기서 [다음으로] 클릭 시 확실하게 '다정한 한마디 적기' 화면(currentStepIdx = 3)으로 진입시킴
var bGotoStats = document.getElementById('btn-goto-stats');
if (bGotoStats) {
  bGotoStats.onclick = function() { 
    currentStepIdx = 3;
    showScreen('screen-survey');
  };
}

var guideTitleWrap = document.querySelector('.guide-title-wrapper');
var guideAnimatedTitle = document.getElementById('guide-animated-title');
var guideCenterCard = document.getElementById('guide-center-card');
var guideBottomDock = document.getElementById('guide-bottom-dock');
var guideTypeTimer = null;

function startCaptureGuideCinematicFlow() {
  clearTimeout(guideTypeTimer);
  
  if (guideTitleWrap) guideTitleWrap.classList.remove('moved-to-top');
  if (guideAnimatedTitle) guideAnimatedTitle.innerHTML = "";
  if (guideCenterCard) guideCenterCard.classList.remove('revealed');
  if (guideBottomDock) guideBottomDock.classList.remove('revealed');

  var introMessage = "고치에서 깨어날 당신의 나비는<br>어떤 모습인가요?";
  var tokens = introMessage.match(/(<[^>]+>|[^<])/g) || [];
  var idx = 0;
  var curText = "";

  function typeNext() {
    if (idx < tokens.length) {
      var char = tokens[idx];
      curText += char;
      if (guideAnimatedTitle) guideAnimatedTitle.innerHTML = curText;
      idx++;
      var delay = 80;
      if (char.startsWith('<')) delay = 0;
      else if (char === '?' || char === '.') delay = 400;
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
  }
  setTimeout(typeNext, 200);
}

// --------------------------------------------------------------------------
// Supabase 연동 & 형태 선택
// --------------------------------------------------------------------------
var SUPABASE_URL = 'https://djmdzsbfsobsutphragw.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbWR6c2Jmc29ic3V0cGhyYWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4ODQ3NTgsImV4cCI6MjEwNTQ2MDc1OH0.BC7llaSjbq6cYhDlRqrwJaycpQ6gSNcp5LgYBeM6WEM';
var supabase = null;
try {
  if (window.supabase) supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {}

var activeCustomTab = 'wing';
var selectedButterflyShape = 'crescent';
var selectedAntennaType = 'ball';

var butterflyPathData = {};
if (typeof wingDataset !== 'undefined') {
  wingDataset.forEach(function(w) { butterflyPathData[w.id] = w; });
}

function updateHeroPreview() {
  var heroPathContainer = document.getElementById('hero-path-container');
  if (!heroPathContainer || typeof wingDataset === 'undefined') return;

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
}

var carouselContainer = document.getElementById('arch-carousel-container');

function renderCarouselItems() {
  if (!carouselContainer || typeof wingDataset === 'undefined') return;
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
  resizeBubblePhysicsCanvas();
});

// 알약 탭 제어
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

  if (shapeTitle) shapeTitle.innerText = "날개 형태 고르기";
  if (shapeDesc) shapeDesc.innerHTML = "<strong class='text-white'>[드래그]</strong> 이동, <strong class='text-white'>[두 손가락 핀치]</strong> 확대/축소";

  if (tabKey === 'wing') {
    if (tabWing) tabWing.classList.add('active-tab');
    if (blurSliderBox) blurSliderBox.classList.add('hidden-slider');
    if (carouselStage) carouselStage.style.display = 'flex';
    requestAnimationFrame(function() { renderCarouselItems(); });
  } else if (tabKey === 'antenna') {
    if (tabAntenna) tabAntenna.classList.add('active-tab');
    if (blurSliderBox) blurSliderBox.classList.add('hidden-slider');
    if (carouselStage) carouselStage.style.display = 'flex';
    requestAnimationFrame(function() { renderCarouselItems(); });
  } else if (tabKey === 'blur') {
    if (tabBlur) tabBlur.classList.add('active-tab');
    if (blurSliderBox) blurSliderBox.classList.remove('hidden-slider');
    if (carouselStage) carouselStage.style.display = 'none';
  }
}

if (tabWing) tabWing.onclick = function() { switchTab('wing'); };
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
    showScreen('screen-survey-bridge');
  };
}

// --------------------------------------------------------------------------
// 캔버스 드로잉 및 블러
// --------------------------------------------------------------------------
function executeReliableFastBlur(canvas, radius) {
  if (radius <= 0.2) return;
  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  var w = canvas.width;
  var h = canvas.height;
  var imgData = ctx.getImageData(0, 0, w, h);
  var src = imgData.data;

  var r = Math.max(1, Math.round(radius));
  var kernelSize = r * 2 + 1;
  var temp = new Uint8ClampedArray(src.length);

  for (var y = 0; y < h; y++) {
    var rowStart = y * w * 4;
    var rSum = 0, gSum = 0, bSum = 0, aSum = 0;

    for (var i = -r; i <= r; i++) {
      var px = Math.min(w - 1, Math.max(0, i));
      var pIndex = rowStart + px * 4;
      rSum += src[pIndex]; gSum += src[pIndex + 1]; bSum += src[pIndex + 2]; aSum += src[pIndex + 3];
    }

    for (var x = 0; x < w; x++) {
      var outIndex = rowStart + x * 4;
      temp[outIndex] = rSum / kernelSize; temp[outIndex + 1] = gSum / kernelSize; temp[outIndex + 2] = bSum / kernelSize; temp[outIndex + 3] = aSum / kernelSize;
      var removeX = Math.min(w - 1, Math.max(0, x - r));
      var addX = Math.min(w - 1, Math.max(0, x + r + 1));
      var remIdx = rowStart + removeX * 4;
      var addIdx = rowStart + addX * 4;
      rSum += src[addIdx] - src[remIdx]; gSum += src[addIdx + 1] - src[remIdx + 1]; bSum += src[addIdx + 2] - src[remIdx + 2]; aSum += src[addIdx + 3] - src[remIdx + 3];
    }
  }

  for (var x = 0; x < w; x++) {
    var rSum = 0, gSum = 0, bSum = 0, aSum = 0;
    for (var i = -r; i <= r; i++) {
      var py = Math.min(h - 1, Math.max(0, i));
      var pIndex = (py * w + x) * 4;
      rSum += temp[pIndex]; gSum += temp[pIndex + 1]; bSum += temp[pIndex + 2]; aSum += temp[pIndex + 3];
    }

    for (var y = 0; y < h; y++) {
      var outIndex = (y * w + x) * 4;
      src[outIndex] = rSum / kernelSize; src[outIndex + 1] = gSum / kernelSize; src[outIndex + 2] = bSum / kernelSize; src[outIndex + 3] = aSum / kernelSize;
      var removeY = Math.min(h - 1, Math.max(0, y - r));
      var addY = Math.min(h - 1, Math.max(0, y + r + 1));
      var remIdx = (removeY * w + x) * 4;
      var addIdx = (addY * w + x) * 4;
      rSum += temp[addIdx] - temp[remIdx]; gSum += temp[addIdx + 1] - temp[remIdx + 1]; bSum += temp[addIdx + 2] - temp[remIdx + 2]; aSum += temp[addIdx + 3] - temp[remIdx + 3];
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

var rawImage = new Image();
var alignCanvas = document.getElementById('align-canvas');
var actx = alignCanvas ? alignCanvas.getContext('2d', { willReadFrequently: true }) : null;
var imgX = 0, imgY = 0, imgScale = 1.0;
var isDragging = false;
var startX = 0, startY = 0;
var startPinchDist = 0, pinchStartScale = 1.0;
var currentExtractedTexture = null;
var currentBlurPx = 0;
var isSymmetryEnabled = false;

var blurSlider = document.getElementById('blur-slider');
var toggleSymmetryBtn = document.getElementById('toggle-symmetry-btn');

function updateSliderProgress(val, min, max) {
  if (!blurSlider) return;
  var minVal = parseFloat(min !== undefined ? min : (blurSlider.min || 0));
  var maxVal = parseFloat(max !== undefined ? max : (blurSlider.max || 25));
  var curVal = parseFloat(val);
  var percent = ((curVal - minVal) / (maxVal - minVal)) * 100;
  percent = Math.max(0, Math.min(100, percent));
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
    if (isSymmetryEnabled) {
      toggleSymmetryBtn.classList.add('toggle-active');
      toggleSymmetryBtn.setAttribute('aria-pressed', 'true');
    } else {
      toggleSymmetryBtn.classList.remove('toggle-active');
      toggleSymmetryBtn.setAttribute('aria-pressed', 'false');
    }
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
      if (blurSlider) {
        blurSlider.value = 0;
        currentBlurPx = 0;
        updateSliderProgress(0);
      }
      isSymmetryEnabled = false;
      if (toggleSymmetryBtn) {
        toggleSymmetryBtn.classList.remove('toggle-active');
        toggleSymmetryBtn.setAttribute('aria-pressed', 'false');
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
  var baseScale = alignCanvas.width / Math.min(rawImage.width, rawImage.height);
  imgScale = baseScale;
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
  tempCanvas.width = alignCanvas.width;
  tempCanvas.height = alignCanvas.height;
  var tctx = tempCanvas.getContext('2d', { willReadFrequently: true });

  tctx.drawImage(rawImage, imgX, imgY, rawImage.width * imgScale, rawImage.height * imgScale);

  if (currentBlurPx > 0) {
    executeReliableFastBlur(tempCanvas, currentBlurPx * 0.9);
  }

  if (!isSymmetryEnabled) {
    actx.drawImage(tempCanvas, 0, 0);
  } else {
    actx.drawImage(tempCanvas, 0, 0, midX, alignCanvas.height, 0, 0, midX, alignCanvas.height);
    actx.save();
    actx.translate(alignCanvas.width, 0);
    actx.scale(-1, 1);
    actx.drawImage(tempCanvas, 0, 0, midX, alignCanvas.height, 0, 0, midX, alignCanvas.height);
    actx.restore();
  }
}

var interactiveFrame = document.getElementById('interactive-align-frame');
if (interactiveFrame && alignCanvas) {
  interactiveFrame.onmousedown = function(e) {
    isDragging = true;
    var rect = alignCanvas.getBoundingClientRect();
    var scaleFactor = alignCanvas.width / rect.width;
    startX = (e.clientX - rect.left) * scaleFactor - imgX;
    startY = (e.clientY - rect.top) * scaleFactor - imgY;
  };

  window.addEventListener('mousemove', function(e) {
    if (!isDragging || !alignCanvas) return;
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
}

function exportAlignedTexture() {
  if (!rawImage || !rawImage.width || !alignCanvas) {
    currentExtractedTexture = createFallbackDummyTexture();
    return;
  }

  var baseCanvas = document.createElement('canvas');
  baseCanvas.width = alignCanvas.width;
  baseCanvas.height = alignCanvas.height;
  var bctx = baseCanvas.getContext('2d', { willReadFrequently: true });

  bctx.drawImage(rawImage, imgX, imgY, rawImage.width * imgScale, rawImage.height * imgScale);

  if (currentBlurPx > 0) {
    executeReliableFastBlur(baseCanvas, currentBlurPx * 0.9);
  }

  if (isSymmetryEnabled) {
    var midX = alignCanvas.width / 2;
    var symCanvas = document.createElement('canvas');
    symCanvas.width = alignCanvas.width;
    symCanvas.height = alignCanvas.height;
    var sctx = symCanvas.getContext('2d');
    sctx.drawImage(baseCanvas, 0, 0, midX, alignCanvas.height, 0, 0, midX, alignCanvas.height);
    sctx.save();
    sctx.translate(alignCanvas.width, 0);
    sctx.scale(-1, 1);
    sctx.drawImage(baseCanvas, 0, 0, midX, alignCanvas.height, 0, 0, midX, alignCanvas.height);
    sctx.restore();
    baseCanvas = symCanvas;
  }

  var currentWing = butterflyPathData[selectedButterflyShape] || wingDataset[0];
  var heroScale = 140 / Math.max(currentWing.w, currentWing.h);
  var heroOffsetX = (160 - currentWing.w * heroScale) / 2;
  var heroOffsetY = (160 - currentWing.h * heroScale) / 2;

  var cRatio = alignCanvas.width / 160;
  var cropX = heroOffsetX * cRatio;
  var cropY = heroOffsetY * cRatio;
  var cropW = (currentWing.w * heroScale) * cRatio;
  var cropH = (currentWing.h * heroScale) * cRatio;

  var outW = 1024;
  var outH = Math.round(1024 * (currentWing.h / currentWing.w));
  var finalCanvas = document.createElement('canvas');
  finalCanvas.width = outW;
  finalCanvas.height = outH;
  var fctx = finalCanvas.getContext('2d');

  fctx.drawImage(baseCanvas, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

  currentExtractedTexture = finalCanvas.toDataURL('image/jpeg', 0.95);
}

function createFallbackDummyTexture(colorA, colorB) {
  var c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
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

// --------------------------------------------------------------------------
// 설문조사
// --------------------------------------------------------------------------
var surveyQuestions = [
  { title: "당신의 이름은 무엇인가요?", desc: "" },
  {
    title: "당신은 어떤 사람인가요?",
    desc: "(다중 선택)",
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
var elSelectedConcernChips = document.getElementById('selected-concern-chips');

var surveyCustomInputAnchor = document.getElementById('survey-custom-input-anchor');
var inputCustomKeyword = document.getElementById('input-custom-keyword');
var btnCustomKeywordClear = document.getElementById('btn-custom-keyword-clear');
var surveyTitleTypeTimer = null;

function typeWriterSurveyTitle(titleHtml, onComplete) {
  clearTimeout(surveyTitleTypeTimer);
  if (!elTitle) return;
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
      var delay = 80;
      if (char.startsWith('<')) delay = 0;
      else if (char === '?' || char === '.') delay = 350;
      else if (char === ',') delay = 200;
      surveyTitleTypeTimer = setTimeout(nextChar, delay);
    } else {
      if (onComplete) setTimeout(onComplete, 150);
    }
  }
  nextChar();
}

function updateCustomInputBarState() {
  if (!inputCustomKeyword) return;
  var currentCustom = "";
  if (currentStepIdx === 1) currentCustom = userSelections.q1_custom || "";
  else if (currentStepIdx === 2) currentCustom = userSelections.q2_custom || "";

  inputCustomKeyword.value = currentCustom;
  if (btnCustomKeywordClear) {
    if (currentCustom.trim().length > 0) btnCustomKeywordClear.classList.remove('hidden');
    else btnCustomKeywordClear.classList.add('hidden');
  }
}

function renderSurveyStep() {
  var q = surveyQuestions[currentStepIdx];
  if (!q) return;
  
  if (elProgressBar) {
    var pPercent = 25;
    if (currentStepIdx === 0) pPercent = 25;
    else if (currentStepIdx === 1) pPercent = 50;
    else if (currentStepIdx === 2) pPercent = 75;
    else if (currentStepIdx === 3) pPercent = 100;
    elProgressBar.style.width = pPercent + '%';
  }

  if (btnSurveyPrev) {
    btnSurveyPrev.classList.toggle('invisible', currentStepIdx === 0);
  }
  
  if (btnSurveyNext) {
    if (currentStepIdx === 3) btnSurveyNext.innerText = "완성하기";
    else btnSurveyNext.innerText = "다음 질문으로";
  }

  var titleBox = document.querySelector('.survey-title-box');
  if (titleBox) titleBox.style.display = 'flex';

  if (currentStepIdx === 0) {
    stopBubblePhysics();
    typeWriterSurveyTitle(q.title);
    if (elDesc) elDesc.innerHTML = q.desc;
    if (surveyChipWrapper) surveyChipWrapper.classList.add('hidden');
    if (elField6) { elField6.classList.add('hidden'); elField6.classList.remove('flex'); }
    if (elField7) { elField7.classList.remove('hidden'); elField7.classList.add('flex'); }
    if (surveyCustomInputAnchor) {
      surveyCustomInputAnchor.classList.remove('custom-anchor-visible');
      surveyCustomInputAnchor.classList.add('custom-anchor-hidden');
    }
  } else if (currentStepIdx === 1 || currentStepIdx === 2) {
    stopBubblePhysics();
    typeWriterSurveyTitle(q.title);
    if (elDesc) elDesc.innerHTML = q.desc;
    if (surveyChipWrapper) surveyChipWrapper.classList.remove('hidden');
    if (elField6) { elField6.classList.add('hidden'); elField6.classList.remove('flex'); }
    if (elField7) { elField7.classList.add('hidden'); elField7.classList.remove('flex'); }
    if (surveyCustomInputAnchor) {
      surveyCustomInputAnchor.classList.remove('custom-anchor-hidden');
      surveyCustomInputAnchor.classList.add('custom-anchor-visible');
    }
    updateCustomInputBarState();
    renderVerticalScrollChips();
  } else if (currentStepIdx === 3) {
    typeWriterSurveyTitle(q.title);
    if (elDesc) elDesc.innerHTML = q.desc;
    if (surveyChipWrapper) surveyChipWrapper.classList.add('hidden');
    if (elField7) { elField7.classList.add('hidden'); elField7.classList.remove('flex'); }
    if (surveyCustomInputAnchor) {
      surveyCustomInputAnchor.classList.remove('custom-anchor-visible');
      surveyCustomInputAnchor.classList.add('custom-anchor-hidden');
    }

    if (elField6) {
      elField6.classList.remove('hidden');
      elField6.classList.add('flex');
    }

    var memoBox = elField6 ? elField6.querySelector('.glass-input-card-v2') : null;
    var memoCounterWrap = memoCounter ? memoCounter.parentElement : null;
    if (memoBox) {
      memoBox.style.opacity = '1';
      memoBox.style.transform = 'translateY(0)';
    }
    if (memoCounterWrap) {
      memoCounterWrap.style.opacity = '1';
    }

    if (elSelectedConcernChips) {
      elSelectedConcernChips.innerHTML = '';
      elSelectedConcernChips.style.display = 'none';
    }

    startBubblePhysics();
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
    chip.style.removeProperty('box-shadow');
    chip.style.setProperty('box-shadow', 'none', 'important');
  }
}

function renderVerticalScrollChips() {
  if (!elOrganicContainer || !surveyChipWrapper) return;
  var q = surveyQuestions[currentStepIdx];
  var allOptions = q.options || [];
  var rows = buildAdaptiveVerticalRows(allOptions);
  var stateKey = currentStepIdx === 1 ? 'q1' : 'q2';

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

      chip.onclick = function() {
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
      };
      rowDiv.appendChild(chip);
    });
    elOrganicContainer.appendChild(rowDiv);
  });
}

if (inputCustomKeyword) {
  inputCustomKeyword.oninput = function(e) {
    var val = e.target.value;
    if (currentStepIdx === 1) userSelections.q1_custom = val;
    else if (currentStepIdx === 2) userSelections.q2_custom = val;

    if (btnCustomKeywordClear) {
      if (val.trim().length > 0) btnCustomKeywordClear.classList.remove('hidden');
      else btnCustomKeywordClear.classList.add('hidden');
    }
    validateSurveyStep();
  };
}

if (btnCustomKeywordClear) {
  btnCustomKeywordClear.onclick = function(e) {
    e.stopPropagation();
    if (inputCustomKeyword) {
      inputCustomKeyword.value = "";
      inputCustomKeyword.focus();
    }
    if (currentStepIdx === 1) userSelections.q1_custom = "";
    else if (currentStepIdx === 2) userSelections.q2_custom = "";
    btnCustomKeywordClear.classList.add('hidden');
    validateSurveyStep();
  };
}

function validateSurveyStep() {
  if (!btnSurveyNext) return;
  var isValid = false;
  if (currentStepIdx === 0) {
    isValid = userSelections.q7_name.trim().length > 0;
  } else if (currentStepIdx === 1) {
    var hasCustom1 = userSelections.q1_custom && userSelections.q1_custom.trim().length > 0;
    isValid = userSelections.q1.length > 0 || hasCustom1;
  } else if (currentStepIdx === 2) {
    var hasCustom2 = userSelections.q2_custom && userSelections.q2_custom.trim().length > 0;
    isValid = userSelections.q2.length > 0 || hasCustom2;
  } else if (currentStepIdx === 3) {
    isValid = true;
  }
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
    if (currentStepIdx === 0) {
      currentStepIdx = 1;
      renderSurveyStep();
    } else if (currentStepIdx === 1) {
      if (userSelections.q1_custom && userSelections.q1_custom.trim()) {
        var customText1 = userSelections.q1_custom.trim();
        if (userSelections.q1.indexOf(customText1) === -1) userSelections.q1.unshift(customText1);
      }
      showScreen('screen-post-survey-intro');
    } else if (currentStepIdx === 2) {
      if (userSelections.q2_custom && userSelections.q2_custom.trim()) {
        var customText2 = userSelections.q2_custom.trim();
        if (userSelections.q2.indexOf(customText2) === -1) userSelections.q2.unshift(customText2);
      }
      if (!userSelections.q2 || userSelections.q2.length === 0) {
        userSelections.q2 = ["비교중독", "수면 부족", "완벽주의 강박", "거절 공포", "텅 빈 잔고", "미래 막막함"];
      }
      showScreen('screen-survey-core-concern');
    } else if (currentStepIdx === 3) {
      showScreen('screen-loading');
      startAnswerShowcaseSequence();
    }
  };
}

if (btnSurveyPrev) {
  btnSurveyPrev.onclick = function() {
    if (currentStepIdx === 3) {
      showScreen('screen-survey-bridge');
    } else if (currentStepIdx === 2) {
      showScreen('screen-post-survey-intro');
    } else if (currentStepIdx === 1) {
      currentStepIdx = 0;
      renderSurveyStep();
    }
  };
}

// --------------------------------------------------------------------------
// 핵심 고민 화면 시네마틱 플로우
// --------------------------------------------------------------------------
var coreConcernTypeTimer = null;
var elCoreConcernTitleWrap = document.getElementById('core-concern-title-wrapper');
var elCoreConcernTitle = document.getElementById('core-concern-title');
var elCoreConcernContainer = document.getElementById('core-concern-scroll-container');
var elCoreConcernGrid = document.getElementById('core-concern-scroll-grid');
var btnCoreConcernNext = document.getElementById('btn-core-concern-next');
var btnCoreConcernPrev = document.getElementById('btn-core-concern-prev');

function calculateRowDistribution(totalCount) {
  if (totalCount <= 0) return [];
  if (totalCount === 1) return [1];
  if (totalCount === 2) return [2];
  if (totalCount === 3) return [3];
  if (totalCount === 4) return [2, 2];
  if (totalCount === 5) return [2, 3];

  if (totalCount <= 10) {
    var base3 = Math.floor(totalCount / 3);
    var rem3 = totalCount % 3;
    if (rem3 === 0) return [base3, base3, base3];
    if (rem3 === 1) return [base3, base3, base3 + 1];
    return [base3, base3 + 1, base3 + 1];
  }

  var base5 = Math.floor(totalCount / 5);
  var rem5 = totalCount % 5;
  var rows5 = [base5, base5, base5, base5, base5];
  for (var r = 0; r < rem5; r++) {
    rows5[4 - r]++;
  }
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

  if (!userSelections.core_concern && selectedItems.length > 0) {
    userSelections.core_concern = selectedItems[0];
  }

  if (btnCoreConcernNext) btnCoreConcernNext.disabled = !userSelections.core_concern;
  
  if (elCoreConcernGrid) {
    elCoreConcernGrid.innerHTML = '';
  }

  var distribution = calculateRowDistribution(selectedItems.length);
  var itemCursor = 0;

  distribution.forEach(function(countInRow) {
    var rowDiv = document.createElement('div');
    rowDiv.className = 'core-concern-row';

    for (var i = 0; i < countInRow && itemCursor < selectedItems.length; i++) {
      (function() {
        var item = selectedItems[itemCursor];
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'core-concern-text-btn';
        btn.innerText = item;

        if (userSelections.core_concern === item) {
          btn.classList.add('core-concern-selected');
        } else {
          btn.classList.add('core-concern-unselected');
        }

        btn.onclick = function() {
          userSelections.core_concern = item;
          var allButtons = elCoreConcernGrid.querySelectorAll('.core-concern-text-btn');
          allButtons.forEach(function(b) {
            b.classList.remove('core-concern-selected');
            b.classList.add('core-concern-unselected');
          });
          btn.classList.remove('core-concern-unselected');
          btn.classList.add('core-concern-selected');
          if (btnCoreConcernNext) btnCoreConcernNext.disabled = false;
        };

        rowDiv.appendChild(btn);
        itemCursor++;
      })();
    }
    elCoreConcernGrid.appendChild(rowDiv);
  });

  if (elCoreConcernContainer) {
    setTimeout(function() {
      var scrollCenter = (elCoreConcernContainer.scrollWidth - elCoreConcernContainer.clientWidth) / 2;
      elCoreConcernContainer.scrollLeft = Math.max(0, scrollCenter);
    }, 50);

    var isDown = false;
    var startXCoord = 0;
    var scrollLeftVal = 0;

    elCoreConcernContainer.onmousedown = function(e) {
      isDown = true;
      startXCoord = e.pageX - elCoreConcernContainer.offsetLeft;
      scrollLeftVal = elCoreConcernContainer.scrollLeft;
    };
    elCoreConcernContainer.onmouseleave = function() { isDown = false; };
    elCoreConcernContainer.onmouseup = function() { isDown = false; };
    elCoreConcernContainer.onmousemove = function(e) {
      if (!isDown) return;
      e.preventDefault();
      var x = e.pageX - elCoreConcernContainer.offsetLeft;
      var walk = (x - startXCoord) * 1.5;
      elCoreConcernContainer.scrollLeft = scrollLeftVal - walk;
    };
  }

  var typingMsg = "이 중에서 가장 꺼내기 힘든 것은<br>무엇인가요?";
  var tokens = typingMsg.match(/(<[^>]+>|[^<])/g) || [];
  var idx = 0;
  var curText = "";

  function typeNextCoreChar() {
    if (idx < tokens.length) {
      var char = tokens[idx];
      curText += char;
      if (elCoreConcernTitle) elCoreConcernTitle.innerHTML = curText;
      idx++;
      var delay = 75;
      if (char.startsWith('<')) delay = 0;
      else if (char === '?' || char === '.') delay = 350;
      coreConcernTypeTimer = setTimeout(typeNextCoreChar, delay);
    } else {
      setTimeout(function() {
        if (elCoreConcernTitleWrap) elCoreConcernTitleWrap.classList.add('moved-to-top');
        setTimeout(function() {
          if (elCoreConcernContainer) elCoreConcernContainer.classList.add('revealed');
        }, 450);
      }, 350);
    }
  }
  setTimeout(typeNextCoreChar, 180);
}

if (btnCoreConcernNext) {
  btnCoreConcernNext.onclick = function() {
    if (!userSelections.core_concern) return;
    showScreen('screen-survey-concern-reason');
  };
}

if (btnCoreConcernPrev) {
  btnCoreConcernPrev.onclick = function() {
    currentStepIdx = 2;
    showScreen('screen-survey');
  };
}

// --------------------------------------------------------------------------
// 핵심 고민 이유 작성 화면 로직 (1번 사진)
// --------------------------------------------------------------------------
var elConcernReasonTitle = document.getElementById('concern-reason-title');
var inputConcernReason = document.getElementById('input-concern-reason');
var concernReasonCounter = document.getElementById('concern-reason-counter');
var btnConcernReasonNext = document.getElementById('btn-concern-reason-next');
var btnConcernReasonPrev = document.getElementById('btn-concern-reason-prev');
var elConcernReasonKeywordDisplay = document.getElementById('concern-reason-picked-keyword-display');

function initConcernReasonScreen() {
  clearTimeout(reasonTypeTimer);
  var pickedConcern = userSelections.core_concern || "고민";

  if (elConcernReasonKeywordDisplay) {
    elConcernReasonKeywordDisplay.innerText = pickedConcern;
  }

  var titleMsg = "가장 힘들었던 이유는 무엇인가요?";
  if (elConcernReasonTitle) elConcernReasonTitle.innerHTML = "";

  var tokens = titleMsg.match(/(<[^>]+>|[^<])/g) || [];
  var idx = 0;
  var cur = "";

  function typeReasonChar() {
    if (idx < tokens.length) {
      var char = tokens[idx];
      cur += char;
      if (elConcernReasonTitle) elConcernReasonTitle.innerHTML = cur;
      idx++;
      var delay = 70;
      if (char.startsWith('<')) delay = 0;
      else if (char === '?' || char === '.') delay = 320;
      reasonTypeTimer = setTimeout(typeReasonChar, delay);
    }
  }
  setTimeout(typeReasonChar, 100);

  if (inputConcernReason) {
    inputConcernReason.value = userSelections.concern_reason || "";
    if (concernReasonCounter) {
      concernReasonCounter.innerText = (userSelections.concern_reason ? userSelections.concern_reason.length : 0) + '/100';
    }
  }
}

if (inputConcernReason) {
  inputConcernReason.oninput = function(e) {
    userSelections.concern_reason = e.target.value;
    if (concernReasonCounter) {
      concernReasonCounter.innerText = e.target.value.length + '/100';
    }
  };
}

if (btnConcernReasonNext) {
  btnConcernReasonNext.onclick = function() {
    showScreen('screen-post-concern-bridge');
  };
}

if (btnConcernReasonPrev) {
  btnConcernReasonPrev.onclick = function() {
    showScreen('screen-survey-core-concern');
  };
}

// --------------------------------------------------------------------------
// 말풍선 물리 낙하 애니메이션
// --------------------------------------------------------------------------
var bubbleCanvas = null;
var bctx = null;
var bubbleAnimFrameId = null;
var physicsBubbles = [];

function resizeBubblePhysicsCanvas() {
  bubbleCanvas = document.getElementById('bubble-physics-canvas');
  if (!bubbleCanvas) return;
  var parent = bubbleCanvas.parentElement;
  if (!parent) return;
  var rect = parent.getBoundingClientRect();
  bubbleCanvas.width = rect.width;
  bubbleCanvas.height = rect.height;
}

function startBubblePhysics() {
  stopBubblePhysics();
  bubbleCanvas = document.getElementById('bubble-physics-canvas');
  if (!bubbleCanvas) return;
  resizeBubblePhysicsCanvas();
  bctx = bubbleCanvas.getContext('2d');
  if (bctx) {
    bctx.clearRect(0, 0, bubbleCanvas.width, bubbleCanvas.height);
  }
  physicsBubbles = [];
}

function stopBubblePhysics() {
  if (bubbleAnimFrameId) {
    cancelAnimationFrame(bubbleAnimFrameId);
    bubbleAnimFrameId = null;
  }
  if (bubbleCanvas && bctx) {
    bctx.clearRect(0, 0, bubbleCanvas.width, bubbleCanvas.height);
  }
}

// --------------------------------------------------------------------------
// 나비 뷰어 및 저장 로직
// --------------------------------------------------------------------------
var fullScene, fullCamera, fullRenderer, fullGroup;
var leftWingMesh, rightWingMesh, antennaMesh;
var isFlyingAway = false;
var animFrameId = null;

var initialRotL = { x: 0, y: 0, z: 0 };
var initialRotR = { x: 0, y: 0, z: 0 };

var DEFAULT_ROT_X = 0;
var DEFAULT_ROT_Y = 0;

var butterflyRotX = DEFAULT_ROT_X;
var butterflyRotY = DEFAULT_ROT_Y;
var isUserDragging = false;
var lastPointerX = 0, lastPointerY = 0;
var previewStartTime = 0;

var isPressingScreen = false;
var pressStartTime = 0;
var isChargeTriggered = false;
var chargeProgress = 0;
var chargeVibrateInterval = null;

var particleCanvas = null;
var pctx = null;
var energyParticles = [];

function triggerDeviceVibrate(durationMs, intensity) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(durationMs || 40);
    } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.haptic) {
      window.webkit.messageHandlers.haptic.postMessage({ type: 'impactMedium' });
    }
  } catch(e) {}
}

async function saveButterflyToSupabase() {
  try {
    var newlyCreatedSpecimen = {
      id: Date.now(),
      name: userSelections.q7_name || '나비',
      wingId: selectedButterflyShape,
      antId: selectedAntennaType,
      q1: [].concat(userSelections.q1 || []),
      core_concern: userSelections.core_concern || (userSelections.q2 && userSelections.q2[0]) || "",
      memo: userSelections.q6_memo || '',
      textureUrl: currentExtractedTexture,
      date: new Date().toISOString().slice(0, 10).replace(/-/g, '. ')
    };
    specimenButterfliesData.unshift(newlyCreatedSpecimen);

    if (!supabase) return;
    await supabase.from('butterflies').insert([{
      name: userSelections.q7_name || '이름없는 나비',
      wing_shape: selectedButterflyShape,
      antenna_type: selectedAntennaType,
      q1: userSelections.q1,
      q2: userSelections.q2,
      core_concern: userSelections.core_concern,
      q3: [], q4: [], q5: [],
      memo: userSelections.q6_memo || '',
      revisit_date: null, email: null,
      texture_url: currentExtractedTexture
    }]);
  } catch (err) {
    console.error("Supabase 나비 저장 에러:", err);
  }
}

function initFullButterflyViewer(textureURL) {
  var container = document.getElementById('three-container');
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  if (!container || !window.THREE) return;
  container.innerHTML = '';
  container.style.opacity = '1';

  var glowBg = document.querySelector('.preview-ethereal-glow-bg');
  if (glowBg) glowBg.style.opacity = '1';

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

  var ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
  fullScene.add(ambientLight);
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(0, 5, 10);
  fullScene.add(dirLight);

  var textureLoader = new THREE.TextureLoader();
  var userTexture = textureLoader.load(textureURL);
  userTexture.flipY = false;

  fullGroup = new THREE.Group();
  butterflyRotX = DEFAULT_ROT_X;
  butterflyRotY = DEFAULT_ROT_Y;
  fullGroup.rotation.set(butterflyRotX, butterflyRotY, 0);

  fullGroup.position.set(0, -7.0, 0);

  previewStartTime = performance.now();
  isFlyingAway = false;
  isFlyingTransitionTriggered = false;
  resetChargeState();

  var wingMat = new THREE.MeshBasicMaterial({ map: userTexture, side: THREE.DoubleSide });
  var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.0 });

  var modelPath = '3DButterfly/' + selectedButterflyShape + '.glb';
  var targetAntennaPrefix = 'Antenna_' + selectedAntennaType;

  if (window.THREE && THREE.GLTFLoader) {
    try {
      var gltfLoader = new THREE.GLTFLoader();
      gltfLoader.load(modelPath, function(gltf) {
        var model = gltf.scene;
        leftWingMesh = null; rightWingMesh = null; antennaMesh = null;

        model.traverse(function(child) {
          if (child.isMesh) {
            var name = child.name;
            if (name.startsWith('Wing_L')) {
              leftWingMesh = child; child.material = wingMat;
              initialRotL = { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z };
            } else if (name.startsWith('Wing_R')) {
              rightWingMesh = child; child.material = wingMat;
              initialRotR = { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z };
            } else if (name.startsWith('Body')) {
              child.material = whiteMat;
            } else if (name.startsWith('Antenna_')) {
              child.material = whiteMat;
              if (name.startsWith(targetAntennaPrefix)) { child.visible = true; antennaMesh = child; }
              else child.visible = false;
            }
          }
        });

        model.scale.set(0.76, 0.76, 0.76);
        fullGroup.add(model);
      }, undefined, function() {});
    } catch(err) {}
  }

  fullScene.add(fullGroup);
  initEnergyParticleSystem();

  var clock = new THREE.Clock();

  function animate() {
    animFrameId = requestAnimationFrame(animate);
    var time = clock.getElapsedTime();
    var now = performance.now();
    var elapsedSec = (now - previewStartTime) / 1000;

    if (!isUserDragging) {
      butterflyRotX += (DEFAULT_ROT_X - butterflyRotX) * 0.05;
      var diffY = (DEFAULT_ROT_Y - butterflyRotY);
      diffY = Math.atan2(Math.sin(diffY), Math.cos(diffY));
      butterflyRotY += diffY * 0.05;
    }

    fullGroup.rotation.x = butterflyRotX;
    fullGroup.rotation.y = butterflyRotY;

    if (isPressingScreen && !isFlyingAway) {
      var pressDuration = (now - pressStartTime) / 1000;
      var HOLD_THRESHOLD = 2.0;

      if (pressDuration >= HOLD_THRESHOLD) {
        if (!isChargeTriggered) {
          isChargeTriggered = true;
          startChargeVibrationLoop();
        }
        var currentChargeSec = Math.max(0, pressDuration - HOLD_THRESHOLD);
        chargeProgress = Math.min(1.0, currentChargeSec / 2.0);
        updateChargeUIAndCamera(chargeProgress, currentChargeSec);
        spawnEnergyParticles();
      }
    }

    if (!isFlyingAway) {
      var flyDuration = 3.6;
      var restFoldAngle = 0.25;

      if (elapsedSec < flyDuration) {
        var progress = Math.min(1.0, elapsedSec / flyDuration);
        var easeProgress = 1.0 - Math.pow(1.0 - progress, 3);
        fullGroup.position.y = -7.0 + 7.0 * easeProgress;

        var flapSpeed = 36.0 * (1.0 - progress * 0.65);
        var flapAmp = 0.85 * Math.pow(1.0 - progress, 1.4);
        var flap = Math.sin(time * flapSpeed) * flapAmp;

        if (leftWingMesh && rightWingMesh) {
          leftWingMesh.rotation.y = initialRotL.y + restFoldAngle + flap;
          rightWingMesh.rotation.y = initialRotR.y - restFoldAngle - flap;
        }
      } else {
        fullGroup.position.y = 0;
        if (leftWingMesh && rightWingMesh) {
          leftWingMesh.rotation.y = initialRotL.y + restFoldAngle;
          rightWingMesh.rotation.y = initialRotR.y - restFoldAngle;
        }
      }
    } else {
      var flyAngle = Math.sin(time * 26.0) * 0.75;
      if (leftWingMesh && rightWingMesh) {
        leftWingMesh.rotation.y = initialRotL.y + 0.28 + flyAngle;
        rightWingMesh.rotation.y = initialRotR.y - 0.28 - flyAngle;
      }
      fullGroup.position.y += 0.09;
      fullGroup.position.z -= 0.04;

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
        if (footerUIEl) {
          footerUIEl.style.setProperty('display', 'none', 'important');
          footerUIEl.style.opacity = '0';
        }

        var globalCurtain = document.getElementById('cinematic-transition-curtain');
        if (globalCurtain) {
          globalCurtain.classList.add('active-curtain');
        }

        setTimeout(function() {
          showScreen('screen-complete');
          setTimeout(function() {
            if (globalCurtain) {
              globalCurtain.classList.remove('active-curtain');
            }
          }, 80);

          isFlyingAway = false;
          isFlyingTransitionTriggered = false;
          if (container) container.style.opacity = '1';
          if (glowBgEl) glowBgEl.style.opacity = '1';
          resetChargeState();
        }, 2000);
      }
    }

    renderEnergyParticles();
    fullRenderer.render(fullScene, fullCamera);
  }
  animate();
  bindInteractiveEvents(container);
}

var isFlyingTransitionTriggered = false;

function initEnergyParticleSystem() {
  particleCanvas = document.getElementById('energy-particles-canvas');
  if (!particleCanvas) return;
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
  pctx = particleCanvas.getContext('2d');
  energyParticles = [];
}

function spawnEnergyParticles() {
  if (!pctx) return;
  var cx = window.innerWidth / 2;
  var cy = window.innerHeight / 2;
  for (var i = 0; i < 2; i++) {
    var angle = Math.random() * Math.PI * 2;
    var dist = 90 + Math.random() * 80;
    energyParticles.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -Math.random() * 1.5 - 0.5,
      size: Math.random() * 2.8 + 1.2,
      alpha: 1.0,
      decay: Math.random() * 0.015 + 0.01
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

  if (chargeWidget) {
    chargeWidget.classList.remove('hidden');
    chargeWidget.style.setProperty('display', 'flex', 'important');
  }
  var currentSize = 22 + (96 - 22) * progress;
  if (innerFill) { innerFill.style.width = currentSize + 'px'; innerFill.style.height = currentSize + 'px'; }
  if (fullCamera) fullCamera.position.z = 8.8 - (2.6 * progress);

  var uiOpacity = Math.max(0, 1.0 - Math.min(1.0, currentChargeSec / 1.5));
  if (headerUI) headerUI.style.opacity = uiOpacity;

  if (footerUI) {
    footerUI.style.display = 'flex';
    footerUI.style.opacity = '1';
  }

  var flyLabel = document.getElementById('preview-fly-label');
  if (flyLabel) {
    if (progress >= 1.0) {
      flyLabel.innerText = "위로 쓸어 올려주세요";
    } else {
      flyLabel.innerText = "화면을 길게 눌러주세요.";
    }
  }
}

function startChargeVibrationLoop() {
  if (chargeVibrateInterval) clearInterval(chargeVibrateInterval);
  triggerDeviceVibrate(45, 0.6);

  chargeVibrateInterval = setInterval(function() {
    if (!isPressingScreen || !isChargeTriggered || isFlyingAway) {
      clearInterval(chargeVibrateInterval);
      chargeVibrateInterval = null;
      return;
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

  if (chargeWidget) {
    chargeWidget.classList.add('hidden');
    chargeWidget.style.setProperty('display', 'none', 'important');
  }
  if (innerFill) { innerFill.style.width = '22px'; innerFill.style.height = '22px'; }
  if (fullCamera) fullCamera.position.z = 8.8;
  if (headerUI) headerUI.style.opacity = 1.0;
  if (footerUI && !isFlyingAway) {
    footerUI.style.display = 'flex';
    footerUI.style.opacity = 1.0;
    footerUI.style.pointerEvents = 'none';
  }

  var flyLabel = document.getElementById('preview-fly-label');
  if (flyLabel) flyLabel.innerText = "화면을 길게 눌러주세요.";
}

function bindInteractiveEvents(targetEl) {
  var touchStartY = 0;
  var touchStartX = 0;

  function handlePointerStart(clientX, clientY) {
    if (isFlyingAway) return;
    isUserDragging = true;
    lastPointerX = clientX;
    lastPointerY = clientY;
    touchStartX = clientX;
    touchStartY = clientY;

    var chargeWidget = document.getElementById('energy-charge-widget');
    if (chargeWidget) {
      chargeWidget.style.left = clientX + 'px';
      chargeWidget.style.top = clientY + 'px';
    }
    isPressingScreen = true;
    pressStartTime = performance.now();
  }

  function handlePointerMove(clientX, clientY) {
    if (!isUserDragging || isFlyingAway) return;
    var deltaX = clientX - lastPointerX;
    var deltaY = clientY - lastPointerY;
    var movedDist = Math.hypot(clientX - touchStartX, clientY - touchStartY);

    if (!isChargeTriggered) {
      if (movedDist > 15) {
        pressStartTime = performance.now();
      }
      butterflyRotY += deltaX * 0.013;
      butterflyRotX += deltaY * 0.013;
      butterflyRotX = Math.max(-1.4, Math.min(1.4, butterflyRotX));
    }

    lastPointerX = clientX;
    lastPointerY = clientY;
  }

  function handlePointerEnd(clientX, clientY) {
    if (!isUserDragging) return;
    isUserDragging = false;
    var swipeDeltaY = touchStartY - clientY;

    var chargeWidget = document.getElementById('energy-charge-widget');
    if (chargeWidget) {
      chargeWidget.classList.add('hidden');
      chargeWidget.style.setProperty('display', 'none', 'important');
    }
    if (chargeVibrateInterval) { clearInterval(chargeVibrateInterval); chargeVibrateInterval = null; }

    if (isChargeTriggered && chargeProgress >= 1.0 && swipeDeltaY > 40 && !isFlyingAway) {
      isFlyingAway = true;
      triggerDeviceVibrate(180, 1.0);

      var footerUI = document.getElementById('preview-footer-ui');
      if (footerUI) {
        footerUI.style.setProperty('display', 'none', 'important');
        footerUI.style.opacity = '0';
        footerUI.style.pointerEvents = 'none';
      }

      // [버그 방지 안전 타이머] 프레임 드랍으로 y위치가 감지되지 않더라도 3.5초 후 완료 화면 강제 진입
      clearTimeout(flightSafetyTimer);
      flightSafetyTimer = setTimeout(function() {
        if (!isFlyingTransitionTriggered) {
          isFlyingTransitionTriggered = true;
          saveButterflyToSupabase();
          showScreen('screen-complete');
        }
      }, 3500);

    } else {
      resetChargeState();
    }
  }

  targetEl.oncontextmenu = function(e) { e.preventDefault(); return false; };

  targetEl.ontouchstart = function(e) { 
    if (e.touches.length === 1) handlePointerStart(e.touches[0].clientX, e.touches[0].clientY); 
  };
  window.addEventListener('touchmove', function(e) { 
    if (isUserDragging && e.touches.length === 1) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY); 
  }, { passive: true });
  window.addEventListener('touchend', function(e) { 
    if (e.changedTouches.length > 0) handlePointerEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY); 
  }, { passive: true });
  window.addEventListener('touchcancel', function(e) { 
    if (e.changedTouches.length > 0) handlePointerEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY); 
    else resetChargeState();
  }, { passive: true });

  targetEl.onmousedown = function(e) { handlePointerStart(e.clientX, e.clientY); };
  window.addEventListener('mousemove', function(e) { if (isUserDragging) handlePointerMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', function(e) { handlePointerEnd(e.clientX, e.clientY); });
}

// --------------------------------------------------------------------------
// 나비 표본실 갤러리
// --------------------------------------------------------------------------
var specimenButterfliesData = [];

var specimenContainer = document.getElementById('specimen-items-container');
var gallerySpawnTimers = [];

async function initSpecimenGallery() {
  if (!specimenContainer) return;
  specimenContainer.innerHTML = '';

  gallerySpawnTimers.forEach(function(t) { clearTimeout(t); });
  gallerySpawnTimers = [];

  if (supabase) {
    try {
      var res = await supabase
        .from('butterflies')
        .select('*')
        .order('id', { ascending: false })
        .limit(50);

      if (res.data && res.data.length > 0) {
        specimenButterfliesData = res.data.map(function(item) {
          var dateStr = "2026. 10. 24";
          if (item.created_at) {
            dateStr = new Date(item.created_at).toISOString().slice(0, 10).replace(/-/g, '. ');
          }
          return {
            id: item.id,
            name: item.name || "나비",
            wingId: item.wing_shape || "crescent",
            antId: item.antenna_type || "ball",
            q1: Array.isArray(item.q1) ? item.q1 : [],
            core_concern: item.core_concern || "",
            memo: item.memo || "",
            textureUrl: item.texture_url || null,
            date: dateStr
          };
        });
      }
    } catch (err) {
      console.error("Supabase 데이터 조회 오류:", err);
    }
  }

  if (specimenButterfliesData.length === 0) {
    specimenContainer.innerHTML = 
      '<div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: #777777; font-size: 13px;">' +
        '아직 날려보낸 나비가 없습니다.<br>첫 번째 나비를 깨워보세요.' +
      '</div>';
    return;
  }

  var cardElements = [];

  specimenButterfliesData.forEach(function(item) {
    var wing = butterflyPathData[item.wingId] || wingDataset[0];
    var ant = antennaDataset.find(function(a) { return a.id === item.antId; }) || antennaDataset[0];

    var card = document.createElement('div');
    card.className = 'specimen-card-item';

    var scaleRatio = 110 / Math.max(wing.w, wing.h);
    var rawName = item.name || "나비";
    var displayName = rawName.length > 10 ? rawName.slice(0, 10) + '...' : rawName;

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
      '<div class="specimen-pill-label"><span class="label-text" title="' + rawName + '">' + displayName + '</span></div>';

    card.onclick = function(e) {
      e.stopPropagation();
      if (specimenContainer) {
        specimenContainer.querySelectorAll('.specimen-pill-label').forEach(function(label) {
          label.classList.remove('active-touched');
        });
      }
      var currentLabel = card.querySelector('.specimen-pill-label');
      if (currentLabel) {
        currentLabel.classList.add('active-touched');
      }

      openSpecimen3DModal(item, item.textureUrl || createFallbackDummyTexture('#ffffff', '#e0e0e0'));
    };
    specimenContainer.appendChild(card);
    cardElements.push(card);
  });

  cardElements.forEach(function(cardEl, idx) {
    var timer = setTimeout(function() {
      if (cardEl) {
        cardEl.classList.add('revealed');
      }
    }, idx * 100);
    gallerySpawnTimers.push(timer);
  });
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

  if (nameEl) nameEl.innerText = '‘' + item.name + '’';
  
  if (tagsEl) {
    var personalityTags = [];
    if (item.q1 && item.q1.length > 0) {
      personalityTags = [].concat(item.q1);
    } else if (item.tags && item.tags.length > 0) {
      personalityTags = [].concat(item.tags.filter(function(t) { return t !== item.core_concern; }));
    }

    var html = personalityTags.map(function(t) {
      return '<span class="specimen-glass-pill">#' + t + '</span>';
    }).join('');

    var coreTag = item.core_concern || (item.tags && item.tags[item.tags.length - 1]);
    if (coreTag) {
      html += '<span class="specimen-glass-pill bg-white text-black font-bold border-white" style="box-shadow: 0 0 12px rgba(255, 255, 255, 0.45);">#' + coreTag + '</span>';
    }

    tagsEl.innerHTML = html;
  }

  if (memoEl) {
    var memoContent = item.memo || item.q6_memo;
    memoEl.innerText = memoContent ? ('"' + memoContent + '"') : '"너의 찬란한 날갯짓을 응원해."';
  }
  if (dateEl) dateEl.innerText = item.date || "2026. 10. 24";

  if (modal) modal.classList.remove('hidden');
  if (!container || !window.THREE) return;
  container.innerHTML = '';
  if (modalAnimFrameId) { cancelAnimationFrame(modalAnimFrameId); modalAnimFrameId = null; }

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

  if (window.THREE && THREE.GLTFLoader) {
    try {
      new THREE.GLTFLoader().load(modelPath, function(gltf) {
        var model = gltf.scene;
        modalWingL = null; modalWingR = null;

        model.traverse(function(child) {
          if (child.isMesh) {
            var name = child.name;
            if (name.startsWith('Wing_L')) { modalWingL = child; child.material = wingMat; }
            else if (name.startsWith('Wing_R')) { modalWingR = child; child.material = wingMat; }
            else if (child.name.startsWith('Body')) { child.material = whiteMat; }
            else if (name.startsWith('Antenna_')) { child.material = whiteMat; child.visible = name.startsWith(targetAntennaPrefix); }
          }
        });

        model.scale.set(0.88, 0.88, 0.88);
        model.position.set(0, -0.35, 0);
        group.add(model);
      }, undefined, function() {});
    } catch(err) {}
  }

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

var btnCloseSpecimenModal = document.getElementById('btn-close-specimen-modal');
if (btnCloseSpecimenModal) {
  btnCloseSpecimenModal.onclick = function() {
    var modal = document.getElementById('specimen-detail-modal');
    if (modal) modal.classList.add('hidden');
    if (modalAnimFrameId) { cancelAnimationFrame(modalAnimFrameId); modalAnimFrameId = null; }
  };
}

// --------------------------------------------------------------------------
// 앱 시작 실행
// --------------------------------------------------------------------------
updateDevScreenBadge();