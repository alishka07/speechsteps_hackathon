/**
 * Набор декора и его расстановка.
 *
 * Раньше каждое дерево стояло отдельной строкой с ручными координатами —
 * поэтому острова выглядели пустыми и одинаковыми. Теперь есть каталог
 * `PROPS` и `scatter()`: остров получает «рецепт» (сколько сосен, кустов,
 * камней), а позиции берёт из СИДИРОВАННОГО генератора — картинка богаче,
 * кода меньше, и при каждом запуске мир выглядит одинаково.
 *
 * `reserve()` защищает площадки мини-игр: декор никогда не вырастет внутри
 * круга, где стоит фонтан, дракон или ворота.
 */
export function props(): string {
  return `
    // ---------- детерминированный генератор (mulberry32) ----------
    var _seed = 0x5eed1;
    function rnd(){
      _seed |= 0; _seed = (_seed + 0x6D2B79F5) | 0;
      var t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function rr(a, b){ return a + rnd() * (b - a); }
    function tintColor(color, amt){
      var c = new THREE.Color(color);
      c.lerp(new THREE.Color(amt >= 0 ? 0xffffff : 0x102116), Math.abs(amt));
      return c.getHex();
    }
    function propMat(color, amt, opts){
      opts = opts || {};
      if (opts.roughness === undefined) opts.roughness = 0.88;
      if (opts.flatShading === undefined) opts.flatShading = true;
      return mat(tintColor(color, amt || 0), opts);
    }

    // ---------- занятые площадки: туда декор не ставим ----------
    var RESERVED = [];
    var cameraTrees = [];
    function reserve(x, z, r){ RESERVED.push([x, z, r]); }
    function isFree(x, z){
      for (var i = 0; i < RESERVED.length; i++)
        if (dist(x, z, RESERVED[i][0], RESERVED[i][1]) < RESERVED[i][2]) return false;
      return true;
    }

    // Keep the fox and the current activity visible through foreground crowns.
    // Hysteresis prevents trees flickering at the edge of the viewing corridor.
    function clearCameraView(x, y, z){
      if (!CFG.demoOnly) return;
      var dx = camera.position.x - x, dy = camera.position.y - y, dz = camera.position.z - z;
      var lengthSq = dx * dx + dy * dy + dz * dz;
      if (lengthSq < 0.01) return;
      cameraTrees.forEach(function(entry){
        var c = entry.sphere.center;
        var projection = ((c.x - x) * dx + (c.y - y) * dy + (c.z - z) * dz) / lengthSq;
        var along = Math.max(0, Math.min(1, projection));
        var distance = Math.hypot(c.x - x - along * dx, c.y - y - along * dy, c.z - z - along * dz);
        var radius = entry.sphere.radius + (entry.tree.visible ? 0.45 : 0.85);
        entry.tree.visible = !(projection > 0 && distance < radius);
      });
    }

    // ---------- каталог ----------
    // Каждый элемент — функция, возвращающая Group с началом координат у земли.
    var PROPS = {
      /** Хвойное дерево: ярусы конусов, лёгкий наклон — «живая» кривизна. */
      pine: function(){
        var g = grp();
        var trunk = at(shade(cyl(0.34, 0.58, 2.65, 8, propMat(PAL.bark, rr(-0.04, 0.08)))), 0, 1.28, 0);
        trunk.rotation.z = rr(-0.04, 0.04); g.add(trunk);
        var tint = rnd() > 0.5 ? PAL.leaf : PAL.leafLight;
        for (var i = 0; i < 3; i++){
          var tier = at(shade(cone(2.25 - i * 0.42, 1.72, 8, propMat(tint, rr(-0.05, 0.12)))), rr(-0.04, 0.04), 2.35 + i * 0.92, rr(-0.04, 0.04));
          tier.rotation.y = rnd() * Math.PI;
          tier.rotation.z = rr(-0.05, 0.05);
          g.add(tier);
        }
        g.add(at(sph(0.13, propMat(PAL.gold, 0.08), 0, 7), rr(-0.52, 0.52), rr(2.8, 4.2), rr(-0.46, 0.46)));
        g.rotation.z = rr(-0.05, 0.05);
        return g;
      },
      /** Лиственное дерево: крупная округлая low-poly крона и гранёный светлый ствол. */
      broadleaf: function(){
        var g = grp();
        var trunkM = propMat(PAL.bark, 0.08);
        var trunk = at(shade(cyl(0.52, 0.78, 3.1, 7, trunkM)), 0, 1.48, 0);
        trunk.scale.set(0.9, 1, 0.78);
        trunk.rotation.y = rnd() * Math.PI;
        g.add(trunk);
        [
          [-0.36, 0.22, 0.34, 0.18, 0.82, 0.22],
          [0.42, 0.2, -0.28, -0.16, 0.78, 0.2],
          [0.06, 0.16, 0.54, 0.04, 0.62, 0.18]
        ].forEach(function(p){
          var root = box(0.34, 0.28, 0.92, trunkM);
          root.rotation.set(0, p[3], p[4]);
          g.add(at(shade(root), p[0], p[1], p[2]));
        });

        var crownMats = [
          propMat(PAL.leafLight, 0.08),
          propMat(PAL.leaf, 0.07),
          propMat(PAL.leaf, -0.08)
        ];
        var crowns = [
          [0, 4.0, 0, 1.85, 1.18, 0],
          [-1.1, 3.55, 0.12, 1.18, 1.05, 1],
          [1.05, 3.45, -0.05, 1.05, 0.96, 2]
        ];
        crowns.forEach(function(p){
          var c = at(shade(sph(p[3], crownMats[p[5]], 0, 11)), p[0], p[1], p[2]);
          c.scale.set(1.1, p[4], 0.95);
          c.rotation.set(rr(-0.05, 0.05), rnd() * Math.PI, rr(-0.04, 0.04));
          g.add(c);
        });
        return g;
      },
      /** Пальма для песчаной кромки: изогнутый ствол + веер листьев. */
      palm: function(){
        var g = grp(), seg = 5;
        for (var i = 0; i < seg; i++){
          var s = i / seg;
          g.add(at(shade(cyl(0.2 - s * 0.06, 0.26 - s * 0.06, 0.8, 6, PAL.wood)), s * s * 1.1, 0.4 + i * 0.75, 0));
        }
        var lm = mat(PAL.leaf, { side: THREE.DoubleSide, flatShading: true });
        for (var f = 0; f < 6; f++){
          var frond = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.2, 4), lm);
          frond.rotation.set(Math.PI / 2.3, 0, 0);
          var pivot = grp(1.1, 4.0, 0); pivot.rotation.y = f / 6 * Math.PI * 2;
          frond.position.set(0, 0, 1.0); pivot.add(frond); g.add(pivot);
        }
        g.add(at(sph(0.2, PAL.gold, 0, 8), 1.1, 3.8, 0.2));
        return g;
      },
      /** Куст: кучка додекаэдров — плоские грани хорошо ловят солнце. */
      bush: function(){
        var g = grp();
        [[0, 0, 0, 0.62, -0.03], [0.52, -0.1, 0.1, 0.46, 0.08], [-0.48, -0.1, 0.15, 0.42, -0.08], [0.08, 0.24, -0.32, 0.42, 0.12], [-0.05, -0.04, 0.45, 0.34, 0.04]].forEach(function(p){
          var b = new THREE.Mesh(new THREE.DodecahedronGeometry(p[3]), propMat(PAL.leaf, p[4] + rr(-0.03, 0.03)));
          b.rotation.set(rnd() * 2, rnd() * 4, rnd() * 2);
          g.add(at(shade(b), p[0], p[1] + 0.3, p[2]));
        });
        for (var berry = 0; berry < 3; berry++)
          g.add(at(sph(0.07, propMat(berry % 2 ? PAL.coral : PAL.gold, 0.06), 0, 7), rr(-0.38, 0.38), rr(0.62, 0.95), rr(-0.32, 0.32)));
        return g;
      },
      /** Валун: мягкая low-poly кучка мятных камней с маленькими цветами сверху. */
      rock: function(){
        var g = grp();
        var rockMats = [
          propMat(PAL.stone, 0.03),
          propMat(0x8BA7AC, 0.04),
          propMat(0xB6C6C7, -0.01)
        ];
        [
          [-0.45, 0.34, 0.05, 0.72, 1.0, 0.62, 0.9],
          [0.18, 0.44, 0.02, 0.95, 1.15, 0.72, 1.0],
          [0.78, 0.31, 0.08, 0.62, 0.9, 0.56, 0.82],
          [-0.9, 0.24, 0.13, 0.5, 0.8, 0.5, 0.7],
          [0.05, 0.24, -0.55, 0.58, 0.9, 0.52, 0.68]
        ].forEach(function(p, i){
          var r = new THREE.Mesh(new THREE.IcosahedronGeometry(p[3], 1), rockMats[i % rockMats.length]);
          r.rotation.set(rr(-0.25, 0.45), rnd() * Math.PI * 2, rr(-0.18, 0.28));
          r.scale.set(p[4], p[5], p[6]);
          g.add(at(shade(r, true, true), p[0], p[1], p[2]));
        });

        var grassMat = propMat(PAL.leaf, 0.08);
        [[-0.78, 0.07, 0.45], [0.62, 0.08, 0.48], [0.96, 0.07, -0.28], [-0.25, 0.08, -0.68]].forEach(function(p){
          var blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, rr(0.35, 0.55), 4), grassMat);
          blade.rotation.z = rr(-0.35, 0.35);
          blade.rotation.x = rr(-0.12, 0.22);
          g.add(at(shade(blade), p[0], p[1] + 0.24, p[2]));
        });

        var flowerM = propMat(0xF3D64E, 0.02);
        [[-0.18, 0.95, -0.08], [0.08, 0.94, 0.1], [-0.34, 0.78, 0.2]].forEach(function(p, i){
          var stem = cyl(0.018, 0.02, 0.22, 5, PAL.leafLight);
          g.add(at(shade(stem), p[0], p[1] - 0.12, p[2]));
          var head = sph(i === 1 ? 0.07 : 0.055, flowerM, 0, 7);
          head.scale.y = 0.62;
          g.add(at(shade(head), p[0], p[1], p[2]));
        });
        return g;
      },
      /** Пучок травы: три «пера» из вытянутых конусов. */
      tuft: function(){
        var g = grp();
        for (var i = 0; i < 6; i++){
          var h = rr(0.42, 0.92);
          var blade = new THREE.Mesh(new THREE.ConeGeometry(rr(0.055, 0.085), h, 4), propMat(i % 2 ? PAL.leafLight : PAL.leaf, rr(-0.03, 0.08)));
          blade.position.set(rr(-0.24, 0.24), h / 2, rr(-0.24, 0.24));
          blade.rotation.z = rr(-0.42, 0.42); blade.rotation.x = rr(-0.2, 0.2); g.add(blade);
        }
        return g;
      },
      flower: function(){
        var g = grp();
        var cols = [0xF3D64E, 0xFFF6D1, PAL.gold, 0xF4C6DC];
        var col = cols[Math.floor(rnd() * cols.length)];
        g.add(at(cyl(0.032, 0.04, 0.62, 5, propMat(PAL.leafLight, 0.02)), 0, 0.31, 0));
        [-1, 1].forEach(function(s){
          var leaf = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), propMat(PAL.leaf, 0.08, { side: THREE.DoubleSide }));
          leaf.rotation.x = -Math.PI / 2.4; leaf.rotation.z = s * 0.9;
          g.add(at(leaf, s * 0.1, 0.32, 0));
        });
        for (var p = 0; p < 5; p++){
          var ang = p / 5 * Math.PI * 2;
          var petal = sph(0.095, propMat(col, p % 2 ? 0.06 : -0.01), 0, 8);
          petal.scale.set(0.9, 0.58, 0.9);
          g.add(at(petal, Math.cos(ang) * 0.13, 0.64, Math.sin(ang) * 0.13));
        }
        g.add(at(sph(0.075, propMat(0xF3D64E, 0.05), 0, 8), 0, 0.66, 0));
        return g;
      },
      mushroom: function(){
        var g = grp();
        g.add(at(cyl(0.11, 0.16, 0.52, 8, propMat(PAL.cream, -0.02)), 0, 0.26, 0));
        var cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), propMat(0xE5484D, rr(-0.04, 0.05)));
        g.add(at(shade(cap), 0, 0.5, 0));
        [[0.14, 0.62, 0.05, 0.05], [-0.11, 0.58, -0.08, 0.04], [0.02, 0.66, -0.13, 0.035]].forEach(function(p){
          g.add(at(sph(p[3], PAL.cream, 0, 6), p[0], p[1], p[2]));
        });
        return g;
      }
    };

    /** A few sound crystals give each island a recognizable accent, with no extra lights. */
    function addEchoCrystal(x, z, color, size){
      var group = grp(x, 0, z);
      var crystalMat = mat(color, { roughness: 0.25, metalness: 0.12,
        emissive: color, emissiveIntensity: 0.42, flatShading: true });
      [[0, 0.92, 0, 0.34, 1.25, 0], [-0.48, 0.5, 0.14, 0.23, 0.67, 0.35], [0.42, 0.36, 0.26, 0.19, 0.51, -0.38]]
        .forEach(function(p){
          var shard = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), crystalMat);
          shard.scale.set(p[3], p[4], p[3]); shard.rotation.z = p[5]; shard.rotation.y = 0.35;
          group.add(at(shade(shard), p[0], p[1], p[2]));
        });
      var base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68), mat(PAL.stoneDark, { flatShading: true, roughness: 1 }));
      base.scale.set(1.15, 0.28, 0.85); group.add(at(shade(base), 0, 0.07, 0.04));
      group.add(at(glowSprite(color, 2.7, 0.22), 0, 0.85, 0));
      group.scale.setScalar(size || 1); scene.add(group); reserve(x, z, 1.9);
    }

    function addPathLantern(x, z){
      var group = grp(x, 0, z), frameMat = mat(PAL.woodDark, { roughness: 0.8 });
      group.add(at(cyl(0.085, 0.13, 1.2, 6, frameMat), 0, 0.6, 0));
      group.add(at(box(0.38, 0.11, 0.38, frameMat), 0, 1.07, 0));
      group.add(at(box(0.25, 0.38, 0.25, mat(0xFFD687, { emissive: 0xFFB948, emissiveIntensity: 1.2 })), 0, 1.28, 0));
      group.add(at(cone(0.33, 0.23, 4, frameMat), 0, 1.58, 0).rotateY(Math.PI / 4));
      group.add(at(glowSprite(0xFFD29A, 1.9, 0.22), 0, 1.29, 0));
      scene.add(group); reserve(x, z, 0.9);
    }

    /**
     * Рассыпать декор по кольцу острова.
     *   isle — { c: Vector2, r } из ISLES;
     *   recipe — { pine: 5, bush: 4, ... } сколько чего;
     *   band — [от, до] доля радиуса, куда ставить (по умолчанию 0.35..0.92).
     */
    function scatter(isle, recipe, band){
      band = band || [0.35, 0.92];
      for (var kind in recipe){
        var n = recipe[kind], make = PROPS[kind];
        if (!make) continue;
        for (var i = 0; i < n; i++){
          var placed = false;
          // до 12 попыток найти свободное место, иначе пропускаем
          for (var tryN = 0; tryN < 12 && !placed; tryN++){
            var ang = rnd() * Math.PI * 2;
            var rad = isle.r * rr(band[0], band[1]);
            var x = isle.c.x + Math.cos(ang) * rad, z = isle.c.y + Math.sin(ang) * rad;
            if (!isFree(x, z)) continue;
            var o = make();
            o.position.set(x, 0, z);
            o.rotation.y = rnd() * Math.PI * 2;
            var scale = kind === 'pine' ? rr(1.08, 1.42) : (kind === 'broadleaf' ? rr(1.2, 1.48) : rr(0.9, 1.22));
            o.scale.setScalar(scale);
            if (CFG.demoOnly && (kind === 'pine' || kind === 'broadleaf' || kind === 'palm')){
              o.updateMatrixWorld(true);
              cameraTrees.push({ tree: o, sphere: new THREE.Box3().setFromObject(o).getBoundingSphere(new THREE.Sphere()) });
              o.userData.cameraOccluder = true;
            }
            scene.add(o); placed = true;
          }
        }
      }
    }

    // ---------- живность и небо ----------
    var fireflies = [], butterflies = [], clouds = [];

    function addFireflies(pts){
      var fm = basicOwn(0xFFF1A6, { transparent: true, opacity: 0.9, fog: false });
      pts.forEach(function(p){
        var f = at(sph(0.12, fm, 0, 8), p[0], 2, p[1]);
        f.userData = { bx: p[0], bz: p[1], ph: rnd() * 6.28 };
        scene.add(f); fireflies.push(f);
      });
    }
    /** Бабочка: две «крылышки»-плоскости, машут в противофазе. */
    function addButterfly(x, z, col){
      var g = grp(x, 1.6, z), wm = mat(col, { side: THREE.DoubleSide, flatShading: true });
      var l = new THREE.Mesh(new THREE.CircleGeometry(0.22, 8, 0, Math.PI), wm);
      var r = new THREE.Mesh(new THREE.CircleGeometry(0.22, 8, 0, Math.PI), wm);
      l.rotation.z = Math.PI / 2; r.rotation.z = -Math.PI / 2;
      g.add(l); g.add(r);
      g.userData = { bx: x, bz: z, ph: rnd() * 6.28, l: l, r: r };
      scene.add(g); butterflies.push(g);
    }
    function addCloud(x, y, z, s){
      var m = mat(0xD6DAEC, { roughness: 1, emissive: 0x7A84B0, emissiveIntensity: 0.12 });
      var g = grp(x, y, z);
      [[0,0,0,1.5],[1.3,-.15,.1,1.05],[-1.3,-.15,.2,.95],[.35,.45,.35,.85],[-.5,.35,-.3,.8],[2.1,-.3,-.2,.7]]
        .forEach(function(p){ g.add(at(sph(p[3], m, 0, 10), p[0], p[1], p[2])); });
      g.scale.setScalar(s || 1); scene.add(g);
      clouds.push({ g: g, sp: rr(0.4, 1.1) });
    }
    /** Кольцо дальних гор — глубина фона, тонут в дымке тумана. */
    function addMountains(){
      var m = mat(PAL.mountain, { flatShading: true });
      for (var i = 0; i < 16; i++){
        var a = i / 16 * Math.PI * 2, rad = 142 + rnd() * 30, h = 16 + rnd() * 26;
        var peak = new THREE.Mesh(new THREE.ConeGeometry(12 + rnd() * 11, h, 5), m);
        peak.position.set(50 + Math.cos(a) * rad, h / 2 - 2, Math.sin(a) * rad);
        peak.rotation.y = rnd() * 3; scene.add(peak);
      }
    }
    /** Кувшинка — единственный декор, который стоит на воде. */
    function addLily(x, z){
      var pad = new THREE.Mesh(new THREE.CircleGeometry(1.0, 14, 0, Math.PI * 1.85), mat(0x49A06A, { side: THREE.DoubleSide }));
      pad.rotation.x = -Math.PI / 2; scene.add(at(pad, x, -1.1, z));
      scene.add(at(sph(0.18, 0xF7B7D2, 0, 8), x, -0.95, z));
    }

    /** Покачивание декоративной живности и облаков — вызывается каждый кадр. */
    function animateAmbient(dt, t){
      for (var i = 0; i < clouds.length; i++){
        clouds[i].g.position.x += clouds[i].sp * dt;
        if (clouds[i].g.position.x > 170) clouds[i].g.position.x = -70;
      }
      for (var f = 0; f < fireflies.length; f++){
        var ff = fireflies[f], u = ff.userData;
        ff.position.set(
          u.bx + Math.sin(t * 0.8 + u.ph) * 1.7,
          2.0 + Math.sin(t * 1.5 + u.ph) * 0.7,
          u.bz + Math.cos(t * 0.6 + u.ph) * 1.7);
        ff.scale.setScalar(0.7 + Math.abs(Math.sin(t * 3 + u.ph)) * 0.6);
      }
      for (var b = 0; b < butterflies.length; b++){
        var bf = butterflies[b], d = bf.userData, ph = t * 0.6 + d.ph;
        bf.position.set(d.bx + Math.sin(ph) * 3.2, 1.4 + Math.sin(ph * 2.3) * 0.5, d.bz + Math.cos(ph * 0.8) * 3.2);
        bf.rotation.y = -ph;
        var flap = Math.sin(t * 16 + d.ph) * 0.9;
        d.l.rotation.y = flap; d.r.rotation.y = -flap;
      }
    }
`;
}
