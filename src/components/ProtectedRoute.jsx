import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Spinner from './Spinner'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <Spinner />
  if (!user)   return <Navigate to="/login" replace />

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to the correct dashboard based on role
    const redirectMap = {
      student: '/student',
      cr:      '/cr',
      teacher: '/teacher',
      admin:   '/admin',
    }
    return <Navigate to={redirectMap[profile.role] || '/login'} replace />
  }

  return children
}
