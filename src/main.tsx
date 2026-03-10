import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyThemeToDocument, readStoredTheme } from './context/ThemeContext'
import './index.css'
import App from './App.tsx'

(window as Window & { PIMO_VERSION?: string }).PIMO_VERSION = __PIMO_VERSION__;

applyThemeToDocument(readStoredTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
