import { useState } from "react";
import Button from "@/components/ui/Button";
import {
  makeReportId,
  type ProjectReportDesign,
  type ProjectReportMontagem,
  type ProjectReportProducao,
  type ReportOperador,
  type ReportPeca,
  type ReportStyle,
} from "@/core/projectReport";
import {
  reportClickable,
  reportGrid3,
  reportInput,
  reportLabel,
  reportSection,
  reportSectionTitle,
  reportTable,
  reportTableWrap,
  reportTd,
  reportTextarea,
  reportTh,
} from "../reportStyles";
import EditableModal from "./EditableModal";

type Props = {
  style: ReportStyle;
  design: ProjectReportDesign;
  producao: ProjectReportProducao;
  montagem: ProjectReportMontagem;
  onDesign: (next: ProjectReportDesign) => void;
  onProducao: (next: ProjectReportProducao, path?: string) => void;
  onMontagem: (next: ProjectReportMontagem, path?: string) => void;
};

type ModalKind = "operadores" | "caixas" | "pecas" | "instaladores" | null;

function OperadoresEditor({
  list,
  onChange,
}: {
  list: ReportOperador[];
  onChange: (next: ReportOperador[]) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {list.map((op, idx) => (
        <div
          key={op.id}
          style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr auto", gap: 8 }}
        >
          <input
            style={reportInput}
            placeholder="Nome"
            value={op.nome}
            onChange={(e) => {
              const next = [...list];
              next[idx] = { ...op, nome: e.target.value };
              onChange(next);
            }}
          />
          <input
            type="number"
            min={0}
            step={0.5}
            style={reportInput}
            placeholder="Horas"
            value={op.horas}
            onChange={(e) => {
              const next = [...list];
              next[idx] = { ...op, horas: Math.max(0, Number(e.target.value) || 0) };
              onChange(next);
            }}
          />
          <input
            style={reportInput}
            placeholder="Tarefas"
            value={op.tarefas}
            onChange={(e) => {
              const next = [...list];
              next[idx] = { ...op, tarefas: e.target.value };
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange(list.filter((_, i) => i !== idx))}
          >
            Remover
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          onChange([
            ...list,
            { id: makeReportId("op"), nome: "", horas: 0, tarefas: "" },
          ])
        }
      >
        Adicionar pessoa
      </Button>
    </div>
  );
}

export default function EstadoProjetoBlock({
  style,
  design,
  producao,
  montagem,
  onDesign,
  onProducao,
  onMontagem,
}: Props) {
  const [modal, setModal] = useState<ModalKind>(null);

  return (
    <section style={reportSection(style)}>
      <h2 style={reportSectionTitle}>3. Estado do projeto (Design / Producao / Montagem)</h2>

      <div style={{ display: "grid", gap: 16 }}>
        <div style={reportSection(style === "cards" ? "classic" : "classic")}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>3.1 Design</h3>
          <div style={reportGrid3}>
            <label>
              <span style={reportLabel}>Inicio design</span>
              <input
                type="date"
                style={reportInput}
                value={design.dataInicio}
                onChange={(e) => onDesign({ ...design, dataInicio: e.target.value })}
              />
            </label>
            <label>
              <span style={reportLabel}>Conclusao design</span>
              <input
                type="date"
                style={reportInput}
                value={design.dataConclusao}
                onChange={(e) => onDesign({ ...design, dataConclusao: e.target.value })}
              />
            </label>
            <label>
              <span style={reportLabel}>Revisoes antes producao</span>
              <input
                type="number"
                min={0}
                style={reportInput}
                value={design.revisoesAntesProducao}
                onChange={(e) =>
                  onDesign({
                    ...design,
                    revisoesAntesProducao: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            </label>
            <label>
              <span style={reportLabel}>Revisoes apos producao</span>
              <input
                type="number"
                min={0}
                style={reportInput}
                value={design.revisoesAposProducao}
                onChange={(e) =>
                  onDesign({
                    ...design,
                    revisoesAposProducao: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            </label>
          </div>
          <div style={{ ...reportGrid3, marginTop: 10 }}>
            {(
              [
                ["errosDesign", "Erros de design"],
                ["solucoesAplicadas", "Solucoes aplicadas"],
                ["melhoriasPropostas", "Melhorias propostas"],
                ["melhoriasImplementadas", "Melhorias implementadas"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} style={{ gridColumn: "1 / -1" }}>
                <span style={reportLabel}>{label}</span>
                <textarea
                  style={reportTextarea}
                  value={design[key]}
                  onChange={(e) => onDesign({ ...design, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
        </div>

        <div style={reportSection("classic")}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>3.2 Producao</h3>
          <div style={reportGrid3}>
            <div>
              <span style={reportLabel}>Operadores / funcionarios</span>
              <button type="button" style={reportClickable} onClick={() => setModal("operadores")}>
                {producao.operadores.length}
              </button>
            </div>
            <div>
              <span style={reportLabel}>Total de caixas</span>
              <button type="button" style={reportClickable} onClick={() => setModal("caixas")}>
                {producao.caixas.length}
              </button>
            </div>
            <div>
              <span style={reportLabel}>Total de pecas</span>
              <button type="button" style={reportClickable} onClick={() => setModal("pecas")}>
                {producao.pecas.length}
              </button>
            </div>
            <label>
              <span style={reportLabel}>Inicio producao</span>
              <input
                type="date"
                style={reportInput}
                value={producao.dataInicio}
                onChange={(e) => onProducao({ ...producao, dataInicio: e.target.value })}
              />
            </label>
            <label>
              <span style={reportLabel}>Fim producao</span>
              <input
                type="date"
                style={reportInput}
                value={producao.dataFim}
                onChange={(e) => onProducao({ ...producao, dataFim: e.target.value })}
              />
            </label>
            <label>
              <span style={reportLabel}>Horas efetivas</span>
              <input
                type="number"
                min={0}
                step={0.5}
                style={reportInput}
                value={producao.horasEfetivas}
                onChange={(e) =>
                  onProducao({
                    ...producao,
                    horasEfetivas: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            </label>
            <label>
              <span style={reportLabel}>Re-producoes</span>
              <input
                type="number"
                min={0}
                style={reportInput}
                value={producao.reProducoes}
                onChange={(e) =>
                  onProducao({
                    ...producao,
                    reProducoes: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            </label>
          </div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {(
              [
                ["erros", "Erros na producao"],
                ["solucoesAplicadas", "Solucoes aplicadas"],
                ["melhoriasImplementadas", "Melhorias implementadas"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <span style={reportLabel}>{label}</span>
                <textarea
                  style={reportTextarea}
                  value={producao[key]}
                  onChange={(e) => onProducao({ ...producao, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
        </div>

        <div style={reportSection("classic")}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>3.3 Montagem / Instalacao</h3>
          <div style={reportGrid3}>
            <label>
              <span style={reportLabel}>Data de envio</span>
              <input
                type="date"
                style={reportInput}
                value={montagem.dataEnvio}
                onChange={(e) => onMontagem({ ...montagem, dataEnvio: e.target.value })}
              />
            </label>
            <div>
              <span style={reportLabel}>Marceneiros / instaladores</span>
              <button type="button" style={reportClickable} onClick={() => setModal("instaladores")}>
                {montagem.instaladores.length}
              </button>
            </div>
            <label>
              <span style={reportLabel}>Inicio montagem</span>
              <input
                type="date"
                style={reportInput}
                value={montagem.dataInicio}
                onChange={(e) => onMontagem({ ...montagem, dataInicio: e.target.value })}
              />
            </label>
            <label>
              <span style={reportLabel}>Fim montagem</span>
              <input
                type="date"
                style={reportInput}
                value={montagem.dataFim}
                onChange={(e) => onMontagem({ ...montagem, dataFim: e.target.value })}
              />
            </label>
            <label>
              <span style={reportLabel}>Intervencoes pos-montagem</span>
              <input
                type="number"
                min={0}
                style={reportInput}
                value={montagem.intervencoesPos}
                onChange={(e) =>
                  onMontagem({
                    ...montagem,
                    intervencoesPos: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            </label>
          </div>
        </div>
      </div>

      <EditableModal
        open={modal === "operadores"}
        title="Operadores / funcionarios"
        onClose={() => setModal(null)}
      >
        <OperadoresEditor
          list={producao.operadores}
          onChange={(operadores) => onProducao({ ...producao, operadores }, "producao.operadores")}
        />
      </EditableModal>

      <EditableModal open={modal === "caixas"} title="Lista de caixas" onClose={() => setModal(null)}>
        <div style={reportTableWrap}>
          <table style={reportTable}>
            <thead>
              <tr>
                <th style={reportTh}>Nome</th>
                <th style={reportTh}>Dimensoes</th>
                <th style={reportTh}>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {producao.caixas.map((c) => (
                <tr key={c.id}>
                  <td style={reportTd}>{c.nome}</td>
                  <td style={reportTd}>{c.dimensoes}</td>
                  <td style={reportTd}>{c.tipo}</td>
                </tr>
              ))}
              {producao.caixas.length === 0 ? (
                <tr>
                  <td style={reportTd} colSpan={3}>
                    Sem caixas no projeto.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </EditableModal>

      <EditableModal
        open={modal === "pecas"}
        title="Lista de pecas (formato tecnico)"
        onClose={() => setModal(null)}
      >
        <div style={reportTableWrap}>
          <table style={reportTable}>
            <thead>
              <tr>
                {[
                  "REF",
                  "PECA",
                  "MATERIAL",
                  "QTD",
                  "COMP",
                  "LARG",
                  "ESP",
                  "Erro",
                  "Notas",
                  "Correcao",
                ].map((h) => (
                  <th key={h} style={reportTh}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {producao.pecas.map((p, idx) => (
                <tr key={p.id}>
                  <td style={reportTd}>{p.ref}</td>
                  <td style={reportTd}>{p.peca}</td>
                  <td style={reportTd}>{p.material}</td>
                  <td style={reportTd}>{p.qtd}</td>
                  <td style={reportTd}>{p.comp}</td>
                  <td style={reportTd}>{p.larg}</td>
                  <td style={reportTd}>{p.esp}</td>
                  <td style={reportTd}>
                    <input
                      type="checkbox"
                      checked={p.temErro}
                      onChange={(e) => {
                        const pecas = [...producao.pecas];
                        pecas[idx] = { ...p, temErro: e.target.checked };
                        onProducao({ ...producao, pecas }, "producao.pecas");
                      }}
                    />
                  </td>
                  <td style={reportTd}>
                    <input
                      style={{ ...reportInput, minHeight: 32 }}
                      value={p.notasErro}
                      onChange={(e) => {
                        const pecas: ReportPeca[] = [...producao.pecas];
                        pecas[idx] = { ...p, notasErro: e.target.value };
                        onProducao({ ...producao, pecas }, "producao.pecas");
                      }}
                    />
                  </td>
                  <td style={reportTd}>
                    <input
                      style={{ ...reportInput, minHeight: 32 }}
                      value={p.propostaCorrecao}
                      onChange={(e) => {
                        const pecas: ReportPeca[] = [...producao.pecas];
                        pecas[idx] = { ...p, propostaCorrecao: e.target.value };
                        onProducao({ ...producao, pecas }, "producao.pecas");
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EditableModal>

      <EditableModal
        open={modal === "instaladores"}
        title="Marceneiros / instaladores"
        onClose={() => setModal(null)}
      >
        <OperadoresEditor
          list={montagem.instaladores}
          onChange={(instaladores) =>
            onMontagem({ ...montagem, instaladores }, "montagem.instaladores")
          }
        />
      </EditableModal>
    </section>
  );
}
