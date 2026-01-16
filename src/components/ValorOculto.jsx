import { useVisibility } from '../contexts/VisibilityContext'

export function ValorOculto({ valor, formatado = true }) {
  const { valoresVisiveis } = useVisibility()

  if (!valoresVisiveis) {
    return <span>••••••</span>
  }
