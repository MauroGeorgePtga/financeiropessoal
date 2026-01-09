import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'

console.log('🚀 Iniciando aplicação...')
console.log('React versão:', React.version)
console.log('Ambiente:', import.meta.env.MODE)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)

console.log('✅ Aplicação renderizada!')
