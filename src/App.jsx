import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './components/auth/Login'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Contas from './pages/Contas'
import Transacoes from './pages/Transacoes'
import Categorias from './pages/Categorias'
import Investimentos from './pages/Investimentos'
import CadastroAtivos from './pages/CadastroAtivos'

function App() {
  const { user, loading } = useAuth()

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          textAlign: 'center'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#666' }}>Carregando...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contas" element={<Contas />} />
          <Route path="/transacoes" element={<Transacoes />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/investimentos" element={<Investimentos />} />
          <Route path="/cadastro-ativos" element={<CadastroAtivos />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
