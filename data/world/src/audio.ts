/**
 * Слух мира: анализ микрофона, распознавание целевого звука и — главное —
 * РАЗБОР ОШИБКИ.
 *
 * Разбор спектра даёт пять признаков, которых хватает, чтобы отличить не просто
 * «звук есть / звука нет», а КАКАЯ именно ошибка:
 *   rms      — громкость (тихо / нормально / слишком громко);
 *   hiss     — доля 4 кГц+ : свистящие С, З, Ц;
 *   sh       — доля 2–4 кГц: шипящие Ш, Ж, Щ, Ч;
 *   centroid — «яркость» спектра: различает С↔Ш и передние↔задние гласные;
 *   flux     — дрожь амплитуды: рокот Р.
 *
 * `voiceCheck()` возвращает не булево «получилось», а код ошибки, который
 * `COACH` переводит в конкретную инструкцию («получается ш — растяни губы»),
 * а не в бесполезное «звук не распознан».
 */
export function audio(): string {
  return `
    // ---------- захват и разбор ----------
    var actx = null, analyser = null, td = null, fd = null, binHz = 43;
    var hiBin = 93, shBin = 46, midBin = 16, loBin = 2;
    var rmsLevel = 0, hissRatio = 0, shRatio = 0, loRatio = 0, midRatio = 0;
    var centroidHz = 0, micFlux = 0, prevRms = 0, voicedNow = false;
    var micStream = null, micSource = null, micEpoch = 0, micState = 'idle';

    function ensureAudio(){
      if (!actx){ var AC = window.AudioContext || window.webkitAudioContext; actx = new AC(); }
      if (actx.state === 'suspended') actx.resume();
    }
    function stopMicrophone(){
      micEpoch++;
      if (micStream) micStream.getTracks().forEach(function(track){ track.stop(); });
      if (micSource) micSource.disconnect();
      if (analyser) analyser.disconnect();
      micStream = micSource = analyser = td = fd = null;
      rmsLevel = hissRatio = shRatio = loRatio = midRatio = micFlux = prevRms = 0; voicedNow = false;
      micState = 'idle'; if (typeof updateMicHud === 'function') updateMicHud();
    }
    async function initAudio(){
      if (micState === 'requesting' || micState === 'ready') return;
      ensureAudio();
      var epoch = ++micEpoch; micState = 'requesting'; updateMicHud();
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('microphone-unavailable');
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (epoch !== micEpoch){ stream.getTracks().forEach(function(track){ track.stop(); }); return; }
        micStream = stream; micSource = actx.createMediaStreamSource(stream);
        analyser = actx.createAnalyser(); analyser.fftSize = 1024; micSource.connect(analyser);
        td = new Uint8Array(analyser.fftSize); fd = new Uint8Array(analyser.frequencyBinCount);
        binHz = actx.sampleRate / analyser.fftSize;
        loBin = Math.max(1, Math.floor(80 / binHz)); midBin = Math.floor(700 / binHz);
        shBin = Math.floor(2000 / binHz); hiBin = Math.floor(4000 / binHz);
        micState = 'ready';
        stream.getAudioTracks().forEach(function(track){ track.addEventListener('ended', function(){
          if (micStream === stream){ stopMicrophone(); micState = 'error'; updateMicHud(); }
        }); });
        updateMicHud();
      } catch (error){
        if (epoch !== micEpoch) return;
        stopMicrophone();
        micState = error && error.name === 'NotAllowedError' ? 'denied' : 'error'; updateMicHud();
      }
    }
    function readMic(){
      if (!analyser) return;
      analyser.getByteTimeDomainData(td);
      var sum = 0;
      for (var i = 0; i < td.length; i++){ var v = (td[i] - 128) / 128; sum += v * v; }
      var rms = Math.min(1, Math.sqrt(sum / td.length) * 4);
      rmsLevel += (rms - rmsLevel) * 0.3;
      micFlux += (Math.abs(rms - prevRms) - micFlux) * 0.25; prevRms = rms;

      analyser.getByteFrequencyData(fd);
      var tot = 0, hi = 0, sh = 0, mid = 0, lo = 0, cen = 0;
      for (var j = 1; j < fd.length; j++){
        var a = fd[j]; tot += a; cen += a * j * binHz;
        if (j >= hiBin) hi += a; else if (j >= shBin) sh += a;
        else if (j >= midBin) mid += a; else if (j >= loBin) lo += a;
      }
      var dn = tot > 30 ? tot : 1;
      hissRatio  += (hi / dn - hissRatio) * 0.3;
      shRatio    += (sh / dn - shRatio) * 0.3;
      midRatio   += (mid / dn - midRatio) * 0.3;
      loRatio    += (lo / dn - loRatio) * 0.3;
      centroidHz += ((tot > 30 ? cen / tot : 0) - centroidHz) * 0.3;
      voicedNow = (loRatio + midRatio) > 0.45 && hissRatio < 0.35 && rmsLevel > 0.06;
    }

    // ---------- классы звуков ----------
    var WHISTLE = 'СЗЦ', HUSH = 'ШЖЩЧ', SONOR = 'МНЛ', FRONT = 'ИЭЕ', BACK = 'АОУЫЯЁЮ';
    function head(s){ return (s || '').charAt(0).toUpperCase(); }

    /** Насколько текущий звук похож на целевую букву, 0..1. */
    function matchSound(letter){
      if (rmsLevel < 0.05) return 0;
      var L = head(letter);
      if (!L) return rmsLevel > 0.08 ? 1 : 0;
      if (WHISTLE.indexOf(L) >= 0)
        return clamp01((hissRatio - 0.38) / 0.30) * clamp01((centroidHz - 3400) / 2600);
      if (HUSH.indexOf(L) >= 0)
        return clamp01((shRatio - 0.26) / 0.24) * clamp01((4300 - centroidHz) / 2300) * clamp01(hissRatio / 0.22);
      if (L === 'Р')
        return clamp01((micFlux - 0.03) / 0.06) * (voicedNow ? 1 : 0.4);
      if (SONOR.indexOf(L) >= 0)
        return (voicedNow ? 1 : 0) * clamp01((1400 - centroidHz) / 900) * clamp01((loRatio - 0.18) / 0.30);
      if (FRONT.indexOf(L) >= 0)
        return (voicedNow ? 1 : 0) * clamp01((centroidHz - 800) / 1400);
      if (BACK.indexOf(L) >= 0)
        return (voicedNow ? 1 : 0) * clamp01((1700 - centroidHz) / 1500);
      return clamp01(rmsLevel / 0.2);
    }

    /**
     * Почему целевой звук не засчитан. Возвращает КОД ошибки — по нему тренер
     * выдаёт конкретную инструкцию. Порядок проверок = порядок, в котором
     * логопед подсказывает ребёнку: сначала голос/воздух, потом место языка.
     */
    function soundFault(letter){
      var L = head(letter);
      if (WHISTLE.indexOf(L) >= 0){
        if (voicedNow && hissRatio < 0.3) return 'voicedHiss';
        if (shRatio > hissRatio && centroidHz < 3600) return 'sLikeSh';
        return 'weakHiss';
      }
      if (HUSH.indexOf(L) >= 0){
        if (voicedNow && shRatio < 0.2) return 'voicedHiss';
        if (centroidHz > 4600) return 'shLikeS';
        return 'weakHush';
      }
      if (L === 'Р'){
        if (!voicedNow) return 'voicelessR';
        return 'noTrill';
      }
      if (SONOR.indexOf(L) >= 0) return 'notSonorant';
      if (FRONT.indexOf(L) >= 0 || BACK.indexOf(L) >= 0){
        if (hissRatio > 0.4) return 'breathy';
        return 'wrongVowel';
      }
      return 'weakSound';
    }

    /**
     * Единая проверка речевой задачи.
     *   sound — целевая буква/слог ('' → любой звонкий звук);
     *   o.min — нужна громкость не ниже; o.max — не выше (тихие задачи);
     *   o.loose — засчитывать похожесть мягче (для вводных зон).
     * Возвращает { m: похожесть 0..1, ok: засчитано, err: код ошибки|null }.
     */
    function voiceCheck(sound, o){
      o = o || {};
      var m = sound ? matchSound(sound) : clamp01(rmsLevel / 0.2);
      if (rmsLevel < 0.035) return { m: 0, ok: false, err: 'silent' };
      if (o.max != null && rmsLevel > o.max) return { m: m, ok: false, err: 'tooLoud' };
      if (o.min != null && rmsLevel < o.min) return { m: m, ok: false, err: 'tooQuiet' };
      if (m < (o.loose ? 0.12 : 0.2)) return { m: m, ok: false, err: sound ? soundFault(sound) : 'weakSound' };
      return { m: m, ok: true, err: null };
    }

    // ---------- синтез: награды и атмосфера ----------
    function tone(freq, dur, type, vol){
      if (!actx) return;
      var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime;
      o.type = type || 'sine'; o.frequency.value = freq; g.gain.value = vol || 0.12;
      o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(g.gain.value, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.start(t0); o.stop(t0 + dur);
    }
    /** Восходящее трезвучие — универсальный звук успеха. */
    function chime(){
      [[523, 0], [659, 120], [784, 240]].forEach(function(n){
        setTimeout(function(){ tone(n[0], n[0] === 784 ? 0.28 : 0.16, 'triangle', 0.12); }, n[1]);
      });
    }
    function pop(){ tone(180, 0.18, 'square', 0.10); }
    function whoosh(){
      if (!actx) return;
      var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime;
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(160, t0); o.frequency.exponentialRampToValueAtTime(520, t0 + 0.4);
      g.gain.value = 0.06; o.connect(g); g.connect(actx.destination);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4); o.start(t0); o.stop(t0 + 0.42);
    }
    /** Мягкий «блуп» ошибки — тише награды, чтобы не звучал как наказание. */
    function nudge(){ tone(320, 0.1, 'sine', 0.05); setTimeout(function(){ tone(260, 0.12, 'sine', 0.04); }, 90); }

    function startAmbient(){
      if (!actx) return;
      // ветер: розоватый шум под lowpass, частоту среза качает медленный LFO
      var buf = actx.createBuffer(1, Math.floor(actx.sampleRate * 2), actx.sampleRate);
      var ch = buf.getChannelData(0);
      for (var i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * 0.5;
      var noise = actx.createBufferSource(); noise.buffer = buf; noise.loop = true;
      var lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      var ng = actx.createGain(); ng.gain.value = 0.07;
      noise.connect(lp); lp.connect(ng); ng.connect(actx.destination); noise.start();
      var lfo = actx.createOscillator(); lfo.frequency.value = 0.08;
      var lfoG = actx.createGain(); lfoG.gain.value = 170;
      lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
      scheduleBird();
    }
    function birdChirp(){
      if (!actx) return;
      var base = 1700 + Math.random() * 900;
      for (var k = 0; k < 3; k++) (function(kk){
        setTimeout(function(){
          if (!actx) return;
          var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime;
          o.type = 'sine';
          o.frequency.setValueAtTime(base + kk * 110, t0);
          o.frequency.exponentialRampToValueAtTime(base + kk * 110 + 380, t0 + 0.07);
          g.gain.value = 0.055; g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
          o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.13);
        }, kk * 85);
      })(k);
    }
    function scheduleBird(){ setTimeout(function(){ birdChirp(); scheduleBird(); }, 4000 + Math.random() * 7000); }

    // ---------- голос спутника ----------
    /** Запасной «блип»-голос, если синтеза речи нет (стиль animalese). */
    function blipVoice(text){
      ensureAudio(); if (!actx) return;
      var n = Math.min(13, Math.max(3, Math.round((text || '').length / 7)));
      var base = 360 + Math.random() * 120;
      for (var i = 0; i < n; i++) (function(ii){
        setTimeout(function(){
          if (!actx) return;
          var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime;
          o.type = 'square';
          var f = base + Math.random() * 220;
          o.frequency.setValueAtTime(f, t0); o.frequency.linearRampToValueAtTime(f * 1.06, t0 + 0.05);
          g.gain.value = 0.05; g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
          o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.1);
        }, ii * 92);
      })(i);
    }

    var synth = window.speechSynthesis || null, ruVoice = null;
    function pickVoice(){
      if (!synth) return null;
      var vs = synth.getVoices() || [];
      var ru = vs.filter(function(v){ return /ru/i.test(v.lang); });
      var warm = ru.filter(function(v){ return /irina|svetlana|alena|arina|female|woman/i.test(v.name); });
      return warm.filter(function(v){ return /google|yandex|natural|neural|wavenet|online|enhanced|premium/i.test(v.name); })[0]
        || warm[0]
        || ru.filter(function(v){ return /google|yandex|natural|neural|wavenet|online|enhanced|premium/i.test(v.name); })[0]
        || ru.filter(function(v){ return v.localService === false; })[0] || ru[0] || null;
    }
    try { if (synth){ synth.getVoices(); ruVoice = pickVoice(); } } catch (e) {}
    if (synth) synth.onvoiceschanged = function(){ ruVoice = pickVoice(); };

    /** Озвучка реплики: мост родителя (нейроголос) → системный TTS → блипы. */
    function speak(text){
      if (window.SpeechSteps && typeof window.SpeechSteps.speak === 'function'){
        try { window.SpeechSteps.speak(text); return; } catch (e) {}
      }
      var clean = (text || '')
        .replace(/[^0-9A-Za-z\\u0400-\\u04FF\\s.,!?«»:\\-]/g, ' ')
        .replace(/\\s+/g, ' ').trim();
      try {
        if (synth && clean){
          synth.cancel();
          var u = new SpeechSynthesisUtterance(clean);
          u.lang = 'ru-RU'; u.rate = 0.9; u.pitch = 1.03; u.volume = 0.96;
          if (!ruVoice) ruVoice = pickVoice();
          if (ruVoice) u.voice = ruVoice;
          synth.speak(u); return;
        }
      } catch (e) {}
      blipVoice(text);
    }
`;
}
