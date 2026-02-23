import type { FileImportAdapter } from '../interfaces/file-import';

export const fileImportWeb: FileImportAdapter = {
  async pickCsvFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,text/csv';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        resolve({
          name: file.name,
          text: () => file.text()
        });
      };
      input.click();
    });
  }
};
