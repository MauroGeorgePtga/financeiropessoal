import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import './Auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [message, setMessage] = useState('')

  const { signIn, signUp, resetPassword } = useAuth()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
    } catch (error) {
      setError(error.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      await signUp(email, password)
      setMessage('Cadastro realizado! Verifique seu email para confirmar.')
      setEmail('')
      setPassword('')
    } catch (error) {
      setError(error.message || 'Erro ao fazer cadastro')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      await resetPassword(email)
      setMessage('Email de recuperação enviado! Verifique sua caixa de entrada.')
      setEmail('')
    } catch (error) {
      setError(error.message || 'Erro ao enviar email de recuperação')
    } finally {
      setLoading(false)
    }
  }

  if (showResetPassword) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1>Recuperar Senha</h1>
          <p className="auth-subtitle">Digite seu email para receber o link de recuperação</p>

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>

            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setShowResetPassword(false)
                setError('')
                setMessage('')
              }}
            >
              Voltar para o login
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (showRegister) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1>Criar Conta</h1>
          <p className="auth-subtitle">Preencha os dados para se cadastrar</p>

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                disabled={loading}
              />
              <small>Mínimo de 6 caracteres</small>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Criar Conta'}
            </button>

            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setShowRegister(false)
                setError('')
                setMessage('')
              }}
            >
              Já tem conta? Faça login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Financeiro Pessoal</h1>
        <p className="auth-subtitle">Faça login para acessar o sistema</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="auth-links">
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setShowResetPassword(true)
                setError('')
              }}
            >
              Esqueceu a senha?
            </button>
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setShowRegister(true)
                setError('')
              }}
            >
              Criar conta
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
