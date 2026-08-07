import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('alumno@ateneo.edu.ec');
  const [password, setPassword] = useState('Alumno123!');
  const [selectedRole, setSelectedRole] = useState('alumno');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleRoleSelect = (roleKey, demoEmail, demoPassword) => {
    setSelectedRole(roleKey);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const user = await login(email, password);
      if (user.rol === 'administrador') {
        navigate('/admin');
      } else if (user.rol === 'docente') {
        navigate('/teacher');
      } else {
        navigate(from === '/login' ? '/' : from);
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 sm:p-10">
        
        {/* Header & Logo */}
        <div className="text-center mb-8">
          <HeartPulse className="w-8 h-8 text-sky-600 mx-auto mb-2" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">ATENEO RAG</h1>
          <p className="text-xs text-slate-500 mt-1">Plataforma de Evaluación Formativa del Razonamiento Clínico</p>
        </div>

        {/* Tab Segmentado de Roles (Pill Tabs Ultra Limpias) */}
        <div className="mb-6">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Perfil Demo Rápido
          </label>
          <div className="bg-slate-100/80 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60">
            <button
              type="button"
              onClick={() => handleRoleSelect('alumno', 'alumno@ateneo.edu.ec', 'Alumno123!')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedRole === 'alumno'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Alumno
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('docente', 'docente@ateneo.edu.ec', 'Docente123!')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedRole === 'docente'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Docente
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('admin', 'admin@ateneo.edu.ec', 'Admin123!')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedRole === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ateneo.edu.ec"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{submitting ? 'Autenticando...' : 'Iniciar Sesión'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[11px] text-slate-400 text-center mt-6">
          Ministerio de Salud Pública del Ecuador
        </p>

      </div>
    </div>
  );
}
