import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Log para debug (remover depois)
console.log('🔧 Configuração Supabase:')
console.log('URL:', supabaseUrl)
console.log('Key existe:', supabaseAnonKey ? 'SIM' : 'NÃO')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERRO: Variáveis de ambiente do Supabase não encontradas!')
  console.error('VITE_SUPABASE_URL:', supabaseUrl)
  console.error('VITE_SUPABASE_ANON_KEY existe:', !!supabaseAnonKey)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Testar conexão
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Erro ao verificar sessão:', error)
  } else {
    console.log('✅ Supabase conectado com sucesso!')
    console.log('Sessão atual:', data.session ? 'Existe' : 'Não existe')
  }
})
