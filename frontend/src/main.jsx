import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './Context/AuthContext.jsx'
import { ComparisonProvider } from './Context/ComparisonContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ComparisonProvider>
          <App />
        </ComparisonProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
