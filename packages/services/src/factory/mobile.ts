import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth } from '@firebase/auth';
import * as ReactNativeAuth from '@firebase/auth';
import { createAuthFirebaseMobile } from '../mobile/auth.firebase.mobile';
import { createDataStoreFirestoreMobile } from '../mobile/data-store.firestore.mobile';
import { fileImportMobile } from '../mobile/file-import.mobile';
import { exportMobile } from '../mobile/export.mobile';
import { dialogMobile } from '../mobile/dialog.mobile';
import { createRagHttpMobile } from '../mobile/rag.http.mobile';
import { createCategorizationHttpMobile } from '../mobile/categorization.http.mobile';
import type { PocketPilotServices } from '../types';

export interface MobileServicesConfig {
  firebaseConfig: FirebaseOptions;
  useEmulators?: boolean;
  authEmulatorUrl?: string;
  firestoreEmulatorHost?: string;
  firestoreEmulatorPort?: number;
  functionsBaseUrl?: string;
  categorizationServiceUrl?: string;
  ragServiceUrl?: string;
}

const getReactNativePersistence =
  (
    ReactNativeAuth as typeof ReactNativeAuth & {
      getReactNativePersistence(storage: typeof AsyncStorage): unknown;
    }
  ).getReactNativePersistence;

export function createMobileServices(config: MobileServicesConfig): PocketPilotServices {
  const existingApps = getApps();
  const app = existingApps.length > 0 ? existingApps[0] : initializeApp(config.firebaseConfig);
  const authSdk =
    existingApps.length > 0
      ? getAuth(app)
      : initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage) as never,
        });
  const dbSdk = getFirestore(app);

  if (config.useEmulators) {
    connectAuthEmulator(authSdk, config.authEmulatorUrl || 'http://127.0.0.1:9099', {
      disableWarnings: true,
    });
    connectFirestoreEmulator(
      dbSdk,
      config.firestoreEmulatorHost || '127.0.0.1',
      config.firestoreEmulatorPort || 8080,
    );
  }

  const auth = createAuthFirebaseMobile(authSdk);
  const categorizationBaseUrl = config.categorizationServiceUrl || config.functionsBaseUrl || '';
  const ragBaseUrl = config.ragServiceUrl || config.functionsBaseUrl || '';

  return {
    auth,
    dataStore: createDataStoreFirestoreMobile(dbSdk),
    fileImport: fileImportMobile,
    dataExport: exportMobile,
    dialog: dialogMobile,
    categorization: createCategorizationHttpMobile(auth, categorizationBaseUrl),
    rag: createRagHttpMobile(auth, ragBaseUrl),
  };
}
