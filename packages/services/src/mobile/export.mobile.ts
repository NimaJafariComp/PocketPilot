import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { ExportAdapter } from '../interfaces/export';

export const exportMobile: ExportAdapter = {
  async exportJson(filename, data) {
    const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!baseDirectory) {
      throw new Error('Export is unavailable on this device.');
    }

    const fileUri = `${baseDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error('Sharing is unavailable on this device.');
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export PocketPilot data',
      UTI: 'public.json',
    });
  },
};
