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
  const [modalType, setModalType] = useState('categoria') // 'categoria' ou 'subcategoria'
  const [editingItem, setEditingItem] = useState(null)
  const [expandedCategorias, setExpandedCategorias] = useState({})
  const [tipoFiltro, setTipoFiltro] = useState('todos') // 'todos', 'receita', 'despesa'
  
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
    if (user) {
      carregarDados()
    }
  }, [user])

  const carregarDados = async () => {
    try {
      setLoading(true)
      
      // Carregar categorias
      const { data: catData, error: catError } = await supabase
        .from('categorias')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('tipo', { ascending: false })
        .order('nome', { ascending: true })

      if (catError) throw catError

      // Carregar subcategorias
      const { data: subData, error: subError } = await supabase
        .from('subcategorias')
        .select(`
          *,
          categorias!inner(user_id)
        `)
        .eq('categorias.user_id', user.id)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (subError) throw subError

      setCategorias(catData || [])
      setSubcategorias(subData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setError('Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitCategoria = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      if (editingItem) {
        // Atualizar
        const { error } = await supabase
          .from('categorias')
          .update(formData)
          .eq('id', editingItem.id)

        if (error) throw error
        setSuccess('Categoria atualizada com sucesso!')
      } else {
        // Criar
        const { error } = await supabase
          .from('categorias')
          .insert([{
            ...formData,
            user_id: user.id
          }])

        if (error) throw error
        setSuccess('Categoria cadastrada com sucesso!')
      }

      await carregarDados()
      fecharModal()
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
      setError(error.message || 'Erro ao salvar categoria')
    }
  }

  const handleSubmitSubcategoria = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      if (editingItem) {
        // Atualizar
        const { error } = await supabase
          .from('subcategorias')
          .update({ nome: subFormData.nome })
          .eq('id', editingItem.id)

        if (error) throw error
        setSuccess('Subcategoria atualizada com sucesso!')
      } else {
        // Criar
        const { error } = await supabase
          .from('subcategorias')
          .insert([subFormData])

        if (error) throw error
        setSuccess('Subcategoria cadastrada com sucesso!')
      }

      await carregarDados()
      fecharSubModal()
    } catch (error) {
      console.error('Erro ao salvar subcategoria:', error)
      setError(error.message || 'Erro ao salvar subcategoria')
    }
  }

  const handleEditarCategoria = (categoria) => {
    setEditingItem(categoria)
    setFormData({
      nome: categoria.nome,
      tipo: categoria.tipo,
      cor: categoria.cor || '#667eea',
      icone: categoria.icone || '💰'
    })
    setModalType('categoria')
    setShowModal(true)
  }

  const handleEditarSubcategoria = (subcategoria) => {
    setEditingItem(subcategoria)
    setSubFormData({
      categoria_id: subcategoria.categoria_id,
      nome: subcategoria.nome
    })
    setShowSubModal(true)
  }

  const handleExcluirCategoria = async (id) => {
    // Verificar se tem subcategorias
    const subs = subcategorias.filter(s => s.categoria_id === id)
    if (subs.length > 0) {
      setError('Não é possível excluir uma categoria com subcategorias. Exclua as subcategorias primeiro.')
      return
    }

    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return

    try {
      const { error } = await supabase
        .from('categorias')
        .update({ ativo: false })
        .eq('id', id)

      if (error) throw error
      
      setSuccess('Categoria excluída com sucesso!')
      await carregarDados()
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
      setError('Erro ao excluir categoria')
    }
  }

  const handleExcluirSubcategoria = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta subcategoria?')) return

    try {
      const { error } = await supabase
        .from('subcategorias')
        .update({ ativo: false })
        .eq('id', id)

      if (error) throw error
      
      setSuccess('Subcategoria excluída com sucesso!')
      await carregarDados()
    } catch (error) {
      console.error('Erro ao excluir subcategoria:', error)
      setError('Erro ao excluir subcategoria')
    }
  }

  const abrirModalCategoria = () => {
    setEditingItem(null)
    setFormData({
      nome: '',
      tipo: 'despesa',
      cor: '#667eea',
      icone: '💰'
    })
    setModalType('categoria')
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  const abrirModalSubcategoria = (categoriaId) => {
    setEditingItem(null)
    setSubFormData({
      categoria_id: categoriaId,
      nome: ''
    })
    setError('')
    setSuccess('')
    setShowSubModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setError('')
  }

  const fecharSubModal = () => {
    setShowSubModal(false)
    setEditingItem(null)
    setError('')
  }

  const toggleCategoria = (id) => {
    setExpandedCategorias(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const categoriasFiltradas = categorias.filter(cat => {
    if (tipoFiltro === 'todos') return true
    return cat.tipo === tipoFiltro
  })

  const getSubcategoriasPorCategoria = (categoriaId) => {
    return subcategorias.filter(sub => sub.categoria_id === categoriaId)
  }

  const totalReceitas = categorias.filter(c => c.tipo === 'receita').length
  const totalDespesas = categorias.filter(c => c.tipo === 'despesa').length

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Carregando categorias...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Categorias</h1>
          <p>Organize suas receitas e despesas</p>
        </div>
        <button className="btn-primary" onClick={abrirModalCategoria}>
          <Plus size={20} />
          Nova Categoria
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

      {/* Resumo e Filtros */}
      <div className="categorias-header">
        <div className="resumo-badges">
          <div className="badge badge-receita">
            {totalReceitas} Receitas
          </div>
          <div className="badge badge-despesa">
            {totalDespesas} Despesas
          </div>
        </div>

        <div className="filtros">
          <button 
            className={`filtro-btn ${tipoFiltro === 'todos' ? 'active' : ''}`}
            onClick={() => setTipoFiltro('todos')}
          >
            Todos
          </button>
          <button 
            className={`filtro-btn ${tipoFiltro === 'receita' ? 'active' : ''}`}
            onClick={() => setTipoFiltro('receita')}
          >
            Receitas
          </button>
          <button 
            className={`filtro-btn ${tipoFiltro === 'despesa' ? 'active' : ''}`}
            onClick={() => setTipoFiltro('despesa')}
          >
            Despesas
          </button>
        </div>
      </div>

      {/* Lista de Categorias */}
      {categoriasFiltradas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <h2>Nenhuma categoria cadastrada</h2>
          <p>Comece criando categorias para organizar suas transações</p>
          <button className="btn-primary" onClick={abrirModalCategoria}>
            <Plus size={20} />
            Criar Primeira Categoria
          </button>
        </div>
      ) : (
        <div className="categorias-list">
          {categoriasFiltradas.map((categoria) => {
            const subs = getSubcategoriasPorCategoria(categoria.id)
            const isExpanded = expandedCategorias[categoria.id]
            
            console.log('Categoria:', categoria.nome, 'Subs:', subs.length, 'Expanded:', isExpanded)

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
                      onClick={(e) => {
                        e.stopPropagation()
                        if (subs.length > 0) toggleCategoria(categoria.id)
                      }}
                    >
                      {subs.length > 0 ? (
                        isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />
                      ) : (
                        <span style={{ width: '20px', display: 'inline-block' }}></span>
                      )}
                    </button>
                    
                    <div 
                      className="categoria-icon"
                      style={{ backgroundColor: categoria.cor }}
                    >
                      {categoria.icone}
                    </div>

                    <div className="categoria-nome">
                      <h3>{categoria.nome}</h3>
                      <span className={`tipo-badge tipo-${categoria.tipo}`}>
                        {categoria.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                      {subs.length > 0 && (
                        <span className="sub-count">{subs.length} sub</span>
                      )}
                    </div>
                  </div>

                  <div className="categoria-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-icon btn-add"
                      onClick={() => abrirModalSubcategoria(categoria.id)}
                      title="Adicionar Subcategoria"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => handleEditarCategoria(categoria)}
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleExcluirCategoria(categoria.id)}
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Subcategorias */}
                {isExpanded && subs.length > 0 && (
                  <div className="subcategorias-list">
                    {subs.map((sub) => (
                      <div key={sub.id} className="subcategoria-item">
                        <span className="subcategoria-nome">↳ {sub.nome}</span>
                        <div className="subcategoria-actions">
                          <button
                            className="btn-icon-small"
                            onClick={() => handleEditarSubcategoria(sub)}
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn-icon-small btn-delete"
                            onClick={() => handleExcluirSubcategoria(sub.id)}
                            title="Excluir"
                          >
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
      )}

      {/* Modal Categoria */}
      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <button className="btn-close" onClick={fecharModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitCategoria}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Nome da Categoria *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Alimentação"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Tipo *</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="receita"
                        checked={formData.tipo === 'receita'}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      />
                      <span>Receita</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="despesa"
                        checked={formData.tipo === 'despesa'}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      />
                      <span>Despesa</span>
                    </label>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Ícone</label>
                  <div className="icon-picker">
                    {icones.map(icone => (
                      <button
                        key={icone}
                        type="button"
                        className={`icon-option ${formData.icone === icone ? 'active' : ''}`}
                        onClick={() => setFormData({ ...formData, icone })}
                      >
                        {icone}
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
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={fecharModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingItem ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Subcategoria */}
      {showSubModal && (
        <div className="modal-overlay" onClick={fecharSubModal}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Editar Subcategoria' : 'Nova Subcategoria'}</h2>
              <button className="btn-close" onClick={fecharSubModal}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitSubcategoria}>
              <div className="form-group">
                <label>Nome da Subcategoria *</label>
                <input
                  type="text"
                  value={subFormData.nome}
                  onChange={(e) => setSubFormData({ ...subFormData, nome: e.target.value })}
                  placeholder="Ex: Supermercado"
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={fecharSubModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingItem ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
