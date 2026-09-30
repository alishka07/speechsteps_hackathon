import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, Compass, Flower2, Footprints, Mic, NotebookPen, RotateCcw, Sparkles, Volume2, VolumeX, Wind } from 'lucide-react';
import { useEchoJourney } from './useEchoJourney';
import './EchoJourney.css';

const ART = `${import.meta.env.BASE_URL}echo-journey/`;
const COMPANION = `${import.meta.env.BASE_URL}world-intro/unchik-flying.png`;
const PORTRAIT = `${import.meta.env.BASE_URL}world-intro/unchik-portrait.png`;
const STOPS = [
  { id: 'arrival', label: 'Тихий берег', action: 'Подари звук', icon: Sparkles },
  { id: 'flower', label: 'Сонная поляна', action: 'Разбуди цветок', icon: Flower2 },
  { id: 'wind', label: 'Ветряные холмы', action: 'Поймай ветер', icon: Wind },
] as const;
const DEMO_STOPS = [
  { id: 'camera', label: 'Движение', action: 'Управляй пальцем', icon: Camera },
  { id: 'voice', label: 'И · У · А', action: 'Оживи сад звуков', icon: Flower2 },
  { id: 'result', label: 'Маленькие чудеса', action: 'Сохрани свой путь', icon: Footprints },
] as const;

function WindmillRotor({ moving }: { moving: boolean }) {
  return <svg className={`ej-rotor ${moving ? 'is-turning' : ''}`} viewBox="0 0 400 400" aria-hidden="true">
    <defs><linearGradient id="ej-sail" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff2c9"/><stop offset="1" stopColor="#d7b67c"/></linearGradient></defs>
    {[0, 90, 180, 270].map(angle => <g key={angle} transform={`rotate(${angle} 200 200)`}>
      <path d="M194 199 L188 22 Q204 11 223 20 L235 155 L207 172 Z" fill="url(#ej-sail)" stroke="#826145" strokeWidth="3"/>
      <path d="M201 200 L197 19 M191 48 L226 45 M192 77 L228 74 M194 107 L231 104 M195 137 L233 132" fill="none" stroke="#9b7651" strokeWidth="4"/>
    </g>)}
    <circle cx="200" cy="200" r="17" fill="#634e43" stroke="#d4b477" strokeWidth="6"/>
    <circle cx="200" cy="200" r="6" fill="#f6daa0"/>
  </svg>;
}

function VoiceMeter({ level, active }: { level: number; active: boolean }) {
  return <div className={`ej-wave ${active ? 'is-listening' : ''}`} aria-hidden="true">
    {Array.from({ length: 17 }, (_, i) => <i key={i} style={{ height: `${5 + (1 - Math.abs(i - 8) / 10) * (active ? 12 + level * 48 : 9)}px`, animationDelay: `${i * -0.11}s` }}/>) }
  </div>;
}

