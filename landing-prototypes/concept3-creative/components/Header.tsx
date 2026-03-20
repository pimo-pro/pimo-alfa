import React, { useState } from 'react';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="brand">
            <span className="brand-logo">pimo</span>
            <span className="brand-sub">creative</span>
          </div>
          
          <button 
            className="menu-toggle" 
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <nav className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
            <a href="#features" onClick={() => setIsMenuOpen(false)}>Features</a>
            <a href="#demo" onClick={() => setIsMenuOpen(false)}>Demo</a>
            <a href="#gallery" onClick={() => setIsMenuOpen(false)}>Gallery</a>
            <a href="#pricing" onClick={() => setIsMenuOpen(false)}>Pricing</a>
            <button className="nav-cta" onClick={() => setIsMenuOpen(false)}>Get Started</button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;