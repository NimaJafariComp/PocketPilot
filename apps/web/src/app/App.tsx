import { RouterProvider } from 'react-router';
import { DataProvider } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/ThemeProvider';
import { router } from './routes';
import { ServicesProvider } from '@pocketpilot/services/src/react/services-provider';
import { services } from './lib/services';

export default function App() {
  return (
    <ThemeProvider>
      <ServicesProvider services={services}>
        <AuthProvider>
          <DataProvider>
            <RouterProvider router={router} />
            <Toaster />
          </DataProvider>
        </AuthProvider>
      </ServicesProvider>
    </ThemeProvider>
  );
}
