/**
 * Управление: веб-камера, клавиатура, экранный джойстик.
 *
 * Камера (см. `vision`) отслеживает указательный палец как экранный джойстик.
 * Разбор корпуса сохранён для отдельного режима и регрессий; модель Pose
 * при старте не загружается. Клавиши и джойстик работают параллельно:
 * проект должны открыть и на машине без камеры, и разрешение на неё могут не
 * дать. Если пришёл хоть какой-то ввод руками — он главнее камеры в этом
 * кадре, иначе случайное шевеление в кадре перебивало бы осознанное нажатие.
 *
 * У стика мёртвая зона и smoothstep: у центра ребёнок получает точный
 * контроль, а не рывок с места.
 */
export function input(): string {
  return `
    var keys = {};
    var keyCodes = {};
    window.addEventListener('keydown', function(e){
      if (gamePaused || awaitingController) return;
      if (e.target && e.target.closest){
        if (e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
        if (e.target.closest('button') && [' ', 'enter'].indexOf(e.key.toLowerCase()) >= 0) return;
      }
      keys[e.key.toLowerCase()] = true;
      keyCodes[e.code] = true;
      if (['arrowup','arrowdown','arrowleft','arrowright',' '].indexOf(e.key.toLowerCase()) >= 0 ||
          ['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','Space'].indexOf(e.code) >= 0) e.preventDefault();
    });
    window.addEventListener('keyup', function(e){
      keys[e.key.toLowerCase()] = false;
      keyCodes[e.code] = false;
    });
    // на вебе iframe нужно «сфокусировать», иначе клавиши не доходят до игры
    window.addEventListener('pointerdown', function(){ try { window.focus(); } catch (e) {} });

    var joy = document.getElementById('joy'), knobEl = document.getElementById('knob');
    var joyVec = { x: 0, y: 0 }, joyId = null;
    var moveVec = { x: 0, z: 0 }; // сглаженная скорость хода
    function clearInput(){
      keys = {}; keyCodes = {}; joyId = null; dragId = null;
      joyVec.x = joyVec.y = moveVec.x = moveVec.z = 0;
      centerJoystick();
    }
    function centerJoystick(){ knobEl.style.left = knobEl.style.top = '50%'; }
    if ('ontouchstart' in window) document.getElementById('rothint').style.display = 'block';

    function joyStart(e){
      if (gamePaused || awaitingController) return;
      joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e);
    }
    function joyMove(e){
      if (joyId !== e.pointerId) return;
      var r = joy.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      var knob = knobEl.getBoundingClientRect();
      var width = joy.clientWidth || r.width, height = joy.clientHeight || r.height;
      var max = Math.max(1, (Math.min(width, height) - Math.min(knob.width, knob.height)) / 2);
      var d = Math.hypot(dx, dy);
      if (d > max){ dx = dx / d * max; dy = dy / d * max; d = max; }
      knobEl.style.left = (width / 2 + dx) + 'px'; knobEl.style.top = (height / 2 + dy) + 'px';
      var dead = Math.min(7, max * 0.25);
      if (d <= dead){ joyVec.x = joyVec.y = 0; return; }
      var mag = (d - dead) / (max - dead); mag = mag * mag * (3 - 2 * mag);
      joyVec.x = (dx / d) * mag; joyVec.y = (dy / d) * mag;
    }
    function joyEnd(e){
      if (joyId !== e.pointerId) return;
      joyId = null; joyVec.x = joyVec.y = 0;
      centerJoystick();
    }
    joy.addEventListener('pointerdown', joyStart);
    joy.addEventListener('pointermove', joyMove);
    joy.addEventListener('pointerup', joyEnd);
    joy.addEventListener('pointercancel', joyEnd);
    joy.addEventListener('lostpointercapture', joyEnd);

    var camYaw = -Math.PI / 2, dragId = null, dragX = 0;
    canvas.addEventListener('pointerdown', function(e){
      if (gamePaused || awaitingController) return;
      dragId = e.pointerId; dragX = e.clientX;
    });
    canvas.addEventListener('pointermove', function(e){
      if (dragId !== e.pointerId) return;
      camYaw -= (e.clientX - dragX) * 0.006; dragX = e.clientX;
    });
    function dragStop(e){ if (dragId === e.pointerId) dragId = null; }
    canvas.addEventListener('pointerup', dragStop);
    canvas.addEventListener('pointercancel', dragStop);

    /** Был ли в этом кадре ввод руками — он перебивает камеру. */
    var handInput = false;
    var cameraInputActive = false;
    /**
     * Вектор хода относительно обзора: камера, клавиши и джойстик вместе.
     * F — вперёд/назад, R — вбок; оба нормализуются, чтобы по диагонали
     * герой не разгонялся быстрее.
     */
    function readMove(dt){
      if (keys['q'] || keyCodes.KeyQ) camYaw += 1.6 * dt;
      if (keys['e'] || keyCodes.KeyE) camYaw -= 1.6 * dt;
      var F = 0, R = 0;
      if (keys['w'] || keyCodes.KeyW || keys['arrowup']) F += 1;
      if (keys['s'] || keyCodes.KeyS || keys['arrowdown']) F -= 1;
      if (keys['d'] || keyCodes.KeyD || keys['arrowright']) R += 1;
      if (keys['a'] || keyCodes.KeyA || keys['arrowleft']) R -= 1;
      F += -joyVec.y; R += joyVec.x;
      handInput = Math.abs(F) > 0.01 || Math.abs(R) > 0.01;
      cameraInputActive = false;

      if (!handInput){
        var fm = fingerMove();
        if (fm){
          F += fm.forward;
          R += fm.right;
          handInput = true;
          cameraInputActive = Math.abs(fm.forward) > 0.01 || Math.abs(fm.right) > 0.01;
          // The neutral region stops immediately, including residual keyboard
          // smoothing. A visible stationary finger is not camera movement.
          if (!cameraInputActive) moveVec.x = moveVec.z = 0;
        } else {
          var pm = poseMove();
          if (pm){
            F += -pm.y;                     // марш на месте → ход вперёд
            R += pm.x * 0.35;               // наклон подталкивает вбок…
            camYaw -= pm.x * 1.5 * dt;      // …и доворачивает обзор: это руль
          }
        }
      }
      var fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
      var rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      var tx = fx * F + rx * R, tz = fz * F + rz * R;
      var len = Math.hypot(tx, tz); if (len > 1){ tx /= len; tz /= len; }
      moveVec.x = ease(moveVec.x, tx, 12, dt);
      moveVec.z = ease(moveVec.z, tz, 12, dt);
      return moveVec;
    }
`;
}
