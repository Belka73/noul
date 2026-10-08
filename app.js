/* ==========================================================================
   🌟 너울(Noul) 메인 애플리케이션 UI & 데이터 로직 (app.js)
   - [역할 분리 완료]: 
     1) 도안 정렬 및 하단 캐러셀: shape-select.js
     2) Three.js 그래픽 및 3D 물리 뷰어: scene3d.js
     3) 화면 네비게이션, 설문, Supabase 통신: app.js
   - [기능 보존 100%]: 타이핑, 설문, 핵심 고민, 물리 버블, 표본실 DB 연동 유지
   ========================================================================== */

// 🌟 [안전장치]: shape-select.js 로드 순서와 무관하게 app.js 자체에서도 에러가 안 나도록 보장
if (typeof createFallbackDummyTexture === 'undefined') {
  window.createFallbackDummyTexture = function(color1, color2) {
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
  };
}

var ALL_SCREENS = [
  'screen-cover', 'screen-menu', 'screen-gallery', 'screen-intro',
  'screen-opening', 'screen-survey', 'screen-post-survey-intro', 
  'screen-survey-core-concern', 'screen-survey-concern-reason', 
  'screen-post-concern-bridge', 'screen-capture-guide', 
  'screen-shape-select', 'screen-survey-bridge',
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
var postSurveyIntroTypeTimer = null;
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
  clearTimeout(postSurveyIntroTypeTimer);
  clearTimeout(flightSafetyTimer);
  if (showcaseInterval) { clearInterval(showcaseInterval); showcaseInterval = null; }
}

