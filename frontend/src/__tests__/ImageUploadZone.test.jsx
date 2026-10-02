import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageUploadZone from '../modules/evaluation/components/ImageUploadZone';

describe('Componente ImageUploadZone (Fusión Multimodal)', () => {
  it('debe renderizar el área de drag and drop vacía', () => {
    render(<ImageUploadZone files={[]} onChange={() => {}} />);
    expect(screen.getByText(/Arrastra o selecciona estudios/i)).toBeInTheDocument();
    expect(screen.getByText(/ECG, Radiografía, Laboratorio/i)).toBeInTheDocument();
  });

  it('debe clasificar y etiquetar los estudios diagnósticos por tipo', () => {
    const mockFiles = [
      new File(['test ecg'], 'electrocardiograma_v1.png', { type: 'image/png' }),
      new File(['test rx'], 'radiografia_torax.jpg', { type: 'image/jpeg' }),
      new File(['test lab'], 'hemograma_lab.png', { type: 'image/png' }),
    ];

    render(<ImageUploadZone files={mockFiles} onChange={() => {}} />);

    expect(screen.getByText('ECG')).toBeInTheDocument();
    expect(screen.getByText('Rx')).toBeInTheDocument();
    expect(screen.getByText('Lab')).toBeInTheDocument();
  });

  it('debe invocar onChange sin el archivo eliminado al hacer clic en eliminar', () => {
    const mockOnChange = vi.fn();
    const mockFiles = [
      new File(['f1'], 'ecg_derivaciones.png', { type: 'image/png' }),
      new File(['f2'], 'radiografia.png', { type: 'image/png' })
    ];

    render(<ImageUploadZone files={mockFiles} onChange={mockOnChange} />);

    const removeBtn = screen.getByLabelText(/Eliminar ecg_derivaciones\.png/i);
    expect(removeBtn).toBeInTheDocument();

    fireEvent.click(removeBtn);
    expect(mockOnChange).toHaveBeenCalledWith([mockFiles[1]]);
  });
});
