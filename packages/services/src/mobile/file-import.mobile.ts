import type { FileImportAdapter } from '../interfaces/file-import';

export const fileImportMobile: FileImportAdapter = {
  async pickCsvFile() {
    throw new Error('Not wired: fileImportMobile.pickCsvFile');
  }
};
