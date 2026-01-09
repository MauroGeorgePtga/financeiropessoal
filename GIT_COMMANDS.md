# 🔧 Guia de Comandos Git

## Primeira vez - Configurar e enviar para o GitHub

```bash
# 1. Inicializar repositório Git (se ainda não foi feito)
git init

# 2. Adicionar todos os arquivos
git add .

# 3. Fazer o primeiro commit
git commit -m "Estrutura inicial do sistema financeiro pessoal"

# 4. Conectar ao repositório remoto do GitHub
git remote add origin https://github.com/MauroGeorgePtga/financeiropessoal.git

# 5. Definir branch principal como main
git branch -M main

# 6. Enviar para o GitHub
git push -u origin main
```

## Comandos diários de trabalho

```bash
# Ver status das mudanças
git status

# Adicionar arquivos modificados
git add .
# OU adicionar arquivo específico
git add src/components/MinhaAlteracao.jsx

# Fazer commit com mensagem descritiva
git commit -m "Descrição clara do que foi alterado"

# Enviar para o GitHub
git push

# Puxar alterações do GitHub (se trabalhar em múltiplos lugares)
git pull
```

## Comandos úteis

```bash
# Ver histórico de commits
git log

# Ver histórico resumido
git log --oneline

# Desfazer alterações em um arquivo (antes do commit)
git checkout -- arquivo.js

# Ver diferenças do que foi alterado
git diff

# Ver branches existentes
git branch

# Criar nova branch
git checkout -b nome-da-branch

# Trocar de branch
git checkout main

# Mesclar branch na main
git merge nome-da-branch
```

## Mensagens de commit sugeridas

```bash
# Novos recursos
git commit -m "feat: adicionar CRUD de contas bancárias"
git commit -m "feat: implementar dashboard com gráficos"

# Correções
git commit -m "fix: corrigir cálculo de saldo nas transações"
git commit -m "fix: resolver bug no login"

# Melhorias
git commit -m "refactor: reorganizar estrutura de componentes"
git commit -m "style: melhorar layout do dashboard"

# Documentação
git commit -m "docs: atualizar README com instruções"

# Configuração
git commit -m "chore: atualizar dependências"
```

## Em caso de conflitos

```bash
# 1. Puxar as alterações
git pull

# 2. Resolver conflitos manualmente nos arquivos
# 3. Adicionar arquivos resolvidos
git add .

# 4. Finalizar o merge
git commit -m "merge: resolver conflitos"

# 5. Enviar
git push
```

## Arquivo .gitignore

O arquivo `.gitignore` já está configurado para ignorar:
- node_modules/
- dist/
- .env
- .env.local
- .env.production

**IMPORTANTE**: Nunca commitar o arquivo .env com suas credenciais!
