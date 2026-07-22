export type IndustrialOnlineAnalysisEditableColumn = {
  key: string;
  label: string;
  editable: boolean;
};

export type IndustrialOnlineAnalysisRow = {
  rowId: string;
  cells: Record<string, string>;
  origin: "canonical" | "added";
  modifiedFields: string[];
  pendingDelete?: boolean;
};

export type IndustrialOnlineAnalysisTableSection = {
  id: string;
  title: string;
  columns: IndustrialOnlineAnalysisEditableColumn[];
  rows: IndustrialOnlineAnalysisRow[];
  /** Secção contém overrides aplicados */
  modified?: boolean;
};
