import { createContext, useContext, type PropsWithChildren } from 'react';
import type { PocketPilotServices } from '../types';

const ServicesContext = createContext<PocketPilotServices | undefined>(undefined);

export function ServicesProvider({
  children,
  services,
}: PropsWithChildren<{ services: PocketPilotServices }>) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices() {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error('useServices must be used within ServicesProvider');
  }
  return context;
}
