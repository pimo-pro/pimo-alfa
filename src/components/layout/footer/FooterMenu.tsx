import { useState } from "react";
import "./footerMenu.css";

export default function FooterMenu() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  type FooterMenuLink = { label: string; href: string; divider?: false } | { divider: true; label: string; href?: string };
  const isFooterNavLink = (link: FooterMenuLink): link is { label: string; href: string; divider?: false } =>
    typeof link.href === "string";

  const menuLinks: FooterMenuLink[] = [
    { label: "Ajuda", href: "#" },
    { label: "Contacto", href: "#" },
    { label: "Documentação", href: "/documentacao" },
    { label: "Documentação do Sistema", href: "/documentacao" },
    { label: "Admin", href: "/admin" },
    { label: "Sobre Nós", href: "/sobre-nos" },
  ];

  const handleLinkClick = (href: string) => {
    if (href !== "#") {
      window.history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    setIsDropdownOpen(false);
  };

  return (
    <footer className="footer-menu">
      <div className="footer-menu-wrapper">
        {/* Copyright Left */}
        <span className="footer-menu-copyright">© 2026 PIMO Studio — Crafted by Khaled</span>

        {/* Dropdown Menu Right */}
        <div className="footer-menu-dropdown-container">
          <button
            className="footer-menu-toggle"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-label="Menu"
            aria-expanded={isDropdownOpen}
          >
            <span>Menu</span>
            <svg
              className={`footer-menu-toggle-icon ${isDropdownOpen ? "open" : ""}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="footer-menu-dropdown">
              <nav className="footer-menu-list">
                {menuLinks.map((link, idx: number) => {
                  if (!isFooterNavLink(link)) {
                    return (
                      <div key={idx} className="footer-menu-divider-label">
                        {link.label}
                      </div>
                    );
                  }
                  return (
                    <a
                      key={idx}
                      href={link.href}
                      className="footer-menu-link"
                      onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick(link.href);
                      }}
                    >
                      {link.label}
                    </a>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
