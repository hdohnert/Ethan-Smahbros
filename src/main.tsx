import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/bungee/latin-400.css';
import '@fontsource/luckiest-guy/latin-400.css';
import './styles/global.css';
import { applyThemeToCss } from './theme';
import { App } from './App';

applyThemeToCss();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
