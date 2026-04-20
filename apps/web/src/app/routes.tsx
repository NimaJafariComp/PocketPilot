import { Suspense, lazy, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './context/AuthContext';

const AppLayout = lazy(() => import('./components/AppLayout').then((module) => ({ default: module.AppLayout })));
const SignIn = lazy(() => import('./pages/SignIn').then((module) => ({ default: module.SignIn })));
const SignUp = lazy(() => import('./pages/SignUp').then((module) => ({ default: module.SignUp })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Transactions = lazy(() => import('./pages/Transactions').then((module) => ({ default: module.Transactions })));
const ImportCSV = lazy(() => import('./pages/ImportCSV').then((module) => ({ default: module.ImportCSV })));
const Budgets = lazy(() => import('./pages/Budgets').then((module) => ({ default: module.Budgets })));
const Goals = lazy(() => import('./pages/Goals').then((module) => ({ default: module.Goals })));
const Insights = lazy(() => import('./pages/Insights').then((module) => ({ default: module.Insights })));
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })));
const Profile = lazy(() => import('./pages/Profile').then((module) => ({ default: module.Profile })));

function LoadingScreen({ className = 'min-h-screen' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-background text-foreground ${className}`}>
      Loading...
    </div>
  );
}

function withSuspense(node: ReactNode, className?: string) {
  return <Suspense fallback={<LoadingScreen className={className} />}>{node}</Suspense>;
}

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ redirectTo: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return <Outlet />;
}

function PublicOnly() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const redirectTo =
    typeof location.state === 'object' &&
    location.state !== null &&
    'redirectTo' in location.state &&
    typeof location.state.redirectTo === 'string'
      ? location.state.redirectTo
      : '/dashboard';

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    children: [
      {
        index: true,
        element: <Navigate to="/signin" replace />,
      },
      {
        element: <PublicOnly />,
        children: [
          {
            path: 'signin',
            element: withSuspense(<SignIn />),
          },
          {
            path: 'signup',
            element: withSuspense(<SignUp />),
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: withSuspense(<AppLayout />),
            children: [
              {
                path: 'dashboard',
                element: withSuspense(<Dashboard />, 'min-h-[calc(100vh-4rem)]'),
              },
              {
                path: 'transactions',
                element: withSuspense(<Transactions />, 'min-h-[calc(100vh-4rem)]'),
              },
              {
                path: 'import',
                element: withSuspense(<ImportCSV />, 'min-h-[calc(100vh-4rem)]'),
              },
              {
                path: 'budgets',
                element: withSuspense(<Budgets />, 'min-h-[calc(100vh-4rem)]'),
              },
              {
                path: 'goals',
                element: withSuspense(<Goals />, 'min-h-[calc(100vh-4rem)]'),
              },
              {
                path: 'insights',
                element: withSuspense(<Insights />, 'min-h-[calc(100vh-4rem)]'),
              },
              {
                path: 'profile',
                element: withSuspense(<Profile />, 'min-h-[calc(100vh-4rem)]'),
              },
              {
                path: 'settings',
                element: withSuspense(<Settings />, 'min-h-[calc(100vh-4rem)]'),
              },
            ],
          },
        ],
      },
    ],
  },
]);
