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
import PatronIndex from '../pages/Petron/PatronIndex'
import RecyclingAnalytics from '../pages/RecyclingAnalytics/RecyclingAnalytics'
import MapView from '../pages/Map/MapView'

const MANAGEMENT_ROLES = ['super_admin', 'lgu_admin', 'lgu_staff'];

const ProtectedRoute = ({ children, allowedRoles }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
    return <Navigate to="/login" replace />;
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
        element: <Dashboard />,
      },
      {
        path: 'users',
        element: <LguUserIndex />, // Using the new page we discussed!
      },
      { path: 'recycling-analytics', element: <RecyclingAnalytics /> },
      { path: 'map', element: <MapView /> },
      { path: 'kiosks', element: <KioskIndex /> },
      { path: 'lgus', element: <LguIndex /> },
      { path: 'kiosks-users', element: <PatronIndex /> },
      { path: 'settings', element: <div className="p-4">Settings</div> },
    ],
  },
  {
    path: '/patron',
    element: (
      <ProtectedRoute allowedRoles={['kiosk_user']}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <div className="p-4">Patron Dashboard</div> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
];

export default routes;