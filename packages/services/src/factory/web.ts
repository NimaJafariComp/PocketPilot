import { type FirebaseOptions, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { initializeWebAppCheck } from "./app-check.web";
import type { PocketPilotServices } from "../types";
import { createAuthFirebaseWeb } from "../web/auth.firebase.web";
import { createCategorizationHttpWeb } from "../web/categorization.http.web";
import { createDataStoreFirestoreWeb } from "../web/data-store.firestore.web";
import { dialogWeb } from "../web/dialog.web";
import { exportWeb } from "../web/export.web";
import { fileImportWeb } from "../web/file-import.web";
import { createRagHttpWeb } from "../web/rag.http.web";
import {
  type FeatureCapabilities,
  resolveCapabilities,
  selectCategorizationAdapter,
  selectRagAdapter,
} from "../capabilities";

export interface WebServicesConfig {
  firebaseConfig: FirebaseOptions;
  useEmulators?: boolean;
  /** Public reCAPTCHA Enterprise site key; omit until the App Check app is registered. */
  appCheckSiteKey?: string;
  authEmulatorUrl?: string;
  firestoreEmulatorHost?: string;
  firestoreEmulatorPort?: number;
  functionsBaseUrl?: string;
  categorizationServiceUrl?: string;
  ragServiceUrl?: string;
  capabilities?: FeatureCapabilities;
}

export function createWebServices(config: WebServicesConfig): PocketPilotServices {
  const capabilities = config.capabilities ?? resolveCapabilities();
  const app = getApps().length ? getApps()[0] : initializeApp(config.firebaseConfig);
  initializeWebAppCheck({
    app,
    siteKey: config.appCheckSiteKey,
    useEmulators: config.useEmulators,
  });
  const authSdk = getAuth(app);
  const dbSdk = getFirestore(app);

  if (config.useEmulators) {
    connectAuthEmulator(authSdk, config.authEmulatorUrl || "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(
      dbSdk,
      config.firestoreEmulatorHost || "127.0.0.1",
      config.firestoreEmulatorPort || 8080
    );
  }

  const auth = createAuthFirebaseWeb(authSdk);
  const categorizationBaseUrl = config.categorizationServiceUrl ?? "";
  const ragBaseUrl = config.ragServiceUrl ?? "";

  return {
    capabilities,
    auth,
    dataStore: createDataStoreFirestoreWeb(dbSdk),
    fileImport: fileImportWeb,
    dataExport: exportWeb,
    dialog: dialogWeb,
    categorization: selectCategorizationAdapter(
      capabilities,
      createCategorizationHttpWeb(auth, categorizationBaseUrl)
    ),
    rag: selectRagAdapter(capabilities, createRagHttpWeb(auth, ragBaseUrl)),
  };
}
