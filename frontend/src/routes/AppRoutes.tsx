import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../modules/auth/components/ProtectedRoute';
import AppLayout from '../core/layouts/AppLayout';
import { Activity } from 'lucide-react';

// Carga perezosa (Code-Splitting) por módulo de dominio
const CaseList = lazy(() => import('../modules/cases/pages/CaseList'));
const CaseSolve = lazy(() => import('../modules/evaluation/pages/CaseSolve'));
const AteneoRoom = lazy(() => import('../modules/collaboration/pages/AteneoRoom'));
const Login = lazy(() => import('../modules/auth/pages/Login'));
const AdminDashboard = lazy(() => import('../modules/analytics/pages/AdminDashboard'));
const TeacherDashboard = lazy(() => import('../modules/analytics/pages/TeacherDashboard'));
const ScientificBenchmarkView = lazy(() => import('../modules/analytics/components/ScientificBenchmarkView'));

function RouteLoader() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
      <Activity className="w-8 h-8 text-[#0b57d0] animate-spin" />
      <p className="text-xs text-[#747775]">Cargando módulo clínico...</p>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <AppLayout>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <CaseList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cases/:id"
            element={
              <ProtectedRoute>
                <CaseSolve />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ateneo/:roomCode"
            element={
              <ProtectedRoute>
                <AteneoRoom />
              </ProtectedRoute>
            }
          />

          <Route
            path="/benchmark"
            element={
              <ProtectedRoute>
                <ScientificBenchmarkView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['docente', 'administrador']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}
