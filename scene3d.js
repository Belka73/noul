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

  // 🌟 나비 만들기와 동일한 균일한 정면 조명 배치
  var amb = new THREE.AmbientLight(0xffffff, 0.95);
  scene.add(amb);
  var dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(0, 5, 10);
  scene.add(dir);

  return { scene: scene, camera: camera, renderer: renderer };
}

function loadButterflyModel(group, shapeId, antId, wingMaterials, whiteMat, scale, onLoaded) {
  if (!window.THREE || !THREE.GLTFLoader) return;
  var modelPath = '3DButterfly/' + (shapeId || 'crescent') + '.glb';
  var targetAnt = 'Antenna_' + (antId || 'ball');

  var matL = wingMaterials && wingMaterials.matL ? wingMaterials.matL : wingMaterials;
  var matR = wingMaterials && wingMaterials.matR ? wingMaterials.matR : wingMaterials;

  new THREE.GLTFLoader().load(modelPath, function(gltf) {
    var model = gltf.scene;
    var wL = null, wR = null;

    model.traverse(function(child) {
      if (child.isMesh) {
        var n = child.name || '';
        if (n.indexOf('Wing_L') === 0 || n.startsWith('Wing_L')) {
          wL = child;
          wL.userData.baseRotX = child.rotation.x;
          wL.userData.baseRotY = child.rotation.y;
          wL.userData.baseRotZ = child.rotation.z;
          child.material = matL;
          child.castShadow = true;
          child.receiveShadow = true;
        }
        else if (n.indexOf('Wing_R') === 0 || n.startsWith('Wing_R')) {
          wR = child;
          wR.userData.baseRotX = child.rotation.x;
          wR.userData.baseRotY = child.rotation.y;
          wR.userData.baseRotZ = child.rotation.z;
          child.material = matR;
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

var loadingScene, loadingCamera, loadingRenderer, loadingGroup, loadingWingL, loadingWingR;
var loadingAnimFrameId = null;

function initLoading3DScene() {
  stopLoading3DScene();
  var res = setupCommon3DScene(document.getElementById('loading-three-container'), 7.5, 0);
  if (!res) return;
  loadingScene = res.scene; loadingCamera = res.camera; loadingRenderer = res.renderer;

  var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.0 });
  loadingGroup = new THREE.Group();
  // 나비가 서 있지 않고 앞쪽으로 확실하게 숙여지며 오른쪽으로 기울어지도록 회전값 설정
  loadingGroup.rotation.set(0.98, 2.45, -0.55);

  loadingGroup.position.set(-0.08, -0.22, 0);

  loadButterflyModel(loadingGroup, selectedButterflyShape, selectedAntennaType, { matL: whiteMat, matR: whiteMat }, whiteMat, 0.45, function(l, r) {
    loadingWingL = l; loadingWingR = r;
  });
  loadingScene.add(loadingGroup);

  var clock = new THREE.Clock();
  (function animateLoading() {
    loadingAnimFrameId = requestAnimationFrame(animateLoading);
    var t = clock.getElapsedTime(), flap = 0.524 + Math.sin(t * 8.5) * 0.873;
    if (loadingWingL && loadingWingR) { 
      var uL = loadingWingL.userData;
      var uR = loadingWingR.userData;
      loadingWingL.rotation.set(uL.baseRotX || 0, (uL.baseRotY || 0) + flap, uL.baseRotZ || 0); 
      loadingWingR.rotation.set(uR.baseRotX || 0, (uR.baseRotY || 0) - flap, uR.baseRotZ || 0); 
    }
    loadingGroup.position.x = -0.08;
    loadingGroup.position.y = -0.22 + Math.sin(t * 2.2) * 0.08;
    loadingGroup.rotation.z = -0.55 + Math.sin(t * 1.5) * 0.04;
    loadingRenderer.render(loadingScene, loadingCamera);
  })();
}

function stopLoading3DScene() {
  if (loadingAnimFrameId) { cancelAnimationFrame(loadingAnimFrameId); loadingAnimFrameId = null; }
  var c = document.getElementById('loading-three-container');
  if (c) c.innerHTML = '';
}

function createWingMaterials(textureURL, patternPath3D) {
  var patPath = (typeof patternPath3D !== 'undefined')
    ? patternPath3D
    : (typeof currentSelected3DPatternPath !== 'undefined' ? currentSelected3DPatternPath : null);

  var texLoader = new THREE.TextureLoader();
  texLoader.setCrossOrigin('anonymous');

  var photoTex = texLoader.load(textureURL);
  photoTex.flipY = false;
  if (THREE.sRGBEncoding) photoTex.encoding = THREE.sRGBEncoding;

  var patTex = null;
  var hasPat = false;
  if (patPath) {
    patTex = texLoader.load(patPath);
    patTex.flipY = false;
    if (THREE.sRGBEncoding) patTex.encoding = THREE.sRGBEncoding;
    hasPat = true;
  }

  // 🌟 나비 만들기와 100% 동일한 텍스처 평면 투영 및 무늬 합성 셰이더
  function createCustomWingShader() {
    return new THREE.ShaderMaterial({
      uniforms: {
        photoMap: { value: photoTex },
        patMap: { value: patTex || new THREE.Texture() },
        hasPattern: { value: hasPat ? 1.0 : 0.0 }
      },
      vertexShader: [
        'varying vec2 vProjectedUv;',
        'varying vec2 vModelUv;',
        'void main() {',
        '  vModelUv = uv;',
        '  float u = (position.x + 2.4) / 4.8;',
        '  float v = (position.y + 2.4) / 4.8;',
        '  vProjectedUv = vec2(clamp(u, 0.0, 1.0), clamp(1.0 - v, 0.0, 1.0));',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D photoMap;',
        'uniform sampler2D patMap;',
        'uniform float hasPattern;',
        'varying vec2 vProjectedUv;',
        'varying vec2 vModelUv;',
        'void main() {',
        '  vec4 photoCol = texture2D(photoMap, vProjectedUv);',
        '  vec4 finalCol = photoCol;',
        '  if (hasPattern > 0.5) {',
        '    vec4 patCol = texture2D(patMap, vModelUv);',
        '    finalCol.rgb = mix(finalCol.rgb, finalCol.rgb * patCol.rgb, patCol.a * 0.95);',
        '  }',
        '  gl_FragColor = finalCol;',
        '}'
      ].join('\n'),
      side: THREE.DoubleSide
    });
  }

  var matL = createCustomWingShader();
  var matR = createCustomWingShader();

  return { matL: matL, matR: matR };
}

var shareScene, shareCamera, shareRenderer, shareGroup, shareWingL, shareWingR;
var shareAnimFrameId = null;

function initShare3DScene() {
  stopShare3DScene();
  var res = setupCommon3DScene(document.getElementById('share-three-container'), 7.5, 0);
  if (!res) return;
  shareScene = res.scene; shareCamera = res.camera; shareRenderer = res.renderer;

  var texUrl = currentExtractedTexture || createFallbackDummyTexture('#ffffff', '#cfcfcf');
  var wingMats = createWingMaterials(texUrl, currentSelected3DPatternPath);
  var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.0 });

  shareGroup = new THREE.Group();
  shareGroup.rotation.set(0.25, -0.8, 0.35);
  shareGroup.position.set(0, 0.45, 0);

  loadButterflyModel(shareGroup, selectedButterflyShape, selectedAntennaType, wingMats, whiteMat, 0.48, function(l, r) {
    shareWingL = l; shareWingR = r;
  });
  shareScene.add(shareGroup);

  var clock = new THREE.Clock();
  (function animateShare() {
    shareAnimFrameId = requestAnimationFrame(animateShare);
    var t = clock.getElapsedTime(), flap = 0.524 + Math.sin(t * 8.5) * 0.873;
    if (shareWingL && shareWingR) { 
      var uL = shareWingL.userData;
      var uR = shareWingR.userData;
      shareWingL.rotation.set(uL.baseRotX || 0, (uL.baseRotY || 0) + flap, uL.baseRotZ || 0); 
      shareWingR.rotation.set(uR.baseRotX || 0, (uR.baseRotY || 0) - flap, uR.baseRotZ || 0); 
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

var fullScene, fullCamera, fullRenderer, fullGroup, leftWingMesh, rightWingMesh, antennaMesh;
var isFlyingAway = false, animFrameId = null;
var initialRotL = { x: 0, y: 0, z: 0 }, initialRotR = { x: 0, y: 0, z: 0 };
var DEFAULT_ROT_X = 0, DEFAULT_ROT_Y = 0, butterflyRotX = DEFAULT_ROT_X, butterflyRotY = DEFAULT_ROT_Y;
var isUserDragging = false, lastPointerX = 0, lastPointerY = 0, previewStartTime = 0;
var isPressingScreen = false, pressStartTime = 0, isChargeTriggered = false, chargeProgress = 0, chargeVibrateInterval = null;
var particleCanvas = null, pctx = null, energyParticles = [], isFlyingTransitionTriggered = false;

var hasTriggeredDBSave = false;
var flyStartPhase = 0, flyStartTime = 0;

function triggerDeviceVibrate(durationMs, intensity) {
  try {
    if (navigator.vibrate) navigator.vibrate(durationMs || 40);
    else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.haptic) {
      window.webkit.messageHandlers.haptic.postMessage({ type: 'impactMedium' });
    }
  } catch(e) {}
}

function safeTriggerDBSave() {
  if (hasTriggeredDBSave) return;
  hasTriggeredDBSave = true;
  if (typeof window.saveButterflyToSupabase === 'function') {
    window.saveButterflyToSupabase();
  } else if (typeof saveButterflyToSupabase === 'function') {
    saveButterflyToSupabase();
  }
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

  var wingMats = createWingMaterials(textureURL, currentSelected3DPatternPath);

  fullGroup = new THREE.Group();
  butterflyRotX = DEFAULT_ROT_X; butterflyRotY = DEFAULT_ROT_Y;
  fullGroup.rotation.set(butterflyRotX, butterflyRotY, 0);
  fullGroup.position.set(0, -6.5, 0);

  previewStartTime = performance.now();
  isFlyingAway = false; isFlyingTransitionTriggered = false; hasTriggeredDBSave = false; resetChargeState();
  flyStartPhase = 0; flyStartTime = 0;

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
              child.material = wingMats.matL; 
              initialRotL = { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z }; 
            }
            else if (n.indexOf('Wing_R') === 0 || n.startsWith('Wing_R')) { 
              rightWingMesh = child; 
              child.material = wingMats.matR; 
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

    var t = clock.getElapsedTime();
    var now = performance.now(), elapsedSec = (now - previewStartTime) / 1000;

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
      var flapCenterOffset = 0.524;
      var flapAmp = 0.873;

      if (elapsedSec < 3.0) {
        var progress = Math.min(1.0, elapsedSec / 3.0);
        var easeOut = 1.0 - Math.pow(1.0 - progress, 3);
        fullGroup.position.y = -6.5 * (1.0 - easeOut);
      } else {
        fullGroup.position.y = 0;
      }

      // 🌟 [부드러운 감속 위상 함수]: 초반 17.0 -> 정지 후 3.8로 매우 여유롭고 자연스럽게 감속
      var currentPhase;
      if (t <= 1.2) {
        currentPhase = 17.0 * t;
      } else if (t <= 3.2) {
        var u = t - 1.2;
        // 1.2초~3.2초 구간 2초 동안 17.0에서 3.8로 코사인 기반 완만한 감속 (적분 연속성 유지)
        currentPhase = 20.4 + 3.8 * u + (13.2 * 2.0 / Math.PI) * Math.sin((u / 2.0) * (Math.PI / 2));
      } else {
        currentPhase = 3.8 * t + 30.24338;
      }

      var flapAngle = flapCenterOffset + Math.sin(currentPhase) * flapAmp;

      if (leftWingMesh && rightWingMesh) {
        leftWingMesh.rotation.set(initialRotL.x, initialRotL.y + flapAngle, initialRotL.z);
        rightWingMesh.rotation.set(initialRotR.x, initialRotR.y - flapAngle, initialRotR.z);
      }
    } else {
      if (!flyStartTime) {
        flyStartTime = t;
        if (t <= 1.2) {
          flyStartPhase = 17.0 * t;
        } else if (t <= 3.2) {
          var uPart = t - 1.2;
          flyStartPhase = 20.4 + 3.8 * uPart + (13.2 * 2.0 / Math.PI) * Math.sin((uPart / 2.0) * (Math.PI / 2));
        } else {
          flyStartPhase = 3.8 * t + 30.24338;
        }
      }

      var flyPhase = flyStartPhase + (t - flyStartTime) * 30.0;
      var flyAngle = 0.524 + Math.sin(flyPhase) * 0.873;

      if (leftWingMesh && rightWingMesh) {
        leftWingMesh.rotation.set(initialRotL.x, initialRotL.y + flyAngle, initialRotL.z);
        rightWingMesh.rotation.set(initialRotR.x, initialRotR.y - flyAngle, initialRotR.z);
      }
      fullGroup.position.y += 0.09; fullGroup.position.z -= 0.04;

      if (fullGroup.position.y > 4.6 && !isFlyingTransitionTriggered) {
        isFlyingTransitionTriggered = true;
        clearTimeout(flightSafetyTimer);
        safeTriggerDBSave();

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
  if (flyLabel) {
    flyLabel.innerHTML = progress >= 1.0 ? "위로 쓸어 올려주세요" : "화면 아무 곳을<br>2초간 가만히 길게 눌러주세요.";
  }
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
  if (flyLabel) {
    flyLabel.innerHTML = "화면 아무 곳을<br>2초간 가만히 길게 눌러주세요.";
  }
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
    if (chargeWidget) { chargeWidget.classList.add('hidden'); chargeWidget.style.display = 'none'; }
    if (chargeVibrateInterval) { clearInterval(chargeVibrateInterval); chargeVibrateInterval = null; }

    if (isChargeTriggered && chargeProgress >= 1.0 && swipeDeltaY > 40 && !isFlyingAway) {
      isFlyingAway = true;
      triggerDeviceVibrate(180, 1.0);

      safeTriggerDBSave();

      var footerUI = document.getElementById('preview-footer-ui');
      if (footerUI) { footerUI.style.setProperty('display', 'none', 'important'); footerUI.style.opacity = '0'; footerUI.style.pointerEvents = 'none'; }
      clearTimeout(flightSafetyTimer);
      flightSafetyTimer = setTimeout(function() {
        if (!isFlyingTransitionTriggered) {
          isFlyingTransitionTriggered = true; 
          safeTriggerDBSave();
          showScreen('screen-complete');
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

var modalThreeScene, modalThreeCamera, modalThreeRenderer, modalGroup, modalWingL, modalWingR, modalAnimFrameId = null;

function stopModal3DScene() {
  if (modalAnimFrameId) {
    cancelAnimationFrame(modalAnimFrameId);
    modalAnimFrameId = null;
  }
  if (modalThreeRenderer) {
    try {
      modalThreeRenderer.dispose();
      if (modalThreeRenderer.forceContextLoss) modalThreeRenderer.forceContextLoss();
    } catch(e) {}
    modalThreeRenderer = null;
  }
  modalWingL = null;
  modalWingR = null;
  var container = document.getElementById('specimen-three-container');
  if (container) container.innerHTML = '';
}

// 🌟 [수정]: 나비 만들기의 3D 뷰어(initFullButterflyViewer)와 100% 동일한 방식으로 무늬/텍스처를 전달받아 렌더링
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

  // 이전 렌더러 및 날개 객체 완전 정리 (메모리 및 컨텍스트 누수 차단)
  stopModal3DScene();

  var res = setupCommon3DScene(container, 7.3, -0.35);
  if (!res) return;
  modalThreeScene = res.scene; modalThreeCamera = res.camera; modalThreeRenderer = res.renderer;

  // 🌟 [수정]: 나비 만들기의 get3DPatternPath 로직을 100% 동일하게 활용하여 각 나비의 3D 무늬 경로를 취득
  var itemPattern3DPath = null;
  if (typeof get3DPatternPath === 'function') {
    itemPattern3DPath = get3DPatternPath(item.wingId, item.patternId);
  } else if (item.patternId && item.patternId.indexOf('none') === -1) {
    var parts = item.patternId.split('_');
    var patNum = parts[parts.length - 1] || "1";
    var shapePrefix = item.wingId || 'crescent';
    if (shapePrefix === 'moon-halo' || shapePrefix === 'moon') shapePrefix = 'moon-halo';
    else if (shapePrefix === 'dawn-ray' || shapePrefix === 'dawn') shapePrefix = 'dawn-ray';
    else if (shapePrefix === 'wave-fin' || shapePrefix === 'wave') shapePrefix = 'wave-fin';
    itemPattern3DPath = '3DButterfly_pattern/' + shapePrefix + '_pattern_3D_' + patNum + '.png';
  }

  // 🌟 나비 만들기와 100% 동일한 텍스처 셰이더 및 화이트 메시 재질 적용
  var wingMats = createWingMaterials(textureUrl, itemPattern3DPath);
  var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.0 });

  modalGroup = new THREE.Group();
  modalGroup.position.set(0, -0.85, 0);

  loadButterflyModel(modalGroup, item.wingId, item.antId, wingMats, whiteMat, 0.85, function(l, r) {
    modalWingL = l; modalWingR = r;
  });
  modalThreeScene.add(modalGroup);

  var clock = new THREE.Clock();
  (function modalAnimate() {
    modalAnimFrameId = requestAnimationFrame(animateLoading);
    // 🌟 프리뷰와 동일한 속도 및 3축 회전 완벽 보존 적용
    var t = clock.getElapsedTime(), flap = 0.524 + Math.sin(t * 7.2) * 0.873;
    if (modalWingL && modalWingR) { 
      var uL = modalWingL.userData;
      var uR = modalWingR.userData;
      modalWingL.rotation.set(uL.baseRotX || 0, (uL.baseRotY || 0) + flap, uL.baseRotZ || 0); 
      modalWingR.rotation.set(uR.baseRotX || 0, (uR.baseRotY || 0) - flap, uR.baseRotZ || 0); 
    }
    modalThreeRenderer.render(modalThreeScene, modalThreeCamera);
  })();
}

window.addEventListener('resize', function() {
  var activeScreen = document.querySelector('.screen.active');
  if (activeScreen) {
    if (activeScreen.id === 'screen-preview' && fullCamera && fullRenderer) {
      var w = window.innerWidth;
      var h = window.innerHeight;
      fullCamera.aspect = w / h;
      fullCamera.updateProjectionMatrix();
      fullRenderer.setSize(w, h);
      fullRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      if (particleCanvas) {
        particleCanvas.width = w;
        particleCanvas.height = h;
      }
    } else if (activeScreen.id === 'screen-loading' && loadingCamera && loadingRenderer) {
      var loadingCont = document.getElementById('loading-three-container');
      if (loadingCont) {
        var lw = loadingCont.clientWidth || window.innerWidth;
        var lh = loadingCont.clientHeight || window.innerHeight;
        loadingCamera.aspect = lw / lh;
        loadingCamera.updateProjectionMatrix();
        loadingRenderer.setSize(lw, lh);
      }
    } else if (activeScreen.id === 'screen-share' && shareCamera && shareRenderer) {
      var shareCont = document.getElementById('share-three-container');
      if (shareCont) {
        var sw = shareCont.clientWidth || window.innerWidth;
        var sh = shareCont.clientHeight || window.innerHeight;
        shareCamera.aspect = sw / sh;
        shareCamera.updateProjectionMatrix();
        shareRenderer.setSize(sw, sh);
      }
    } else if (activeScreen.id === 'screen-gallery' && typeof modalThreeCamera !== 'undefined' && modalThreeCamera && typeof modalThreeRenderer !== 'undefined' && modalThreeRenderer) {
      var modalCont = document.getElementById('specimen-three-container');
      if (modalCont) {
        var mw = modalCont.clientWidth || window.innerWidth;
        var mh = modalCont.clientHeight || window.innerHeight;
        modalThreeCamera.aspect = mw / mh;
        modalThreeCamera.updateProjectionMatrix();
        modalThreeRenderer.setSize(mw, mh);
      }
    }
  }
});