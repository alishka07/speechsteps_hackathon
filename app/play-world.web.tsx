import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from '@/web/router';
import EchoJourney from '@/web/echo/EchoJourney';
import { IS_HACKATHON_DEMO } from '@/web/demo/config';

// Load Three.js only when the player chooses the camera adventure.
const FreeRoamWorld = lazy(() => import('./free-roam-world.web'));

export default function PlayWorldWebScreen() {
  const [query, setQuery] = useSearchParams();
  const inWorld = query.get('mode') === 'camera';
  const childId = useAppStore(state => state.parentChildId);
  const router = useRouter();
  const showResults = () => router.push(IS_HACKATHON_DEMO ? '/demo/results' : '/parent/progress');
  return !inWorld
    ? <EchoJourney key={childId} childId={childId} resumeOnLoad={query.get('resume') === '1'} onExplore={() => setQuery({ mode: 'camera' })} onExit={showResults}/>
    : <Suspense fallback={<div className="loading-screen" role="status">Готовим остров для прогулки…</div>}><FreeRoamWorld key={childId} onBackToStory={() => setQuery({})} onFinish={showResults}/></Suspense>;
}
