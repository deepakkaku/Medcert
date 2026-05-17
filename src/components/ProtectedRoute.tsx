import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  const [hasInitialized, setHasInitialized] = React.useState(false)

  React.useEffect(() => {
    if (!isLoading) {
      setHasInitialized(true)
    }
  }, [isLoading])

  // Only show the full-page loader on the VERY FIRST load
  if (isLoading && !hasInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-medium">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!user && !isLoading) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
