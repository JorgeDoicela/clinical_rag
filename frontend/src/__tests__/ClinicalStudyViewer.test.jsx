import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClinicalStudyViewer from '../modules/evaluation/components/ClinicalStudyViewer';

describe('Suite de Pruebas: Visor Diagnóstico de Paraclínicos (ClinicalStudyViewer - Ateneo+)', () => {
  const mockProps = {
    imageUrl: '/static/images/test_ecg.png',
    title: 'Electrocardiograma de 12 Derivaciones',
    studyType: 'ecg'
  };

  beforeEach(() => {
    // Mock de getContext de Canvas para jsdom
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      getBoundingClientRect: vi.fn().mockReturnValue({ width: 600, height: 400 }),
    });

    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 600,
      height: 400,
      top: 0,
      left: 0,
      bottom: 400,
      right: 600
    });
  });

  it('renderiza el lienzo Canvas, el título del estudio y la barra de controles', () => {
    render(<ClinicalStudyViewer {...mockProps} />);

    expect(screen.getByTestId('clinical-canvas')).toBeInTheDocument();
    expect(screen.getByText('Electrocardiograma de 12 Derivaciones')).toBeInTheDocument();
    expect(screen.getByLabelText(/acercar imagen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/alejar imagen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/restablecer vista/i)).toBeInTheDocument();
  });

  it('permite acercar y alejar la imagen actualizando el indicador de zoom', () => {
    render(<ClinicalStudyViewer {...mockProps} />);

    expect(screen.getByText('100%')).toBeInTheDocument();

    const zoomInBtn = screen.getByLabelText(/acercar imagen/i);
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('125%')).toBeInTheDocument();

    const zoomOutBtn = screen.getByLabelText(/alejar imagen/i);
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('abre y cierra el panel de calibración de ventana radiológica', () => {
    render(<ClinicalStudyViewer {...mockProps} />);

    expect(screen.queryByText('Ventana Radiológica')).not.toBeInTheDocument();

    const filtersBtn = screen.getByLabelText(/ajuste de filtros/i);
    fireEvent.click(filtersBtn);

    expect(screen.getByText('Ventana Radiológica')).toBeInTheDocument();
    expect(screen.getByText('Brillo')).toBeInTheDocument();
    expect(screen.getByText('Contraste')).toBeInTheDocument();
    expect(screen.getByText('Inversión Negativo')).toBeInTheDocument();

    fireEvent.click(filtersBtn);
    expect(screen.queryByText('Ventana Radiológica')).not.toBeInTheDocument();
  });

  it('conmuta la rejilla milimétrica electrocardiográfica', () => {
    render(<ClinicalStudyViewer {...mockProps} studyType="general" />);

    const gridBtn = screen.getByLabelText(/rejilla ecg/i);
    fireEvent.click(gridBtn);

    expect(screen.getByText(/Rejilla Calibrada: 25mm\/s/i)).toBeInTheDocument();
  });

  it('permite alternar el modo de pantalla completa', () => {
    render(<ClinicalStudyViewer {...mockProps} />);

    const fullscreenBtn = screen.getByLabelText(/alternar pantalla completa/i);
    fireEvent.click(fullscreenBtn);

    expect(screen.getByTitle(/salir de pantalla completa/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/alternar pantalla completa/i));
    expect(screen.getByTitle(/maximizar visor/i)).toBeInTheDocument();
  });
});
