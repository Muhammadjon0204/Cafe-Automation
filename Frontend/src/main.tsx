import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@cafe/shared/theme/tokens.css'
import '@cafe/shared/theme/view-transitions.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
