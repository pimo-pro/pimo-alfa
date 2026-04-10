import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getUsersRemote, type RemoteUserPublic } from "../../api/usersApi";
import UserDeleteConfirm from "../../components/admin/users/UserDeleteConfirm";
import UserFormModal from "../../components/admin/users/UserFormModal";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import PageContainer from "../../components/ui/PageContainer";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import { useToast } from "../../context/ToastContext";
import "../../components/ui/ui.css";

function shortId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export default function UsersAdminPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<RemoteUserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<RemoteUserPublic | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<RemoteUserPublic | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getUsersRemote();
      setUsers(list);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao carregar utilizadores", "error");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, filter]);

  const openCreate = () => {
    setFormMode("create");
    setEditingUser(null);
    setFormOpen(true);
  };

  const openEdit = (u: RemoteUserPublic) => {
    setFormMode("edit");
    setEditingUser(u);
    setFormOpen(true);
  };

  const openDelete = (u: RemoteUserPublic) => {
    setDeletingUser(u);
    setDeleteOpen(true);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Gestão de utilizadores"
        subtitle="Listagem e CRUD via GET/POST/PUT/DELETE /users (JWT + admin.full_access no servidor)."
      />

      <Card>
        <Section title="Filtro">
          <Input
            label="Pesquisar (username, email, id, role)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            disabled={loading}
          />
        </Section>

        <Section title="Ações">
          <Button type="button" variant="primary" disabled={loading} onClick={openCreate}>
            Criar utilizador
          </Button>
        </Section>

        <Section title="Utilizadores">
          {loading ? (
            <p style={{ margin: 0, color: "var(--text-muted, #71717a)" }}>A carregar…</p>
          ) : filtered.length === 0 ? (
            <p style={{ margin: 0 }}>Nenhum utilizador encontrado.</p>
          ) : (
            <div className="ui-table-wrapper">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Criado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id}>
                      <td title={u.id}>
                        <code style={{ fontSize: 12 }}>{shortId(u.id)}</code>
                      </td>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <code>{u.role}</code>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--text-muted, #71717a)" }}>{u.createdAt || "—"}</td>
                      <td>
                        <div className="ui-inline-actions">
                          <Button type="button" variant="outline" onClick={() => openEdit(u)}>
                            Editar
                          </Button>
                          <Button type="button" variant="danger" onClick={() => openDelete(u)}>
                            Remover
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <p style={{ marginBottom: 0, marginTop: 20 }}>
          <Link to="/me" style={{ fontWeight: 600 }}>
            Voltar ao Me
          </Link>
        </p>
      </Card>

      <UserFormModal
        open={formOpen}
        mode={formMode}
        user={editingUser}
        onClose={() => {
          setFormOpen(false);
          setEditingUser(null);
        }}
        onSaved={() => void loadUsers()}
        onError={(msg) => showToast(msg, "error")}
        onSuccess={(msg) => showToast(msg, "info")}
      />

      <UserDeleteConfirm
        open={deleteOpen}
        user={deletingUser}
        onClose={() => {
          setDeleteOpen(false);
          setDeletingUser(null);
        }}
        onDeleted={() => void loadUsers()}
        onError={(msg) => showToast(msg, "error")}
        onSuccess={(msg) => showToast(msg, "info")}
      />
    </PageContainer>
  );
}
