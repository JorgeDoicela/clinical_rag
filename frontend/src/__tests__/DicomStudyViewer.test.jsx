import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DicomStudyViewer from '../modules/evaluation/components/DicomStudyViewer';
import { STANDARD_HOUNSFIELD_PRESETS } from '../types/dicom';

describe('Suite de Pruebas: Visor Diagnóstico DICOM / PACS / WADO-RS (DicomStudyViewer - Ateneo+)', () => {
  beforeEach(() => {
    // Mock de Canvas 2D para jsdom
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
      createImageData: vi.fn().mockImplementation((w, h) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4)
      })),
      putImageData: vi.fn(),
      getBoundingClientRect: vi.fn().mockReturnValue({ width: 560, height: 400 }),
    });

    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 560,
      height: 400,
      top: 0,
      left: 0,
      bottom: 400,
      right: 560
    });
  });

  it('renderiza el negatoscopio Canvas, título de la serie y controles de navegación', () => {
    render(<DicomStudyViewer />);

    expect(screen.getByTestId('dicom-study-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('dicom-canvas')).toBeInTheDocument();
    expect(screen.getByText(/WADO-RS/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/selector de corte axial/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/corte anterior/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/corte siguiente/i)).toBeInTheDocument();
  });

  it('permite navegar entre cortes tomográficos con los botones de avance y retroceso', () => {
    const onSliceChange = vi.fn();
    render(<DicomStudyViewer onSliceChange={onSliceChange} />);

    // Corte inicial centrado (corte 25 de 48)
    expect(screen.getByText(/Corte 25 de 48/i)).toBeInTheDocument();

    // Avanzar un corte
    const nextBtn = screen.getByLabelText(/corte siguiente/i);
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Corte 26 de 48/i)).toBeInTheDocument();

    // Retroceder un corte
    const prevBtn = screen.getByLabelText(/corte anterior/i);
    fireEvent.click(prevBtn);
    expect(screen.getByText(/Corte 25 de 48/i)).toBeInTheDocument();
  });

  it('permite alternar entre los planos ortogonales Axial, Coronal y Sagital', () => {
    render(<DicomStudyViewer />);

    const coronalBtn = screen.getByRole('button', { name: /coronal/i });
    fireEvent.click(coronalBtn);
    expect(coronalBtn).toHaveClass('bg-blue-600');

    const sagittalBtn = screen.getByRole('button', { name: /sagital|sagittal/i });
    fireEvent.click(sagittalBtn);
    expect(sagittalBtn).toHaveClass('bg-blue-600');

    const axialBtn = screen.getByRole('button', { name: /axial/i });
    fireEvent.click(axialBtn);
    expect(axialBtn).toHaveClass('bg-blue-600');
  });

  it('aplica presets de ventana Hounsfield médica estándar (Pulmonar, Ósea, Mediastínica)', () => {
    render(<DicomStudyViewer />);

    // Preset Pulmonar por defecto
    expect(screen.getByText(/WL: -600 · WW: 1500/i)).toBeInTheDocument();

    // Cambiar a preset Ósea
    const bonePresetBtn = screen.getByRole('button', { name: /ósea/i });
    fireEvent.click(bonePresetBtn);
    expect(screen.getByText(/WL: 450 · WW: 2000/i)).toBeInTheDocument();

    // Cambiar a preset Mediastínica
    const mediastinumPresetBtn = screen.getByRole('button', { name: /mediastínica/i });
    fireEvent.click(mediastinumPresetBtn);
    expect(screen.getByText(/WL: 40 · WW: 350/i)).toBeInTheDocument();
  });

  it('despliega panel de ajuste manual de Window Width y Window Level', () => {
    render(<DicomStudyViewer />);

    expect(screen.queryByText(/Nivel de Ventana \(WL \/ Centro\):/i)).not.toBeInTheDocument();

    const manualBtn = screen.getByRole('button', { name: /ajuste manual/i });
    fireEvent.click(manualBtn);

    expect(screen.getByText(/Nivel de Ventana \(WL \/ Centro\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Ancho de Ventana \(WW \/ Rango\):/i)).toBeInTheDocument();

    fireEvent.click(manualBtn);
    expect(screen.queryByText(/Nivel de Ventana \(WL \/ Centro\):/i)).not.toBeInTheDocument();
  });

  it('activa la herramienta Caliper para medición de distancias anatómicas', () => {
    render(<DicomStudyViewer />);

    const caliperToolBtn = screen.getByLabelText(/herramienta caliper/i);
    fireEvent.click(caliperToolBtn);
    expect(caliperToolBtn).toHaveClass('bg-cyan-600');

    const canvas = screen.getByTestId('dicom-canvas');
    // Primer clic (punto inicial)
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    // Movimiento
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
    // Segundo clic (fijar medición)
    fireEvent.mouseDown(canvas, { clientX: 150, clientY: 150 });

    // La medición debe aparecer calculada en milímetros
    expect(screen.getByText(/Medición:/i)).toBeInTheDocument();
  });

  it('permite alternar el modo de pantalla completa y los controles de zoom', () => {
    render(<DicomStudyViewer />);

    expect(screen.getByText('Zoom: 100%')).toBeInTheDocument();

    const zoomInBtn = screen.getByLabelText(/acercar/i);
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('Zoom: 125%')).toBeInTheDocument();

    const zoomOutBtn = screen.getByLabelText(/alejar/i);
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('Zoom: 100%')).toBeInTheDocument();

    const fullscreenBtn = screen.getByLabelText(/pantalla completa/i);
    fireEvent.click(fullscreenBtn);
    expect(screen.getByTitle(/salir de pantalla completa/i)).toBeInTheDocument();
  });
});
