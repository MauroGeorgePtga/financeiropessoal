import { createContext, useContext, useState } from 'react'

const VisibilityContext = createContext()

export function VisibilityProvider({ children }) {
  const [valoresVisiveis, setValoresVisiveis] = useState(true)

  const toggleVisibilidade = () => {
    setValoresVisiveis(prev => !prev)
  }

  return (
    <VisibilityContext.Provider value={{ valoresVisiveis, toggleVisibilidade }}>
      {children}
    </VisibilityContext.Provider>
  )
}

export function useVisibility() {
  return useContext(VisibilityContext)
}
