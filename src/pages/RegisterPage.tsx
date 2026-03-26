import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import RegisterUserForm from "../components/admin/RegisterUserForm";
import { initialInviteCodes } from "../components/admin/inviteCodesMock";
import Card from "../components/ui/Card";
import PageHeader from "../components/ui/PageHeader";
import PageContainer from "../components/ui/PageContainer";
import "../components/ui/ui.css";

export default function RegisterPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async () => {
    await Promise.resolve();
  };

  return (
    <PageContainer>
      <Card className="ui-register-card">
        <div className="ui-grid ui-grid--2">
          <Link to="/login" className="ui-auth-tab ui-button--full">
            Login
          </Link>
          <Link to="/register" className="ui-auth-tab ui-auth-tab--active ui-button--full">
            Registrar
          </Link>
        </div>

        <PageHeader title="Registrar" subtitle="Crie seu acesso e configure seu perfil inicial." />

        <RegisterUserForm
          submitLabel="Criar conta"
          onSubmit={handleSubmit}
          inviteCodes={initialInviteCodes}
        />
      </Card>
    </PageContainer>
  );
}
