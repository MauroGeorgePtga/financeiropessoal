import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import './Dashboard.css'

export default function Dashboard() {
  // Dados temporários para demonstração
  const cards = [
    {
      title: 'Saldo Total',
      value: 'R$ 0,00',
      icon: Wallet,
      color: '#667eea'
    },
    {
      title: 'Receitas do Mês',
      value: 'R$ 0,00',
      icon: TrendingUp,
      color: '#48bb78'
    },
    {
      title: 'Despesas do Mês',
      value: 'R$ 0,00',
      icon: TrendingDown,
      color: '#f56565'
    },
    {
      title: 'Patrimônio',
      value: 'R$ 0,00',
      icon: DollarSign,
      color: '#ed8936'
    }
  ]

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Bem-vindo ao seu controle financeiro pessoal</p>
      </div>

      <div className="cards-grid">
        {cards.map((card, index) => (
          <div key={index} className="dashboard-card">
            <div className="card-icon" style={{ backgroundColor: card.color }}>
              <card.icon size={24} color="white" />
            </div>
            <div className="card-content">
              <span className="card-title">{card.title}</span>
              <span className="card-value">{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-content">
        <div className="content-box">
          <h2>Próximos Passos</h2>
          <ul className="steps-list">
            <li>✅ Sistema configurado e funcionando</li>
            <li>📝 Configure suas contas bancárias</li>
            <li>📝 Crie categorias para suas transações</li>
            <li>📝 Comece a registrar suas receitas e despesas</li>
            <li>📝 Cadastre seu patrimônio</li>
            <li>📝 Registre seus investimentos</li>
          </ul>
        </div>

        <div className="content-box">
          <h2>Informações do Sistema</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Versão:</span>
              <span className="info-value">1.0.0</span>
            </div>
            <div className="info-item">
              <span className="info-label">Banco de Dados:</span>
              <span className="info-value">Supabase</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status:</span>
              <span className="info-value status-online">● Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
