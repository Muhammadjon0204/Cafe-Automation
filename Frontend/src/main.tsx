import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setAuthStorage } from '@cafe/shared'
import * as clientTokenStorage from './auth/tokenStorage'
import { AuthProvider } from './auth/AuthContext'
import '@cafe/shared/theme/tokens.css'
import '@cafe/shared/theme/view-transitions.css'
import './index.css'
import App from './App.tsx'

// Keep the client-app's session out of admin/waiter/kitchen's `cafe_admin_*` localStorage keys
// (see shared/api/client.ts) - must run before any apiClient call.
setAuthStorage(clientTokenStorage)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
