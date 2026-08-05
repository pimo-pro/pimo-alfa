/**
 * Página de Gestão de Materiais — Admin, módulo Materials.
 * FASE 3 Etapa 6: categorias, pesquisa, filtros, ordenação, drawer melhorado, export/import.
 */

/* eslint-disable react-refresh/only-export-components */

import { useState, useEffect, useMemo } from "react";
import Panel from "../../../components/ui/Panel";
import MaterialPanel from "../../../components/layout/right-panel/MaterialPanel";
import { useToast } from "../../../context/ToastContext";
import {
  useMaterialsList,
  useSaveMaterial,
  useDeleteMaterial,
  getMaterialByIdOrLabel,
  migrateMaterialsFromLegacy,
  duplicateMaterial,
  exportMaterialsAsJson,
  importMaterialsFromJson,
} from "../../../core/materials";
import type { MaterialRecord, MaterialCategoryId, CreateMaterialData } from "../../../core/materials/types";
import { getAllPresets, getPresetById } from "../../../core/materials/presetService";
import { MATERIAIS_INDUSTRIAIS } from "../../../core/manufacturing/materials";
import {
  getMaterialEspessuraMm,
  toMaterialPadronizado,
} from "../../../components/settings/material/materialGrouping";
import { applyMateriaisSsotFromPublicUrl } from "../../../core/catalog/materiaisSsotApply";
import { loadMateriaisSsotFromUrl } from "../../../core/catalog/materiaisSsotReader";
import {
  groupSsotChapasByFamilia,
  resolveSsotChapas,
  type MateriaisSsotChapaResolved,
  type MateriaisSsotFamiliaGrupo,
} from "../../../core/catalog/materiaisSsotNormalize";
import type { MateriaisSsotCatalog } from "../../../core/catalog/materiaisSsotTypes";

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  marginBottom: 2,
};

export const CATEGORIAS_MATERIAIS: { id: MaterialCategoryId; label: string }[] = [
  { id: "mdf", label: "MDF" },
  { id: "carvalho", label: "Carvalho" },
  { id: "lacado", label: "Lacado" },
  { id: "glass", label: "Vidro" },
  { id: "metal", label: "Metal" },
  { id: "industrial", label: "Industrial" },
  { id: "visual", label: "Visual" },
  { id: "outros", label: "Outros" },
];

type SortField = "label" | "precoPorM2" | "espessura" | "categoryId";
type SortDir = "asc" | "desc";
type FilterType = "all" | "industrial" | "visual" | "migrado";

function getMaterialType(m: MaterialRecord): "industrial" | "visual" | "migrado" | "outro" {
  if (m.categoryId === "industrial") return "migrado";
  if (m.industrialMaterialId) return "industrial";
  if (m.visualPresetId) return "visual";
  return "outro";
}

function MaterialTexturePreview({ url }: { url: string }) {
  const [errored, setErrored] = useState(false);
  return (
    <div
      style={{
        marginTop: 8,
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "var(--radius)",
        padding: 8,
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 6 }}>Pré-visualização da textura</div>
      {!errored ? (
        <img
          src={url}
          alt="Preview da textura"
          onError={() => setErrored(true)}
          style={{
            width: "100%",
            height: 110,
            objectFit: "cover",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.12)",
            display: "block",
          }}
        />
      ) : (
        <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "10px 4px" }}>
          Não foi possível carregar a imagem desta URL.
        </div>
      )}
    </div>
  );
}

