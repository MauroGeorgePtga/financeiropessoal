import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react'
import './Categorias.css'

export default function Categorias() {
  const { user } = useAuth()
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [expandidas, setExpandidas] = useState([])
  
  const [formData, setFormData] = useState({ nome: '', tipo: 'despesa', cor: '#667eea', icone: '💰' })
  const [subFormData, setSubFormData] = useState({ categoria_id: '', nome: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const cores = ['#667eea', '#48bb78', '#f56565', '#ed8936', '#38b2ac', '#9f7aea', '#4299e1', '#f687b3', '#ecc94b', '#fc8181']
  const icones = ['💰', '🏠', '🚗', '🍔', '🏥', '📚', '🎮', '✈️', '👕', '⚡', '📱', '🎬', '🏋️', '🎨', '💼', '🎓']

  useEffect(() => { if (user) carregarDados() }, [user])

  const carregarDados = async () => {
    try {
      setLoading(true)
      const { data: catData } = await supabase.from('categorias').select('*').eq('user_id', user.id).eq('ativo', true).order('tipo', { ascending: false }).order('nome')
      const { data: subData } = await supabase.from('subcategorias').select('*, categorias!inner(user_id)').eq('categorias.user_id', user.id).eq('ativo', true).order('nome')
      setCategorias(catData || [])
      setSubcategorias(subData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleCategoria = (id) => {
    if (expandidas.includes(id)) {
      setExpandidas(expandidas.filter(x => x !== id))
    } else {
      setExpandidas([...expandidas, id])
    }
  }

  const handleSubmitCategoria = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await supabase.from('categorias').update(formData).eq('id', editingItem.id)
      } else {
        await supabase.from('categorias').insert([{ ...formData, user_id: user.id }])
      }
      await carregarDados()
      fecharModal()
      setSuccess('Salvo!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { setError(err.message) }
  }

  const handleSubmitSubcategoria = async (e) => {
    e.preventDefault()
    
    if (!subFormData.nome.trim()) {
      setError('Nome da subcategoria é obrigatório')
      return
    }

    try {
      // Verificar se já existe subcategoria com mesmo nome na categoria destino
      const { data: existing } = await supabase
        .from('subcategorias')
        .select('id')
        .eq('nome', subFormData.nome.trim())
        .eq('categoria_id', subFormData.categoria_id)
        .eq('ativo', true)
        .neq('id', editingItem?.id || '')
        .maybeSingle()

      if (existing) {
        setError('Já existe uma subcategoria com este nome nesta categoria')
        return
      }

      // Se está editando e mudou de categoria, verificar se há transações
      if (editingItem && subFormData.categoria_id !== editingItem.categoria_id) {
        const { count } = await supabase
          .from('transacoes')
          .select('id', { count: 'exact', head: true })
          .eq('subcategoria_id', editingItem.id)

        if (count > 0) {
          const catOrigem = categorias.find(c => c.id === editingItem.categoria_id)
          const catDestino = categorias.find(c => c.id === subFormData.categoria_id)
          
          const confirma = confirm(
            `⚠️ ATENÇÃO!\n\n` +
            `Esta subcategoria possui ${count} transação(ões) associada(s).\n\n` +
            `Movendo de: ${catOrigem?.icone} ${catOrigem?.nome}\n` +
            `Para: ${catDestino?.icone} ${catDestino?.nome}\n\n` +
            `As transações continuarão vinculadas a esta subcategoria.\n\n` +
            `Deseja continuar?`
          )
          
          if (!confirma) return
        }
      }

      if (editingItem) {
        await supabase
          .from('subcategorias')
          .update({ 
            nome: subFormData.nome.trim(),
            categoria_id: subFormData.categoria_id
          })
          .eq('id', editingItem.id)
      } else {
        await supabase
          .from('subcategorias')
          .insert([{ 
            categoria_id: subFormData.categoria_id, 
            nome: subFormData.nome.trim() 
          }])
      }
      
      await carregarDados()
      fecharModalSub()
      setSuccess(editingItem ? 'Subcategoria atualizada com sucesso!' : 'Subcategoria criada com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { 
      console.error('Erro:', err)
      setError('Erro ao salvar subcategoria') 
    }
  }

  const fecharModal = () => { setShowModal(false); setEditingItem(null); setFormData({ nome: '', tipo: 'despesa', cor: '#667eea', icone: '💰' }) }
  const fecharModalSub = () => { setShowSubModal(false); setEditingItem(null); setSubFormData({ categoria_id: '', nome: '' }) }

  if (loading) return <div className="page-container"><div className="loading">Carregando...</div></div>

  const categoriasFiltradas = categorias.filter(c => tipoFiltro === 'todos' || c.tipo === tipoFiltro)
  const getSubcategorias = (catId) => subcategorias.filter(s => s.categoria_id === catId)

  return (
    <div className="page-container">
      <div className="page-header">
        <div><h1>Categorias</h1><p>Gerencie suas categorias</p></div>
        <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={20} /> Nova Categoria</button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="categorias-header">
        <div className="resumo-badges">
          <span className="badge badge-receita">{categorias.filter(c => c.tipo === 'receita').length} Receitas</span>
          <span className="badge badge-despesa">{categorias.filter(c => c.tipo === 'despesa').length} Despesas</span>
        </div>
        <div className="filtros">
          <button className={`filtro-btn ${tipoFiltro === 'todos' ? 'active' : ''}`} onClick={() => setTipoFiltro('todos')}>Todos</button>
          <button className={`filtro-btn ${tipoFiltro === 'receita' ? 'active' : ''}`} onClick={() => setTipoFiltro('receita')}>Receitas</button>
          <button className={`filtro-btn ${tipoFiltro === 'despesa' ? 'active' : ''}`} onClick={() => setTipoFiltro('despesa')}>Despesas</button>
        </div>
      </div>

      <div className="categorias-grid">
        {categoriasFiltradas.map(cat => {
          const subs = getSubcategorias(cat.id)
          const estaExpandida = expandidas.includes(cat.id)
          
          return (
            <div key={cat.id} className="categoria-card">
              <div className="categoria-main">
                <div className="categoria-left" onClick={() => subs.length > 0 && toggleCategoria(cat.id)}>
                  {subs.length > 0 && (
                    <button className="btn-expand">
                      {estaExpandida ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                  )}
                  <div className="categoria-icone" style={{ backgroundColor: cat.cor }}>{cat.icone}</div>
                  <div className="categoria-detalhes">
                    <h3>{cat.nome}</h3>
                    <div className="categoria-info">
                      <span className={`badge-tipo ${cat.tipo}`}>{cat.tipo === 'receita' ? 'Receita' : 'Despesa'}</span>
                      {subs.length > 0 && <span className="badge-subs">{subs.length} sub</span>}
                    </div>
                  </div>
                </div>
                <div className="categoria-acoes">
                  <button className="btn-acao add" onClick={(e) => { e.stopPropagation(); setSubFormData({ categoria_id: cat.id, nome: '' }); setShowSubModal(true) }}>
                    <Plus size={16} />
                  </button>
                  <button className="btn-acao" onClick={(e) => { e.stopPropagation(); setEditingItem(cat); setFormData(cat); setShowModal(true) }}>
                    <Edit2 size={16} />
                  </button>
                  <button className="btn-acao delete" onClick={async (e) => { e.stopPropagation(); if(confirm('Excluir?')) { await supabase.from('categorias').update({ativo:false}).eq('id',cat.id); carregarDados() }}}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {estaExpandida && subs.length > 0 && (
                <div className="subcategorias-area">
                  {subs.map(sub => (
                    <div key={sub.id} className="subcategoria-linha">
                      <span>↳ {sub.nome}</span>
                      <div>
                        <button className="btn-acao-small" onClick={() => { setEditingItem(sub); setSubFormData({ categoria_id: sub.categoria_id, nome: sub.nome }); setShowSubModal(true) }}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-acao-small delete" onClick={async () => { if(confirm('Excluir?')) { await supabase.from('subcategorias').update({ativo:false}).eq('id',sub.id); carregarDados() }}}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>{editingItem ? 'Editar' : 'Nova'} Categoria</h2><button className="btn-close" onClick={fecharModal}><X size={24} /></button></div>
            <form onSubmit={handleSubmitCategoria}>
              <div className="form-group"><label>Nome *</label><input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required /></div>
              <div className="form-group"><label>Tipo *</label>
                <div className="radio-group">
                  <label className="radio-label"><input type="radio" name="tipo" value="receita" checked={formData.tipo === 'receita'} onChange={(e) => setFormData({...formData, tipo: e.target.value})} /><span>Receita</span></label>
                  <label className="radio-label"><input type="radio" name="tipo" value="despesa" checked={formData.tipo === 'despesa'} onChange={(e) => setFormData({...formData, tipo: e.target.value})} /><span>Despesa</span></label>
                </div>
              </div>
              <div className="form-group"><label>Ícone</label><div className="icon-picker">{icones.map(i => <button key={i} type="button" className={`icon-option ${formData.icone === i ? 'active' : ''}`} onClick={() => setFormData({...formData, icone: i})}>{i}</button>)}</div></div>
              <div className="form-group"><label>Cor</label><div className="color-picker">{cores.map(c => <button key={c} type="button" className={`color-option ${formData.cor === c ? 'active' : ''}`} style={{backgroundColor: c}} onClick={() => setFormData({...formData, cor: c})} />)}</div></div>
              <div className="modal-footer"><button type="button" className="btn-secondary" onClick={fecharModal}>Cancelar</button><button type="submit" className="btn-primary">Salvar</button></div>
            </form>
          </div>
        </div>
      )}

      {showSubModal && (
        <div className="modal-overlay" onClick={fecharModalSub}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Editar' : 'Nova'} Subcategoria</h2>
              <button className="btn-close" onClick={fecharModalSub}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmitSubcategoria}>
              <div className="form-group">
                <label>Nome da Subcategoria *</label>
                <input 
                  type="text" 
                  value={subFormData.nome} 
                  onChange={(e) => setSubFormData({...subFormData, nome: e.target.value})} 
                  placeholder="Ex: Restaurantes, Uber, Farmácia..."
                  required 
                />
              </div>
              
              <div className="form-group">
                <label>Categoria Pai *</label>
                <select
                  value={subFormData.categoria_id}
                  onChange={(e) => setSubFormData({...subFormData, categoria_id: e.target.value})}
                  required
                  disabled={!editingItem && subFormData.categoria_id}
                >
                  <option value="">Selecione uma categoria</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icone} {cat.nome} ({cat.tipo === 'receita' ? 'Receita' : 'Despesa'})
                    </option>
                  ))}
                </select>
                
                {editingItem && subFormData.categoria_id !== editingItem.categoria_id && (
                  <small style={{
                    color: '#f59e0b', 
                    marginTop: '8px', 
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    padding: '8px 12px',
                    background: '#fffbeb',
                    borderRadius: '6px',
                    border: '1px solid #fef3c7'
                  }}>
                    ⚠️ Você está movendo esta subcategoria para outra categoria
                  </small>
                )}
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={fecharModalSub}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingItem ? '💾 Salvar Alterações' : 'Criar Subcategoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
