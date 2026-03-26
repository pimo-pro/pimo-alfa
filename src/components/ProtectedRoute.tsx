import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import PageContainer from "./ui/PageContainer";
import Card from "./ui/Card";
import Loader from "./ui/Loader";

type Props = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <PageContainer centered>
        <Card maxWidth={420}>
          <Loader label="Carregando sessão..." />
        </Card>
      </PageContainer>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
