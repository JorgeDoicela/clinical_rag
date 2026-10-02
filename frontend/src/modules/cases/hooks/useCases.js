import { useState, useEffect, useMemo } from 'react';
import casesApi from '../api/casesApi';

export const GPC_LABELS = {
  'dengue': { label: 'GPC Dengue (MSP 2023)', category: 'urgencias', time: '10-12 min', isUrgent: true },
  'preeclampsia': { label: 'GPC Trastornos Hipertensivos del Embarazo', category: 'ginecologia', time: '12-15 min', isUrgent: true },
  'diabetes_t2': { label: 'GPC Diabetes Mellitus Tipo 2', category: 'med_interna', time: '10-15 min', isUrgent: false },
  'hemorragia_posparto': { label: 'GPC Hemorragia Posparto (Código Rojo)', category: 'ginecologia', time: '15-18 min', isUrgent: true },
  'gp_tuberculosis-1': { label: 'GPC Tuberculosis Pulmonar', category: 'neumologia', time: '12-15 min', isUrgent: false },
  'gpc_vih_acuerdo_ministerial05-07-2019': { label: 'GPC Manejo Integral de VIH (MSP)', category: 'urgencias', time: '10-14 min', isUrgent: false },
  'gpc_hta192019': { label: 'GPC Hipertensión Arterial Primaria', category: 'med_interna', time: '10-12 min', isUrgent: false },
  'gpc-neumonia_adquirida_en_la_comunidad': { label: 'GPC Neumonía Adquirida en Comunidad', category: 'neumologia', time: '12-15 min', isUrgent: false },
  'guia_prevencion_diagnostico_tratamiento_enfermedad_renal_cronica_2018': { label: 'GPC Enfermedad Renal Crónica', category: 'nefrologia', time: '12-15 min', isUrgent: false },
  'gpc_ehirn2019': { label: 'GPC Encefalopatía Hipóxico-Isquémica (EHI-RN)', category: 'pediatria', time: '12-15 min', isUrgent: true },
  'neumonia': { label: 'GPC Neumonía Adquirida en Comunidad Pediátrica', category: 'pediatria', time: '10-14 min', isUrgent: true },
  'gpc-sepsis-neonatal': { label: 'GPC Sepsis Neonatal', category: 'pediatria', time: '12-15 min', isUrgent: true },
  'gpc_guia_aborto_espontaneo_incompleto_19_feb_2014': { label: 'GPC Manejo del Aborto Incompleto', category: 'ginecologia', time: '10-14 min', isUrgent: true },
};

export const CATEGORIES = [
  { id: 'all', label: 'Todos los Casos' },
  { id: 'urgencias', label: 'Urgencias & Infectología' },
  { id: 'ginecologia', label: 'Gineco-Obstetricia' },
  { id: 'med_interna', label: 'Medicina Interna' },
  { id: 'neumologia', label: 'Neumología' },
  { id: 'pediatria', label: 'Pediatría & Neonatología' },
  { id: 'nefrologia', label: 'Nefrología' },
];

/**
 * useCases — Hook controlador para el catálogo de casos clínicos
 */
export function useCases(searchQuery = '') {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [classificationTab, setClassificationTab] = useState('all'); // 'all' | 'urgent'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const loadCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await casesApi.getCases();
      setCases(data.cases || data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar los casos clínicos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const gpcMeta = GPC_LABELS[c.guia_asociada] || {
        category: 'med_interna',
        isUrgent: false,
      };

      // Filtro por categoría
      if (selectedCategory !== 'all' && gpcMeta.category !== selectedCategory) {
        return false;
      }

      // Filtro por tab de urgencia
      if (classificationTab === 'urgent' && !gpcMeta.isUrgent) {
        return false;
      }

      // Filtro por búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titulo = (c.titulo || '').toLowerCase();
        const guia = (c.guia_asociada || '').toLowerCase();
        const enunciado = (c.enunciado || '').toLowerCase();
        return titulo.includes(q) || guia.includes(q) || enunciado.includes(q);
      }

      return true;
    });
  }, [cases, selectedCategory, classificationTab, searchQuery]);

  return {
    cases,
    filteredCases,
    loading,
    error,
    selectedCategory,
    setSelectedCategory,
    classificationTab,
    setClassificationTab,
    viewMode,
    setViewMode,
    reloadCases: loadCases,
    categories: CATEGORIES,
    gpcLabels: GPC_LABELS,
  };
}

export default useCases;
