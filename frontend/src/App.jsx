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
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 group-hover:bg-sky-100 transition-colors">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display font-extrabold text-xl tracking-tight text-slate-900">
              ATENEO
            </span>
            <span className="hidden sm:inline-block ml-2.5 text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200/80">
              RAG Clínico MSP
            </span>
          </div>
        </Link>

        {/* Links por Rol & Usuario Info */}
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
          {user ? (
            <>
              {/* Acceso a Paneles por Rol */}
              {user.rol === 'administrador' && (
                <Link
                  to="/admin"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>Panel Admin</span>
                </Link>
              )}

              {(user.rol === 'docente' || user.rol === 'administrador') && (
                <Link
                  to="/teacher"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Panel Docente</span>
                </Link>
              )}

              {/* Badge del Rol Activo */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-slate-800">
                {user.rol === 'administrador' && <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />}
                {user.rol === 'docente' && <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                {user.rol === 'alumno' && <GraduationCap className="w-3.5 h-3.5 text-sky-600" />}
                <span className="truncate max-w-[120px] font-bold sm:max-w-none">{user.nombre}</span>
                <span className="hidden md:inline uppercase text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-extrabold">
                  {user.rol}
                </span>
              </div>

              {/* Botón Logout */}
              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5 text-sky-600" />
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
