import { useEffect, useState } from "react";

import { applyResultados } from "../../context/projectState";
import { reviveState } from "../../context/projectPersistence";
import type { ProjectState } from "../../context/projectTypes";
import { loadProjectRecord } from "../../core/projects/projectsClient";

export type ShowroomLoadedEntry = {
  id: string;
  projectState: ProjectState | null;
  error: string | null;
  recordName: string | null;
};

export function useShowroomLoader(ids: string[]): {
  entries: ShowroomLoadedEntry[];
  loading: boolean;
} {
  const [entries, setEntries] = useState<ShowroomLoadedEntry[]>([]);
  const [loading, setLoading] = useState(() => ids.length > 0);

  const idsKey = ids.join("\u0001");

  useEffect(() => {
    let cancelled = false;

    if (ids.length === 0) {
      queueMicrotask(() => {
        if (!cancelled) {
          setEntries([]);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });

    void (async () => {
      const results: ShowroomLoadedEntry[] = await Promise.all(
        ids.map(async (id) => {
          try {
            const record = await loadProjectRecord(id);
            if (!record) {
              return { id, projectState: null, error: "Projeto não encontrado.", recordName: null };
            }
            const revived = reviveState(record.snapshot?.projectState);
            if (!revived) {
              return {
                id,
                projectState: null,
                error: "Snapshot inválido ou vazio.",
                recordName: record.name ?? null,
              };
            }
            const state = applyResultados(revived);
            return {
              id,
              projectState: state,
              error: null,
              recordName: record.name ?? null,
            };
          } catch (err) {
            return {
              id,
              projectState: null,
              error: err instanceof Error ? err.message : "Erro ao carregar.",
              recordName: null,
            };
          }
        })
      );

      if (!cancelled) {
        setEntries(results);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey codifica ids
  }, [idsKey, ids.length]);

  return { entries, loading };
}
