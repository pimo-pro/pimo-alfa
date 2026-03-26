import { useMemo, useState } from "react";

import Button from "../ui/Button";
import Card from "../ui/Card";
import FormGroup from "../ui/FormGroup";
import Input from "../ui/Input";
import Section from "../ui/Section";
import "../ui/ui.css";
import { initialInviteCodes, normalizeCode, type InviteCode } from "./inviteCodesMock";

type Props = {
  onCodesChange?: (codes: InviteCode[]) => void;
};

export default function InviteCodeManager({ onCodesChange }: Props) {
  const [codes, setCodes] = useState<InviteCode[]>(initialInviteCodes);
  const [code, setCode] = useState("");
  const [permissions, setPermissions] = useState("");
  const [usageLimit, setUsageLimit] = useState("1");
  const [clientType, setClientType] = useState("");

  const sortedCodes = useMemo(
    () => [...codes].sort((a, b) => a.code.localeCompare(b.code)),
    [codes]
  );

  const emit = (nextCodes: InviteCode[]) => {
    setCodes(nextCodes);
    onCodesChange?.(nextCodes);
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeCode(code);
    const parsedLimit = Number(usageLimit);
    if (!normalized || Number.isNaN(parsedLimit) || parsedLimit < 1) return;

    const parsedPermissions = permissions
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const nextCode: InviteCode = {
      id: `invite-${Date.now()}`,
      code: normalized,
      permissions: parsedPermissions,
      usageLimit: parsedLimit,
      usedCount: 0,
      active: true,
      clientType: clientType.trim() || undefined,
    };

    emit([nextCode, ...codes]);
    setCode("");
    setPermissions("");
    setUsageLimit("1");
    setClientType("");
  };

  return (
    <Card>
      <Section title="Gerenciar códigos de convite">
        <form onSubmit={handleCreate} className="ui-form-group">
          <div className="ui-grid ui-grid--2">
            <Input
              label="Código"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
            <Input
              label="Limite de uso"
              type="number"
              min="1"
              value={usageLimit}
              onChange={(event) => setUsageLimit(event.target.value)}
              required
            />
          </div>
          <Input
            label="Permissões associadas (separadas por vírgula)"
            value={permissions}
            onChange={(event) => setPermissions(event.target.value)}
            placeholder="project.view.own, user.manage.all"
          />
          <Input
            label="Tipo de cliente pré-definido (opcional)"
            value={clientType}
            onChange={(event) => setClientType(event.target.value)}
            placeholder="Designer"
          />
          <FormGroup>
            <Button type="submit" variant="primary">
              Criar código
            </Button>
          </FormGroup>
        </form>

        <div className="ui-table-wrapper">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Permissões</th>
                <th>Uso</th>
              </tr>
            </thead>
            <tbody>
              {sortedCodes.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.clientType ?? "Não definido"}</td>
                  <td>
                    <div className="ui-inline-list">
                      {item.permissions.length > 0 ? (
                        item.permissions.map((permission) => (
                          <span key={permission} className="ui-badge">
                            {permission}
                          </span>
                        ))
                      ) : (
                        <span className="ui-text-muted">Sem permissões</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {item.usedCount} / {item.usageLimit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </Card>
  );
}