export default function GestaoMateriaisPage() {
  const { showToast } = useToast();
  const { materials, reload } = useMaterialsList();
  const { save } = useSaveMaterial();
  const { deleteMaterial: deleteMaterialFn } = useDeleteMaterial();

  useEffect(() => {
    const { migrated } = migrateMaterialsFromLegacy();
    if (migrated > 0) reload();
  }, [reload]);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<MaterialRecord>>({
    label: "",
    categoryId: "",
    color: "#ffffff",
    textureUrl: "",
    espessura: 19,
    precoPorM2: 0,
    sheetWidthMm: 2800,
    sheetHeightMm: 2070,
    sheetThicknessMm: 19,
    sheetWeightKg: undefined,
    sheetDensity: undefined,
    industrialMaterialId: "",
    visualPresetId: "",
    materialMadeira: false,
  });

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterPriceMin, setFilterPriceMin] = useState<string>("");
  const [filterPriceMax, setFilterPriceMax] = useState<string>("");
  const [filterEspessuraMin, setFilterEspessuraMin] = useState<string>("");
  const [filterEspessuraMax, setFilterEspessuraMax] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("label");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [importJson, setImportJson] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [ssotBusy, setSsotBusy] = useState(false);
  const [ssotCatalog, setSsotCatalog] = useState<MateriaisSsotCatalog | null>(null);
  const [ssotLoadError, setSsotLoadError] = useState<string | null>(null);
  const [ssotReady, setSsotReady] = useState(false);
  const texturePreviewUrl = String(form.textureUrl ?? "").trim();

  /** Garante SSOT aplicado + catálogo em memória antes de desenhar a grelha. */
  useEffect(() => {
    let cancelled = false;
    setSsotReady(false);
    setSsotLoadError(null);
    void (async () => {
      try {
        const applyResult = await applyMateriaisSsotFromPublicUrl();
        if (cancelled) return;
        if (!applyResult.ok) {
          setSsotLoadError(applyResult.error ?? "Falha ao aplicar SSOT.");
        }
        const cat = await loadMateriaisSsotFromUrl();
        if (cancelled) return;
        setSsotCatalog(cat);
        reload();
        setSsotReady(true);
      } catch (err) {
        if (cancelled) return;
        setSsotCatalog(null);
        setSsotLoadError(err instanceof Error ? err.message : String(err));
        setSsotReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const findMaterialForSsotRow = (row: MateriaisSsotChapaResolved): MaterialRecord | undefined => {
    if (row.industrialCanonicalId) {
      const byInd = materials.find(
        (m) =>
          m.industrialMaterialId === row.industrialCanonicalId ||
          m.id === row.industrialCanonicalId
      );
      if (byInd) return byInd;
    }
    const ref = row.ref.trim().toLowerCase();
    if (ref) {
      const byRef = materials.find(
        (m) =>
          (m.industrialMaterialId ?? "").toLowerCase() === ref ||
          (m.id ?? "").toLowerCase() === ref
      );
      if (byRef) return byRef;
    }
    if (row.espessuraMm != null && row.familia.trim()) {
      const fam = row.familia.trim().toLowerCase();
      return materials.find((m) => {
        if (getMaterialEspessuraMm(m) !== row.espessuraMm) return false;
        const pad = toMaterialPadronizado(m.label ?? "", {
          id: m.id,
          industrialMaterialId: m.industrialMaterialId,
        }).toLowerCase();
        const label = (m.label ?? "").toLowerCase();
        return pad === fam || label.startsWith(fam) || label.includes(fam);
      });
    }
    return undefined;
  };

  /** Fonte principal da grelha: famílias do SSOT (Nome novo padronizado). */
  const ssotGruposFiltrados = useMemo((): MateriaisSsotFamiliaGrupo[] | null => {
    if (!ssotCatalog) return null;
    let rows = resolveSsotChapas(ssotCatalog);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.familia.toLowerCase().includes(q) ||
          r.nomeAtual.toLowerCase().includes(q) ||
          r.nomeNovoPadronizado.toLowerCase().includes(q) ||
          r.ref.toLowerCase().includes(q) ||
          r.displayLabel.toLowerCase().includes(q) ||
          String(r.espessuraMm ?? "").includes(q) ||
          String(r.precoPorM2Eur ?? "").includes(q) ||
          String(r.precoVendaPorM2Eur ?? "").includes(q)
      );
    }
    const pMin = filterPriceMin !== "" ? Number(filterPriceMin) : null;
    const pMax = filterPriceMax !== "" ? Number(filterPriceMax) : null;
    if (pMin !== null && !Number.isNaN(pMin)) {
      rows = rows.filter((r) => Number(r.precoPorM2Eur ?? r.precoVendaPorM2Eur ?? 0) >= pMin);
    }
    if (pMax !== null && !Number.isNaN(pMax)) {
      rows = rows.filter((r) => Number(r.precoPorM2Eur ?? r.precoVendaPorM2Eur ?? 0) <= pMax);
    }
    const eMin = filterEspessuraMin !== "" ? Number(filterEspessuraMin) : null;
    const eMax = filterEspessuraMax !== "" ? Number(filterEspessuraMax) : null;
    if (eMin !== null && !Number.isNaN(eMin)) {
      rows = rows.filter((r) => Number(r.espessuraMm ?? 0) >= eMin);
    }
    if (eMax !== null && !Number.isNaN(eMax)) {
      rows = rows.filter((r) => Number(r.espessuraMm ?? 0) <= eMax);
    }
    if (filterCategory || filterType !== "all") {
      rows = rows.filter((r) => {
        const m = findMaterialForSsotRow(r);
        if (!m) return filterType === "all" && !filterCategory;
        if (filterCategory && (m.categoryId ?? "") !== filterCategory) return false;
        if (filterType !== "all" && getMaterialType(m) !== filterType) return false;
        return true;
      });
    }
    let grupos = groupSsotChapasByFamilia(rows);
    grupos = [...grupos].sort((a, b) => {
      let cmp = 0;
      if (sortField === "label") {
        cmp = a.familia.localeCompare(b.familia, "pt", { sensitivity: "base" });
      } else if (sortField === "espessura") {
        cmp = (a.espessuras[0]?.espessuraMm ?? 0) - (b.espessuras[0]?.espessuraMm ?? 0);
      } else if (sortField === "precoPorM2") {
        const pa = a.espessuras[0]?.precoPorM2Eur ?? a.espessuras[0]?.precoVendaPorM2Eur ?? 0;
        const pb = b.espessuras[0]?.precoPorM2Eur ?? b.espessuras[0]?.precoVendaPorM2Eur ?? 0;
        cmp = Number(pa) - Number(pb);
      } else {
        cmp = a.familia.localeCompare(b.familia, "pt", { sensitivity: "base" });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return grupos;
  }, [
    ssotCatalog,
    search,
    filterCategory,
    filterType,
    filterPriceMin,
    filterPriceMax,
    filterEspessuraMin,
    filterEspessuraMax,
    sortField,
    sortDir,
    materials,
  ]);

  const usarSsot = ssotCatalog !== null;
  const totalEspessurasSsot = ssotGruposFiltrados?.reduce((n, g) => n + g.espessuras.length, 0) ?? 0;

  const openNew = () => {
    setEditingId(null);
    setForm({
      label: "",
      categoryId: "",
      color: "#ffffff",
      textureUrl: "",
      espessura: 19,
      precoPorM2: 0,
      sheetWidthMm: 2800,
      sheetHeightMm: 2070,
      sheetThicknessMm: 19,
      sheetWeightKg: undefined,
      sheetDensity: undefined,
      industrialMaterialId: "",
      visualPresetId: "",
    });
    setPanelOpen(true);
  };

  const openEdit = (id: string) => {
    const m = getMaterialByIdOrLabel(id);
    setEditingId(id);
    if (m) {
      setForm({
        id: m.id,
        label: m.label,
        categoryId: m.categoryId,
        color: m.color ?? "#ffffff",
        textureUrl: m.textureUrl,
        espessura: m.espessura,
        precoPorM2: m.precoPorM2,
        sheetWidthMm: m.sheetWidthMm ?? 2800,
        sheetHeightMm: m.sheetHeightMm ?? 2070,
        sheetThicknessMm: m.sheetThicknessMm ?? 19,
        sheetWeightKg: m.sheetWeightKg,
        sheetDensity: m.sheetDensity,
        industrialMaterialId: m.industrialMaterialId,
        visualPresetId: m.visualPresetId,
        materialMadeira: m.materialMadeira ?? false,
      });
    }
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingId(null);
  };

  const buildFormData = (): CreateMaterialData => ({
    label: String(form.label ?? "").trim(),
    categoryId: form.categoryId,
    color: form.color,
    textureUrl: texturePreviewUrl || undefined,
    espessura: Number(form.espessura) || 19,
    precoPorM2: Number(form.precoPorM2 ?? 0),
    sheetWidthMm: Number(form.sheetWidthMm) || 2800,
    sheetHeightMm: Number(form.sheetHeightMm) || 2070,
    sheetThicknessMm: Number(form.sheetThicknessMm) || 19,
    sheetWeightKg: form.sheetWeightKg === undefined || form.sheetWeightKg === null
      ? undefined
      : Number(form.sheetWeightKg),
    sheetDensity: form.sheetDensity === undefined || form.sheetDensity === null
      ? undefined
      : Number(form.sheetDensity),
    industrialMaterialId: form.industrialMaterialId || undefined,
    visualPresetId: form.visualPresetId || undefined,
    materialMadeira: form.materialMadeira === true,
  });

  const handleSave = () => {
    const data = buildFormData();
    const result = save(data, editingId);
    if (!result.success) {
      showToast(result.error ?? "Erro ao guardar.", "error");
      return;
    }
    reload();
    closePanel();
    showToast(editingId ? "Material atualizado com sucesso." : "Material criado com sucesso.", "info");
  };

  const handleDelete = (id: string, label: string) => {
    setPendingDelete({ id, label });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const removed = deleteMaterialFn(pendingDelete.id);
    if (removed) {
      reload();
      if (panelOpen && editingId === pendingDelete.id) closePanel();
      showToast("Material eliminado.", "info");
    } else {
      showToast("Não foi possível eliminar o material.", "error");
    }
    setPendingDelete(null);
  };

  const handleDuplicate = (id: string) => {
    const result = duplicateMaterial(id);
    if (!result.success) {
      showToast(result.error ?? "Erro ao duplicar.", "error");
      return;
    }
    reload();
    showToast("Material duplicado.", "info");
    if (result.data?.id) {
      openEdit(result.data.id);
    }
  };

  const handleExport = () => {
    const json = exportMaterialsAsJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pimo-materiais-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exportação concluída.", "info");
  };

  const handleImport = () => {
    const { imported, errors } = importMaterialsFromJson(importJson, { merge: true });
    if (imported > 0) reload();
    if (errors.length > 0) {
      showToast(`${imported} importado(s). Erros: ${errors.slice(0, 3).join("; ")}`, "error");
    } else {
      showToast(`${imported} material(is) importado(s).`, "info");
    }
    setImportJson("");
    setShowImport(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setImportJson(text);
      setShowImport(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSyncSsot = async () => {
    setSsotBusy(true);
    setSsotLoadError(null);
    try {
      const result = await applyMateriaisSsotFromPublicUrl();
      if (!result.ok) {
        setSsotLoadError(result.error ?? "Falha ao sincronizar SSOT.");
        showToast(result.error ?? "Falha ao sincronizar SSOT.", "error");
        return;
      }
      const cat = await loadMateriaisSsotFromUrl();
      setSsotCatalog(cat);
      reload();
      setSsotReady(true);
      showToast(
        `SSOT: ${groupSsotChapasByFamilia(resolveSsotChapas(cat)).length} famílias · ${result.chapasComIndustrial} REF industriais · ${result.materialsUpdated} materiais actualizados.`,
        "info"
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao sincronizar SSOT.";
      setSsotLoadError(msg);
      showToast(msg, "error");
    } finally {
      setSsotBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, minHeight: 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
          Gestão de Materiais
        </h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="button" onClick={openNew}>
            + Adicionar Material
          </button>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => void handleSyncSsot()}
            disabled={ssotBusy}
            title="Lê public/config/materiais-ssot.xlsx e aplica nomes/preços na UI"
          >
            {ssotBusy ? "A sincronizar SSOT…" : "Sincronizar SSOT Excel"}
          </button>
          <button type="button" className="button button-ghost" onClick={handleExport}>
            Exportar Materiais
          </button>
          <label className="button button-ghost" style={{ cursor: "pointer", margin: 0 }}>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              style={{ display: "none" }}
            />
            Importar Materiais
          </label>
          <button type="button" className="button button-ghost" onClick={() => setShowImport((v) => !v)}>
            {showImport ? "Fechar importação" : "Colar JSON"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Centro único de gestão de materiais: catálogo, fabricação, presets visuais e painéis de materiais.
        </div>
        <MaterialPanel />
      </div>

      {pendingDelete && (
        <Panel title="Confirmação de remoção">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Eliminar o material "{pendingDelete.label}"?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="button" onClick={confirmDelete}>
                Confirmar remoção
              </button>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setPendingDelete(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </Panel>
      )}

      {showImport && (
        <Panel title="Importar materiais (JSON)">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Selecione um ficheiro JSON ou cole o conteúdo abaixo. A importação faz merge e evita duplicados por nome.
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <input type="file" accept=".json,application/json" onChange={handleImportFile} style={{ fontSize: 12 }} />
              Escolher ficheiro
            </label>
            <textarea
              className="input"
              placeholder='Cole aqui um JSON de materiais (array). Ex.: [{"label":"...","categoryId":"mdf","espessura":18,"precoPorM2":25}]'
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              rows={4}
              style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="button" onClick={handleImport}>
                Importar (merge: evita duplicados por nome)
              </button>
              <button type="button" className="button button-ghost" onClick={() => setShowImport(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Pesquisa e filtros">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <input
              className="input"
              type="text"
              placeholder="Pesquisar por nome, espessura, preço ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 260, flex: 1, maxWidth: 420 }}
            />
            <select
              className="input"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ width: 150 }}
            >
              <option value="">Todas as categorias</option>
              {CATEGORIAS_MATERIAIS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <select
              className="input"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              style={{ width: 150 }}
            >
              <option value="all">Todos os tipos</option>
              <option value="industrial">Industrial</option>
              <option value="visual">Visual</option>
              <option value="migrado">Migrado</option>
            </select>
          </div>
          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.08)",
              margin: "4px 0",
            }}
          />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <span style={{ fontWeight: 500 }}>Preço (€/m²):</span>
            <input
              className="input"
              type="number"
              placeholder="Mín"
              value={filterPriceMin}
              onChange={(e) => setFilterPriceMin(e.target.value)}
              style={{ width: 80 }}
            />
            <span>—</span>
            <input
              className="input"
              type="number"
              placeholder="Máx"
              value={filterPriceMax}
              onChange={(e) => setFilterPriceMax(e.target.value)}
              style={{ width: 80 }}
            />
            <span style={{ marginLeft: 16, fontWeight: 500 }}>Espessura (mm):</span>
            <input
              className="input"
              type="number"
              placeholder="Mín"
              value={filterEspessuraMin}
              onChange={(e) => setFilterEspessuraMin(e.target.value)}
              style={{ width: 80 }}
            />
            <span>—</span>
            <input
              className="input"
              type="number"
              placeholder="Máx"
              value={filterEspessuraMax}
              onChange={(e) => setFilterEspessuraMax(e.target.value)}
              style={{ width: 80 }}
            />
          </div>
        </div>
      </Panel>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Ordenar por:</span>
        <select
          className="input"
          value={sortField}
          onChange={(e) => setSortField(e.target.value as SortField)}
          style={{ width: 140 }}
        >
          <option value="label">Nome</option>
          <option value="precoPorM2">Preço</option>
          <option value="espessura">Espessura</option>
          <option value="categoryId">Categoria</option>
        </select>
        <button
          type="button"
          className="button button-ghost"
          style={{ padding: "4px 10px" }}
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        >
          {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
        </button>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {usarSsot && ssotGruposFiltrados
            ? `${ssotGruposFiltrados.length} famílias · ${totalEspessurasSsot} espessuras (SSOT)`
            : "A aguardar SSOT…"}
        </span>
      </div>

      <Panel title="Materiais existentes (SSOT — 1 carta por família)">
        {!ssotReady ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", padding: 24, textAlign: "center" }}>
            A carregar famílias do SSOT Excel…
          </div>
        ) : ssotLoadError && !ssotCatalog ? (
          <div style={{ fontSize: 13, color: "var(--red, #ef4444)", padding: 24, textAlign: "center" }}>
            Não foi possível carregar o SSOT: {ssotLoadError}
            <div style={{ marginTop: 12 }}>
              <button type="button" className="button" onClick={() => void handleSyncSsot()}>
                Tentar novamente
              </button>
            </div>
          </div>
        ) : usarSsot && ssotGruposFiltrados && ssotGruposFiltrados.length === 0 ? (
          <div
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              padding: 24,
              textAlign: "center",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "var(--radius)",
              border: "1px dashed rgba(255,255,255,0.08)",
            }}
          >
            Nenhuma família SSOT corresponde aos filtros. Ajuste a pesquisa ou sincronize o Excel.
          </div>
        ) : usarSsot && ssotGruposFiltrados && ssotGruposFiltrados.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Fonte: <code>public/config/materiais-ssot.xlsx</code> · Nome novo padronizado ·
                espessuras sempre visíveis dentro de cada família.
              </div>
              {ssotGruposFiltrados.map((grupo) => {
                const first = grupo.espessuras[0];
                const linkedFirst = first ? findMaterialForSsotRow(first) : undefined;
                const espessurasLabel = grupo.espessuras
                  .map((r) => r.espessuraMm)
                  .filter((t): t is number => t != null && t > 0)
                  .join(", ");
                return (
                  <div
                    key={grupo.familia}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: 16,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(59, 130, 246, 0.35)",
                      borderRadius: 10,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                      gap: 14,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {linkedFirst?.color && (
                        <span
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: linkedFirst.color,
                            border: "1px solid rgba(255,255,255,0.25)",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "var(--text-main)",
                            letterSpacing: "0.01em",
                          }}
                        >
                          {grupo.familia}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                          {grupo.espessuras.length} espessura
                          {grupo.espessuras.length === 1 ? "" : "s"}
                          {espessurasLabel ? ` · ${espessurasLabel} mm` : ""}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: 12,
                        paddingTop: 4,
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {grupo.espessuras.map((row, idx) => {
                        const m = findMaterialForSsotRow(row);
                        const cardKey =
                          row.industrialCanonicalId ||
                          `${grupo.familia}-${row.espessuraMm ?? "x"}-${row.ref || idx}`;
                        const esp = row.espessuraMm;
                        const preco =
                          row.precoPorM2Eur ??
                          row.precoVendaPorM2Eur ??
                          m?.precoPorM2 ??
                          null;
                        const precoVenda = row.precoVendaPorM2Eur;
                        const refLabel = row.industrialCanonicalId || row.ref.trim() || "—";
                        const title = esp != null ? `${esp} mm` : "Espessura —";
                        return (
                          <div
                            key={cardKey}
                            onMouseEnter={() => setHoveredCardId(cardKey)}
                            onMouseLeave={() => setHoveredCardId(null)}
                            style={{
                              position: "relative",
                              display: "flex",
                              flexDirection: "column",
                              padding: 12,
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 10,
                              gap: 10,
                              minHeight: 0,
                            }}
                          >
                            {hoveredCardId === cardKey && (
                              <div
                                style={{
                                  position: "absolute",
                                  left: 0,
                                  right: 0,
                                  top: 0,
                                  padding: "10px 12px",
                                  background: "rgba(15, 23, 42, 0.98)",
                                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: "10px 10px 0 0",
                                  fontSize: 11,
                                  color: "var(--text-main)",
                                  lineHeight: 1.5,
                                  pointerEvents: "none",
                                  zIndex: 1,
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                }}
                              >
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                  {grupo.familia}
                                  {esp != null ? ` · ${esp} mm` : ""}
                                </div>
                                <div style={{ color: "var(--text-muted)" }}>
                                  REF: {refLabel} · Preço: {preco ?? "—"} €/m²
                                  {precoVenda != null ? ` · Venda: ${precoVenda} €/m²` : ""}
                                </div>
                                {row.nomeAtual ? (
                                  <div style={{ marginTop: 4, fontSize: 10, opacity: 0.85 }}>
                                    Nome antigo: {row.nomeAtual}
                                  </div>
                                ) : null}
                              </div>
                            )}
                            <div>
                              <div
                                style={{
                                  fontSize: 15,
                                  fontWeight: 700,
                                  color: "var(--text-main)",
                                }}
                              >
                                {title}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                                REF: {refLabel}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                {preco ?? "—"} €/m²
                                {precoVenda != null && precoVenda !== preco
                                  ? ` · venda ${precoVenda} €/m²`
                                  : ""}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {m ? (
                                <>
                                  <button
                                    type="button"
                                    className="button button-ghost"
                                    style={{ fontSize: 11, padding: "5px 10px" }}
                                    onClick={() => openEdit(m.id)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="button button-ghost"
                                    style={{ fontSize: 11, padding: "5px 10px" }}
                                    onClick={() => handleDuplicate(m.id)}
                                  >
                                    Duplicar
                                  </button>
                                  <button
                                    type="button"
                                    className="button button-ghost"
                                    style={{
                                      fontSize: 11,
                                      padding: "5px 10px",
                                      color: "var(--red, #ef4444)",
                                    }}
                                    onClick={() => handleDelete(m.id, m.label)}
                                  >
                                    Eliminar
                                  </button>
                                </>
                              ) : (
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                  Só SSOT (sem CRUD)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              padding: 24,
              textAlign: "center",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "var(--radius)",
              border: "1px dashed rgba(255,255,255,0.08)",
            }}
          >
            Nenhuma família SSOT disponível. Use &quot;Sincronizar SSOT Excel&quot; ou verifique{" "}
            <code>public/config/materiais-ssot.xlsx</code>.
            {ssotLoadError ? (
              <div style={{ marginTop: 8, color: "var(--red, #ef4444)" }}>{ssotLoadError}</div>
            ) : null}
          </div>
        )}
      </Panel>

      {panelOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: 380,
            maxWidth: "100%",
            height: "100%",
            background: "color-mix(in srgb, var(--navy) 96%, black)",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "-8px 0 24px rgba(0,0,0,0.3)",
            zIndex: 100,
            padding: 20,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>
              {editingId ? "Editar material" : "Novo material"}
            </span>
            <button type="button" className="button button-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={closePanel}>
              Fechar
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={labelStyle}>Nome / Label</div>
              <input
                className="input"
                placeholder="Nome do material"
                value={form.label ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <div style={labelStyle}>Categoria</div>
              <select
                className="input"
                value={form.categoryId ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value as MaterialCategoryId }))}
                style={{ width: "100%" }}
              >
                <option value="">— Selecionar —</option>
                {CATEGORIAS_MATERIAIS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <div style={labelStyle}>Cor (ColorPicker)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  value={form.color ?? "#ffffff"}
                  onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                  style={{
                    width: 40,
                    height: 32,
                    padding: 2,
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "var(--radius)",
                    cursor: "pointer",
                    background: "transparent",
                  }}
                />
                <input
                  className="input"
                  type="text"
                  value={form.color ?? "#ffffff"}
                  onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div>
              <div style={labelStyle}>Textura (URL ou ficheiro futuro)</div>
              <input
                className="input"
                type="text"
                placeholder="URL ou caminho — upload planejado"
                value={form.textureUrl ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({ ...prev, textureUrl: value }));
                }}
                style={{ width: "100%" }}
              />
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
                URL atual: {texturePreviewUrl || "(sem textura)"}
              </div>
              {texturePreviewUrl ? (
                <MaterialTexturePreview key={texturePreviewUrl} url={texturePreviewUrl} />
              ) : null}
            </div>

            <div>
              <div style={labelStyle}>Espessura (mm)</div>
              <input
                className="input"
                type="number"
                min={1}
                placeholder="18"
                value={form.espessura ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, espessura: e.target.value ? Number(e.target.value) : undefined }))
                }
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <div style={labelStyle}>Preço por m² (€) — preço final</div>
              <input
                className="input"
                type="number"
                step="0.01"
                min={0}
                placeholder="0"
                value={form.precoPorM2 ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, precoPorM2: e.target.value ? Number(e.target.value) : undefined }))
                }
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <div style={labelStyle}>Largura da chapa (mm)</div>
              <input
                className="input"
                type="number"
                min={1}
                placeholder="2750"
                value={form.sheetWidthMm ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sheetWidthMm: e.target.value ? Number(e.target.value) : undefined }))
                }
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <div style={labelStyle}>Altura da chapa (mm)</div>
              <input
                className="input"
                type="number"
                min={1}
                placeholder="1830"
                value={form.sheetHeightMm ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sheetHeightMm: e.target.value ? Number(e.target.value) : undefined }))
                }
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <div style={labelStyle}>Espessura da chapa (mm)</div>
              <input
                className="input"
                type="number"
                min={1}
                placeholder="18"
                value={form.sheetThicknessMm ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sheetThicknessMm: e.target.value ? Number(e.target.value) : undefined }))
                }
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <div style={labelStyle}>Peso da chapa (kg) — opcional</div>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                placeholder="Ex.: 65"
                value={form.sheetWeightKg ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sheetWeightKg: e.target.value ? Number(e.target.value) : undefined }))
                }
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <div style={labelStyle}>Densidade (kg/m³) — opcional</div>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                placeholder="Ex.: 700"
                value={form.sheetDensity ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sheetDensity: e.target.value ? Number(e.target.value) : undefined }))
                }
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <div style={labelStyle}>Material industrial associado</div>
              <select
                className="input"
                value={form.industrialMaterialId ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, industrialMaterialId: e.target.value || undefined }))
                }
                style={{ width: "100%" }}
              >
                <option value="">— Nenhum —</option>
                {MATERIAIS_INDUSTRIAIS.map((ind) => (
                  <option key={ind.nome} value={ind.nome}>{ind.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <div style={labelStyle}>Preset visual associado (Material Presets Engine)</div>
              <select
                className="input"
                value={form.visualPresetId ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, visualPresetId: e.target.value || undefined }))
                }
                style={{ width: "100%" }}
              >
                <option value="">— Nenhum —</option>
                {getAllPresets().map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                {form.visualPresetId && !getPresetById(form.visualPresetId) && (
                  <option value={form.visualPresetId}>— {form.visualPresetId} (legado)</option>
                )}
              </select>
              {(() => {
                const selectedPreset = form.visualPresetId ? getPresetById(form.visualPresetId) : null;
                if (!selectedPreset) return null;
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 8,
                      padding: 10,
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: "var(--radius)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: selectedPreset.color,
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}
                    />
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      <div style={{ color: "var(--text-main)", fontWeight: 500 }}>{selectedPreset.name}</div>
                      <div>
                        Cor base · Roughness {selectedPreset.roughness ?? "—"} · Metallic {selectedPreset.metallic ?? "—"}
                      </div>
                      {(selectedPreset.textureUrl ?? selectedPreset.normalMapUrl) && (
                        <div style={{ marginTop: 2 }}>Textura / Normal map definidos</div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginTop: 4 }}>
              <input
                type="checkbox"
                checked={form.materialMadeira === true}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, materialMadeira: e.target.checked }))
                }
              />
              Material de madeira (veio) — nesting não roda peças deste material
            </label>

            <button
              type="button"
              className="button"
              style={{
                marginTop: 8,
                background: "rgba(34,197,94,0.2)",
                border: "1px solid rgba(34,197,94,0.4)",
              }}
              onClick={handleSave}
            >
              {editingId ? "Guardar alterações" : "Criar material"}
            </button>
          </div>

          {editingId && (
            <div style={{ fontSize: 10, color: "var(--text-muted)", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8 }}>
              ID: {editingId}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
