import { useVisibility } from '../contexts/VisibilityContext'

export function ValorOculto({ valor, formatado = true }) {
  const { valoresVisiveis } = useVisibility()

  if (!valoresVisiveis) {
    return <span>••••••</span>
  }

  const valorFormatado = formatado 
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(valor || 0)
    : valor

  return <span>{valorFormatado}</span>
}
