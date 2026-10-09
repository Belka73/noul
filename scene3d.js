/* ==========================================================================
   🌟 너울(Noul) 3D 그래픽 및 Three.js 씬 관리 모듈 (scene3d.js)
   - Three.js 공통 씬/조명/카메라 설정
   - GLB 3D 나비 모델 로딩 및 텍스처 매핑
   - 로딩 화면 3D, 공유 화면 3D, 완성 뷰어(비행/기모으기/파티클), 표본실 3D 모달
   - [1:1 정위치 단순 매핑]: 겹쳐진 UV에 맞춰 어떠한 좌표 변형 없이 원본 그대로 씌움
   ========================================================================== */

// --------------------------------------------------------------------------
// 3D 나비 공통 생성 헬퍼 함수
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
  if (THREE.sRGBEncoding) {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  container.appendChild(renderer.domElement);

  var amb = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(amb);
  var dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(3, 6, 8);
  scene.add(dir);

  return { scene: scene, camera: camera, renderer: renderer };
}

// 🌟 좌우 날개 메쉬에 텍스처 머티리얼 적용 (1:1 겹침 UV에 그대로 매핑)
function loadButterflyModel(group, shapeId, antId, wingMat, whiteMat, scale, onLoaded) {
  if (!window.THREE || !THREE.GLTFLoader) return;
  var modelPath = '3DButterfly/' + (shapeId || 'crescent') + '.glb';
  var targetAnt = 'Antenna_' + (antId || 'ball');

  new THREE.GLTFLoader().load(modelPath, function(gltf) {
    var model = gltf.scene;
    var wL = null, wR = null;

    model.traverse(function(child) {
      if (child.isMesh) {
        var n = child.name || '';
        if (n.indexOf('Wing_L') === 0 || n.startsWith('Wing_L')) {
          wL = child;
          wL.userData.baseRotY = child.rotation.y;
          child.material = wingMat;
          child.castShadow = true;
          child.receiveShadow = true;
        }
        else if (n.indexOf('Wing_R') === 0 || n.startsWith('Wing_R')) {
          wR = child;
          wR.userData.baseRotY = child.rotation.y;
          child.material = wingMat;
          child.castShadow = true;
          child.receiveShadow = true;
        }
        else if (n.indexOf('Body') === 0 || n.startsWith('Body')) { 
          child.material = whiteMat; 
        }
        else if (n.indexOf('Antenna_') === 0 || n.startsWith('Antenna_')) { 
          child.material = whiteMat; 
          child.visible = n.startsWith(targetAnt); 
        }
      }
    });
    model.scale.set(scale, scale, scale);
    group.add(model);
    if (onLoaded) onLoaded(wL, wR);
  }, undefined, function(err) {
    console.error("모델 로드 오류:", err);
  });
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
    if (loadingWingL && loadingWingR) { 
      loadingWingL.rotation.y = (loadingWingL.userData.baseRotY || 0) + flap; 
      loadingWingR.rotation.y = (loadingWingR.userData.baseRotY || 0) - flap; 
    }
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
// 🌟 [수정]: 준비된 UV 위에 PNG 파일을 다른 변형 없이 1:1로 그대로 얹는 함수
// - 뒤집기나 축 이동 없이 정사각형 캔버스에 1:1로 겹쳐서 그대로 씌움
// --------------------------------------------------------------------------
function createWingMaterials(textureURL, patternPath3D) {
  var patPath = patternPath3D || (typeof currentSelected3DPatternPath !== 'undefined' ? currentSelected3DPatternPath : null);

  var canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1000;
  var ctx = canvas.getContext('2d');

  var wingTex = new THREE.CanvasTexture(canvas);
  wingTex.flipY = false;
  wingTex.wrapS = THREE.ClampToEdgeWrapping;
  wingTex.wrapT = THREE.ClampToEdgeWrapping;
  if (THREE.sRGBEncoding) wingTex.encoding = THREE.sRGBEncoding;

  var wingMat = new THREE.MeshBasicMaterial({ 
    map: wingTex, 
    side: THREE.DoubleSide, 
    transparent: true, 
    alphaTest: 0.05 
  });

  var bgImg = new Image();
  bgImg.crossOrigin = "anonymous";
  bgImg.onload = function() {
    ctx.clearRect(0, 0, 1000, 1000);
    // 1. 사용자 사진 배경 1:1 드로잉
    ctx.drawImage(bgImg, 0, 0, 1000, 1000);

    // 2. 3D 패턴 도안을 변형 없이 UV 위치 그대로 위에 얹음
    if (patPath) {
      var patImg = new Image();
      patImg.crossOrigin = "anonymous";
      patImg.onload = function() {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.95;
        ctx.drawImage(patImg, 0, 0, 1000, 1000);
        ctx.restore();
        wingTex.needsUpdate = true;
      };
      patImg.src = patPath;
    } else {
      wingTex.needsUpdate = true;
    }
  };
  bgImg.src = textureURL;

  return wingMat;
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
  var wingMat = createWingMaterials(texUrl, currentSelected3DPatternPath);
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
    if (shareWingL && shareWingR) { 
      shareWingL.rotation.y = (shareWingL.userData.baseRotY || 0) + flap; 
      shareWingR.rotation.y = (shareWingR.userData.baseRotY || 0) - flap; 
    }
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
// 🌟 나비 뷰어 및 인터랙션 로직 (screen-preview)
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
  if (THREE.sRGBEncoding) {
    fullRenderer.outputEncoding = THREE.sRGBEncoding;
  }
  container.appendChild(fullRenderer.domElement);

  fullScene.add(new THREE.AmbientLight(0xffffff, 0.95));
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(0, 5, 10); fullScene.add(dirLight);

  var wingMat = createWingMaterials(textureURL, currentSelected3DPatternPath);

  fullGroup = new THREE.Group();
  butterflyRotX = DEFAULT_ROT_X; butterflyRotY = DEFAULT_ROT_Y;
  fullGroup.rotation.set(butterflyRotX, butterflyRotY, 0);
  fullGroup.position.set(0, -7.0, 0);

  previewStartTime = performance.now();
  isFlyingAway = false; isFlyingTransitionTriggered = false; resetChargeState();

  var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.0 });
  var targetAnt = 'Antenna_' + selectedAntennaType;

  if (window.THREE && THREE.GLTFLoader) {
    try {
      new THREE.GLTFLoader().load('3DButterfly/' + selectedButterflyShape + '.glb', function(gltf) {
        leftWingMesh = null; rightWingMesh = null; antennaMesh = null;
        gltf.scene.traverse(function(child) {
          if (child.isMesh) {
            var n = child.name || '';
            if (n.indexOf('Wing_L') === 0 || n.startsWith('Wing_L')) { 
              leftWingMesh = child; 
              child.material = wingMat; 
              initialRotL = { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z }; 
            }
            else if (n.indexOf('Wing_R') === 0 || n.startsWith('Wing_R')) { 
              rightWingMesh = child; 
              child.material = wingMat; 
              initialRotR = { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z }; 
            }
            else if (n.indexOf('Body') === 0 || n.startsWith('Body')) { 
              child.material = whiteMat; 
            }
            else if (n.indexOf('Antenna_') === 0 || n.startsWith('Antenna_')) { 
              child.material = whiteMat; 
              child.visible = n.startsWith(targetAnt); 
              if (child.visible) antennaMesh = child; 
            }
          }
        });
        gltf.scene.scale.set(0.76, 0.76, 0.76);
        fullGroup.add(gltf.scene);
      });
    } catch(err) {
      console.error("3D 프리뷰 모델 로딩 실패:", err);
    }
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
        var flapIntro = Math.sin(time * 30.0) * (0.85 * Math.pow(1.0 - progress, 1.4));
        if (leftWingMesh && rightWingMesh) {
          leftWingMesh.rotation.set(initialRotL.x, initialRotL.y + flapIntro, initialRotL.z);
          rightWingMesh.rotation.set(initialRotR.x, initialRotR.y - flapIntro, initialRotR.z);
        }
      } else {
        fullGroup.position.y = 0;
        var flapIdle = Math.sin(time * 6.5) * 0.35;
        if (leftWingMesh && rightWingMesh) {
          leftWingMesh.rotation.set(initialRotL.x, initialRotL.y + flapIdle, initialRotL.z);
          rightWingMesh.rotation.set(initialRotR.x, initialRotR.y - flapIdle, initialRotR.z);
        }
      }
    } else {
      var flyAngle = Math.sin(time * 26.0) * 0.75;
      if (leftWingMesh && rightWingMesh) {
        leftWingMesh.rotation.set(initialRotL.x, initialRotL.y + flyAngle, initialRotL.z);
        rightWingMesh.rotation.set(initialRotR.x, initialRotR.y - flyAngle, initialRotR.z);
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
  window.addEventListener('cancel', function(e) { if (e.changedTouches.length > 0) handlePointerEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY); else resetChargeState(); }, { passive: true });
  targetEl.onmousedown = function(e) { handlePointerStart(e.clientX, e.clientY); };
  window.addEventListener('mousemove', function(e) { if (isUserDragging) handlePointerMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', function(e) { handlePointerEnd(e.clientX, e.clientY); });
}

// --------------------------------------------------------------------------
// 🌟 3D 표본실 모달 (screen-gallery 내 상세 뷰어)
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

  var wingMat = createWingMaterials(textureUrl, currentSelected3DPatternPath);
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
    if (modalWingL && modalWingR) { 
      modalWingL.rotation.y = (modalWingL.userData.baseRotY || 0) + flap; 
      modalWingR.rotation.y = (modalWingR.userData.baseRotY || 0) - flap; 
    }
    modalThreeRenderer.render(modalThreeScene, modalThreeCamera);
  })();
}