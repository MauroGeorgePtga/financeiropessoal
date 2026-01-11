import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowRightLeft, X } from 'lucide-react'

export default function TransferenciaModal({ onClose, onSuccess }) {
  const { user } = useAuth()
  const [contas, setContas] = useState([])
  const [categorias, setCategorias] = useState({ despesa: null, receita: null })
  const [formData, setFormData] = useState({
    conta_origem: '',
    conta_destino: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    descricao: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    carregarDados()
  }, [user])

  const carregarDados = async () => {
    // Carregar contas
    const { data: contasData } = await supabase
      .from('contas_bancarias')
      .select('*')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('nome')

    setContas(contasData || [])

    // Buscar TODAS categorias do usuário
    const { data: todasCats } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user.id)
      .eq('ativo', true)

    console.log('🔍 TODAS CATEGORIAS:', todasCats)

    // Filtrar despesa - DEVE TER "transferencia" OU "retirada" no nome
    const subDespesa = todasCats?.find(c => 
      c.tipo === 'despesa' && 
      (c.nome.toLowerCase().includes('transferencia') || c.nome.toLowerCase().includes('retirada'))
    )

    // Filtrar receita - DEVE TER "transferencia" OU "credito" no nome
    const subReceita = todasCats?.find(c => 
      c.tipo === 'receita' && 
      (c.nome.toLowerCase().includes('transferencia') || c.nome.toLowerCase().includes('credito'))
    )

    console.log('✅ Despesa encontrada:', subDespesa)
    console.log('✅ Receita encontrada:', subReceita)

    // SE encontrou as duas, está OK
    if (subDespesa && subReceita) {
      setCategorias({
        despesa: subDespesa,
        receita: subReceita
      })
    } else {
      // Debug adicional
      console.error('❌ Categorias faltando!')
      console.log('Despesas disponíveis:', todasCats?.filter(c => c.tipo === 'despesa').map(c => c.nome))
      console.log('Receitas disponíveis:', todasCats?.filter(c => c.tipo === 'receita').map(c => c.nome))
      
      setCategorias({
        despesa: null,
        receita: null
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!categorias.despesa || !categorias.receita) {
        throw new Error('Categorias de transferência não encontradas. Execute o SQL primeiro.')
      }

      const valor = parseFloat(formData.valor)

      // Criar despesa (saída)
      const { error: despesaError } = await supabase
        .from('transacoes')
        .insert({
          user_id: user.id,
          tipo: 'despesa',
          categoria_id: categorias.despesa.id,
          conta_id: formData.conta_origem,
          valor,
          data_transacao: formData.data,
          descricao: formData.descricao || 'Transferência entre contas',
          pago: true,
          data_pagamento: formData.data,
          forma_pagamento: 'conta'
        })

      if (despesaError) throw despesaError

      // Criar receita (entrada)
      const { error: receitaError } = await supabase
        .from('transacoes')
        .insert({
          user_id: user.id,
          tipo: 'receita',
          categoria_id: categorias.receita.id,
          conta_id: formData.conta_destino,
          valor,
          data_transacao: formData.data,
          descricao: formData.descricao || 'Transferência entre contas',
          pago: true,
          data_pagamento: formData.data,
          forma_pagamento: 'conta'
        })

      if (receitaError) throw receitaError

      onSuccess()
      onClose()
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const contasDestino = contas.filter(c => c.id !== formData.conta_origem)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔄 Transferência Entre Contas</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Conta Origem (saída) *</label>
              <select
                value={formData.conta_origem}
                onChange={e => setFormData({ ...formData, conta_origem: e.target.value, conta_destino: '' })}
                required
              >
                <option value="">Selecione a conta</option>
                {contas.map(c => (
                  <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
                ))}
              </select>
            </div>

            <div className="transferencia-arrow">
              <ArrowRightLeft size={32} />
            </div>

            <div className="form-group full-width">
              <label>Conta Destino (entrada) *</label>
              <select
                value={formData.conta_destino}
                onChange={e => setFormData({ ...formData, conta_destino: e.target.value })}
                required
                disabled={!formData.conta_origem}
              >
                <option value="">Selecione a conta</option>
                {contasDestino.map(c => (
                  <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Valor *</label>
              <input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={e => setFormData({ ...formData, valor: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Data *</label>
              <input
                type="date"
                value={formData.data}
                onChange={e => setFormData({ ...formData, data: e.target.value })}
                required
              />
            </div>

            <div className="form-group full-width">
              <label>Descrição</label>
              <input
                type="text"
                value={formData.descricao}
                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Transferência entre contas"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Transferindo...' : 'Transferir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
