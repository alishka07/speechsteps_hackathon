/**
 * Объекты зон: ворота, тотем, небесный остров с сундуком, барабан, фонтан,
 * дракон, люлька, светофор, зеркало, подземелье, ветряк и колокол.
 *
 * Все координаты собраны в одной таблице `SPOT`. Раньше каждая точка жила в
 * своей переменной и повторялась ещё раз в проверке расстояния — теперь и
 * постройка, и зона, и защита от декора берут одну и ту же запись.
 */
export function landmarks(): string {
  return `
    /** Единая карта мира: где что стоит. */
    var SPOT = {
      gate:     V2(21, 0),
      totem:    V2(48, 0),
      drum:     V2(2, 8),
      mill:     V2(40, -6),
      bell:     V2(76, -6),
      fountain: V2(0, -40),
      dragon:   V2(0, 40),
      cradle:   V2(-9, 7),
      traffic:  V2(40, 5),
      mirror:   V2(33, -4),
      dungeon:  V2(118, 0),
      sky:      V2(78, 0)
    };
    SPOT.flower = V2(SPOT.sky.x + 3.5, SPOT.sky.y);
    SPOT.chest  = V2(SPOT.sky.x - 3.5, SPOT.sky.y);
    // площадки зон — декор туда не вырастет
    for (var _sk in SPOT) reserve(SPOT[_sk].x, SPOT[_sk].y, 5);

    var SKY_Y = 9, SKY_R = 8.5;
    function overSky(x, z){ return dist(x, z, SPOT.sky.x, SPOT.sky.y) < SKY_R - 0.4; }

    // ---------- мосты между островами ----------
    bridge(16, 0, 26, 0, { color: PAL.wood });                                   // хаб → поляна
    bridge(0, -16, 0, -26, { color: PAL.wood });                                 // хаб → долина
    bridge(0, 16, 0, 26, { color: PAL.wood });                                   // хаб → логово
    bridge(92, 0, 104, 0, { color: PAL.stone, key: 'ruins' });                   // берег → подземелье
    var vineBridge = grp(); vineBridge.visible = false; scene.add(vineBridge);
    bridge(54, 0, 64, 0, { color: PAL.leafLight, group: vineBridge, key: 'vine' });
    bridgeOpen.vine = false;                                                     // вырастет по задаче

    // ---------- ворота (крикни) ----------
    var GATE_X = SPOT.gate.x;
    [-2.4, 2.4].forEach(function(z){
      scene.add(at(shade(box(1.4, 6, 1.4, PAL.stone)), GATE_X, 1, z));
      scene.add(at(sph(0.8, PAL.stoneDark, { flatShading: true }, 10), GATE_X, 4.1, z));
    });
    var gateBar = at(shade(box(1.0, 4.6, 4.2, PAL.coral)), GATE_X, 1.3, 0);
    scene.add(gateBar);
    // рунный знак на створке — подсказывает, что ворота отпирает звук
    scene.add(at(torus(0.7, 0.1, 18, PAL.gold, { emissive: 0x4a3500, emissiveIntensity: 0.4 }), GATE_X - 0.55, 2.2, 0)
      .rotateY(Math.PI / 2));

    // ---------- тотем (тяни «Ссс») ----------
    var totem = at(shade(cyl(0.6, 0.8, 3.2, 7, PAL.lavender)), SPOT.totem.x, 0.6, SPOT.totem.y);
    scene.add(totem);
    [0.6, 1.6, 2.4].forEach(function(y, i){
      var ring = at(torus(0.72 - i * 0.04, 0.08, 16, PAL.gold, { emissive: 0x4a3500, emissiveIntensity: 0.3 }), 0, y - 1.6, 0);
      ring.rotation.x = Math.PI / 2; totem.add(ring);
    });
    totem.add(at(cone(0.5, 0.7, 7, PAL.leafLight), 0, 1.9, 0));

    // ---------- небесный остров ----------
    var platform = at(shade(cyl(SKY_R, SKY_R - 1.2, 0.9, 36, 0xEDE6FA), true, true), SPOT.sky.x, SKY_Y, SPOT.sky.y);
    scene.add(platform);
    for (var ca = 0; ca < 10; ca++){
      var ang = ca / 10 * Math.PI * 2;
      scene.add(at(sph(1.3, 0xffffff, 0, 10),
        SPOT.sky.x + Math.cos(ang) * SKY_R, SKY_Y + 0.2, SPOT.sky.y + Math.sin(ang) * SKY_R));
    }
    // посадочный круг внизу — куда встать, чтобы взлететь
    var bMark = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.1, 32),
      basic(PAL.coral, { side: THREE.DoubleSide }));
    bMark.rotation.x = -Math.PI / 2;
    scene.add(at(bMark, SPOT.sky.x, 0.05, SPOT.sky.y));

    // поющий цветок — зона «тяни голосом»
    var skyFlower = at(grp(), SPOT.flower.x, SKY_Y + 0.45, SPOT.flower.y);
    skyFlower.add(at(cyl(0.12, 0.12, 1.4, 6, PAL.leaf), 0, 0.7, 0));
    var petals = at(torus(0.5, 0.22, 16, 0xEF5DA8), 0, 1.5, 0);
    skyFlower.add(petals);
    skyFlower.add(at(sph(0.32, PAL.gold, { emissive: 0x6b4e00, emissiveIntensity: 0.3 }, 12), 0, 1.5, 0));
    scene.add(skyFlower);

    // ---------- сундук ----------
    var chest = at(grp(), SPOT.chest.x, SKY_Y + 0.45, SPOT.chest.y);
    var goldMat = mat(PAL.gold, { metalness: 0.65, roughness: 0.34, emissive: 0x3a2a00, emissiveIntensity: 0.2 });
    chest.add(at(shade(box(1.5, 0.8, 1.1, PAL.woodDark, { roughness: 0.9 })), 0, 0.4, 0));
    [0.1, 0.74].forEach(function(y){ chest.add(at(box(1.56, 0.11, 1.16, goldMat), 0, y, 0)); });
    [-0.45, 0.45].forEach(function(x){ chest.add(at(box(0.13, 0.66, 0.05, goldMat), x, 0.42, 0.55)); });
    chest.add(at(box(0.28, 0.32, 0.09, goldMat), 0, 0.56, 0.55));
    chest.add(at(cyl(0.05, 0.05, 0.12, 8, 0x241a10), 0, 0.56, 0.61).rotateX(Math.PI / 2));
    [[-0.7,-0.5],[0.7,-0.5],[-0.7,0.5],[0.7,0.5]].forEach(function(c){
      chest.add(at(sph(0.07, goldMat, 0, 8), c[0], 0.74, c[1]));
    });
    var chestLid = at(grp(), 0, 0.8, -0.55);
    var lidMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 1.5, 24, 1, false, 0, Math.PI),
      mat(0x7C5029, { roughness: 0.9 }));
    lidMesh.rotation.z = Math.PI / 2;
    chestLid.add(shade(at(lidMesh, 0, 0, 0.56)));
    chestLid.add(at(box(1.5, 0.1, 0.1, goldMat), 0, 0.04, 1.1));
    chest.add(chestLid);

    var loot = grp(); loot.visible = false; chest.add(loot);
    var coinMat = mat(0xF6C945, { metalness: 0.6, roughness: 0.3, emissive: 0x5a4000, emissiveIntensity: 0.4 });
    for (var ci = 0; ci < 16; ci++){
      var coin = at(cyl(0.12, 0.12, 0.04, 12, coinMat), rr(-0.5, 0.5), 0.78 + rnd() * 0.14, rr(-0.35, 0.35));
      coin.rotation.set(rnd() * 0.5, rnd() * 3, rr(-0.25, 0.25)); loot.add(coin);
    }
    loot.add(at(sph(0.5, basicOwn(PAL.sunGlow, { transparent: true, opacity: 0.32 }), 0, 12), 0, 0.95, 0));
    var gem = at(new THREE.Mesh(new THREE.OctahedronGeometry(0.34),
      matOwn(0x5EC8E0, { emissive: 0x1d6f86, emissiveIntensity: 0.7 })), 0, 0.95, 0);
    gem.visible = false; chest.add(gem);
    scene.add(chest);

    // ---------- воздушный шар ----------
    var balloon = grp();
    var bulb = sph(1, PAL.coral, 0, 18); bulb.scale.y = 1.2; balloon.add(bulb);
    for (var st = 0; st < 4; st++){
      var stripe = sph(1.01, mat(PAL.cream), 0, 18);
      stripe.scale.set(0.16, 1.2, 1.01); stripe.rotation.y = st / 4 * Math.PI; balloon.add(stripe);
    }
    balloon.add(at(box(0.9, 0.6, 0.9, PAL.wood), 0, -2.1, 0));
    [-1, 1].forEach(function(s){ balloon.add(at(cyl(0.02, 0.02, 1.5, 4, PAL.woodDark), s * 0.4, -1.3, 0)); });
    balloon.visible = false; balloon.scale.setScalar(0.4); scene.add(balloon);

    // ---------- барабан ----------
    var drum = grp(SPOT.drum.x, 0, SPOT.drum.y);
    drum.add(at(shade(cyl(1.0, 1.0, 1.0, 16, 0xA0522D)), 0, 0.2, 0));
    var drumTop = new THREE.Mesh(new THREE.CircleGeometry(1.0, 16), mat(PAL.sand, { side: THREE.DoubleSide }));
    drumTop.rotation.x = -Math.PI / 2; drum.add(at(drumTop, 0, 0.71, 0));
    [0, 1, 2, 3].forEach(function(i){
      var a = i / 4 * Math.PI * 2;
      drum.add(at(cyl(0.05, 0.05, 1.0, 5, PAL.gold), Math.cos(a) * 1.0, 0.2, Math.sin(a) * 1.0));
    });
    scene.add(drum);

    // ---------- фонтан ----------
    var fountain = grp(SPOT.fountain.x, 0, SPOT.fountain.y); scene.add(fountain);
    fountain.add(at(shade(cyl(2.2, 2.6, 0.7, 24, 0xBFD7E8), false, true), 0, 0.35, 0));
    fountain.add(at(torus(2.2, 0.18, 28, 0x9FC0D6), 0, 0.7, 0).rotateX(Math.PI / 2));
    var jet = at(cyl(0.26, 0.46, 1, 12, matOwn(PAL.water, { transparent: true, opacity: 0.82, emissive: PAL.waterDeep, emissiveIntensity: 0.3 })), 0, 0.7, 0);
    jet.geometry.translate(0, 0.5, 0); jet.scale.y = 0.2; fountain.add(jet);
    var fountBloom = grp(); fountBloom.visible = false; fountain.add(fountBloom);
    [PAL.coral, PAL.gold, PAL.leafLight, PAL.water, 0x5B8DEF, PAL.lavender, 0xEF5DA8].forEach(function(c, i){
      var arc = at(torus(2.9 + i * 0.24, 0.13, 30, mat(c, { emissive: c, emissiveIntensity: 0.25 }), 0, Math.PI), 0, 0.7, -0.6);
      fountBloom.add(arc);
    });

    // ---------- дракон ----------
    var dragon = grp(SPOT.dragon.x, 0, SPOT.dragon.y);
    dragon.rotation.y = Math.PI / 2; scene.add(dragon);
    var dScale = mat(0x5B8C5A, { flatShading: true });
    var dBelly = mat(0xC9D98C, { flatShading: true });
    var dBody = at(shade(sph(1.5, dScale, 0, 16)), 0, 1.1, 0);
    dBody.scale.set(1.5, 1.0, 1.1); dragon.add(dBody);
    var dUnder = at(sph(1.1, dBelly, 0, 14), 0.1, 0.85, 0.35);
    dUnder.scale.set(1.35, 0.7, 0.7); dragon.add(dUnder);
    // гребень вдоль спины
    for (var sp2 = 0; sp2 < 6; sp2++)
      dragon.add(at(cone(0.16, 0.42, 4, PAL.gold), 1.0 - sp2 * 0.5, 2.05 - Math.abs(sp2 - 2) * 0.08, 0));

    var dHead = at(grp(), 1.7, 1.7, 0); dragon.add(dHead);
    var dHeadM = sph(0.85, dScale, 0, 14); dHeadM.scale.set(1.2, 1, 1); dHead.add(dHeadM);
    var dSnout = at(sph(0.5, dScale, 0, 12), 0.85, -0.12, 0); dSnout.scale.set(1.1, 0.7, 0.8); dHead.add(dSnout);
    [[1.2, -0.05, 0.16], [1.2, -0.05, -0.16]].forEach(function(p){
      dHead.add(at(sph(0.07, mat(0x2b3a2b), 0, 6), p[0], p[1], p[2]));   // ноздри
    });
    [[0.55, 0.3, 0.42], [0.55, 0.3, -0.42]].forEach(function(p){
      dHead.add(at(sph(0.17, mat(0xffffff), 0, 10), p[0], p[1], p[2]));
      dHead.add(at(sph(0.085, mat(PAL.gold, { emissive: 0x6b4e00, emissiveIntensity: 0.5 }), 0, 8), p[0] + 0.1, p[1], p[2]));
      dHead.add(at(sph(0.04, mat(0x222222), 0, 6), p[0] + 0.15, p[1], p[2]));
    });
    [0.42, -0.42].forEach(function(z){
      var horn = at(cone(0.14, 0.55, 8, PAL.sand), -0.2, 0.9, z); horn.rotation.x = z > 0 ? 0.2 : -0.2; dHead.add(horn);
    });
    var dWing = mat(0x4A7549, { side: THREE.DoubleSide, flatShading: true });
    var dWings = [];
    [1, -1].forEach(function(s){
      var w = at(grp(), -0.4, 2.1, s * 0.9);
      var membrane = cone(1.1, 2.4, 4, dWing);
      membrane.scale.set(0.22, 1, 1); membrane.rotation.z = s * 0.35; w.add(membrane);
      dragon.add(w); dWings.push(w);
    });
    var dTail = at(cone(0.5, 2.4, 8, dScale), -1.9, 1.0, 0); dTail.rotation.z = Math.PI / 2; dragon.add(dTail);
    dragon.add(at(cone(0.35, 0.6, 4, PAL.gold), -3.2, 1.0, 0).rotateZ(Math.PI / 2));
    var fire = at(cone(0.5, 1.7, 12, basicOwn(PAL.coral, { transparent: true, opacity: 0.85 })), 2.0, 1.6, 0);
    fire.rotation.z = -Math.PI / 2; fire.visible = false; dragon.add(fire);

    // ---------- люлька ----------
    var cradle = grp(SPOT.cradle.x, 0, SPOT.cradle.y); scene.add(cradle);
    cradle.add(at(shade(box(1.9, 0.55, 1.1, 0xCDA06B)), 0, 0.5, 0));
    cradle.add(at(box(1.5, 0.32, 0.95, PAL.lavender), 0.25, 0.83, 0));
    cradle.add(at(box(0.5, 0.3, 0.7, 0xffffff), -0.6, 0.85, 0));
    cradle.add(at(sph(0.22, PAL.skin, 0, 12), -0.62, 1.05, 0));
    [-1, 1].forEach(function(s){ cradle.add(at(cyl(0.07, 0.07, 2.4, 6, PAL.woodDark), s * 0.85, 1.2, 0)); });
    var lullStar = at(new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0),
      matOwn(0xF5E27A, { emissive: 0xF5E27A, emissiveIntensity: 0.2, flatShading: true })), 0, 2.3, 0);
    cradle.add(lullStar);

    // ---------- светофор ----------
    var traffic = grp(SPOT.traffic.x, 0, SPOT.traffic.y); scene.add(traffic);
    traffic.add(at(shade(cyl(0.18, 0.18, 3.0, 10, 0x6b7280)), 0, 1.5, 0));
    traffic.add(at(box(0.9, 1.7, 0.5, 0x2b3038), 0, 3.3, 0));
    var tlRed = at(sph(0.28, matOwn(PAL.coral, { emissive: PAL.coral, emissiveIntensity: 0.1 }), 0, 16), 0, 3.7, 0.28);
    var tlGreen = at(sph(0.28, matOwn(PAL.leafLight, { emissive: PAL.leafLight, emissiveIntensity: 0.1 }), 0, 16), 0, 2.95, 0.28);
    traffic.add(tlRed); traffic.add(tlGreen);

    // ---------- зеркало ----------
    var mirror = grp(SPOT.mirror.x, 0, SPOT.mirror.y);
    mirror.rotation.y = -Math.PI / 2; scene.add(mirror);
    mirror.add(at(shade(cyl(0.16, 0.2, 2.0, 10, PAL.woodDark)), 0, 1.0, 0));
    var mGlass = at(new THREE.Mesh(new THREE.CircleGeometry(1.05, 32),
      matOwn(0xCFEAF7, { emissive: 0x8FC9F0, emissiveIntensity: 0.25, metalness: 0.4, roughness: 0.15 })), 0, 2.6, 0.06);
    mirror.add(mGlass);
    mirror.add(at(torus(1.1, 0.16, 32, goldMat), 0, 2.6, 0.06));
    for (var mg = 0; mg < 6; mg++){
      var ma = mg / 6 * Math.PI * 2;
      mirror.add(at(sph(0.09, PAL.lavender, { emissive: PAL.lavenderDeep, emissiveIntensity: 0.4 }, 8),
        Math.cos(ma) * 1.25, 2.6 + Math.sin(ma) * 1.25, 0.06));
    }

    // ---------- подземелье (детали dungeon-кита) ----------
    var dungeon = at(grp(), SPOT.dungeon.x, 0.04, SPOT.dungeon.y); scene.add(dungeon);
    var torches = [];
    function buildDungeon(){
      for (var fi = -1; fi <= 1; fi++)
        for (var fj = -1; fj <= 1; fj++) addPiece(dungeon, 'template-floor', fi * 4, 0, fj * 4, 0);
      for (var w = -1; w <= 1; w++){
        addPiece(dungeon, 'template-wall', w * 4, 0, -4, 0);
        addPiece(dungeon, 'template-wall', -4, 0, w * 4, Math.PI / 2);
        addPiece(dungeon, 'template-wall', 4, 0, w * 4, -Math.PI / 2);
      }
      addPiece(dungeon, 'template-wall-corner', -4, 0, -4, 0);
      addPiece(dungeon, 'template-wall-corner', 4, 0, -4, -Math.PI / 2);
      addPiece(dungeon, 'template-wall-half', -4, 0, 4, Math.PI);
      addPiece(dungeon, 'template-wall-half', 4, 0, 4, Math.PI);
      [[-3.6, -3.5], [3.6, -3.5], [0, 3.5]].forEach(function(p){
        var g = at(grp(), p[0], 2.2, p[1]);
        var stick = cyl(0.06, 0.06, 0.7, 6, 0x5b3a1d); stick.rotation.z = 0.35; g.add(stick);
        var flame = at(cone(0.18, 0.42, 8, basicOwn(PAL.torch, { transparent: true, opacity: 0 })), 0.12, 0.45, 0);
        var light = new THREE.PointLight(PAL.torch, 0, 10); light.position.set(0.12, 0.5, 0);
        g.add(flame); g.add(light); dungeon.add(g);
        torches.push({ flame: flame, light: light });
      });
    }
    var dGate = grp();

    // ---------- ветряк и колокол (бонус-реакции, без задач) ----------
    scene.add(at(shade(cyl(0.22, 0.28, 4.2, 8, 0xC9A36B)), SPOT.mill.x, 1.1, SPOT.mill.y));
    var windmill = at(grp(), SPOT.mill.x, 3.0, SPOT.mill.y + 0.4);
    windmill.add(sph(0.3, 0x8a8f9c, 0, 10));
    for (var b = 0; b < 4; b++){
      var arm = grp(); arm.rotation.z = b * Math.PI / 2;
      arm.add(at(shade(box(0.35, 1.7, 0.08, b % 2 ? PAL.coral : PAL.teal)), 0, 1.0, 0));
      windmill.add(arm);
    }
    scene.add(windmill);

    var bell = at(grp(), SPOT.bell.x, 1.85, SPOT.bell.y);
    [-1, 1].forEach(function(s){
      scene.add(at(shade(cyl(0.13, 0.13, 3.2, 7, 0xB07A45)), SPOT.bell.x + s, 0.6, SPOT.bell.y));
    });
    scene.add(at(cyl(0.1, 0.1, 2.4, 7, 0xB07A45), SPOT.bell.x, 2.15, SPOT.bell.y).rotateZ(Math.PI / 2));
    var cup = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      mat(PAL.gold, { metalness: 0.4, roughness: 0.3 }));
    bell.add(shade(at(cup, 0, -0.1, 0)));
    bell.add(at(sph(0.12, 0x6b4e00, 0, 8), 0, -0.55, 0));
    scene.add(bell);

    /**
     * Наземные звёзды: награда за само исследование, без задач. Ключи g0…g6
     * попадают в сохранение, поэтому список дополняют в конец, а не в середину.
     * Расставляет их модуль hud — там, где заведён массив звёзд.
     */
    // In the demo, sparks are earned by helping the three characters.
    var GROUND_STARS = CFG.demoOnly ? [] : [[-3, 5], [5, -4], [10, 3], [36, 5], [44, -5], [74, 4], [82, -4]];
    GROUND_STARS.forEach(function(p){ reserve(p[0], p[1], 2); });
    if (CFG.demoOnly) [[-2, 0], [3, -5], [5, 4]].forEach(function(p){ reserve(p[0], p[1], 3.4); });

    // ---------- декор островов ----------
    // Место старта героя — тоже площадка: там не должно вырасти дерево.
    reserve(-6, 0, 3);
    /**
     * Плотность подобрана под слабый WebView: у каждой детали свои меши, а
     * объединять геометрию в ядре Three.js нечем. Поэтому разнообразие даёт не
     * количество, а НАБОР видов на острове — у каждого он свой и узнаваемый.
     */
    scatter(ISLE.hub,    { pine: 4, broadleaf: 2, bush: 3, rock: 2, tuft: 6, flower: 5, mushroom: 2 });
    scatter(ISLE.meadow, { pine: 3, broadleaf: 2, bush: 3, rock: 1, tuft: 6, flower: 5 });
    scatter(ISLE.shore,  { pine: 2, palm: 2, broadleaf: 2, bush: 2, rock: 2, tuft: 5, flower: 3, mushroom: 1 });
    scatter(ISLE.valley, { pine: 5, bush: 3, rock: 2, tuft: 5, flower: 3, mushroom: 3 });
    scatter(ISLE.lair,   { pine: 2, rock: 5, bush: 1, tuft: 3 });
    scatter(ISLE.ruins,  { rock: 5, bush: 1, tuft: 3 }, [0.6, 0.95]);
    addFireflies([[-5,7],[7,-5],[40,5],[44,-7],[76,-5],[80,6],[20,0],[60,-2],[-4,-38],[4,-42]]);
    [[6, -6, PAL.coral], [-8, 4, PAL.lavender], [42, 4, PAL.gold], [76, 4, 0xEF5DA8], [-4, -36, PAL.teal]]
      .forEach(function(b){ addButterfly(b[0], b[1], b[2]); });
`;
}
