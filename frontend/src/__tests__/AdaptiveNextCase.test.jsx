import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdaptiveNextCase from '../modules/adaptive/components/AdaptiveNextCase';
import { adaptiveApi } from '../modules/adaptive/api/adaptiveApi';

describe('Componente AdaptiveNextCase (KST & BKT)', () => {
  const mockRecommendation = {
    case: {
      id: 'case_hta_01',
      titulo: 'Crisis Hipertensiva en el Servicio de Urgencias',
      especialidad: 'Medicina Interna',
      tiempo_estimado: '15 min'
    },
    competencia_objetivo: {
      id: 'diagnostico_diferencial',
      nombre: 'Diagnóstico Diferencial',
      p_dominio: 0.55
    },
    justificacion_pedagogica: 'Se detecta que el estudiante se encuentra en la Zona de Desarrollo Próximo (ZDP) para Diagnóstico Diferencial.',
    nivel_dominio_general: 'Competencia Intermedia',
    promedio_dominio_global: 0.62
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('debe mostrar esqueleto de carga mientras obtiene la recomendación', () => {
    vi.spyOn(adaptiveApi, 'getNextCase').mockReturnValue(new Promise(() => {}));
    const { container } = render(<AdaptiveNextCase onSelectCase={() => {}} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('debe renderizar la recomendación adaptativa y la justificación pedagógica', async () => {
    vi.spyOn(adaptiveApi, 'getNextCase').mockResolvedValue(mockRecommendation);
    render(<AdaptiveNextCase onSelectCase={() => {}} onToggleGraph={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Crisis Hipertensiva en el Servicio de Urgencias/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Currículo Adaptativo KST & BKT/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Diagnóstico Diferencial/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Zona de Desarrollo Próximo/i).length).toBeGreaterThan(0);
  });

  it('debe invocar onSelectCase al pulsar el botón de resolver caso recomendado', async () => {
    vi.spyOn(adaptiveApi, 'getNextCase').mockResolvedValue(mockRecommendation);
    const mockSelect = vi.fn();
    render(<AdaptiveNextCase onSelectCase={mockSelect} onToggleGraph={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Resolver Caso Recomendado/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Resolver Caso Recomendado/i));
    expect(mockSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'case_hta_01' }));
  });
});
