import './Page.css'

export default function Relatorios() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Relatórios</h1>
        <p>Análises e exportações de dados</p>
      </div>

      <div className="page-content">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h2>Módulo de Relatórios</h2>
          <p>Em breve você terá acesso a relatórios completos e personalizados.</p>
          <ul className="feature-list">
            <li>✅ Relatórios de receitas e despesas</li>
            <li>✅ Análise de fluxo de caixa</li>
            <li>✅ Performance de investimentos</li>
            <li>✅ Evolução patrimonial</li>
            <li>✅ Exportação para Excel/PDF</li>
            <li>✅ Relatórios para Imposto de Renda</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
