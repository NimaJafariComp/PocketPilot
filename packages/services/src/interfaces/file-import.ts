export interface PickedFile {
  name: string;
  text(): Promise<string>;
}

export interface FileImportAdapter {
  pickCsvFile(): Promise<PickedFile | null>;
}
