import { useMemo, useState } from "react";

import InviteCodeManager from "../../components/admin/InviteCodeManager";
import RegisterUserForm, { type RegisterFormValues } from "../../components/admin/RegisterUserForm";
import { initialInviteCodes } from "../../components/admin/inviteCodesMock";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormGroup from "../../components/ui/FormGroup";
import Input from "../../components/ui/Input";
import PageContainer from "../../components/ui/PageContainer";
import PageHeader from "../../components/ui/PageHeader";
import Section from "../../components/ui/Section";
import "../../components/ui/ui.css";

type ManagedUser = {
  id: string;
  nome: string;
  email: string;
  pais: string;
  tipoCliente: string;
  ativo: boolean;
};

const INITIAL_USERS: ManagedUser[] = [
  { id: "u-1", nome: "Ana Silva", email: "ana@pimo.local", pais: "Portugal", tipoCliente: "Designer", ativo: true },
  { id: "u-2", nome: "João Costa", email: "joao@pimo.local", pais: "Brasil", tipoCliente: "Carpinteiro", ativo: true },
  { id: "u-3", nome: "Marta Lopes", email: "marta@pimo.local", pais: "Espanha", tipoCliente: "Fábrica", ativo: false },
];

export default function ManageUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>(INITIAL_USERS);
  const [filters, setFilters] = useState({
    nome: "",
    email: "",
    pais: "",
    tipoCliente: "",
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredUsers = useMemo(() => {
    const text = (value: string) => value.trim().toLowerCase();
    const nome = text(filters.nome);
    const email = text(filters.email);
    const pais = text(filters.pais);
    const tipoCliente = text(filters.tipoCliente);

    return users.filter((user) => {
      const matchNome = !nome || user.nome.toLowerCase().includes(nome);
      const matchEmail = !email || user.email.toLowerCase().includes(email);
      const matchPais = !pais || user.pais.toLowerCase().includes(pais);
      const matchTipo = !tipoCliente || user.tipoCliente.toLowerCase().includes(tipoCliente);
      return matchNome && matchEmail && matchPais && matchTipo;
    });
  }, [users, filters]);

  const handleToggleActive = (id: string) => {
    setUsers((current) =>
      current.map((item) => (item.id === id ? { ...item, ativo: !item.ativo } : item))
    );
  };

  const handleDelete = (id: string) => {
    setUsers((current) => current.filter((item) => item.id !== id));
  };

  const handleCreateUser = async (values: RegisterFormValues) => {
    setUsers((current) => [
      {
        id: `u-${Date.now()}`,
        nome: `${values.nome} ${values.sobrenome}`.trim(),
        email: values.email,
        pais: values.pais,
        tipoCliente: values.tipoCliente,
        ativo: true,
      },
      ...current,
    ]);
    setShowCreateModal(false);
    await Promise.resolve();
  };

  return (
    <PageContainer>
      <PageHeader title="Gestão de Usuários" subtitle="Administre usuários, status e permissões." />

      <Card>
        <Section title="Filtros">
          <div className="ui-grid ui-grid--4">
            <Input
              label="Nome"
              value={filters.nome}
              onChange={(event) => setFilters((current) => ({ ...current, nome: event.target.value }))}
            />
            <Input
              label="Email"
              value={filters.email}
              onChange={(event) => setFilters((current) => ({ ...current, email: event.target.value }))}
            />
            <Input
              label="País"
              value={filters.pais}
              onChange={(event) => setFilters((current) => ({ ...current, pais: event.target.value }))}
            />
            <Input
              label="Tipo de Cliente"
              value={filters.tipoCliente}
              onChange={(event) =>
                setFilters((current) => ({ ...current, tipoCliente: event.target.value }))
              }
            />
          </div>
        </Section>

        <Section title="Ações administrativas">
          <FormGroup>
            <Button type="button" variant="primary" onClick={() => setShowCreateModal(true)}>
              Criar usuário manualmente
            </Button>
          </FormGroup>
        </Section>

        <Section title="Usuários">
          <div className="ui-table-wrapper">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>País</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.nome}</td>
                    <td>{user.email}</td>
                    <td>{user.pais}</td>
                    <td>{user.tipoCliente}</td>
                    <td>{user.ativo ? "Ativo" : "Inativo"}</td>
                    <td>
                      <div className="ui-inline-actions">
                        <Button type="button">Ver detalhes</Button>
                        <Button type="button">Editar</Button>
                        <Button type="button">Alterar permissões</Button>
                        <Button type="button" onClick={() => handleToggleActive(user.id)}>
                          {user.ativo ? "Desativar" : "Ativar"}
                        </Button>
                        <Button type="button" onClick={() => handleDelete(user.id)}>
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

      <InviteCodeManager />

      {showCreateModal ? (
        <div className="ui-modal-backdrop" role="dialog" aria-modal="true" aria-label="Criar usuário">
          <Card>
            <PageHeader
              title="Criar usuário manualmente"
              subtitle="Versão administrativa do formulário de registro."
            />
            <RegisterUserForm
              submitLabel="Criar usuário"
              onSubmit={handleCreateUser}
              inviteCodes={initialInviteCodes}
              compact
            />
            <FormGroup>
              <Button type="button" onClick={() => setShowCreateModal(false)}>
                Fechar
              </Button>
            </FormGroup>
          </Card>
        </div>
      ) : null}
    </PageContainer>
  );
}
