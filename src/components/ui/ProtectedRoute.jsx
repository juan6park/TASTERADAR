import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'var(--color-bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
             style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent-light)' }} />
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}
