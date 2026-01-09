# 💰 Sistema Financeiro Pessoal

Sistema completo de controle financeiro pessoal desenvolvido com React, Supabase e Vercel.

## 🚀 Tecnologias

- **Frontend**: React + Vite
- **Backend/Database**: Supabase
- **Deploy**: Vercel
- **Controle de Versão**: GitHub
- **Ícones**: Lucide React

## 📋 Funcionalidades (Planejadas)

### ✅ Fase 1 - Básico (Implementado)
- [x] Sistema de autenticação (Login/Registro/Recuperação de senha)
- [x] Layout responsivo com sidebar
- [x] Dashboard inicial
- [x] Estrutura modular de componentes

### 📝 Fase 2 - Controle Financeiro
- [ ] Cadastro de contas bancárias
- [ ] Cadastro de categorias e subcategorias
- [ ] Lançamento de receitas e despesas
- [ ] Baixa de transações
- [ ] Lançamentos em lote
- [ ] Transferências entre contas

### 💎 Fase 3 - Patrimônio
- [ ] Cadastro de imóveis
- [ ] Cadastro de veículos
- [ ] Outros bens patrimoniais
- [ ] Valorização/Depreciação

### 📈 Fase 4 - Investimentos
- [ ] Ações (B3)
- [ ] Fundos Imobiliários
- [ ] Renda Fixa
- [ ] Controle de dividendos
- [ ] Cálculo de preço médio
- [ ] Rentabilidade

### 📊 Fase 5 - Recursos Avançados
- [ ] Cartões de crédito
- [ ] Metas financeiras
- [ ] Orçamento mensal
- [ ] Relatórios personalizados
- [ ] Gráficos e análises
- [ ] Exportação de dados

## 🔧 Instalação

### Pré-requisitos
- Node.js (v18 ou superior)
- npm ou yarn
- Conta no Supabase
- Conta no GitHub
- Conta no Vercel

### Passo 1: Clonar o repositório
```bash
git clone https://github.com/MauroGeorgePtga/financeiropessoal.git
cd financeiropessoal
```

### Passo 2: Instalar dependências
```bash
npm install
```

### Passo 3: Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
VITE_SUPABASE_URL=https://oktcnrbacphzbpgtngkm.supabase.co
VITE_SUPABASE_ANON_KEY=sua-key-aqui
```

### Passo 4: Executar o projeto
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:3000`

## 🗄️ Configuração do Banco de Dados (Supabase)

Execute o script SQL que está no arquivo `database/schema.sql` no SQL Editor do Supabase.

## 🚢 Deploy no Vercel

### Via Interface Web
1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Importe o repositório do GitHub
4. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Clique em "Deploy"

### Via CLI
```bash
npm install -g vercel
vercel login
vercel
```

## 📁 Estrutura do Projeto

```
src/
├── components/
│   ├── auth/           # Componentes de autenticação
│   │   ├── Login.jsx
│   │   └── Auth.css
│   ├── layout/         # Layout principal
│   │   ├── Layout.jsx
│   │   └── Layout.css
│   └── common/         # Componentes reutilizáveis (futuro)
├── contexts/           # Context API
│   └── AuthContext.jsx
├── pages/              # Páginas principais
│   ├── Dashboard.jsx
│   └── Dashboard.css
├── lib/                # Configurações
│   └── supabase.js
├── utils/              # Funções auxiliares (futuro)
├── App.jsx             # Componente principal
├── main.jsx            # Entry point
└── index.css           # Estilos globais
```

## 🎨 Paleta de Cores

- **Primary**: `#667eea` → `#764ba2` (gradient)
- **Success**: `#48bb78`
- **Error**: `#f56565`
- **Warning**: `#ed8936`
- **Background**: `#f5f5f5`

## 📝 Próximos Passos

1. **Configurar tabelas no Supabase** (ver `database/schema.sql`)
2. **Implementar CRUD de Contas Bancárias**
3. **Implementar CRUD de Categorias**
4. **Implementar CRUD de Transações**
5. **Criar Dashboard com dados reais**

## 🤝 Contribuindo

Este é um projeto pessoal, mas sugestões são bem-vindas!

## 📄 Licença

Este projeto é de uso pessoal.

## 👤 Autor

**Mauro George**
- GitHub: [@MauroGeorgePtga](https://github.com/MauroGeorgePtga)
- Email: maurogeorge88@gmail.com

---

**Status do Projeto**: 🟡 Em Desenvolvimento (Fase 1 completa)
