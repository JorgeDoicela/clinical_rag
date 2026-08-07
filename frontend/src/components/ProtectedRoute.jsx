import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-600">Verificando sesión y permisos...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
    return (
      <div className="max-w-md mx-auto my-12 bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
        <h3 className="text-lg font-bold text-rose-900 mb-2">Acceso Restringido</h3>
        <p className="text-sm text-rose-700 mb-4">
          Tu rol de <strong>{user.rol}</strong> no posee los permisos necesarios para acceder a esta sección.
        </p>
        <Navigate to="/" replace />
      </div>
    );
  }

  return children;
}
