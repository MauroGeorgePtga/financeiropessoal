import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Edit2, Trash2, X, List } from 'lucide-react'
import './Categorias.css'

export default function CategoriasModal() {
  const { user } = useAuth()
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [showSubListModal, setShowSubListModal] = useState(false)
  const [selectedCategoria, setSelectedCategoria] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  
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
    } catch (err) { setError(err.message) }
  }

  const handleSubmitSubcategoria = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await supabase.from('subcategorias').update({ nome: subFormData.nome }).eq('id', editingItem.id)
      } else {
        await supabase.from('subcategorias').insert([{ categoria_id: subFormData.categoria_id, nome: subFormData.nome }])
      }
      await carregarDados()
      fecharModalSub()
      setSuccess('Salvo!')
    } catch (err) { setError(err.message) }
  }

  const fecharModal = () => { setShowModal(false); setEditingItem(null); setFormData({ nome: '', tipo: 'despesa', cor: '#667eea', icone: '💰' }) }
  const fecharModalSub = () => { setShowSubModal(false); setEditingItem(null); setSubFormData({ categoria_id: '', nome: '' }) }

  const verSubcategorias = (categoria) => {
    setSelectedCategoria(categoria)
    setShowSubListModal(true)
  }

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

      <div className="categorias-list">
        {categoriasFiltradas.map(cat => {
          const subs = getSubcategorias(cat.id)
          
          return (
            <div key={cat.id} className="categoria-item" style={{marginBottom: '10px'}}>
              <div className="categoria-header">
                <div className="categoria-info">
                  <div className="categoria-icon" style={{ backgroundColor: cat.cor }}>{cat.icone}</div>
                  <div className="categoria-nome">
                    <h3>{cat.nome}</h3>
                    <span className={`tipo-badge tipo-${cat.tipo}`}>{cat.tipo === 'receita' ? 'Receita' : 'Despesa'}</span>
                    {subs.length > 0 && <span className="sub-count">{subs.length} sub</span>}
                  </div>
                </div>
                <div className="categoria-actions">
                  {subs.length > 0 && (
                    <button className="btn-icon" onClick={() => verSubcategorias(cat)} title="Ver Subcategorias" style={{color: '#667eea'}}>
                      <List size={16} />
                    </button>
                  )}
                  <button className="btn-icon btn-add" onClick={() => { setSubFormData({ categoria_id: cat.id, nome: '' }); setShowSubModal(true) }}><Plus size={16} /></button>
                  <button className="btn-icon" onClick={() => { setEditingItem(cat); setFormData(cat); setShowModal(true) }}><Edit2 size={16} /></button>
                  <button className="btn-icon btn-delete" onClick={async () => { if(confirm('Excluir?')) { await supabase.from('categorias').update({ativo:false}).eq('id',cat.id); carregarDados() }}}><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Ver Subcategorias */}
      {showSubListModal && selectedCategoria && (
        <div className="modal-overlay" onClick={() => setShowSubListModal(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Subcategorias de {selectedCategoria.nome}</h2>
              <button className="btn-close" onClick={() => setShowSubListModal(false)}><X size={24} /></button>
            </div>
            <div style={{padding: '20px'}}>
              {getSubcategorias(selectedCategoria.id).map(sub => (
                <div key={sub.id} className="subcategoria-item">
                  <span className="subcategoria-nome">↳ {sub.nome}</span>
                  <div className="subcategoria-actions">
                    <button className="btn-icon-small" onClick={() => { setEditingItem(sub); setSubFormData({ categoria_id: sub.categoria_id, nome: sub.nome }); setShowSubModal(true); setShowSubListModal(false) }}><Edit2 size={14} /></button>
                    <button className="btn-icon-small btn-delete" onClick={async () => { if(confirm('Excluir?')) { await supabase.from('subcategorias').update({ativo:false}).eq('id',sub.id); carregarDados() }}}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Categoria */}
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
              <div className="form-group"><label>Cor</label><div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>{cores.map(c => <button key={c} type="button" style={{backgroundColor: c, width: 40, height: 40, border: formData.cor === c ? '3px solid #333' : '2px solid #ddd', borderRadius: 8, cursor: 'pointer'}} onClick={() => setFormData({...formData, cor: c})} />)}</div></div>
              <div className="modal-footer"><button type="button" className="btn-secondary" onClick={fecharModal}>Cancelar</button><button type="submit" className="btn-primary">Salvar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Subcategoria */}
      {showSubModal && (
        <div className="modal-overlay" onClick={fecharModalSub}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>{editingItem ? 'Editar' : 'Nova'} Subcategoria</h2><button className="btn-close" onClick={fecharModalSub}><X size={24} /></button></div>
            <form onSubmit={handleSubmitSubcategoria}>
              <div className="form-group"><label>Nome *</label><input type="text" value={subFormData.nome} onChange={(e) => setSubFormData({...subFormData, nome: e.target.value})} required /></div>
              <div className="modal-footer"><button type="button" className="btn-secondary" onClick={fecharModalSub}>Cancelar</button><button type="submit" className="btn-primary">Salvar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
