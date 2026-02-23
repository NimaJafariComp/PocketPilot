export interface ExportAdapter {
  exportJson(filename: string, data: unknown): Promise<void>;
}
