import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Edit2, Trash2, Search, TrendingUp, TrendingDown, Home, Car, MapPin, Package, X } from 'lucide-react'
import './Patrimonio.css'
import { ValorOculto } from '../components/ValorOculto'

export default function Patrimonio() {
  const { user } = useAuth()
  const [bens, setBens] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBem, setEditingBem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  
  const [formData, setFormData] = useState({
    tipo: 'imovel',
    descricao: '',
    valor_compra: 0,
    valor_atual: 0,
    data_compra: new Date().toISOString().split('T')[0],
    observacoes: ''
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const tiposBem = [
    { value: 'imovel', label: 'Imóvel', icon: Home, color: '#667eea' },
    { value: 'veiculo', label: 'Veículo', icon: Car, color: '#48bb78' },
    { value: 'terreno', label: 'Terreno', icon: MapPin, color: '#ed8936' },
    { value: 'outros', label: 'Outros', icon: Package, color: '#9f7aea' }
  ]

  useEffect(() => {
    if (user) {
      carregarBens()
    }
  }, [user])

  const carregarBens = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('patrimonio')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBens(data || [])
    } catch (error) {
      console.error('Erro ao carregar patrimônio:', error)
      setError('Erro ao carregar patrimônio')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const dadosBem = {
        ...formData,
        valor_compra: parseFloat(formData.valor_compra),
        valor_atual: parseFloat(formData.valor_atual),
        user_id: user.id
      }

      if (editingBem) {
        const { error } = await supabase
          .from('patrimonio')
          .update(dadosBem)
          .eq('id', editingBem.id)

        if (error) throw error
        setSuccess('Bem atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('patrimonio')
          .insert([dadosBem])

        if (error) throw error
        setSuccess('Bem cadastrado com sucesso!')
      }

      await carregarBens()
      fecharModal()
    } catch (error) {
      console.error('Erro ao salvar bem:', error)
      setError(error.message || 'Erro ao salvar bem')
    }
  }

  const handleEditar = (bem) => {
    setEditingBem(bem)
    setFormData({
      tipo: bem.tipo,
      descricao: bem.descricao,
      valor_compra: bem.valor_compra,
      valor_atual: bem.valor_atual,
      data_compra: bem.data_compra,
      observacoes: bem.observacoes || ''
    })
    setShowModal(true)
  }

  const handleExcluir = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este bem?')) return

    try {
      const { error } = await supabase
        .from('patrimonio')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setSuccess('Bem excluído com sucesso!')
      await carregarBens()
    } catch (error) {
      console.error('Erro ao excluir bem:', error)
      setError('Erro ao excluir bem')
    }
  }

  const abrirModal = () => {
    setEditingBem(null)
    setFormData({
      tipo: 'imovel',
      descricao: '',
      valor_compra: 0,
      valor_atual: 0,
      data_compra: new Date().toISOString().split('T')[0],
      observacoes: ''
    })
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    setEditingBem(null)
    setError('')
  }

  const bensFiltrados = bens.filter(bem => {
    const matchSearch = bem.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    const matchTipo = filtroTipo === 'todos' || bem.tipo === filtroTipo
    return matchSearch && matchTipo
  })

  const calcularVariacao = (valorCompra, valorAtual) => {
    if (valorCompra === 0) return 0
    return ((valorAtual - valorCompra) / valorCompra) * 100
  }

  const getTipoConfig = (tipo) => {
    return tiposBem.find(t => t.value === tipo) || tiposBem[0]
  }

  // Calcular totais
  const totalValorCompra = bens.reduce((acc, bem) => acc + bem.valor_compra, 0)
  const totalValorAtual = bens.reduce((acc, bem) => acc + bem.valor_atual, 0)
  const variacaoTotal = totalValorCompra > 0 
    ? ((totalValorAtual - totalValorCompra) / totalValorCompra) * 100 
    : 0

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Carregando patrimônio...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Patrimônio</h1>
          <p>Gerencie seus bens e investimentos</p>
        </div>
        <button className="btn-primary" onClick={abrirModal}>
          <Plus size={20} />
          Novo Bem
        </button>
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

      {/* Cards de Resumo */}
      <div className="patrimonio-resumo">
        <div className="resumo-card card-compra">
          <div className="resumo-icon">🏷️</div>
          <div className="resumo-info">
            <span className="resumo-label">Valor de Compra</span>
            <span className="resumo-valor"><ValorOculto valor={formatCurrency(totalValorCompra)}/></span>
          </div>
        </div>

        <div className="resumo-card card-atual">
          <div className="resumo-icon">💎</div>
          <div className="resumo-info">
            <span className="resumo-label">Valor Atual</span>
            <span className="resumo-valor"><ValorOculto valor={formatCurrency(totalValorAtual)}/></span>
          </div>
        </div>

        <div className={`resumo-card ${variacaoTotal >= 0 ? 'card-valorizacao' : 'card-desvalorizacao'}`}>
          <div className="resumo-icon">
            {variacaoTotal >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
          </div>
          <div className="resumo-info">
            <span className="resumo-label">Variação Total</span>
            <span className="resumo-valor">
              {variacaoTotal >= 0 ? '+' : ''}{variacaoTotal.toFixed(2)}%
            </span>
            <span className="resumo-diferenca">
              {formatCurrency(totalValorAtual - totalValorCompra)}
            </span>
          </div>
        </div>

        <div className="resumo-card card-quantidade">
          <div className="resumo-icon">📦</div>
          <div className="resumo-info">
            <span className="resumo-label">Total de Bens</span>
            <span className="resumo-valor">{bens.length}</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-container">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar bem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filtros-tipo">
          <button 
            className={`filtro-btn ${filtroTipo === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroTipo('todos')}
          >
            Todos
          </button>
          {tiposBem.map(tipo => (
            <button
              key={tipo.value}
              className={`filtro-btn ${filtroTipo === tipo.value ? 'active' : ''}`}
              onClick={() => setFiltroTipo(tipo.value)}
            >
              <tipo.icon size={16} />
              {tipo.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Bens */}
      {bensFiltrados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <h2>Nenhum bem cadastrado</h2>
          <p>Comece cadastrando seus imóveis, veículos e outros bens</p>
          <button className="btn-primary" onClick={abrirModal}>
            <Plus size={20} />
            Cadastrar Primeiro Bem
          </button>
        </div>
      ) : (
        <div className="bens-grid">
          {bensFiltrados.map((bem) => {
            const tipoConfig = getTipoConfig(bem.tipo)
            const variacao = calcularVariacao(bem.valor_compra, bem.valor_atual)
            const IconeTipo = tipoConfig.icon

            return (
              <div key={bem.id} className="bem-card">
                <div className="bem-header">
                  <div 
                    className="bem-icon"
                    style={{ backgroundColor: tipoConfig.color }}
                  >
                    <IconeTipo size={24} />
                  </div>
                  <div className="bem-tipo-badge">
                    {tipoConfig.label}
                  </div>
                  <div className="bem-actions">
                    <button
                      className="btn-icon"
                      onClick={() => handleEditar(bem)}
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleExcluir(bem.id)}
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="bem-body">
                  <h3>{bem.descricao}</h3>
                  <div className="bem-data">
                    Adquirido em {formatDate(bem.data_compra)}
                  </div>
                </div>

                <div className="bem-valores">
                  <div className="valor-item">
                    <span className="valor-label">Valor de Compra</span>
                    <span className="valor-number">
                      {formatCurrency(bem.valor_compra)}
                    </span>
                  </div>

                  <div className="valor-item">
                    <span className="valor-label">Valor Atual</span>
                    <span className="valor-number valor-destaque">
                      {formatCurrency(bem.valor_atual)}
                    </span>
                  </div>

                  <div className={`variacao ${variacao >= 0 ? 'positiva' : 'negativa'}`}>
                    {variacao >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>{variacao >= 0 ? '+' : ''}{variacao.toFixed(2)}%</span>
                    <span className="variacao-valor">
                      ({formatCurrency(bem.valor_atual - bem.valor_compra)})
                    </span>
                  </div>
                </div>

                {bem.observacoes && (
                  <div className="bem-obs">
                    <small>{bem.observacoes}</small>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingBem ? 'Editar Bem' : 'Novo Bem'}</h2>
              <button className="btn-close" onClick={fecharModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Tipo de Bem *</label>
                  <div className="tipo-buttons">
                    {tiposBem.map(tipo => {
                      const IconeTipo = tipo.icon
                      return (
                        <button
                          key={tipo.value}
                          type="button"
                          className={`tipo-btn ${formData.tipo === tipo.value ? 'active' : ''}`}
                          style={{
                            borderColor: formData.tipo === tipo.value ? tipo.color : '#ddd',
                            backgroundColor: formData.tipo === tipo.value ? tipo.color + '20' : 'white'
                          }}
                          onClick={() => setFormData({ ...formData, tipo: tipo.value })}
                        >
                          <IconeTipo size={20} />
                          <span>{tipo.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Descrição *</label>
                  <input
                    type="text"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Ex: Apartamento Centro"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Valor de Compra *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_compra}
                    onChange={(e) => setFormData({ ...formData, valor_compra: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Valor Atual *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_atual}
                    onChange={(e) => setFormData({ ...formData, valor_atual: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Data de Compra *</label>
                  <input
                    type="date"
                    value={formData.data_compra}
                    onChange={(e) => setFormData({ ...formData, data_compra: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Variação</label>
                  <div className="variacao-preview">
                    {(() => {
                      const valorCompra = parseFloat(formData.valor_compra) || 0
                      const valorAtual = parseFloat(formData.valor_atual) || 0
                      const variacao = valorCompra > 0 
                        ? ((valorAtual - valorCompra) / valorCompra) * 100 
                        : 0
                      const diferenca = valorAtual - valorCompra

                      return (
                        <div className={variacao >= 0 ? 'positiva' : 'negativa'}>
                          {variacao >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          <span className="variacao-percent">
                            {variacao >= 0 ? '+' : ''}{variacao.toFixed(2)}%
                          </span>
                          <span className="variacao-valor">
                            ({formatCurrency(diferenca)})
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Informações adicionais sobre o bem..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={fecharModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingBem ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
