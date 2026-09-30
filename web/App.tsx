import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SafeAreaProvider } from './ui';
import { IS_HACKATHON_DEMO } from './demo/config';

const FullApp = lazy(() => import('./FullApp'));
const PlayWorld = lazy(() => import('../app/play-world.web'));
const DemoResults = lazy(() => import('./demo/DemoResults'));
const Loading = () => <div className="loading-screen" role="status">Готовим Остров Эха…</div>;

export default function App() {
  if (!IS_HACKATHON_DEMO) return <Suspense fallback={<Loading/>}><FullApp/></Suspense>;
  return <BrowserRouter basename={import.meta.env.BASE_URL}><SafeAreaProvider><Suspense fallback={<Loading/>}>
    <Routes>
      <Route path="/play-world" element={<PlayWorld/>}/>
      <Route path="/demo/results" element={<DemoResults/>}/>
      <Route path="/parent/progress" element={<Navigate to="/demo/results" replace/>}/>
      <Route path="*" element={<Navigate to="/play-world" replace/>}/>
    </Routes>
  </Suspense></SafeAreaProvider></BrowserRouter>;
}
