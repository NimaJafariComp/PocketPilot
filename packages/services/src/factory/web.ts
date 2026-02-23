import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { createAuthFirebaseWeb } from '../web/auth.firebase.web';
import { createDataStoreFirestoreWeb } from '../web/data-store.firestore.web';
import { fileImportWeb } from '../web/file-import.web';
import { exportWeb } from '../web/export.web';
import { dialogWeb } from '../web/dialog.web';
import { createRagHttpWeb } from '../web/rag.http.web';

export interface WebServicesConfig {
  firebaseConfig: FirebaseOptions;
  useEmulators?: boolean;
  authEmulatorUrl?: string;
  firestoreEmulatorHost?: string;
  firestoreEmulatorPort?: number;
  functionsBaseUrl: string;
}

export function createWebServices(config: WebServicesConfig) {
  const app = getApps().length ? getApps()[0] : initializeApp(config.firebaseConfig);
  const authSdk = getAuth(app);
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

  const auth = createAuthFirebaseWeb(authSdk);

  return {
    auth,
    dataStore: createDataStoreFirestoreWeb(dbSdk),
    fileImport: fileImportWeb,
    dataExport: exportWeb,
    dialog: dialogWeb,
    rag: createRagHttpWeb(auth, config.functionsBaseUrl),
  };
}
