import './Page.css'

export default function Transacoes() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Transações</h1>
        <p>Gerencie suas receitas e despesas</p>
      </div>

      <div className="page-content">
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <h2>Módulo de Transações</h2>
          <p>Em breve você poderá registrar e gerenciar todas as suas transações financeiras.</p>
          <ul className="feature-list">
            <li>✅ Cadastrar receitas e despesas</li>
            <li>✅ Organizar por categorias</li>
            <li>✅ Lançamentos em lote</li>
            <li>✅ Controle de recorrência</li>
            <li>✅ Histórico completo</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
