import { authFirebaseMobile } from '../mobile/auth.firebase.mobile';
import { dataStoreFirestoreMobile } from '../mobile/data-store.firestore.mobile';
import { fileImportMobile } from '../mobile/file-import.mobile';
import { exportMobile } from '../mobile/export.mobile';
import { dialogMobile } from '../mobile/dialog.mobile';
import { ragHttpMobile } from '../mobile/rag.http.mobile';

export function createMobileServices() {
  return {
    auth: authFirebaseMobile,
    dataStore: dataStoreFirestoreMobile,
    fileImport: fileImportMobile,
    dataExport: exportMobile,
    dialog: dialogMobile,
    rag: ragHttpMobile
  };
}
