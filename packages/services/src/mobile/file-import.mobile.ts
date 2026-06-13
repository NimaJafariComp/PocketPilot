import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import type { FileImportAdapter } from "../interfaces/file-import";

export const fileImportMobile: FileImportAdapter = {
  async pickCsvFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["text/csv", "text/comma-separated-values", "public.comma-separated-values-text"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || result.assets.length === 0) {
      return null;
    }

    const [asset] = result.assets;

    return {
      name: asset.name,
      text: () =>
        FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 }),
    };
  },
};
