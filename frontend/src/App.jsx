import React from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CaseList from './pages/CaseList';
import CaseSolve from './pages/CaseSolve';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import { Activity, ShieldCheck, HeartPulse, LogOut, User, GraduationCap, UserCheck, Lock } from 'lucide-react';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo & Marca */}
        <Link to="/" className="flex items-center gap-2 group">
          <HeartPulse className="w-6 h-6 text-sky-600 group-hover:scale-105 transition-transform" />
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-xl tracking-tight text-slate-900">
              ATENEO
            </span>
            <span className="hidden sm:inline-block text-xs font-medium text-slate-500">
              RAG Clínico MSP
            </span>
          </div>
        </Link>

        {/* Links por Rol & Usuario Info */}
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
          {user ? (
            <>
              {/* Acceso a Paneles por Rol */}
              {user.rol === 'administrador' && (
                <Link
                  to="/admin"
                  className="hidden sm:flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  <span>Panel Admin</span>
                </Link>
              )}

              {(user.rol === 'docente' || user.rol === 'administrador') && (
                <Link
                  to="/teacher"
                  className="hidden sm:flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-slate-500" />
                  <span>Panel Docente</span>
                </Link>
              )}

              {/* Rol Activo */}
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                {user.rol === 'administrador' && <ShieldCheck className="w-4 h-4 text-slate-500" />}
                {user.rol === 'docente' && <UserCheck className="w-4 h-4 text-slate-500" />}
                {user.rol === 'alumno' && <GraduationCap className="w-4 h-4 text-slate-500" />}
                <span className="font-bold">{user.nombre}</span>
                <span className="hidden md:inline uppercase text-[10px] text-slate-400 font-bold">
                  ({user.rol})
                </span>
              </div>

              {/* Botón Logout */}
              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Activity className="w-4 h-4 text-sky-600" />
              <span>Evaluación Médica RAG</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
          <Navbar />

          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={['alumno', 'docente', 'administrador']}>
                    <CaseList />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/case/:id"
                element={
                  <ProtectedRoute allowedRoles={['alumno', 'docente', 'administrador']}>
                    <CaseSolve />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['administrador']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/teacher"
                element={
                  <ProtectedRoute allowedRoles={['docente', 'administrador']}>
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>

          <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
            <p>(c) 2026 Ateneo - Sistema Formativo de Razonamiento Clínico. Guías Oficiales del MSP del Ecuador.</p>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
