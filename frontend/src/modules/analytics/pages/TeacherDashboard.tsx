import { useEffect, useState } from 'react';
import { UserCheck, FileText, BarChart3, Plus, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import casesApi from '../../cases/api/casesApi';
import collaborationApi from '../../collaboration/api/collaborationApi';
import CoordinatorAnalytics from '../components/CoordinatorAnalytics';
import ClinicalButton from '../../../core/ui/ClinicalButton';
import type { ExtendedClinicalCase } from '../../cases/hooks/useCases';

export default function TeacherDashboard() {
  const [cases, setCases] = useState<ExtendedClinicalCase[]>([]);
  const [creatingRoomId, setCreatingRoomId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cases' | 'analytics'>('cases');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const data = await casesApi.getCases();
        setCases(data as ExtendedClinicalCase[]);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  const handleCreateAteneoRoom = async (caseId: string) => {
    setCreatingRoomId(caseId);
    try {
      const room = await collaborationApi.createRoom(
        caseId,
        'usr_docente_001',
        'Dr. Carlos Andrade (Docente)'
      );
      const targetCode = room.room_code || room.codigo || '';
      navigate(`/ateneo/${targetCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear sala de Ateneo';
      alert(msg);
    } finally {
      setCreatingRoomId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* Header Docente & Pestañas Planas */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#0b57d0] mb-2">
            <UserCheck className="w-4 h-4" />
            <span>Supervisión y Docencia Médica • MSP Ecuador</span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-normal tracking-tight text-[#1f1f1f] font-heading">
            Panel de Docentes y Tutores Clínicos
          </h1>
          <p className="text-sm font-normal text-[#444746] mt-1 max-w-2xl leading-relaxed">
            Supervisa la alineación del razonamiento diagnóstico de los estudiantes y modera sesiones clínicas en vivo.
          </p>
        </div>

        {/* Pestañas Planas */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('cases')}
            className={`pb-2 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'cases'
                ? 'border-b-2 border-[#0b57d0] text-[#0b57d0] font-semibold -mb-[1px]'
                : 'text-[#444746] hover:text-[#1f1f1f]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Casos & Salas Clínicas</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-2 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-b-2 border-[#0b57d0] text-[#0b57d0] font-semibold -mb-[1px]'
                : 'text-[#444746] hover:text-[#1f1f1f]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analítica de Cohorte</span>
          </button>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <CoordinatorAnalytics />
      ) : (
        /* Pestaña: Casos y Creación de Salas */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-normal text-[#1f1f1f] font-heading">
              Catálogo de Casos para Ateneo Sincrónico
            </h2>
            <span className="text-xs font-medium text-[#747775] bg-[#f0f4f9] px-3 py-1 rounded-full">
              {cases.length} casos disponibles
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-[28px] p-6 shadow-xs border border-transparent hover:border-slate-200 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium bg-sky-50 text-[#0b57d0] px-2.5 py-1 rounded-full">
                      {c.guia_asociada || c.gpc_referencia}
                    </span>
                    <span className="text-[11px] text-[#747775]">{c.dificultad || 'Intermedio'}</span>
                  </div>
                  <h3 className="text-base font-normal text-[#1f1f1f] font-heading line-clamp-2">
                    {c.titulo}
                  </h3>
                  <p className="text-xs text-[#444746] line-clamp-3 leading-relaxed">
                    {c.enunciado || c.caso_preambulo}
                  </p>
                </div>

                <div className="pt-5 border-t border-slate-100 flex items-center justify-between mt-4">
                  <Link
                    to={`/cases/${c.id}`}
                    className="text-xs font-medium text-[#444746] hover:text-[#0b57d0] flex items-center gap-1"
                  >
                    <span>Inspeccionar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <ClinicalButton
                    variant="primary"
                    size="sm"
                    loading={creatingRoomId === c.id}
                    onClick={() => handleCreateAteneoRoom(c.id)}
                    icon={Plus}
                  >
                    Crear Sala Ateneo
                  </ClinicalButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
