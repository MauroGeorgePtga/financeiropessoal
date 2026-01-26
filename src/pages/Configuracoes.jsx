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
  CheckCircle,
  Users,
  UserPlus,
  UserX,
  Download,
  Upload,
  Trash2,
  Edit,
  KeyRound,
  Power,
  X,
  Monitor,
  Smartphone,
  Clock,
  Activity
} from 'lucide-react'
import './Configuracoes.css'

export default function Configuracoes() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [isAdmin, setIsAdmin] = useState(false)
  const [sessoes, setSessoes] = useState([])
  const [loadingSessoes, setLoadingSessoes] = useState(false)
  
  const [perfil, setPerfil] = useState({
    email: '',
    nome: '',
    telefone: '',
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

  // Estados para gerenciamento de usuários
  const [usuarios, setUsuarios] = useState([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [modalNovoUsuario, setModalNovoUsuario] = useState(false)
  const [modalResetSenha, setModalResetSenha] = useState({ show: false, userId: null, email: '' })
  const [novoUsuario, setNovoUsuario] = useState({
    email: '',
    senha: '',
    nome: '',
    role: 'user'
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
      carregarSessoes()
    }
  }, [user])

  const carregarSessoes = async () => {
    try {
      setLoadingSessoes(true)
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('accessed_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setSessoes(data || [])
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
    } finally {
      setLoadingSessoes(false)
    }
  }

  const carregarDados = async () => {
    try {
      setLoading(true)
      
      const { data: { user: userData } } = await supabase.auth.getUser()
      
      // Verificar se é admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, is_active')
        .eq('user_id', user.id)
        .single()

      const adminStatus = roleData?.role === 'admin' && roleData?.is_active
      setIsAdmin(adminStatus)

      // Buscar perfil
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setPerfil({
        email: userData?.email || '',
        nome: profileData?.name || userData?.user_metadata?.name || '',
        telefone: profileData?.phone || '',
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

      // Se for admin, carregar lista de usuários
      if (adminStatus) {
        carregarUsuarios()
      }

    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      showMessage('error', 'Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const carregarUsuarios = async () => {
    try {
      setLoadingUsuarios(true)

      // Buscar todos os usuários da view
      const { data: usuariosData, error } = await supabase
        .from('vw_usuarios_completos')
        .select('*')

      if (error) throw error

      // Formatar dados
      const usuariosCompletos = (usuariosData || []).map(u => ({
        id: u.id,
        email: u.email,
        nome: u.name || 'Sem nome',
        telefone: u.phone || '',
        role: u.role || 'user',
        is_active: u.is_active ?? true,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at
      }))

      // Ordenar: admin primeiro, depois por nome
      usuariosCompletos.sort((a, b) => {
        // Admin sempre vem primeiro
        if (a.role === 'admin' && b.role !== 'admin') return -1
        if (a.role !== 'admin' && b.role === 'admin') return 1
        // Se ambos são admin ou ambos são user, ordenar por nome
        return a.nome.localeCompare(b.nome)
      })

      setUsuarios(usuariosCompletos)

    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      showMessage('error', 'Erro ao carregar usuários')
    } finally {
      setLoadingUsuarios(false)
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
    
    const corTexto = getContrastColor(prefs.cor_primaria)
    root.style.setProperty('--cor-texto-primaria', corTexto)
  }

  const getContrastColor = (hexColor) => {
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    
    return luminance < 0.5 ? '#ffffff' : '#000000'
  }

  const handleSalvarPerfil = async (e) => {
    e.preventDefault()
    
    try {
      setSaving(true)

      // Atualizar ou inserir perfil
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          name: perfil.nome,
          phone: perfil.telefone
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error

      showMessage('success', 'Perfil atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      showMessage('error', 'Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
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

  const handleToggleUsuario = async (userId, isActive) => {
    if (userId === user.id) {
      showMessage('error', 'Você não pode desativar sua própria conta')
      return
    }

    if (!confirm(`Deseja ${isActive ? 'desativar' : 'ativar'} este usuário?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: !isActive })
        .eq('user_id', userId)

      if (error) throw error

      showMessage('success', `Usuário ${!isActive ? 'ativado' : 'desativado'} com sucesso!`)
      carregarUsuarios()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      showMessage('error', 'Erro ao alterar status do usuário')
    }
  }

  const handleExcluirUsuario = async (userId, email) => {
    if (userId === user.id) {
      showMessage('error', 'Você não pode excluir sua própria conta')
      return
    }

    showMessage('error', 'Função de exclusão em desenvolvimento. Use o painel do Supabase para excluir usuários.')
  }

  const handleResetSenhaUsuario = async (senha) => {
    showMessage('error', 'Função de reset de senha em desenvolvimento. Use o painel do Supabase.')
    setModalResetSenha({ show: false, userId: null, email: '' })
  }

  const handleCriarUsuario = async (e) => {
    e.preventDefault()
    showMessage('error', 'Função de criar usuário em desenvolvimento. Use o painel do Supabase Auth para criar novos usuários.')
    setModalNovoUsuario(false)
  }

  const handleExportarDados = async () => {
    try {
      setSaving(true)
      showMessage('success', 'Preparando exportação...')

      // Buscar todos os dados do usuário
      const [
        { data: contas },
        { data: transacoes },
        { data: categorias },
        { data: investimentosOp },
        { data: investimentosCot },
        { data: preferences },
        { data: profile }
      ] = await Promise.all([
        supabase.from('contas_bancarias').select('*').eq('user_id', user.id),
        supabase.from('transacoes').select('*').eq('user_id', user.id),
        supabase.from('categorias').select('*').eq('user_id', user.id),
        supabase.from('investimentos_operacoes').select('*').eq('user_id', user.id),
        supabase.from('investimentos_cotacoes').select('*').eq('user_id', user.id),
        supabase.from('user_preferences').select('*').eq('user_id', user.id),
        supabase.from('user_profiles').select('*').eq('user_id', user.id)
      ])

      const dadosCompletos = {
        versao: '1.0',
        data_exportacao: new Date().toISOString(),
        user_id: user.id,
        email: perfil.email,
        dados: {
          profile: profile?.[0] || null,
          preferences: preferences?.[0] || null,
          contas_bancarias: contas || [],
          transacoes: transacoes || [],
          categorias: categorias || [],
          investimentos_operacoes: investimentosOp || [],
          investimentos_cotacoes: investimentosCot || []
        }
      }

      // Criar arquivo para download
      const dataStr = JSON.stringify(dadosCompletos, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `backup_financeiro_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showMessage('success', 'Dados exportados com sucesso!')
    } catch (error) {
      console.error('Erro ao exportar dados:', error)
      showMessage('error', 'Erro ao exportar dados')
    } finally {
      setSaving(false)
    }
  }

  const handleImportarDados = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!confirm('ATENÇÃO: A importação irá SUBSTITUIR todos os seus dados atuais. Deseja continuar?')) {
      event.target.value = ''
      return
    }

    try {
      setSaving(true)
      showMessage('success', 'Processando importação...')

      const text = await file.text()
      const dados = JSON.parse(text)

      // Validar estrutura
      if (!dados.versao || !dados.dados) {
        throw new Error('Arquivo de backup inválido')
      }

      // Deletar dados atuais
      await Promise.all([
        supabase.from('transacoes').delete().eq('user_id', user.id),
        supabase.from('investimentos_operacoes').delete().eq('user_id', user.id),
        supabase.from('investimentos_cotacoes').delete().eq('user_id', user.id),
        supabase.from('contas_bancarias').delete().eq('user_id', user.id),
        supabase.from('categorias').delete().eq('user_id', user.id)
      ])

      // Importar novos dados
      const { dados: novos } = dados

      if (novos.categorias?.length) {
        await supabase.from('categorias').insert(
          novos.categorias.map(c => ({ ...c, user_id: user.id }))
        )
      }

      if (novos.contas_bancarias?.length) {
        await supabase.from('contas_bancarias').insert(
          novos.contas_bancarias.map(c => ({ ...c, user_id: user.id }))
        )
      }

      if (novos.transacoes?.length) {
        await supabase.from('transacoes').insert(
          novos.transacoes.map(t => ({ ...t, user_id: user.id }))
        )
      }

      if (novos.investimentos_operacoes?.length) {
        await supabase.from('investimentos_operacoes').insert(
          novos.investimentos_operacoes.map(i => ({ ...i, user_id: user.id }))
        )
      }

      if (novos.investimentos_cotacoes?.length) {
        await supabase.from('investimentos_cotacoes').insert(
          novos.investimentos_cotacoes.map(i => ({ ...i, user_id: user.id }))
        )
      }

      if (novos.preferences) {
        await supabase.from('user_preferences').upsert({
          ...novos.preferences,
          user_id: user.id
        }, { onConflict: 'user_id' })
      }

      if (novos.profile) {
        await supabase.from('user_profiles').upsert({
          ...novos.profile,
          user_id: user.id
        }, { onConflict: 'user_id' })
      }

      showMessage('success', 'Dados importados com sucesso! Recarregando página...')
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      console.error('Erro ao importar dados:', error)
      showMessage('error', error.message || 'Erro ao importar dados')
    } finally {
      setSaving(false)
      event.target.value = ''
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
        <div className="perfil-badge">
          <User size={20} />
          <span>{perfil.nome || 'Usuário'}</span>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      {/* Meu Perfil */}
      <div className="config-section">
        <div className="config-section-header">
          <User size={24} />
          <h2>Meu Perfil</h2>
        </div>
        <div className="config-section-content">
          <form onSubmit={handleSalvarPerfil} className="config-form">
            <div className="form-group-config">
              <label>
                <Mail size={16} />
                Email
              </label>
              <input
                type="email"
                value={perfil.email}
                disabled
                className="input-disabled"
              />
              <small>O email não pode ser alterado</small>
            </div>

            <div className="form-group-config">
              <label>
                <User size={16} />
                Nome
              </label>
              <input
                type="text"
                value={perfil.nome}
                onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="form-group-config">
              <label>
                <Mail size={16} />
                Telefone
              </label>
              <input
                type="tel"
                value={perfil.telefone}
                onChange={(e) => setPerfil({ ...perfil, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="info-item">
              <label>
                <Shield size={16} />
                ID:
              </label>
              <span className="id-text">{perfil.id}</span>
            </div>

            <button 
              type="submit" 
              className="btn-primary btn-salvar"
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Salvar Perfil'}
            </button>
          </form>
        </div>
      </div>

      {/* Gerenciamento de Usuários (apenas para admins) */}
      {isAdmin && (
        <section className="config-section">
          <div className="section-header">
            <div className="section-title">
              <Users size={24} />
              <h2>Gerenciamento de Usuários</h2>
            </div>
          </div>
          <div className="config-card">
            <button 
              className="btn-novo-usuario"
              onClick={() => setModalNovoUsuario(true)}
            >
              <UserPlus size={18} />
              Novo Usuário
            </button>

            {loadingUsuarios ? (
              <div className="loading-sessions">Carregando usuários...</div>
            ) : (
              <div className="usuarios-table-wrapper">
                <table className="usuarios-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Função</th>
                      <th>Status</th>
                      <th>Último Acesso</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map(usuario => (
                      <tr key={usuario.id}>
                        <td>{usuario.nome}</td>
                        <td>{usuario.email}</td>
                        <td>
                          <span className={`funcao-badge ${usuario.role}`}>
                            {usuario.role === 'admin' ? 'Administrador' : 'Usuário'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${usuario.is_active ? 'ativo' : 'inativo'}`}>
                            {usuario.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td>
                          {usuario.last_sign_in 
                            ? new Date(usuario.last_sign_in).toLocaleDateString('pt-BR')
                            : 'Nunca'
                          }
                        </td>
                        <td>
                          <div className="acoes-cell">
                            <button
                              className="btn-icon-table btn-toggle"
                              onClick={() => handleToggleUsuario(usuario.id, usuario.is_active)}
                              title={usuario.is_active ? 'Desativar' : 'Ativar'}
                              disabled={usuario.id === user.id}
                            >
                              <Power size={16} />
                            </button>
                            <button
                              className="btn-icon-table btn-reset"
                              onClick={() => setModalResetSenha({ 
                                show: true, 
                                userId: usuario.id,
                                email: usuario.email 
                              })}
                              title="Resetar senha"
                            >
                              <KeyRound size={16} />
                            </button>
                            <button
                              className="btn-icon-table btn-delete"
                              onClick={() => handleExcluirUsuario(usuario.id, usuario.email)}
                              title="Excluir"
                              disabled={usuario.id === user.id}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Backup de Dados */}
      <div className="config-section">
        <div className="config-section-header">
          <Database size={24} />
          <h2>Backup de Dados</h2>
        </div>
        <div className="config-section-content">
          <div className="backup-container">
            <div className="backup-item">
              <div className="backup-info">
                <Download size={24} />
                <div>
                  <h3>Exportar Dados</h3>
                  <p>Faça download de todos os seus dados em formato JSON</p>
                </div>
              </div>
              <button 
                className="btn-primary"
                onClick={handleExportarDados}
                disabled={saving}
              >
                <Download size={18} />
                Exportar
              </button>
            </div>

            <div className="backup-item">
              <div className="backup-info">
                <Upload size={24} />
                <div>
                  <h3>Importar Dados</h3>
                  <p>Restaure seus dados de um backup anterior</p>
                  <small className="warning-text">⚠️ Isso substituirá todos os dados atuais</small>
                </div>
              </div>
              <label className="btn-primary btn-file-input">
                <Upload size={18} />
                Importar
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleImportarDados}
                  disabled={saving}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Temas e Cores */}
      <section className="config-section">
        <div className="section-header">
          <div className="section-title">
            <Palette size={24} />
            <h2>Temas e Cores</h2>
          </div>
        </div>
        <div className="config-card">
          <div className="temas-grid-horizontal">
            {temasPredefinidos.map(tema => (
              <div
                key={tema.id}
                className={`tema-card-horizontal ${preferencias.tema === tema.id ? 'ativo' : ''}`}
                onClick={() => handleSelecionarTema(tema.id)}
              >
                <div className="tema-cores">
                  <div 
                    className="cor-circle" 
                    style={{ backgroundColor: tema.cores.primaria }}
                    title="Primária"
                  ></div>
                  <div 
                    className="cor-circle" 
                    style={{ backgroundColor: tema.cores.secundaria }}
                    title="Secundária"
                  ></div>
                  <div 
                    className="cor-circle" 
                    style={{ backgroundColor: tema.cores.sucesso }}
                    title="Sucesso"
                  ></div>
                  <div 
                    className="cor-circle" 
                    style={{ backgroundColor: tema.cores.erro }}
                    title="Erro"
                  ></div>
                  <div 
                    className="cor-circle" 
                    style={{ backgroundColor: tema.cores.aviso }}
                    title="Aviso"
                  ></div>
                </div>
                <div className="tema-nome-wrapper">
                  <span className="tema-nome">{tema.nome}</span>
                  {preferencias.tema === tema.id && (
                    <CheckCircle size={18} className="tema-check" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alterar Senha */}
      <section className="config-section">
        <div className="section-header">
          <div className="section-title">
            <Lock size={24} />
            <h2>Alterar Senha</h2>
          </div>
        </div>
        <div className="config-card">
          <form onSubmit={handleAlterarSenha} className="senha-form-grid">
            <div className="senha-group">
              <label>Nova Senha</label>
              <div className="senha-input-wrapper">
                <input
                  type={mostrarSenhas.nova ? 'text' : 'password'}
                  value={senhas.novaSenha}
                  onChange={(e) => setSenhas({ ...senhas, novaSenha: e.target.value })}
                  placeholder="Digite a nova senha (mínimo 6 caracteres)"
                  required
                />
                <button
                  type="button"
                  className="senha-toggle"
                  onClick={() => setMostrarSenhas({ ...mostrarSenhas, nova: !mostrarSenhas.nova })}
                >
                  {mostrarSenhas.nova ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="senha-group">
              <label>Confirmar Nova Senha</label>
              <div className="senha-input-wrapper">
                <input
                  type={mostrarSenhas.confirmar ? 'text' : 'password'}
                  value={senhas.confirmarSenha}
                  onChange={(e) => setSenhas({ ...senhas, confirmarSenha: e.target.value })}
                  placeholder="Confirme a nova senha"
                  required
                />
                <button
                  type="button"
                  className="senha-toggle"
                  onClick={() => setMostrarSenhas({ ...mostrarSenhas, confirmar: !mostrarSenhas.confirmar })}
                >
                  {mostrarSenhas.confirmar ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-alterar-senha"
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Alterar Senha'}
            </button>
          </form>
        </div>
      </section>

      {/* Histórico de Acessos */}
      <section className="config-section">
        <div className="section-header">
          <div className="section-title">
            <Activity size={24} />
            <h2>Histórico de Acessos</h2>
          </div>
        </div>

        <div className="config-card">
          <p className="section-description">
            Registro automático dos últimos 20 acessos ao sistema (rastreado mesmo sem logout)
          </p>

          {loadingSessoes ? (
            <div className="loading-sessions">Carregando...</div>
          ) : sessoes.length === 0 ? (
            <div className="empty-sessions">
              <Clock size={48} />
              <p>Nenhum acesso registrado</p>
            </div>
          ) : (
            <div className="sessions-list">
              {sessoes.map((sessao, index) => {
                const isAtual = index === 0
                const duracao = sessao.session_duration 
                  ? `${Math.floor(sessao.session_duration / 60)}min`
                  : '-'
                
                const getDeviceIcon = (type) => {
                  if (type === 'mobile' || type === 'tablet') return <Smartphone size={20} />
                  return <Monitor size={20} />
                }

                return (
                  <div key={sessao.id} className="session-item">
                    <div className="session-icon">
                      {getDeviceIcon(sessao.device_type)}
                    </div>
                    <div className="session-info">
                      <div className="session-device">
                        <strong>{sessao.browser}</strong> em {sessao.os}
                        {isAtual && <span className="badge-atual">ATUAL</span>}
                      </div>
                      <div className="session-details">
                        <span className="session-date">
                          <Clock size={14} />
                          {new Date(sessao.accessed_at).toLocaleString('pt-BR')}
                        </span>
                        {sessao.logout_at && (
                          <span className="session-logout">
                            Saiu: {new Date(sessao.logout_at).toLocaleString('pt-BR')}
                          </span>
                        )}
                        <span className="session-duration">Duração: {duracao}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Modal Novo Usuário */}
      {modalNovoUsuario && (
        <div className="modal-overlay" onClick={() => setModalNovoUsuario(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <UserPlus size={24} />
                Novo Usuário
              </h2>
              <button className="btn-close" onClick={() => setModalNovoUsuario(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCriarUsuario}>
              <div className="form-group-config">
                <label>Nome</label>
                <input
                  type="text"
                  value={novoUsuario.nome}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div className="form-group-config">
                <label>Email</label>
                <input
                  type="email"
                  value={novoUsuario.email}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>

              <div className="form-group-config">
                <label>Senha</label>
                <input
                  type="password"
                  value={novoUsuario.senha}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, senha: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>

              <div className="form-group-config">
                <label>Função</label>
                <select
                  value={novoUsuario.role}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, role: e.target.value })}
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setModalNovoUsuario(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={saving}
                >
                  <UserPlus size={18} />
                  {saving ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Senha */}
      {modalResetSenha.show && (
        <div className="modal-overlay" onClick={() => setModalResetSenha({ show: false, userId: null, email: '' })}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <KeyRound size={24} />
                Resetar Senha
              </h2>
              <button 
                className="btn-close" 
                onClick={() => setModalResetSenha({ show: false, userId: null, email: '' })}
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault()
              const senha = e.target.senha.value
              if (senha.length < 6) {
                showMessage('error', 'A senha deve ter pelo menos 6 caracteres')
                return
              }
              handleResetSenhaUsuario(senha)
            }}>
              <div className="form-group-config">
                <label>Usuário: <strong>{modalResetSenha.email}</strong></label>
              </div>
              <div className="form-group-config">
                <label>Nova Senha</label>
                <input
                  type="password"
                  name="senha"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setModalResetSenha({ show: false, userId: null, email: '' })}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <KeyRound size={18} />
                  Resetar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
