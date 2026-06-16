import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/useAuthStore'
import ProtectedRoute from './components/ui/ProtectedRoute'

import Landing  from './pages/Landing'
import Login    from './pages/Login'
import Register from './pages/Register'
import Tutorial from './pages/Tutorial'
import Main     from './pages/Main'
import Profile  from './pages/Profile'
import Callback from './pages/Callback'

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/tutorial" element={
          <ProtectedRoute><Tutorial /></ProtectedRoute>
        } />
        <Route path="/main" element={
          <ProtectedRoute><Main /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />
        <Route path="/callback" element={<Callback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
