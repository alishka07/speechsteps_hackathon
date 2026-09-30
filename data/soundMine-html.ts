import { THREE_SRC } from './three-lib';

/**
 * «Шахта звуков» (Sound Mine) — зона артикуляционной иерархии.
 *
 * Один цикл на каждом уровне (isolation → story); вертикальный срез здесь —
 * звук Р, уровень «слово», 10 элементов. Каждый элемент урока = кристалл,
 * который ребёнок «добывает», правильно произнося слово.
 *
 * Цикл (на элемент): PRESENT → AWAIT_GESTURE → RECORD → ASSESS → FEEDBACK
 *   PRESENT      — показать кристалл (слово + картинка), проговорить эталон;
 *   AWAIT_GESTURE— pinch-pull (MediaPipe HandLandmarker) ИЛИ касание/клик
 *                  (fallback) «расшатывает» кристалл и открывает микрофон;
 *   RECORD       — запись произнесения (Web Audio);
 *   ASSESS       — оценка 0..100 (on-device эвристика; СЕАМ для SpeechSuper/
 *                  Cybernet). score ≥ passThreshold → кристалл откалывается,
 *                  летит в вагонетку, XP + блеск; score в reviewBand →
 *                  трескается, флаг на проверку логопеду; ниже → мягкий
 *                  ретрай (эталон ещё раз), до maxAttempts;
 *   FEEDBACK     — реакция, затем следующий элемент → SUMMARY → SYNC.
 *
 * Приватность: камера остаётся на устройстве (MediaPipe), наружу уходит
 * только аудио (если подключён реальный движок) — это персональные данные.
 *
 * Самодостаточный HTML: Three.js r149 встраивается ИНЛАЙН (офлайн) через
 * soundMineHtml(). Мост window.SpeechSteps: getLesson / loadState / saveState
 * / onEvent / speak / getConfig.
 */
