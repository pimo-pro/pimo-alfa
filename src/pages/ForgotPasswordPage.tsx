import { useState } from "react";
import { Link } from "react-router-dom";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import FormGroup from "../components/ui/FormGroup";
import Input from "../components/ui/Input";
import PageContainer from "../components/ui/PageContainer";
import PageHeader from "../components/ui/PageHeader";
import Section from "../components/ui/Section";
import "../components/ui/ui.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <PageContainer>
      <div className="ui-auth-page">
        <Card className="ui-card--max-640">
          <div className="ui-auth-card">
            <PageHeader title="Recuperar senha" subtitle="Receba instruções para redefinir seu acesso." />

            <div className="ui-grid ui-grid--2">
              <Link to="/login" className="ui-auth-tab ui-button--full">
                Login
              </Link>
              <Link to="/register" className="ui-auth-tab ui-button--full">
                Registrar
              </Link>
            </div>

            <Section title="Recuperação por email">
              <form onSubmit={handleSubmit} className="ui-form-group ui-auth-divider">
                <FormGroup>
                  <Input
                    type="email"
                    label="Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Button type="submit" variant="primary">
                    Recuperar senha
                  </Button>
                  {submitted ? (
                    <p className="ui-text-muted">
                      Se o email existir em nossa base, você receberá instruções em instantes.
                    </p>
                  ) : null}
                  <Link to="/login" className="ui-link ui-link--primary">
                    Voltar para Login
                  </Link>
                </FormGroup>
              </form>
            </Section>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
