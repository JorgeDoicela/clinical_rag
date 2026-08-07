import React, { useEffect, useState } from 'react';
import { getUsersApi } from '../api/client';
import { ShieldCheck, Users, Database, Server, RefreshCw, CheckCircle2, UserPlus } from 'lucide-react';

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
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-semibold mb-3">
              <ShieldCheck className="w-4 h-4" />
              <span>Consola del Administrador</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Panel de Administración del Sistema</h1>
            <p className="text-purple-200/80 text-sm mt-1">
              Gestión de usuarios, control de roles (RBAC) y estado de la infraestructura RAG.
            </p>
          </div>

          <button
            onClick={loadUsers}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-sm border border-white/20 transition-all self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar Datos</span>
          </button>
        </div>

        {/* Tarjetas resumen de sistema */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-purple-800/60">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-purple-300 font-medium">Usuarios Registrados</span>
              <p className="text-xl font-bold text-white">{users.length} Cuentas Demo</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-purple-300 font-medium">Base Vectorial</span>
              <p className="text-xl font-bold text-emerald-400">ChromaDB Activa</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-300">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-purple-300 font-medium">Motor backend</span>
              <p className="text-xl font-bold text-sky-400">FastAPI 0.115</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sección Gestión de Usuarios */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <span>Usuarios y Roles Configurados</span>
            </h2>
            <p className="text-xs text-slate-500">Cuentas con credenciales asignadas para el sistema Ateneo.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Cargando cuentas de usuario...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-y border-slate-200">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Correo Electrónico</th>
                  <th className="px-4 py-3">Rol del Sistema</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{u.nombre}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-600">{u.email}</td>
                    <td className="px-4 py-3.5">
                      {u.rol === 'administrador' && (
                        <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold text-[11px]">
                          Administrador
                        </span>
                      )}
                      {u.rol === 'docente' && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                          Docente
                        </span>
                      )}
                      {u.rol === 'alumno' && (
                        <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 font-bold text-[11px]">
                          Alumno
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
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
