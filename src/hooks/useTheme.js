import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useTheme() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const carregarTema = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error || !data) return

        // Aplicar cores no :root
        const root = document.documentElement
        root.style.setProperty('--cor-primaria', data.cor_primaria)
        root.style.setProperty('--cor-secundaria', data.cor_secundaria)
        root.style.setProperty('--cor-sucesso', data.cor_sucesso)
        root.style.setProperty('--cor-erro', data.cor_erro)
        root.style.setProperty('--cor-aviso', data.cor_aviso)

        // Calcular cor do texto
        const corTexto = getContrastColor(data.cor_primaria)
        root.style.setProperty('--cor-texto-primaria', corTexto)
      } catch (error) {
        console.error('Erro ao carregar tema:', error)
      }
    }

    carregarTema()
  }, [user])

  // Calcular contraste
  const getContrastColor = (hexColor) => {
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance < 0.5 ? '#ffffff' : '#000000'
  }
}
