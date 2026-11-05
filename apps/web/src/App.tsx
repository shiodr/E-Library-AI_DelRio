import { Link, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Landing } from './pages/Landing'
import { AuthPage } from './pages/AuthPage'
import { Dashboard } from './pages/Dashboard'
import { Explore } from './pages/Explore'
import { BookDetail } from './pages/BookDetail'
import { Assistant } from './pages/Assistant'
import { Library } from './pages/Library'
import { Admin } from './pages/Admin'
import { useAuth } from './context/AuthContext'
import { native } from './lib/api'
import { useNativeNavigation } from './hooks/useNativeNavigation'

function AdminRoute() {
  const { profile } = useAuth()
  return !native && profile?.user?.role === 'admin' ? <Outlet /> : <div className="empty-state"><h1>Administrator access required.</h1><Link className="button secondary" to="/app">Return to your library</Link></div>
}

export default function App() {
  useNativeNavigation()
  return <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<AuthPage key="login" />} />
    <Route path="/register" element={<AuthPage key="register" register />} />
    <Route element={<ProtectedRoute />}><Route path="/app" element={<AppLayout />}>
      <Route index element={<Dashboard />} />
      <Route path="explore" element={<Explore />} />
      <Route path="books/:id" element={<BookDetail />} />
      <Route path="library" element={<Library />} />
      <Route path="favorites" element={<Library favorites />} />
      <Route path="assistant" element={<Assistant />} />
      <Route element={<AdminRoute />}><Route path="admin" element={<Admin />} /></Route>
    </Route></Route>
    <Route path="*" element={<div className="empty-state"><h1>This page isn’t in the collection.</h1><Link className="button primary" to="/">Back to home</Link></div>} />
  </Routes>
}
