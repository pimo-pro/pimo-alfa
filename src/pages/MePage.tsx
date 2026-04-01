import { useEffect, useState } from "react";

import { getMe, type MeResponse } from "../api/authApi";
import Card from "../components/ui/Card";
import Loader from "../components/ui/Loader";
import PageContainer from "../components/ui/PageContainer";
import PageHeader from "../components/ui/PageHeader";
import Section from "../components/ui/Section";
import "../components/ui/ui.css";

export default function MePage() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then((result) => setData(result))
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar /me"));
  }, []);

  if (error) {
    return (
      <PageContainer>
        <Card maxWidth={640}>
          <p className="ui-text-danger">{error}</p>
        </Card>
      </PageContainer>
    );
  }
  if (!data) {
    return (
      <PageContainer>
        <Card maxWidth={640}>
          <Loader label="Carregando /me..." />
        </Card>
      </PageContainer>
    );
  }

  // @PIMO-KEEP — guard: permissions pode ser undefined vindo da API
  const permissions = data.user.permissions ?? [];

  return (
    <PageContainer>
      <Card maxWidth={640}>
        <PageHeader title="Me" />
        <Section title="Dados do utilizador">
          <p>ID: {data.user.id}</p>
          <p>Username: {data.user.username}</p>
          <p>Role: {data.user.role}</p>
        </Section>
        <Section title="Permissions">
          <ul>
            {permissions.map((permission) => (
              <li key={permission}>{permission}</li>
            ))}
          </ul>
        </Section>
      </Card>
    </PageContainer>
  );
}
