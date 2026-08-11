import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {installDevice} from './ui/device';
import './index.css';

// Before the first render, so the phone layout is right on the first paint rather than
// arriving as a reflow the user can watch happen.
installDevice();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
