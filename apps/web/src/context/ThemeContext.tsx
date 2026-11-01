import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

const ThemeContext = createContext({ dark: false, toggle: () => {} })
function initialTheme() {
  try {
    const saved = localStorage.getItem('elibrary-theme')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch { return false }
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(initialTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    try { localStorage.setItem('elibrary-theme', dark ? 'dark' : 'light') } catch { /* Theme remains in memory. */ }
  }, [dark])
  return <ThemeContext.Provider value={{ dark, toggle: () => setDark(value => !value) }}>{children}</ThemeContext.Provider>
}
export function useTheme() { return useContext(ThemeContext) }
