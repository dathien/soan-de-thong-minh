import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './components/ToastProvider.tsx';
import './index.css';

// Apply saved UI typography & motion preferences immediately to prevent layout flash
try {
  const raw = localStorage.getItem('sd_ui_prefs');
  if (raw) {
    const parsed = JSON.parse(raw) as { uiFontSize?: number; motionLevel?: string };
    if (parsed.uiFontSize === 16 || parsed.uiFontSize === 18 || parsed.uiFontSize === 20) {
      document.documentElement.style.setProperty('--ui-font-size', `${parsed.uiFontSize}px`);
    }
    if (
      parsed.motionLevel === 'off' ||
      parsed.motionLevel === 'gentle' ||
      parsed.motionLevel === 'lively'
    ) {
      document.documentElement.dataset.motion = parsed.motionLevel;
    }
  }
} catch {
  // Ignore malformed localStorage cache
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);