export default function EchoJourney({ childId, onExplore, onExit, resumeOnLoad = false }: { childId: string; onExplore: () => void; onExit: () => void; resumeOnLoad?: boolean }) {
  const journey = useEchoJourney({ childId, resumeOnLoad });
  const [sound, setSound] = useState(true);
  const [holding, setHolding] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const narrationId = useRef(0);
  const narrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const sceneRef = useRef<HTMLElement>(null);
  const { phase, inputMode, completed, rounds, restSeconds, progress, level, micStatus } = journey;
  const { setNarrating: pauseInput, stopTouchWind } = journey;
  const welcome = phase === 'welcome';
  const finished = phase === 'complete';
  const bloomed = completed.includes('flower');
  const wind = phase === 'wind' || finished;
  const listening = micStatus === 'listening';
  const micBusy = micStatus === 'requesting' || micStatus === 'calibrating';
  const resting = restSeconds > 0 || journey.needsRelease;
  const scene = wind ? 'windmill' : phase === 'flower' ? 'glade' : 'shore';
  const stageIndex = phase === 'arrival' ? 0 : phase === 'flower' ? 1 : wind ? 2 : -1;
  const currentStop = phase === 'flower' ? STOPS[1] : wind ? STOPS[2] : STOPS[0];
  const speech = phase === 'arrival' ? (inputMode === 'touch' ? 'Коснись Искры. Вместе разбудим этот остров!' : 'Подари мне любой звук. Даже тихое «а-а» подойдёт.')
    : phase === 'flower' ? (bloomed ? 'Цветок проснулся! Пойдём к мельнице?' : 'Твоя Искра готова! Коснись цветка и подари ему свет.')
    : phase === 'wind' ? (resting ? 'А теперь спокойно вдохни. Я подожду.' : inputMode === 'touch' ? 'Нажми кнопку. Тёплый ветер повернёт лопасти!' : 'Мягко подуй. Поможем мельнице поймать ветер.')
    : 'Цветок проснулся, мельница кружится. Это всё ты!';

  useEffect(() => {
    const sceneElement = sceneRef.current;
    if (!sceneElement) return;
    // The chapter can be taller than the viewport on a phone or when its
    // summary is expanded. Keep the landscape covering that actual height.
    const measure = () => sceneElement.style.setProperty('--ej-scene-height', `${sceneElement.getBoundingClientRect().height}px`);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(sceneElement);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const silence = useCallback(() => {
    narrationId.current += 1;
    if (narrationTimer.current) clearTimeout(narrationTimer.current);
    window.speechSynthesis?.cancel();
    pauseInput(false);
    setNarrating(false);
    setHolding(false);
  }, [pauseInput]);
  const say = useCallback((text: string) => {
    if (!sound || !window.speechSynthesis) return;
    silence();
    const id = narrationId.current;
    pauseInput(true);
    setNarrating(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU'; utterance.rate = 0.86; utterance.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices().filter(voice => voice.lang.startsWith('ru'));
    utterance.voice = voices.find(voice => /irina|svetlana|female|natural/i.test(voice.name)) ?? voices[0] ?? null;
    const finish = () => {
      if (id !== narrationId.current) return;
      if (narrationTimer.current) clearTimeout(narrationTimer.current);
      pauseInput(false);
      setNarrating(false);
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    // A voice that never starts must not leave the microphone game paused.
    narrationTimer.current = setTimeout(() => { if (id === narrationId.current) silence(); }, Math.max(9000, text.length * 160));
    try { window.speechSynthesis.speak(utterance); } catch { finish(); }
  }, [sound, silence, pauseInput]);
  const chime = () => {
    if (!sound || inputMode === 'microphone') return;
    try {
      const ctx = audioRef.current ?? new AudioContext();
      audioRef.current = ctx;
      void ctx.resume();
      [523.25, 659.25, 783.99].forEach((frequency, i) => {
        const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
        const when = ctx.currentTime + i * 0.11;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, when); gain.gain.linearRampToValueAtTime(0.035, when + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, when + 0.8);
        oscillator.connect(gain); gain.connect(ctx.destination);
        oscillator.start(when); oscillator.stop(when + 0.85);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { /* The visual reward remains available without audio. */ }
  };
  useEffect(() => () => {
    narrationId.current += 1;
    if (narrationTimer.current) clearTimeout(narrationTimer.current);
    window.speechSynthesis?.cancel();
    pauseInput(false);
    void audioRef.current?.close().catch(() => undefined);
  }, [pauseInput]);
  const autoNarration = useRef('');
  useEffect(() => {
    const key = `${phase}:${bloomed}:${rounds}:${inputMode}`;
    if (key === autoNarration.current) return;
    autoNarration.current = key;
    if (phase !== 'welcome') say(speech);
  }, [phase, bloomed, rounds, inputMode, speech, say]);
  useEffect(() => { stopTouchWind(); setHolding(false); }, [rounds, stopTouchWind]);
  useEffect(() => {
    setHolding(false);
    if (phase !== 'welcome') titleRef.current?.focus({ preventScroll: true });
  }, [phase]);
  useEffect(() => {
    const release = () => { setHolding(false); stopTouchWind(); };
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    return () => { window.removeEventListener('blur', release); document.removeEventListener('visibilitychange', release); };
  }, [stopTouchWind]);

  const beginMic = () => { silence(); void journey.startWithMicrophone(); };
  const beginTouch = () => { silence(); journey.startWithTouch(); };
  const blossom = () => { silence(); journey.bloomFlower(); chime(); };
  const spark = () => { silence(); journey.createTouchSpark(); chime(); };
  const pressWind = () => { if (!resting && !narrating) { setHolding(true); journey.startTouchWind(); } };
  const goHome = () => { silence(); onExit(); };
  const goExplore = () => { silence(); onExplore(); };

  return <main ref={sceneRef} className={`echo-journey ej-${phase} ${bloomed ? 'has-bloomed' : ''}`}>
    <div className="ej-backdrop" aria-hidden="true" key={scene}>
      <div className="ej-artboard">
        <img className="ej-landscape" src={`${ART}${scene}.png`} alt="" fetchPriority="high"/>
        {wind && <WindmillRotor moving={finished || (!resting && (inputMode === 'touch' ? holding : level > 0.15))}/>}
      </div>
    </div>
    <div className="ej-shade" aria-hidden="true"/>
    <div className="ej-fireflies" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--x': `${(i * 37 + 9) % 100}%`, '--y': `${(i * 23 + 17) % 100}%`, '--delay': `${i * -0.73}s` } as CSSProperties}/>)}</div>

    <header className="ej-header">
      <button className="ej-brand" onClick={goHome} aria-label="Выйти из острова">
        <span className="ej-brand-mark"><Sparkles size={24}/></span>
        <span>SpeechSteps<small>ОСТРОВ ЭХА</small></span>
      </button>
      {!welcome && <div className="ej-mini-trail" aria-label="Маршрут главы">{STOPS.map((stop, i) => <span key={stop.id} className={`${completed.includes(stop.id) ? 'is-done' : ''} ${i === stageIndex ? 'is-current' : ''}`} aria-label={`${stop.label}${completed.includes(stop.id) ? ': пройдено' : ''}`}><stop.icon size={17}/></span>)}</div>}
      <div className="ej-header-actions">
        <button className="ej-icon-button" aria-label={sound ? 'Выключить звук' : 'Включить звук'} aria-pressed={sound} onClick={() => { setSound(!sound); silence(); }}>{sound ? <Volume2 size={21}/> : <VolumeX size={21}/>}</button>
        <button className="ej-icon-button" onClick={goHome} aria-label="Выйти из игры"><ArrowLeft size={21}/></button>
      </div>
    </header>

    {welcome ? <>
      <section className="ej-welcome-copy">
        <div className="ej-eyebrow"><span/> МАЛЕНЬКОЕ БОЛЬШОЕ ПРИКЛЮЧЕНИЕ</div>
        <h1>Оживи остров<br/><em>улыбкой.</em></h1>
        <p>Веди лисёнка пальцем. Повторяй «И», «У», «А»<br/>и помогай друзьям в волшебном саду.</p>
        <div className="ej-welcome-buttons">
          <button className="ej-button ej-primary" onClick={goExplore}><Camera size={21}/> Играть с камерой <ArrowRight size={20}/></button>
          <button className="ej-text-button" onClick={journey.savedJourneyComplete ? journey.resume : beginMic}><Mic size={17}/> {journey.savedJourneyComplete ? 'Итог голосовой истории' : journey.hasSavedJourney ? 'Продолжить голосовую историю' : 'Начать голосовую историю'}</button>
        </div>
        {!journey.savedJourneyComplete && <button className="ej-resume" onClick={beginTouch}>{journey.hasSavedJourney ? <RotateCcw size={15}/> : <Footprints size={15}/>} {journey.hasSavedJourney ? 'Продолжить историю касаниями' : 'История без микрофона'}</button>}
        <span className="ej-welcome-note">Камера включится по кнопке в игре. Можно играть и клавишами.</span>
      </section>
      <div className="ej-welcome-friend">
        <div className="ej-friend-halo"/>
        <img src={COMPANION} alt="Үнчик — голубой дух с большими ушами и светящимся сердцем"/>
        <button className="ej-hello" onClick={() => say('Привет! Я Үнчик. Давай разбудим остров вместе!')}><span>Привет! Я Үнчик</span><Volume2 size={17}/></button>
      </div>
      <footer className="ej-welcome-footer">
        <div className="ej-route-preview">{DEMO_STOPS.map((stop, i) => <div key={stop.id}><span className="ej-stop-icon"><stop.icon size={20}/></span><span><small>0{i + 1}</small><b>{stop.label}</b><span>{stop.action}</span></span>{i < 2 && <span className="ej-route-dashes"/>}</div>)}</div>
        <button className="ej-explore" onClick={goHome}><NotebookPen size={19}/><span>Мой путь<small>Сохранённые результаты</small></span><ArrowRight size={17}/></button>
      </footer>
    </> : finished ? <section className="ej-completion">
      <img className="ej-completion-friend" src={COMPANION} alt="Радостный Үнчик"/>
      <div className="ej-completion-card">
        <div className="ej-eyebrow">ПЕРВАЯ ГЛАВА ПРОЙДЕНА</div>
        <h1 ref={titleRef} tabIndex={-1}>Остров тебя услышал!</h1>
        <p>Ты подарил этому месту немного волшебства.</p>
        <div className="ej-keepsakes">{STOPS.map(stop => <div key={stop.id}><stop.icon size={26}/><b>{stop.id === 'arrival' ? 'Искра' : stop.id === 'flower' ? 'Цветок' : 'Ветер'}</b><Check size={14}/></div>)}</div>
        <div className="ej-completion-actions"><button className="ej-button ej-primary" onClick={goExplore}><Compass size={19}/> Исследовать остров <ArrowRight size={19}/></button><button className="ej-text-button" onClick={journey.restart}><RotateCcw size={16}/> Ещё одна история</button></div>
        <details className="ej-parent-note"><summary>Для взрослого · итог приключения</summary><p>Пройдены три сцены. У мельницы завершены три коротких действия с паузами. Время в главе: {Math.max(1, Math.ceil(journey.elapsedSeconds / 60))} мин.</p><p>Способ прохождения: {journey.inputSources.map(source => source === 'microphone' ? 'микрофон' : 'касания').join(' и ')}. {journey.storageStatus === 'saved' ? 'Прогресс сохранён в этом браузере.' : 'Браузер не сохранил прогресс: он доступен до закрытия страницы.'} Звук используется как игровой сигнал, оценка произношения не выполняется. Аудиозапись не сохраняется.</p></details>
      </div>
    </section> : <>
      <section className="ej-location-heading">
        <div className="ej-eyebrow">ГЛАВА 01 <span className="ej-dot-separator">/</span> {stageIndex + 1} ИЗ 3</div>
        <h1 ref={titleRef} tabIndex={-1}>{currentStop.label}</h1>
        <p>{phase === 'arrival' ? 'Каждое приключение начинается с Искры' : phase === 'flower' ? 'Маленькое чудо ждёт твоего прикосновения' : 'Там, где живёт тёплый ветер'}</p>
      </section>
      <div className={`ej-scene-friend ${level > 0.1 ? 'is-glowing' : ''}`}><div className="ej-friend-halo"/><img src={COMPANION} alt="Үнчик ждёт твоей помощи"/></div>
      {phase === 'arrival' && <div className="ej-spark-zone"><div className="ej-spark-orbit"/><button className="ej-spark" onClick={inputMode === 'touch' ? spark : undefined} disabled={inputMode !== 'touch'} aria-label="Подарить Искру"><Sparkles size={48}/></button><span>{inputMode === 'touch' ? 'Коснись Искры' : 'Твой звук станет светом'}</span></div>}
      {phase === 'flower' && <div className={`ej-flower-zone ${bloomed ? 'is-bloomed' : ''}`}>
        <div className="ej-flower-aura"/>
        <button className="ej-flower" onClick={blossom} disabled={bloomed} aria-label={bloomed ? 'Цветок проснулся' : 'Разбудить цветок Искрой'}><img src={`${ART}flower.png`} alt="Волшебный цветок с золотой сердцевиной"/></button>
        {bloomed ? <><span className="ej-flower-label"><Check size={16}/> Цветок проснулся</span><span className="ej-butterfly" aria-hidden="true">✦</span></> : <span className="ej-flower-label"><Sparkles size={16}/> Коснись цветка</span>}
      </div>}
      {phase === 'wind' && <div className="ej-wind-progress" aria-label={`Завершено ${rounds} из трёх действий`}><div className="ej-breath-orbs">{[0, 1, 2].map(i => <span key={i} className={i < rounds ? 'is-done' : i === rounds ? 'is-current' : ''}>{i < rounds ? <Check size={21}/> : <Wind size={21}/>}</span>)}</div><span>{resting ? 'Пауза на вдох' : rounds ? 'Мельница оживает' : 'Разбудим мельницу'}</span></div>}

      <section className="ej-dialogue" aria-label="Подсказка Үнчика">
        <div className="ej-dialogue-copy"><img src={PORTRAIT} alt=""/><div><div className="ej-speaker">Үнчик <button onClick={() => say(speech)} disabled={!sound} aria-label="Послушать подсказку"><Volume2 size={15}/></button></div><p aria-live="polite">{speech}</p></div></div>
        <div className="ej-action-area">
          {journey.error ? <><p className="ej-error" role="status">{journey.error}</p><button className="ej-button ej-primary" onClick={beginTouch}>Продолжить касаниями <ArrowRight size={17}/></button><button className="ej-text-button" onClick={beginMic}>Включить микрофон снова</button></> : phase === 'flower' ? (bloomed ? <button className="ej-button ej-primary" onClick={journey.continueToWind}>К мельнице <ArrowRight size={19}/></button> : <button className="ej-button ej-primary" onClick={blossom}><Sparkles size={20}/> Подарить Искру</button>) : inputMode === 'microphone' ? <>
            <VoiceMeter level={level} active={listening && !narrating}/>
            <span className="ej-mic-label">{narrating ? 'Үнчик подсказывает…' : micStatus === 'requesting' ? 'Разреши микрофон в браузере' : micStatus === 'calibrating' ? 'Мгновение тишины — знакомимся с микрофоном' : micStatus === 'paused' ? 'Микрофон на паузе' : listening ? (resting ? 'Спокойный вдох…' : phase === 'wind' ? 'Мягко дуй — лопасти закружатся' : 'Скажи «а-а», хлопни или засмейся') : 'Подключи микрофон, когда будешь готов'}</span>
            {!listening && !micBusy && <button className="ej-text-button" onClick={beginMic}>Подключить микрофон</button>}
            {phase === 'wind' && <div className="ej-progress-track" role="progressbar" aria-label="Текущий выдох" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress * 100}%` }}/></div>}
          </> : phase === 'arrival' ? <button className="ej-button ej-primary" onClick={spark}><Sparkles size={21}/> Подарить Искру</button> : <>
            <button className={`ej-button ej-primary ej-hold ${holding ? 'is-held' : ''}`} onClick={pressWind} disabled={resting || holding || narrating}><span className="ej-hold-fill" style={{ width: `${progress * 100}%` }}/><Wind size={21}/><span>{narrating ? 'Послушаем Үнчика…' : resting ? 'Пауза на вдох' : holding ? 'Ветер дует…' : 'Подарить порыв ветра'}</span></button>
            <span className="ej-small-note">Одно нажатие — один порыв. Затем немного отдохнём.</span>
          </>}
        </div>
      </section>
      <footer className="ej-game-footer"><button className="ej-mode-switch" onClick={inputMode === 'microphone' ? beginTouch : beginMic}>{inputMode === 'microphone' ? 'Перейти на касания' : <><Mic size={14}/> Включить микрофон</>}</button><span>{journey.storageStatus === 'unavailable' ? 'Сохранение недоступно' : 'Прогресс сохраняется'}</span><button onClick={() => setShowNote(!showNote)} aria-expanded={showNote}>Для взрослого</button></footer>
      {showNote && <aside className="ej-info-note"><b>Играем в своём темпе</b><p>Любой звук зажигает Искру. У мельницы — короткий мягкий выдох и пауза на вдох. Можно пройти всё касаниями. Камера выключена, аудиозапись не сохраняется.</p><button onClick={() => setShowNote(false)}>Понятно</button></aside>}
    </>}
  </main>;
}
