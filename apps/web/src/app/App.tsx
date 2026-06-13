import { ServicesProvider } from "@pocketpilot/services/src/react/services-provider";
import { RouterProvider } from "react-router";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { services } from "./lib/services";
import { router } from "./routes";

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
