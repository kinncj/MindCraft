import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ErrorBoundary, installGlobalErrorLog } from './components/ErrorBoundary';
import { useGameStore } from './game/gameStore';

// The game is fully local, so exposing the store costs nothing and lets
// the Playwright tests read state and reach into the 3D world without
// pixel-perfect clicking.
declare global {
  interface Window {
    mindcraft: typeof useGameStore;
  }
}
window.mindcraft = useGameStore;
installGlobalErrorLog();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
