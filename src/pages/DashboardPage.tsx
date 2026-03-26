import { Link } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import PageContainer from "../components/ui/PageContainer";
import PageHeader from "../components/ui/PageHeader";
import Section from "../components/ui/Section";
import "../components/ui/ui.css";

export default function DashboardPage() {
  const { user, permissions } = useAuth();

  return (
    <PageContainer>
      <Card className="ui-dashboard-shell">
        <PageHeader title="Dashboard" subtitle="Visão geral da sua conta e permissões." />
        <Section title="Perfil atual">
          <Card>
            <div className="ui-kv-list">
              <p className="ui-kv-item">
                <strong>Utilizador:</strong> {user?.username ?? "—"}
              </p>
              <p className="ui-kv-item">
                <strong>Role:</strong> {user?.role ?? "—"}
              </p>
            </div>
          </Card>
        </Section>
        <Section title="Permissões efetivas">
          <Card>
            {permissions.length > 0 ? (
              <div className="ui-inline-list">
                {permissions.map((permission) => (
                  <span key={permission} className="ui-badge">
                    {permission}
                  </span>
                ))}
              </div>
            ) : (
              <p className="ui-text-muted">Nenhuma permissão listada.</p>
            )}
          </Card>
        </Section>
        <div className="ui-inline-actions">
          <Link to="/projects">
            <Button variant="primary">Abrir Projects</Button>
          </Link>
        </div>
      </Card>
    </PageContainer>
  );
}
