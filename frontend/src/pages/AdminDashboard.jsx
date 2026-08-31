import React, { useEffect, useState } from 'react';
import { getUsersApi } from '../api/client';
import { ShieldCheck, Users, Database, Server, RefreshCw, CheckCircle2, Shield, UserCheck, GraduationCap } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsersApi();
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Error al cargar lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* Header Admin */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-purple-700 mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Consola de Gestión y Seguridad • MSP Ecuador</span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-normal tracking-tight text-[#1f1f1f] font-heading">
            Panel de Administración
          </h1>
          <p className="text-sm font-normal text-[#444746] mt-1 max-w-2xl leading-relaxed">
            Gestión de identidades de usuarios, permisos por rol y monitoreo de la infraestructura RAG multimodal.
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-[#1f1f1f] text-xs font-medium rounded-full transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#0b57d0] ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Cuentas</span>
        </button>
      </div>

      {/* Tarjetas de Resumen de Infraestructura */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-[24px] p-6 shadow-xs border-0 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#747775] font-medium block mb-1">Usuarios Registrados</span>
            <p className="text-3xl font-normal text-[#1f1f1f] font-heading">{users.length}</p>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">Cuentas activas en cohorte</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-xs border-0 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#747775] font-medium block mb-1">Motor Vectorial</span>
            <p className="text-2xl font-normal text-[#1f1f1f] font-heading">ChromaDB</p>
            <span className="text-[11px] text-[#0b57d0] font-medium mt-1 inline-block">GPC MSP Indexadas</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-sky-50 text-[#0b57d0] flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-xs border-0 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#747775] font-medium block mb-1">Servidor de Inferencia</span>
            <p className="text-2xl font-normal text-[#1f1f1f] font-heading">FastAPI + LLM</p>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">Conexión Segura TLS</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Server className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios Material 3 */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-xs border-0 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-normal text-[#1f1f1f] font-heading">Usuarios y Roles de Acceso (RBAC)</h2>
            <p className="text-xs text-[#444746] mt-0.5">Control de credenciales y roles asignados en el simulador clínico.</p>
          </div>
          <span className="text-xs font-medium text-[#747775] bg-[#f0f4f9] px-3 py-1 rounded-full">
            {users.length} registros
          </span>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-[16px] text-rose-700 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-[#747775]">Cargando usuarios...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#444746]">
              <thead className="bg-[#f0f4f9] text-[#1f1f1f] font-medium uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5 rounded-l-[12px]">Nombre del Usuario</th>
                  <th className="px-5 py-3.5">Correo Electrónico</th>
                  <th className="px-5 py-3.5">Rol Institucional</th>
                  <th className="px-5 py-3.5 text-center rounded-r-[12px]">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-[#1f1f1f]">{u.nombre}</td>
                    <td className="px-5 py-4 font-mono text-[#747775]">{u.email}</td>
                    <td className="px-5 py-4">
                      {u.rol === 'alumno' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-800 font-medium text-[11px] capitalize">
                          <GraduationCap className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Alumno</span>
                        </span>
                      )}
                      {u.rol === 'docente' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 font-medium text-[11px] capitalize">
                          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Docente</span>
                        </span>
                      )}
                      {u.rol === 'administrador' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 font-medium text-[11px] capitalize">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                          <span>Admin</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Habilitado</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
