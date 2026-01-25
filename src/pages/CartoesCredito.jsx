import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  CreditCard, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react'
import './CartoesCredito.css'

export default function CartoesCredito() {
  const { user } = useAuth()
  const [cartoes, setCartoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [totaisFaturas, setTotaisFaturas] = useState({})
  const [formData, setFormData] = useState({
    nome: '',
    bandeira: 'Visa',
    limite: '',
    dia_fechamento: '',
    dia_vencimento: '',
    cor: '#9f7aea',
    icone: '💳',
    ativo: true
  })

  const bandeiras = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Outros']
  const coresDisponiveis = [
    { cor: '#9f7aea', nome: 'Roxo' },
    { cor: '#667eea', nome: 'Azul' },
    { cor: '#48bb78', nome: 'Verde' },
    { cor: '#f56565', nome: 'Vermelho' },
    { cor: '#ed8936', nome: 'Laranja' },
    { cor: '#38b2ac', nome: 'Turquesa' }
  ]

  useEffect(() => {
    if (user) {
      carregarCartoes()
    }
  }, [user])

  const carregarCartoes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cartoes_credito')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCartoes(data || [])

      // Carregar totais das faturas abertas e fechadas para cada cartão
      if (data && data.length > 0) {
        const totais = {}
        for (const cartao of data) {
          const { data: faturas } = await supabase
            .from('faturas_cartao')
            .select('valor_total')
            .eq('cartao_id', cartao.id)
            .in('status', ['aberta', 'fechada'])

          totais[cartao.id] = faturas?.reduce((sum, f) => sum + (f.valor_total || 0), 0) || 0
        }
        setTotaisFaturas(totais)
      }
    } catch (error) {
      console.error('Erro ao carregar cartões:', error)
      alert('Erro ao carregar cartões')
    } finally {
      setLoading(false)
    }
  }

  const abrirModal = (cartao = null) => {
    if (cartao) {
      setEditando(cartao.id)
      setFormData({
        nome: cartao.nome,
        bandeira: cartao.bandeira,
        limite: cartao.limite,
        dia_fechamento: cartao.dia_fechamento,
        dia_vencimento: cartao.dia_vencimento,
        cor: cartao.cor,
        icone: cartao.icone,
        ativo: cartao.ativo
      })
    } else {
      setEditando(null)
      setFormData({
        nome: '',
        bandeira: 'Visa',
        limite: '',
        dia_fechamento: '',
        dia_vencimento: '',
        cor: '#9f7aea',
        icone: '💳',
        ativo: true
      })
    }
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    setEditando(null)
    setFormData({
      nome: '',
      bandeira: 'Visa',
      limite: '',
      dia_fechamento: '',
      dia_vencimento: '',
      cor: '#9f7aea',
      icone: '💳',
      ativo: true
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validações
    if (!formData.nome.trim()) {
      alert('Nome do cartão é obrigatório')
      return
    }
    if (!formData.dia_fechamento || formData.dia_fechamento < 1 || formData.dia_fechamento > 31) {
      alert('Dia de fechamento deve estar entre 1 e 31')
      return
    }
    if (!formData.dia_vencimento || formData.dia_vencimento < 1 || formData.dia_vencimento > 31) {
      alert('Dia de vencimento deve estar entre 1 e 31')
      return
    }

    try {
      const dados = {
        ...formData,
        user_id: user.id,
        limite: parseFloat(formData.limite) || 0,
        dia_fechamento: parseInt(formData.dia_fechamento),
        dia_vencimento: parseInt(formData.dia_vencimento)
      }

      if (editando) {
        // Atualizar
        const { error } = await supabase
          .from('cartoes_credito')
          .update(dados)
          .eq('id', editando)

        if (error) throw error
        alert('Cartão atualizado com sucesso!')
      } else {
        // Criar
        const { error } = await supabase
          .from('cartoes_credito')
          .insert([dados])

        if (error) throw error
        alert('Cartão criado com sucesso!')
      }

      fecharModal()
      carregarCartoes()
    } catch (error) {
      console.error('Erro ao salvar cartão:', error)
      alert('Erro ao salvar cartão')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este cartão? Todas as faturas e lançamentos serão excluídos também.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('cartoes_credito')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('Cartão excluído com sucesso!')
      carregarCartoes()
    } catch (error) {
      console.error('Erro ao excluir cartão:', error)
      alert('Erro ao excluir cartão')
    }
  }

  const toggleAtivo = async (id, ativoAtual) => {
    try {
      const { error } = await supabase
        .from('cartoes_credito')
        .update({ ativo: !ativoAtual })
        .eq('id', id)

      if (error) throw error
      carregarCartoes()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status do cartão')
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  if (loading) {
    return <div className="loading">Carregando cartões...</div>
  }

  return (
    <div className="cartoes-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-title">
          <CreditCard size={32} />
          <div>
            <h1>Cartões de Crédito</h1>
            <p>Gerencie seus cartões e faturas</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => abrirModal()}>
          <Plus size={20} />
          Novo Cartão
        </button>
      </div>

      {/* Lista de Cartões */}
      <div className="cartoes-grid">
        {cartoes.length === 0 ? (
          <div className="empty-state">
            <CreditCard size={64} />
            <h3>Nenhum cartão cadastrado</h3>
            <p>Comece adicionando seu primeiro cartão de crédito</p>
            <button className="btn-primary" onClick={() => abrirModal()}>
              <Plus size={20} />
              Adicionar Cartão
            </button>
          </div>
        ) : (
          cartoes.map(cartao => (
            <div 
              key={cartao.id} 
              className={`cartao-card ${!cartao.ativo ? 'cartao-inativo' : ''}`}
              style={{ borderLeftColor: cartao.cor }}
            >
              <div className="cartao-header">
                <div className="cartao-info">
                  <span className="cartao-icone">{cartao.icone}</span>
                  <div>
                    <h3>{cartao.nome}</h3>
                    <span className="cartao-bandeira">{cartao.bandeira}</span>
                  </div>
                </div>
                <div className="cartao-actions">
                  <button 
                    className="btn-icon"
                    onClick={() => abrirModal(cartao)}
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className="btn-icon btn-delete"
                    onClick={() => handleDelete(cartao.id)}
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="cartao-detalhes">
                <div className="detalhe-item-horizontal">
                  <DollarSign size={16} />
                  <div className="detalhe-text">
                    <span className="detalhe-label">Limite Total</span>
                    <span className="detalhe-valor">{formatCurrency(cartao.limite)}</span>
                  </div>
                </div>

                <div className="detalhe-item-horizontal">
                  <TrendingDown size={16} />
                  <div className="detalhe-text">
                    <span className="detalhe-label">Usado</span>
                    <span className="detalhe-valor detalhe-usado">{formatCurrency(totaisFaturas[cartao.id] || 0)}</span>
                  </div>
                </div>

                <div className="detalhe-item-horizontal">
                  <TrendingUp size={16} />
                  <div className="detalhe-text">
                    <span className="detalhe-label">Disponível</span>
                    <span className="detalhe-valor detalhe-disponivel">{formatCurrency((cartao.limite || 0) - (totaisFaturas[cartao.id] || 0))}</span>
                  </div>
                </div>

                <div className="detalhe-item-horizontal">
                  <Calendar size={16} />
                  <div className="detalhe-text">
                    <span className="detalhe-label">Fechamento</span>
                    <span className="detalhe-valor">Dia {cartao.dia_fechamento}</span>
                  </div>
                </div>

                <div className="detalhe-item-horizontal">
                  <Calendar size={16} />
                  <div className="detalhe-text">
                    <span className="detalhe-label">Vencimento</span>
                    <span className="detalhe-valor">Dia {cartao.dia_vencimento}</span>
                  </div>
                </div>
              </div>

              <div className="cartao-footer">
                <button
                  className={`btn-status ${cartao.ativo ? 'ativo' : 'inativo'}`}
                  onClick={() => toggleAtivo(cartao.id, cartao.ativo)}
                >
                  {cartao.ativo ? '✓ Ativo' : '✗ Inativo'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editando ? 'Editar Cartão' : 'Novo Cartão'}</h2>
              <button className="btn-icon" onClick={fecharModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome do Cartão *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Nubank, C6 Bank, Inter"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Bandeira *</label>
                  <select
                    value={formData.bandeira}
                    onChange={(e) => setFormData({ ...formData, bandeira: e.target.value })}
                    required
                  >
                    {bandeiras.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Limite</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.limite}
                    onChange={(e) => setFormData({ ...formData, limite: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Dia Fechamento *</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dia_fechamento}
                    onChange={(e) => setFormData({ ...formData, dia_fechamento: e.target.value })}
                    placeholder="Ex: 10"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Dia Vencimento *</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dia_vencimento}
                    onChange={(e) => setFormData({ ...formData, dia_vencimento: e.target.value })}
                    placeholder="Ex: 20"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cor</label>
                  <div className="cores-grid">
                    {coresDisponiveis.map(c => (
                      <button
                        key={c.cor}
                        type="button"
                        className={`cor-btn ${formData.cor === c.cor ? 'selected' : ''}`}
                        style={{ backgroundColor: c.cor }}
                        onClick={() => setFormData({ ...formData, cor: c.cor })}
                        title={c.nome}
                      />
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Ícone</label>
                  <input
                    type="text"
                    value={formData.icone}
                    onChange={(e) => setFormData({ ...formData, icone: e.target.value })}
                    placeholder="💳"
                    maxLength="2"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  />
                  Cartão Ativo
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={fecharModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <Save size={20} />
                  {editando ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Informação sobre Faturas */}
      {cartoes.length > 0 && (
        <div className="info-banner">
          <AlertCircle size={20} />
          <p>
            Para gerenciar faturas e lançamentos, acesse a aba <strong>"Faturas"</strong> no menu
          </p>
        </div>
      )}
    </div>
  )
}
