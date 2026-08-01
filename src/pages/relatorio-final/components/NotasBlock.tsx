import { useState } from "react";
import Button from "@/components/ui/Button";
import {
  makeReportId,
  resolveHistoryUser,
  type ReportNota,
  type ReportStyle,
} from "@/core/projectReport";
import {
  reportInput,
  reportLabel,
  reportSection,
  reportSectionTitle,
  reportTextarea,
} from "../reportStyles";
import { R } from "../uiLabels";
import EditableModal from "./EditableModal";

type Props = {
  style: ReportStyle;
  value: ReportNota[];
  onChange: (next: ReportNota[]) => void;
};

export default function NotasBlock({ style, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draftAutor, setDraftAutor] = useState(() => resolveHistoryUser());
  const [draftTexto, setDraftTexto] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const openNew = () => {
    setEditId(null);
    setDraftAutor(resolveHistoryUser());
    setDraftTexto("");
    setOpen(true);
  };

  const openEdit = (nota: ReportNota) => {
    setEditId(nota.id);
    setDraftAutor(nota.autor);
    setDraftTexto(nota.texto);
    setOpen(true);
  };

  const commit = () => {
    const texto = draftTexto.trim();
    if (!texto) return;
    if (editId) {
      onChange(
        value.map((n) =>
          n.id === editId
            ? { ...n, autor: draftAutor.trim() || "utilizador", texto }
            : n
        )
      );
    } else {
      onChange([
        {
          id: makeReportId("nota"),
          autor: draftAutor.trim() || "utilizador",
          texto,
          timestamp: new Date().toISOString(),
        },
        ...value,
      ]);
    }
    setOpen(false);
  };

  return (
    <section style={reportSection(style)}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <h2 style={{ ...reportSectionTitle, margin: 0 }}>{R.notasProjeto}</h2>
        <Button type="button" variant="secondary" onClick={openNew}>
          {R.adicionarNota}
        </Button>
      </div>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {value.map((n) => (
          <div
            key={n.id}
            style={{
              border: "1px solid var(--border, rgba(127,127,127,0.25))",
              borderRadius: 8,
              padding: 10,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              {n.autor}
              {" \u00b7 "}
              {new Date(n.timestamp).toLocaleString("pt-PT")}
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{n.texto}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Button type="button" variant="ghost" onClick={() => openEdit(n)}>
                {R.editar}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onChange(value.filter((x) => x.id !== n.id))}
              >
                {R.remover}
              </Button>
            </div>
          </div>
        ))}
        {value.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{R.semNotas}</p>
        ) : null}
      </div>

      <EditableModal
        open={open}
        title={editId ? R.editarNota : R.novaNota}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {R.cancelar}
            </Button>
            <Button type="button" variant="primary" onClick={commit}>
              {R.guardarNota}
            </Button>
          </>
        }
      >
        <label style={{ display: "block", marginBottom: 10 }}>
          <span style={reportLabel}>{R.autor}</span>
          <input
            style={reportInput}
            value={draftAutor}
            onChange={(e) => setDraftAutor(e.target.value)}
          />
        </label>
        <label style={{ display: "block" }}>
          <span style={reportLabel}>{R.texto}</span>
          <textarea
            style={reportTextarea}
            value={draftTexto}
            onChange={(e) => setDraftTexto(e.target.value)}
          />
        </label>
      </EditableModal>
    </section>
  );
}
