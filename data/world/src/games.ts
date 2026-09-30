/**
 * Каталог зон и общий движок, который их отыгрывает.
 *
 * Это главный выигрыш перестройки. Раньше каждая мини-игра занимала свой
 * блок в главном цикле, и все блоки повторяли одно и то же: проверить
 * расстояние → показать шкалу → накопить прогресс → на единице выдать награду,
 * звёзды, баннер, событие и сохранение. Двенадцать почти одинаковых копий.
 *
 * Теперь это один `runZone()`, а каждая игра — запись с полями:
 *   ready   — доступна ли зона сейчас;
 *   sound   — целевой звук (урок логопеда важнее настроек, настройки — дефолта);
 *   check   — ЧТО проверяем; возвращает { ok, err } — err уходит тренеру;
 *   gain/drain — как быстро растёт и падает шкала;
 *   onWin / restore / reset — как зона выглядит пройденной;
 *   tick    — анимация зоны, работает всегда, а не только вблизи.
 *
 * Добавить новую игру = добавить одну запись. Ни цикл, ни сохранение, ни
 * счётчики трогать не нужно.
 */
export function games(): string {
  return `
    var fills = {};           // ключ зоны → прогресс шкалы 0..1
    var onsets = [], prevAbove = false;   // детектор слогов для ритма

    /** Игра включена логопедом? Базовый путь выключить нельзя. */
    function gameOn(g){ return !CFG.demoOnly && (!g.optional || gOn[g.key] !== false); }
    function nearZone(g){
      return dist(player.position.x, player.position.z, g.at.x, g.at.y) < g.r;
    }

    var GAMES = [
      // ---------------- базовый путь ----------------
      {
        key: 'gate', starKey: null, at: SPOT.gate, r: 6, event: 'shout',
        ready: function(){ return true; },
        sound: function(){ return mSound('shout', ''); },
        title: function(){ return mTitle('shout', 'Каменные ворота 🪨'); },
        hint: function(s){ return 'Крикни громко' + (s ? ' звук «' + s + '»' : '') + ' — створка поднимется.'; },
        label: function(s, ok){ return '🗣 Крикни громко: ' + (s || 'А-А-А') + (ok ? ' ✓' : ''); },
        check: function(s){ return voiceCheck(s, { min: thr(0.45), loose: true }); },
        gain: 2.4, drain: 1.6,
        intro: 'Крикни погромче — «А-А-А!» — и ворота откроются!',
        banner: 'Ворота открылись! 🎉',
        praise: 'Вот это голос! Ворота открылись. За мной! 🎉',
        restore: function(){ gateBar.position.y = -3.2; },
        reset: function(){ gateBar.position.y = 1.3; }
      },
      {
        key: 'vine', starKey: null, at: SPOT.totem, r: 6, event: 'sustain_s',
        ready: function(){ return flags.gate; },
        sound: function(){ return mSound('sustain', 'С'); },
        title: function(){ return mTitle('sustain', 'Лозовый тотем 🌿'); },
        hint: function(s){ return 'Тяни звук «' + s + '» подольше — через пролив вырастет живой мост.'; },
        label: function(s, ok){ return '🐍 Тяни звук: ' + s + (ok ? ' ✓' : ''); },
        check: function(s){ return voiceCheck(s, { min: 0.06 }); },
        gain: 0.5, drain: 0.7,
        intro: 'Тяни звук подольше — лоза подрастёт и станет мостом!',
        banner: 'Мост вырос! 🌉',
        praise: 'Ты вырастил волшебный мост! Идём на берег колокола! 🌉',
        tick: function(dt, near, ok){ totem.rotation.y += dt * (near && ok ? 4 : 0.5); },
        onWin: function(){ vineBridge.visible = true; bridgeOpen.vine = true; },
        restore: function(){ vineBridge.visible = true; bridgeOpen.vine = true; },
        reset: function(){ vineBridge.visible = false; bridgeOpen.vine = false; }
      },
      {
        // полёт на шаре — вертикальная механика, свой обработчик в главном цикле
        key: 'fly', starKey: null, at: SPOT.sky, r: 2.4, event: 'blow_balloon', custom: true,
        ready: function(){ return flags.vine; },
        title: function(){ return mTitle('blow', 'Воздушный шар 🎈'); },
        hint: function(){ return 'Дуй ровно и долго — шар поднимет тебя на небесный остров.'; },
        banner: 'Ты долетел до облаков! ☁️🎉',
        praise: 'Мы летим! Небесный остров уже близко! ☁️',
        reset: function(){ balloon.visible = false; }
      },
      {
        // звёзды этой зоны раздаёт openTreasure() — они появляются у сундука
        key: 'treasure', starKey: null, at: SPOT.flower, r: 3, event: 'longvoice',
        ready: function(){ return landedHigh; },
        sound: function(){ return mSound('longvoice', 'А'); },
        title: function(){ return mTitle('longvoice', 'Поющий цветок 🌸'); },
        hint: function(s){ return 'Тяни голосом «' + s + '» — цветок откроет сундук с сокровищем.'; },
        label: function(s, ok){ return '🎤 Тяни голосом: ' + s + (ok ? ' ✓' : ''); },
        check: function(s){ return voiceCheck(s, { min: 0.08 }); },
        gain: 0.55, drain: 0.3,
        intro: 'Подойди к 🌸 и тяни голосом — откроем сундук!',
        banner: 'Сундук открылся! 💎',
        praise: 'Сундук открыт! Ты настоящий герой Острова Эха! 💎',
        tick: function(dt, near, ok){ skyFlower.rotation.y += dt * (near && ok ? 5 : 0.6); },
        onWin: function(){ openTreasure(); },
        restore: function(){ openTreasure(); chestLid.rotation.x = -1.15; },
        reset: function(){ chestLid.rotation.x = 0; gem.visible = false; loot.visible = false; }
      },

      // ---------------- мини-игры логопеда ----------------
      {
        key: 'rhythm', starKey: 'b', optional: true, at: SPOT.drum, r: 5,
        ready: function(){ return true; },
        sound: function(){ return mSound('rhythm', 'ПА'); },
        title: function(){ return mTitle('rhythm', 'Барабан ритма 🥁'); },
        hint: function(s){ return 'Скажи три коротких «' + s.toLowerCase() + '» с паузами — барабан отзовётся.'; },
        label: function(s){ var l = s.toLowerCase(); return '🥁 Скажи: ' + l + '-' + l + '-' + l + '!'; },
        // ритм считаем по числу приступов громкости, а не по длительности звука
        check: function(){ return { ok: onsets.length > 0, err: null }; },
        advance: function(){ return clamp01(onsets.length / 3); },
        fault: function(){
          if (rmsLevel < 0.06) return 'silent';
          // звук есть, а приступов нет — значит слоги слиплись в один долгий
          if (rmsLevel > 0.3) return 'offbeat';
          return 'tooQuiet';
        },
        intro: 'Скажи три коротких слога подряд — с паузой между ними!',
        banner: 'Бонусные звёзды! ⭐',
        praise: 'Какой ритм! Браво! Лови звёздочки! 🥁⭐',
        tick: function(dt){ drum.rotation.y += dt * 0.5; },
        // третья звезда ритма — прямо у барабана
        onWin: function(){ makeStar(SPOT.drum.x, 1.7, SPOT.drum.y + 3, 'b2'); }
      },
      {
        key: 'fountain', starKey: 'c', optional: true, at: SPOT.fountain, r: 4.5, obj: 'fountain',
        ready: function(){ return true; },
        sound: function(){ return mSound('fountain', 'А'); },
        title: function(){ return 'Музыкальный фонтан ⛲'; },
        hint: function(s){ return 'Пой громко «' + s + '» — струя поднимется и расцветёт радугой.'; },
        label: function(s, ok){ return '🎤 Пой громко: ' + s + (ok ? ' ✓' : ''); },
        check: function(s){ return voiceCheck(s, { min: thr(0.22) }); },
        gain: 0.42, drain: 0.5,
        intro: 'Подойди к фонтану и спой громко!',
        banner: 'Фонтан расцвёл! 🌈',
        praise: 'Какой голос! Фонтан расцвёл радугой! Лови звёзды! 🌈⭐',
        tick: function(dt){ jet.scale.y = ease(jet.scale.y, 0.2 + Math.min(1, rmsLevel / 0.45) * 3.0, 9, dt); },
        onWin: function(){ fountBloom.visible = true; jet.material.color.setHex(PAL.sunGlow); },
        restore: function(){ fountBloom.visible = true; jet.material.color.setHex(PAL.sunGlow); },
        reset: function(){ fountBloom.visible = false; jet.material.color.setHex(PAL.water); jet.scale.y = 0.2; }
      },
      {
        key: 'dragon', starKey: 'd', optional: true, at: SPOT.dragon, r: 5, obj: 'dragon', event: 'roar_r',
        ready: function(){ return true; },
        sound: function(){ return mSound('dragon', 'Р'); },
        title: function(){ return 'Логово дракона 🐉'; },
        hint: function(s){ return 'Порычи «' + s + '-' + s + '-' + s + '» — дракончик проснётся.'; },
        label: function(s, ok){ return '🐉 Рычи: ' + s + '-' + s + '-' + s + '!' + (ok ? ' ✓' : ''); },
        check: function(s){ return voiceCheck(s, { min: thr(0.18) }); },
        gain: 0.5, drain: 0.5,
        intro: 'Подойди к дракону и порычи — только по-настоящему!',
        banner: 'Дракон проснулся! 🐉🔥',
        praise: 'Р-р-р! Дракончик проснулся и подружился с тобой! 🐉',
        tick: function(dt, near, ok){
          dragon.position.y = Math.sin(t * 1.5) * 0.05;
          for (var w = 0; w < dWings.length; w++)
            dWings[w].rotation.x = Math.sin(t * 2 + w) * 0.12;
          var roaring = (near && ok) || flags.dragon && rmsLevel > 0.3;
          fire.visible = roaring;
          if (roaring) fire.scale.set(0.6 + Math.min(1, rmsLevel / 0.5) * 1.6, 1, 1);
          dHead.rotation.z = ease(dHead.rotation.z, roaring ? -0.4 : 0, 8, dt);
        },
        reset: function(){ fire.visible = false; dHead.rotation.z = 0; }
      },
      {
        key: 'lullaby', starKey: 'l', optional: true, at: SPOT.cradle, r: 4, obj: 'cradle',
        ready: function(){ return true; },
        sound: function(){ return mSound('lullaby', 'А'); },
        title: function(){ return 'Колыбельная 🌙'; },
        hint: function(s){ return 'Спой «' + s + '» тихим-тихим голосом — малыш уснёт. Не шуми!'; },
        label: function(s, ok){ return '🌙 Пой тихо: ' + s + (ok ? ' ✓' : ''); },
        // единственная зона, где громко — это ошибка: учим управлять силой голоса
        check: function(s){ return voiceCheck(s, { min: 0.05, max: 0.27, loose: true }); },
        gain: 0.4, drain: 0.28,
        intro: 'Подойди к люльке и спой тихо-тихо.',
        banner: 'Малыш уснул! 🌙💤',
        praise: 'Тс-с-с… малыш сладко спит. Спасибо за колыбельную! 🌙',
        tick: function(dt, near, ok){
          cradle.rotation.z = (near && ok && !flags.lullaby) ? Math.sin(t * 4) * 0.05 : cradle.rotation.z * 0.9;
          var f = flags.lullaby ? 1 : (fills.lullaby || 0);
          lullStar.position.y = 2.3 + f * 0.6 + Math.sin(t * 2) * 0.05;
          lullStar.rotation.y += dt * 1.5;
          lullStar.material.emissiveIntensity = 0.2 + f * 0.9;
        },
        reset: function(){ lullStar.material.emissiveIntensity = 0.2; }
      },
      {
        key: 'trafficlight', starKey: 's', optional: true, at: SPOT.traffic, r: 4.5, obj: 'traffic',
        ready: function(){ return true; },
        sound: function(){ return ''; },
        title: function(){ return 'Светофор 🚦'; },
        hint: function(){ return 'Зелёный — говори громко, красный — полная тишина.'; },
        label: function(){ return greenOn() ? '🟢 Говори ГРОМКО!' : '🔴 Тс-с… тихо'; },
        check: function(){
          return greenOn() ? voiceCheck('', { min: thr(0.3), loose: true })
                           : (rmsLevel < 0.12 ? { ok: true, err: null } : { ok: false, err: 'tooLoud' });
        },
        gain: 0.32, drain: 0.3,
        intro: 'Зелёный — говори громко, красный — молчи!',
        banner: 'Светофор пройден! 🚦⭐',
        praise: 'Молодец! Ты слушаешь светофор и управляешь голосом! 🚦',
        tick: function(){
          var g = greenOn();
          tlGreen.material.emissiveIntensity = g ? 0.9 : 0.08;
          tlRed.material.emissiveIntensity = g ? 0.08 : 0.9;
        }
      },
      {
        key: 'mirror', starKey: 'm', optional: true, at: SPOT.mirror, r: 4.5, obj: 'mirror', camera: true,
        ready: function(){ return true; },
        // Зоне нужна не только камера (она уже включена), но и отдельная
        // модель лица. Если та не поднялась — зона не должна запирать мир:
        // считаем её недоступной, и остров проходится без неё.
        blocked: function(){ return mirrorDead(); },
        sound: function(){ return mSound('mirror', 'Улыбка'); },
        title: function(){ return 'Волшебное зеркало 🪞'; },
        hint: function(s){ return 'Покажи зеркалу гримасу «' + s + '» и удержи — зеркало засияет.'; },
        label: function(s, ok){
          if (mirrorDead()) return '🪞 Зеркало недоступно';
          if (!mirrorReady()) return '🪞 Зеркало просыпается…';
          return (faceSeen ? '🪞 Покажи: ' + s : '🪞 Покажи личико 🙂') + (ok ? ' ✓' : '');
        },
        check: function(s){
          if (!mirrorReady()) return { ok: false, err: null };  // пока грузимся — не ругаемся
          readFace();
          return grimaceVal(s) > grimaceThr(s) ? { ok: true, err: null } : { ok: false, err: grimaceFault(s) };
        },
        gain: 0.5, drain: 0.4,
        intro: 'Покажи зеркалу лицо и сделай гримасу!',
        banner: 'Зеркало засияло! 🪞✨',
        praise: 'Ух ты! Ты оживил волшебное зеркало! ✨',
        tick: function(){
          var f = flags.mirror ? 1 : (fills.mirror || 0);
          mGlass.material.emissiveIntensity = 0.25 + f * 0.7;
        }
      },
      {
        key: 'dungeon', starKey: 'e', optional: true, at: SPOT.dungeon, r: 7, obj: 'dungeon',
        ready: function(){ return true; },
        sound: function(){ return mSound('dungeon', 'А'); },
        title: function(){ return 'Подземелье эха 🏰'; },
        hint: function(s){ return 'Кричи «' + s + '» — эхо зажжёт факелы и поднимет решётку.'; },
        label: function(s, ok){
          var lit = Math.min(torches.length, Math.floor((fills.dungeon || 0) * torches.length + 0.0001));
          return '🏰 Крикни эхо: ' + s + (ok ? ' ✓' : '') + '  🔥' + lit + '/' + torches.length;
        },
        check: function(s){ return voiceCheck(s, { min: thr(0.28) }); },
        gain: 0.4, drain: 0.25,
        intro: 'Зайди в подземелье и крикни — зажги факелы!',
        banner: 'Ворота подземелья открылись! 🏰🔥',
        praise: 'Эхо разбудило факелы! Ворота подземелья открыты! 🔥',
        tick: function(dt){
          var f = flags.dungeon ? 1 : (fills.dungeon || 0);
          var lit = flags.dungeon ? torches.length : Math.floor(f * torches.length + 0.0001);
          for (var i = 0; i < torches.length; i++){
            var on = i < lit;
            torches[i].flame.material.opacity = ease(torches[i].flame.material.opacity,
              on ? 0.8 + Math.sin(t * 12 + i) * 0.2 : 0, 12, dt);
            torches[i].light.intensity = ease(torches[i].light.intensity,
              on ? 6 + Math.sin(t * 12 + i) * 1.5 : 0, 12, dt);
          }
          dGate.position.y = ease(dGate.position.y, flags.dungeon ? 4.4 : 0, 4, dt);
        }
      }
    ];

    /** Мигание светофора: фаза зависит от сложности — на «легко» она длиннее. */
    function greenOn(){ return (Math.floor(t / (2.4 * DIFF)) % 2) === 0; }

    /** Открыть сундук: крышка, золото, самоцвет и пара небесных звёзд. */
    function openTreasure(){
      gem.visible = true; loot.visible = true;
      makeStar(SPOT.sky.x, SKY_Y + 1.7, SPOT.sky.y + 3, 't0');
      makeStar(SPOT.sky.x, SKY_Y + 1.7, SPOT.sky.y - 3, 't1');
    }

    /** Найти описание игры по ключу — чтобы нигде не полагаться на индекс. */
    function game(key){
      for (var i = 0; i < GAMES.length; i++) if (GAMES[i].key === key) return GAMES[i];
      return null;
    }

    // выключенные логопедом зоны просто не появляются в мире
    var ZONE_OBJ = { fountain: fountain, dragon: dragon, cradle: cradle, traffic: traffic, mirror: mirror, dungeon: dungeon };
    for (var gi = 0; gi < GAMES.length; gi++){
      var g0 = GAMES[gi];
      if (g0.obj && ZONE_OBJ[g0.obj]) ZONE_OBJ[g0.obj].visible = gameOn(g0);
    }
    drum.visible = gameOn(game('rhythm'));
    if (CFG.demoOnly){
      totem.visible = platform.visible = skyFlower.visible = chest.visible = cradle.visible = false;
      gateBar.visible = false;
    }
    if (gameOn(game('dungeon'))){
      buildDungeon();
      dGate = addPiece(dungeon, 'gate-door', 0, 0, -5.6, 0);
    }

    /**
     * Отыграть кадр активной зоны: прогресс, подсказка, разбор ошибки, награда.
     * Возвращает true, если зона заняла HUD.
     */
    function runZone(g, dt){
      var s = g.sound ? g.sound() : '';
      var res = g.check(s) || { ok: false, err: null };
      var prev = fills[g.key] || 0;
      var fill = g.advance ? g.advance(prev, res, dt)
        : clamp01(prev + (res.ok ? g.gain * DIFF : -g.drain) * dt);
      fills[g.key] = fill;

      setObj(g.title(), g.hint(s));
      setTask(g.label(s, res.ok), fill, res.ok);

      if (res.ok){ coach(null, dt); }
      else {
        var err = g.fault ? g.fault(fill, res) : res.err;
        // звук оборвался на половине — это про дыхание, а не про артикуляцию
        if (err === 'silent' && prev > 0.3) err = 'dropped';
        coach(err, dt);
      }

      if (fill >= 1) completeZone(g);
      else sayOnce(g.key, g.intro, 4200);
      return true;
    }

    /** Ближайшая доступная непройденная зона — она и владеет HUD. */
    function activeZone(){
      for (var i = 0; i < GAMES.length; i++){
        var g = GAMES[i];
        if (flags[g.key] || g.custom || !gameOn(g) || !g.ready() || (g.blocked && g.blocked())) continue;
        // наземные зоны недоступны, пока герой в воздухе или на небе
        if (g.key !== 'treasure' && (landedHigh || player.position.y > 0.1)) continue;
        if (nearZone(g)) return g;
      }
      return null;
    }
`;
}
