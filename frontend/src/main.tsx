import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/i18n'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { applyColorMode } from './theme/designSystem'
import './styles/global.css'

try {
  const key = 'bharatnaukri-color-mode'
  let m = localStorage.getItem(key)
  if (m === 'night') {
    localStorage.setItem(key, 'dark')
    m = 'dark'
  }
  if (m === 'bw') applyColorMode('bw')
  else if (m === 'dark') applyColorMode('dark')
  else applyColorMode('bw')
} catch {
  applyColorMode('bw')
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
