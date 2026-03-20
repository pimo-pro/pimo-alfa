import React, { useState } from 'react';

const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="navigation">
      <div className="container">
        <div className="nav-content">
          <div className="nav-brand">
            <span className="brand-logo">pimo</span>
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

          <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
            <a href="#features" onClick={() => setIsMenuOpen(false)}>Features</a>
            <a href="#demo" onClick={() => setIsMenuOpen(false)}>Demo</a>
            <a href="#testimonials" onClick={() => setIsMenuOpen(false)}>Reviews</a>
            <a href="#pricing" onClick={() => setIsMenuOpen(false)}>Pricing</a>
            <button className="nav-cta" onClick={() => setIsMenuOpen(false)}>Get Started</button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;