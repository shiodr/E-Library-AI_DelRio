import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import './styles.css'
import './modern.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter><MotionConfig reducedMotion="user"><ThemeProvider><AuthProvider><App /></AuthProvider></ThemeProvider></MotionConfig></BrowserRouter></StrictMode>,
)
