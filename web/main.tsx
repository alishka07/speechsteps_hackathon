import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const savedRoute = new URLSearchParams(window.location.search).get('__spa');
if (savedRoute?.startsWith('/') && !savedRoute.startsWith('//') && !savedRoute.includes('\\')) {
  window.history.replaceState(null, '', import.meta.env.BASE_URL.replace(/\/$/, '') + savedRoute);
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
