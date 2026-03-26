export type InviteCode = {
  id: string;
  code: string;
  clientType?: string;
  permissions: string[];
  usageLimit: number;
  usedCount: number;
  active: boolean;
};

export const initialInviteCodes: InviteCode[] = [
  {
    id: "invite-1",
    code: "PIMO-DESIGNER-2026",
    clientType: "Designer",
    permissions: ["project.view.own", "project.edit.own"],
    usageLimit: 25,
    usedCount: 4,
    active: true,
  },
  {
    id: "invite-2",
    code: "PIMO-FACTORY-2026",
    clientType: "Fábrica",
    permissions: ["project.view.factory", "factory.manage.own"],
    usageLimit: 10,
    usedCount: 2,
    active: true,
  },
  {
    id: "invite-3",
    code: "PIMO-VISITOR-OPEN",
    clientType: "Visitante",
    permissions: ["project.view.public"],
    usageLimit: 100,
    usedCount: 29,
    active: true,
  },
];

export function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function resolveInviteCode(
  code: string,
  inviteCodes: InviteCode[]
): { valid: boolean; inviteCode?: InviteCode; message?: string } {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return { valid: false, message: "Código de convite vazio" };
  }

  const found = inviteCodes.find((item) => normalizeCode(item.code) === normalized);
  if (!found) {
    return { valid: false, message: "Código de convite inválido" };
  }

  if (!found.active) {
    return { valid: false, message: "Código de convite inativo" };
  }

  if (found.usedCount >= found.usageLimit) {
    return { valid: false, message: "Código de convite sem usos disponíveis" };
  }

  return { valid: true, inviteCode: found };
}
