import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SkillRadarChart from '../components/SkillRadarChart';

describe('Componente SkillRadarChart (Radar de 4 Ejes Clínicos)', () => {
  const mockCompetencias = [
    { key: 'diagnóstico', label: 'Diagnóstico', score: 90, items: [], estadoLabel: 'Consolidado' },
    { key: 'tratamiento', label: 'Tratamiento', score: 65, items: [{ descripcion: 'Dosis' }], estadoLabel: '1 brecha' },
    { key: 'prevención', label: 'Prevención', score: 85, items: [], estadoLabel: 'Competente' },
    { key: 'seguimiento', label: 'Seguimiento', score: 80, items: [], estadoLabel: 'Competente' },
  ];

  it('debe renderizar los 4 ejes clínicos estandarizados', () => {
    render(<SkillRadarChart competenciasPorEje={mockCompetencias} />);
    expect(screen.getByText('Diagnóstico')).toBeInTheDocument();
    expect(screen.getByText('Tratamiento')).toBeInTheDocument();
    expect(screen.getByText('Prevención')).toBeInTheDocument();
    expect(screen.getByText('Seguimiento')).toBeInTheDocument();
  });

  it('debe renderizar el polígono SVG del radar con sus puntos calculados', () => {
    const { container } = render(<SkillRadarChart competenciasPorEje={mockCompetencias} />);
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThan(0);
  });
});
