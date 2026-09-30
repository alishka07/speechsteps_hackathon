import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, Check, Clock3, Fish, Flower2, HardDrive, Mic, Sparkles, Sun, Wind } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { readJourneyCheckpoint, type JourneyCheckpointSnapshot } from '@/web/echo/journeyStorage';
import { loadCameraRouteResult, readLegacyWorldResult, type CameraRouteResult, type CameraRouteSnapshot } from './demoResultsData';
import './DemoResults.css';

type StorySnapshot = JourneyCheckpointSnapshot | { status: 'loading'; saved: null };
const STOPS = [
  { id: 'arrival', title: 'Тихий берег', detail: 'Подарить Үнчику Искру', icon: Sparkles },
  { id: 'flower', title: 'Сонная поляна', detail: 'Разбудить цветок', icon: Flower2 },
  { id: 'wind', title: 'Ветряные холмы', detail: 'Три порыва с паузами', icon: Wind },
] as const;
const GARDEN_STOPS = {
  'smile-flower': { title: 'Цветок улыбки', sound: 'И', detail: 'Улыбка раскрывает лепестки', icon: Flower2 },
  'round-fish': { title: 'Рыбка в пузырьке', sound: 'У', detail: 'Округлённые губы будят рыбку', icon: Fish },
  'open-lantern': { title: 'Солнечный фонарик', sound: 'А', detail: 'Открытый рот зажигает свет', icon: Sun },
} as const;

function GardenSummary({ result }: { result: CameraRouteResult }) {
  if (result.exercise !== 'speech-garden') return null;
  return <div className="dr-garden-summary">
    <h3>Три маленьких чуда</h3>
    <ol className="dr-garden-activities">{result.activities.map(activity => {
      const stop = GARDEN_STOPS[activity.id];
      return <li key={activity.id}>
        <span className={`dr-garden-symbol dr-garden-${activity.id}`}><stop.icon size={21}/></span>
        <div><strong>{stop.title}</strong><span>Подсказка «{stop.sound}» · {activity.repetitions} из 2 игровых повторов</span>
          <small>{activity.source === 'camera' ? 'Камера распознала движения рта' : activity.source === 'mixed' ? 'Камера и кнопка помощи' : 'Кнопка помощи — ручное прохождение'}</small></div>
        <Check size={18} className="dr-garden-check"/>
      </li>;
    })}</ol>
    <p className="dr-garden-note">Камера замечает движения рта. Звуковые подсказки помогают играть, но произношение не оценивается. Кнопка помощи завершает повтор вручную.</p>
  </div>;
}

