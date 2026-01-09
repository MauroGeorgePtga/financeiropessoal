import { useAuth } from '../contexts/AuthContext'
import './Page.css'

export default function Configuracoes() {
  const { user } = useAuth()

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Configurações</h1>
        <p>Gerencie suas preferências do sistema</p>
      </div>

      <div className="page-content">
        <div className="config-section">
          <h3>👤 Informações da Conta</h3>
          <div className="config-item">
            <label>Email:</label>
            <span>{user?.email}</span>
          </div>
          <div className="config-item">
            <label>ID:</label>
            <span className="small-text">{user?.id}</span>
          </div>
        </div>

        <div className="config-section">
          <h3>🔧 Em Desenvolvimento</h3>
          <p>Em breve você poderá configurar:</p>
          <ul className="feature-list">
            <li>✅ Alterar senha</li>
            <li>✅ Editar perfil</li>
            <li>✅ Preferências de notificação</li>
            <li>✅ Categorias padrão</li>
            <li>✅ Temas e cores</li>
            <li>✅ Backup de dados</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
