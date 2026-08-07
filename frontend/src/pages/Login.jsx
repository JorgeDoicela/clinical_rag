import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, ShieldCheck, GraduationCap, UserCheck, AlertCircle, ArrowRight, Lock, Mail, CheckCircle2, Sparkles, BookOpen } from 'lucide-react';

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
    <div className="min-h-[80vh] flex items-center justify-center py-4">
      <div className="w-full max-w-5xl bg-white border border-slate-200/80 rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* Panel Izquierdo: Branding e Información Institucional */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Sombra/Glow de fondo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

          <div>
            {/* Logo Marca */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 backdrop-blur-md">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <span className="font-display font-extrabold text-2xl tracking-tight text-white block">
                  ATENEO
                </span>
                <span className="text-[11px] font-semibold text-sky-300 tracking-wide uppercase">
                  RAG Clínico MSP Ecuador
                </span>
              </div>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight leading-tight mb-3">
              Evaluación Formativa del Razonamiento Clínico
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-8">
              Plataforma basada en inteligencia artificial generativa y recuperación vectorial para validar decisiones diagnósticas contra las Guías de Práctica Clínica del Ministerio de Salud Pública.
            </p>

            {/* Características destacadas */}
            <div className="space-y-3.5 pt-4 border-t border-slate-800 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>Validación cuantitativa y cualitativa en tiempo real</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <span>Citas textuales con sección y número de página GPC</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span>Soporte multimodal OCR para análisis de imágenes</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 text-[11px] text-slate-400">
            Ministerio de Salud Pública del Ecuador — Licencia Académica
          </div>
        </div>

        {/* Panel Derecho: Formulario de Autenticación & Perfiles Demo */}
        <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Acceso al Sistema</h2>
              <p className="text-xs text-slate-500 mt-1">
                Selecciona un perfil de prueba rápida o ingresa tus credenciales institucionales.
              </p>
            </div>

            {/* Selector de Perfil Demo de 1-Clic */}
            <div className="mb-6">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Perfil de Prueba Rápida (Selecciona uno)
              </label>

              <div className="grid grid-cols-3 gap-2">
                {/* Selector Alumno */}
                <button
                  type="button"
                  onClick={() => handleRoleSelect('alumno', 'alumno@ateneo.edu.ec', 'Alumno123!')}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col items-center text-center gap-1.5 ${
                    selectedRole === 'alumno'
                      ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    selectedRole === 'alumno' ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">Alumno</span>
                  <span className="text-[10px] text-slate-500">Estudiante</span>
                </button>

                {/* Selector Docente */}
                <button
                  type="button"
                  onClick={() => handleRoleSelect('docente', 'docente@ateneo.edu.ec', 'Docente123!')}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col items-center text-center gap-1.5 ${
                    selectedRole === 'docente'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    selectedRole === 'docente' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">Docente</span>
                  <span className="text-[10px] text-slate-500">Tutor Clínico</span>
                </button>

                {/* Selector Admin */}
                <button
                  type="button"
                  onClick={() => handleRoleSelect('admin', 'admin@ateneo.edu.ec', 'Admin123!')}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col items-center text-center gap-1.5 ${
                    selectedRole === 'admin'
                      ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    selectedRole === 'admin' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">Admin</span>
                  <span className="text-[10px] text-slate-500">Gestión</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@ateneo.edu.ec"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-xs sm:text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-xs sm:text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-sky-600/10 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                <span>{submitting ? 'Autenticando...' : `Ingresar como ${selectedRole === 'alumno' ? 'Alumno' : selectedRole === 'docente' ? 'Docente' : 'Administrador'}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

          </div>
        </div>

      </div>
    </div>
  );
}