function elapsedLabel(seconds: number) {
  if (seconds < 60) return `${seconds} сек`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes} мин${remainder ? ` ${remainder} сек` : ''}`;
}

export default function DemoResults() {
  const childId = useAppStore(state => state.parentChildId);
  const child = useAppStore(state => state.children.find(item => item.id === state.parentChildId));
  const worldRaw = useAppStore(state => state.worldStateByChild[childId]);
  const worldUpdatedAt = useAppStore(state => state.worldUpdatedAt[childId]);
  const [story, setStory] = useState<StorySnapshot>({ status: 'loading', saved: null });
  const [camera, setCamera] = useState<CameraRouteSnapshot>({ status: 'empty', result: null });
  const world = useMemo(() => readLegacyWorldResult(worldRaw), [worldRaw]);

  useEffect(() => {
    const refresh = () => {
      setStory(readJourneyCheckpoint(childId));
      setCamera(loadCameraRouteResult(childId));
    };
    const onVisibility = () => { if (!document.hidden) refresh(); };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [childId]);

  const saved = story.saved;
  const completed = saved?.completed ?? [];
  const storyTarget = saved ? '/play-world?resume=1' : '/play-world';
  const nextStep = saved && saved.phase !== 'complete' ? STOPS.find(stop => !completed.includes(stop.id))?.id : null;
  const sourceLabel = saved?.inputSources.length
    ? saved.inputSources.map(source => source === 'microphone' ? 'микрофон' : 'касания').join(' и ')
    : 'пока нет завершённых действий';
  const updatedDate = typeof worldUpdatedAt === 'number' && Number.isFinite(worldUpdatedAt)
    ? new Date(worldUpdatedAt) : null;
  const worldUpdatedLabel = updatedDate && !Number.isNaN(updatedDate.getTime())
    ? updatedDate.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : null;

  return <main className="demo-results">
    <div className="dr-page">
      <header className="dr-nav">
        <Link className="dr-back" to="/play-world"><ArrowLeft size={18}/> На остров</Link>
        <span className="dr-product"><Sparkles size={18}/> SpeechSteps</span>
      </header>

      <section className="dr-intro" aria-labelledby="dr-title">
        <div className="dr-intro-copy">
          <span className="dr-audience">Для взрослого</span>
          <h1 id="dr-title">Маленькие шаги<br/>на острове Эха</h1>
          <p>Здесь видно, что получилось в игре и где можно продолжить.</p>
          <div className="dr-profile"><span>{child?.name?.charAt(0) || 'И'}</span><div><small>Текущий профиль</small><strong>{child?.name || 'Игрок'}</strong></div></div>
        </div>
        <div className="dr-island" aria-hidden="true"><img src="/echo-journey/shore.png" alt=""/><span>У каждого чуда свой темп.</span></div>
      </section>

      <section className="dr-section dr-camera-section" aria-labelledby="dr-camera-title">
        <div className="dr-section-head"><div className="dr-section-heading"><span className="dr-section-icon dr-camera-icon"><Camera size={23}/></span><div><h2 id="dr-camera-title">Сад звуков в 3D</h2><p>Камера ведёт лисёнка и оживляет остров</p></div></div>{camera.result && <span className="dr-status is-done">{camera.result.exercise === 'speech-garden' ? 'Три чуда ожили' : 'Маршрут пройден'}</span>}</div>
        <div className="dr-camera-body"><div className="dr-camera-explainer"><p>Ведите лисёнка указательным пальцем, а у трёх остановок играйте с улыбкой и простыми звуками: «И», «У», «А». По два коротких повтора с отдыхом — и мир оживает.</p><p>У цветка, рыбки и фонарика камера распознаёт движения рта. Для этой игры микрофон не нужен. Если камера недоступна, есть WASD, джойстик и кнопка помощи.</p></div><div className="dr-world-record">
          {camera.result ? <><h3>{camera.result.exercise === 'speech-garden' ? 'Последняя прогулка по саду' : 'Прежний маршрут с Искрами'}</h3><dl><div><dt>{camera.result.exercise === 'speech-garden' ? 'Оживлено мест' : 'Собрано Искр'}</dt><dd>{camera.result.collectedCount} из 3</dd></div><div><dt>Время</dt><dd>{elapsedLabel(camera.result.durationSeconds)}</dd></div></dl><p className="dr-controller-used">{camera.result.cameraDistance + camera.result.manualDistance === 0 ? 'Перемещение в этом прохождении не использовалось.' : `Передвижение: ${camera.result.controller === 'camera' ? 'пальцем перед камерой' : camera.result.controller === 'mixed' ? 'камера и клавиатура / джойстик' : 'клавиатура / джойстик'}.`}</p><p>{camera.result.exercise === 'speech-garden' ? 'Способ выполнения каждого упражнения указан ниже отдельно.' : camera.result.controller === 'keyboard' ? 'Для передвижения камера не использовалась.' : 'Распознанные камерой движения перемещали персонажа.'}</p></> : camera.status === 'invalid' || camera.status === 'unavailable' ? <><h3>Результат недоступен</h3><p>{camera.status === 'unavailable' ? 'Браузер не разрешил прочитать локальное сохранение маршрута.' : 'Сохранённые данные маршрута не удалось прочитать.'}</p></> : world.progress ? <><h3>Предыдущая прогулка</h3><dl><div><dt>Пройдено этапов</dt><dd>{world.progress.stages}</dd></div><div><dt>Собрано звёзд</dt><dd>{world.progress.stars}</dd></div></dl><p>Сохранённого итога сада пока нет. Способ управления в прежнем сохранении не указан.</p>{worldUpdatedLabel && <p>Обновлено {worldUpdatedLabel}</p>}</> : world.status === 'invalid' ? <><h3>Данные прогулки недоступны</h3><p>Прежнее сохранение не удалось прочитать. Пройдите сад, чтобы получить новый результат.</p></> : <><h3>Сад ждёт своего голоса</h3><p>Разбудите цветок, рыбку и фонарик. Здесь появятся выполненные повторы, время и способ управления.</p></>}
        </div></div>
        {camera.result && <GardenSummary result={camera.result}/>}
        <div className="dr-section-footer"><span><HardDrive size={16}/>{camera.status === 'session' ? 'Результат доступен до перезагрузки страницы: локальное сохранение недоступно' : camera.result ? 'Последний маршрут сохранён в этом браузере' : camera.status === 'unavailable' ? 'Локальное сохранение недоступно' : camera.status === 'invalid' ? 'Сохранённый результат не удалось прочитать' : 'Результат появится после трёх остановок сада'}</span><Link className="dr-secondary-link" to="/play-world?mode=camera"><Camera size={17}/>{camera.result ? 'В сад ещё раз' : 'Играть в саду звуков'}<ArrowRight size={17}/></Link></div>
      </section>

      <section className="dr-section" aria-labelledby="dr-story-title">
        <div className="dr-section-head"><div className="dr-section-heading"><span className="dr-section-icon"><Sparkles size={23}/></span><div><h2 id="dr-story-title">История с Үнчиком</h2><p>Одна глава, три маленьких чуда</p></div></div><span className={`dr-status ${completed.length === 3 ? 'is-done' : ''}`}>{story.status === 'loading' ? 'Загружаем' : saved ? `${completed.length} из 3 пройдено` : story.status === 'empty' ? 'Ещё не начато' : 'Данные недоступны'}</span></div>
        {story.status === 'unavailable' || story.status === 'invalid' ? <p className="dr-notice" role="status">{story.status === 'unavailable' ? 'Браузер не разрешил прочитать сохранение. Играть можно, но после закрытия страницы прогресс может не сохраниться.' : 'Сохранение истории не удалось прочитать. Открой остров, чтобы начать главу заново.'}</p> : <>
          <ol className="dr-trail">{STOPS.map((stop, index) => {
            const done = completed.includes(stop.id);
            const current = nextStep === stop.id;
            return <li key={stop.id} className={`${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}><span className="dr-step-symbol">{done ? <Check size={22}/> : <stop.icon size={22}/>}</span><div><h3>{stop.title}</h3><p>{stop.detail}</p><span className="dr-step-status">{done ? 'Пройдено' : current ? 'Можно продолжить' : saved ? 'Впереди' : `Шаг ${index + 1}`}</span></div></li>;
          })}</ol>
          {saved ? <dl className="dr-story-facts"><div><dt><Clock3 size={16}/> Время в главе</dt><dd>{elapsedLabel(saved.elapsedSeconds)}</dd></div><div><dt><Mic size={16}/> Способ прохождения</dt><dd>{sourceLabel}</dd></div><div><dt><Wind size={16}/> У мельницы</dt><dd>{saved.rounds} из 3 порывов</dd></div></dl> : story.status !== 'loading' && <p className="dr-empty">Пройдите первую сцену — здесь появятся выполненные шаги, время и способ прохождения.</p>}
        </>}
        <div className="dr-section-footer"><span><HardDrive size={16}/>{story.status === 'ready' ? 'Последняя история сохранена в этом браузере' : story.status === 'session' ? 'История доступна до перезагрузки страницы: локальное сохранение недоступно' : story.status === 'unavailable' || (story.status === 'empty' && story.storageStatus === 'unavailable') ? 'Локальное сохранение недоступно' : story.status === 'invalid' ? 'Сохранение повреждено или имеет неподдерживаемый формат' : story.status === 'loading' ? 'Читаем сохранённую историю' : 'Сохранение появится после начала игры'}</span><Link className="dr-primary-link" to={storyTarget}>{saved?.phase === 'complete' ? 'Открыть итог истории' : saved ? 'Продолжить историю' : 'Начать историю'}<ArrowRight size={17}/></Link></div>
      </section>

      <footer className="dr-footnote"><span className="dr-note-line"/><p>Это результат игровых действий. Оценка произношения и медицинские выводы здесь не формируются.</p><Link to={storyTarget}>{saved?.phase === 'complete' ? 'Открыть итог истории' : 'Продолжить на острове'} <ArrowRight size={15}/></Link></footer>
    </div>
  </main>;
}
