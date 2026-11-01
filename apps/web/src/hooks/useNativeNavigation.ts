import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { native } from '../lib/api'
import { useTheme } from '../context/ThemeContext'

export function useNativeNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { dark } = useTheme()
  useEffect(() => {
    if (!native) return
    const listener = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && location.pathname !== '/' && location.pathname !== '/app') navigate(-1)
      else void App.exitApp()
    })
    return () => { void listener.then(handle => handle.remove()) }
  }, [location.pathname, navigate])
  useEffect(() => {
    if (!native) return
    void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {})
  }, [dark])
}
