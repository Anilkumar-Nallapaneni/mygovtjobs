import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { prefetchLiveJobsSnapshot } from '@/lib/jobsApi'
import { applyColorMode } from './theme/designSystem'
import './styles/app.css'

try {
  const key = 'mygovtjobs-color-mode'
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

prefetchLiveJobsSnapshot()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </I18nextProvider>
  </React.StrictMode>
)
