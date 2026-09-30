/**
 * Загрузчик деталей dungeon-кита.
 *
 * Геометрия и атлас приходят в `window.__DUNGEON` / `__DUNGEON_TEX` уже
 * распакованными в base64 (их кладёт `worldHtml()`), поэтому GLTFLoader и сеть
 * не нужны — подземелье собирается офлайн, как и остальной мир.
 */
export function kit(): string {
  return `
    function b64buf(s){
      var bin = atob(s), n = bin.length, u = new Uint8Array(n);
      for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
      return u.buffer;
    }
    var _dungMat = null;
    function dungMaterial(){
      if (_dungMat) return _dungMat;
      var tex = new THREE.TextureLoader().load(window.__DUNGEON_TEX);
      tex.flipY = false;
      tex.encoding = THREE.sRGBEncoding;
      _dungMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0.04 });
      return _dungMat;
    }
    function dungPiece(name){
      var d = window.__DUNGEON && window.__DUNGEON[name];
      if (!d) return new THREE.Mesh();
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(b64buf(d.pos)), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(b64buf(d.nor)), 3));
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(b64buf(d.uv)), 2));
      var ib = b64buf(d.idx);
      g.setIndex(new THREE.BufferAttribute(d.idxBits === 32 ? new Uint32Array(ib) : new Uint16Array(ib), 1));
      return shade(new THREE.Mesh(g, dungMaterial()), true, true);
    }
    function addPiece(parent, name, x, y, z, ry){
      var m = at(dungPiece(name), x, y, z);
      if (ry) m.rotation.y = ry;
      parent.add(m); return m;
    }
`;
}

/**
 * Настройки логопеда и задачи из урока ребёнка — то, что мир получает снаружи
 * через мост `window.SpeechSteps`.
 *
 * `DIFF` — множитель темпа (легко → шкала растёт быстрее), `thr()` — порог
 * громкости с поправкой на сложность. Оба применяются во ВСЕХ зонах через
 * общий движок, поэтому «Легко» действительно легче везде, а не выборочно.
 */
export function config(): string {
  return `
    var CFG = {
      demoOnly: false,
      difficulty: 'normal',
      games: { rhythm: true, fountain: true, dragon: true, lullaby: true, trafficlight: true, mirror: true, dungeon: true },
      sounds: { rhythm: 'ПА', fountain: 'А', dragon: 'Р', lullaby: 'А', mirror: 'Улыбка', dungeon: 'А' }
    };
    try {
      if (window.SpeechSteps && window.SpeechSteps.getConfig){
        var rc = JSON.parse(window.SpeechSteps.getConfig());
        if (rc){
          CFG.demoOnly = rc.demoOnly === true;
          if (rc.difficulty) CFG.difficulty = rc.difficulty;
          if (rc.games) for (var gk in rc.games) CFG.games[gk] = rc.games[gk] !== false;
          if (rc.sounds) for (var sk in rc.sounds) if (rc.sounds[sk]) CFG.sounds[sk] = rc.sounds[sk];
        }
      }
    } catch (e) {}
    var gOn = CFG.games, gSnd = CFG.sounds;
    var DIFF = CFG.difficulty === 'easy' ? 1.35 : (CFG.difficulty === 'hard' ? 0.72 : 1.0);
    /** Порог громкости с поправкой на сложность: легко — ниже, сложно — выше. */
    function thr(base){ return base * (2 - DIFF); }

    // задачи зон из назначенного урока (названия и целевые звуки)
    var missions = {};
    try {
      if (window.SpeechSteps && window.SpeechSteps.getMissions)
        missions = JSON.parse(window.SpeechSteps.getMissions()) || {};
    } catch (e) {}
    /** Заголовок зоны: из урока, если логопед его задал, иначе — свой. */
    function mTitle(key, def){
      var m = missions[key];
      return (m && m.title) ? (m.emoji + ' ' + m.title) : def;
    }
    /** Целевой звук зоны: урок важнее настроек игры, настройки важнее дефолта. */
    function mSound(key, fallback){
      var m = missions[key];
      return (m && m.sound) || gSnd[key] || fallback || '';
    }
    function emit(name, best){
      if (window.SpeechSteps && window.SpeechSteps.onEvent)
        window.SpeechSteps.onEvent(JSON.stringify({ event: name, exercise: name, best: best }));
    }
`;
}
