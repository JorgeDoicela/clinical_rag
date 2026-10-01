import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import KnowledgeSpaceGraph from '../components/KnowledgeSpaceGraph';
import * as clientModule from '../api/client';

describe('Componente KnowledgeSpaceGraph (Grafo KST)', () => {
  const mockKstData = {
    knowledge_state: {
      semiologia_anamnesis: 0.85,
      diagnostico_diferencial: 0.55,
      tratamiento_msp: 0.20
    },
    topology: {
      nodes: [
        { id: 'semiologia_anamnesis', nombre: 'Anamnesis y Semiología', descripcion: 'Recolección semiológica', orden: 1 },
        { id: 'diagnostico_diferencial', nombre: 'Diagnóstico Diferencial', descripcion: 'Estratificación diagnóstica', orden: 2 },
        { id: 'tratamiento_msp', nombre: 'Tratamiento MSP', descripcion: 'Guía de práctica clínica oficial', orden: 3 }
      ]
    }
  };

  it('no debe renderizar el modal si isOpen es false', () => {
    const { container } = render(<KnowledgeSpaceGraph isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('debe renderizar el grafo y las competencias cuando isOpen es true', async () => {
    vi.spyOn(clientModule, 'fetchKnowledgeState').mockResolvedValue(mockKstData);

    render(<KnowledgeSpaceGraph isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Anamnesis y Semiología')).toBeInTheDocument();
      expect(screen.getByText('Diagnóstico Diferencial')).toBeInTheDocument();
      expect(screen.getByText('Tratamiento MSP')).toBeInTheDocument();
    });

    expect(screen.getByText('Dominado')).toBeInTheDocument();
    expect(screen.getByText('Zona ZDP (En Progreso)')).toBeInTheDocument();
  });

  it('debe invocar onClose al hacer clic en el botón de cierre', async () => {
    vi.spyOn(clientModule, 'fetchKnowledgeState').mockResolvedValue(mockKstData);
    const mockClose = vi.fn();

    render(<KnowledgeSpaceGraph isOpen={true} onClose={mockClose} />);

    await waitFor(() => {
      expect(screen.getByText('Anamnesis y Semiología')).toBeInTheDocument();
    });

    const closeBtn = screen.getByTitle('Cerrar modal');
    fireEvent.click(closeBtn);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
