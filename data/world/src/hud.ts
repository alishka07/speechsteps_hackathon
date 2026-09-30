/**
 * Интерфейс, состояние и РЕЖИМ «ОШИБКА».
 *
 * Тренер (`coach`) — смысловой центр модуля. Он не пишет «звук не распознан»:
 * каждому коду ошибки из `voiceCheck()` / `grimaceFault()` соответствует
 * разбор «что именно не так» и «что сделать» — то, что сказал бы логопед.
 * Подсказка появляется не мгновенно, а после ~1.1 с непрерывной ошибки: у
 * ребёнка есть время справиться самому, и подсказка не мигает на каждом вдохе.
 *
 * Состояние мира — один объект `flags`, а не десяток отдельных переменных.
 * Поэтому и сохранение, и счётчик этапов, и экран победы считаются по нему
 * автоматически: добавить зону — значит добавить строку в список игр.
 */
export function hud(): string {
  return `
    // ---------- состояние ----------
    var flags = {};            // ключ зоны → пройдена
    var stars = [], collected = 0;
    var won = false, landedHigh = false, jumping = false, vy = 0, t = 0;
    var demoCameraDistance = 0, demoManualDistance = 0;
    var demoActiveSeconds = 0, demoActiveSince = null;
    function startRouteTimer(){ if (demoActiveSince === null) demoActiveSince = performance.now(); }
    function routeDuration(){
      return demoActiveSeconds + (demoActiveSince === null ? 0 : Math.max(0, performance.now() - demoActiveSince) / 1000);
    }
    function stopRouteTimer(){ demoActiveSeconds = routeDuration(); demoActiveSince = null; }
    var clock = new THREE.Clock();

    /** Ключи сохранения: внутренние имена ↔ формат, который читают отчёты. */
    var SAVE_KEY = {
      gate: 'gateOpen', vine: 'bridgeBuilt', fly: 'flewUp', treasure: 'treasureOpen',
      rhythm: 'rhythmDone', fountain: 'fountainDone', dragon: 'roarDone',
      lullaby: 'lullabyDone', trafficlight: 'trafficDone', mirror: 'mirrorDone',
      dungeon: 'dungeonDone'
    };

    var objTitle = document.getElementById('objTitle'), objHint = document.getElementById('objHint');
    var bannerEl = document.getElementById('banner'), micEl = document.getElementById('mic');
    var miclbl = document.getElementById('miclbl'), rmsfill = document.getElementById('rmsfill');
    var taskwrap = document.getElementById('taskwrap'), taskfill = document.getElementById('taskfill');
    var trackEl = document.getElementById('track');

    function setObj(title, hint){
      if (objTitle.textContent !== title) objTitle.textContent = title;
      if (objHint.textContent !== hint) objHint.textContent = hint;
    }
    var bannerTimer = null;
    function banner(text){
      bannerEl.textContent = text; bannerEl.classList.add('show');
      if (bannerTimer) clearTimeout(bannerTimer);
      bannerTimer = setTimeout(function(){ bannerEl.classList.remove('show'); }, 2400);
    }
    /** Шкала задачи: прогресс + «горячее» состояние, когда звук засчитан. */
    function setTask(label, fill, hot){
      taskwrap.style.display = 'block';
      miclbl.textContent = label;
      taskfill.style.width = Math.round(clamp01(fill) * 100) + '%';
      micEl.classList.toggle('hot', !!hot);
    }
    function clearTask(){
      taskwrap.style.display = 'none';
      miclbl.textContent = '🎤 Микрофон';
      micEl.classList.remove('hot');
    }

    // ---------- реплики спутника ----------
    var npcEl = document.getElementById('npc'), npcTextEl = document.getElementById('npcText');
    var npcTimer = null, npcHide = null;
    function say(text, dur){
      npcTextEl.textContent = text;
      npcEl.style.display = 'flex';
      if (npcHide) clearTimeout(npcHide);
      requestAnimationFrame(function(){ npcEl.style.opacity = '1'; });
      if (npcTimer) clearTimeout(npcTimer);
      npcTimer = setTimeout(function(){
        npcEl.style.opacity = '0';
        npcHide = setTimeout(function(){ npcEl.style.display = 'none'; }, 350);
      }, dur || 4500);
      speak(text);
      compTalk = Math.min(6, 1.4 + (text || '').length * 0.06);
    }
    // ---------- индикатор камеры ----------
    // Live preview and a mirrored fingertip marker explain how the controller works.
    var camEl = document.getElementById('cam');
    var camText = document.getElementById('camText');
    var camRetry = document.getElementById('camRetry');
    var camToggle = document.getElementById('camToggle');
    var camPreview = document.getElementById('camPreview');
    var camPointer = document.getElementById('camPointer');
    var camDots = [];
    camRetry.addEventListener('click', function(){
      if (gamePaused || awaitingController || (CFG.demoOnly && won)) return;
      retryVision();
    });
    camToggle.addEventListener('click', function(){
      if (gamePaused || awaitingController || (CFG.demoOnly && won)) return;
      if (camWanted) stopCamera(); else initCamera();
    });
    (function(){
      var host = document.getElementById('camMove');
      for (var i = 0; i < 3; i++){
        var d = document.createElement('i');
        host.appendChild(d); camDots.push(d);
      }
    })();
    function updateCamHud(){
      var msg, cls = '';
      var faceMode = CFG.demoOnly && typeof gardenCameraMode === 'function' && gardenCameraMode();
      if (camState === 'idle' || camState === 'disabled'){ msg = faceMode ? 'Камера выключена · можно помочь кнопкой' : 'Камера выключена · WASD или джойстик'; }
      else if (camState === 'denied'){ msg = 'Доступ к камере закрыт. Разреши его в браузере или играй клавишами.'; cls = 'warn'; }
      else if (camState === 'camera-error'){ msg = 'Не удалось подключить камеру. Проверь устройство и попробуй снова.'; cls = 'warn'; }
      else if (camState === 'requesting') msg = 'Разреши камеру в окне браузера';
      else if (CFG.demoOnly && typeof gardenCameraMode === 'function' && gardenCameraMode() && cameraConnected()){
        msg = gardenStatusHint(); cls = faceSeen ? 'on' : 'warn';
      }
      else if (camState === 'vision-error'){ msg = 'Камера включена, распознавание не загрузилось'; cls = 'warn'; }
      else if (camState === 'loading') msg = 'Камера работает · загружаю управление пальцем…';
      else if (FINGER.active){ msg = 'Палец виден · центр — стоп, края — движение'; cls = 'on'; }
      else if (handLm && FINGER.seen){ msg = 'Вытяни указательный палец'; cls = 'warn'; }
      else if (handLm){ msg = 'Рука не видна · покажи указательный палец'; cls = 'warn'; }
      else if (!POSE.seen){ msg = 'Покажи указательный палец'; cls = 'warn'; }
      else if (!calib) msg = 'Стой ровно — запоминаю тебя…';
      else { msg = 'Шагай на месте, наклоняйся — рулишь'; cls = 'on'; }
      if (camText.textContent !== msg) camText.textContent = msg;
      camRetry.style.display = !faceMode && (camState === 'vision-error' || handFailed) ? 'inline-flex' : 'none';
      camRetry.disabled = camState === 'loading' || handLoading;
      camToggle.textContent = camWanted ? 'Выключить камеру' : 'Включить камеру';
      camToggle.setAttribute('aria-pressed', String(camWanted));
      camPreview.style.display = cameraConnected() ? 'block' : 'none';
      document.getElementById('camGuide').textContent = faceMode ?
        'Смотри в камеру. Руки могут отдыхать: лисёнок ждёт, пока ты поможешь другу.' : cameraConnected() ?
        'Веди указательный палец. Центр — стоп, края — движение. Убери руку, чтобы остановиться.' :
        'WASD или стрелки — ходьба, пробел — прыжок. Q/E поворачивают обзор. Камеру можно включить в любой момент.';
      document.getElementById('camCenter').style.display = faceMode ? 'none' : 'block';
      camPointer.style.display = FINGER.active && !faceMode ? 'block' : 'none';
      camPointer.style.left = ((1 - FINGER.x) * 100) + '%'; camPointer.style.top = (FINGER.y * 100) + '%';
      camEl.className = 'glass ' + cls;
      camDots[0].classList.toggle('lit', FINGER.active && FINGER.x > 0.58);
      camDots[1].classList.toggle('lit', FINGER.active && FINGER.y < 0.42);
      camDots[2].classList.toggle('lit', FINGER.active && FINGER.x < 0.42);
    }
    var micToggle = document.getElementById('micToggle'), micStatus = document.getElementById('micStatus');
    micToggle.addEventListener('click', function(){
      if (micState === 'ready' || micState === 'requesting') stopMicrophone(); else initAudio();
    });
    function updateMicHud(){
      var active = micState === 'ready' || micState === 'requesting';
      micToggle.textContent = active ? 'Выключить микрофон' : 'Включить микрофон';
      micToggle.setAttribute('aria-pressed', String(active));
      micStatus.textContent = micState === 'requesting' ? 'Разреши микрофон в браузере' :
        micState === 'ready' ? 'Микрофон включён' : micState === 'denied' ? 'Доступ закрыт · можно играть жестами' :
        micState === 'error' ? 'Микрофон недоступен · попробуй снова' : 'Для голосовых заданий';
    }

    var said = {};   // «уже говорил» — чтобы вступление зоны не повторялось
    /** Реплика ровно один раз за ключ. */
    function sayOnce(key, text, dur){ if (!said[key]){ said[key] = true; say(text, dur); } }

    // ---------- режим «ошибка»: что не так и что изменить ----------
    var COACH = {
      silent:      ['🎤', 'Тебя не слышно', 'Подойди ближе и скажи в полный голос — полоска микрофона должна ожить.'],
      tooQuiet:    ['🔊', 'Чуть громче',    'Набери воздуха и веди звук громче: полоска должна дойти до конца.'],
      tooLoud:     ['🤫', 'Слишком громко', 'Здесь нужен тихий голос. Говори шёпотом, как на ушко.'],
      voicedHiss:  ['💨', 'Лишний голос',   'Ты гудишь голосом. Выключи голос и пусти тонкую струйку воздуха через зубы.'],
      sLikeSh:     ['👄', 'Получается «ш»', 'Растяни губы в улыбку, а кончик языка опусти за нижние зубы.'],
      shLikeS:     ['👄', 'Получается «с»', 'Округли губы трубочкой и подними широкий язык к нёбу.'],
      weakHiss:    ['🦷', 'Воздуха мало',   'Сомкни зубы почти вплотную и дуй ровной струйкой — звук станет чётким.'],
      weakHush:    ['🦷', 'Воздуха мало',   'Подними язык «чашечкой» к нёбу и выпусти тёплый воздух.'],
      noTrill:     ['🥁', 'Язык не дрожит', 'Подними кончик языка за верхние зубы и заведи мотор: «д-д-дррр».'],
      voicelessR:  ['🔉', 'Нет голоса',     '«Р» звучит, а не шипит — добавь голос, чтобы в горле загудело.'],
      breathy:     ['🌬', 'Это выдох',      'Ты выдыхаешь, а нужен голос. Открой рот шире и тяни «А-а-а».'],
      wrongVowel:  ['🫦', 'Не тот гласный', 'Следи за губами: «О» — колечко, «У» — трубочка, «И» — улыбка.'],
      notSonorant: ['〰️', 'Нужен гул',      'Сомкни губы и тяни низкий гудящий звук: «м-м-м».'],
      weakSound:   ['💡', 'Почти получилось', 'Держи звук ровно и не обрывай — шкала растёт, пока звук не меняется.'],
      dropped:     ['🫁', 'Звук оборвался', 'Вдохни глубже и тяни на одном дыхании, без пауз до конца шкалы.'],
      offbeat:     ['🥁', 'Слоги слиплись', 'Делай паузу между слогами: «па — па — па», а не «папапа».'],
      tooSlow:     ['⏱', 'Слишком медленно', 'Повторяй чаще — три слога подряд, пока шкала не заполнилась.'],
      camOff:      ['📷', 'Не удалось подключить камеру', 'Проверь, разрешён ли браузеру доступ к камере. Пока можно управлять героем джойстиком.'],
      visionError: ['📷', 'Камера включена, но распознавание не загрузилось', 'Нажми «Повторить» в индикаторе камеры — подключение камеры заново не потребуется.'],
      noBody:      ['☝️', 'Покажи руку',   'Покажи камере кисть и вытяни указательный палец. Веди его к краю рамки, чтобы идти. Центр рамки — остановка.'],
      tooClose:    ['↔️', 'Слишком близко',  'Отойди на шаг назад — плечи должны целиком помещаться в кадр.'],
      tooFarCam:   ['↔️', 'Слишком далеко',  'Подойди ближе к камере — иначе движения читаются неточно.'],
      noFace:      ['🪞', 'Лица не видно',  'Держи лицо в рамке камеры и смотри прямо в неё.'],
      noFace2:     ['🪞', 'Не та гримаса',  'Сделай именно то движение, что просит зеркало, и задержи его.'],
      weakFace:    ['🪞', 'Слишком слабо',  'Сделай гримасу крупнее и удержи пару секунд — зеркало считает её.'],
      wrongFace:   ['🪞', 'Это улыбка',     'Сейчас нужна другая гримаса — посмотри на подсказку сверху.']
    };
    var coachEl = document.getElementById('coach');
    var coachIcon = document.getElementById('coachIcon');
    var coachTitle = document.getElementById('coachTitle');
    var coachText = document.getElementById('coachText');
    var coachCode = null, coachFor = 0, coachSpoke = {};

    /**
     * Сообщить об ошибке. Код code равен null, когда всё хорошо.
     * Подсказку показываем после 1.1 с непрерывной ошибки; вслух проговариваем
     * один раз на код, чтобы спутник не тараторил.
     */
    function coach(code, dt){
      if (!code){ coachFor = 0; hideCoach(); return; }
      if (code !== coachCode){ coachCode = code; coachFor = 0; }
      coachFor += dt;
      if (coachFor < 1.1 || coachEl.classList.contains('show')) return;
      var c = COACH[code] || COACH.weakSound;
      coachIcon.textContent = c[0]; coachTitle.textContent = c[1]; coachText.textContent = c[2];
      coachEl.classList.add('show');
      setMood('oops', 2.2);
      nudge();
      if (!coachSpoke[code]){ coachSpoke[code] = true; speak(c[2]); }
    }
    function hideCoach(){ if (coachEl.classList.contains('show')) coachEl.classList.remove('show'); coachCode = null; }
    /** При входе в новую зону разрешаем озвучить её подсказки заново. */
    function resetCoach(){ coachSpoke = {}; coachFor = 0; coachCode = null; hideCoach(); }

    // ---------- звёзды ----------
    /** Звезда с устойчивым ключом: прогресс восстанавливается в любом порядке. */
    function makeStar(x, y, z, key){
      var m = at(shade(new THREE.Mesh(new THREE.OctahedronGeometry(0.42),
        mat(PAL.gold, { emissive: 0x6b4e00, emissiveIntensity: 0.4, flatShading: true }))), x, y, z);
      scene.add(m);
      stars.push({ mesh: m, taken: false, baseY: y, key: key });
    }
    /**
     * Пара звёзд вокруг точки — награда любой зоны (было 7 копий этой функции).
     * Аргумент prefix — короткий ключ из описания игры; он попадает в
     * сохранение, поэтому менять его у существующей игры нельзя: старый
     * прогресс не найдёт свои звёзды и они появятся заново.
     */
    function spawnStars(prefix, cx, cz, y){
      makeStar(cx - 3, y || 1.7, cz + 2.5, prefix + '0');
      makeStar(cx + 3, y || 1.7, cz - 2.5, prefix + '1');
    }
    // наземные звёзды существуют с первого кадра — их можно собрать до задач
    GROUND_STARS.forEach(function(p, i){ makeStar(p[0], 1.7, p[1], 'g' + i); });

    function allTaken(){
      for (var i = 0; i < stars.length; i++) if (!stars[i].taken) return false;
      return stars.length > 0;
    }
    function updateStars(dt){
      for (var i = 0; i < stars.length; i++){
        var s = stars[i];
        s.mesh.rotation.y += dt * 2;
        if (s.taken) continue;
        s.mesh.position.y = s.baseY + Math.sin(t * 2 + i) * 0.15;
        if (Math.abs(player.position.y - s.baseY) < 1.9 &&
            dist(player.position.x, player.position.z, s.mesh.position.x, s.mesh.position.z) < 1.3){
          s.taken = true; s.mesh.visible = false; collected++;
          tone(880, 0.12, 'triangle', 0.12); setMood('happy', 0.9);
          if (!CFG.demoOnly) emit('star', 100);
          gameSave();
        }
      }
    }

    // ---------- счётчики ----------
    /**
     * Зона считается за этап, если логопед её включил и она доступна. Зона с
     * пометкой blocked (например, «Зеркало» без камеры) выпадает из счёта: иначе
     * мир невозможно было бы пройти на устройстве без камеры.
     */
    function counts(g){ return g.optional && gOn[g.key] !== false && !(g.blocked && g.blocked()); }
    /** Сколько этапов в мире с текущими настройками логопеда. */
    function stagesTotal(){
      if (CFG.demoOnly) return 3;
      var n = 4; // ворота, мост, полёт, сундук — базовый путь всегда включён
      for (var i = 0; i < GAMES.length; i++) if (counts(GAMES[i])) n++;
      return n;
    }
    function starsTotal(){
      if (CFG.demoOnly) return 3;
      var n = GROUND_STARS.length + 2; // наземные + пара у сундука
      for (var i = 0; i < GAMES.length; i++)
        if (counts(GAMES[i])) n += (GAMES[i].key === 'rhythm' ? 3 : 2);
      return n;
    }
    function stagesDone(){
      if (CFG.demoOnly) return collected;
      var n = 0;
      ['gate', 'vine', 'fly', 'treasure'].forEach(function(k){ if (flags[k]) n++; });
      for (var i = 0; i < GAMES.length; i++) if (counts(GAMES[i]) && flags[GAMES[i].key]) n++;
      return n;
    }

    var scStars = document.getElementById('scStars'), scStages = document.getElementById('scStages');
    var scTotal = document.getElementById('scTotal');
    var trackDots = [];
    /** Трекер этапов: по точке на зону — видно, сколько осталось. */
    function buildTrack(){
      trackEl.innerHTML = '';
      trackDots = [];
      var total = stagesTotal();
      for (var i = 0; i < total; i++){
        var d = document.createElement('i'); trackEl.appendChild(d); trackDots.push(d);
      }
      scTotal.textContent = total;
    }
    function updateHUD(){
      var done = stagesDone();
      // число этапов может уменьшиться уже во время игры — например, когда
      // выяснилось, что камеры для «Зеркала» нет
      if (trackDots.length !== stagesTotal()) buildTrack();
      scStars.textContent = collected;
      scStages.textContent = done;
      for (var i = 0; i < trackDots.length; i++) trackDots[i].classList.toggle('on', i < done);
    }

    // ---------- сохранение ----------
    function gameSave(){
      if (CFG.demoOnly) return;
      if (!(window.SpeechSteps && window.SpeechSteps.saveState)) return;
      var out = { collected: collected, taken: {}, stagesTotal: stagesTotal(), starsTotal: starsTotal() };
      for (var k in SAVE_KEY) out[SAVE_KEY[k]] = !!flags[k];
      for (var i = 0; i < stars.length; i++) out.taken[stars[i].key] = !!stars[i].taken;
      window.SpeechSteps.saveState(JSON.stringify(out));
    }
    function loadSaved(){
      if (CFG.demoOnly) return;
      try {
        var raw = (window.SpeechSteps && window.SpeechSteps.loadState) ? window.SpeechSteps.loadState() : null;
        if (!raw) return;
        var d = (typeof raw === 'string') ? JSON.parse(raw) : raw;
        if (!d) return;
        for (var k in SAVE_KEY) flags[k] = !!d[SAVE_KEY[k]];
        // восстанавливаем видимый мир по флагам — каждая игра знает свой вид
        for (var i = 0; i < GAMES.length; i++){
          var g = GAMES[i];
          if (flags[g.key] && g.restore) g.restore();
        }
        var tk = d.taken || {};
        for (var s = 0; s < stars.length; s++)
          if (tk[stars[s].key]){ stars[s].taken = true; stars[s].mesh.visible = false; }
        collected = 0;
        for (var c = 0; c < stars.length; c++) if (stars[c].taken) collected++;
        if (flags.treasure && allTaken() && stagesDone() >= stagesTotal()) won = true;
      } catch (e) {}
    }

    // ---------- победа ----------
    function checkWin(){
      if (CFG.demoOnly){
        if (!won && gardenComplete()){ won = true; showWin(); }
        return;
      }
      if (won || !flags.treasure || !allTaken()) return;
      for (var i = 0; i < GAMES.length; i++){
        var g = GAMES[i];
        if (flags[g.key]) continue;
        if (g.optional ? counts(g) : true) return;
      }
      won = true; showWin();
    }
    function showWin(){
      if (CFG.demoOnly){
        stopRouteTimer();
        var cameraDistance = demoCameraDistance, manualDistance = demoManualDistance;
        var controller = cameraDistance > 0 ? (manualDistance > 0 ? 'mixed' : 'camera') : 'keyboard';
        document.getElementById('winTitle').textContent = 'Сад звуков ожил!';
        document.getElementById('winSub').textContent = 'Цветок распустился, рыбка играет с пузырьками, а фонарик светит. Три маленьких чуда — твоя работа!';
        document.getElementById('winStats').style.display = 'none';
        document.getElementById('finishDemo').style.display = 'block';
        document.getElementById('win').style.display = 'flex';
        if (window.SpeechSteps && window.SpeechSteps.onEvent)
          window.SpeechSteps.onEvent(JSON.stringify({ event: 'speech-garden-complete',
            exercise: 'speech-garden', durationSeconds: routeDuration(), collectedCount: collected,
            controller: controller, cameraDistance: cameraDistance, manualDistance: manualDistance, activities: gardenResults() }));
        stopCamera(); stopMicrophone(); setMood('happy', 6);
        say('Цветок, рыбка и фонарик проснулись! Спасибо! Сад звуков ожил!', 4500);
        return;
      }
      document.getElementById('winSub').textContent =
        'Ты прошёл все задания, открыл сундук и вернул острову музыку.';
      document.getElementById('winStars').textContent = collected;
      document.getElementById('winStages').textContent = stagesDone();
      document.getElementById('winZones').textContent = stagesTotal();
      document.getElementById('win').style.display = 'flex';
      setMood('happy', 6);
      emit('Мир «Остров Эха» пройден 🏆', 100); gameSave();
      say('Ты спас Остров Эха! Ты настоящий чемпион! 🏆', 6000);
    }
    function resetGame(){
      stopRouteTimer(); stopCamera(); stopMicrophone();
      if (CFG.demoOnly) gardenReset();
      // наземные звёзды (ключ 'g') остаются, награды зон удаляем и раздадим заново
      for (var i = stars.length - 1; i >= 0; i--){
        if (stars[i].key.charAt(0) !== 'g'){ scene.remove(stars[i].mesh); stars.splice(i, 1); }
      }
      for (var j = 0; j < stars.length; j++){ stars[j].taken = false; stars[j].mesh.visible = true; }
      flags = {}; collected = 0; won = false; vy = 0; landedHigh = false; jumping = false; said = {};
      demoCameraDistance = demoManualDistance = demoActiveSeconds = 0; demoActiveSince = null;
      clearInput(); handWasUp = false;
      camYaw = -Math.PI / 2;
      // шкалы обязательно чистим: иначе зона со шкалой на единице засчитается
      // снова в первом же кадре, как только ребёнок к ней подойдёт
      for (var fk in fills) delete fills[fk];
      onsets = [];
      for (var g = 0; g < GAMES.length; g++) if (GAMES[g].reset) GAMES[g].reset();
      player.position.set(-6, 0, 0); player.rotation.y = Math.PI / 2;
      camera.position.set(-14.6, 4.8, 0); camera.lookAt(-6, 1.25, 0);
      balloon.visible = false;
      document.getElementById('win').style.display = 'none';
      gamePaused = false; pauseReason = null; awaitingController = true;
      document.getElementById('pause').style.display = 'none';
      document.getElementById('start').style.display = 'flex';
      document.getElementById('go').focus();
      if (npcTimer) clearTimeout(npcTimer);
      if (npcHide) clearTimeout(npcHide);
      npcEl.style.display = 'none';
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      resetCoach(); updateHUD(); gameSave();
    }
    document.getElementById('again').addEventListener('click', resetGame);

    /** Общий финал любой зоны: награда, звёзды, сохранение, похвала. */
    function completeZone(g){
      flags[g.key] = true;
      if (g.onWin) g.onWin();
      if (g.starKey) spawnStars(g.starKey, g.at.x, g.at.y);
      chime(); setMood('happy', 2.4);
      banner(g.banner);
      emit(g.event || g.key, 100);
      gameSave(); updateHUD();
      say(g.praise, 4800);
      resetCoach();
    }
`;
}
