import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';

// Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

// Resident Pages
import ResidentDashboard from '../pages/resident/ResidentDashboard';
import VehiclesPage from '../pages/resident/VehiclesPage';
import VisitorsPage from '../pages/resident/VisitorsPage';
import PassesPage from '../pages/resident/PassesPage';
import DisputesPage from '../pages/resident/DisputesPage';

// Security Pages
import SecurityDashboard from '../pages/security/SecurityDashboard';
import SecurityHistory from '../pages/security/SecurityHistory';

// Valet Pages
import ValetDashboard from '../pages/valet/ValetDashboard';
import AssignmentsPage from '../pages/valet/AssignmentsPage';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import UsersPage from '../pages/admin/UsersPage';
import ParkingMgmtPage from '../pages/admin/ParkingMgmtPage';
import AnomaliesPage from '../pages/admin/AnomaliesPage';
import DocumentsPage from '../pages/admin/DocumentsPage';

// Shared Pages
import DigitalTwinView from '../pages/shared/DigitalTwinView';
import ChatbotView from '../pages/shared/ChatbotView';
import AIUtilitiesView from '../pages/shared/AIUtilitiesView';
import NotificationsView from '../pages/shared/NotificationsView';
import Forbidden from '../pages/shared/Forbidden';
import NotFound from '../pages/shared/NotFound';

function RoleBasedHomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'ADMIN':
      return <Navigate to="/admin" replace />;
    case 'SECURITY':
      return <Navigate to="/security" replace />;
    case 'VALET':
      return <Navigate to="/valet" replace />;
    default:
      return <Navigate to="/resident" replace />;
  }
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forbidden" element={<Forbidden />} />

      {/* Protected Routes inside AppLayout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<RoleBasedHomeRedirect />} />

        {/* Resident Routes */}
        <Route
          path="/resident"
          element={
            <ProtectedRoute allowedRoles={['RESIDENT', 'ADMIN']}>
              <ResidentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident/vehicles"
          element={
            <ProtectedRoute allowedRoles={['RESIDENT', 'ADMIN']}>
              <VehiclesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident/visitors"
          element={
            <ProtectedRoute allowedRoles={['RESIDENT', 'ADMIN']}>
              <VisitorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident/passes"
          element={
            <ProtectedRoute allowedRoles={['RESIDENT', 'ADMIN']}>
              <PassesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident/disputes"
          element={
            <ProtectedRoute allowedRoles={['RESIDENT', 'ADMIN']}>
              <DisputesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident/chatbot"
          element={
            <ProtectedRoute allowedRoles={['RESIDENT', 'ADMIN']}>
              <ChatbotView />
            </ProtectedRoute>
          }
        />

        {/* Security Routes */}
        <Route
          path="/security"
          element={
            <ProtectedRoute allowedRoles={['SECURITY', 'ADMIN']}>
              <SecurityDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/security/history"
          element={
            <ProtectedRoute allowedRoles={['SECURITY', 'ADMIN']}>
              <SecurityHistory />
            </ProtectedRoute>
          }
        />

        {/* Valet Routes */}
        <Route
          path="/valet"
          element={
            <ProtectedRoute allowedRoles={['VALET', 'ADMIN']}>
              <ValetDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/valet/assignments"
          element={
            <ProtectedRoute allowedRoles={['VALET', 'ADMIN']}>
              <AssignmentsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/parking"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ParkingMgmtPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/anomalies"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AnomaliesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/documents"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />

        {/* Shared Routes */}
        <Route
          path="/shared/digital-twin"
          element={
            <ProtectedRoute allowedRoles={['VALET', 'ADMIN', 'SECURITY', 'RESIDENT']}>
              <DigitalTwinView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shared/ai-utilities"
          element={
            <ProtectedRoute allowedRoles={['SECURITY', 'ADMIN', 'VALET']}>
              <AIUtilitiesView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsView />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
