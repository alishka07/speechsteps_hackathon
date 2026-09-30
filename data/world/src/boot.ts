/**
 * Запуск и главный цикл.
 *
 * Цикл держит один порядок: слушаем → двигаем → анимируем → отыгрываем зону →
 * рисуем. Раньше здесь же лежала логика двенадцати мини-игр (около 250 строк
 * почти одинаковых веток); теперь цикл только выбирает активную зону и отдаёт
 * кадр общему движку, поэтому читается сверху вниз.
 */
export function boot(): string {
  return `
    var gameStarted = false, gamePaused = false, awaitingController = true;
    var pauseReason = null, pausedWithCamera = false;

    function resumeWorld(withCamera){
      if (document.hidden || awaitingController) return;
      gamePaused = false; pauseReason = null;
      document.getElementById('pause').style.display = 'none';
      clearInput(); clearFinger(); handWasUp = false;
      canvas.focus({ preventScroll: true });
      ensureAudio(); clock.getDelta(); startRouteTimer();
      if (withCamera) initCamera();
    }
    function pauseWorld(reason){
      clearInput(); clearFinger();
      if (CFG.demoOnly) gardenPause();
      if (!gameStarted || awaitingController || (CFG.demoOnly && won)) return;
      // A browser permission prompt may blur the iframe. Pause movement, but
      // leave that explicit request alive; focus can finish the same action.
      if (reason === 'blur' && !document.hidden && (camState === 'requesting' || micState === 'requesting')){
        if (!gamePaused){ gamePaused = true; pauseReason = 'permission'; stopRouteTimer(); }
        return;
      }
      pausedWithCamera = pausedWithCamera || camWanted || cameraConnected();
      gamePaused = true; pauseReason = reason; stopRouteTimer();
      stopCamera(); stopMicrophone(); resetCoach();
      if (actx && actx.suspend) actx.suspend();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      document.getElementById('pauseText').textContent = pausedWithCamera ?
        'Камера выключена, а искры ждут тебя. Выбери, как продолжить.' :
        'Искры ждут тебя. Продолжи прогулку, когда будешь готов.';
      document.getElementById('resumeCamera').style.display = pausedWithCamera ? 'block' : 'none';
      document.getElementById('resumeGame').textContent = pausedWithCamera ? 'Продолжить без камеры' : 'Продолжить прогулку';
      document.getElementById('pause').style.display = 'flex';
    }
    document.getElementById('resumeGame').addEventListener('click', function(){ resumeWorld(false); pausedWithCamera = false; });
    document.getElementById('resumeCamera').addEventListener('click', function(){ resumeWorld(true); pausedWithCamera = false; });
    window.addEventListener('blur', function(){ pauseWorld('blur'); });
    window.addEventListener('focus', function(){
      if (gamePaused && pauseReason === 'permission' && !document.hidden) resumeWorld(false);
    });
    document.addEventListener('visibilitychange', function(){ if (document.hidden) pauseWorld('hidden'); });

    // ---------- вступление ----------
    var INTRO_LINES = [
      'Привет! Я — Үнчик, дух эха этого острова.',
      'Остров Эха замолчал… Магия звука пропала, и переходы между островами закрылись. 😢',
      'Только твой голос вернёт музыку острову. Ты — наша последняя надежда! 🌟',
      'Веди указательным пальцем: центр останавливает лисёнка, края задают направление. Можно также идти W/A/S/D, прыгать пробелом и поворачивать обзор Q/E.',
      'А дальше всё решает голос: крикни у ворот, потяни «Сссс» у тотема, подуй на шар и спой у поющего цветка!'
    ];
    var introIdx = 0;
    var introEl = document.getElementById('intro');
    var introTextEl = document.getElementById('introText');
    var introNextEl = document.getElementById('introNext');
    function renderIntro(){
      introTextEl.textContent = INTRO_LINES[introIdx];
      introNextEl.textContent = (introIdx >= INTRO_LINES.length - 1) ? 'Начать! ▶' : 'Дальше ▶';
      speak(INTRO_LINES[introIdx]);
    }
    introNextEl.addEventListener('click', function(){
      introIdx++;
      if (introIdx >= INTRO_LINES.length){ introEl.style.display = 'none'; startGame(); return; }
      renderIntro();
    });
    document.getElementById('introSkip').addEventListener('click', function(){
      introEl.style.display = 'none'; startGame();
    });
    document.getElementById('go').addEventListener('click', function(){
      document.getElementById('start').style.display = 'none';
      initCamera(); startGame();
    });
    document.getElementById('goKeyboard').addEventListener('click', function(){
      document.getElementById('start').style.display = 'none'; startGame();
    });

    // ---------- полёт на воздушном шаре ----------
    var flyGame = game('fly');
    /** Готов ли герой лететь: мост наведён, стоит в круге или уже в воздухе. */
    function flying(){
      if (landedHigh || jumping || !flags.vine) return false;
      if (player.position.y > 0.05) return true;
      return dist(player.position.x, player.position.z, SPOT.sky.x, SPOT.sky.y) < flyGame.r;
    }
    function flyTick(dt){
      balloon.visible = true;
      setObj(flyGame.title(), flyGame.hint());
      // Дуть = вести ровный громкий выдох. Жёсткий фильтр шипения здесь не
      // годится: реальный выдох в микрофон сам по себе даёт много ВЧ-шума.
      var blow = rmsLevel > 0.12;
      setTask('🎈 Дуй ровно и долго' + (blow ? ' ✓' : ''), clamp01(player.position.y / SKY_Y), blow);
      coach(blow ? null : (rmsLevel < 0.035 ? 'silent' : 'tooQuiet'), dt);

      var size = ease(balloon.scale.x, 0.6 + rmsLevel * 1.2, 12, dt);
      balloon.scale.setScalar(size);
      vy = blow ? vy + (9 + rmsLevel * 16) * dt : vy - 7.5 * dt;
      vy = Math.max(-8, Math.min(10, vy));
      if (blow && vy < 0.3) whoosh();
      player.position.y = Math.max(0, player.position.y + vy * dt);
      if (player.position.y === 0) vy = 0;
      balloon.position.set(player.position.x, player.position.y + 3.4, player.position.z);

      if (player.position.y >= SKY_Y && overSky(player.position.x, player.position.z)){
        player.position.y = SKY_Y; vy = 0; landedHigh = true; balloon.visible = false;
        if (!flags.fly) completeZone(flyGame);
      }
    }

    // ---------- бонус-реакции без задач ----------
    var lastMill = 0, lastBell = 0, bellSwing = 0;
    function bonusProps(dt){
      var nearMill = dist(player.position.x, player.position.z, SPOT.mill.x, SPOT.mill.y) < 5.5;
      if (nearMill && rmsLevel > 0.16 && hissRatio < 0.45){
        windmill.rotation.z -= dt * (2 + rmsLevel * 11);
        if (t - lastMill > 1.6){ lastMill = t; tone(680, 0.22, 'sine', 0.05); }
      } else {
        windmill.rotation.z -= dt * 0.4;
      }
      var nearBell = dist(player.position.x, player.position.z, SPOT.bell.x, SPOT.bell.y) < 5.5;
      if (nearBell && rmsLevel > 0.42 && t - lastBell > 1.2){
        lastBell = t; bellSwing = 0.6;
        tone(880, 0.5, 'sine', 0.08);
        setTimeout(function(){ tone(660, 0.45, 'sine', 0.06); }, 130);
      }
      bellSwing *= 0.93;
      bell.rotation.z = Math.sin(t * 13) * bellSwing * 0.5;
    }

    /** Что делать дальше, когда герой не в зоне. */
    function idleObjective(){
      if (CFG.demoOnly){
        gardenObjective();
        return;
      }
      if (!flags.gate) setObj('Бухта Эха 🌴', 'Иди вперёд к каменным воротам и крикни.');
      else if (!flags.vine) setObj('Поляна ветра 🏝', 'Найди лозовый тотем и потяни звук.');
      else if (!flags.fly) setObj('Берег колокола 🏝', 'Встань в оранжевый круг у шара.');
      else if (!flags.treasure) setObj('Снова к шару 🎈', 'Встань в круг и подуй — вернёшься на небо к цветку.');
      else setObj('Сокровище открыто! 💎', 'Собери оставшиеся звёзды и стань чемпионом.');
    }

    // ---------- главный цикл ----------
    var lastZoneKey = null, handWasUp = false;
    function animate(){
      requestAnimationFrame(animate);
      var dt = Math.min(clock.getDelta(), 0.05);
      if (awaitingController || gamePaused || document.hidden) return;
      t += dt;

      readMic();
      readPose();
      if (!(CFG.demoOnly && gardenActive())) readFinger();
      else clearFinger();
      if (CFG.demoOnly){ gardenTick(dt); collected = gardenResults().length; }
      updateCamHud();
      rmsfill.style.width = Math.round(rmsLevel * 100) + '%';
      // приступы громкости — по ним ритм-зона считает слоги
      var above = rmsLevel > 0.3;
      if (above && !prevAbove) onsets.push(t);
      prevAbove = above;
      onsets = onsets.filter(function(o){ return t - o < 1.5; });

      // --- движение относительно камеры ---
      var lockedForTask = CFG.demoOnly && gardenActive();
      var mv = lockedForTask ? { x: 0, z: 0 } : readMove(dt);
      var len = Math.hypot(mv.x, mv.z);
      var onSurface = player.position.y <= 0.02 || landedHigh;
      var moving = len > 0.05 && onSurface;
      if (moving && !(CFG.demoOnly && won)){
        var oldX = player.position.x, oldZ = player.position.z;
        var nx = player.position.x + mv.x * 7.5 * dt, nz = player.position.z + mv.z * 7.5 * dt;
        if (!flags.gate && nx > GATE_X - 0.8) nx = GATE_X - 0.8;   // ворота закрыты
        if (supported(nx, nz)){ player.position.x = nx; player.position.z = nz; }
        else if (supported(nx, player.position.z)) player.position.x = nx;
        else if (supported(player.position.x, nz)) player.position.z = nz;
        var rd = Math.atan2(mv.x, mv.z) - player.rotation.y;
        while (rd > Math.PI) rd -= Math.PI * 2;
        while (rd < -Math.PI) rd += Math.PI * 2;
        player.rotation.y += rd * (1 - Math.exp(-10 * dt));
        if (CFG.demoOnly){
          var traveled = dist(oldX, oldZ, player.position.x, player.position.z);
          if (cameraInputActive && handLm && cameraConnected()) demoCameraDistance += traveled;
          else demoManualDistance += traveled;
        }
      }
      // прыжок: рука выше плеча. Срабатывает на подъёме руки, а не пока она
      // поднята, иначе герой прыгал бы без остановки.
      var jumpPressed = !!(keys[' '] || keyCodes.Space);
      if (!lockedForTask && (POSE.handUp || jumpPressed) && !handWasUp && onSurface && !landedHigh && player.position.y <= 0.02){
        jumping = true; vy = 6.2; pop(); setMood('happy', 0.8);
      }
      handWasUp = POSE.handUp || jumpPressed;
      // A normal jump owns its gravity even while passing a task zone. Balloon
      // flight is separate, so unlocking it cannot turn Space into a takeoff.
      if (jumping){
        vy -= 9 * dt;
        player.position.y = Math.max(0, player.position.y + vy * dt);
        if (player.position.y === 0){ vy = 0; jumping = false; }
      }

      animPlayer(moving, dt);
      updateCompanion(dt);

      // --- активная зона владеет HUD ---
      var zone = activeZone();
      if (zone && zone.key !== lastZoneKey){ resetCoach(); setMood('listen', 2); }
      if (!zone && lastZoneKey) resetCoach();
      lastZoneKey = zone ? zone.key : null;

      if (CFG.demoOnly){
        clearTask(); resetCoach(); gardenObjective();
      } else if (zone){
        runZone(zone, dt);
      } else if (flying()){
        flyTick(dt);
      } else {
        // вне задачи тренер следит за другим: как камера видит тело
        clearTask(); coach(poseFault(), dt); idleObjective();
        balloon.visible = false;
        if (!jumping && !landedHigh && player.position.y > 0){
          vy -= 9 * dt; player.position.y = Math.max(0, player.position.y + vy * dt);
          if (player.position.y === 0) vy = 0;
        }
      }
      // --- анимация зон (идёт всегда, а не только вблизи) ---
      for (var i = 0; i < GAMES.length; i++){
        var g = GAMES[i];
        if (g.tick) g.tick(dt, zone === g, zone === g && (fills[g.key] || 0) > 0);
      }

      updateStars(dt);
      updateHUD();
      checkWin();

      // --- мир живёт сам по себе ---
      if (landedHigh && !overSky(player.position.x, player.position.z)) landedHigh = false;
      if (flags.gate && gateBar.position.y > -3) gateBar.position.y -= 6 * dt;
      petals.rotation.z += dt;
      skyFlower.position.y = SKY_Y + 0.45 + Math.sin(t * 2) * 0.08;
      gem.rotation.y += dt * 1.6;
      if (flags.treasure){
        chestLid.rotation.x = ease(chestLid.rotation.x, -1.15, 3, dt);
        gem.position.y = 0.95 + Math.sin(t * 3) * 0.12;
      }
      animateWater(t);
      animateAmbient(dt, t);
      bonusProps(dt);

      // --- камера от третьего лица ---
      var focus = CFG.demoOnly ? gardenFocus() : null;
      var focusX = focus ? focus.x : player.position.x;
      var focusY = focus ? focus.y : player.position.y + 1.25;
      var focusZ = focus ? focus.z : player.position.z;
      // Look slightly from the side so the fox cannot hide the object it helps.
      var followRadius = focus ? 9.4 : 8.6;
      var followYaw = focus
        ? Math.atan2(player.position.x - focusX, player.position.z - focusZ) + 1.05
        : camYaw;
      camera.position.lerp(new THREE.Vector3(
        focusX + Math.sin(followYaw) * followRadius,
        player.position.y + (focus ? 5.8 : 4.8),
        focusZ + Math.cos(followYaw) * followRadius), 0.12);
      var cardOffset = focus && window.innerHeight <= 500 && window.innerWidth > 620 ? 3.0 : 0;
      camera.lookAt(focusX - Math.cos(followYaw) * cardOffset, focusY, focusZ + Math.sin(followYaw) * cardOffset);
      clearCameraView(focusX, focusY, focusZ);

      renderer.render(scene, camera);
    }

    function startGame(){
      awaitingController = false; gamePaused = false; pauseReason = null; pausedWithCamera = false;
      clearInput(); startRouteTimer();
      canvas.focus({ preventScroll: true }); ensureAudio();
      if (gameStarted){ clock.getDelta(); return; }
      gameStarted = true;
      buildPlayer(); buildCompanion();
      camera.position.set(player.position.x + Math.sin(camYaw) * 8.6,
        player.position.y + 4.8, player.position.z + Math.cos(camYaw) * 8.6);
      camera.lookAt(player.position.x, player.position.y + 1.25, player.position.z);
      setMood('idle', 999);
      buildTrack(); loadSaved(); updateHUD();
      resize(); startAmbient(); clock.start(); animate();
      setTimeout(function(){
        if (!awaitingController && !gamePaused && !(CFG.demoOnly && gardenActive()))
          say(CFG.demoOnly ? 'Идём к цветку! Он ждёт твою улыбку и звук И.' : 'Удача с тобой! Я рядом — идём спасать остров!', 4500);
      }, 700);
    }
    resize();
    updateCamHud(); updateMicHud();
    if (CFG.demoOnly){
      document.getElementById('startLead').textContent = 'Пальцем веди лисёнка к трём друзьям. Улыбнись цветку, округли губы для рыбки и открой рот, чтобы зажечь фонарик. Повторяй простые звуки И, У, А вместе с Үнчиком.';
      document.getElementById('startPrivacy').textContent = 'Камера видит движения руки и губ. Микрофон не нужен. Видео не записывается. Без камеры можно помогать кнопками.';
      document.getElementById('mic').style.display = 'none';
      document.getElementById('scoreStages').style.display = 'none';
    }
    document.getElementById('finishDemo').addEventListener('click', function(){
      stopCamera(); stopMicrophone();
      if (window.parent !== window) window.parent.postMessage({ source: 'speechsteps', type: 'finish-demo' }, '*');
    });
    window.addEventListener('pagehide', function(){
      pauseWorld('hidden');
      stopCamera(); stopMicrophone();
      if (actx && actx.suspend) actx.suspend();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    });
    if (window.SpeechSteps && window.SpeechSteps.ready) window.SpeechSteps.ready();

    /**
     * Отладочный мост. Мир живёт внутри замыкания, поэтому ни автотесты, ни
     * консоль браузера не могут заглянуть внутрь. Здесь наружу выведено ровно
     * то, что нужно, чтобы проверить зону, не голося в микрофон: телепорт и
     * подстановка результатов разбора звука.
     *
     * Сама игра этим не пользуется — только тесты и ручная отладка.
     */
    window.__world = {
      zone: function(){ var z = activeZone(); return z ? z.key : null; },
      flags: function(){ return flags; },
      fills: function(){ return fills; },
      stars: function(){ return { total: CFG.demoOnly ? 3 : stars.length, taken: collected }; },
      garden: function(){ return { active: gardenActive(), complete: gardenComplete(), results: gardenResults() }; },
      moveTo: function(x, z){ player.position.set(x, player.position.y, z); },
      position: function(){ return { x: player.position.x, y: player.position.y, z: player.position.z }; },
      /** Подменить разбор микрофона: без analyser readMic() их не перезапишет. */
      mic: function(v){
        v = v || {};
        rmsLevel = v.rms || 0;
        hissRatio = v.hiss || 0;
        shRatio = v.sh || 0;
        loRatio = v.lo || 0;
        midRatio = v.mid || 0;
        centroidHz = v.centroid || 0;
        micFlux = v.flux || 0;
        voicedNow = (loRatio + midRatio) > 0.45 && hissRatio < 0.35 && rmsLevel > 0.06;
      },
      /** Признаки позы — что камера читает прямо сейчас. */
      pose: function(){ return POSE; },
      /** Подставить кадр скелета вместо камеры: разбор жестов проверяем так. */
      poseFrame: function(L){ poseDriven = true; camState = 'ready'; return applyPose(L); },
      /** Текст подсказки тренера, если она сейчас на экране. */
      coach: function(){ return coachEl.classList.contains('show') ? coachTitle.textContent : null; },
      objective: function(){ return objTitle.textContent; },
      /** Игровое время в секундах — по нему видно, что кадры действительно идут. */
      time: function(){ return t; }
    };
`;
}
