import { Link, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Landing } from './pages/Landing'
import { AuthPage } from './pages/AuthPage'
import { Dashboard } from './pages/Dashboard'
import { Explore } from './pages/Explore'
import { BookDetail } from './pages/BookDetail'
import { AssistantPlaceholder, LibraryPlaceholder } from './pages/Placeholders'
import { useNativeNavigation } from './hooks/useNativeNavigation'

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
      <Route path="library" element={<LibraryPlaceholder />} />
      <Route path="favorites" element={<LibraryPlaceholder favorites />} />
      <Route path="assistant" element={<AssistantPlaceholder />} />
    </Route></Route>
    <Route path="*" element={<div className="empty-state"><h1>This page isn’t in the collection.</h1><Link className="button primary" to="/">Back to home</Link></div>} />
  </Routes>
}
