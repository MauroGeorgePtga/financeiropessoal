# 🚀 Guia de Deploy no Vercel

## Método 1: Via Interface Web (Recomendado para iniciantes)

### Passo 1: Preparar o GitHub
1. Certifique-se que seu código está no GitHub
2. Acesse: https://github.com/MauroGeorgePtga/financeiropessoal

### Passo 2: Acessar o Vercel
1. Acesse: https://vercel.com
2. Clique em "Sign Up" ou "Login"
3. Escolha "Continue with GitHub"
4. Autorize o Vercel a acessar seus repositórios

### Passo 3: Importar Projeto
1. No dashboard do Vercel, clique em "Add New"
2. Selecione "Project"
3. Escolha "Import Git Repository"
4. Encontre: `financeiropessoal`
5. Clique em "Import"

### Passo 4: Configurar Build
O Vercel detecta automaticamente que é um projeto Vite. Verifique:

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### Passo 5: Adicionar Variáveis de Ambiente
Na seção "Environment Variables", adicione:

```
Nome: VITE_SUPABASE_URL
Valor: https://oktcnrbacphzbpgtngkm.supabase.co

Nome: VITE_SUPABASE_ANON_KEY
Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdGNucmJhY3BoemJwZ3RuZ2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NDAwMTUsImV4cCI6MjA4MzUxNjAxNX0.3hEMMpIPywKRGE3vm4dlBzpEFQjnybMW_uX_ZsGC_MI
```

**IMPORTANTE**: Marque as três opções:
- ✅ Production
- ✅ Preview
- ✅ Development

### Passo 6: Deploy
1. Clique em "Deploy"
2. Aguarde o processo (leva 1-2 minutos)
3. Seu site estará disponível em: `https://seu-projeto.vercel.app`

---

## Método 2: Via CLI (Para usuários avançados)

### Instalação do Vercel CLI
```bash
npm install -g vercel
```

### Login
```bash
vercel login
```

### Deploy
```bash
# Na raiz do projeto
vercel

# Ou para production
vercel --prod
```

### Configurar variáveis de ambiente via CLI
```bash
vercel env add VITE_SUPABASE_URL production
# Cole o valor quando solicitado

vercel env add VITE_SUPABASE_ANON_KEY production
# Cole o valor quando solicitado
```

---

## Configuração Automática de Deploy

### Deploy Automático ao fazer Push
O Vercel está configurado para fazer deploy automaticamente quando você:

1. **Push na branch `main`**: Deploy em PRODUCTION
2. **Push em outras branches**: Deploy de PREVIEW
3. **Pull Request**: Deploy de PREVIEW para testes

### Como funciona:
```bash
# Você faz alterações
git add .
git commit -m "feat: nova funcionalidade"
git push

# O Vercel detecta automaticamente e faz o deploy
# Você recebe uma URL de preview
```

---

## Domínio Personalizado (Opcional)

### Adicionar domínio próprio
1. No dashboard do Vercel, vá em "Settings"
2. Clique em "Domains"
3. Adicione seu domínio
4. Configure DNS conforme instruções
5. O SSL (HTTPS) é configurado automaticamente

---

## Monitoramento

### Ver logs de deploy
1. Acesse o projeto no Vercel
2. Clique em "Deployments"
3. Selecione um deployment
4. Veja os logs em "Building" e "Functions"

### Ver analytics
1. No dashboard do projeto
2. Clique em "Analytics"
3. Veja visitantes, performance, etc.

---

## Troubleshooting

### Build falhou
```bash
# Localmente, teste o build:
npm run build

# Se funcionar local mas falhar no Vercel:
# 1. Verifique as variáveis de ambiente
# 2. Verifique se todas as dependências estão no package.json
# 3. Veja os logs de erro no Vercel
```

### Página em branco após deploy
```bash
# Verifique:
# 1. Variáveis de ambiente estão corretas?
# 2. Console do navegador tem erros?
# 3. API do Supabase está acessível?
```

### Erro 404 nas rotas
```bash
# Adicione arquivo vercel.json na raiz:
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

---

## URLs Importantes

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Documentação**: https://vercel.com/docs
- **Status**: https://www.vercel-status.com/

---

## Comandos Úteis do Vercel CLI

```bash
# Ver todos os projetos
vercel list

# Ver informações do projeto atual
vercel inspect

# Ver logs em tempo real
vercel logs

# Remover um deployment
vercel remove [deployment-url]

# Ver domínios configurados
vercel domains

# Fazer rollback para deployment anterior
# Vá no dashboard, selecione o deployment antigo e clique em "Promote to Production"
```

---

## Dicas de Performance

1. **Build otimizado já está configurado** com Vite
2. **Imagens**: Use Next.js Image ou otimize antes de adicionar
3. **Lazy Loading**: Implemente para componentes grandes
4. **Cache**: Vercel configura automaticamente

---

## Suporte

- Discord Vercel: https://vercel.com/discord
- Fórum: https://github.com/vercel/vercel/discussions
- Email: support@vercel.com
