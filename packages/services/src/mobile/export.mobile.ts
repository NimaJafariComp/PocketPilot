import type { ExportAdapter } from '../interfaces/export';

export const exportMobile: ExportAdapter = {
  async exportJson() {
    throw new Error('Not wired: exportMobile.exportJson');
  }
};
