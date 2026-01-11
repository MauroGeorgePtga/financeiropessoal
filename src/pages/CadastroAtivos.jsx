import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Edit2, Trash2, Search, X, Upload, Download } from 'lucide-react'
import './CadastroAtivos.css'

export default function CadastroAtivos() {
  const { user } = useAuth()
  const [ativos, setAtivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAtivo, setEditingAtivo] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    ticker: '',
    nome_ativo: '',
    tipo_ativo: 'acao'
  })

  const tiposAtivo = [
    { value: 'acao', label: 'Ação', emoji: '📈' },
    { value: 'fii', label: 'FII', emoji: '🏢' },
    { value: 'renda_fixa', label: 'Renda Fixa', emoji: '💰' },
    { value: 'etf', label: 'ETF', emoji: '📊' },
    { value: 'fundo', label: 'Fundo', emoji: '💼' },
    { value: 'cripto', label: 'Cripto', emoji: '🪙' }
  ]

  useEffect(() => {
    if (user) {
      carregarAtivos()
    }
  }, [user])

  const carregarAtivos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ativos_cadastrados')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('ticker', { ascending: true })

      if (error) throw error
      setAtivos(data || [])
    } catch (error) {
      console.error('Erro ao carregar ativos:', error)
      setError('Erro ao carregar ativos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const dadosAtivo = {
        ticker: formData.ticker.toUpperCase().trim(),
        nome_ativo: formData.nome_ativo.trim(),
        tipo_ativo: formData.tipo_ativo,
        user_id: user.id
      }

      if (editingAtivo) {
        const { error } = await supabase
          .from('ativos_cadastrados')
          .update(dadosAtivo)
          .eq('id', editingAtivo.id)

        if (error) throw error
        setSuccess('Ativo atualizado!')
      } else {
        const { error } = await supabase
          .from('ativos_cadastrados')
          .insert([dadosAtivo])

        if (error) {
          if (error.code === '23505') {
            throw new Error('Ticker já cadastrado!')
          }
          throw error
        }
        setSuccess('Ativo cadastrado!')
      }

      await carregarAtivos()
      fecharModal()
    } catch (error) {
      console.error('Erro:', error)
      setError(error.message || 'Erro ao salvar ativo')
    }
  }

  const handleEditar = (ativo) => {
    setEditingAtivo(ativo)
    setFormData({
      ticker: ativo.ticker,
      nome_ativo: ativo.nome_ativo,
      tipo_ativo: ativo.tipo_ativo
    })
    setShowModal(true)
  }

  const handleExcluir = async (id) => {
    if (!confirm('Excluir este ativo?')) return

    try {
      const { error } = await supabase
        .from('ativos_cadastrados')
        .delete()
        .eq('id', id)

      if (error) throw error
      setSuccess('Ativo excluído!')
      await carregarAtivos()
    } catch (error) {
      setError('Erro ao excluir ativo')
    }
  }

  const importarAtivosPadrao = async () => {
    if (!confirm('Importar lista padrão de ativos? Isso pode levar alguns segundos.')) return

    setLoading(true)
    try {
      // Importar do arquivo ativosBrasileiros.js
      const { ativosBrasileiros } = await import('./ativosBrasileiros')
      
      const ativosParaImportar = Object.entries(ativosBrasileiros).map(([ticker, nome]) => {
        let tipo = 'acao'
        
        if (ticker.endsWith('11') || ticker.endsWith('11B')) {
          if (['BOVA11', 'IVVB11', 'SMAL11', 'PIBB11', 'DIVO11'].includes(ticker)) {
            tipo = 'etf'
          } else {
            tipo = 'fii'
          }
        } else if (['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'ADA', 'XRP', 'DOGE', 'DOT', 'MATIC'].includes(ticker)) {
          tipo = 'cripto'
        }

        return {
          ticker,
          nome_ativo: nome,
          tipo_ativo: tipo,
          user_id: user.id
        }
      })

      const { error } = await supabase
        .from('ativos_cadastrados')
        .upsert(ativosParaImportar, { 
          onConflict: 'user_id,ticker',
          ignoreDuplicates: true 
        })

      if (error) throw error
      
      setSuccess(`${ativosParaImportar.length} ativos importados!`)
      await carregarAtivos()
    } catch (error) {
      console.error('Erro ao importar:', error)
      setError('Erro ao importar ativos')
    } finally {
      setLoading(false)
    }
  }

  const exportarAtivos = () => {
    const csv = ['ticker,nome_ativo,tipo_ativo']
    ativos.forEach(ativo => {
      csv.push(`${ativo.ticker},${ativo.nome_ativo},${ativo.tipo_ativo}`)
    })

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ativos_cadastrados.csv'
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const abrirModal = () => {
    setEditingAtivo(null)
    setFormData({
      ticker: '',
      nome_ativo: '',
      tipo_ativo: 'acao'
    })
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    setEditingAtivo(null)
  }

  const ativosFiltrados = ativos.filter(ativo => {
    const matchSearch = 
      ativo.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ativo.nome_ativo.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchTipo = filtroTipo === 'todos' || ativo.tipo_ativo === filtroTipo

    return matchSearch && matchTipo
  })

  // Estatísticas
  const estatisticas = tiposAtivo.map(tipo => ({
    ...tipo,
    count: ativos.filter(a => a.tipo_ativo === tipo.value).length
  }))

  if (loading && ativos.length === 0) {
    return (
      <div className="page-container">
        <div className="loading">Carregando ativos...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>📋 Cadastro de Ativos</h1>
          <p>Gerencie os ativos disponíveis para operações</p>
        </div>
        <div className="header-actions">
          {ativos.length === 0 && (
            <button className="btn-secondary" onClick={importarAtivosPadrao}>
              <Upload size={20} />
              Importar Lista Padrão
            </button>
          )}
          {ativos.length > 0 && (
            <button className="btn-secondary" onClick={exportarAtivos}>
              <Download size={20} />
              Exportar CSV
            </button>
          )}
          <button className="btn-primary" onClick={abrirModal}>
            <Plus size={20} />
            Novo Ativo
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {/* Estatísticas */}
      <div className="stats-cards">
        {estatisticas.map(stat => (
          <div 
            key={stat.value} 
            className={`stat-card ${filtroTipo === stat.value ? 'active' : ''}`}
            onClick={() => setFiltroTipo(stat.value)}
          >
            <span className="stat-emoji">{stat.emoji}</span>
            <div className="stat-info">
              <span className="stat-label">{stat.label}</span>
              <span className="stat-count">{stat.count}</span>
            </div>
          </div>
        ))}
        <div 
          className={`stat-card stat-total ${filtroTipo === 'todos' ? 'active' : ''}`}
          onClick={() => setFiltroTipo('todos')}
        >
          <span className="stat-emoji">📊</span>
          <div className="stat-info">
            <span className="stat-label">Total</span>
            <span className="stat-count">{ativos.length}</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-container">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar por ticker ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          value={filtroTipo} 
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="filtro-select"
        >
          <option value="todos">Todos os tipos</option>
          {tiposAtivo.map(tipo => (
            <option key={tipo.value} value={tipo.value}>
              {tipo.emoji} {tipo.label}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de Ativos */}
      {ativosFiltrados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h2>Nenhum ativo cadastrado</h2>
          <p>Cadastre ativos para usar no lançamento de operações</p>
          <div className="empty-actions">
            <button className="btn-secondary" onClick={importarAtivosPadrao}>
              <Upload size={20} />
              Importar Lista Padrão
            </button>
            <button className="btn-primary" onClick={abrirModal}>
              <Plus size={20} />
              Cadastrar Ativo
            </button>
          </div>
        </div>
      ) : (
        <div className="ativos-table-container">
          <table className="ativos-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Ticker</th>
                <th>Nome</th>
                <th className="actions-col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ativosFiltrados.map((ativo) => {
                const tipoConfig = tiposAtivo.find(t => t.value === ativo.tipo_ativo)
                return (
                  <tr key={ativo.id}>
                    <td>
                      <span className="tipo-badge">
                        {tipoConfig?.emoji} {tipoConfig?.label}
                      </span>
                    </td>
                    <td>
                      <strong>{ativo.ticker}</strong>
                    </td>
                    <td>{ativo.nome_ativo}</td>
                    <td className="actions-col">
                      <button
                        className="btn-acao"
                        onClick={() => handleEditar(ativo)}
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-acao btn-delete"
                        onClick={() => handleExcluir(ativo.id)}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="table-footer">
            <span>Mostrando {ativosFiltrados.length} de {ativos.length} ativo(s)</span>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content modal-ativo" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAtivo ? 'Editar Ativo' : 'Novo Ativo'}</h2>
              <button className="btn-close" onClick={fecharModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tipo *</label>
                <select
                  value={formData.tipo_ativo}
                  onChange={(e) => setFormData({ ...formData, tipo_ativo: e.target.value })}
                  required
                >
                  {tiposAtivo.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.emoji} {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Ticker *</label>
                <input
                  type="text"
                  value={formData.ticker}
                  onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                  placeholder="PETR4"
                  maxLength="20"
                  disabled={!!editingAtivo}
                  required
                />
                {editingAtivo && (
                  <small className="form-hint">Ticker não pode ser alterado</small>
                )}
              </div>

              <div className="form-group">
                <label>Nome do Ativo *</label>
                <input
                  type="text"
                  value={formData.nome_ativo}
                  onChange={(e) => setFormData({ ...formData, nome_ativo: e.target.value })}
                  placeholder="Petrobras PN"
                  maxLength="255"
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={fecharModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingAtivo ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
