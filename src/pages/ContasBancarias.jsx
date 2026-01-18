import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react'
import './ContasBancarias.css'
import { ValorOculto } from '../components/ValorOculto'

export default function ContasBancarias() {
  const { user } = useAuth()
  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingConta, setEditingConta] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'corrente',
    banco: '',
    agencia: '',
    conta: '',
    saldo_inicial: 0,
    cor: '#667eea',
    logo: '🏦',
    observacoes: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const tiposConta = [
    { value: 'corrente', label: 'Conta Corrente' },
    { value: 'poupanca', label: 'Poupança' },
    { value: 'investimento', label: 'Investimento' },
    { value: 'carteira_digital', label: 'Carteira Digital' },
    { value: 'outros', label: 'Outros' }
  ]

  const cores = [
    '#667eea', '#48bb78', '#f56565', '#ed8936', '#38b2ac', 
    '#9f7aea', '#4299e1', '#f687b3', '#ecc94b', '#fc8181'
  ]

  const logosBancos = [
    { emoji: '🏦', nome: 'Banco Genérico' },
    { emoji: '🇧🇷', nome: 'Banco do Brasil' },
    { emoji: '🔴', nome: 'Bradesco' },
    { emoji: '🔵', nome: 'Caixa' },
    { emoji: '🟣', nome: 'Nubank' },
    { emoji: '🟡', nome: 'Banco Inter' },
    { emoji: '🟠', nome: 'Itaú' },
    { emoji: '⚫', nome: 'Santander' },
    { emoji: '💳', nome: 'Cartão' },
    { emoji: '💰', nome: 'Dinheiro' },
    { emoji: '📱', nome: 'Digital' },
    { emoji: '💎', nome: 'Investimento' },
    { emoji: '🪙', nome: 'Cripto' },
    { emoji: '🏪', nome: 'Outros' }
  ]

  useEffect(() => {
    if (user) {
      carregarContas()
    }
  }, [user])

  const carregarContas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setContas(data || [])
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
      setError('Erro ao carregar contas')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      if (editingConta) {
        // Atualizar
        const { error } = await supabase
          .from('contas_bancarias')
          .update({
            ...formData,
            saldo_atual: formData.saldo_inicial
          })
          .eq('id', editingConta.id)

        if (error) throw error
        setSuccess('Conta atualizada com sucesso!')
      } else {
        // Criar
        const { error } = await supabase
          .from('contas_bancarias')
          .insert([{
            ...formData,
            user_id: user.id,
            saldo_atual: formData.saldo_inicial
          }])

        if (error) throw error
        setSuccess('Conta cadastrada com sucesso!')
      }

      await carregarContas()
      fecharModal()
    } catch (error) {
      console.error('Erro ao salvar conta:', error)
      setError(error.message || 'Erro ao salvar conta')
    }
  }

  const handleEditar = (conta) => {
    setEditingConta(conta)
    setFormData({
      nome: conta.nome,
      tipo: conta.tipo,
      banco: conta.banco || '',
      agencia: conta.agencia || '',
      conta: conta.conta || '',
      saldo_inicial: conta.saldo_inicial || 0,
      cor: conta.cor || '#667eea',
      logo: conta.logo || '🏦',
      observacoes: conta.observacoes || ''
    })
    setShowModal(true)
  }

  const handleExcluir = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return

    try {
      // Soft delete
      const { error } = await supabase
        .from('contas_bancarias')
        .update({ ativo: false })
        .eq('id', id)

      if (error) throw error
      
      setSuccess('Conta excluída com sucesso!')
      await carregarContas()
    } catch (error) {
      console.error('Erro ao excluir conta:', error)
      setError('Erro ao excluir conta')
    }
  }

  const abrirModal = () => {
    setEditingConta(null)
    setFormData({
      nome: '',
      tipo: 'corrente',
      banco: '',
      agencia: '',
      conta: '',
      saldo_inicial: 0,
      cor: '#667eea',
      observacoes: ''
    })
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    setEditingConta(null)
    setError('')
  }

  const contasFiltradas = contas.filter(conta =>
    conta.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conta.banco?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calcular saldos separados
  const saldoPositivo = contas
    .filter(conta => (conta.saldo_atual || 0) > 0)
    .reduce((acc, conta) => acc + conta.saldo_atual, 0)
  
  const saldoNegativo = contas
    .filter(conta => (conta.saldo_atual || 0) < 0)
    .reduce((acc, conta) => acc + conta.saldo_atual, 0)
  
  const saldoTotal = contas.reduce((acc, conta) => acc + (conta.saldo_atual || 0), 0)

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Carregando contas...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Contas Bancárias</h1>
          <p>Gerencie suas contas e carteiras</p>
        </div>
        <button className="btn-primary" onClick={abrirModal}>
          <Plus size={20} />
          Nova Conta
        </button>
      </div>

      {/* Mensagens */}
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
      <div className="cards-resumo">
        <div className="card-resumo card-positivo">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <span className="card-label">Saldos Positivos</span>
            <span className="card-value"><ValorOculto valor={formatCurrency(saldoPositivo)}/></span>
          </div>
        </div>

        <div className="card-resumo card-negativo">
          <div className="card-icon">📉</div>
          <div className="card-content">
            <span className="card-label">Saldos Negativos</span>
            <span className="card-value"><ValorOculto valor={formatCurrency(saldoNegativo)}/></span>
          </div>
        </div>

        <div className="card-resumo card-total">
          <div className="card-icon">💳</div>
          <div className="card-content">
            <span className="card-label">Saldo Total</span>
            <span className={`card-value ${saldoTotal >= 0 ? 'positivo' : 'negativo'}`}>
              <ValorOculto valor={formatCurrency(saldoTotal)}/>
            </span>
          </div>
        </div>
      </div>

      {/* Busca */}
      {contas.length > 0 && (
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou banco..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {/* Lista de Contas */}
      {contasFiltradas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏦</div>
          <h2>Nenhuma conta cadastrada</h2>
          <p>Comece cadastrando sua primeira conta bancária</p>
          <button className="btn-primary" onClick={abrirModal}>
            <Plus size={20} />
            Cadastrar Primeira Conta
          </button>
        </div>
      ) : (
        <div className="contas-grid">
          {contasFiltradas.map((conta) => (
            <div key={conta.id} className="conta-card">
              <div className="conta-header">
                <div className="conta-icon" style={{ backgroundColor: conta.cor }}>
                  {conta.logo || '💳'}
                </div>
                <div className="conta-actions">
                  <button
                    className="btn-icon"
                    onClick={() => handleEditar(conta)}
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => handleExcluir(conta.id)}
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="conta-info">
                <h3>{conta.nome}</h3>
                <span className="conta-tipo">
                  {tiposConta.find(t => t.value === conta.tipo)?.label}
                </span>
              </div>

              {conta.banco && (
                <div className="conta-detail">
                  <span>Banco:</span>
                  <strong>{conta.banco}</strong>
                </div>
              )}

              {(conta.agencia || conta.conta) && (
                <div className="conta-detail">
                  <span>Ag/Conta:</span>
                  <strong>{conta.agencia} / {conta.conta}</strong>
                </div>
              )}

              <div className="conta-saldo">
                <span>Saldo Atual</span>
                <strong className={conta.saldo_atual >= 0 ? 'saldo-positivo' : 'saldo-negativo'}>
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(conta.saldo_atual || 0)}
                </strong>
              </div>

              {conta.observacoes && (
                <div className="conta-obs">
                  <small>{conta.observacoes}</small>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingConta ? 'Editar Conta' : 'Nova Conta'}</h2>
              <button className="btn-close" onClick={fecharModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome da Conta *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Banco do Brasil"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tipo *</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    required
                  >
                    {tiposConta.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Banco</label>
                  <input
                    type="text"
                    value={formData.banco}
                    onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                    placeholder="Ex: Banco do Brasil"
                  />
                </div>

                <div className="form-group">
                  <label>Agência</label>
                  <input
                    type="text"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    placeholder="Ex: 1234-5"
                  />
                </div>

                <div className="form-group">
                  <label>Conta</label>
                  <input
                    type="text"
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                    placeholder="Ex: 12345-6"
                  />
                </div>

                <div className="form-group">
                  <label>Saldo Inicial *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.saldo_inicial}
                    onChange={(e) => setFormData({ ...formData, saldo_inicial: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Ícone do Banco</label>
                  <div className="logo-picker">
                    {logosBancos.map(logo => (
                      <button
                        key={logo.emoji}
                        type="button"
                        className={`logo-option ${formData.logo === logo.emoji ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, logo: logo.emoji })}
                        title={logo.nome}
                      >
                        {logo.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Cor</label>
                  <div className="color-picker">
                    {cores.map(cor => (
                      <button
                        key={cor}
                        type="button"
                        className={`color-option ${formData.cor === cor ? 'active' : ''}`}
                        style={{ backgroundColor: cor }}
                        onClick={() => setFormData({ ...formData, cor })}
                      />
                    ))}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Informações adicionais..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={fecharModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingConta ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
