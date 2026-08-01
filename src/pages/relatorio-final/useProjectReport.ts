import { useCallback, useEffect, useState } from "react";
import {
  loadProjectReport,
  markManualPath,
  saveProjectReport,
  seedOrMergeProjectReport,
  setReportStyle,
  withHistoryForPath,
  type ProjectReport,
  type ReportStyle,
} from "@/core/projectReport";

export function useProjectReport(projectId: string | undefined) {
  const [report, setReport] = useState<ProjectReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!projectId?.trim()) {
        setError("Projeto n\u00e3o especificado.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const stored = loadProjectReport(projectId);
        const merged = await seedOrMergeProjectReport(projectId, stored);
        if (!cancelled) {
          setReport(merged);
          setDirty(!stored);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar relat\u00f3rio.");
          setLoading(false);
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const updateReport = useCallback(
    (updater: (prev: ProjectReport) => ProjectReport, manualPath?: string) => {
      setReport((prev) => {
        if (!prev) return prev;
        let next = updater(prev);
        if (manualPath) {
          next = markManualPath(next, manualPath);
          next = withHistoryForPath(prev, next, manualPath);
        }
        return next;
      });
      setDirty(true);
      setSaveMsg(null);
    },
    []
  );

  const changeStyle = useCallback((style: ReportStyle) => {
    setReport((prev) => {
      if (!prev) return prev;
      const next = setReportStyle(prev, style);
      return withHistoryForPath(prev, next, "reportStyle");
    });
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    if (!report) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const saved = saveProjectReport(report);
      setReport(saved);
      setDirty(false);
      setSaveMsg("Altera\u00e7\u00f5es guardadas no relat\u00f3rio.");
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Falha ao guardar.");
    } finally {
      setSaving(false);
    }
  }, [report]);

  return {
    report,
    loading,
    saving,
    error,
    dirty,
    saveMsg,
    updateReport,
    changeStyle,
    save,
    setReport,
  };
}
