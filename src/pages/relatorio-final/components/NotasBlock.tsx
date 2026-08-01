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
        <h2 style={{ ...reportSectionTitle, margin: 0 }}>7. Notas do Projeto</h2>
        <Button type="button" variant="secondary" onClick={openNew}>
          Adicionar nota
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
              {n.autor} · {new Date(n.timestamp).toLocaleString("pt-PT")}
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{n.texto}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Button type="button" variant="ghost" onClick={() => openEdit(n)}>
                Editar
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onChange(value.filter((x) => x.id !== n.id))}
              >
                Remover
              </Button>
            </div>
          </div>
        ))}
        {value.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Sem notas internas.
          </p>
        ) : null}
      </div>

      <EditableModal
        open={open}
        title={editId ? "Editar nota" : "Nova nota"}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={commit}>
              Guardar
            </Button>
          </>
        }
      >
        <label style={{ display: "block", marginBottom: 10 }}>
          <span style={reportLabel}>Autor</span>
          <input
            style={reportInput}
            value={draftAutor}
            onChange={(e) => setDraftAutor(e.target.value)}
          />
        </label>
        <label style={{ display: "block" }}>
          <span style={reportLabel}>Texto</span>
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
