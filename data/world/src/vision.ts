/**
 * Веб-камера становится контроллером после кнопки «Играть жестами» или
 * «Включить камеру». HandLandmarker ведёт лисёнка кончиком указательного
 * пальца, а зеркальный preview показывает центр остановки. Потеря руки или
 * видеокадров обнуляет движение. Модель позы при запуске не загружается;
 * чистый разбор позы ниже сохранён для регрессионных тестов и будущего режима.
 * Модель лица подгружается только у упражнения или у зеркала.
 *
 * Номер сессии защищает от поздних разрешений и загрузок: выключение камеры
 * и pagehide закрывают потоки и модели, включая полученные после отмены.
 */
export function vision(): string {
  return `
    var VIS_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
    var MODELS = {
      pose: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      hand: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      face: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
    };
    // Capability flag only: capture begins exclusively after an explicit click.
    var CAMERA_ENABLED = true;
    var camv = document.getElementById('camv');
    var camState = CAMERA_ENABLED ? 'idle' : 'disabled';
    var camStream = null;
    var poseLm = null, faceLm = null, fileset = null;
    var camEpoch = 0, camWanted = false, handLastFrame = -1;
    var visLib = null, handLm = null, handLoading = false, handFailed = false;
    var faceLoading = false, faceFailed = false, faceEpoch = 0;

    function closeModel(model){ if (model) { try { model.close(); } catch (e) {} } }
    function stopTracks(stream){ if (stream) stream.getTracks().forEach(function(track){ track.stop(); }); }
    function resetTracking(){
      FINGER.seen = FINGER.active = false;
      POSE.seen = POSE.full = POSE.handUp = false; POSE.walk = POSE.lean = 0;
      poseDriven = false; calib = null; calibFrames = 0; calibSum = { x: 0, torso: 0 };
      stepTimes = []; kneeUp = { l: false, r: false }; bobBase = 0; bobUp = false;
      if (typeof clearInput === 'function') clearInput();
    }
    function stopCamera(){
      camWanted = false; camEpoch++;
      stopTracks(camStream); camStream = null;
      camv.pause(); camv.srcObject = null;
      closeModel(handLm); closeModel(poseLm); closeModel(faceLm);
      handLm = poseLm = faceLm = null;
      faceEpoch++; resetFaceTracking();
      handLoading = faceLoading = handFailed = faceFailed = false;
      handLastFrame = -1; camState = 'idle'; resetTracking();
      if (typeof updateCamHud === 'function') updateCamHud();
    }

    /** Истина означает, что браузер действительно выдал живой видеопоток. */
    function cameraConnected(){
      if (!camStream) return false;
      try {
        return camStream.getVideoTracks().some(function(track){ return track.readyState === 'live' && track.enabled; });
      } catch (e) { return false; }
    }

    function wait(ms){ return new Promise(function(resolve){ setTimeout(resolve, ms); }); }
    function loadVisionModule(retries){
      return import(VIS_CDN).catch(function(error){
        if (retries <= 0) throw error;
        console.warn('[Echo Island] MediaPipe module load failed; retrying', error);
        return wait(600).then(function(){ return loadVisionModule(retries - 1); });
      });
    }
    function loadVisionFileset(retries){
      return visLib.FilesetResolver.forVisionTasks(VIS_CDN + '/wasm').catch(function(error){
        if (retries <= 0) throw error;
        console.warn('[Echo Island] MediaPipe WASM load failed; retrying', error);
        return wait(600).then(function(){ return loadVisionFileset(retries - 1); });
      });
    }
    function currentCamera(epoch){ return camWanted && epoch === camEpoch; }
    function setVisionError(error, epoch){
      if (!currentCamera(epoch)) return;
      console.warn('[Echo Island] Hand recognition could not start', error);
      camState = cameraConnected() ? 'vision-error' : 'camera-error';
      handLoading = false; handFailed = cameraConnected(); resetTracking(); updateCamHud();
    }
    async function initRecognizer(epoch){
      if (!currentCamera(epoch)) return;
      camState = 'loading'; handLoading = true; handFailed = false; updateCamHud();
      try {
        if (!visLib) visLib = await loadVisionModule(1);
        if (!currentCamera(epoch)) return;
        if (!fileset) fileset = await loadVisionFileset(1);
        if (!currentCamera(epoch)) return;
        // Finger control has its own model; pose is not in the startup path.
        var model = await visLib.HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODELS.hand, delegate: 'CPU' },
          runningMode: 'VIDEO', numHands: 1,
          minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5
        });
        if (!currentCamera(epoch) || !cameraConnected()) { closeModel(model); return; }
        closeModel(handLm); handLm = model; handLoading = false; handLastFrame = -1;
        camState = 'ready'; updateCamHud();
      } catch (error) { setVisionError(error, epoch); }
    }
    function retryVision(){
      if (!CAMERA_ENABLED || camState === 'loading') return;
      if (!cameraConnected()) { initCamera(); return; }
      var epoch = ++camEpoch; camWanted = true;
      resetTracking(); closeModel(handLm); closeModel(faceLm); handLm = faceLm = null;
      faceEpoch++; resetFaceTracking(); faceLoading = faceFailed = false;
      camv.play().then(function(){ return initRecognizer(epoch); }).catch(function(error){ setVisionError(error, epoch); });
    }

    /**
     * Явное включение только видео: сначала preview, затем модель руки.
     * Микрофон включается своей кнопкой; Pose не задерживает управление.
     */
    async function initCamera(){
      if (!CAMERA_ENABLED || camWanted) return;
      var epoch = ++camEpoch; camWanted = true; camState = 'requesting'; updateCamHud();
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('camera-unavailable');
        var stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 360 }, audio: false });
        if (!currentCamera(epoch)) { stopTracks(stream); return; }
        camStream = stream;
        stream.getVideoTracks().forEach(function(track){
          track.addEventListener('ended', function(){
            if (camWanted && camStream === stream && !cameraConnected()) { stopCamera(); camState = 'camera-error'; updateCamHud(); }
          });
        });
        camv.srcObject = stream; updateCamHud();
        await camv.play();
        if (!currentCamera(epoch)) return;
        await initRecognizer(epoch);
      } catch (error) {
        if (!currentCamera(epoch)) return;
        if (cameraConnected()) { setVisionError(error, epoch); return; }
        camWanted = false;
        camState = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError') ? 'denied' : 'camera-error';
        resetTracking(); updateCamHud();
      }
    }
    /** Ошибка модели руки не мешает упражнениям с лицом на том же потоке. */
    function faceCameraReady(){
      return (camState === 'ready' || camState === 'vision-error') && camWanted && cameraConnected();
    }
    /** Только модель: эта функция никогда не запрашивает камеру. */
    async function initFace(){
      if (faceLm || faceLoading || faceFailed || !faceCameraReady()) return;
      var epoch = camEpoch, request = ++faceEpoch, stream = camStream;
      function stillCurrent(){ return currentCamera(epoch) && request === faceEpoch && stream === camStream && cameraConnected(); }
      faceLoading = true;
      try {
        if (!visLib) visLib = await loadVisionModule(1);
        if (!stillCurrent()) return;
        if (!fileset) fileset = await loadVisionFileset(1);
        if (!stillCurrent()) return;
        var lm = await visLib.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODELS.face, delegate: 'CPU' },
          outputFaceBlendshapes: true, runningMode: 'VIDEO', numFaces: 1,
          minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5
        });
        if (!stillCurrent()) { closeModel(lm); return; }
        closeModel(faceLm); faceLm = lm; faceLoading = false; resetFaceTracking();
      } catch (error) {
        if (!stillCurrent()) return;
        faceLoading = false; faceFailed = true; resetFaceTracking();
        console.warn('[Echo Island] Face recognition failed to initialize', error);
      }
    }
    function retryFace(){
      faceEpoch++; closeModel(faceLm); faceLm = null;
      faceLoading = faceFailed = false; resetFaceTracking();
      return initFace();
    }

    // MediaPipe не принимает два кадра с одной меткой времени — держим свою,
    // строго возрастающую, для каждой модели отдельно
    var poseStamp = 0, faceStamp = 0, handStamp = 0, fingerLastRead = 0;
    function stamp(prev){ var n = performance.now(); return n > prev ? n : prev + 1; }

    // ---------- признаки позы ----------
    var POSE = {
      seen: false,      // человек в кадре
      full: false,      // видно ли ноги (тогда марш считаем по коленям)
      lean: 0,          // наклон корпуса: <0 влево, >0 вправо
      walk: 0,          // 0..1 — насколько уверенно идёт
      handUp: false,    // рука поднята выше плеча
      near: 0           // 1 — близко к камере, 0 — далеко
    };
    var FINGER = { seen: false, active: false, x: 0.5, y: 0.5 };
    var fingerFreshAt = 0;
    var calib = null, calibFrames = 0, calibSum = { x: 0, torso: 0 };
    var stepTimes = [], kneeUp = { l: false, r: false };
    var bobBase = 0, bobUp = false;

    function lmOk(p){ return p && (p.visibility === undefined || p.visibility > 0.5); }

    // Когда кадры скелета подставляет отладочный мост, настоящий разбор
    // молчит: иначе он затирал бы подставленную позу каждый кадр.
    var poseDriven = false;

    /** Взять кадр у MediaPipe и разобрать его. */
    function readPose(){
      if (poseDriven) return POSE.seen;
      if (camState !== 'ready' || !poseLm || !camv.videoWidth) return (POSE.seen = false);
      var r;
      try { poseStamp = stamp(poseStamp); r = poseLm.detectForVideo(camv, poseStamp); }
      catch (e) { return (POSE.seen = false); }
      return applyPose(r && r.landmarks && r.landmarks[0]);
    }

    /** Указательный палец — экранный джойстик: центр стоп, вверх — вперёд. */
    function readFinger(){
      if (camState !== 'ready' || !cameraConnected() || !camv.videoWidth || !handLm) return clearFinger();
      if (handLastFrame === camv.currentTime){
        if (t - fingerFreshAt > 0.4) return clearFinger();
        return FINGER.active;
      }
      if (t - fingerLastRead < 0.085) return FINGER.active;
      fingerLastRead = t;
      try {
        handLastFrame = camv.currentTime; fingerFreshAt = t;
        handStamp = stamp(handStamp);
        var result = handLm.detectForVideo(camv, handStamp);
        return applyFinger(result && result.landmarks && result.landmarks[0]);
      } catch (error) {
        clearFinger(); closeModel(handLm); handLm = null;
        setVisionError(error, camEpoch); return false;
      }
    }
    function clearFinger(){
      FINGER.seen = FINGER.active = false;
      if (typeof cameraInputActive !== 'undefined' && cameraInputActive){ moveVec.x = moveVec.z = 0; cameraInputActive = false; }
      return false;
    }
    function applyFinger(L){
      if (!L || ![0,6,8].every(function(i){ return L[i] && Number.isFinite(L[i].x) && Number.isFinite(L[i].y); })) return clearFinger();
      var wrist = L[0];
      var tip = Math.hypot(L[8].x - wrist.x, L[8].y - wrist.y);
      var joint = Math.hypot(L[6].x - wrist.x, L[6].y - wrist.y);
      FINGER.seen = true;
      if (tip <= joint * 1.08){ clearFinger(); FINGER.seen = true; return false; }
      FINGER.active = true; FINGER.x = clamp01(L[8].x); FINGER.y = clamp01(L[8].y);
      return true;
    }
    function fingerMove(){
      if (!FINGER.active) return null;
      function axis(value){
        var dead = 0.16, amount = Math.abs(value);
        if (amount <= dead) return 0;
        var n = Math.min(1, (amount - dead) / (1 - dead));
        n = n * n * (3 - 2 * n);
        return Math.sign(value) * n;
      }
      // Изображение фронтальной камеры зеркально для естественного управления.
      return { right: axis((0.5 - FINGER.x) * 2), forward: axis((0.5 - FINGER.y) * 2) };
    }

    /**
     * Точки скелета → жесты. Вынесено отдельно от получения кадра намеренно:
     * это чистый разбор, который можно проверить на подставленных точках, не
     * поднимая камеру и модель.
     *
     * Все расстояния делим на длину торса: так жесты не зависят от того,
     * насколько близко ребёнок стоит к камере.
     */
    function applyPose(L){
      if (!L || !lmOk(L[11]) || !lmOk(L[12]) || !lmOk(L[23]) || !lmOk(L[24])) return (POSE.seen = false);
      POSE.seen = true;

      var shX = (L[11].x + L[12].x) / 2, shY = (L[11].y + L[12].y) / 2;
      var hipX = (L[23].x + L[24].x) / 2, hipY = (L[23].y + L[24].y) / 2;
      var torso = Math.max(0.05, hipY - shY);
      POSE.near = clamp01((torso - 0.12) / 0.22);

      // первые ~1.5 с запоминаем нейтральную стойку этого ребёнка
      if (!calib){
        calibSum.x += shX; calibSum.torso += torso; calibFrames++;
        if (calibFrames >= 45){
          calib = { x: calibSum.x / calibFrames, torso: calibSum.torso / calibFrames };
          bobBase = shY; bobUp = false;
        }
        POSE.lean = 0; POSE.walk = 0;
        return true;
      }

      // Камера смотрит в лицо: шаг вправо СОБСТВЕННЫМ телом уменьшает x в
      // кадре, поэтому знак переворачиваем — иначе руль работал бы зеркально.
      var raw = (calib.x - shX) / torso;
      var dead = 0.12;                                   // мёртвая зона у центра
      var lean = Math.abs(raw) < dead ? 0 : (raw - Math.sign(raw) * dead) / 0.55;
      POSE.lean = Math.max(-1, Math.min(1, lean));

      // --- марш: по коленям, если они в кадре, иначе по покачиванию плеч ---
      POSE.full = lmOk(L[25]) && lmOk(L[26]);
      if (POSE.full){
        var liftL = (L[25].y - hipY) / torso, liftR = (L[26].y - hipY) / torso;
        // стоя колено заметно ниже бедра; поднятое подходит к его уровню
        step(liftL < 0.55, 'l'); step(liftR < 0.55, 'r');
      } else {
        // шаг на месте раскачивает плечи по вертикали — ловим переход вверх
        var d = (bobBase - shY) / torso;
        bobBase += (shY - bobBase) * 0.06;               // медленно ведём базу
        if (d > 0.035 && !bobUp){ bobUp = true; stepTimes.push(t); }
        else if (d < 0.01) bobUp = false;
      }
      stepTimes = stepTimes.filter(function(s){ return t - s < 1.6; });
      // два шага за полтора секунды — уже уверенная ходьба
      POSE.walk = clamp01(stepTimes.length / 2);

      POSE.handUp = (lmOk(L[15]) && L[15].y < shY) || (lmOk(L[16]) && L[16].y < shY);
      return true;
    }
    function step(up, side){
      if (up && !kneeUp[side]){ kneeUp[side] = true; stepTimes.push(t); }
      else if (!up) kneeUp[side] = false;
    }

    /** Вектор хода от камеры в тех же осях, что джойстик: x — руль, y — газ. */
    function poseMove(){
      if (!POSE.seen || !calib) return null;
      return { x: POSE.lean, y: -POSE.walk };
    }

    /**
     * Что мешает камере вести героя. Коды уходят тренеру и превращаются в
     * конкретный совет — это тот же режим «ошибка», но про движение.
     */
    function poseFault(){
      if (FINGER.active) return null;
      if (camState === 'camera-error' || camState === 'denied') return 'camOff';
      if (camState === 'vision-error') return 'visionError';
      if (camState !== 'ready') return null;            // пока грузимся — молчим
      if (!POSE.seen) return 'noBody';
      if (!calib) return null;                          // идёт калибровка
      if (POSE.near > 0.92) return 'tooClose';
      if (POSE.near < 0.08) return 'tooFarCam';
      return null;
    }

    // ---------- лицо: упражнения и зона «Волшебное зеркало» ----------
    // Freshness uses wall time, not capped physics dt. The serial advances only
    // on a new decoded video frame; consumers must count hold time once per serial.
    var visBlend = {}, faceSeen = false, faceFreshAt = 0, faceFrameSerial = 0;
    var faceLastFrame = -1, faceLastRead = -Infinity;
    function clearFaceSample(){ visBlend = {}; faceSeen = false; faceFreshAt = 0; return false; }
    function resetFaceTracking(){
      clearFaceSample(); faceLastFrame = -1; faceLastRead = -Infinity;
    }
    function faceFrameReady(){
      return faceCameraReady() && camv.srcObject === camStream && camv.readyState >= 2 &&
        camv.videoWidth > 0 && camv.videoHeight > 0 && !camv.paused && !camv.ended && Number.isFinite(camv.currentTime);
    }
    function faceSampleFresh(){
      if (!faceSeen || !faceLm || !faceFrameReady() || performance.now() - faceFreshAt > 350) return clearFaceSample();
      return true;
    }
    function readFace(){
      initFace();
      if (!faceLm || !faceFrameReady()) return clearFaceSample();
      var now = performance.now();
      // Never infer the same frozen frame twice. At 60fps, inference still runs
      // at most about 12Hz, leaving the render loop responsive on a laptop.
      if (faceLastFrame === camv.currentTime || now - faceLastRead < 85) return faceSampleFresh();
      faceLastRead = now; faceLastFrame = camv.currentTime;
      try {
        faceStamp = stamp(faceStamp);
        var r = faceLm.detectForVideo(camv, faceStamp);
        faceFrameSerial++;
        var categories = r && r.faceBlendshapes && r.faceBlendshapes[0] && r.faceBlendshapes[0].categories;
        if (Array.isArray(categories) && categories.length){
          var next = {}, valid = false;
          categories.forEach(function(c){
            if (!c || typeof c.categoryName !== 'string' || !Number.isFinite(c.score)) return;
            if (c.categoryName === '__proto__' || c.categoryName === 'constructor' || c.categoryName === 'prototype') return;
            next[c.categoryName] = Math.max(0, Math.min(1, c.score)); valid = true;
          });
          if (valid){ visBlend = next; faceFreshAt = now; faceSeen = true; return true; }
        }
      } catch (error) {
        closeModel(faceLm); faceLm = null; faceEpoch++; faceLoading = false; faceFailed = true;
        console.warn('[Echo Island] Face recognition stopped; explicit retry is available', error);
      }
      return clearFaceSample();
    }
    /** A visible movement signal, not a judgement of pronunciation. */
    function faceSignal(kind){
      if (!faceSampleFresh()) return 0;
      if (kind === 'smile') return ((visBlend.mouthSmileLeft || 0) + (visBlend.mouthSmileRight || 0)) / 2;
      if (kind === 'round') return Math.max(visBlend.mouthPucker || 0, visBlend.mouthFunnel || 0);
      if (kind === 'open') return visBlend.jawOpen || 0;
      return 0;
    }
    /** Насколько выражена нужная гримаса, 0..1. */
    function grimaceVal(label){
      if (!faceSampleFresh()) return 0;
      if (label === 'Рот') return visBlend.jawOpen || 0;
      if (label === 'Трубочка') return visBlend.mouthPucker || 0;
      if (label === 'Щёки') return visBlend.cheekPuff || 0;
      return Math.max(visBlend.mouthSmileLeft || 0, visBlend.mouthSmileRight || 0);
    }
    function grimaceThr(label){ return label === 'Щёки' ? 0.22 : (label === 'Трубочка' ? 0.38 : 0.42); }
    function grimaceFault(label){
      if (!faceSeen) return 'noFace';
      if (grimaceVal(label) > grimaceThr(label) * 0.45) return 'weakFace';
      if (label !== 'Улыбка' && grimaceVal('Улыбка') > 0.4) return 'wrongFace';
      return 'noFace2';
    }
    /** Готово ли зеркало: камера жива и модель лица загрузилась. */
    function mirrorReady(){
      // Зеркало первое спрашивает готовность модели. Запускаем её здесь,
      // иначе readFace() никогда не вызовется и модель останется незагруженной.
      if (faceCameraReady()) initFace();
      return faceCameraReady() && !!faceLm;
    }
    function mirrorDead(){ return !faceCameraReady() || faceFailed; }
`;
}
