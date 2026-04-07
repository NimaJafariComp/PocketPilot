import type { CategorizationAdapter } from './interfaces/categorization';
import type { DataStoreAdapter } from './interfaces/data-store';
import type { DialogAdapter } from './interfaces/dialog';
import type { ExportAdapter } from './interfaces/export';
import type { FileImportAdapter } from './interfaces/file-import';
import type { RagAdapter } from './interfaces/rag';
import type { AuthAdapter } from './interfaces/auth';

export interface PocketPilotServices {
  auth: AuthAdapter;
  dataStore: DataStoreAdapter;
  fileImport: FileImportAdapter;
  dataExport: ExportAdapter;
  dialog: DialogAdapter;
  categorization: CategorizationAdapter;
  rag: RagAdapter;
}
