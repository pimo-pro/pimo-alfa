import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormGroup from "../components/ui/FormGroup";
import Input from "../components/ui/Input";
import PageContainer from "../components/ui/PageContainer";
import Section from "../components/ui/Section";
import "../components/ui/ui.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("admin@pimo.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <div className="ui-auth-page">
        <Card className="ui-card--max-640">
          <div className="ui-auth-card">
            <div className="ui-grid ui-grid--2">
              <Link to="/login" className="ui-auth-tab ui-auth-tab--active ui-button--full">
                Login
              </Link>
              <Link to="/register" className="ui-auth-tab ui-button--full">
                Registrar
              </Link>
            </div>

            <Section title="Acesso por email e senha">
              <form onSubmit={handleSubmit} className="ui-form-group">
                <FormGroup>
                  <Input
                    type="email"
                    label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Input
                    type="password"
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </FormGroup>
                <div className="ui-form-group ui-auth-divider">
                  {error ? <p className="ui-text-danger">{error}</p> : null}
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? "Entrando..." : "Entrar"}
                  </Button>
                  <FormGroup className="ui-auth-divider">
                    <Link to="/forgot-password" className="ui-link ui-link--primary">
                      Esqueci minha senha
                    </Link>
                  </FormGroup>
                </div>
              </form>
            </Section>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
