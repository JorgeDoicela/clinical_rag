import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ChevronDown } from 'lucide-react';

function FloatingOutlinedInput({ 
  id, 
  label, 
  type = 'text', 
  value, 
  onChange, 
  required = false, 
  autoFocus = false 
}) {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || (value && value.length > 0);

  return (
    <div className="relative pt-2">
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          autoFocus={autoFocus}
          className={`w-full px-4 py-3.5 bg-transparent rounded-[4px] text-base text-[#1f1f1f] focus:outline-none transition-all font-normal placeholder-transparent peer ${
            focused 
              ? 'border-2 border-[#0b57d0]' 
              : 'border border-[#747775] hover:border-[#1f1f1f]'
          }`}
          placeholder={label}
        />
        <label
          htmlFor={id}
          className={`absolute left-3 transition-all duration-150 pointer-events-none bg-white px-1 leading-none ${
            isFloating
              ? '-top-2 text-xs font-normal ' + (focused ? 'text-[#0b57d0] font-medium' : 'text-[#444746]')
              : 'top-4 text-base font-normal text-[#444746]'
          }`}
        >
          {label}
        </label>
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1); // 1: Email, 2: Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleNextStep = (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !email.trim()) {
      setError('Ingresa un correo electrónico o institucional');
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError('Ingresa tu contraseña');
      return;
    }
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
      setError(err.message || 'Contraseña incorrecta. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };  return (
    <div className="w-full flex flex-col items-center justify-center p-4 sm:p-6">
      
      {/* Tarjeta Principal Horizontal Ancha (Altura amplia y espaciosa estilo Google Accounts) */}
      <div className="w-full max-w-[1040px] bg-white rounded-[28px] p-8 sm:p-12 relative z-10 min-h-[390px] flex flex-col justify-between">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-stretch flex-1">
          
          {/* =======================================================================
              LADO IZQUIERDO DE LA TARJETA (Identidad dinámica según el paso)
              ======================================================================= */}
          <div className="md:col-span-5 flex flex-col justify-between h-full space-y-6">
            <div>
              {/* Logo Oficial Ateneo+ */}
              <img 
                src="/ateneo.png" 
                alt="Logo Ateneo+" 
                className="w-12 h-12 object-contain mb-5"
              />

              {step === 1 ? (
                <>
                  <h1 className="text-[32px] sm:text-[36px] font-normal text-[#1f1f1f] leading-[1.25] tracking-normal font-heading">
                    Accede a tu cuenta
                  </h1>
                  
                  <p className="text-base font-normal text-[#1f1f1f] mt-2.5 leading-relaxed">
                    Ir a Ateneo<span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600">+</span>
                  </p>

                  <p className="text-sm font-normal text-[#444746] mt-3 leading-relaxed">
                    Simulador Clínico Multimodal Basado en Inteligencia Artificial y RAG para el Entrenamiento Formativo y Analítica del Aprendizaje Médico en Ecuador.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-[32px] sm:text-[36px] font-normal text-[#1f1f1f] leading-[1.25] tracking-normal font-heading">
                    Te damos la bienvenida
                  </h1>

                  {/* Chip / Pill del correo seleccionado (Click para cambiar cuenta) */}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep(1);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-300 hover:bg-slate-50 transition-colors text-sm text-[#1f1f1f] font-normal cursor-pointer mt-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold">
                      {email.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="max-w-[190px] truncate">{email}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  <p className="text-sm font-normal text-[#444746] mt-3 leading-relaxed">
                    Simulador Clínico Multimodal Basado en Inteligencia Artificial y RAG para el Entrenamiento Formativo y Analítica del Aprendizaje Médico en Ecuador.
                  </p>
                </>
              )}
            </div>

            <div className="hidden md:block pt-6">
              <span className="text-xs text-[#444746]">
                Simulador Clínico Multimodal • MSP Ecuador
              </span>
            </div>
          </div>

          {/* =======================================================================
              LADO DERECHO DE LA TARJETA (Formulario dinámico según el paso)
              ======================================================================= */}
          <div className="md:col-span-7 flex flex-col justify-between h-full space-y-6 md:pl-6 pt-4 md:pt-14">
            
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-sm text-rose-700 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {step === 1 ? (
              /* ================= PASO 1: CORREO ELECTRÓNICO ================= */
              <form onSubmit={handleNextStep} className="flex flex-col justify-between h-full flex-1 space-y-6">
                <div>
                  <FloatingOutlinedInput
                    id="email_input"
                    label="Correo electrónico"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <div className="mt-3">
                    <button 
                      type="button" 
                      onClick={() => setError('Contacta al administrador del sistema si no recuerdas tu correo.')}
                      className="text-sm font-medium text-[#0b57d0] hover:text-[#0842a0] transition-colors cursor-pointer"
                    >
                      ¿Olvidaste el correo electrónico?
                    </button>
                  </div>
                </div>

                <div className="pt-8 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const code = window.prompt('Ingresa el código de sesión o sala clínica:');
                      if (code && code.trim()) {
                        navigate(`/room?code=${encodeURIComponent(code.trim())}`);
                      }
                    }}
                    className="text-sm font-medium text-[#0b57d0] hover:text-[#0842a0] transition-colors cursor-pointer"
                  >
                    Ingresar con código
                  </button>

                  <button
                    type="submit"
                    className="py-2.5 px-7 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 text-white font-medium text-sm rounded-full transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
                  >
                    <span>Siguiente</span>
                  </button>
                </div>
              </form>
            ) : (
              /* ================= PASO 2: CONTRASEÑA ================= */
              <form onSubmit={handleFinalSubmit} className="flex flex-col justify-between h-full flex-1 space-y-6">
                <div>
                  <p className="text-sm text-[#1f1f1f] font-normal mb-4">
                    Ingresa tu contraseña para acceder a las simulaciones clínicas y tus evaluaciones formativas
                  </p>

                  <FloatingOutlinedInput
                    id="password_input"
                    label="Contraseña de acceso"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />

                  {/* Checkbox Mostrar contraseña */}
                  <div className="mt-3.5 flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="show_pwd_checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="w-4 h-4 rounded-xs border-[#747775] text-[#0b57d0] focus:ring-[#0b57d0] cursor-pointer"
                    />
                    <label htmlFor="show_pwd_checkbox" className="text-sm text-[#1f1f1f] font-normal cursor-pointer select-none">
                      Mostrar contraseña
                    </label>
                  </div>
                </div>

                <div className="pt-8 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setError('Comunícate con la coordinación académica para restablecer tu contraseña.')}
                    className="text-sm font-medium text-[#0b57d0] hover:text-[#0842a0] transition-colors cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="py-2.5 px-7 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 text-white font-medium text-sm rounded-full transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] cursor-pointer"
                  >
                    <span>{submitting ? 'Verificando...' : 'Ingresar'}</span>
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>
      </div>

      {/* Footer Exterior Inferior (Institucional Ateneo+) */}
      <div className="w-full max-w-[1040px] mt-6 px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[#444746] gap-3">
        <div className="flex items-center gap-1 cursor-pointer hover:text-[#1f1f1f]">
          <span>Español (Ecuador) • Ateneo+ Formación Médica</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="hover:text-[#1f1f1f] transition-colors cursor-pointer">Guías Clínicas MSP</span>
          <span className="hover:text-[#1f1f1f] transition-colors cursor-pointer">Privacidad de Datos</span>
          <span className="hover:text-[#1f1f1f] transition-colors cursor-pointer">Protocolo de Bioética</span>
        </div>
      </div>

    </div>
  );
}



