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

  const [preferencias, setPreferencias] = useState({
    tema: 'padrao',
    modo: 'claro',
    cor_primaria: '#667eea',
    cor_secundaria: '#764ba2',
    cor_sucesso: '#48bb78',
    cor_erro: '#f56565',
    cor_aviso: '#ed8936'
  })

  const temasPredefinidos = [
    { 
      id: 'padrao', 
      nome: 'Padrão', 
      cores: { 
        primaria: '#667eea', 
        secundaria: '#764ba2',
        sucesso: '#48bb78',
        erro: '#f56565',
        aviso: '#ed8936'
      } 
    },
    { 
      id: 'grafite', 
      nome: 'Grafite Claro', 
      cores: { 
        primaria: '#4a5568', 
        secundaria: '#2d3748',
        sucesso: '#48bb78',
        erro: '#f56565',
        aviso: '#ed8936'
      } 
    },
    { 
      id: 'azul', 
      nome: 'Azul Escuro', 
      cores: { 
        primaria: '#2c5282', 
        secundaria: '#2a4365',
        sucesso: '#38b2ac',
        erro: '#e53e3e',
        aviso: '#dd6b20'
      } 
    },
    { 
      id: 'verde', 
      nome: 'Verde Escuro', 
      cores: { 
        primaria: '#2f855a', 
        secundaria: '#276749',
        sucesso: '#48bb78',
        erro: '#f56565',
        aviso: '#ed8936'
      } 
    },
    { 
      id: 'roxo', 
      nome: 'Roxo Escuro', 
      cores: { 
        primaria: '#6b46c1', 
        secundaria: '#553c9a',
        sucesso: '#48bb78',
        erro: '#f56565',
        aviso: '#ed8936'
      } 
    },
    { 
      id: 'laranja', 
      nome: 'Laranja Escuro', 
      cores: { 
        primaria: '#c05621', 
        secundaria: '#9c4221',
        sucesso: '#48bb78',
        erro: '#f56565',
        aviso: '#ed8936'
      } 
    },
    { 
      id: 'rosa', 
      nome: 'Rosa Escuro', 
      cores: { 
        primaria: '#b83280', 
        secundaria: '#97266d',
        sucesso: '#48bb78',
        erro: '#f56565',
        aviso: '#ed8936'
      } 
    }
  ]

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

      // Buscar preferências de tema
      const { data: prefsData, error: prefsError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (prefsError && prefsError.code !== 'PGRST116') {
        console.error('Erro ao buscar preferências:', prefsError)
      }

      if (prefsData) {
        setPreferencias({
          tema: prefsData.tema || 'padrao',
          modo: prefsData.modo || 'claro',
          cor_primaria: prefsData.cor_primaria || '#667eea',
          cor_secundaria: prefsData.cor_secundaria || '#764ba2',
          cor_sucesso: prefsData.cor_sucesso || '#48bb78',
          cor_erro: prefsData.cor_erro || '#f56565',
          cor_aviso: prefsData.cor_aviso || '#ed8936'
        })
        aplicarTema(prefsData)
      }

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

  const aplicarTema = (prefs) => {
    const root = document.documentElement
    root.style.setProperty('--cor-primaria', prefs.cor_primaria)
    root.style.setProperty('--cor-secundaria', prefs.cor_secundaria)
    root.style.setProperty('--cor-sucesso', prefs.cor_sucesso)
    root.style.setProperty('--cor-erro', prefs.cor_erro)
    root.style.setProperty('--cor-aviso', prefs.cor_aviso)
    
    // Calcular se deve usar texto claro ou escuro
    const corTexto = getContrastColor(prefs.cor_primaria)
    root.style.setProperty('--cor-texto-primaria', corTexto)
  }

  // Função para calcular contraste (retorna #ffffff ou #000000)
  const getContrastColor = (hexColor) => {
    // Converter hex para RGB
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    // Calcular luminosidade
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    
    // Se luminosidade < 0.5, usar texto claro, senão texto escuro
    return luminance < 0.5 ? '#ffffff' : '#000000'
  }

  const handleSelecionarTema = async (temaId) => {
    const tema = temasPredefinidos.find(t => t.id === temaId)
    if (!tema) return

    const novasPrefs = {
      ...preferencias,
      tema: temaId,
      cor_primaria: tema.cores.primaria,
      cor_secundaria: tema.cores.secundaria,
      cor_sucesso: tema.cores.sucesso,
      cor_erro: tema.cores.erro,
      cor_aviso: tema.cores.aviso
    }

    setPreferencias(novasPrefs)
    aplicarTema(novasPrefs)
    await salvarPreferencias(novasPrefs)
  }

  const handleMudarModo = async (modo) => {
    const novasPrefs = { ...preferencias, modo }
    setPreferencias(novasPrefs)
    await salvarPreferencias(novasPrefs)
  }

  const salvarPreferencias = async (prefs) => {
    try {
      setSaving(true)

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          tema: prefs.tema,
          modo: prefs.modo,
          cor_primaria: prefs.cor_primaria,
          cor_secundaria: prefs.cor_secundaria,
          cor_sucesso: prefs.cor_sucesso,
          cor_erro: prefs.cor_erro,
          cor_aviso: prefs.cor_aviso
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error

      showMessage('success', 'Preferências salvas com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar preferências:', error)
      showMessage('error', 'Erro ao salvar preferências')
    } finally {
      setSaving(false)
    }
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
            <div className="recurso-item ativo">
              <CheckCircle size={18} className="check-icon" />
              <span>Temas e cores</span>
            </div>
            <div className="recurso-item disabled">
              <div className="check-box"></div>
              <span>Backup de dados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Temas e Cores */}
      <div className="config-section">
        <div className="config-section-header">
          <Palette size={24} />
          <h2>Temas e Cores</h2>
        </div>
        <div className="config-section-content">
          <div className="temas-container">
            <div className="temas-grid">
              {temasPredefinidos.map(tema => (
                <div
                  key={tema.id}
                  className={`tema-card ${preferencias.tema === tema.id ? 'ativo' : ''}`}
                  onClick={() => handleSelecionarTema(tema.id)}
                >
                  <div className="tema-preview">
                    <div 
                      className="cor-preview primaria" 
                      style={{ backgroundColor: tema.cores.primaria }}
                    ></div>
                    <div 
                      className="cor-preview secundaria" 
                      style={{ backgroundColor: tema.cores.secundaria }}
                    ></div>
                  </div>
                  <div className="tema-info">
                    <span className="tema-nome">{tema.nome}</span>
                    {preferencias.tema === tema.id && (
                      <CheckCircle size={18} className="tema-check" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="cores-personalizadas">
              <h3>Cores Atuais</h3>
              <div className="cores-preview-grid">
                <div className="cor-item">
                  <div 
                    className="cor-box" 
                    style={{ backgroundColor: preferencias.cor_primaria }}
                  ></div>
                  <span>Primária</span>
                </div>
                <div className="cor-item">
                  <div 
                    className="cor-box" 
                    style={{ backgroundColor: preferencias.cor_secundaria }}
                  ></div>
                  <span>Secundária</span>
                </div>
                <div className="cor-item">
                  <div 
                    className="cor-box" 
                    style={{ backgroundColor: preferencias.cor_sucesso }}
                  ></div>
                  <span>Sucesso</span>
                </div>
                <div className="cor-item">
                  <div 
                    className="cor-box" 
                    style={{ backgroundColor: preferencias.cor_erro }}
                  ></div>
                  <span>Erro</span>
                </div>
                <div className="cor-item">
                  <div 
                    className="cor-box" 
                    style={{ backgroundColor: preferencias.cor_aviso }}
                  ></div>
                  <span>Aviso</span>
                </div>
              </div>
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
