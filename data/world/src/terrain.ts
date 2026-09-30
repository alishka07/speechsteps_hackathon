/**
 * Земля и вода: острова, мосты, море, горизонт — и проверка «где можно стоять».
 *
 * Ключевое изменение против прежней версии: мост — это ДАННЫЕ. Раньше доски
 * рисовал один цикл, а проходимость описывала отдельная функция с теми же
 * числами, вбитыми второй раз (и пара таких функций оказалась дословной копией
 * друг друга). Теперь `bridge()` и строит планки, и регистрирует отрезок, а
 * `supported()` считает опору по тем же отрезкам — геометрия и коллизия не
 * могут разойтись.
 */
export function terrain(): string {
  return `
    var V2 = function(x, z){ return new THREE.Vector2(x, z); };

    /** Острова мира. Порядок важен только для читаемости — всё по ключам. */
    var ISLES = [
      { key: 'hub',     c: V2(0, 0),    r: 16, name: 'Бухта Эха' },
      { key: 'meadow',  c: V2(40, 0),   r: 14, name: 'Поляна ветра' },
      { key: 'shore',   c: V2(78, 0),   r: 14, name: 'Берег колокола' },
      { key: 'valley',  c: V2(0, -40),  r: 13, name: 'Долина Эха' },
      { key: 'lair',    c: V2(0, 40),   r: 13, name: 'Логово дракона' },
      { key: 'ruins',   c: V2(118, 0),  r: 14, name: 'Подземелье эха' }
    ];
    var ISLE = {};
    ISLES.forEach(function(i){ ISLE[i.key] = i; });

    // ---------- остров: неровная береговая кромка и мелководье ----------
    // All playable ground stays at y=0; only the decorative coast is lowered.
    function coastRadius(isle, a){
      var phase = isle.c.x * 0.041 + isle.c.y * 0.063;
      return isle.r + 0.95 + Math.sin(a * 3 + phase) * 0.24 + Math.cos(a * 7 - phase) * 0.09;
    }
    function coastBand(isle, inner, outer, y1, y2, color, opacity){
      var vertices = [], colors = [], base = new THREE.Color(color), count = 64;
      for (var i = 0; i < count; i++){
        var a = i / count * Math.PI * 2, b = (i + 1) / count * Math.PI * 2;
        var ra = coastRadius(isle, a), rb = coastRadius(isle, b);
        var quad = [
          [Math.cos(a) * (ra + inner), y1, Math.sin(a) * (ra + inner)],
          [Math.cos(a) * (ra + outer), y2, Math.sin(a) * (ra + outer)],
          [Math.cos(b) * (rb + outer), y2, Math.sin(b) * (rb + outer)],
          [Math.cos(b) * (rb + inner), y1, Math.sin(b) * (rb + inner)]
        ];
        var tint = base.clone().multiplyScalar(0.94 + Math.sin(i * 2.7) * 0.035);
        [0, 2, 1, 0, 3, 2].forEach(function(k){ vertices.push.apply(vertices, quad[k]); colors.push(tint.r, tint.g, tint.b); });
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals();
      var mesh = new THREE.Mesh(geo, mat(0xFFFFFF, { vertexColors: true, roughness: 0.98,
        side: THREE.DoubleSide, transparent: opacity < 1, opacity: opacity, depthWrite: opacity === 1 }));
      scene.add(at(shade(mesh, false, opacity === 1), isle.c.x, 0, isle.c.y));
    }
    function buildIsle(isle){
      var top = shade(cyl(isle.r, isle.r + 1.4, 1.2, 40, PAL.grass), false, true);
      scene.add(at(top, isle.c.x, -0.6, isle.c.y));
      var lawn = new THREE.Mesh(new THREE.CircleGeometry(isle.r, 48),
        mat(PAL.grass, { roughness: 1 }));
      lawn.rotation.x = -Math.PI / 2;
      scene.add(at(shade(lawn, false, true), isle.c.x, 0.018, isle.c.y));
      coastBand(isle, -1.5, 0, 0.016, 0, PAL.grass, 1);
      coastBand(isle, 0, 1.05, 0, -0.54, PAL.sand, 1);
      coastBand(isle, 1.05, 1.85, -0.54, -1.02, 0xB8C3B6, 1);
      coastBand(isle, 1.8, 2.35, -1.04, -1.07, PAL.foam, 0.58);
      coastBand(isle, 2.35, 3.8, -1.08, -1.14, PAL.foam, 0.12);
      // основание уходит под воду — остров читается как кусок скалы, а не диск
      var base = cyl(isle.r + 1.4, isle.r * 0.55, 4.5, 24, PAL.cliff, { flatShading: true });
      scene.add(at(base, isle.c.x, -3.2, isle.c.y));
      // Large moss patches break up the lawn without adding obstacles.
      for (var p = 0; p < 6; p++){
        var angle = p * 2.399 + isle.r;
        var patch = new THREE.Mesh(new THREE.CircleGeometry(2.1 + p * 0.22, 9),
          mat(p % 2 ? PAL.leafLight : PAL.grassDeep, { roughness: 1, transparent: true, opacity: 0.13, depthWrite: false }));
        patch.rotation.x = -Math.PI / 2; patch.rotation.z = angle;
        patch.scale.set(1.5, 0.65, 1);
        scene.add(at(patch, isle.c.x + Math.cos(angle) * isle.r * 0.65, 0.027, isle.c.y + Math.sin(angle) * isle.r * 0.65));
      }
    }
    ISLES.forEach(buildIsle);

    // Worn stepping stones suggest a route while leaving room to explore.
    function gardenPath(ax, az, bx, bz){
      var length = dist(ax, az, bx, bz), steps = Math.ceil(length / 1.5);
      for (var i = 0; i <= steps; i++){
        var u = i / steps, bend = Math.sin(u * Math.PI) * 0.48;
        var x = ax + (bx - ax) * u + (bz - az) / length * bend;
        var z = az + (bz - az) * u - (bx - ax) / length * bend;
        var stone = cyl(0.54 + (i % 3) * 0.06, 0.65, 0.045, 6, mat(0xBFC6B7, { roughness: 1, flatShading: true }));
        stone.scale.z = 0.73; stone.rotation.y = i * 1.7;
        scene.add(at(shade(stone, false, true), x, 0.044, z)); reserve(x, z, 1.25);
      }
    }
    gardenPath(-8, 0, 15, 0); gardenPath(0, -14, 0, -2); gardenPath(0, 2, 0, 14);
    gardenPath(27, 0, 52, 0); gardenPath(66, 0, 89, 0);
    [[-11,-6,0x8DDDF1,1.1],[46,8,0xB9A6EF,0.85],[85,-8,0x8DDDF1,1.05],
     [-7,-45,0xAEB5FF,1.15],[7,46,0xE7B980,1.05],[126,-7,0xAEB5FF,1.2]]
      .forEach(function(p){ addEchoCrystal(p[0], p[1], p[2], p[3]); });
    [[12,2.6],[29,-2.6],[-2.6,-12],[2.6,12],[52,2.6],[67,-2.6]]
      .forEach(function(p){ addPathLantern(p[0], p[1]); });

    // ---------- море с волной ----------
    // Сетка намеренно грубая: мир крутится в WebView на недорогих планшетах,
    // и рябь читается уже на 32 сегментах.
    var waterGeo = new THREE.PlaneGeometry(620, 620, 32, 32);
    var water = new THREE.Mesh(waterGeo, matOwn(PAL.water, { transparent: true, opacity: 0.86, roughness: 0.18, metalness: 0.05, emissive: PAL.waterDeep, emissiveIntensity: 0.08 }));
    water.rotation.x = -Math.PI / 2; water.position.y = -1.2; scene.add(water);
    var waterBase = waterGeo.attributes.position.array.slice();
    var waterFrame = 0;
    /**
     * Две бегущие синусоиды под углом — дешёвая, но живая рябь. Нормали
     * пересчитываем через кадр: это самая дорогая часть, а на глаз разницы нет.
     */
    function animateWater(t){
      var p = waterGeo.attributes.position.array;
      for (var i = 0; i < p.length; i += 3){
        var x = waterBase[i], y = waterBase[i + 1];
        p[i + 2] = Math.sin(x * 0.06 + t * 0.8) * 0.16 + Math.sin(y * 0.095 - t * 0.62) * 0.11;
      }
      waterGeo.attributes.position.needsUpdate = true;
      if ((++waterFrame & 1) === 0) waterGeo.computeVertexNormals();
    }

    // ---------- мосты ----------
    var BRIDGES = [];
    /**
     * Мост из планок между двумя точками.
     *   o.color — цвет досок; o.width — полуширина прохода;
     *   o.group — если задан, планки кладём в него (мост можно скрыть);
     *   o.key   — ключ: проход открыт, пока bridgeOpen[key] !== false.
     */
    function bridge(ax, az, bx, bz, o){
      o = o || {};
      var w = o.width || 2.3, color = o.color || PAL.wood;
      var dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
      var ang = Math.atan2(dx, dz), steps = Math.max(2, Math.round(len / 2.1));
      var parent = o.group || scene;
      for (var i = 0; i <= steps; i++){
        var s = i / steps;
        var plank = shade(box(w * 2, 0.28, 1.5, color), false, true);
        plank.rotation.y = ang;
        parent.add(at(plank, ax + dx * s, 0.05, az + dz * s));
        // перила — редкие столбики по краям
        if (i % 3 === 0 && !o.bare){
          [-1, 1].forEach(function(side){
            var px = ax + dx * s + Math.cos(ang) * w * side;
            var pz = az + dz * s - Math.sin(ang) * w * side;
            parent.add(at(cyl(0.09, 0.09, 0.9, 6, PAL.woodDark), px, 0.5, pz));
          });
        }
      }
      var seg = { ax: ax, az: az, bx: bx, bz: bz, w: w + 0.3, key: o.key || null };
      BRIDGES.push(seg);
      // мост сам защищает свой коридор и подходы к нему: иначе расстановка
      // декора вырастит дерево ровно там, где ребёнок должен пройти
      for (var r = -0.15; r <= 1.15; r += 0.15)
        reserve(ax + dx * r, az + dz * r, w + 2);
      return seg;
    }

    /** Какие мосты уже наведены (мост A→B растёт только после задачи). */
    var bridgeOpen = {};

    /** Расстояние от точки до отрезка — общая для коллизии мостов. */
    function segDist(px, pz, s){
      var dx = s.bx - s.ax, dz = s.bz - s.az;
      var l2 = dx * dx + dz * dz;
      var u = l2 ? Math.max(0, Math.min(1, ((px - s.ax) * dx + (pz - s.az) * dz) / l2)) : 0;
      return dist(px, pz, s.ax + dx * u, s.az + dz * u);
    }

    function onIsle(x, z){
      for (var i = 0; i < ISLES.length; i++)
        if (dist(x, z, ISLES[i].c.x, ISLES[i].c.y) < ISLES[i].r + 0.6) return true;
      return false;
    }
    function onBridge(x, z){
      for (var i = 0; i < BRIDGES.length; i++){
        var s = BRIDGES[i];
        if (s.key && bridgeOpen[s.key] === false) continue;
        if (segDist(x, z, s) < s.w) return true;
      }
      return false;
    }
    /** Есть ли опора под ногами (на небе — только площадка небесного острова). */
    function supported(x, z){
      if (landedHigh) return overSky(x, z);
      return onIsle(x, z) || onBridge(x, z);
    }

    // ---------- горизонт и небо ----------
    addMountains();
    [[20,16,-12,1.2],[60,18,10,1.0],[78,22,-6,1.4],[0,20,-30,1.6],[-25,15,8,1.1],
     [40,24,-22,1.3],[95,17,14,1.0],[118,21,-10,1.5],[-10,13,30,0.9],[30,19,34,1.2]]
      .forEach(function(c){ addCloud(c[0], c[1], c[2], c[3]); });
    [[-22,14],[24,-20],[58,18],[95,-10],[10,24],[-28,-8],[-14,-26],[104,12]]
      .forEach(function(p){ addLily(p[0], p[1]); });
`;
}
