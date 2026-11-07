import { ServicesProvider, useServices } from "@pocketpilot/services/src/react/services-provider";
import type { PocketPilotServices } from "@pocketpilot/services/src/types";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "../src/app/components/ThemeProvider";
import { AuthProvider, useAuth } from "../src/app/context/AuthContext";
import { DataProvider, useData } from "../src/app/context/DataContext";

// No Firebase credentials, accounts, network calls or production services.
const services = new Proxy(
  {
    capabilities: {
      aiAssistant: false,
      ragSync: false,
      remoteCategorization: false,
      merchantLearning: false,
      demoDataTools: false,
      useEmulators: false,
    },
    auth: {
      onAuthStateChanged(callback: (user: null) => void) {
        callback(null);
        return () => {};
      },
    },
  } as PocketPilotServices,
  {
    get(target, property) {
      if (property === "auth" || property === "capabilities") return target[property];
      throw new Error(`Unexpected service access: ${String(property)}`);
    },
  }
);

function Probe() {
  const auth = useAuth();
  const data = useData();
  const currentServices = useServices();
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      {auth.loading || data.loading ? "loading" : "signed-out"}:
      {currentServices === services ? "services-ok" : "wrong-services"}:{count}
    </button>
  );
}

const container = document.getElementById("root");
if (!container) throw new Error("Missing test container");
const root = createRoot(container);
root.render(
  <ThemeProvider>
    <ServicesProvider services={services}>
      <AuthProvider>
        <DataProvider>
          <Probe />
        </DataProvider>
      </AuthProvider>
    </ServicesProvider>
  </ThemeProvider>
);
Object.assign(window, { unmountProviders: () => root.unmount() });
