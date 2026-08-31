import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CaseList from './pages/CaseList';
import CaseSolve from './pages/CaseSolve';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AteneoRoom from './pages/AteneoRoom';
import ScientificBenchmarkView from './components/ScientificBenchmarkView';
import { 
  Activity, 
  ShieldCheck, 
  HeartPulse, 
  LogOut, 
  User, 
  GraduationCap, 
  UserCheck, 
  Lock, 
  Award, 
  Search, 
  SlidersHorizontal, 
  Sparkles,
  Menu,
  HelpCircle,
  Settings,
  X
} from 'lucide-react';

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const searchQuery = searchParams.get('q') || '';

    const handleSearchChange = (e) => {
        const val = e.target.value;
        if (location.pathname !== '/') {
            navigate(`/?q=${encodeURIComponent(val)}`);
        } else {
            if (val) {
                setSearchParams({ q: val });
            } else {
                setSearchParams({});
            }
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
            <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-4">
                
                {/* 1. IZQUIERDA: Logo & Marca Ateneo+ */}
                <div className="flex items-center gap-3 shrink-0">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <img
                            src="/ateneo.png"
                            alt="Ateneo+"
                            className="w-7 h-7 object-contain group-hover:scale-105 transition-transform"
                        />
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-heading font-black text-xl tracking-tight text-slate-900">
                                ATENEO<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600">+</span>
                            </span>
                        </div>
                    </Link>
                </div>

                {/* 2. CENTRO: Cápsula de Búsqueda Google Workspace (El elemento estrella) */}
                <div className="w-full max-w-2xl mx-auto hidden md:flex items-center">
                    <div className="w-full bg-[#eaf1fb] hover:bg-[#e1eaf8] focus-within:bg-white focus-within:shadow-md focus-within:ring-1 focus-within:ring-slate-300 rounded-full px-4 py-2 transition-all flex items-center gap-3 border border-transparent">
                        <Search className="w-4 h-4 text-[#747775] shrink-0" />
                        <input
                            type="text"
                            placeholder="Buscar en Ateneo: casos clínicos, síntomas, diagnósticos o GPC MSP..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="w-full bg-transparent text-xs sm:text-sm text-[#1f1f1f] focus:outline-none placeholder:text-[#747775]"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchParams({})}
                                className="text-xs text-[#747775] hover:text-[#1f1f1f] p-1 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
                                title="Limpiar búsqueda"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button
                            title="Filtros de Búsqueda"
                            onClick={() => navigate('/?filter=open')}
                            className="p-1 text-[#747775] hover:text-[#1f1f1f] rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 3. DERECHA: Herramientas, Benchmark & Perfil de Usuario */}
                <div className="flex items-center gap-3 text-xs font-medium text-[#444746] shrink-0">
                    {user ? (
                        <>
                            {/* Acceso Directo a Benchmark */}
                            <Link
                                to="/benchmark"
                                title="Benchmark Científico"
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                                    location.pathname === '/benchmark'
                                        ? 'bg-sky-50 text-[#0b57d0] font-semibold'
                                        : 'text-[#444746] hover:text-[#1f1f1f] hover:bg-slate-100'
                                }`}
                            >
                                <Award className="w-4 h-4 text-[#0b57d0]" />
                                <span className="hidden sm:inline">Benchmark</span>
                            </Link>

                            {/* Paneles Especiales por Rol */}
                            {user.rol === 'administrador' && (
                                <Link
                                    to="/admin"
                                    className="hidden sm:flex items-center gap-1 text-[#444746] hover:text-[#1f1f1f] px-2 py-1"
                                >
                                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                                    <span>Admin</span>
                                </Link>
                            )}

                            {(user.rol === 'docente' || user.rol === 'administrador') && (
                                <Link
                                    to="/teacher"
                                    className="hidden sm:flex items-center gap-1 text-[#444746] hover:text-[#1f1f1f] px-2 py-1"
                                >
                                    <UserCheck className="w-4 h-4 text-blue-600" />
                                    <span>Docente</span>
                                </Link>
                            )}

                            {/* Avatar Circular Google Material 3 con Iniciales */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white font-semibold text-xs flex items-center justify-center shadow-xs hover:ring-2 hover:ring-[#0b57d0]/40 transition-all cursor-pointer"
                                    title={user.nombre}
                                >
                                    {getInitials(user.nombre)}
                                </button>

                                {/* Menú Desplegable de Perfil */}
                                {showProfileMenu && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-[20px] shadow-lg border border-slate-200/80 p-4 z-50 animate-fadeIn">
                                        <div className="text-center pb-3 border-b border-slate-100">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white font-semibold text-sm flex items-center justify-center mx-auto mb-2 shadow-xs">
                                                {getInitials(user.nombre)}
                                            </div>
                                            <p className="font-semibold text-sm text-[#1f1f1f] truncate">{user.nombre}</p>
                                            <p className="text-xs text-[#747775] truncate">{user.email || 'alumno@ateneo.edu.ec'}</p>
                                            <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-[#0b57d0] uppercase">
                                                {user.rol}
                                            </span>
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                onClick={() => {
                                                    setShowProfileMenu(false);
                                                    handleLogout();
                                                }}
                                                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                                            >
                                                <LogOut className="w-3.5 h-3.5" />
                                                <span>Cerrar Sesión</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[#444746]">
                            <Activity className="w-4 h-4 text-[#0b57d0]" />
                            <span>Evaluación Médica RAG</span>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

function AppContent() {
    const location = useLocation();
    const isLogin = location.pathname === '/login';

    return (
        <div className="min-h-screen flex flex-col font-sans bg-[#f0f4f9] text-[#1f1f1f]">
            {!isLogin && <Navbar />}

            <main className={`flex-1 w-full ${isLogin ? 'flex items-center justify-center p-4 sm:p-6' : 'w-full max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-12 py-8'}`}>
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

            {!isLogin && (
                <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
                    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-12">
                        <p>© 2026 Ateneo+ — Sistema Formativo de Razonamiento Clínico. Guías Oficiales del MSP del Ecuador.</p>
                    </div>
                </footer>
            )}
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AppContent />
            </BrowserRouter>
        </AuthProvider>
    );
}