export const SOUND_MINE_HTML: string = `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<title>Шахта звуков</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; user-select:none; }
  html, body { height:100%; overflow:hidden; background:#1b1426; font-family:'Nunito','Arial',sans-serif; }
  #c { display:block; width:100%; height:100%; touch-action:none; }

  .pill { position:fixed; z-index:10; background:rgba(255,255,255,.94); color:#29303D;
    border-radius:18px; padding:10px 16px; font-weight:800; font-size:16px;
    box-shadow:0 6px 22px rgba(0,0,0,.35); }

  /* карточка текущего элемента */
  #card { top:12px; left:50%; transform:translateX(-50%); min-width:230px; text-align:center; }
  #cardEmoji { font-size:40px; line-height:1; }
  #cardWord { font-size:26px; font-weight:900; color:#29303D; margin-top:2px; letter-spacing:.5px; }
  #cardPos { display:inline-block; margin-top:5px; font-size:11px; font-weight:800; color:#7150b8;
    background:#EEE7FA; border-radius:999px; padding:3px 10px; }
  #dots { margin-top:7px; display:flex; gap:6px; justify-content:center; }
  .dot { width:9px; height:9px; border-radius:50%; background:#D8D2E6; }
  .dot.on { background:#A385E0; }
  .dot.pass { background:#28BD9F; }
  .dot.fail { background:#F2805A; }

  /* HUD: вагонетка + XP */
  #hud { top:12px; left:12px; font-size:14px; padding:8px 12px; }
  #hud b { color:#A385E0; }

  /* превью камеры для жеста (pinch) — зеркалим как селфи */
  #camv { position:fixed; z-index:12; top:64px; right:12px; transform:scaleX(-1);
    width:150px; height:112px; object-fit:cover; border-radius:16px; border:3px solid #fff;
    box-shadow:0 8px 24px rgba(0,0,0,.4); background:#0b1220; display:none; }

  /* микрофон + шкала записи */
  #mic { bottom:54px; left:50%; transform:translateX(-50%); width:250px; padding:8px 14px; }
  #mic .lbl { font-size:13px; color:#565D6E; font-weight:800; text-align:center; }
  .bar { height:12px; border-radius:8px; background:#E7E2DA; overflow:hidden; margin-top:6px; }
  .bar > div { height:100%; width:0%; border-radius:8px; transition:width .05s linear; }
  #rmsfill { background:linear-gradient(90deg,#28BD9F,#F2805A); }
  #recwrap { margin-top:6px; display:none; }
  #recfill { background:linear-gradient(90deg,#A385E0,#5EC8E0); }

  #hint { bottom:14px; left:50%; transform:translateX(-50%); z-index:10; font-size:12.5px;
    font-weight:800; color:#fff; background:rgba(0,0,0,.42); padding:7px 14px; border-radius:14px; }

  #banner { top:42%; left:50%; transform:translate(-50%,-50%); display:none; font-size:21px;
    z-index:20; background:#A385E0; color:#fff; box-shadow:0 10px 30px rgba(0,0,0,.5); text-align:center; }
  #banner.ok { background:#28BD9F; }
  #banner.review { background:#F5B400; }
  #banner.retry { background:#F2805A; }

  .overlay { position:fixed; inset:0; z-index:30; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:14px; color:#fff; text-align:center; padding:24px;
    background:linear-gradient(165deg,#2b2140,#4a2f6e); }
  .overlay h1 { font-size:30px; font-weight:900; }
  .overlay p { font-size:15px; font-weight:700; opacity:.95; max-width:440px; line-height:1.45; }
  .bigbtn { margin-top:6px; border:0; border-radius:999px; padding:15px 34px; font-size:18px;
    font-weight:900; color:#4a2f6e; background:#fff; box-shadow:0 10px 30px rgba(0,0,0,.35); cursor:pointer; }
  #summary { display:none; }
  #adult { display:none; z-index:36; background:rgba(20,12,32,.82); }
  #adult .card { background:#fff; color:#29303D; border-radius:24px; padding:26px; max-width:360px; }
  #adult h2 { font-size:21px; font-weight:900; margin-bottom:6px; }
  #adult p { color:#565D6E; font-weight:700; }
</style>
</head>
<body>
  <canvas id="c"></canvas>
  <video id="camv" autoplay muted playsinline></video>

  <div id="hud" class="pill">🛒 <span id="cart">0</span>/<span id="cartTotal">0</span> &nbsp;·&nbsp; <b>XP <span id="xp">0</span></b></div>

  <div id="card" class="pill">
    <div id="cardEmoji">💎</div>
    <div id="cardWord">…</div>
    <div id="cardPos"></div>
    <div id="dots"></div>
  </div>

  <div id="mic" class="pill">
    <div class="lbl" id="miclbl">🎤 Микрофон</div>
    <div class="bar"><div id="rmsfill"></div></div>
    <div id="recwrap"><div class="bar"><div id="recfill"></div></div></div>
  </div>

  <div id="hint">Сожми пальцы и потяни вниз — или коснись кристалла</div>
  <div id="banner" class="pill"></div>

  <div id="start" class="overlay">
    <h1>⛏ Шахта звуков</h1>
    <p id="startText">Добывай кристаллы голосом! Расшатай кристалл щепотью пальцев (или касанием) и чётко произнеси слово. Чем чище звук — тем больше добыча.</p>
    <button id="go" class="bigbtn">Начать ▶</button>
  </div>

  <div id="summary" class="overlay">
    <h1 id="sumTitle">Смена окончена! ⛏</h1>
    <p id="sumText"></p>
    <button id="again" class="bigbtn">Ещё раз 🔄</button>
  </div>

  <div id="adult" class="overlay">
    <div class="card">
      <h2>Нужен взрослый 🔒</h2>
      <p>Этот кристалл добывают вместе со взрослым. Взрослый рядом?</p>
      <button id="adultOk" class="bigbtn" style="color:#fff;background:#28BD9F;margin-top:14px;">Я рядом, начать</button>
    </div>
  </div>

  <!--THREE_LIB-->
  <script>
  (function(){
    if (!window.THREE) {
      document.getElementById('startText').textContent = 'Не удалось загрузить 3D-движок. Перезапусти приложение.';
      return;
    }
    var THREE = window.THREE;
    function clamp01(x){ return x < 0 ? 0 : (x > 1 ? 1 : x); }

    // ===== урок из моста (контракт SoundMineLesson) =====
    var LESSON = null;
    try { if (window.SpeechSteps && window.SpeechSteps.getLesson)
      LESSON = JSON.parse(window.SpeechSteps.getLesson()); } catch (e) {}
    if (!LESSON) LESSON = { id:'demo', targetSound:{ phoneme:'р', positions:['initial'] }, language:'ru',
      level:'word', items:[{ id:'d1', text:'рыба', emoji:'🐟' }],
      assessment:{ engine:'speechsuper', passThreshold:80, maxAttempts:3, reviewBand:[50,75] },
      progression:{ masteryThreshold:80, advanceTo:'auto' }, rewards:{ xpPerItem:10, streakBonus:5 } };
    var ITEMS = LESSON.items || [];
    var ASMT = LESSON.assessment || { passThreshold:80, maxAttempts:3, reviewBand:[50,75] };
    var PHONEME = (LESSON.targetSound && LESSON.targetSound.phoneme) || '';
    var PASS = ASMT.passThreshold || 80, MAXTRY = ASMT.maxAttempts || 3;
    var BAND_LO = (ASMT.reviewBand && ASMT.reviewBand[0]) || 50;
    var BAND_HI = (ASMT.reviewBand && ASMT.reviewBand[1]) || (PASS - 1);
    var REWARDS = LESSON.rewards || { xpPerItem:10, streakBonus:5 };

    // настройки логопеда (опционально): difficulty смещает порог зачёта.
    var DIFF = 1.0;
    try { if (window.SpeechSteps && window.SpeechSteps.getConfig){
      var cfg = JSON.parse(window.SpeechSteps.getConfig());
      if (cfg && cfg.difficulty === 'easy') DIFF = 0.85;
      else if (cfg && cfg.difficulty === 'hard') DIFF = 1.12;
    } } catch (e) {}
    var PASS_EFF = Math.round(PASS * DIFF);

    var POS_LBL = { initial:'в начале слова', medial:'в середине', final:'в конце' };
    var LEVEL_HUE = { isolation:0xF2805A, syllable:0xF5B400, word:0x5EC8E0,
      phrase:0x7FBF6A, sentence:0x5B8DEF, story:0xA385E0 };
    var CRY_COLOR = LEVEL_HUE[LESSON.level] || 0x5EC8E0;

    // ===== рендер / сцена / камера (пещера) =====
    var canvas = document.getElementById('c');
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x150f1f);
    scene.fog = new THREE.Fog(0x150f1f, 14, 34);

    var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    camera.position.set(0, 3.2, 9.4);
    function resize(){ var w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    window.addEventListener('resize', resize);

    scene.add(new THREE.AmbientLight(0x6b5a8a, 0.5));
    var key = new THREE.DirectionalLight(0xFFE0B0, 0.7); key.position.set(4, 9, 7);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
    // тёплый фонарь шахтёра у вагонетки
    var lantern = new THREE.PointLight(0xFFB85C, 1.4, 22, 1.8); lantern.position.set(6.4, 2.4, 2.2); scene.add(lantern);
    var lanternBulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xFFD98A })); lanternBulb.position.copy(lantern.position); scene.add(lanternBulb);

    // пол + задняя стена пещеры (процедурно — без ассетов)
    var rockMat = new THREE.MeshStandardMaterial({ color: 0x3a3147, roughness: 0.98, flatShading: true });
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 26), rockMat.clone());
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.5; floor.receiveShadow = true; scene.add(floor);
    var wall = new THREE.Mesh(new THREE.BoxGeometry(28, 14, 1.4), new THREE.MeshStandardMaterial({ color: 0x2c2538, roughness: 1, flatShading: true }));
    wall.position.set(0, 4.5, -2.4); wall.receiveShadow = true; scene.add(wall);
    // валуны вдоль стены — объём
    (function(){
      var bm = new THREE.MeshStandardMaterial({ color: 0x453a57, roughness: 0.96, flatShading: true });
      var pts = [[-7,-1.7],[-5,-1.9],[7,-1.7],[5.5,-1.9],[-2.5,-2],[2.5,-2],[0,-2]];
      for (var i = 0; i < pts.length; i++){
        var r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 + Math.random() * 0.7), bm);
        r.position.set(pts[i][0], -0.1 + Math.random() * 0.3, pts[i][1]);
        r.rotation.set(Math.random(), Math.random(), Math.random()); r.castShadow = true; scene.add(r);
      }
    })();

    // ===== вагонетка (наполняется добытыми кристаллами) =====
    var CART = new THREE.Vector3(6.4, 0.55, 2.0);
    (function(){
      var wood = new THREE.MeshStandardMaterial({ color: 0x6E4423, roughness: 0.9 });
      var metal = new THREE.MeshStandardMaterial({ color: 0x8a8f9c, metalness: 0.6, roughness: 0.35 });
      var box = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.0, 1.3), wood);
      box.position.copy(CART); box.castShadow = true; box.receiveShadow = true; scene.add(box);
      [-0.6, 0.6].forEach(function(zx){
        var w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 16), metal);
        w.rotation.z = Math.PI / 2; w.position.set(CART.x - 0.85, 0.18, CART.z + zx); scene.add(w);
      });
    })();
    // блестящая «куча» внутри вагонетки — растёт по мере добычи
    var cartPile = new THREE.Group(); cartPile.position.set(CART.x, CART.y + 0.5, CART.z); scene.add(cartPile);

    // ===== кристаллы (по одному на элемент урока) =====
    var crystals = [];
    var n = ITEMS.length, spanX = Math.min(11.2, Math.max(4, n * 1.15));
    for (var i = 0; i < n; i++){
      var frac = n > 1 ? (i / (n - 1)) : 0.5;
      var x = -spanX / 2 + frac * spanX;
      var y = 2.05 + Math.sin(frac * Math.PI) * 0.85;        // лёгкая дуга
      var z = -1.5 + Math.cos(frac * Math.PI - Math.PI / 2) * 0.2;
      var hue = new THREE.Color(CRY_COLOR);
      var mat = new THREE.MeshStandardMaterial({ color: hue, emissive: hue.clone().multiplyScalar(0.4),
        emissiveIntensity: 0.5, metalness: 0.25, roughness: 0.18, flatShading: true,
        transparent: true, opacity: 0.96 });
      var m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 0), mat);
      m.position.set(x, y, z); m.rotation.y = Math.random() * 3; m.castShadow = true; scene.add(m);
      crystals.push({ mesh: m, baseX: x, baseY: y, baseZ: z, state: 'idle', flyT: 0, item: ITEMS[i] });
    }

    // частицы-осколки (процедурно)
    var shards = [];
    function burst(pos, color, count){
      var mat = new THREE.MeshBasicMaterial({ color: color });
      for (var i = 0; i < (count || 10); i++){
        var s = new THREE.Mesh(new THREE.TetrahedronGeometry(0.1 + Math.random() * 0.1), mat);
        s.position.copy(pos);
        var sp = 2 + Math.random() * 3;
        s.userData = { vx: (Math.random() - 0.5) * sp, vy: 2 + Math.random() * 3, vz: (Math.random() - 0.5) * sp, life: 1 };
        scene.add(s); shards.push(s);
      }
    }

    // ===== микрофон (RMS + спектр; та же эвристика, что в зонах мира) =====
    var actx = null, analyser = null, td = null, fd = null, binHz = 43;
    var hiStartBin = 93, shStartBin = 46, midStartBin = 16, loStartBin = 2;
    var rmsLevel = 0, hissRatio = 0, shRatio = 0, loRatio = 0, midRatio = 0, centroidHz = 0, micFlux = 0, prevRms = 0;
    var voicedNow = false;
    function ensureAudio(){ if (!actx){ var AC = window.AudioContext || window.webkitAudioContext; actx = new AC(); }
      if (actx.state === 'suspended') actx.resume(); }
    function initAudio(){
      ensureAudio();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream){
        var src = actx.createMediaStreamSource(stream);
        analyser = actx.createAnalyser(); analyser.fftSize = 1024; src.connect(analyser);
        td = new Uint8Array(analyser.fftSize); fd = new Uint8Array(analyser.frequencyBinCount);
        binHz = actx.sampleRate / analyser.fftSize;
        loStartBin = Math.max(1, Math.floor(80 / binHz)); midStartBin = Math.floor(700 / binHz);
        shStartBin = Math.floor(2000 / binHz); hiStartBin = Math.floor(4000 / binHz);
      }).catch(function(){ /* без микрофона — оценка будет низкой, цикл всё равно завершится */ });
    }
    function readMic(){
      if (!analyser) return;
      analyser.getByteTimeDomainData(td);
      var sum = 0; for (var i = 0; i < td.length; i++){ var v = (td[i] - 128) / 128; sum += v * v; }
      var rms = Math.min(1, Math.sqrt(sum / td.length) * 4);
      rmsLevel += (rms - rmsLevel) * 0.3;
      micFlux += (Math.abs(rms - prevRms) - micFlux) * 0.25; prevRms = rms;
      analyser.getByteFrequencyData(fd);
      var tot = 0, hi = 0, sh = 0, mid = 0, lo = 0, cenNum = 0;
      for (var j = 1; j < fd.length; j++){ var a = fd[j]; tot += a; cenNum += a * j * binHz;
        if (j >= hiStartBin) hi += a; else if (j >= shStartBin) sh += a;
        else if (j >= midStartBin) mid += a; else if (j >= loStartBin) lo += a; }
      var dn = tot > 30 ? tot : 1;
      hissRatio += (hi / dn - hissRatio) * 0.3; shRatio += (sh / dn - shRatio) * 0.3;
      midRatio += (mid / dn - midRatio) * 0.3; loRatio += (lo / dn - loRatio) * 0.3;
      centroidHz += ((tot > 30 ? cenNum / tot : 0) - centroidHz) * 0.3;
    }
    function matchSound(letter){
      voicedNow = (loRatio + midRatio) > 0.45 && hissRatio < 0.35 && rmsLevel > 0.06;
      if (rmsLevel < 0.05) return 0;
      var L = (letter || '').charAt(0).toUpperCase();
      if (!L) return rmsLevel > 0.08 ? 1 : 0;
      if ('СЗЦ'.indexOf(L) >= 0) return clamp01((hissRatio - 0.38) / 0.30) * clamp01((centroidHz - 3400) / 2600);
      if ('ШЖЩЧ'.indexOf(L) >= 0) return clamp01((shRatio - 0.26) / 0.24) * clamp01((4300 - centroidHz) / 2300) * clamp01(hissRatio / 0.22);
      if (L === 'Р') return clamp01((micFlux - 0.03) / 0.06) * (voicedNow ? 1 : 0.4);
      if ('МНЛ'.indexOf(L) >= 0) return (voicedNow ? 1 : 0) * clamp01((1400 - centroidHz) / 900) * clamp01((loRatio - 0.18) / 0.30);
      if ('ИЭЕ'.indexOf(L) >= 0) return (voicedNow ? 1 : 0) * clamp01((centroidHz - 800) / 1400);
      if ('АОУЫЯЁЮ'.indexOf(L) >= 0) return (voicedNow ? 1 : 0) * clamp01((1700 - centroidHz) / 1500);
      return clamp01(rmsLevel / 0.2);
    }

    // ===== ASSESS — оценка произношения (0..100) =====
    // СЕЙЧАС: on-device эвристика по микрофону (офлайн, голос не уходит наружу).
    // ТОЧКА ПОДКЛЮЧЕНИЯ реального движка: SpeechSuper (ru) / Cybernet (kk).
    // Заменить тело на вызов API, сохранив контракт { score, transcription }.
    var recSamples = [], recPeakRms = 0;
    function assessFinish(item){
      var arr = recSamples.slice(0).sort(function(a, b){ return b - a; });
      if (arr.length === 0) return { score: 0, transcription: '' };
      var topN = Math.max(1, Math.floor(arr.length * 0.4)), s = 0;
      for (var i = 0; i < topN; i++) s += arr[i];
      var match = s / topN;
      var loud = Math.min(1, recPeakRms / 0.3);
      var score = Math.round(clamp01(match * 0.8 + loud * 0.2) * 100);
      var transcription = score >= 50 ? item.text : (item.text || '').replace(/р/gi, 'л');
      return { score: score, transcription: transcription };
    }

    // ===== синтез/SFX =====
    function tone(freq, dur, type, vol){ if (!actx) return;
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq; g.gain.value = vol || 0.12;
      o.connect(g); g.connect(actx.destination); var t0 = actx.currentTime;
      g.gain.setValueAtTime(g.gain.value, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.start(t0); o.stop(t0 + dur); }
    function chime(){ tone(523, 0.16, 'triangle', 0.12); setTimeout(function(){ tone(784, 0.22, 'triangle', 0.12); }, 110); }
    function crack(){ tone(150, 0.18, 'square', 0.10); }
    function sparkle(){ tone(1175, 0.12, 'triangle', 0.10); }

    // ===== Үнчик говорит вслух (мост speak → нейроголос; иначе встроенный TTS) =====
    var synth = window.speechSynthesis || null, ruVoice = null;
    function pickVoice(){ if (!synth) return null; var vs = synth.getVoices() || [];
      for (var i = 0; i < vs.length; i++){ if (/ru/i.test(vs[i].lang) && /google|yandex|natural|neural|online|enhanced/i.test(vs[i].name)) return vs[i]; }
      for (var j = 0; j < vs.length; j++){ if (/ru/i.test(vs[j].lang)) return vs[j]; } return null; }
    try { if (synth){ synth.getVoices(); ruVoice = pickVoice(); } } catch (e) {}
    if (synth) synth.onvoiceschanged = function(){ ruVoice = pickVoice(); };
    function speak(text){
      if (window.SpeechSteps && typeof window.SpeechSteps.speak === 'function'){
        try { window.SpeechSteps.speak(text); return; } catch (e) {} }
      var clean = (text || '').replace(/[^0-9A-Za-z\\u0400-\\u04FF\\s.,!?-]/g, ' ').replace(/\\s+/g, ' ').trim();
      try { if (synth && clean){ synth.cancel(); var u = new SpeechSynthesisUtterance(clean);
        u.lang = 'ru-RU'; u.rate = 0.9; u.pitch = 1.1; if (!ruVoice) ruVoice = pickVoice(); if (ruVoice) u.voice = ruVoice;
        synth.speak(u); } } catch (e) {}
    }

    // ===== телеметрия (мост) =====
    function emit(obj){ if (window.SpeechSteps && window.SpeechSteps.onEvent){
      try { window.SpeechSteps.onEvent(JSON.stringify(obj)); } catch (e) {} } }

    // ===== сохранение пройденных кристаллов =====
    var passedMap = {};
    function gameSave(){ if (window.SpeechSteps && window.SpeechSteps.saveState)
      window.SpeechSteps.saveState(JSON.stringify({ lessonId: LESSON.id, passed: passedMap })); }
    function loadSaved(){ try {
      var raw = (window.SpeechSteps && window.SpeechSteps.loadState) ? window.SpeechSteps.loadState() : null;
      if (!raw) return; var d = (typeof raw === 'string') ? JSON.parse(raw) : raw;
      if (!d || d.lessonId !== LESSON.id || !d.passed) return; passedMap = d.passed || {};
    } catch (e) {} }

    // ===== жест pinch-pull (MediaPipe HandLandmarker) + фолбэк на касание =====
    var VIS_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
    var HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
    var camv = document.getElementById('camv');
    var handLm = null, handState = 'idle', handMode = false;
    var hand = { x: 0.5, y: 0.5, has: false, pinch: false }; // сглаженная середина щепоти
    var pinchHist = []; // история y середины для детекции «потягивания»
    function initHand(){
      if (handState !== 'idle') return; handState = 'cam';
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 360 }, audio: false })
        .then(function(stream){ camv.srcObject = stream; return camv.play(); })
        .then(function(){ handState = 'loading'; return import(VIS_CDN); })
        .then(function(v){ return v.FilesetResolver.forVisionTasks(VIS_CDN + '/wasm').then(function(fs){
          return v.HandLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'GPU' },
            runningMode: 'VIDEO', numHands: 1 }); }); })
        .then(function(lm){ handLm = lm; handState = 'ready'; handMode = true; camv.style.display = 'block'; })
        .catch(function(){ handState = 'error'; handMode = false; });
    }
    function readHand(){
      if (handState !== 'ready' || !camv.videoWidth) return;
      var r; try { r = handLm.detectForVideo(camv, performance.now()); } catch (e) { return; }
      if (!r || !r.landmarks || !r.landmarks[0]){ hand.has = false; hand.pinch = false; pinchHist.length = 0; return; }
      var lm = r.landmarks[0], thumb = lm[4], index = lm[8];
      var mx = (thumb.x + index.x) / 2, my = (thumb.y + index.y) / 2;
      // зеркалим X (селфи) и фильтруем дрожь (low-pass) — детские руки трясутся
      var sx = 1 - mx;
      hand.x += (sx - hand.x) * 0.35; hand.y += (my - hand.y) * 0.35; hand.has = true;
      var d = Math.hypot(thumb.x - index.x, thumb.y - index.y); // нормированная дистанция
      // гистерезис, чтобы pinch не мерцал
      if (!hand.pinch && d < 0.045) hand.pinch = true;
      else if (hand.pinch && d > 0.075) hand.pinch = false;
      if (hand.pinch){ pinchHist.push({ y: hand.y, t: performance.now() });
        while (pinchHist.length && performance.now() - pinchHist[0].t > 320) pinchHist.shift();
      } else pinchHist.length = 0;
    }
    // «потягивание»: при сжатой щепоти середина ушла вниз больше порога за ~300мс
    function pullFired(){
      if (!hand.pinch || pinchHist.length < 3) return false;
      var dy = pinchHist[pinchHist.length - 1].y - pinchHist[0].y;
      return dy > 0.06;
    }

    // ===== ввод: касание/клик (raycast в текущий кристалл) =====
    var raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pickHitsCurrent(clientX, clientY){
      var cr = curCrystal(); if (!cr) return false;
      ndc.x = (clientX / window.innerWidth) * 2 - 1; ndc.y = -(clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObject(cr.mesh, false).length > 0;
    }
    canvas.addEventListener('pointerdown', function(e){
      if (phase === 'await' && pickHitsCurrent(e.clientX, e.clientY)) beginMine(false);
    });

    // ===== состояние цикла =====
    var phase = 'intro';       // intro | present | await | record | assess | feedback | done
    var idx = 0, attemptNo = 1, phaseT = 0, recElapsed = 0;
    var cartCount = 0, xp = 0, streak = 0, reviewCount = 0;
    var REC_SECS = 2.6, AWAIT_MIN = 0;
    var clock = new THREE.Clock(), t = 0, fpsEMA = 60;

    var cardEmoji = document.getElementById('cardEmoji'), cardWord = document.getElementById('cardWord');
    var cardPos = document.getElementById('cardPos'), dotsEl = document.getElementById('dots');
    var miclbl = document.getElementById('miclbl'), recwrap = document.getElementById('recwrap');
    var recfill = document.getElementById('recfill'), rmsfill = document.getElementById('rmsfill');
    var hintEl = document.getElementById('hint'), bannerEl = document.getElementById('banner');
    var cartEl = document.getElementById('cart'), xpEl = document.getElementById('xp');
    function curCrystal(){ return crystals[idx] || null; }
    function curItem(){ return ITEMS[idx] || null; }

    function banner(txt, cls){ bannerEl.textContent = txt; bannerEl.className = 'pill ' + (cls || '');
      bannerEl.style.display = 'block'; setTimeout(function(){ bannerEl.style.display = 'none'; }, 1800); }

    function renderDots(){
      var html = '';
      for (var i = 0; i < ITEMS.length; i++){
        var c = 'dot';
        if (passedMap[ITEMS[i].id] === 'pass') c += ' pass';
        else if (passedMap[ITEMS[i].id] === 'review' || passedMap[ITEMS[i].id] === 'retry') c += ' fail';
        else if (i === idx) c += ' on';
        html += '<span class="' + c + '"></span>';
      }
      dotsEl.innerHTML = html;
    }
    document.getElementById('cartTotal').textContent = ITEMS.length;
    function updateHUD(){ cartEl.textContent = cartCount; xpEl.textContent = xp; }

    // ===== показать текущий элемент =====
    var pendingAdultItem = null;
    function presentItem(){
      // пропускаем уже пройденные (при возврате)
      while (idx < ITEMS.length && passedMap[ITEMS[idx].id] === 'pass') idx++;
      if (idx >= ITEMS.length){ finish(); return; }
      var it = curItem(); attemptNo = 1;
      // гейт «нужен взрослый»
      if (it.requiresParent && pendingAdultItem !== it.id){
        pendingAdultItem = it.id; document.getElementById('adult').style.display = 'flex';
        emit({ event: 'adult_confirm_requested', itemId: it.id }); phase = 'gate'; return;
      }
      cardEmoji.textContent = it.emoji || '💎';
      cardWord.textContent = it.text || '';
      cardPos.textContent = it.position ? POS_LBL[it.position] || '' : '';
      cardPos.style.display = it.position ? 'inline-block' : 'none';
      renderDots(); updateHUD();
      recwrap.style.display = 'none';
      miclbl.textContent = '👌 Расшатай кристалл';
      hintEl.style.display = 'block';
      hintEl.textContent = handMode ? 'Сожми пальцы и потяни вниз — или коснись кристалла'
        : 'Коснись кристалла, чтобы расшатать';
      speak(it.text);                 // эталонное произношение модели
      var cr = curCrystal(); if (cr) cr.state = 'idle';
      phase = 'present'; phaseT = 0;
    }
    document.getElementById('adultOk').addEventListener('click', function(){
      document.getElementById('adult').style.display = 'none'; presentItem();
    });

    // переход к добыче (расшатать → запись). gestureOk: жест или касание.
    var gestureWasUsed = false;
    function beginMine(byGesture){
      if (phase !== 'await' && phase !== 'present') return;
      gestureWasUsed = !!byGesture;
      var cr = curCrystal(); if (cr) cr.state = 'loosen';
      crack(); phase = 'loosen'; phaseT = 0;
    }

    // ===== оценка результата записи =====
    function gradeAndReact(){
      var it = curItem(); var res = assessFinish(it);
      var score = res.score;
      var status = score >= PASS_EFF ? 'pass' : (score >= BAND_LO && score <= BAND_HI ? 'review' : 'retry');
      var dur = Math.round(recElapsed * 1000);
      // одна запись на попытку (как Pronunciation Attempt History)
      emit({ event: 'attempt', lessonId: LESSON.id, itemId: it.id, level: LESSON.level,
        targetSound: PHONEME, expected: it.text, transcription: res.transcription, score: score,
        attemptNo: attemptNo, gestureOk: gestureWasUsed, durationMs: dur, status: status });

      var cr = curCrystal();
      if (status === 'pass'){
        passedMap[it.id] = 'pass'; cartCount++; streak++;
        xp += (REWARDS.xpPerItem || 10) + (streak >= 2 ? (REWARDS.streakBonus || 0) : 0);
        if (cr){ cr.state = 'fly'; cr.flyT = 0; } chime(); sparkle();
        banner('Чисто! +' + (REWARDS.xpPerItem || 10) + ' XP 💎', 'ok');
        speak('Отлично! Кристалл твой!');
        advance();
      } else if (status === 'review'){
        passedMap[it.id] = 'review'; reviewCount++; streak = 0;
        if (cr) cr.state = 'cracked';
        banner('Почти! Логопед послушает 👂', 'review'); crack();
        speak('Уже почти получается!');
        if (attemptNo < MAXTRY){ attemptNo++; phase = 'feedback'; phaseT = 0; retryAfterFeedback = true; }
        else { advance(); }
      } else {
        streak = 0;
        if (attemptNo < MAXTRY){
          banner('Попробуй ещё раз 🔁', 'retry');
          speak('Слушай ещё раз: ' + it.text);
          attemptNo++; retryAfterFeedback = true; phase = 'feedback'; phaseT = 0;
        } else {
          passedMap[it.id] = 'retry'; if (cr) cr.state = 'cracked';
          banner('Идём дальше — вернёмся позже 👍', 'retry');
          advance();
        }
      }
      updateHUD(); renderDots(); gameSave();
    }
    var retryAfterFeedback = false;
    function advance(){ retryAfterFeedback = false; idx++; phase = 'feedback'; phaseT = 0; }

    function finish(){
      phase = 'done';
      var total = ITEMS.length, passN = 0;
      for (var i = 0; i < ITEMS.length; i++) if (passedMap[ITEMS[i].id] === 'pass') passN++;
      var mastery = total ? Math.round((passN / total) * 100) : 0;
      var thr = (LESSON.progression && LESSON.progression.masteryThreshold) || 80;
      var unlocked = mastery >= thr;
      document.getElementById('sumText').innerHTML =
        'Добыто кристаллов: <b>' + passN + '/' + total + '</b><br>' +
        'XP за смену: <b>' + xp + '</b><br>' +
        'Точность: <b>' + mastery + '%</b>' +
        (reviewCount ? '<br>На проверку логопеду: ' + reviewCount : '') +
        (unlocked && REWARDS.unlock ? '<br>🎁 Открыто: ' + REWARDS.unlock : '');
      document.getElementById('summary').style.display = 'flex';
      emit({ event: 'summary', lessonId: LESSON.id, level: LESSON.level, targetSound: PHONEME,
        passed: passN, total: total, mastery: mastery, xp: xp, reviewCount: reviewCount,
        unlocked: unlocked, unlock: unlocked ? (REWARDS.unlock || null) : null });
      gameSave();
      speak(unlocked ? 'Отличная смена! Ты настоящий мастер звука Р!' : 'Хорошая работа! В следующий раз добудем ещё больше!');
    }

    // ===== цикл =====
    function animate(){
      requestAnimationFrame(animate);
      var dt = Math.min(clock.getDelta(), 0.05); t += dt; phaseT += dt;
      fpsEMA += ((dt > 0 ? 1 / dt : 60) - fpsEMA) * 0.05;
      readMic(); rmsfill.style.width = Math.round(rmsLevel * 100) + '%';
      lanternBulb.material.color.setHex(0xFFD98A);
      lantern.intensity = 1.3 + Math.sin(t * 7) * 0.12 + Math.sin(t * 13) * 0.05; // мерцание фонаря

      if (handMode && (phase === 'present' || phase === 'await')){
        readHand();
        // деградация при низком FPS — жест выключаем, остаётся касание
        if (fpsEMA < 17){ handMode = false; camv.style.display = 'none';
          hintEl.textContent = 'Коснись кристалла, чтобы расшатать'; }
        if ((phase === 'await' || phase === 'present') && pullFired()) beginMine(true);
      }

      // анимация кристаллов
      for (var i = 0; i < crystals.length; i++){
        var cr = crystals[i], m = cr.mesh;
        if (cr.state === 'fly'){
          cr.flyT += dt; var k = Math.min(1, cr.flyT / 0.8);
          m.position.lerp(new THREE.Vector3(CART.x, CART.y + 0.7, CART.z), 0.18);
          m.scale.setScalar(Math.max(0.05, 1 - k)); m.rotation.y += dt * 10;
          if (k >= 1){ cr.state = 'gone'; m.visible = false; burst(m.position, CRY_COLOR, 12); growPile(); }
          continue;
        }
        if (cr.state === 'gone'){ continue; }
        if (cr.state === 'cracked'){
          m.material.emissiveIntensity = 0.12; m.material.opacity = 0.55; m.scale.setScalar(0.82);
          m.rotation.y += dt * 0.4; m.position.y = cr.baseY + Math.sin(t * 2 + i) * 0.03; continue;
        }
        // idle / активный
        var active = (i === idx) && (phase === 'present' || phase === 'await' || phase === 'loosen' || phase === 'record');
        var pulse = active ? (0.7 + Math.sin(t * 6) * 0.3) : 0.45;
        m.material.emissiveIntensity = pulse;
        m.rotation.y += dt * (active ? 1.6 : 0.5);
        var lift = (cr.state === 'loosen') ? Math.sin(t * 40) * 0.06 : 0;            // дрожит, когда расшатан
        var pull = (cr.state === 'record') ? 0.5 : 0;                                // выдвинут к ребёнку
        m.position.set(cr.baseX, cr.baseY + Math.sin(t * 2 + i) * 0.06 + lift, cr.baseZ + pull);
        if (active) m.scale.setScalar(1.0 + Math.sin(t * 6) * 0.04); else m.scale.setScalar(1.0);
      }

      // частицы
      for (var p = shards.length - 1; p >= 0; p--){
        var s = shards[p], u = s.userData; u.life -= dt * 1.3;
        u.vy -= 9 * dt; s.position.x += u.vx * dt; s.position.y += u.vy * dt; s.position.z += u.vz * dt;
        s.rotation.x += dt * 6; s.rotation.y += dt * 5; s.scale.setScalar(Math.max(0.01, u.life));
        if (u.life <= 0){ scene.remove(s); shards.splice(p, 1); }
      }

      // машина состояний
      if (phase === 'present'){
        // ждём, пока проговорится эталон, затем разрешаем жест/касание
        if (phaseT > 0.5) phase = 'await';
      } else if (phase === 'loosen'){
        var crl = curCrystal(); if (crl) crl.state = 'loosen';
        if (phaseT > 0.5){                       // открываем микрофон
          var cr2 = curCrystal(); if (cr2) cr2.state = 'record';
          recSamples = []; recPeakRms = 0; recElapsed = 0;
          recwrap.style.display = 'block';
          miclbl.textContent = '🎤 Скажи: ' + (curItem().text || '');
          hintEl.textContent = 'Говори чётко!';
          phase = 'record'; phaseT = 0;
        }
      } else if (phase === 'record'){
        recElapsed += dt;
        if (rmsLevel > 0.05){ recSamples.push(matchSound(PHONEME)); if (rmsLevel > recPeakRms) recPeakRms = rmsLevel; }
        recfill.style.width = Math.round(Math.min(1, recElapsed / REC_SECS) * 100) + '%';
        if (recElapsed >= REC_SECS){ recwrap.style.display = 'none'; phase = 'assess'; phaseT = 0; gradeAndReact(); }
      } else if (phase === 'feedback'){
        if (phaseT > 1.8){
          if (retryAfterFeedback){ // тот же элемент, новая попытка
            renderDots();
            recwrap.style.display = 'none';
            miclbl.textContent = '👌 Расшатай кристалл';
            hintEl.textContent = handMode ? 'Сожми пальцы и потяни вниз — или коснись кристалла' : 'Коснись кристалла';
            var crr = curCrystal(); if (crr) crr.state = 'idle';
            phase = 'await'; phaseT = 0; retryAfterFeedback = false;
          } else { presentItem(); }
        }
      }

      // лёгкое «дыхание» камеры
      camera.position.x = Math.sin(t * 0.25) * 0.25;
      camera.lookAt(0, 2.5, -1);
      renderer.render(scene, camera);
    }

    // куча в вагонетке растёт по числу добытых
    function growPile(){
      var c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18 + Math.random() * 0.08, 0),
        new THREE.MeshStandardMaterial({ color: CRY_COLOR, emissive: new THREE.Color(CRY_COLOR).multiplyScalar(0.3),
          emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.3 }));
      c.position.set((Math.random() - 0.5) * 1.1, (cartCount % 4) * 0.12, (Math.random() - 0.5) * 0.8);
      c.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); cartPile.add(c);
    }

    // ===== старт по жесту пользователя (нужен для AudioContext) =====
    document.getElementById('go').addEventListener('click', function(){
      document.getElementById('start').style.display = 'none';
      ensureAudio(); initAudio();
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) initHand(); // жест опционален
      loadSaved(); resize(); clock.start(); animate();
      presentItem();
      speak('Добро пожаловать в шахту! Добывай кристаллы голосом.');
    });
    document.getElementById('again').addEventListener('click', function(){
      // новая смена: сбрасываем прогресс и сцену
      passedMap = {}; idx = 0; cartCount = 0; xp = 0; streak = 0; reviewCount = 0;
      for (var i = 0; i < crystals.length; i++){ var cr = crystals[i];
        cr.state = 'idle'; cr.mesh.visible = true; cr.mesh.scale.setScalar(1);
        cr.mesh.material.opacity = 0.96; cr.mesh.position.set(cr.baseX, cr.baseY, cr.baseZ); }
      while (cartPile.children.length) cartPile.remove(cartPile.children[0]);
      document.getElementById('summary').style.display = 'none';
      updateHUD(); gameSave(); presentItem();
    });

    resize();
  })();
  </script>
</body>
</html>`;

/**
 * Готовый HTML «Шахты звуков» с ВСТРОЕННЫМ Three.js (офлайн, без сети для
 * движка; MediaPipe для жеста грузится с CDN и опционален). `</script` внутри
 * исходника движка экранируем, чтобы парсер не закрыл тег преждевременно.
 */
export function soundMineHtml(): string {
  const lib = THREE_SRC.replace(/<\/(script)/gi, '<\\/$1');
  return SOUND_MINE_HTML.replace('<!--THREE_LIB-->', '<script>' + lib + '</script>');
}
