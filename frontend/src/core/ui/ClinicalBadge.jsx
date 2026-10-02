import React from 'react';

/**
 * ClinicalBadge — Etiqueta de estado o categoría clínica
 * Norma Cardinal de Diseño:
 * Los iconos se renderizan limpios y planos, sin envoltorios de fondo decorativos artificiales.
 */
export default function ClinicalBadge({
  children,
  icon: Icon = null,
  variant = 'default',
  size = 'md',
  className = '',
}) {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const variantStyles = {
    default: 'bg-[#f0f4f9] text-[#444746] border border-slate-200/80',
    primary: 'bg-sky-50 text-[#0b57d0] border border-sky-200/80',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/80',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.default} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}
