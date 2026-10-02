import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * ClinicalButton — Botón institucional de Ateneo+
 * Variantes: primary (gradiente tricolor), secondary, outline, text, danger.
 * Soporta estado de carga con spinner plano.
 */
export default function ClinicalButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon = null,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-full gap-1.5',
    md: 'px-5 py-2.5 text-xs sm:text-sm rounded-full gap-2',
    lg: 'px-7 py-3.5 text-sm sm:text-base rounded-full gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 text-white shadow-xs hover:shadow-sm active:scale-[0.98]',
    secondary: 'bg-[#f0f4f9] hover:bg-slate-200/80 text-[#1f1f1f] border border-slate-200/80',
    outline: 'bg-white hover:bg-slate-50 text-[#0b57d0] border border-slate-300 hover:border-[#0b57d0]',
    danger: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200',
    text: 'bg-transparent hover:bg-slate-100 text-[#444746] hover:text-[#1f1f1f]',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
