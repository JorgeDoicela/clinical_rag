import React, { useEffect, useState } from 'react';
import { getUsersApi } from '../api/client';
import { ShieldCheck, Users, Database, Server, RefreshCw, CheckCircle2 } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Header Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Consola del Administrador</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Panel de Administración</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión de usuarios, control de accesos y estado de la infraestructura.
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {/* Tarjetas de Resumen de Infraestructura */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block mb-1">Usuarios Registrados</span>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
            <span className="text-[11px] text-slate-400">Cuentas habilitadas</span>
          </div>
          <Users className="w-6 h-6 text-slate-400 shrink-0" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block mb-1">Base Vectorial</span>
            <p className="text-2xl font-bold text-slate-900">ChromaDB</p>
            <span className="text-[11px] text-slate-500 font-medium">Estado: Activa</span>
          </div>
          <Database className="w-6 h-6 text-slate-400 shrink-0" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block mb-1">Backend API</span>
            <p className="text-2xl font-bold text-slate-900">FastAPI</p>
            <span className="text-[11px] text-slate-500 font-medium">v0.115</span>
          </div>
          <Server className="w-6 h-6 text-slate-400 shrink-0" />
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Usuarios y Roles Configurados</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">{users.length} Registros</span>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Cargando datos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-y border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Usuario</th>
                  <th className="px-4 py-2.5">Correo Electrónico</th>
                  <th className="px-4 py-2.5">Rol</th>
                  <th className="px-4 py-2.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{u.nombre}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] capitalize border border-slate-200/60">
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-slate-600 font-medium text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                        <span>Activo</span>
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
