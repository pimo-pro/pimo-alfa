import { useMemo, useState } from "react";
import { useProject } from "../../context/useProject";
import { useMaterials } from "../../hooks/useMaterials";
import { useAuth } from "../../auth/useAuth";
import { hasFullAccess } from "../../auth/rbac";
import { canShowSectionPrices } from "../../admin/industrialSectionsConfig";
import Panel from "../ui/Panel";
import Button from "../ui/Button";
import { useIndustrialBottomPdf } from "../../hooks/useIndustrialBottomPdf";
import {
  buildFinanceiroPecasRows,
  type FinanceiroPecaRow,
} from "../../core/financeiro";
import { formatCurrency } from "../../utils/formatting";

type SortKey =
  | "caixa"
  | "tipo"
  | "material"
  | "qtd"
  | "dimensoes"
  | "pesoKg"
  | "ferragensQty"
  | "etq"
  | "precoFinalDaPeca";

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  color: "var(--text-muted)",
  whiteSpace: "nowrap",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  fontWeight: 600,
  cursor: "pointer",
  userSelect: "none",
};

const tdStyle: React.CSSProperties = {
  padding: "5px 8px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  whiteSpace: "nowrap",
};

const checkStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#16a34a",
  fontWeight: 700,
};

const CHECK = "\u2714";

function compareRows(a: FinanceiroPecaRow, b: FinanceiroPecaRow, key: SortKey): number {
  const av = a[key];
  const bv = b[key];
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av ?? "").localeCompare(String(bv ?? ""), "pt", { sensitivity: "base" });
}

export default function FinanceiroPecasPanel({ embedded }: { embedded?: boolean } = {}) {
  const { project } = useProject();
  const { materials } = useMaterials();
  const { hasPermission } = useAuth();
  const isAdmin = hasFullAccess(hasPermission);
  const showPrices =
    canShowSectionPrices("resumoFinanceiro", isAdmin) ||
    canShowSectionPrices("totaisProjeto", isAdmin);
  const { exportResumoFinanceiroPdf } = useIndustrialBottomPdf();

  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("caixa");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rows = useMemo(
    () =>
      buildFinanceiroPecasRows(
        {
          boxes: project.boxes,
          rules: project.rules,
          materialId: project.materialId,
          projectName: project.projectName,
          remates: project.remates,
          rodapes: project.rodapes,
          extractedPartsByBoxId: project.extractedPartsByBoxId,
          industrialPieceEdits: project.industrialPieceEdits,
          ferragemOrla: project.ferragemOrla,
          financeiroOverrides: project.financeiroOverrides,
          financeiroAdminSettings: project.financeiroAdminSettings,
          orlaPieces: project.orlaPieces,
          orlaPresets: project.orlaPresets,
          orlaJuntoPairs: project.orlaJuntoPairs,
        },
        materials
      ),
    [project, materials]
  );

  const visibleRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = rows.filter(
        (r) =>
          r.caixa.toLowerCase().includes(q) ||
          r.tipo.toLowerCase().includes(q) ||
          r.material.toLowerCase().includes(q) ||
          r.etq.toLowerCase().includes(q) ||
          r.dimensoes.toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => compareRows(a, b, sortKey));
    if (sortDir === "desc") sorted.reverse();
    return sorted;
  }, [rows, filter, sortKey, sortDir]);

  const boxesEmpty = (project.boxes ?? []).length === 0;
  const totalUnidades = visibleRows.reduce((s, r) => s + r.qtd, 0);
  const totalPreco = visibleRows.reduce((s, r) => s + r.precoFinalDaPeca, 0);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortMark = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " \u25b2" : " \u25bc") : "";

  const headers: Array<{ label: string; key?: SortKey }> = [
    { label: "Caixa", key: "caixa" },
    { label: "Tipo", key: "tipo" },
    { label: "Material", key: "material" },
    { label: "Qtd", key: "qtd" },
    { label: "Dimens\u00f5es (L\u00d7A\u00d7E)", key: "dimensoes" },
    { label: "Peso", key: "pesoKg" },
    { label: "Orla" },
    { label: "CNC" },
    { label: "Drill" },
    { label: "Ferragens", key: "ferragensQty" },
    { label: "N\u00ba ETQ", key: "etq" },
    ...(showPrices ? [{ label: "Pre\u00e7o (\u20ac)", key: "precoFinalDaPeca" as SortKey }] : []),
  ];

  return (
    <Panel title={embedded ? undefined : "Financeiro pe\u00e7as"}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          {boxesEmpty
            ? "Adicione caixas para visualizar pe\u00e7as."
            : `${visibleRows.length}/${rows.length} linhas \u00b7 ${totalUnidades} unidades${
                showPrices ? ` \u00b7 ${formatCurrency(totalPreco)}` : ""
              }`}
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar (caixa, tipo, material, ETQ\u2026)"
            disabled={boxesEmpty}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(0,0,0,0.2)",
              color: "var(--text)",
              minWidth: 200,
            }}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={boxesEmpty}
            onClick={() => void exportResumoFinanceiroPdf()}
          >
            Gerar PDF
          </Button>
        </div>
      </div>

      {!boxesEmpty ? (
        <div style={{ overflow: "auto", maxHeight: "min(520px, 60vh)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                {headers.map((h) => (
                  <th
                    key={h.label}
                    style={h.key ? thStyle : { ...thStyle, cursor: "default" }}
                    onClick={h.key ? () => toggleSort(h.key!) : undefined}
                    title={h.key ? "Ordenar" : undefined}
                  >
                    {h.label}
                    {h.key ? sortMark(h.key) : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.pieceId} title={
                  showPrices
                    ? `Mat ${formatCurrency(r.precoMaterial)} | Orla ${formatCurrency(r.precoOrla)} | Ferr ${formatCurrency(r.precoFerragens)} | Ops ${formatCurrency(r.precoOperacoes)} | Desp ${formatCurrency(r.precoDesperdicio)} | Serr ${formatCurrency(r.precoSerragem)} | Chap ${formatCurrency(r.precoChapasShare)} | MO ${formatCurrency(r.precoMaoDeObra)} | Log ${formatCurrency(r.precoLogistica)} | Adv ${formatCurrency(r.precoOperacoesAvancadas)} (F ${formatCurrency(r.precoForos)} | G ${formatCurrency(r.precoGrupos)} | R ${formatCurrency(r.precoRasgo)} | C ${formatCurrency(r.precoCorteManual)} | Q ${formatCurrency(r.precoQuadrilha)})`
                    : undefined
                }>
                  <td style={tdStyle}>{r.caixa}</td>
                  <td style={tdStyle}>{r.tipo}</td>
                  <td style={tdStyle}>{r.material}</td>
                  <td style={tdStyle}>{r.qtd}</td>
                  <td style={tdStyle}>{r.dimensoes}</td>
                  <td style={tdStyle}>{r.pesoKg.toFixed(2)} kg</td>
                  <td style={{ ...tdStyle, ...checkStyle }}>{r.hasOrla ? CHECK : ""}</td>
                  <td style={{ ...tdStyle, ...checkStyle }}>{r.hasCnc ? CHECK : ""}</td>
                  <td style={{ ...tdStyle, ...checkStyle }}>{r.hasDrill ? CHECK : ""}</td>
                  <td style={tdStyle}>{r.ferragensQty > 0 ? r.ferragensQty : ""}</td>
                  <td style={tdStyle}>{r.etq}</td>
                  {showPrices ? (
                    <td style={tdStyle}>{formatCurrency(r.precoFinalDaPeca)}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}
