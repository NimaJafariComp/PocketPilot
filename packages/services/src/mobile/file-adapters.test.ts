import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  pick: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  available: vi.fn(),
  share: vi.fn(),
  cache: "file:///cache/" as string | null,
  documents: "file:///documents/" as string | null,
}));
vi.mock("expo-document-picker", () => ({ getDocumentAsync: native.pick }));
vi.mock("expo-sharing", () => ({ isAvailableAsync: native.available, shareAsync: native.share }));
vi.mock("expo-file-system/legacy", () => ({
  get cacheDirectory() {
    return native.cache;
  },
  get documentDirectory() {
    return native.documents;
  },
  EncodingType: { UTF8: "utf8" },
  readAsStringAsync: native.read,
  writeAsStringAsync: native.write,
}));
// SDK 54 deliberately rejects these methods from the modern entry point.
vi.mock("expo-file-system", () => ({
  cacheDirectory: "file:///cache/",
  documentDirectory: "file:///documents/",
  EncodingType: { UTF8: "utf8" },
  readAsStringAsync() {
    throw new Error("Use expo-file-system/legacy");
  },
  writeAsStringAsync() {
    throw new Error("Use expo-file-system/legacy");
  },
}));

import { exportMobile } from "./export.mobile";
import { fileImportMobile } from "./file-import.mobile";

beforeEach(() => {
  vi.resetAllMocks();
  native.cache = "file:///cache/";
  native.documents = "file:///documents/";
  native.available.mockResolvedValue(true);
});

describe("native CSV import contract", () => {
  it.each([
    { canceled: true },
    { canceled: false, assets: [] },
  ])("handles picker cancellation or empty selection", async (result) => {
    native.pick.mockResolvedValue(result);
    expect(await fileImportMobile.pickCsvFile()).toBeNull();
    expect(native.read).not.toHaveBeenCalled();
  });
  it("reads the cached selection as UTF-8 using the supported legacy entry", async () => {
    native.pick.mockResolvedValue({
      canceled: false,
      assets: [{ name: "sample.csv", uri: "file:///cache/sample.csv" }],
    });
    native.read.mockResolvedValue("date,amount\n2026-01-01,12.34");
    const file = await fileImportMobile.pickCsvFile();
    expect(file?.name).toBe("sample.csv");
    expect(native.pick).toHaveBeenCalledWith(
      expect.objectContaining({ copyToCacheDirectory: true, multiple: false })
    );
    expect(await file?.text()).toContain("12.34");
    expect(native.read).toHaveBeenCalledWith("file:///cache/sample.csv", { encoding: "utf8" });
    native.read.mockRejectedValue(new Error("read failed"));
    await expect(file?.text()).rejects.toThrow("read failed");
  });
  it("propagates picker errors", async () => {
    native.pick.mockRejectedValue(new Error("picker failed"));
    await expect(fileImportMobile.pickCsvFile()).rejects.toThrow("picker failed");
  });
});

describe("native JSON export contract", () => {
  it.each([
    "cache",
    "documents",
  ])("writes UTF-8 JSON to %s then shares the file", async (directory) => {
    if (directory === "documents") native.cache = null;
    const data = { transactions: [] };
    await exportMobile.exportJson("export.json", data);
    const uri = `file:///${directory}/export.json`;
    expect(native.write).toHaveBeenCalledWith(uri, JSON.stringify(data, null, 2), {
      encoding: "utf8",
    });
    expect(native.share).toHaveBeenCalledWith(
      uri,
      expect.objectContaining({ mimeType: "application/json", UTI: "public.json" })
    );
  });
  it("reports unavailable storage without writing", async () => {
    native.cache = null;
    native.documents = null;
    await expect(exportMobile.exportJson("export.json", {})).rejects.toThrow(
      "Export is unavailable"
    );
    expect(native.write).not.toHaveBeenCalled();
  });
  it("reports unavailable sharing without calling share", async () => {
    native.available.mockResolvedValue(false);
    await expect(exportMobile.exportJson("export.json", {})).rejects.toThrow(
      "Sharing is unavailable"
    );
    expect(native.share).not.toHaveBeenCalled();
  });
  it("propagates write failures without sharing", async () => {
    native.write.mockRejectedValue(new Error("write failed"));
    await expect(exportMobile.exportJson("export.json", {})).rejects.toThrow("write failed");
    expect(native.share).not.toHaveBeenCalled();
  });
  it("propagates share failures", async () => {
    native.share.mockRejectedValue(new Error("share failed"));
    await expect(exportMobile.exportJson("export.json", {})).rejects.toThrow("share failed");
  });
});
