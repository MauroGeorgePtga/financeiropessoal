import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useVisibility } from '../contexts/VisibilityContext'
import { Plus, Edit2, Trash2, Search, TrendingUp, TrendingDown, Home, Car, MapPin, Package, X, DollarSign, CircleDollarSign, Gift, AlertTriangle } from 'lucide-react'
import './Patrimonio.css'
import { ValorOculto } from '../components/ValorOculto'

export default function Patrimonio() {
  const { user } = useAuth()
  const { valoresVisiveis } = useVisibility()
  const [bens, setBens] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showBaixaModal, setShowBaixaModal] = useState(false)
  const [editingBem, setEditingBem] = useState(null)
  const [baixandoBem, setBaixandoBem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('ativo')
  
  const [formData, setFormData] = useState({
    tipo: 'imovel',
    descricao: '',
    valor_compra: 0,
    valor_atual: 0,
    data_compra: new Date().toISOString().split('T')[0],
    observacoes: ''
  })

  const [baixaData, setBaixaData] = useState({
    status: 'vendido',
    data_baixa: new Date().toISOString().split('T')[0],
    valor_baixa: 0,
    motivo_baixa: ''
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

  const abrirModalBaixa = (bem) => {
    setBaixandoBem(bem)
    setBaixaData({
      status: 'vendido',
      data_baixa: new Date().toISOString().split('T')[0],
      valor_baixa: bem.valor_atual,
      motivo_baixa: ''
    })
    setError('')
    setSuccess('')
    setShowBaixaModal(true)
  }

  const fecharModalBaixa = () => {
    setShowBaixaModal(false)
    setBaixandoBem(null)
  }

  const handleBaixa = async (e) => {
    e.preventDefault()
    
    if (!baixaData.data_baixa || !baixaData.valor_baixa) {
      setError('Preencha a data e o valor da baixa')
      return
    }

    try {
      const { error } = await supabase
        .from('patrimonio')
        .update({
          status: baixaData.status,
          data_baixa: baixaData.data_baixa,
          valor_baixa: parseFloat(baixaData.valor_baixa),
          motivo_baixa: baixaData.motivo_baixa,
          valor_atual: parseFloat(baixaData.valor_baixa) // Atualiza valor atual para o valor de venda
        })
        .eq('id', baixandoBem.id)

      if (error) throw error

      setSuccess(`Bem ${baixaData.status === 'vendido' ? 'vendido' : baixaData.status} com sucesso!`)
      fecharModalBaixa()
      await carregarBens()
    } catch (error) {
      console.error('Erro ao dar baixa:', error)
      setError('Erro ao processar baixa do bem')
    }
  }

  const reativarBem = async (bemId) => {
    if (!confirm('Deseja reativar este bem?')) return

    try {
      const { error } = await supabase
        .from('patrimonio')
        .update({
          status: 'ativo',
          data_baixa: null,
          valor_baixa: null,
          motivo_baixa: null
        })
        .eq('id', bemId)

      if (error) throw error

      setSuccess('Bem reativado com sucesso!')
      await carregarBens()
    } catch (error) {
      console.error('Erro ao reativar bem:', error)
      setError('Erro ao reativar bem')
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
    const matchStatus = filtroStatus === 'todos' || bem.status === filtroStatus
    return matchSearch && matchTipo && matchStatus
  })

  const calcularVariacao = (valorCompra, valorAtual) => {
    if (valorCompra === 0) return 0
    return ((valorAtual - valorCompra) / valorCompra) * 100
  }

  const getTipoConfig = (tipo) => {
    return tiposBem.find(t => t.value === tipo) || tiposBem[0]
  }

  // Calcular totais APENAS de bens ativos
  const bensAtivos = bens.filter(bem => bem.status === 'ativo')
  const bensVendidos = bens.filter(bem => bem.status === 'vendido')
  
  const totalValorCompra = bensAtivos.reduce((acc, bem) => acc + bem.valor_compra, 0)
  const totalValorAtual = bensAtivos.reduce((acc, bem) => acc + bem.valor_atual, 0)
  const variacaoTotal = totalValorCompra > 0 
    ? ((totalValorAtual - totalValorCompra) / totalValorCompra) * 100 
    : 0

  // Calcular lucro/prejuízo com vendas
  const lucroVendas = bensVendidos.reduce((acc, bem) => 
    acc + ((bem.valor_baixa || 0) - bem.valor_compra), 0
  )

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
              {valoresVisiveis ? formatCurrency(totalValorAtual - totalValorCompra) : '••••••'}
            </span>
          </div>
        </div>

        <div className="resumo-card card-quantidade">
          <div className="resumo-icon">📦</div>
          <div className="resumo-info">
            <span className="resumo-label">Bens Ativos</span>
            <span className="resumo-valor">{bensAtivos.length}</span>
          </div>
        </div>

        <div className={`resumo-card ${lucroVendas >= 0 ? 'card-valorizacao' : 'card-desvalorizacao'}`}>
          <div className="resumo-icon">
            {lucroVendas >= 0 ? <DollarSign size={32} /> : <TrendingDown size={32} />}
          </div>
          <div className="resumo-info">
            <span className="resumo-label">Lucro/Prejuízo Vendas</span>
            <span className="resumo-valor">
              <ValorOculto valor={formatCurrency(lucroVendas)}/>
            </span>
            <span className="resumo-diferenca">
              {bensVendidos.length} {bensVendidos.length === 1 ? 'bem vendido' : 'bens vendidos'}
            </span>
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

        {/* Filtros de Status */}
        <div className="filtros-status">
          <button 
            className={`filtro-btn ${filtroStatus === 'ativo' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('ativo')}
          >
            <Package size={16} />
            Ativos
          </button>
          <button 
            className={`filtro-btn ${filtroStatus === 'vendido' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('vendido')}
          >
            <DollarSign size={16} />
            Vendidos
          </button>
          <button 
            className={`filtro-btn ${filtroStatus === 'doado' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('doado')}
          >
            <Gift size={16} />
            Doados
          </button>
          <button 
            className={`filtro-btn ${filtroStatus === 'perdido' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('perdido')}
          >
            <AlertTriangle size={16} />
            Perdidos
          </button>
          <button 
            className={`filtro-btn ${filtroStatus === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('todos')}
          >
            Todos
          </button>
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
                  {bem.status && bem.status !== 'ativo' && (
                    <div className={`bem-status-badge status-${bem.status}`}>
                      {bem.status === 'vendido' && '💰 Vendido'}
                      {bem.status === 'doado' && '🎁 Doado'}
                      {bem.status === 'perdido' && '⚠️ Perdido'}
                    </div>
                  )}
                  <div className="bem-actions">
                    {bem.status === 'ativo' ? (
                      <>
                        <button
                          className="btn-icon btn-baixa"
                          onClick={() => abrirModalBaixa(bem)}
                          title="Dar Baixa (Vender/Doar)"
                        >
                          <CircleDollarSign size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleEditar(bem)}
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn-icon btn-reativar"
                        onClick={() => reativarBem(bem.id)}
                        title="Reativar Bem"
                      >
                        <Package size={16} />
                      </button>
                    )}
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
                    {bem.status === 'ativo' ? (
                      `Adquirido em ${formatDate(bem.data_compra)}`
                    ) : (
                      `${bem.status === 'vendido' ? 'Vendido' : bem.status === 'doado' ? 'Doado' : 'Baixa'} em ${formatDate(bem.data_baixa)}`
                    )}
                  </div>
                </div>

                <div className="bem-valores">
                  <div className="valor-item">
                    <span className="valor-label">Valor de Compra</span>
                    <span className="valor-number">
                      {valoresVisiveis ? formatCurrency(bem.valor_compra) : '••••••'}
                    </span>
                  </div>

                  <div className="valor-item">
                    <span className="valor-label">
                      {bem.status === 'vendido' ? 'Valor de Venda' : 'Valor Atual'}
                    </span>
                    <span className="valor-number valor-destaque">
                      {valoresVisiveis ? formatCurrency(bem.valor_atual) : '••••••'}
                    </span>
                  </div>

                  {bem.status === 'vendido' ? (
                    <div className={`variacao ${(bem.valor_baixa - bem.valor_compra) >= 0 ? 'positiva' : 'negativa'}`}>
                      {(bem.valor_baixa - bem.valor_compra) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      <span>
                        {(bem.valor_baixa - bem.valor_compra) >= 0 ? 'Lucro: ' : 'Prejuízo: '}
                        {valoresVisiveis ? formatCurrency(Math.abs(bem.valor_baixa - bem.valor_compra)) : '••••••'}
                      </span>
                    </div>
                  ) : (
                    <div className={`variacao ${variacao >= 0 ? 'positiva' : 'negativa'}`}>
                      {variacao >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      <span>{variacao >= 0 ? '+' : ''}{variacao.toFixed(2)}%</span>
                      <span className="variacao-valor">
                        ({valoresVisiveis ? formatCurrency(bem.valor_atual - bem.valor_compra) : '••••••'})
                      </span>
                    </div>
                  )}
                </div>

                {(bem.observacoes || bem.motivo_baixa) && (
                  <div className="bem-obs">
                    <small>{bem.motivo_baixa || bem.observacoes}</small>
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
                            ({valoresVisiveis ? formatCurrency(diferenca) : '••••••'})
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

      {/* Modal de Baixa */}
      {showBaixaModal && baixandoBem && (
        <div className="modal-overlay" onClick={fecharModalBaixa}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Dar Baixa no Bem</h2>
              <button className="btn-close" onClick={fecharModalBaixa}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleBaixa}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <div className="bem-baixa-info">
                    <h3>{baixandoBem.descricao}</h3>
                    <p>Valor de compra: {formatCurrency(baixandoBem.valor_compra)}</p>
                    <p>Valor atual estimado: {formatCurrency(baixandoBem.valor_atual)}</p>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Tipo de Baixa *</label>
                  <div className="tipo-buttons-baixa">
                    <button
                      type="button"
                      className={`tipo-btn-baixa ${baixaData.status === 'vendido' ? 'active' : ''}`}
                      onClick={() => setBaixaData({...baixaData, status: 'vendido'})}
                      style={{borderColor: '#48bb78', color: baixaData.status === 'vendido' ? 'white' : '#48bb78', background: baixaData.status === 'vendido' ? '#48bb78' : 'white'}}
                    >
                      <DollarSign size={24} />
                      <span>Vendido</span>
                    </button>
                    <button
                      type="button"
                      className={`tipo-btn-baixa ${baixaData.status === 'doado' ? 'active' : ''}`}
                      onClick={() => setBaixaData({...baixaData, status: 'doado'})}
                      style={{borderColor: '#667eea', color: baixaData.status === 'doado' ? 'white' : '#667eea', background: baixaData.status === 'doado' ? '#667eea' : 'white'}}
                    >
                      <Gift size={24} />
                      <span>Doado</span>
                    </button>
                    <button
                      type="button"
                      className={`tipo-btn-baixa ${baixaData.status === 'perdido' ? 'active' : ''}`}
                      onClick={() => setBaixaData({...baixaData, status: 'perdido'})}
                      style={{borderColor: '#f56565', color: baixaData.status === 'perdido' ? 'white' : '#f56565', background: baixaData.status === 'perdido' ? '#f56565' : 'white'}}
                    >
                      <AlertTriangle size={24} />
                      <span>Perdido/Roubado</span>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Data da Baixa *</label>
                  <input
                    type="date"
                    value={baixaData.data_baixa}
                    onChange={(e) => setBaixaData({...baixaData, data_baixa: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    {baixaData.status === 'vendido' ? 'Valor de Venda' : 
                     baixaData.status === 'doado' ? 'Valor Estimado (Doação)' : 
                     'Valor Estimado'} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={baixaData.valor_baixa}
                    onChange={(e) => setBaixaData({...baixaData, valor_baixa: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Observações</label>
                  <textarea
                    value={baixaData.motivo_baixa}
                    onChange={(e) => setBaixaData({...baixaData, motivo_baixa: e.target.value})}
                    placeholder={
                      baixaData.status === 'vendido' ? 'Para quem vendeu, como foi a negociação...' :
                      baixaData.status === 'doado' ? 'Para quem doou, motivo da doação...' :
                      'Circunstâncias da perda...'
                    }
                    rows="3"
                  />
                </div>

                <div className="form-group full-width">
                  <div className="lucro-preview">
                    {(() => {
                      const lucro = parseFloat(baixaData.valor_baixa || 0) - baixandoBem.valor_compra
                      return (
                        <div className={lucro >= 0 ? 'lucro-positivo' : 'lucro-negativo'}>
                          {lucro >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                          <div>
                            <span className="lucro-label">{lucro >= 0 ? 'Lucro' : 'Prejuízo'}</span>
                            <span className="lucro-valor">{formatCurrency(Math.abs(lucro))}</span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={fecharModalBaixa}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Confirmar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
