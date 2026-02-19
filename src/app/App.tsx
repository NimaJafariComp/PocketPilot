import { RouterProvider } from 'react-router';
import { DataProvider } from './context/DataContext';
import { Toaster } from './components/ui/sonner';
import { router } from './routes';

export default function App() {
  return (
    <DataProvider>
      <RouterProvider router={router} />
      <Toaster />
    </DataProvider>
  );
}
