/**
 * Герой и спутник.
 *
 * Персонаж собран в «чиби»-пропорциях: крупная голова, маленькое тело, мягкие
 * капсулы вместо коробок — так он читается даже на маленьком экране телефона.
 * Три вида (лисёнок / мишка / котёнок) отличаются ушами, мордочкой и хвостом,
 * остальная сборка общая, поэтому новый вид — это ~6 строк данных, а не копия
 * билдера.
 *
 * Главное новое — МИМИКА. У героя есть брови и три формы рта, а `setMood()`
 * переключает состояния: `listen` у задачи, `happy` на награде, `oops`, когда
 * тренер подсказывает ошибку. Ребёнок видит реакцию персонажа раньше, чем
 * дочитает подсказку.
 */
export function characters(): string {
  return `
    // ---------- виды ----------
    var SPECIES = [
      { key: 'fox',  name: 'Лисёнок', emoji: '🦊', ear: 'point', tail: 'bushy', muzzle: 0.9 },
      { key: 'bear', name: 'Мишка',   emoji: '🐻', ear: 'round', tail: 'stub',  muzzle: 1.1 },
      { key: 'cat',  name: 'Котёнок', emoji: '🐱', ear: 'point', tail: 'long',  muzzle: 0.8 }
    ];
    var HATS = [
      { key: 'none', name: 'Без аксессуаров' }
    ];

    var chosenColor = SKIN_COLORS[0], chosenHat = 'none', chosenSpecies = SPECIES[0];

    // ---------- сборка героя ----------
    var player = grp(-6, 0, 0);
    var rig = {};   // ссылки на подвижные части
    var mood = 'idle', moodUntil = 0;

    function buildPlayer(){
      var sp = chosenSpecies;
      var isFox = sp.key === 'fox';
      var bodyMat = matOwn(chosenColor, { roughness: 0.82 });
      var skinMat = mat(PAL.skin, { roughness: 0.8 });
      var darkMat = matOwn(new THREE.Color(chosenColor).multiplyScalar(0.62).getHex(), { roughness: 0.82 });
      var creamMat = mat(PAL.belly, { roughness: 0.92 });
      var faceMat = isFox ? bodyMat : skinMat;
      var inkMat = mat(PAL.eyeInk);
      var irisMat = isFox ? matOwn(0xA94F20, { roughness: 0.38 }) : matOwn(PAL.lavenderDeep);
      var whiteMat = mat(0xffffff);

      // тело + светлый животик
      rig.body = at(shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.5, 8, 16), bodyMat)), 0, 0.98, 0);
      player.add(rig.body);
      var belly = at(sph(0.35, creamMat, 0, 18), 0, 0.94, 0.32);
      belly.scale.set(1, 1.15, 0.6); player.add(belly);
      if (isFox){
        // Мягкая гребёнка грудки связывает светлый животик с мордочкой.
        [-0.13, 0, 0.13].forEach(function(x, i){
          var tuft = at(sph(i === 1 ? 0.13 : 0.115, creamMat, 0, 12), x, 1.25, 0.38);
          tuft.scale.set(0.88, 1.2, 0.58); player.add(tuft);
        });
      }

      // шарф бренда — тянется за героем на бегу
      rig.scarf = grp(0, 1.5, 0);
      var scarfMat = mat(PAL.teal, { roughness: 0.54 });
      rig.scarf.add(at(torus(0.3, 0.1, 20, scarfMat), 0, 0, 0));
      var tail0 = at(box(0.2, 0.5, 0.1, scarfMat), 0, -0.24, -0.26);
      rig.scarfTail = grp(0, -0.05, -0.2); rig.scarfTail.add(tail0);
      rig.scarf.add(rig.scarfTail);
      rig.scarf.children[0].rotation.x = Math.PI / 2;
      player.add(rig.scarf);

      // голова
      rig.head = grp(0, 1.92, 0); player.add(rig.head);
      if (isFox) rig.head.scale.setScalar(1.08);
      rig.head.add(shade(sph(isFox ? 0.49 : 0.46, faceMat, { roughness: 0.84 }, 24)));
      if (isFox){
        // Кремовые «очки» вокруг глаз и узкая переносица дают характерную лисью маску.
        [-0.17, 0.17].forEach(function(x){
          var patch = at(sph(0.17, creamMat, 0, 16), x, 0.055, 0.32);
          patch.scale.set(1.3, 1.27, 0.34); rig.head.add(patch);
        });
        var blaze = at(sph(0.105, creamMat, 0, 14), 0, -0.055, 0.4);
        blaze.scale.set(0.56, 1.45, 0.36); rig.head.add(blaze);
      }
      // мордочка — выступ, у мишки крупнее, у котёнка меньше
      var muzzle = at(sph(0.26 * sp.muzzle, creamMat, 0, 18), 0, -0.13, 0.33);
      muzzle.scale.set(1.15, 0.85, 0.8); rig.head.add(muzzle);
      if (isFox){
        [-1, 1].forEach(function(s){
          var cheek = at(sph(0.15, creamMat, 0, 14), s * 0.16, -0.15, 0.36);
          cheek.scale.set(1.08, 0.74, 0.7); rig.head.add(cheek);
        });
      }
      var nose = at(isFox ? cone(0.075, 0.09, 7, inkMat) : sph(0.075, inkMat, 0, 10), 0, -0.05, 0.56);
      if (isFox) nose.rotation.z = Math.PI;
      rig.head.add(nose);
      if (isFox){
        rig.head.add(at(sph(0.014, whiteMat, 0, 6), 0.022, -0.023, 0.621));
        [-1, 1].forEach(function(s){
          [-1, 1].forEach(function(row){
            rig.head.add(at(sph(0.012, mat(0x9A5A3D), 0, 6), s * (0.22 + (row > 0 ? 0.045 : 0)), -0.14 + row * 0.035, 0.475));
          });
        });
      }

      // щёки
      [-0.28, 0.28].forEach(function(x){ rig.head.add(at(sph(0.1, PAL.blush, 0, 10), x, -0.08, 0.32)); });

      // глаза: белок + радужка + два блика, всё в группе — моргаем масштабом
      rig.eyes = [];
      [-0.17, 0.17].forEach(function(x){
        var g = grp(x, 0.06, 0);
        g.add(at(sph(isFox ? 0.132 : 0.125, whiteMat, 0, 16), 0, 0, 0.36));
        g.add(at(sph(0.075, irisMat, 0, 12), 0, 0, 0.43));
        g.add(at(sph(0.045, inkMat, 0, 10), 0, 0, 0.47));
        g.add(at(sph(0.024, whiteMat, 0, 6), 0.035, 0.045, 0.5));
        g.add(at(sph(0.014, whiteMat, 0, 6), -0.03, -0.03, 0.5));
        rig.head.add(g); rig.eyes.push(g);
      });

      // брови — двигаются вместе с настроением
      rig.brows = [];
      [-0.18, 0.18].forEach(function(x){
        var b = at(box(0.17, 0.045, 0.05, darkMat), x, 0.26, 0.4);
        rig.head.add(b); rig.brows.push(b);
      });

      // рот: три формы, показываем ровно одну
      rig.mouths = {};
      rig.mouths.smile = at(torus(0.1, 0.028, 14, PAL.mouth, 0, Math.PI), 0, -0.2, 0.52);
      rig.mouths.smile.rotation.x = Math.PI;
      rig.mouths.open = at(sph(0.1, PAL.mouth, 0, 12), 0, -0.21, 0.5);
      rig.mouths.open.scale.set(1, 1.25, 0.5);
      rig.mouths.flat = at(box(0.16, 0.035, 0.04, PAL.mouth), 0, -0.2, 0.52);
      for (var mk in rig.mouths){ rig.mouths[mk].visible = false; rig.head.add(rig.mouths[mk]); }
      rig.mouths.smile.visible = true;

      // чубчик
      if (isFox){
        // Небольшие рыжие пряди сохраняют чистый силуэт ушей и не закрывают лоб.
        [-0.085, 0.035, 0.14].forEach(function(x, i){
          var tuft = at(cone(0.105, 0.19 + (i === 1 ? 0.035 : 0), 7, bodyMat), x, 0.38, 0.13);
          tuft.rotation.z = (i - 1) * 0.22; rig.head.add(tuft);
        });
      } else {
        var hair = at(new THREE.Mesh(new THREE.SphereGeometry(0.47, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), darkMat), 0, 0.04, 0);
        rig.head.add(hair);
      }

      // уши — форма зависит от вида, качаются в анимации
      rig.ears = [];
      [-1, 1].forEach(function(s){
        var pivot = grp(s * 0.3, 0.34, 0);
        var outer, inner;
        if (sp.ear === 'point'){
          outer = shade(cone(isFox ? 0.205 : 0.19, isFox ? 0.56 : 0.44, 10, bodyMat));
          inner = at(cone(isFox ? 0.115 : 0.1, isFox ? 0.32 : 0.26, 8, isFox ? creamMat : mat(PAL.blush)), 0, 0.02, 0.065);
        } else {
          outer = shade(sph(0.19, bodyMat, 0, 12));
          inner = at(sph(0.11, mat(PAL.blush), 0, 10), 0, 0.01, 0.09);
        }
        pivot.add(outer); pivot.add(inner);
        pivot.rotation.z = s * 0.2;
        rig.head.add(pivot); rig.ears.push(pivot);
      });

      // конечности: пивот в плече/бедре, вращаем его в шаге
      function limb(kind, side){
        var isArm = kind === 'arm';
        var pivot = grp(isArm ? 0.48 * side : 0.21 * side, isArm ? 1.16 : 0.53, 0);
        var seg = new THREE.Mesh(new THREE.CapsuleGeometry(isArm ? 0.125 : 0.155, isArm ? 0.38 : 0.3, 6, 10), bodyMat);
        pivot.add(at(shade(seg), 0, isArm ? -0.27 : -0.25, 0));
        if (isArm){
          pivot.add(at(sph(0.155, isFox ? creamMat : skinMat, 0, 12), 0, -0.54, 0));
        } else {
          var foot = at(sph(0.2, isFox ? creamMat : darkMat, 0, 12), 0, -0.49, 0.08);
          foot.scale.set(1, 0.6, 1.4); pivot.add(foot);
        }
        player.add(pivot); return pivot;
      }
      rig.armL = limb('arm', -1); rig.armR = limb('arm', 1);
      rig.legL = limb('leg', -1); rig.legR = limb('leg', 1);

      // хвост — у каждого вида свой
      rig.tail = grp(0, 0.82, -0.44);
      if (sp.tail === 'bushy'){
        [[0, 0.1, -0.15, isFox ? 0.22 : 0.17], [0, 0.3, -0.3, isFox ? 0.17 : 0.13], [0, 0.48, -0.42, isFox ? 0.13 : 0.1]].forEach(function(p){
          rig.tail.add(at(sph(p[3], bodyMat, 0, 10), p[0], p[1], p[2]));
        });
        rig.tail.add(at(sph(isFox ? 0.13 : 0.085, creamMat, 0, 12), 0, isFox ? 0.63 : 0.6, isFox ? -0.53 : -0.5));
      } else if (sp.tail === 'long'){
        for (var s2 = 0; s2 < 5; s2++)
          rig.tail.add(at(sph(0.1 - s2 * 0.012, bodyMat, 0, 8), 0, s2 * 0.16, -0.1 - s2 * 0.1));
      } else {
        rig.tail.add(at(sph(0.16, bodyMat, 0, 10), 0, 0.1, -0.1));
      }
      player.add(rig.tail);

      addHat(chosenHat, bodyMat);

      // контактная тень — мягкий круг под ногами, «приклеивает» героя к земле
      rig.blob = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20),
        basicOwn(0x2C3A32, { transparent: true, opacity: 0.22 }));
      rig.blob.rotation.x = -Math.PI / 2; player.add(at(rig.blob, 0, 0.02, 0));

      player.rotation.y = Math.PI / 2;
      scene.add(player);
    }

    /** Аксессуары вынесены отдельно — добавить новый можно одной веткой. */
    function addHat(key, bodyMat){
      var h = rig.head;
      if (key === 'cap'){
        h.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(PAL.coral)), 0, 0.28, 0));
        var brim = at(new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), mat(PAL.coral, { side: THREE.DoubleSide })), 0, 0.28, 0.44);
        brim.rotation.x = -Math.PI / 2; h.add(brim);
      } else if (key === 'crown'){
        var crown = grp(0, 0.42, 0), gold = mat(PAL.gold, { metalness: 0.6, roughness: 0.28, emissive: 0x4a3500, emissiveIntensity: 0.25 });
        crown.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.43, 0.2, 18, 1, true), gold));
        for (var i = 0; i < 6; i++){
          var a = i / 6 * Math.PI * 2, cx = Math.cos(a) * 0.4, cz = Math.sin(a) * 0.4;
          crown.add(at(cone(0.075, 0.24, 4, gold), cx, 0.2, cz));
          crown.add(at(sph(0.05, i % 2 ? 0xEF5DA8 : 0x5EC8E0, { emissiveIntensity: 0.45 }, 10), cx, 0.33, cz));
        }
        crown.add(at(sph(0.07, 0xEF4444, { emissive: 0x6e1414, emissiveIntensity: 0.5 }, 12), 0, 0, 0.43));
        h.add(crown);
      } else if (key === 'leaf'){
        var stalk = at(cyl(0.03, 0.03, 0.22, 5, PAL.leaf), 0, 0.52, 0);
        var blade = at(sph(0.2, PAL.leafLight, { flatShading: true }, 10), 0.1, 0.66, 0);
        blade.scale.set(1.5, 0.35, 0.8); blade.rotation.z = -0.4;
        h.add(stalk); h.add(blade);
      } else if (key === 'phones'){
        var band = at(torus(0.44, 0.055, 20, PAL.slate, 0, Math.PI), 0, 0.12, 0);
        band.rotation.y = Math.PI / 2; h.add(band);
        [-1, 1].forEach(function(s){
          var cup = at(cyl(0.15, 0.15, 0.12, 14, PAL.teal), s * 0.44, 0.06, 0);
          cup.rotation.z = Math.PI / 2; h.add(cup);
        });
      }
    }

    /**
     * Настроение героя. Аргумент hold — сколько секунд держать, потом само вернётся
     * в 'idle'. Зоны зовут это на победе и на подсказке тренера.
     */
    function setMood(m, hold){
      mood = m; moodUntil = t + (hold || 1.6);
      for (var k in rig.mouths) rig.mouths[k].visible = false;
      var browY = 0.26, browTilt = 0, shape = 'smile';
      if (m === 'happy'){ browY = 0.3; shape = 'open'; }
      else if (m === 'oops'){ browY = 0.3; browTilt = 0.32; shape = 'flat'; }
      else if (m === 'listen'){ browY = 0.28; browTilt = -0.12; shape = 'open'; }
      rig.mouths[shape].visible = true;
      for (var i = 0; i < rig.brows.length; i++){
        rig.brows[i].position.y = browY;
        rig.brows[i].rotation.z = (i === 0 ? 1 : -1) * browTilt;
      }
    }

    // ---------- анимация героя ----------
    var walkPhase = 0;
    function animPlayer(moving, dt){
      if (!rig.legL) return;
      if (mood !== 'idle' && t > moodUntil) setMood('idle', 999);

      walkPhase += dt * (moving ? 9 : 0);
      var sw = Math.sin(walkPhase), amp = 0.7;
      rig.legL.rotation.x = ease(rig.legL.rotation.x, moving ? sw * amp : 0, 18, dt);
      rig.legR.rotation.x = ease(rig.legR.rotation.x, moving ? -sw * amp : 0, 18, dt);
      rig.armL.rotation.x = ease(rig.armL.rotation.x, moving ? -sw * amp * 0.9 : 0, 18, dt);
      rig.armR.rotation.x = ease(rig.armR.rotation.x, moving ? sw * amp * 0.9 : 0, 18, dt);

      // дыхание в покое, подпрыгивание в шаге
      var breathe = moving ? 0 : Math.sin(t * 1.8) * 0.025;
      rig.body.position.y = 0.98 + (moving ? Math.abs(Math.sin(walkPhase)) * 0.04 : breathe);
      rig.body.scale.set(1 + breathe * 0.5, 1 - breathe * 0.4, 1 + breathe * 0.5);
      rig.head.position.y = 1.92 + (moving ? Math.abs(Math.sin(walkPhase)) * 0.04 : breathe * 1.2);
      rig.head.rotation.z = moving ? Math.sin(walkPhase * 0.5) * 0.04 : 0;

      // уши качаются с задержкой от головы — оживляет силуэт
      for (var e = 0; e < rig.ears.length; e++){
        var s = e === 0 ? -1 : 1;
        rig.ears[e].rotation.x = Math.sin(t * (moving ? 8 : 2.4) + e) * (moving ? 0.22 : 0.08);
        rig.ears[e].rotation.z = s * (0.2 + (mood === 'oops' ? 0.35 : 0));
      }
      // шарф отлетает назад тем сильнее, чем быстрее идём
      rig.scarfTail.rotation.x = ease(rig.scarfTail.rotation.x, moving ? -0.9 : -0.15, 6, dt)
        + Math.sin(t * 6) * 0.08;
      rig.tail.rotation.y = Math.sin(t * (moving ? 9 : 3)) * (moving ? 0.5 : 0.3);
      if (mood === 'happy') rig.tail.rotation.y = Math.sin(t * 16) * 0.7;

      // моргание — раз в ~3.4 с
      var bp = t % 3.4;
      var closed = bp < 0.13 ? (1 - Math.abs(bp - 0.065) / 0.065) : 0;
      for (var i = 0; i < rig.eyes.length; i++) rig.eyes[i].scale.y = 1 - closed * 0.88;

      // тень бледнеет, когда герой в воздухе
      rig.blob.material.opacity = 0.22 * Math.max(0, 1 - player.position.y / 6);
      rig.blob.position.y = 0.02 - (landedHigh ? 0 : player.position.y);
    }

    // ---------- спутник «Үнчик» ----------
    var companion = null, comp = {}, compTalk = 0;
    function buildCompanion(){
      companion = grp(-7.6, 1.9, 0.9);
      comp.inner = grp(); companion.add(comp.inner);

      var furMat = matOwn(0x6387E3, { roughness: 0.84, flatShading: true, emissive: 0x3F61B9, emissiveIntensity: 0.14, side: THREE.DoubleSide });
      var furLight = matOwn(0x9CB7F1, { roughness: 0.84, flatShading: true });
      var furWhite = matOwn(0xDCE9FF, { roughness: 0.84, flatShading: true });
      var earInner = matOwn(0xFFC160, { roughness: 0.8, emissive: 0xFFAE48, emissiveIntensity: 0.5, side: THREE.DoubleSide });
      var eyeGold = matOwn(0xE7A623, { roughness: 0.22, emissive: 0xBA690A, emissiveIntensity: 0.24 });
      var gemMat = matOwn(0xFFD163, { roughness: 0.16, emissive: 0xFFB51C, emissiveIntensity: 1.25 });
      var ink = mat(0x151B37, { roughness: 0.2 });

      function facetedFur(radius, color){
        var geo = new THREE.SphereGeometry(radius, 16, 12).toNonIndexed();
        var positions = geo.getAttribute('position');
        var colors = [];
        var base = new THREE.Color(color);
        for (var i = 0; i < positions.count; i += 3){
          var tone = 0.9 + ((Math.floor(i / 3) * 13) % 7) * 0.022 + positions.getY(i) / radius * 0.035;
          var faceColor = base.clone().multiplyScalar(tone);
          for (var v = 0; v < 3; v++) colors.push(faceColor.r, faceColor.g, faceColor.b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        return new THREE.Mesh(geo, matOwn(0xFFFFFF, { vertexColors: true, roughness: 0.86,
          flatShading: true, emissive: color, emissiveIntensity: 0.1 }));
      }

      // Большая голова, маленькое округлое тело и чёткие грани как у игрушки из референса.
      comp.body = at(shade(facetedFur(0.42, 0x7598E6)), 0, -0.29, 0);
      comp.body.scale.set(1.02, 1.14, 0.88); comp.inner.add(comp.body);
      comp.head = at(shade(facetedFur(0.55, 0x7295E5)), 0, 0.34, 0.035);
      comp.head.scale.set(1.12, 0.96, 0.91); comp.inner.add(comp.head);

      // Уши имеют плоский гранёный профиль и тёплую светящуюся середину.
      comp.ears = [];
      [-1, 1].forEach(function(side){
        var ear = grp(side * 0.37, 0.65, -0.14);
        var outerShape = new THREE.Shape();
        outerShape.moveTo(-0.19, 0); outerShape.lineTo(-0.18, 0.31);
        outerShape.lineTo(-0.07, 0.68); outerShape.lineTo(0, 1.01);
        outerShape.lineTo(0.11, 0.66); outerShape.lineTo(0.2, 0.27);
        outerShape.lineTo(0.18, 0); outerShape.closePath();
        ear.add(shade(new THREE.Mesh(new THREE.ExtrudeGeometry(outerShape, { depth: 0.11, bevelEnabled: false }), furMat)));
        var innerShape = new THREE.Shape();
        innerShape.moveTo(-0.12, 0.12); innerShape.lineTo(-0.1, 0.34);
        innerShape.lineTo(0, 0.84); innerShape.lineTo(0.1, 0.34);
        innerShape.lineTo(0.12, 0.12); innerShape.closePath();
        ear.add(at(new THREE.Mesh(new THREE.ShapeGeometry(innerShape), earInner), 0, 0, 0.115));
        ear.rotation.z = -side * 0.12;
        comp.inner.add(ear); comp.ears.push(ear);
      });

      [-0.18, -0.04, 0.11, 0.24].forEach(function(x, i){
        var tuft = at(cone(0.075, 0.2 + (i === 1 ? 0.055 : 0), 5, furLight), x, 0.88, 0.02);
        tuft.rotation.z = (i - 1.5) * 0.25; comp.inner.add(tuft);
      });
      [-1, 1].forEach(function(side){
        var cheek = at(shade(facetedFur(0.16, 0xA8C0F1)), side * 0.43, 0.09, 0.4);
        cheek.scale.set(1.06, 0.66, 0.65); comp.inner.add(cheek);
      });

      // Светится только янтарный камень на белой нагрудной манишке.
      var bib = at(shade(sph(0.26, furWhite, 0, 14)), 0, -0.25, 0.33);
      bib.scale.set(0.96, 1.12, 0.32); comp.inner.add(bib);
      [-1, 0, 1].forEach(function(n){
        var feather = at(cone(0.085, n === 0 ? 0.19 : 0.15, 5, furWhite), n * 0.15, -0.53, 0.39);
        feather.rotation.z = Math.PI + n * 0.3; comp.inner.add(feather);
      });
      comp.gem = at(sph(0.14, gemMat, 0, 8), 0, -0.19, 0.47);
      comp.gem.scale.set(1, 1.06, 0.55); comp.inner.add(comp.gem);
      comp.glow = at(glowSprite(0xFFE08C, 0.74, 0.25), 0, -0.19, 0.55);
      comp.inner.add(comp.glow);
      comp.light = new THREE.PointLight(0xFFBD54, 0.35, 1.5); comp.light.position.set(0, -0.19, 0.5); companion.add(comp.light);

      comp.eyes = [];
      [-0.23, 0.23].forEach(function(x){
        var eye = grp(x, 0.37, 0.49);
        var white = sph(0.151, mat(0xF7FAFF), 0, 16); white.scale.set(1, 1.1, 0.48); eye.add(white);
        var iris = at(sph(0.108, eyeGold, 0, 16), 0, -0.013, 0.068); iris.scale.z = 0.27; eye.add(iris);
        var pupil = at(sph(0.067, ink, 0, 14), 0, -0.007, 0.093); pupil.scale.z = 0.24; eye.add(pupil);
        eye.add(at(sph(0.025, basic(0xFFFFFF), 0, 8), 0.025, 0.036, 0.112));
        eye.add(at(sph(0.01, basic(0xFFFFFF), 0, 6), -0.035, -0.055, 0.105));
        comp.inner.add(eye); comp.eyes.push(eye);
      });
      comp.inner.add(at(sph(0.046, matOwn(0x5366B8, { roughness: 0.46 }), 0, 8), 0, 0.155, 0.57));
      comp.mouth = at(sph(0.065, ink, 0, 12), 0, 0.055, 0.552);
      comp.mouth.scale.set(0.92, 0.65, 0.18); comp.inner.add(comp.mouth);
      var tongue = at(sph(0.035, mat(0xF596B4), 0, 8), 0, 0.025, 0.57);
      tongue.scale.set(1, 0.42, 0.2); comp.inner.add(tongue);

      [-1, 1].forEach(function(side){
        var arm = grp(side * 0.36, -0.37, 0.04);
        var paw = at(shade(facetedFur(0.15, 0x8FABED)), side * 0.11, -0.05, 0.16);
        paw.scale.set(1.25, 0.72, 0.8); arm.add(paw);
        comp.inner.add(arm); comp[side > 0 ? 'armR' : 'armL'] = arm;
        var foot = at(shade(facetedFur(0.12, 0x8FABED)), side * 0.2, -0.77, 0.16);
        foot.scale.set(1.2, 0.5, 0.9); comp.inner.add(foot);
      });

      // искры следа
      comp.sparks = [];
      for (var s = 0; s < 6; s++){
        var sp = sph(0.045, basicOwn(PAL.goldSoft, { transparent: true, opacity: 0.72, fog: false }), 0, 6);
        sp.userData = { ph: s / 6 * 6.28 }; companion.add(sp); comp.sparks.push(sp);
      }
      companion.scale.setScalar(0.78);
      scene.add(companion);
    }

    function updateCompanion(dt){
      if (!companion) return;
      if (compTalk > 0) compTalk -= dt;
      var talking = compTalk > 0;
      var fx = Math.sin(player.rotation.y), fz = Math.cos(player.rotation.y);
      // во время речи подлетает ближе и выше — его видно «крупным планом»
      var near = talking ? 0.7 : 1.1, side = talking ? 1.65 : 1.35;
      var tx = player.position.x - fx * near + fz * side;
      var tz = player.position.z - fz * near - fx * side;
      var ty = player.position.y + (talking ? 2.0 : 1.75) + Math.sin(t * 2.1) * 0.12
        + (talking ? Math.abs(Math.sin(t * 4)) * 0.055 : 0);
      var rate = talking ? 9 : 5;
      companion.position.x = ease(companion.position.x, tx, rate, dt);
      companion.position.y = ease(companion.position.y, ty, rate * 1.4, dt);
      companion.position.z = ease(companion.position.z, tz, rate, dt);
      companion.lookAt(camera.position.x, companion.position.y, camera.position.z);

      var target = talking ? 1.06 + Math.sin(t * 5) * 0.018 : 1.0;
      comp.inner.scale.setScalar(ease(comp.inner.scale.x, target, 7, dt));
      var wave = Math.sin(t * (talking ? 5 : 2.5));
      comp.armL.rotation.z = -0.25 + wave * (talking ? 0.28 : 0.09);
      comp.armR.rotation.z = 0.25 - wave * (talking ? 0.28 : 0.09);
      comp.ears[0].rotation.x = -0.08 + Math.sin(t * 3.2) * 0.07;
      comp.ears[1].rotation.x = -0.08 + Math.sin(t * 3.2 + 0.6) * 0.07;
      var blinkPhase = t % 5.3, blink = blinkPhase > 5.08 ? Math.max(0.12, Math.abs(blinkPhase - 5.19) / 0.11) : 1;
      comp.eyes.forEach(function(eye){ eye.scale.y = blink; });
      comp.mouth.scale.y = talking ? 0.65 + Math.abs(Math.sin(t * 12)) * 0.32 : 0.65;
      comp.gem.scale.set(1 + Math.sin(t * 4.4) * 0.04, 1.06 + Math.sin(t * 4.4) * 0.05, 0.55);
      comp.glow.material.opacity = 0.1 + Math.abs(Math.sin(t * 3.6)) * 0.11 + (talking ? 0.08 : 0);
      comp.light.intensity = talking ? 0.55 + Math.abs(Math.sin(t * 12)) * 0.2 : 0.35 + Math.sin(t * 3.4) * 0.06;
      for (var i = 0; i < comp.sparks.length; i++){
        var a = t * 1.6 + comp.sparks[i].userData.ph;
        comp.sparks[i].position.set(Math.cos(a) * 0.85, Math.sin(a * 1.7) * 0.4, Math.sin(a) * 0.85);
        comp.sparks[i].material.opacity = 0.25 + Math.abs(Math.sin(a * 2)) * 0.5;
      }
    }
`;
}
