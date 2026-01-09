import { useAuth } from './contexts/AuthContext'
import Login from './components/auth/Login'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'

function App() {
  const { user } = useAuth()

  if (!user) {
    return <Login />
  }

  return (
    <Layout>
      <Dashboard />
    </Layout>
  )
}

export default App
