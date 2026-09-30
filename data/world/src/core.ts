import { palScript } from '../palette';

/**
 * Ядро сцены: рендер, свет, небо, камера — и набор коротких помощников, на
 * которых построены все остальные модули.
 *
 * Помощники существуют ради одного: раньше почти каждый объект мира занимал
 * две строки (`new THREE.Mesh(new THREE.XGeometry(...), new THREE.MeshStandard-
 * Material({color})) `). Теперь это `box(w,h,d,PAL.wood)`. Важное правило:
 *   • `mat()`    — КЭШИРУЕТ материал (один экземпляр на цвет+настройки);
 *   • `matOwn()` — всегда новый материал.
 * Всё, что меняет материал в рантайме (цвет струи, свечение звезды, огонь
 * факела), обязано брать `matOwn()` — иначе правка «протечёт» в чужие объекты.
 */
export function core(): string {
  return `
${palScript()}
    // r149 otherwise interprets sRGB hex values as linear and washes out the palette.
    THREE.ColorManagement.legacyMode = false;
    // ---------- помощники: материалы ----------
    var _matCache = {};
    function _mk(kind, color, o){
      o = o || {};
      var def = { color: color };
      for (var k in o) def[k] = o[k];
      return kind === 'basic' ? new THREE.MeshBasicMaterial(def) : new THREE.MeshStandardMaterial(def);
    }
    /** Кэшированный материал — для статичного декора (деревьев сотни, материал один). */
    function mat(color, o){
      var key = 's' + color + JSON.stringify(o || 0);
      return _matCache[key] || (_matCache[key] = _mk('std', color, o));
    }
    /** Личный материал — для всего, что меняется в рантайме. */
    function matOwn(color, o){ return _mk('std', color, o); }
    function basic(color, o){
      var key = 'b' + color + JSON.stringify(o || 0);
      return _matCache[key] || (_matCache[key] = _mk('basic', color, o));
    }
    function basicOwn(color, o){ return _mk('basic', color, o); }
    // One small radial texture serves crystals, lanterns and the companion's heart.
    var _glowTexture;
    function glowSprite(color, size, opacity){
      if (!_glowTexture){
        var cv = document.createElement('canvas'); cv.width = cv.height = 64;
        var ctx = cv.getContext('2d'), grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.2, 'rgba(255,255,255,.55)');
        grad.addColorStop(0.55, 'rgba(255,255,255,.12)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64); _glowTexture = new THREE.CanvasTexture(cv);
      }
      var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: _glowTexture, color: color,
        transparent: true, opacity: opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      sprite.scale.set(size, size, 1); return sprite;
    }

    // ---------- помощники: примитивы ----------
    function box(w, h, d, c, o){ return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), c && c.isMaterial ? c : mat(c, o)); }
    function sph(r, c, o, seg){ return new THREE.Mesh(new THREE.SphereGeometry(r, seg || 14, seg || 12), c && c.isMaterial ? c : mat(c, o)); }
    function cyl(rt, rb, h, seg, c, o){ return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 12), c && c.isMaterial ? c : mat(c, o)); }
    function cone(r, h, seg, c, o){ return new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 10), c && c.isMaterial ? c : mat(c, o)); }
    function torus(r, tube, seg, c, o, arc){ return new THREE.Mesh(new THREE.TorusGeometry(r, tube, 9, seg || 24, arc), c && c.isMaterial ? c : mat(c, o)); }
    function grp(x, y, z){ var g = new THREE.Group(); if (x !== undefined) g.position.set(x, y || 0, z || 0); return g; }
    /** Поставить объект и вернуть его — чтобы не плодить временные переменные. */
    function at(o, x, y, z){ o.position.set(x, y || 0, z || 0); return o; }
    /** Пометить меш как отбрасывающий/принимающий тень. */
    function shade(o, cast, recv){ o.castShadow = cast !== false; o.receiveShadow = !!recv; return o; }

    // ---------- помощники: математика ----------
    function clamp01(x){ return x < 0 ? 0 : (x > 1 ? 1 : x); }
    function dist(ax, az, bx, bz){ return Math.hypot(ax - bx, az - bz); }
    /** Кадронезависимое сглаживание: результат не зависит от частоты кадров. */
    function ease(cur, target, rate, dt){ return cur + (target - cur) * (1 - Math.exp(-rate * dt)); }

    // ---------- рендер ----------
    var canvas = document.getElementById('c');
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(PAL.skyMid);
    scene.fog = new THREE.Fog(PAL.fog, 75, 240);

    var camera = new THREE.PerspectiveCamera(49, 1, 0.1, 620);
    function resize(){
      var w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);

    // ---------- небесный купол: вертикальный градиент ----------
    (function(){
      var cv = document.createElement('canvas'); cv.width = 8; cv.height = 256;
      var g2 = cv.getContext('2d'), grd = g2.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0, '#' + PAL.skyTop.toString(16).padStart(6, '0'));
      grd.addColorStop(0.5, '#' + PAL.skyMid.toString(16).padStart(6, '0'));
      grd.addColorStop(1, '#' + PAL.skyLow.toString(16).padStart(6, '0'));
      g2.fillStyle = grd; g2.fillRect(0, 0, 8, 256);
      var skyTexture = new THREE.CanvasTexture(cv); skyTexture.encoding = THREE.sRGBEncoding;
      var dome = new THREE.Mesh(new THREE.SphereGeometry(255, 24, 16),
        new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, fog: false, toneMapped: false }));
      scene.add(dome);
    })();

    // ---------- свет ----------
    // Три источника: небо/земля (объём), солнце (тень), контровой (силуэт).
    scene.add(new THREE.HemisphereLight(PAL.skyLight, PAL.groundBounce, 1.05));
    scene.add(new THREE.AmbientLight(0xDCE7FF, 0.18));
    var sunLight = new THREE.DirectionalLight(PAL.sunLight, 1.85);
    sunLight.position.set(-28, 42, 34); sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048); sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.035;
    var sc = sunLight.shadow.camera;
    sc.left = -110; sc.right = 110; sc.top = 110; sc.bottom = -110; sc.far = 240;
    scene.add(sunLight);
    var rimLight = new THREE.DirectionalLight(PAL.rimLight, 0.65);
    rimLight.position.set(34, 22, -32); scene.add(rimLight);

    // ---------- солнечный диск ----------
    (function(){
      var disc = at(sph(7, basic(PAL.sunDisc, { fog: false }), 0, 22), -62, 74, -122);
      var halo = at(sph(11.5, basicOwn(PAL.sunGlow, { transparent: true, opacity: 0.26, fog: false }), 0, 22), -62, 74, -122);
      scene.add(disc); scene.add(halo);
    })();
`;
}
