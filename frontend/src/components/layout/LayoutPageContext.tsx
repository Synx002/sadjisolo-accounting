import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type LayoutPageState = {
  title: string
  description?: string
}

type LayoutPageContextValue = LayoutPageState & {
  setLayoutPage: (next: LayoutPageState | null) => void
}

const LayoutPageContext = createContext<LayoutPageContextValue | null>(null)

export function LayoutPageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LayoutPageState>({ title: '' })

  const setLayoutPage = useCallback((next: LayoutPageState | null) => {
    setState(next ?? { title: '' })
  }, [])

  return (
    <LayoutPageContext.Provider value={{ ...state, setLayoutPage }}>{children}</LayoutPageContext.Provider>
  )
}

export function useLayoutPage() {
  const ctx = useContext(LayoutPageContext)
  if (!ctx) {
    throw new Error('useLayoutPage must be used within LayoutPageProvider')
  }
  return ctx
}
