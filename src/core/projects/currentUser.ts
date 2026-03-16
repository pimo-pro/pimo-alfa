const CURRENT_USER_ID_KEY = "pimo_current_user_id";
const CURRENT_USER_NAME_KEY = "pimo_current_user_name";

export type CurrentProjectUser = {
  ownerId: string;
  ownerName: string;
};

export function getCurrentProjectUser(): CurrentProjectUser {
  if (typeof localStorage === "undefined") {
    return { ownerId: "usuario-local", ownerName: "Utilizador Local" };
  }

  const ownerId = (localStorage.getItem(CURRENT_USER_ID_KEY) || "").trim() || "usuario-local";
  const ownerName = (localStorage.getItem(CURRENT_USER_NAME_KEY) || "").trim() || "Utilizador Local";
  return { ownerId, ownerName };
}

export function setCurrentProjectUser(user: CurrentProjectUser): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(CURRENT_USER_ID_KEY, user.ownerId.trim() || "usuario-local");
  localStorage.setItem(CURRENT_USER_NAME_KEY, user.ownerName.trim() || "Utilizador Local");
}
