import { useState, ChangeEvent } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Award, 
  ShieldCheck, 
  UserCheck, 
  Search, 
  SlidersHorizontal, 
  X, 
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { useConnectivitySync } from '../storage/useConnectivitySync';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const { isOnline, isSyncing, pendingCount, syncPendingEvaluations } = useConnectivitySync();

  const searchQuery = searchParams.get('q') || '';

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const getInitials = (name?: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-4">
        
        {/* 1. Logo & Marca Ateneo+ */}
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

        {/* 2. Barra de Búsqueda */}
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

        {/* 3. Navegación, Conectividad y Perfil */}
        <div className="flex items-center gap-3 text-xs font-medium text-[#444746] shrink-0">
          {/* Indicador de Conectividad Clínica & Background Sync */}
          {!isOnline ? (
            <div 
              className="flex items-center gap-1.5 text-amber-700 font-medium px-2 py-1"
              title="Sin conexión de red hospitalaria. Modo local activo con buffer seguro."
            >
              <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="hidden sm:inline">Modo Local</span>
            </div>
          ) : pendingCount > 0 ? (
            <button
              onClick={() => syncPendingEvaluations()}
              disabled={isSyncing}
              className="flex items-center gap-1.5 text-indigo-700 hover:text-indigo-900 transition-colors font-medium px-2 py-1 cursor-pointer"
              title="Sincronizar evaluaciones pendientes con el clúster central"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
            </button>
          ) : (
            <div 
              className="hidden lg:flex items-center gap-1.5 text-emerald-700 font-medium px-2 py-1"
              title="Conexión en línea activa con el clúster clínico"
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[11px]">En línea</span>
            </div>
          )}

          {user ? (
            <>
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

              {/* Avatar Circular con Iniciales */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white font-semibold text-xs flex items-center justify-center shadow-xs hover:ring-2 hover:ring-[#0b57d0]/40 transition-all cursor-pointer"
                  title={user.nombre}
                >
                  {getInitials(user.nombre)}
                </button>

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
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
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
            <Link
              to="/login"
              className="px-4 py-2 bg-[#0b57d0] hover:bg-blue-700 text-white rounded-full text-xs font-medium transition-colors"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
