import { useState } from "react";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormGroup from "../../components/ui/FormGroup";
import Input from "../../components/ui/Input";
import PageContainer from "../../components/ui/PageContainer";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import "../../components/ui/ui.css";

type PermissionItem = {
  id: string;
  key: string;
  description: string;
};

const INITIAL_PERMISSIONS: PermissionItem[] = [
  { id: "p-1", key: "project.view.own", description: "Visualizar projetos próprios" },
  { id: "p-2", key: "project.edit.own", description: "Editar projetos próprios" },
  { id: "p-3", key: "user.manage.all", description: "Gerenciar todos os usuários" },
];

export default function ManagePermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionItem[]>(INITIAL_PERMISSIONS);
  const [newKey, setNewKey] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newKey.trim()) return;
    setPermissions((current) => [
      {
        id: `p-${Date.now()}`,
        key: newKey.trim(),
        description: newDescription.trim(),
      },
      ...current,
    ]);
    setNewKey("");
    setNewDescription("");
  };

  const handleDelete = (id: string) => {
    setPermissions((current) => current.filter((item) => item.id !== id));
  };

  const startEdit = (item: PermissionItem) => {
    setEditingId(item.id);
    setEditingKey(item.key);
    setEditingDescription(item.description);
  };

  const saveEdit = () => {
    if (!editingId || !editingKey.trim()) return;
    setPermissions((current) =>
      current.map((item) =>
        item.id === editingId
          ? { ...item, key: editingKey.trim(), description: editingDescription.trim() }
          : item
      )
    );
    setEditingId(null);
    setEditingKey("");
    setEditingDescription("");
  };

  return (
    <PageContainer>
      <PageHeader title="Gestão de Permissões" subtitle="Cadastre e ajuste permissões do sistema." />

      <Card>
        <Section title="Criar permissão">
          <form onSubmit={handleCreate} className="ui-form-group">
            <div className="ui-grid ui-grid--2">
              <Input
                label="Chave da permissão"
                value={newKey}
                onChange={(event) => setNewKey(event.target.value)}
                required
              />
              <Input
                label="Descrição"
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
              />
            </div>
            <FormGroup>
              <Button type="submit" variant="primary">
                Criar permissão
              </Button>
            </FormGroup>
          </form>
        </Section>

        <Section title="Permissões existentes">
          <div className="ui-table-wrapper">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Chave</th>
                  <th>Descrição</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((item) => (
                  <tr key={item.id}>
                    <td>{item.key}</td>
                    <td>{item.description || "Sem descrição"}</td>
                    <td>
                      <div className="ui-inline-actions">
                        <Button type="button" onClick={() => startEdit(item)}>
                          Editar
                        </Button>
                        <Button type="button" onClick={() => handleDelete(item.id)}>
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </Card>

      {editingId ? (
        <div className="ui-modal-backdrop" role="dialog" aria-modal="true" aria-label="Editar permissão">
          <Card>
            <PageHeader title="Editar permissão" />
            <FormGroup>
              <Input
                label="Chave"
                value={editingKey}
                onChange={(event) => setEditingKey(event.target.value)}
              />
              <Input
                label="Descrição"
                value={editingDescription}
                onChange={(event) => setEditingDescription(event.target.value)}
              />
              <div className="ui-inline-actions">
                <Button type="button" variant="primary" onClick={saveEdit}>
                  Salvar
                </Button>
                <Button type="button" onClick={() => setEditingId(null)}>
                  Cancelar
                </Button>
              </div>
            </FormGroup>
          </Card>
        </div>
      ) : null}
    </PageContainer>
  );
}
