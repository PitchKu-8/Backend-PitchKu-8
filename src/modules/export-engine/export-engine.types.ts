// src/modules/export-engine/export-engine.types.ts
export type ExportFormat = "pptx" | "pdf";

export type ExportResult = {
  downloadUrl: string;
  fileName: string;
};
