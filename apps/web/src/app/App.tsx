import { RouterProvider } from 'react-router';
import { DataProvider } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/ThemeProvider';
import { router } from './routes';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <RouterProvider router={router} />
          <Toaster />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
