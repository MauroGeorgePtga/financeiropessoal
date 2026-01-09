import './Page.css'

export default function ContasBancarias() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Contas Bancárias</h1>
        <p>Gerencie suas contas e carteiras</p>
      </div>

      <div className="page-content">
        <div className="empty-state">
          <div className="empty-icon">🏦</div>
          <h2>Módulo de Contas Bancárias</h2>
          <p>Em breve você poderá gerenciar todas as suas contas bancárias e carteiras digitais.</p>
          <ul className="feature-list">
            <li>✅ Cadastrar múltiplas contas</li>
            <li>✅ Controle de saldos</li>
            <li>✅ Transferências entre contas</li>
            <li>✅ Histórico de movimentações</li>
            <li>✅ Conciliação bancária</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
