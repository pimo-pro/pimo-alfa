import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import Button from "./ui/Button";
import Toolbar from "./ui/Toolbar";
import "./ui/ui.css";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const authenticated = isAuthenticated();
  const canViewAdmin = user?.role === "admin" || user?.role === "ultra+";

  return (
    <Toolbar
      left={
        <div className="ui-nav-links">
          <NavLink to="/dashboard" className={({ isActive }) => `ui-nav-link${isActive ? " ui-nav-link--active" : ""}`}>
            <span className="ui-nav-link__icon" aria-hidden>◻</span>
            <span>Dashboard</span>
          </NavLink>
          {authenticated ? (
            <>
              <NavLink to="/me" className={({ isActive }) => `ui-nav-link${isActive ? " ui-nav-link--active" : ""}`}>
                <span className="ui-nav-link__icon" aria-hidden>◻</span>
                <span>Me</span>
              </NavLink>
              <NavLink to="/projects" className={({ isActive }) => `ui-nav-link${isActive ? " ui-nav-link--active" : ""}`}>
                <span className="ui-nav-link__icon" aria-hidden>◻</span>
                <span>Projects</span>
              </NavLink>
            </>
          ) : null}
          {!authenticated ? (
            <NavLink to="/register" className={({ isActive }) => `ui-nav-link${isActive ? " ui-nav-link--active" : ""}`}>
              <span className="ui-nav-link__icon" aria-hidden>◻</span>
              <span>Registrar</span>
            </NavLink>
          ) : null}
          {authenticated && canViewAdmin ? (
            <NavLink to="/admin/users" className={({ isActive }) => `ui-nav-link${isActive ? " ui-nav-link--active" : ""}`}>
              <span className="ui-nav-link__icon" aria-hidden>◻</span>
              <span>Administração</span>
            </NavLink>
          ) : null}
        </div>
      }
      right={
        authenticated ? (
          <>
            <span className="ui-link">{user?.username ?? "Utilizador"}</span>
            <Button type="button" onClick={logout}>
              Logout
            </Button>
          </>
        ) : (
          <Button type="button" onClick={() => navigate("/login")}>
            Login
          </Button>
        )
      }
    />
  );
}
