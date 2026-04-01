import { useState } from "react";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormGroup from "../../components/ui/FormGroup";
import Input from "../../components/ui/Input";
import PageContainer from "../../components/ui/PageContainer";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import "../../components/ui/ui.css";

type RoleItem = {
  id: string;
  name: string;
  permissions: string[];
};

const INITIAL_ROLES: RoleItem[] = [
  { id: "r-1", name: "visitor", permissions: ["project.view.public"] },
  { id: "r-2", name: "pro", permissions: ["project.view.own", "project.edit.own"] },
  { id: "r-3", name: "ultra+", permissions: ["project.view.factory", "factory.manage.own"] },
];

export default function ManageRolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>(INITIAL_ROLES);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingPermissions, setEditingPermissions] = useState("");

  const parsePermissions = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newRoleName.trim()) return;
    const next: RoleItem = {
      id: `r-${Date.now()}`,
      name: newRoleName.trim(),
      permissions: parsePermissions(newRolePermissions),
    };
    setRoles((current) => [next, ...current]);
    setNewRoleName("");
    setNewRolePermissions("");
  };

  const handleDelete = (id: string) => {
    setRoles((current) => current.filter((role) => role.id !== id));
  };

  const startEdit = (role: RoleItem) => {
    setEditingId(role.id);
    setEditingName(role.name);
    setEditingPermissions((role.permissions ?? []).join(", "));
  };

  const saveEdit = () => {
    if (!editingId || !editingName.trim()) return;
    setRoles((current) =>
      current.map((role) =>
        role.id === editingId
          ? {
              ...role,
              name: editingName.trim(),
              permissions: parsePermissions(editingPermissions),
            }
          : role
      )
    );
    setEditingId(null);
    setEditingName("");
    setEditingPermissions("");
  };

  return (
    <PageContainer>
      <PageHeader title="Gestão de Roles" subtitle="Crie, edite e atribua permissões a roles." />

      <Card>
        <Section title="Criar role">
          <form onSubmit={handleCreate} className="ui-form-group">
            <div className="ui-grid ui-grid--2">
              <Input
                label="Nome da role"
                value={newRoleName}
                onChange={(event) => setNewRoleName(event.target.value)}
                required
              />
              <Input
                label="Permissões (vírgula)"
                value={newRolePermissions}
                onChange={(event) => setNewRolePermissions(event.target.value)}
              />
            </div>
            <FormGroup>
              <Button type="submit" variant="primary">
                Criar role
              </Button>
            </FormGroup>
          </form>
        </Section>

        <Section title="Roles existentes">
          <div className="ui-table-wrapper">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Permissões</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(roles ?? []).map((role) => (
                  <tr key={role.id}>
                    <td>{role.name}</td>
                    <td>
                      <div className="ui-inline-list">
                        {(role.permissions ?? []).map((permission) => (
                          <span key={permission} className="ui-badge">
                            {permission}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="ui-inline-actions">
                        <Button type="button" onClick={() => startEdit(role)}>
                          Editar
                        </Button>
                        <Button type="button" onClick={() => startEdit(role)}>
                          Atribuir permissões
                        </Button>
                        <Button type="button" onClick={() => handleDelete(role.id)}>
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
        <div className="ui-modal-backdrop" role="dialog" aria-modal="true" aria-label="Editar role">
          <Card>
            <PageHeader title="Editar role" />
            <FormGroup>
              <Input
                label="Nome"
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
              />
              <Input
                label="Permissões (vírgula)"
                value={editingPermissions}
                onChange={(event) => setEditingPermissions(event.target.value)}
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
