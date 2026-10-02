import React from 'react';

/**
 * ClinicalCard — Tarjeta de lienzo blanco Ateneo+
 * Norma Cardinal de Diseño:
 * Fondo blanco (#ffffff), bordes redondeados rounded-[28px], sombra sutil y sin bordes perimetrales artificiales agresivos.
 */
export default function ClinicalCard({
  children,
  className = '',
  padding = 'p-6 sm:p-8',
  ...props
}) {
  return (
    <div
      className={`bg-white rounded-[28px] shadow-xs border-0 ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
