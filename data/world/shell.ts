import { cssVars } from './palette';

/**
 * Оболочка мира: `<head>`, стили HUD и разметка экранов.
 *
 * Здесь живёт ТОЛЬКО оформление — ни одной игровой переменной. Весь HUD
 * построен на «стеклянных» карточках поверх канваса: сверху цель, снизу
 * микрофон, слева джойстик. Отдельный слой — тренер (`#coach`): именно он
 * показывает, ЧТО сделано не так, поэтому у него собственный акцент (коралл)
 * и он никогда не спорит за место с репликами спутника.
 *
 * Шрифты — системные: мир работает офлайн (движок встроен в страницу), внешние
 * веб-шрифты грузиться не будут, поэтому стек подобран так, чтобы округлая
 * Nunito использовалась, когда она есть в системе, а иначе — ближайшая по духу.
 */
export function shell(): string {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<title>Остров Эха</title>
<style>
  :root {
${cssVars()}
    --font: 'Nunito', 'Segoe UI Variable Display', 'Segoe UI', system-ui, -apple-system, 'Roboto', sans-serif;
    --safe-t: env(safe-area-inset-top, 0px);
    --safe-b: env(safe-area-inset-bottom, 0px);
    color-scheme: light;
  }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; user-select:none; }
  html, body { height:100%; overflow:hidden; background:var(--sky-low); color:var(--ink);
    font-family:var(--font); font-variant-numeric:tabular-nums; }
  #c { display:block; width:100%; height:100%; touch-action:none; }
  button { font:inherit; cursor:pointer; border:0; }
  button:focus-visible { outline:3px solid #F5C56B; outline-offset:4px; }

  /* ---------- базовая «стеклянная» карточка HUD ---------- */
  .glass { position:fixed; z-index:10; background:var(--glass); color:var(--ink);
    border-radius:18px; box-shadow:var(--shadow); backdrop-filter:blur(8px); }

  /* ---------- цель: что делать прямо сейчас ---------- */
  #obj { top:calc(var(--safe-t) + 54px); left:12px; right:12px; padding:9px 16px; text-align:center; }
  #objTitle { font-weight:800; font-size:16px; line-height:1.25; }
  #objHint { display:block; font-weight:700; color:var(--ink-soft); font-size:12.5px; margin-top:2px; line-height:1.3; }

  /* ---------- счётчик: звёзды + этапы ---------- */
  #score { top:calc(var(--safe-t) + 10px); left:12px; display:flex; align-items:center; gap:10px;
    padding:7px 13px; font-weight:800; font-size:13.5px; }
  #score .sep { width:1px; height:14px; background:var(--border); }
  #score .gold { color:#8A6200; }

  /* трекер этапов — по точке на зону, заполненные подсвечены бирюзой */
  #track { top:calc(var(--safe-t) + 12px); right:136px; display:flex; gap:5px; padding:9px 11px; }
  #track i { width:8px; height:8px; border-radius:50%; background:var(--border); transition:background .3s, transform .3s; }
  #track i.on { background:var(--teal); transform:scale(1.25); }

  /* ---------- микрофон + шкала задачи ---------- */
  #mic { bottom:calc(var(--safe-b) + 16px); left:50%; transform:translateX(-50%);
    width:min(272px, calc(100vw - 32px)); padding:9px 14px 11px; }
  #miclbl { font-size:12.5px; color:var(--ink-soft); font-weight:800; text-align:center; line-height:1.3; }
  #micToggle, #camToggle { border-radius:12px; background:#315F8D; color:#fff; padding:9px 12px; min-height:40px; font-size:12px; font-weight:800; }
  #micToggle { width:100%; margin-top:8px; }
  #micStatus { display:block; margin-top:5px; text-align:center; font-size:11px; color:var(--ink-soft); }
  .bar { height:10px; border-radius:8px; background:var(--border); overflow:hidden; margin-top:6px; }
  .bar > div { height:100%; width:0%; border-radius:8px; transition:width .06s linear; }
  #rmsfill { background:linear-gradient(90deg, var(--teal), var(--gold)); }
  #taskwrap { margin-top:5px; display:none; }
  #taskfill { background:linear-gradient(90deg, var(--lavender), var(--teal)); }
  #mic.hot #taskfill { background:linear-gradient(90deg, var(--teal), var(--gold)); }

  /* ---------- режим «ошибка»: конкретная подсказка, как исправить ---------- */
  #coach { position:fixed; z-index:14; left:50%; bottom:calc(var(--safe-b) + 92px); transform:translateX(-50%) translateY(8px);
    display:flex; align-items:flex-start; gap:9px; width:min(330px, calc(100vw - 28px));
    background:var(--glass); border-left:5px solid var(--coral); border-radius:16px;
    padding:10px 14px 10px 11px; box-shadow:var(--shadow); opacity:0; pointer-events:none;
    transition:opacity .22s ease, transform .22s ease; }
  #coach.show { opacity:1; transform:translateX(-50%) translateY(0); }
  #coachIcon { font-size:20px; line-height:1.15; flex:0 0 auto; }
  #coachTitle { font-size:11px; font-weight:900; letter-spacing:.06em; text-transform:uppercase; color:var(--coral-deep); }
  #coachText { font-size:13.5px; font-weight:700; line-height:1.35; margin-top:1px; }

  /* ---------- управление ---------- */
  #joy { position:fixed; left:22px; bottom:calc(var(--safe-b) + 92px); width:128px; height:128px; z-index:10;
    border-radius:50%; background:rgba(255,255,255,.3); border:2px solid rgba(255,255,255,.62); touch-action:none; }
  #knob { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:60px; height:60px; border-radius:50%;
    background:rgba(255,255,255,.96); box-shadow:0 4px 12px rgba(41,48,61,.28); }
  #rothint { position:fixed; right:16px; bottom:calc(var(--safe-b) + 22px); z-index:10; display:none;
    font-size:11.5px; font-weight:800; color:#fff; background:var(--glass-dim); padding:8px 12px; border-radius:14px; }

  #camPreview { display:none; position:relative; width:100%; aspect-ratio:4/3; overflow:hidden; border-radius:12px; background:#19334F; }
  #camv { display:block; width:100%; height:100%; object-fit:cover; transform:scaleX(-1); }
  #camCenter { position:absolute; left:42%; top:42%; width:16%; height:16%; border:1px dashed #fff; border-radius:8px; background:#ffffff20; pointer-events:none; }
  #camPointer { display:none; position:absolute; width:16px; height:16px; transform:translate(-50%,-50%); border-radius:50%; background:#FFD678; border:3px solid #fff; box-shadow:0 0 15px #F5B400; pointer-events:none; }

  /* индикатор камеры: видит ли система тело и какой жест читает прямо сейчас */
  #cam { top:calc(var(--safe-t) + 136px); right:12px; width:230px;
    max-height:calc(100dvh - var(--safe-t) - var(--safe-b) - 148px); overflow-y:auto;
    display:flex; flex-direction:column; align-items:stretch; gap:8px; padding:10px; font-size:12px; font-weight:700; }
  #camStateLine { display:flex; align-items:center; gap:7px; line-height:1.4; order:0; flex-shrink:0; }
  #camActions { display:flex; gap:6px; order:1; flex-shrink:0; }
  #camPreview { order:2; flex-shrink:0; }
  #camGuide { order:3; }
  #camMove { order:4; }
  #camToggle { flex:1; }
  #camGuide { font-size:10.5px; line-height:1.4; color:var(--ink-soft); }
  #camDot { width:9px; height:9px; border-radius:50%; background:var(--border); flex:0 0 auto;
    transition:background .25s; }
  #cam.on #camDot { background:var(--teal); }
  #cam.warn #camDot { background:var(--coral); }
  /* стрелка наклона и шаги — движение читается без взгляда на своё видео */
  #camMove { display:flex; gap:3px; }
  #camMove i { width:6px; height:6px; border-radius:50%; background:var(--border); transition:background .15s; }
  #camMove i.lit { background:var(--lavender); }
  #camRetry { display:none; white-space:nowrap; border-radius:999px; padding:5px 9px;
    background:var(--coral); color:#fff; font-size:11px; font-weight:900; pointer-events:auto; }
  @media (max-width:620px) {
    #cam { width:164px; right:8px; padding:8px; font-size:10px; gap:5px; }
    #camToggle, #camRetry { font-size:10px; padding:7px; }
    #camGuide { font-size:9px; }
    #joy { width:104px; height:104px; left:12px; }
    #knob { width:48px; height:48px; }
  }

  /* ---------- реплики спутника ---------- */
  #npc { position:fixed; z-index:15; left:50%; bottom:calc(var(--safe-b) + 92px); transform:translateX(-50%);
    display:none; align-items:center; gap:10px; max-width:86%;
    background:var(--glass); border-radius:18px; border-left:5px solid var(--lavender);
    padding:10px 16px 10px 11px; box-shadow:var(--shadow); opacity:0; transition:opacity .3s; }
  #npcAva { width:52px; height:52px; border-radius:50%; background:#EEE7FA url('/world-intro/unchik-portrait.png') center / cover no-repeat; display:flex;
    align-items:center; justify-content:center; font-size:0; flex:0 0 auto; animation:bob .58s ease-in-out infinite; }
  @keyframes bob { 0%,100% { transform:translateY(0) rotate(-6deg); } 50% { transform:translateY(-5px) rotate(6deg); } }
  #npcName { font-size:11px; font-weight:900; letter-spacing:.06em; text-transform:uppercase; color:var(--lavender-deep); }
  #npcText { font-size:14px; font-weight:700; line-height:1.32; margin-top:1px; }

  /* ---------- баннер награды ---------- */
  #banner { position:fixed; z-index:20; top:38%; left:50%; transform:translate(-50%,-50%) scale(.9);
    padding:13px 24px; border-radius:18px; font-size:19px; font-weight:900; text-align:center;
    color:#fff; background:var(--lavender); box-shadow:0 14px 38px rgba(163,133,224,.55);
    opacity:0; pointer-events:none; transition:opacity .2s, transform .2s; }
  #banner.show { opacity:1; transform:translate(-50%,-50%) scale(1); }

  /* ---------- полноэкранные слои ---------- */
  .layer { position:fixed; inset:0; z-index:30; display:flex; flex-direction:column;
    align-items:center; justify-content:center; padding:24px 20px; overflow:auto; text-align:center; }
  #start { gap:15px; color:#fff; background:linear-gradient(90deg, #10263DDD, #182D50A8), url('/world-intro/echo-gateway.png') center/cover; }
  #startPortrait { width:100px; height:100px; object-fit:contain; }
  #startControls { display:flex; flex-direction:column; gap:10px; width:min(340px, 100%); }
  #startControls .cta { margin:0; width:100%; }
  #goKeyboard { color:#fff; background:#ffffff18; border:1px solid #ffffff70; border-radius:999px; padding:13px 24px; font-weight:800; }
  #startPrivacy { max-width:40ch; font-size:12px; opacity:.85; line-height:1.5; }
  #start h1 { font-size:clamp(26px, 8vw, 34px); font-weight:900; letter-spacing:-.01em; text-wrap:balance; }
  #start .lead { font-size:14.5px; font-weight:700; opacity:.95; max-width:42ch; line-height:1.45; }
  .cap { font-size:11px; font-weight:900; letter-spacing:.1em; text-transform:uppercase; opacity:.85; margin-top:6px; }
  .row { display:flex; gap:9px; flex-wrap:wrap; justify-content:center; }
  .swatch { width:40px; height:40px; border-radius:50%; border:3px solid rgba(255,255,255,.45); cursor:pointer;
    transition:transform .15s, border-color .15s, box-shadow .15s; }
  .chip { border-radius:14px; padding:9px 15px; background:rgba(255,255,255,.16); color:#fff;
    font-weight:800; font-size:13.5px; border:2px solid transparent; cursor:pointer; transition:background .15s, border-color .15s; }
  .swatch.sel { border-color:#fff; transform:scale(1.14); box-shadow:0 0 0 3px rgba(255,255,255,.3); }
  .chip.sel { border-color:#fff; background:rgba(255,255,255,.34); }
  .cta { margin-top:10px; border-radius:999px; padding:15px 36px; font-size:17px; font-weight:900;
    color:var(--teal); background:#fff; box-shadow:0 12px 32px rgba(0,0,0,.26); }
  .cta:active { transform:translateY(1px); }

  /* Вступление: иллюстрации острова и Үнчика из проекта. */
  #intro {
    display:none;
    color:#26334D;
    overflow:hidden;
    isolation:isolate;
    background:
      linear-gradient(90deg, rgba(9,28,67,.16), transparent 28%, transparent 74%, rgba(31,22,87,.1)),
      url('/world-intro/echo-gateway.png') center center / cover no-repeat,
      #152B59;
  }
  #intro::before {
    content:""; position:absolute; inset:0; z-index:0; pointer-events:none;
    background:linear-gradient(to top, rgba(11,22,61,.2), transparent 32%);
  }
  #introLayout {
    position:relative; z-index:1; width:min(1000px, 100%);
    display:flex; align-items:center; justify-content:center;
  }
  #introSpirit {
    display:block; width:clamp(210px, 32vw, 390px); height:auto;
    flex:none; margin-right:-46px; z-index:3;
    filter:drop-shadow(0 18px 26px rgba(34,67,157,.3));
    animation:introFloat 4s ease-in-out infinite;
  }
  @keyframes introFloat {
    0%,100% { transform:translateY(0); }
    50% { transform:translateY(-9px); }
  }
  #introCard {
    position:relative; z-index:2; flex:none;
    width:min(500px, calc(100vw - 270px));
    min-height:310px; padding:82px 30px 27px;
    border:1px solid rgba(255,255,255,.9);
    border-radius:32px; background:rgba(255,255,255,.97);
    box-shadow:0 26px 80px rgba(10,24,71,.32), 0 2px 10px rgba(24,41,96,.12);
    animation:introReveal .35s ease-out both;
  }
  @keyframes introReveal {
    from { opacity:0; transform:translateY(12px); }
    to { opacity:1; transform:translateY(0); }
  }
  #introAva {
    position:absolute; top:-66px; left:50%; transform:translateX(-50%);
    width:132px; height:132px; object-fit:contain;
    filter:drop-shadow(0 9px 15px rgba(94,112,215,.3));
  }
  #introName { color:#7663DE; font-weight:900; font-size:21px; line-height:1.25; }
  #introText {
    max-width:36ch; min-height:56px; margin:12px auto 18px;
    color:#26334D; font-weight:700; font-size:18px; line-height:1.45;
    text-wrap:balance;
  }
  #introWave {
    position:relative; width:148px; height:28px; margin:0 auto 18px;
    background:linear-gradient(90deg,
      transparent 0 15%, #A59BFA 15% 17%, transparent 17% 24%,
      #8478F6 24% 26%, transparent 26% 32%, #6F63E9 32% 36%,
      transparent 36% 43%, #9789FF 43% 46%, transparent 46% 48%,
      #6859E3 48% 52%, transparent 52% 56%, #9789FF 56% 59%,
      transparent 59% 66%, #8478F6 66% 68%, transparent 68% 75%,
      #A59BFA 75% 77%, transparent 77%);
  }
  #introWave::before {
    content:""; position:absolute; left:0; right:0; top:13px; height:2px;
    background:linear-gradient(90deg, transparent, #A69BFA, transparent);
  }
  #introNext {
    min-width:176px; padding:14px 34px; border-radius:999px;
    color:#fff; font-size:17px; font-weight:900;
    background:linear-gradient(110deg, #AD7BF4, #458BF4);
    box-shadow:0 12px 25px rgba(100,95,220,.28);
  }
  #introNext:hover { filter:brightness(1.05); }
  #introNext:active { transform:translateY(1px); }
  #introNext:focus-visible, #introSkip:focus-visible {
    outline:3px solid #4E9EFA; outline-offset:3px;
  }
  #introSkip {
    display:block; margin:13px auto 0; padding:4px 10px;
    background:transparent; color:#78839A; font-size:14px; font-weight:800;
  }
  @media (max-width:620px) {
    #intro { padding:20px 16px; }
    #introLayout { display:block; width:100%; }
    #introSpirit {
      position:absolute; left:-42px; top:-120px;
      width:clamp(135px, 39vw, 188px); margin:0; z-index:1;
    }
    #introCard {
      width:min(440px, calc(100vw - 32px));
      min-height:300px; margin:0 auto; padding:75px 22px 23px;
    }
    #introAva { width:120px; height:120px; top:-60px; }
    #introText { font-size:16px; max-width:32ch; }
  }
  @media (max-height:550px) {
    #introCard { min-height:0; padding-top:61px; padding-bottom:17px; }
    #introAva { width:100px; height:100px; top:-50px; }
    #introText { min-height:0; margin:8px auto 10px; font-size:15px; }
    #introWave { height:22px; margin-bottom:10px; }
    #introNext { padding:10px 28px; }
  }

  /* итоги */
  #win { display:none; z-index:40; background:rgba(41,48,61,.58); }
  #winCard { background:#fff; border-radius:26px; padding:26px 24px; max-width:380px; box-shadow:var(--shadow-lg); }
  #winCard h2 { font-size:25px; font-weight:900; margin:6px 0; text-wrap:balance; }
  #winCard p { color:var(--ink-soft); font-size:14.5px; font-weight:700; line-height:1.45; }
  #winStats { display:flex; gap:10px; justify-content:center; margin:16px 0 4px; }
  #winStats div { flex:1; background:var(--cream); border:1px solid var(--border); border-radius:16px; padding:10px 6px; }
  #winStats b { display:block; font-size:21px; font-weight:900; color:var(--teal); }
  #winStats span { font-size:10.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-soft); }
  #again { margin-top:16px; border-radius:999px; padding:14px 28px; font-size:16px; font-weight:900;
    color:#fff; background:var(--teal); box-shadow:0 8px 22px rgba(40,189,159,.42); }

  #pause { display:none; z-index:35; background:#142844B8; }
  #pauseCard { width:min(380px, 100%); background:#fff; padding:26px; border-radius:24px; box-shadow:var(--shadow-lg); }
  #pauseCard h2 { font-size:24px; margin-bottom:10px; }
  #pauseText { color:var(--ink-soft); font-size:14px; line-height:1.5; }
  #resumeCamera, #resumeGame { width:100%; margin-top:12px; min-height:44px; padding:12px 16px; border-radius:999px; font-weight:800; }
  #resumeCamera { color:#fff; background:#315F8D; }
  #resumeGame { color:#315F8D; background:#E8EFF7; }

  @media (max-height:500px) {
    #obj { right:230px; padding:7px 10px; }
    #objTitle { font-size:14px; }
    #objHint { font-size:11px; }
    #cam { top:calc(var(--safe-t) + 54px); right:10px; width:208px; padding:8px; gap:5px; font-size:10px;
      max-height:calc(100dvh - var(--safe-t) - var(--safe-b) - 64px); }
    #camPreview { width:112px; height:84px; aspect-ratio:auto; align-self:center; }
    #camGuide { font-size:9px; }
    #camMove { display:none; }
    #camToggle, #camRetry { min-height:38px; padding:7px; font-size:10px; }
    #joy { width:88px; height:88px; left:16px; bottom:calc(var(--safe-b) + 16px); }
    #knob { width:40px; height:40px; }
    #rothint { display:none !important; }
    #npc, #coach { bottom:calc(var(--safe-b) + 14px); left:114px; right:230px; max-width:none; width:auto; transform:none; padding:8px; }
    #npcAva { width:36px; height:36px; }
    #npcText, #coachText { font-size:11px; }
    #start { justify-content:flex-start; gap:8px; padding-top:48px; }
    #startPortrait { width:54px; height:54px; }
    #start h1 { font-size:25px; }
    #start .lead { font-size:12px; }
    #startPrivacy { font-size:10px; }
    #startControls { flex-direction:row; width:min(540px, 100%); }
    #startControls button { flex:1; padding:11px 14px; font-size:13px; }
    #win, #pause { justify-content:flex-start; padding-top:48px; }
    #winCard, #pauseCard { padding:16px; }
  }
  @media (max-height:360px) {
    #camPreview { width:80px; height:60px; }
    #camGuide { display:none; }
  }

  /* Short, playful exercises keep both the 3D reward and the camera visible. */
  #garden { display:none; position:fixed; z-index:22; left:18px; bottom:calc(var(--safe-b) + 18px);
    width:min(420px, calc(100vw - 274px)); max-height:calc(100dvh - var(--safe-t) - var(--safe-b) - 132px);
    overflow-y:auto; padding:17px 20px 14px; color:#355267; background:rgba(255,253,246,.97);
    border:1px solid #FFFFFF; border-radius:23px; box-shadow:0 12px 35px #2B566B30; }
  #gardenHeading { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  #gardenEyebrow { font-size:10px; letter-spacing:.13em; color:#718D91; font-weight:900; text-transform:uppercase; }
  #gardenTitle { font-size:21px; line-height:1.2; font-weight:900; margin-top:3px; }
  #gardenClose { align-self:flex-start; flex:none; min-width:34px; min-height:34px; background:#E9EFEA; border-radius:50%; color:#607A7E; font-size:22px; }
  #gardenLesson { display:grid; grid-template-columns:65px 1fr 48px; align-items:center; gap:11px; margin:8px 0 5px; }
  #gardenExample { width:65px; height:65px; }
  #gardenExample svg { display:block; width:100%; height:100%; }
  #gardenInstruction { font-size:13px; font-weight:750; line-height:1.4; text-wrap:balance; }
  #gardenSound { width:46px; height:46px; display:flex; align-items:center; justify-content:center; border-radius:15px;
    font-size:29px; font-weight:900; color:#587686; background:#E6EFEB; border:1px solid #D3E3DB; }
  #gardenStatus { color:#547681; font-size:12px; line-height:1.35; min-height:32px; font-weight:750; }
  #gardenProgress { display:flex; align-items:center; gap:8px; margin:4px 0 7px; }
  #gardenMeter { flex:1; height:7px; overflow:hidden; border-radius:8px; background:#DEE8E0; }
  #gardenFill { height:100%; width:0%; border-radius:8px; background:#73B7A6; transition:width .08s; }
  .gardenGem { width:10px; height:10px; border-radius:3px; transform:rotate(45deg); background:#DEE8E0; }
  .gardenGem.earned { background:#EAB752; box-shadow:0 0 10px #EAB75270; }
  #gardenCount { font-size:10px; font-weight:800; color:#718786; }
  #gardenActions { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:8px; }
  #gardenHelp { min-height:37px; padding:8px 12px; border:1px solid #CADDD5; background:#EAF1EB; border-radius:12px; color:#4D746F; font-size:12px; font-weight:850; }
  #gardenHelp:disabled { opacity:.55; cursor:default; }
  #gardenMethod { max-width:155px; font-size:10px; line-height:1.35; color:#82938F; }
  #gardenRetry { display:none; min-height:32px; background:transparent; text-decoration:underline; color:#426D83; font-size:11px; margin-top:3px; }
  #garden.garden-success { border-color:#F0D796; }
  .garden-success #gardenSound { background:#FFF0C5; color:#9C762C; }
  .garden-open #joy, .garden-open #rothint, .garden-open #coach, .garden-open #npc { visibility:hidden; pointer-events:none; }
  .garden-open #camMove, .garden-open #camGuide, .garden-open #camCenter, .garden-open #camPointer { display:none !important; }
  @media (max-width:620px) and (min-height:501px) {
    #garden { left:10px; bottom:calc(var(--safe-b) + 10px); width:calc(100vw - 20px); padding:12px 14px 10px; max-height:calc(100dvh - 320px); }
    #gardenTitle { font-size:19px; }
    #gardenLesson { margin-top:5px; grid-template-columns:55px 1fr 42px; gap:9px; }
    #gardenExample { width:55px; height:55px; }
    #gardenSound { width:40px; height:40px; font-size:26px; }
    #gardenStatus { min-height:30px; font-size:11.5px; }
    #gardenActions { margin-top:5px; }
    .garden-open #cam { width:154px; }
    .garden-open #camPreview { width:116px; height:87px; aspect-ratio:auto; align-self:center; }
    .garden-open #camStateLine { font-size:10px; }
  }
  @media (max-height:500px) {
    #garden { left:12px; bottom:calc(var(--safe-b) + 10px); padding:12px 15px 10px; width:min(440px,calc(100vw - 244px)); max-height:calc(100dvh - 122px); border-radius:18px; }
    #gardenTitle { font-size:18px; }
    #gardenLesson { grid-template-columns:48px 1fr 38px; gap:9px; margin:3px 0; }
    #gardenExample { width:48px; height:48px; }
    #gardenSound { width:36px; height:36px; font-size:24px; border-radius:11px; }
    #gardenInstruction { font-size:12px; }
    #gardenStatus { min-height:28px; font-size:11px; }
    #gardenActions { margin-top:3px; }
    #gardenHelp { min-height:34px; font-size:11px; }
    #gardenMethod { font-size:9px; }
  }
  @media (max-width:620px) and (max-height:500px) {
    #garden { width:calc(100vw - 20px); left:10px; max-height:calc(100dvh - 156px); }
    .garden-open #obj { right:166px; }
    .garden-open #cam { width:148px; top:calc(var(--safe-t) + 54px); max-height:88px; }
    .garden-open #camPreview { display:none !important; }
    .garden-open #camToggle { min-height:30px; padding:5px; }
    .garden-open #camStateLine { font-size:9px; }
  }

  @media (prefers-reduced-motion: reduce) {
    #npcAva, #introSpirit { animation:none; }
    * { transition-duration:.01ms !important; }
  }
</style>
</head>
<body id="worldBody">
  <canvas id="c" tabindex="0" aria-label="Игровой мир. WASD или стрелки — ходьба, пробел — прыжок."></canvas>
  <div id="cam" class="glass">
    <div id="camStateLine"><span id="camDot" aria-hidden="true"></span><span id="camText" role="status">Камера выключена · WASD или джойстик</span></div>
    <div id="camPreview"><video id="camv" autoplay muted playsinline aria-label="Зеркальное изображение камеры"></video><span id="camCenter"></span><span id="camPointer"></span></div>
    <span id="camMove" aria-hidden="true"></span>
    <span id="camGuide">Веди указательный палец. Центр — стоп, вверх — вперёд, в стороны — поворот пути. Убери руку, чтобы остановиться.</span>
    <div id="camActions"><button id="camToggle" type="button" aria-pressed="false">Включить камеру</button><button id="camRetry" type="button">Повторить</button></div>
  </div>

  <div id="obj" class="glass">
    <div id="objTitle">Остров Эха</div>
    <small id="objHint">Иди вперёд — к каменным воротам.</small>
  </div>

  <div id="score" class="glass">
    <span class="gold">⭐ <b id="scStars">0</b></span>
    <span class="sep"></span>
    <span id="scoreStages">Этапы <b id="scStages">0</b>/<b id="scTotal">4</b></span>
  </div>
  <div id="track" class="glass"></div>

  <div id="mic" class="glass">
    <div id="miclbl">🎤 Микрофон</div>
    <div class="bar"><div id="rmsfill"></div></div>
    <div id="taskwrap"><div class="bar"><div id="taskfill"></div></div></div>
    <button id="micToggle" type="button" aria-pressed="false">Включить микрофон</button>
    <span id="micStatus" role="status">Для голосовых заданий</span>
  </div>

  <div id="coach">
    <div id="coachIcon">💡</div>
    <div><div id="coachTitle">Почти!</div><div id="coachText"></div></div>
  </div>

  <div id="joy"><div id="knob"></div></div>
  <div id="rothint">⟲ Проведи пальцем — поворот камеры</div>
  <div id="banner"></div>

  <section id="garden" role="region" aria-labelledby="gardenTitle">
    <div id="gardenHeading"><div><div id="gardenEyebrow">Сад звуков</div><h2 id="gardenTitle">Разбуди цветок</h2></div><button id="gardenClose" type="button" aria-label="Вернуться к прогулке">×</button></div>
    <div id="gardenLesson"><div id="gardenExample"></div><p id="gardenInstruction"></p><span id="gardenSound" aria-hidden="true">И</span></div>
    <p id="gardenStatus" role="status" aria-live="polite"></p>
    <div id="gardenProgress"><div id="gardenMeter" role="progressbar" aria-label="Движение губ" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="gardenFill"></div></div><i id="gardenGem1" class="gardenGem" aria-hidden="true"></i><i id="gardenGem2" class="gardenGem" aria-hidden="true"></i><span id="gardenCount">Повтор 1 из 2</span></div>
    <div id="gardenActions"><button id="gardenHelp" type="button">Помочь цветку</button><span id="gardenMethod">Камера видит движение губ. Кнопка — помощь в игре.</span></div>
    <button id="gardenRetry" type="button">Загрузить распознавание снова</button>
  </section>

  <div id="pause" class="layer" role="dialog" aria-modal="true" aria-labelledby="pauseTitle">
    <div id="pauseCard">
      <h2 id="pauseTitle">Прогулка на паузе</h2>
      <p id="pauseText">Искры ждут тебя.</p>
      <button id="resumeCamera" type="button">Продолжить жестами</button>
      <button id="resumeGame" type="button">Продолжить прогулку</button>
    </div>
  </div>

  <div id="npc">
    <div id="npcAva" aria-hidden="true"></div>
    <div><div id="npcName">Үнчик</div><div id="npcText"></div></div>
  </div>

  <div id="win" class="layer">
    <div id="winCard">
      <div style="font-size:52px">🏆</div>
      <h2 id="winTitle">Остров Эха спасён!</h2>
      <p id="winSub"></p>
      <div id="winStats">
        <div><b id="winStars">0</b><span>звёзд</span></div>
        <div><b id="winStages">0</b><span>этапов</span></div>
        <div><b id="winZones">0</b><span>зон</span></div>
      </div>
      <button id="again">Играть заново 🔄</button>
      <button id="finishDemo" type="button" class="cta" style="display:none">К результату</button>
    </div>
  </div>

  <div id="start" class="layer">
    <img id="startPortrait" src="/world-intro/unchik-portrait.png" alt="Үнчик" />
    <h1>Остров Эха</h1>
    <p class="lead" id="startLead">Веди лисёнка кончиком пальца. Веб-камера станет твоим контроллером, а Үнчик покажет дорогу.</p>
    <div id="startControls"><button id="go" type="button" class="cta">Играть жестами</button><button id="goKeyboard" type="button">Играть с клавиатурой</button></div>
    <p id="startPrivacy">Камера включится после нажатия. Видео обрабатывается в браузере и не сохраняется. Микрофон включается отдельной кнопкой.</p>
  </div>

  <div id="intro" class="layer">
    <div id="introLayout">
      <img id="introSpirit" src="/world-intro/unchik-flying.png" alt="" aria-hidden="true" />
      <div id="introCard">
        <img id="introAva" src="/world-intro/unchik-portrait.png" alt="" />
        <div id="introName">Үнчик</div>
        <div id="introText"></div>
        <div id="introWave" aria-hidden="true"></div>
        <button id="introNext">Дальше ▶</button>
        <button id="introSkip" type="button">Пропустить</button>
      </div>
    </div>
  </div>

  <!--THREE_LIB-->
  <script>
  (function(){
    if (!window.THREE) {
      document.getElementById('start').innerHTML =
        '<h1>Не удалось загрузить 3D</h1><p class="lead">Движок Three.js не встроился в страницу. Перезапусти приложение.</p>';
      return;
    }
    var THREE = window.THREE;
`;
}

/** Хвост страницы — закрывает IIFE, начатую в `shell()`. */
export function shellEnd(): string {
  return `
  })();
  <\/script>
</body>
</html>`;
}
