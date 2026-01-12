import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  User, 
  Lock, 
  Bell, 
  Tag, 
  Palette, 
  Database,
  Save,
  Eye,
  EyeOff,
  Mail,
  Shield,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import './Configuracoes.css'

export default function Configuracoes() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [perfil, setPerfil] = useState({
    email: '',
    nome: '',
    id: ''
  })

  const [senhas, setSenhas] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  })

  const [mostrarSenhas, setMostrarSenhas] = useState({
    atual: false,
    nova: false,
    confirmar: false
  })

  useEffect(() => {
    if (user) {
      carregarDados()
    }
  }, [user])

  const carregarDados = async () => {
    try {
      setLoading(true)
      
      const { data: { user: userData } } = await supabase.auth.getUser()
      
      setPerfil({
        email: userData?.email || '',
        nome: userData?.user_metadata?.name || '',
        id: userData?.id || ''
      })

    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      showMessage('error', 'Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  const handleAlterarSenha = async (e) => {
    e.preventDefault()
    
    if (!senhas.novaSenha || !senhas.confirmarSenha) {
      showMessage('error', 'Preencha todos os campos de senha')
      return
    }

    if (senhas.novaSenha !== senhas.confirmarSenha) {
      showMessage('error', 'A nova senha e a confirmação não coincidem')
      return
    }

    if (senhas.novaSenha.length < 6) {
      showMessage('error', 'A nova senha deve ter pelo menos 6 caracteres')
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase.auth.updateUser({
        password: senhas.novaSenha
      })

      if (error) throw error

      showMessage('success', 'Senha alterada com sucesso!')
      setSenhas({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
    } catch (error) {
      console.error('Erro ao alterar senha:', error)
      showMessage('error', error.message || 'Erro ao alterar senha')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Carregando configurações...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Configurações</h1>
          <p>Gerencie suas preferências e dados da conta</p>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      {/* Informações da Conta */}
      <div className="config-section">
        <div className="config-section-header">
          <User size={24} />
          <h2>Informações da Conta</h2>
        </div>
        <div className="config-section-content">
          <div className="info-item">
            <label>
              <Mail size={16} />
              Email:
            </label>
            <span>{perfil.email}</span>
          </div>
          <div className="info-item">
            <label>
              <Shield size={16} />
              ID:
            </label>
            <span className="id-text">{perfil.id}</span>
          </div>
        </div>
      </div>

      {/* Em Desenvolvimento */}
      <div className="config-section desenvolvimento">
        <div className="config-section-header">
          <AlertCircle size={24} />
          <h2>Em Desenvolvimento</h2>
        </div>
        <div className="config-section-content">
          <p className="desenvolvimento-text">Em breve você poderá configurar:</p>
          <div className="recursos-futuros">
            <div className="recurso-item ativo">
              <CheckCircle size={18} className="check-icon" />
              <span>Alterar senha</span>
            </div>
            <div className="recurso-item disabled">
              <div className="check-box"></div>
              <span>Editar perfil</span>
            </div>
            <div className="recurso-item disabled">
              <div className="check-box"></div>
              <span>Preferências de notificação</span>
            </div>
            <div className="recurso-item disabled">
              <div className="check-box"></div>
              <span>Categorias padrão</span>
            </div>
            <div className="recurso-item disabled">
              <div className="check-box"></div>
              <span>Temas e cores</span>
            </div>
            <div className="recurso-item disabled">
              <div className="check-box"></div>
              <span>Backup de dados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alterar Senha */}
      <div className="config-section">
        <div className="config-section-header">
          <Lock size={24} />
          <h2>Alterar Senha</h2>
        </div>
        <div className="config-section-content">
          <form onSubmit={handleAlterarSenha} className="config-form">
            <div className="form-group-config">
              <label>Nova Senha</label>
              <div className="password-input-wrapper">
                <input
                  type={mostrarSenhas.nova ? 'text' : 'password'}
                  value={senhas.novaSenha}
                  onChange={(e) => setSenhas({ ...senhas, novaSenha: e.target.value })}
                  placeholder="Digite a nova senha (mínimo 6 caracteres)"
                  className="input-senha"
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setMostrarSenhas({ ...mostrarSenhas, nova: !mostrarSenhas.nova })}
                >
                  {mostrarSenhas.nova ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group-config">
              <label>Confirmar Nova Senha</label>
              <div className="password-input-wrapper">
                <input
                  type={mostrarSenhas.confirmar ? 'text' : 'password'}
                  value={senhas.confirmarSenha}
                  onChange={(e) => setSenhas({ ...senhas, confirmarSenha: e.target.value })}
                  placeholder="Confirme a nova senha"
                  className="input-senha"
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setMostrarSenhas({ ...mostrarSenhas, confirmar: !mostrarSenhas.confirmar })}
                >
                  {mostrarSenhas.confirmar ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary btn-salvar"
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Alterar Senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