function showScreen(screenId) {
  clearAllTimers();
  document.querySelectorAll('.screen').forEach(function(s) { 
    s.classList.remove('active'); 
    s.style.display = 'none';
  });

  var target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    target.style.display = 'flex';
    try {
      if (screenId === 'screen-cover') {
        stopBubblePhysics(); stopLoading3DScene(); stopShare3DScene();
      } else if (screenId === 'screen-opening') {
        stopBubblePhysics(); stopLoading3DScene(); stopShare3DScene(); resetOpeningFlow();
      } else if (screenId === 'screen-survey') {
        stopLoading3DScene(); stopShare3DScene(); renderSurveyStep();
      } else if (screenId === 'screen-post-survey-intro') {
        stopBubblePhysics(); stopLoading3DScene(); stopShare3DScene(); initPostSurveyIntroScreen();
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
        if (typeof switchTab === 'function') switchTab('wing');
        if (typeof updateHeroPreview === 'function') updateHeroPreview();
        if (typeof drawAlignCanvas === 'function') drawAlignCanvas();
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
  } else if (name === 'screen-post-survey-intro') name += ' (고민직후브릿지)';
  else if (name === 'screen-survey-core-concern') name += ' (핵심고민)';
  else if (name === 'screen-survey-concern-reason') name += ' (고민이유)';
  else if (name === 'screen-post-concern-bridge') name += ' (나비전환브릿지)';
  badge.innerText = '화면: ' + name;
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
// 🌟 DEV 전역 건너뛰기 이벤트
// --------------------------------------------------------------------------
function ensureDevDummyData() {
  if (!userSelections.q7_name) userSelections.q7_name = "테스트나비";
  if (!userSelections.q2 || userSelections.q2.length === 0) {
    userSelections.q2 = ["완벽주의 강박", "비교중독", "수면 부족", "거절 공포", "텅 빈 잔고", "미래 막막함"];
  }
  if (!userSelections.core_concern) userSelections.core_concern = userSelections.q2[0];
  if (!userSelections.concern_reason) userSelections.concern_reason = "항상 잘 해내야 한다는 마음이 앞서서요.";
  if (!userSelections.q6_memo) userSelections.q6_memo = "너의 찬란한 날갯짓을 응원해.";
  
  // 🌟 형태와 텍스처가 어긋나지 않도록 텍스처 추출 보장
  if (!currentExtractedTexture) {
    try {
      if (typeof exportAlignedTexture === 'function') exportAlignedTexture();
      else currentExtractedTexture = createFallbackDummyTexture();
    } catch(err) {
      currentExtractedTexture = createFallbackDummyTexture();
    }
  }
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
      if (currentStepIdx === 0) { 
        if (!userSelections.q7_name) userSelections.q7_name = "테스트나비"; 
        currentStepIdx = 1; 
        renderSurveyStep(); 
        return; 
      }
      else if (currentStepIdx === 1) { 
        ensureDevDummyData(); 
        showScreen('screen-post-survey-intro'); 
        return; 
      }
      else if (currentStepIdx === 2) { 
        ensureDevDummyData(); 
        showScreen('screen-post-concern-bridge'); 
        return; 
      }
    } else if (curId === 'screen-post-survey-intro') {
      ensureDevDummyData();
      showScreen('screen-survey-core-concern');
      return;
    } else if (curId === 'screen-survey-core-concern') { 
      ensureDevDummyData(); 
      showScreen('screen-survey-concern-reason'); 
      return; 
    } else if (curId === 'screen-survey-concern-reason') { 
      ensureDevDummyData(); 
      currentStepIdx = 2; 
      showScreen('screen-survey'); 
      return; 
    } else if (curId === 'screen-post-concern-bridge') { 
      showScreen('screen-capture-guide'); 
      return; 
    } else if (curId === 'screen-capture-guide') { 
      showScreen('screen-shape-select'); 
      return; 
    } else if (curId === 'screen-shape-select') { 
      ensureDevDummyData(); 
      if (typeof exportAlignedTexture === 'function') exportAlignedTexture(); 
      showScreen('screen-loading'); 
      startAnswerShowcaseSequence(); 
      return; 
    } else if (curId === 'screen-loading') {
      ensureDevDummyData();
      var butterflyName = userSelections.q7_name ? userSelections.q7_name.trim() : "나비";
      var nameHeader = document.getElementById('preview-butterfly-name');
      if (nameHeader) nameHeader.innerText = '‘' + butterflyName + '’';
      var guideText = document.getElementById('preview-guide-text');
      if (guideText) guideText.innerText = userSelections.q6_memo && userSelections.q6_memo.trim().length > 0 ? userSelections.q6_memo.trim() : "너의 찬란한 날갯짓을 응원해.";
      initFullButterflyViewer(currentExtractedTexture || createFallbackDummyTexture());
      showScreen('screen-preview'); 
      return; 
    } else if (curId === 'screen-preview') { 
      ensureDevDummyData(); 
      showScreen('screen-complete'); 
      return; 
    } else if (curId === 'screen-complete') { 
      showScreen('screen-share'); 
      return; 
    } else if (curId === 'screen-share') { 
      showScreen('screen-cover'); 
      return; 
    }
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
    } else if (curId === 'screen-post-survey-intro') {
      currentStepIdx = 1;
      showScreen('screen-survey');
      return;
    } else if (curId === 'screen-survey-core-concern') { 
      showScreen('screen-post-survey-intro'); 
      return; 
    } else if (curId === 'screen-survey-concern-reason') { 
      showScreen('screen-survey-core-concern'); 
      return; 
    } else if (curId === 'screen-post-concern-bridge') { 
      currentStepIdx = 2; 
      showScreen('screen-survey'); 
      return; 
    } else if (curId === 'screen-capture-guide') { 
      showScreen('screen-post-concern-bridge'); 
      return; 
    } else if (curId === 'screen-shape-select') { 
      showScreen('screen-capture-guide'); 
      return; 
    } else if (curId === 'screen-loading') { 
      showScreen('screen-shape-select'); 
      return; 
    } else if (curId === 'screen-preview') { 
      showScreen('screen-loading'); 
      startAnswerShowcaseSequence(); 
      return; 
    } else if (curId === 'screen-complete') { 
      ensureDevDummyData(); 
      initFullButterflyViewer(currentExtractedTexture || createFallbackDummyTexture()); 
      showScreen('screen-preview'); 
      return; 
    } else if (curId === 'screen-share') { 
      showScreen('screen-complete'); 
      return; 
    }
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
// 🌟 4번 사진 직후 신규 브릿지 화면 (screen-post-survey-intro) 구동 함수
// --------------------------------------------------------------------------
function initPostSurveyIntroScreen() {
  clearTimeout(postSurveyIntroTypeTimer);
  var textEl = document.getElementById('post-survey-intro-text');
  var nextGroup = document.getElementById('post-survey-intro-next-group');
  var btnNext = document.getElementById('btn-post-survey-intro-next');

  if (!textEl || !nextGroup) return;
  textEl.innerHTML = "";
  nextGroup.classList.add('hidden');
  nextGroup.classList.remove('visible');
  nextGroup.style.display = 'none';

  typeWriterText(textEl, "마주한 고민 중,<br>가장 꺼내기 힘든 것은 무엇인가요?", function() {
    if (btnNext) btnNext.innerHTML = "다음으로";
    nextGroup.classList.remove('hidden');
    nextGroup.style.display = 'block';
    nextGroup.style.opacity = '1';
    requestAnimationFrame(function() { 
      nextGroup.classList.add('visible'); 
    });
  });
}

var btnPostSurveyIntroNext = document.getElementById('btn-post-survey-intro-next');
if (btnPostSurveyIntroNext) {
  btnPostSurveyIntroNext.onclick = function() {
    showScreen('screen-survey-core-concern');
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
// Supabase 클라이언트
// --------------------------------------------------------------------------
var SUPABASE_URL = 'https://djmdzsbfsobsutphragw.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbWR6c2Jmc29ic3V0cGhyYWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4ODQ3NTgsImV4cCI6MjEwNTQ2MDc1OH0.BC7llaSjbq6cYhDlRqrwJaycpQ6gSNcp5LgYBeM6WEM';
var supabase = null;
try { if (window.supabase) supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch (err) {}

// --------------------------------------------------------------------------
// 설문조사 로직
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
  if (currentStepIdx === 0) isValid = userSelections.q7_name && userSelections.q7_name.trim().length > 0;
  else if (currentStepIdx === 1) isValid = (userSelections.q2 && userSelections.q2.length > 0) || (userSelections.q2_custom && userSelections.q2_custom.trim().length > 0);
  else if (currentStepIdx === 2) isValid = true;
  btnSurveyNext.disabled = !isValid;
  btnSurveyNext.style.pointerEvents = isValid ? 'auto' : 'none';
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

// 🌟 [정석 진행]: 2단계 완료 시 브릿지 화면(screen-post-survey-intro)으로 정상 진입
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
      showScreen('screen-post-survey-intro');
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
if (btnCoreConcernPrev) btnCoreConcernPrev.onclick = function() { showScreen('screen-post-survey-intro'); };

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
    } else {
      setTimeout(function() {
        if (elConcernReasonKeywordDisplay) elConcernReasonKeywordDisplay.style.opacity = '1';
      }, 200);
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
// 🌟 Supabase 나비 저장 로직 (3D 비행 완료 시 트리거)
// --------------------------------------------------------------------------
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