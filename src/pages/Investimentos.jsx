import './Page.css'

export default function Investimentos() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Investimentos</h1>
        <p>Gerencie sua carteira de investimentos</p>
      </div>

      <div className="page-content">
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <h2>Módulo de Investimentos</h2>
          <p>Em breve você poderá controlar todos os seus investimentos em um só lugar.</p>
          <ul className="feature-list">
            <li>✅ Ações (B3)</li>
            <li>✅ Fundos Imobiliários (FIIs)</li>
            <li>✅ Renda Fixa (Tesouro, CDB, LCI/LCA)</li>
            <li>✅ Controle de dividendos e proventos</li>
            <li>✅ Cálculo de preço médio</li>
            <li>✅ Análise de rentabilidade</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
