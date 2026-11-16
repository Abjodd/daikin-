import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './services/sessionGuard.js' // re-login when the BTP session expires
import App from './App.jsx'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
