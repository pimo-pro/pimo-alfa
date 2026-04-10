import { useEffect, useState, type FormEvent } from "react";

import { createUserRemote, updateUserRemote, type RemoteUserPublic } from "../../../api/usersApi";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import FormGroup from "../../ui/FormGroup";
import Input from "../../ui/Input";
import PageHeader from "../../ui/PageHeader";
import "../../ui/ui.css";
import { USER_ROLE_OPTIONS } from "./userRoles";

type Mode = "create" | "edit";

export type UserFormModalProps = {
  open: boolean;
  mode: Mode;
  /** Em modo edit, utilizador a alterar. */
  user: RemoteUserPublic | null;
  onClose: () => void;
  /** Chamado após gravação bem-sucedida (lista deve refrescar). */
  onSaved: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

function isValidEmail(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export default function UserFormModal({
  open,
  mode,
  user,
  onClose,
  onSaved,
  onError,
  onSuccess,
}: UserFormModalProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("visitor");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setPassword("");
    if (mode === "edit" && user) {
      setUsername(user.username);
      setEmail(user.email);
      setRole(user.role || "visitor");
    } else {
      setUsername("");
      setEmail("");
      setRole("visitor");
    }
  }, [open, mode, user]);

  if (!open) return null;

  const validate = (): boolean => {
    const err: Record<string, string> = {};
    const u = username.trim();
    const em = email.trim();
    if (!u) err.username = "Username obrigatório";
    if (!isValidEmail(em)) err.email = "Email inválido";
    if (mode === "create" && password.trim().length < 6) {
      err.password = "Password com pelo menos 6 caracteres (obrigatório na criação)";
    }
    if (mode === "edit" && password.trim() !== "" && password.trim().length < 6) {
      err.password = "Password com pelo menos 6 caracteres ou deixe vazio";
    }
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (mode === "create") {
        await createUserRemote({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          role: role.trim() || "visitor",
        });
        onSuccess("Utilizador criado.");
      } else if (user) {
        const payload: {
          username?: string;
          email?: string;
          password?: string;
          role?: string;
        } = {};
        if (username.trim() !== user.username) payload.username = username.trim();
        if (email.trim().toLowerCase() !== user.email.toLowerCase()) {
          payload.email = email.trim().toLowerCase();
        }
        if (password.trim() !== "") payload.password = password.trim();
        if (role.trim() !== user.role) payload.role = role.trim();
        if (Object.keys(payload).length === 0) {
          onSuccess("Nada a atualizar.");
          onClose();
          return;
        }
        await updateUserRemote(user.id, payload);
        onSuccess("Utilizador atualizado.");
      }
      onSaved();
      onClose();
    } catch (er) {
      onError(er instanceof Error ? er.message : "Erro ao guardar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="ui-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "create" ? "Criar utilizador" : "Editar utilizador"}
      onClick={onClose}
    >
      <div style={{ maxWidth: 480, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <Card>
        <PageHeader
          title={mode === "create" ? "Criar utilizador" : "Editar utilizador"}
          subtitle={mode === "edit" && user ? `ID: ${user.id}` : undefined}
        />
        <form onSubmit={(e) => void handleSubmit(e)}>
          <FormGroup>
            <Input
              label="Username"
              value={username}
              onChange={(ev) => setUsername(ev.target.value)}
              autoComplete="username"
              disabled={submitting}
              error={fieldErrors.username}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              autoComplete="email"
              disabled={submitting}
              error={fieldErrors.email}
            />
            <Input
              label={mode === "create" ? "Password" : "Password (opcional — deixe vazio para manter)"}
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              autoComplete={mode === "create" ? "new-password" : "current-password"}
              disabled={submitting}
              error={fieldErrors.password}
            />
            <label className="ui-form-group">
              <span className="ui-input__label">Role</span>
              <select
                className="ui-input"
                value={role}
                onChange={(ev) => setRole(ev.target.value)}
                disabled={submitting}
                style={{ width: "100%", padding: "10px 12px" }}
              >
                {USER_ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </FormGroup>
          <div className="ui-inline-actions" style={{ marginTop: 16 }}>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "A guardar…" : mode === "create" ? "Criar" : "Guardar"}
            </Button>
            <Button type="button" disabled={submitting} onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
        </Card>
      </div>
    </div>
  );
}
