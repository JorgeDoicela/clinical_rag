import React from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CaseList from './pages/CaseList';
import CaseSolve from './pages/CaseSolve';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AteneoRoom from './pages/AteneoRoom';
import ScientificBenchmarkView from './components/ScientificBenchmarkView';
import { Activity, ShieldCheck, HeartPulse, LogOut, User, GraduationCap, UserCheck, Lock, Award } from 'lucide-react';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
              {/* Acceso a Benchmark Científico para Congreso / Artículos */}
              <Link
                to="/benchmark"
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                  location.pathname === '/benchmark'
                    ? 'bg-sky-50 text-sky-700 font-bold border border-sky-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-4 h-4 text-sky-600" />
                <span>Benchmark Científico</span>
              </Link>

              {/* Acceso a Paneles por Rol */}
              {user.rol === 'administrador' && location.pathname !== '/admin' && (
                <Link
                  to="/admin"
                  className="hidden sm:flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  <span>Panel Admin</span>
                </Link>
              )}

              {(user.rol === 'docente' || user.rol === 'administrador') && location.pathname !== '/teacher' && (
                <Link
                  to="/teacher"
                  className="hidden sm:flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-slate-500" />
                  <span>Panel Docente</span>
                </Link>
              )}

              {/* Rol Activo y Nombre */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{user.nombre}</span>
                {user.rol === 'alumno' && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold bg-sky-50 text-sky-800 border-sky-200 uppercase tracking-wider">
                    <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
                    <span>Alumno</span>
                  </span>
                )}
                {user.rol === 'docente' && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200 uppercase tracking-wider">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Docente</span>
                  </span>
                )}
                {user.rol === 'administrador' && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold bg-purple-50 text-purple-800 border-purple-200 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Admin</span>
                  </span>
                )}
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
                path="/benchmark"
                element={
                  <ProtectedRoute allowedRoles={['alumno', 'docente', 'administrador']}>
                    <ScientificBenchmarkView />
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

              <Route path="/ateneo" element={<Navigate to="/" replace />} />

              <Route
                path="/ateneo/:roomCode"
                element={
                  <ProtectedRoute allowedRoles={['alumno', 'docente', 'administrador']}>
                    <AteneoRoom />
                  </ProtectedRoute>
                }
              />

              {/* Ruta comodín para capturar URLs no existentes y evitar pantallas en blanco */}
              <Route path="*" element={<Navigate to="/" replace />} />
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
