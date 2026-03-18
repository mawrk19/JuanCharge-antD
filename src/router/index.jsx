import React from 'react';
import { Navigate } from 'react-router-dom';
import { hasAnyRole, isAuthenticated } from '../services/authStorage';

// Layouts
import MainLayout from '../layouts/MainLayout';

// Pages (Import your actual components as you build them)
import Login from '../pages/Auth/Login';
import ForgotPassword from '../pages/Auth/ForgotPassword';
import ResetPassword from '../pages/Auth/ResetPassword';
import SetupPassword from '../pages/Auth/SetupPassword';
import EmailVerificationResult from '../pages/Auth/EmailVerificationResult';
import Dashboard from '../pages/Dashboard/Dashboard';
import LguUserIndex from '../pages/LguUsers/LguUserIndex'; 
import KioskIndex from '../pages/Kiosk/KioskIndex'
import LguIndex from '../pages/Lgu/LguIndex'
import RecyclingAnalytics from '../pages/RecyclingAnalytics/RecyclingAnalytics'
import MapView from '../pages/Map/MapView'
import PatronIndex from '../pages/Petron/PatronIndex'
import AuditTrailIndex from '../pages/AuditTrail/AuditTrailIndex'

const MANAGEMENT_ROLES = ['super_admin', 'lgu_admin', 'lgu_staff'];
const SUPER_ADMIN_ROLES = ['super_admin'];
const LGU_ADMIN_AND_UP_ROLES = ['super_admin', 'lgu_admin'];
const KIOSK_ACCESS_ROLES = ['super_admin', 'lgu_admin', 'lgu_staff'];
const AUDIT_TRAIL_ROLES = ['super_admin'];
const ANY_MANAGEMENT_ROLES = ['super_admin', 'lgu_admin', 'lgu_staff'];
const ANALYTICS_AND_MAP_ROLES = ['super_admin', 'lgu_admin', 'lgu_staff'];

const NoAccessPage = () => (
  <div className="min-h-[60vh] flex items-center justify-center p-6">
    <div className="max-w-xl w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-slate-800 mb-3">Access Restricted</h1>
      <p className="text-slate-600">
        You have no access in here. Contact admin if you think this is a bug.
      </p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
    return <NoAccessPage />;
  }

  return children;
};

// We define the routes as a constant array for better readability
const routes = [
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },
  {
    path: '/setup-password',
    element: <SetupPassword />,
  },
  {
    path: '/email-verification',
    element: <EmailVerificationResult />,
  },
  {
    path: '/main',
    element: (
      <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute allowedRoles={SUPER_ADMIN_ROLES}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute allowedRoles={LGU_ADMIN_AND_UP_ROLES}>
            <LguUserIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: 'recycling-analytics',
        element: (
          <ProtectedRoute allowedRoles={ANALYTICS_AND_MAP_ROLES}>
            <RecyclingAnalytics />
          </ProtectedRoute>
        ),
      },
      {
        path: 'map',
        element: (
          <ProtectedRoute allowedRoles={ANALYTICS_AND_MAP_ROLES}>
            <MapView />
          </ProtectedRoute>
        ),
      },
      {
        path: 'kiosks',
        element: (
          <ProtectedRoute allowedRoles={KIOSK_ACCESS_ROLES}>
            <KioskIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: 'lgus',
        element: (
          <ProtectedRoute allowedRoles={SUPER_ADMIN_ROLES}>
            <LguIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: 'kiosks-users',
        element: (
          <ProtectedRoute allowedRoles={SUPER_ADMIN_ROLES}>
            <PatronIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: 'audit-trails',
        element: (
          <ProtectedRoute allowedRoles={AUDIT_TRAIL_ROLES}>
            <AuditTrailIndex />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute allowedRoles={ANY_MANAGEMENT_ROLES}>
            <div className="p-4">Settings</div>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
];

export default routes;