import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { ImportCSV } from './pages/ImportCSV';
import { Budgets } from './pages/Budgets';
import { Goals } from './pages/Goals';
import { Insights } from './pages/Insights';
import { Settings } from './pages/Settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/signin',
    element: <SignIn />,
  },
  {
    path: '/signup',
    element: <SignUp />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'transactions',
        element: <Transactions />,
      },
      {
        path: 'import',
        element: <ImportCSV />,
      },
      {
        path: 'budgets',
        element: <Budgets />,
      },
      {
        path: 'goals',
        element: <Goals />,
      },
      {
        path: 'insights',
        element: <Insights />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
]);
