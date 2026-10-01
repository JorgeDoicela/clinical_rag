import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CoordinatorAnalytics from '../components/CoordinatorAnalytics';

describe('Componente CoordinatorAnalytics (Panel B2B de Brechas e IBF)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('debe renderizar el panel de inteligencia formativa institucional', async () => {
    const mockCoordData = {
      cohorte_nombre: 'Cohorte Medicina 2026-A',
      total_estudiantes_activos: 25,
      total_evaluaciones_registradas: 50,
      insight_principal: 'La mayor brecha detectada corresponde al eje de Dosificación Farmacológica.',
      modulos_analizados: [
        { modulo: 'Emergencias Hipertensivas', porcentaje_falla: 45, riesgo: 'Medio' },
        { modulo: 'Dengue con Signos de Alarma', porcentaje_falla: 60, riesgo: 'Alto' }
      ],
      top_deficiencias_institucionales: [
        {
          competencia: 'Cálculo de reposición hídrica intravenosa',
          modulo: 'Infectología & Urgencias',
          porcentaje_afectados: 60,
          estudiantes_afectados: 15,
          total_estudiantes: 25
        }
      ]
    };

    const mockIbfData = {
      ibf_global: 0.18,
      ibf_global_porcentaje: 18.0,
      nivel_riesgo_global: 'Rendimiento Formativo Óptimo',
      ejes_analiticos: [
        { key: 'diagnostico', nombre: 'Diagnóstico', ibf_porcentaje: 12.0, severidad: 'LEVE / CONTROL' }
      ]
    };

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('coordinator-analytics')) {
        return Promise.resolve({ ok: true, json: async () => mockCoordData });
      }
      if (url.includes('ibf-cohort')) {
        return Promise.resolve({ ok: true, json: async () => mockIbfData });
      }
      return Promise.resolve({ ok: false });
    });

    render(<CoordinatorAnalytics />);

    await waitFor(() => {
      expect(screen.getByText(/Diagnóstico de Rendimiento Colectivo/i)).toBeInTheDocument();
      expect(screen.getByText(/Emergencias Hipertensivas/i)).toBeInTheDocument();
      expect(screen.getByText(/Cálculo de reposición hídrica intravenosa/i)).toBeInTheDocument();
    });
  });

  it('debe validar la regla de oro: CERO EMOJIS en el panel de analíticas B2B', async () => {
    const { container } = render(<CoordinatorAnalytics />);

    await waitFor(() => {
      expect(screen.getByText(/Diagnóstico de Rendimiento Colectivo/i)).toBeInTheDocument();
    });

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(container.textContent || '')).toBe(false);
  });
});
