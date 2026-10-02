import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { AlertCircle, ChevronDown } from 'lucide-react';
import FloatingLabelInput from '../../../core/ui/FloatingLabelInput';
import ClinicalButton from '../../../core/ui/ClinicalButton';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<number>(1); // 1: Email, 2: Password
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const locationState = location.state as { from?: { pathname?: string } } | null;
  const from = locationState?.from?.pathname || '/';

  const handleNextStep = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !email.trim()) {
      setError('Ingresa un correo electrónico o institucional');
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (e: FormEvent) => {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Contraseña incorrecta. Inténtalo de nuevo.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[448px] bg-white rounded-[28px] p-8 sm:p-10 shadow-xs border-0 transition-all duration-300">
        
        {/* Marca Institucional Ateneo+ */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="/ateneo.png"
            alt="Ateneo+"
            className="w-12 h-12 mb-3 object-contain"
          />
          <h1 className="text-2xl font-normal text-[#1f1f1f] tracking-tight font-heading">
            Accede a tu cuenta
          </h1>
          <p className="text-sm font-normal text-[#444746] mt-1">
            Simulador Clínico & Evaluación con IA
          </p>
        </div>

        {/* Notificación de Error */}
        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200/80 rounded-[16px] flex items-start gap-2.5 text-xs text-rose-800 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Paso 1: Identificación de Correo */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="space-y-6">
            <FloatingLabelInput
              id="email"
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#747775]">
                Dominio @ateneo.edu.ec
              </span>
              <ClinicalButton
                type="submit"
                variant="primary"
                size="md"
              >
                Siguiente
              </ClinicalButton>
            </div>
          </form>
        )}

        {/* Paso 2: Contraseña de Acceso */}
        {step === 2 && (
          <form onSubmit={handleFinalSubmit} className="space-y-6">
            {/* Chip del usuario seleccionado */}
            <div
              onClick={() => { setStep(1); setError(null); }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/80 bg-[#f0f4f9] hover:bg-slate-100 cursor-pointer text-xs font-medium text-[#1f1f1f] transition-colors"
            >
              <span>{email}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#747775]" />
            </div>

            <FloatingLabelInput
              id="password"
              label="Contraseña de acceso"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />

            <div className="flex items-center gap-2">
              <input
                id="show-pass"
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded border-slate-300 text-[#0b57d0] focus:ring-0 cursor-pointer"
              />
              <label htmlFor="show-pass" className="text-xs text-[#444746] cursor-pointer">
                Mostrar contraseña
              </label>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); }}
                className="text-xs font-medium text-[#0b57d0] hover:underline cursor-pointer"
              >
                Volver
              </button>
              <ClinicalButton
                type="submit"
                variant="primary"
                size="md"
                loading={submitting}
              >
                Ingresar
              </ClinicalButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
