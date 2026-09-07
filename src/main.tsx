import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { WidgetErrorBoundary } from './components/WidgetErrorBoundary'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WidgetErrorBoundary>
      <App />
    </WidgetErrorBoundary>
  </StrictMode>,
)
