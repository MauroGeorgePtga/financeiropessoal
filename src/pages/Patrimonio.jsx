import './Page.css'

export default function Patrimonio() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Patrimônio</h1>
        <p>Gerencie seus bens patrimoniais</p>
      </div>

      <div className="page-content">
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <h2>Módulo de Patrimônio</h2>
          <p>Em breve você poderá registrar e acompanhar a evolução do seu patrimônio.</p>
          <ul className="feature-list">
            <li>✅ Imóveis (casas, apartamentos, terrenos)</li>
            <li>✅ Veículos (carros, motos)</li>
            <li>✅ Outros bens de valor</li>
            <li>✅ Valorização/Depreciação</li>
            <li>✅ Histórico de valores</li>
            <li>✅ Documentação anexada</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
