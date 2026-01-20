import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, X } from 'lucide-react'
import './Categorias.css'

export default function Categorias() {
  const { user } = useAuth()
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [expandedCategorias, setExpandedCategorias] = useState({})
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'despesa',
    cor: '#667eea',
    icone: '💰'
  })

  const [subFormData, setSubFormData] = useState({
    categoria_id: '',
    nome: ''
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const cores = [
    '#667eea', '#48bb78', '#f56565', '#ed8936', '#38b2ac', 
    '#9f7aea', '#4299e1', '#f687b3', '#ecc94b', '#fc8181'
  ]

  const icones = [
    '💰', '🏠', '🚗', '🍔', '🏥', '📚', '🎮', '✈️', 
    '👕', '⚡', '📱', '🎬', '🏋️', '🎨', '💼', '🎓'
  ]

  useEffect(() => {
    if (user) carregarDados()
  }, [user])

  const carregarDados = async () => {
    try {
      setLoading(true)
      
      const { data: catData } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome')

      const { data: subData } = await supabase
        .from('subcategorias')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome')

      setCategorias(catData || [])
      setSubcategorias(subData || [])
    } catch (error) {
      console.error('Erro ao carregar:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCategoria = (id) => {
    setExpandedCategorias(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleSubmitCategoria = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await supabase
          .from('categorias')
          .update(formData)
          .eq('id', editingItem.id)
        setSuccess('Categoria atualizada!')
      } else {
        await supabase
          .from('categorias')
          .insert([{ ...formData, user_id: user.id }])
        setSuccess('Categoria cadastrada!')
      }
      await carregarDados()
      fecharModal()
    } catch (error) {
      setError(error.message)
    }
  }

  const handleSubmitSubcategoria = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await supabase
          .from('subcategorias')
          .update({ nome: subFormData.nome })
          .eq('id', editingItem.id)
        setSuccess('Subcategoria atualizada!')
      } else {
        await supabase
          .from('subcategorias')
          .insert([{ ...subFormData, user_id: user.id }])
        setSuccess('Subcategoria cadastrada!')
      }
      await carregarDados()
      fecharModalSub()
    } catch (error) {
      setError(error.message)
    }
  }

  const handleExcluirCategoria = async (id) => {
    if (!confirm('Excluir categoria?')) return
    await supabase.from('categorias').update({ ativo: false }).eq('id', id)
    carregarDados()
  }

  const handleExcluirSubcategoria = async (id) => {
    if (!confirm('Excluir subcategoria?')) return
    await supabase.from('subcategorias').update({ ativo: false }).eq('id', id)
    carregarDados()
  }

  const fecharModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setFormData({ nome: '', tipo: 'despesa', cor: '#667eea', icone: '💰' })
    setError('')
  }

  const fecharModalSub = () => {
    setShowSubModal(false)
    setEditingItem(null)
    setSubFormData({ categoria_id: '', nome: '' })
    setError('')
  }

  const categoriasFiltradas = categorias.filter(cat => {
    if (tipoFiltro === 'todos') return true
    return cat.tipo === tipoFiltro
  })

  const getSubcategoriasPorCategoria = (categoriaId) => {
    return subcategorias.filter(sub => sub.categoria_id === categoriaId)
  }

  if (loading) return <div className="page-container"><div className="loading">Carregando...</div></div>

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Categorias</h1>
          <p>Gerencie suas categorias e subcategorias</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          Nova Categoria
        </button>
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

      <div className="categorias-list">
        {categoriasFiltradas.map((categoria) => {
          const subs = getSubcategoriasPorCategoria(categoria.id)
          const isExpanded = expandedCategorias[categoria.id]

          return (
            <div key={categoria.id} className="categoria-item">
              <div 
                className="categoria-header"
                onClick={() => subs.length > 0 && toggleCategoria(categoria.id)}
                style={{ cursor: subs.length > 0 ? 'pointer' : 'default' }}
              >
                <div className="categoria-info">
                  <button 
                    className="expand-btn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {subs.length > 0 && (isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />)}
                  </button>
                  
                  <div className="categoria-icon" style={{ backgroundColor: categoria.cor }}>
                    {categoria.icone}
                  </div>

                  <div className="categoria-nome">
                    <h3>{categoria.nome}</h3>
                    <span className={`tipo-badge tipo-${categoria.tipo}`}>
                      {categoria.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                    {subs.length > 0 && <span className="sub-count">{subs.length} sub</span>}
                  </div>
                </div>

                <div className="categoria-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn-icon btn-add" onClick={() => {
                    setSubFormData({ categoria_id: categoria.id, nome: '' })
                    setShowSubModal(true)
                  }} title="Adicionar Subcategoria">
                    <Plus size={16} />
                  </button>
                  <button className="btn-icon" onClick={() => {
                    setEditingItem(categoria)
                    setFormData({ nome: categoria.nome, tipo: categoria.tipo, cor: categoria.cor, icone: categoria.icone })
                    setShowModal(true)
                  }} title="Editar">
                    <Edit2 size={16} />
                  </button>
                  <button className="btn-icon btn-delete" onClick={() => handleExcluirCategoria(categoria.id)} title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {isExpanded && subs.length > 0 && (
                <div className="subcategorias-list">
                  {subs.map((sub) => (
                    <div key={sub.id} className="subcategoria-item">
                      <span className="subcategoria-nome">↳ {sub.nome}</span>
                      <div className="subcategoria-actions">
                        <button className="btn-icon-small" onClick={() => {
                          setEditingItem(sub)
                          setSubFormData({ categoria_id: sub.categoria_id, nome: sub.nome })
                          setShowSubModal(true)
                        }} title="Editar">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-icon-small btn-delete" onClick={() => handleExcluirSubcategoria(sub.id)} title="Excluir">
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

      {/* Modal Categoria */}
      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <button className="btn-close" onClick={fecharModal}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmitCategoria}>
              <div className="form-group">
                <label>Nome *</label>
                <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Tipo *</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input type="radio" name="tipo" value="receita" checked={formData.tipo === 'receita'} onChange={(e) => setFormData({...formData, tipo: e.target.value})} />
                    <span>Receita</span>
                  </label>
                  <label className="radio-label">
                    <input type="radio" name="tipo" value="despesa" checked={formData.tipo === 'despesa'} onChange={(e) => setFormData({...formData, tipo: e.target.value})} />
                    <span>Despesa</span>
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Ícone</label>
                <div className="icon-picker">
                  {icones.map(icone => (
                    <button key={icone} type="button" className={`icon-option ${formData.icone === icone ? 'active' : ''}`} onClick={() => setFormData({...formData, icone})}>
                      {icone}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Cor</label>
                <div className="color-picker">
                  {cores.map(cor => (
                    <button key={cor} type="button" className={`color-option ${formData.cor === cor ? 'active' : ''}`} style={{backgroundColor: cor}} onClick={() => setFormData({...formData, cor})} />
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={fecharModal}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Subcategoria */}
      {showSubModal && (
        <div className="modal-overlay" onClick={fecharModalSub}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Editar Subcategoria' : 'Nova Subcategoria'}</h2>
              <button className="btn-close" onClick={fecharModalSub}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmitSubcategoria}>
              <div className="form-group">
                <label>Nome *</label>
                <input type="text" value={subFormData.nome} onChange={(e) => setSubFormData({...subFormData, nome: e.target.value})} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={fecharModalSub}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
