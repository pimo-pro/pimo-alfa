import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">
            Design. Create. <span className="highlight">Build.</span>
          </h1>
          <p className="hero-subtitle">
            AI-powered furniture design platform that transforms your ideas into 
            precise, manufacturable creations with intelligent tools and seamless workflows.
          </p>
          <div className="hero-ctas">
            <button className="btn-primary">Try Demo</button>
            <button className="btn-secondary">Explore Features</button>
            <button className="btn-ghost">Contact Sales</button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="design-preview">
            <div className="preview-grid">
              <div className="grid-line"></div>
              <div className="grid-line"></div>
              <div className="grid-line"></div>
              <div className="grid-line"></div>
            </div>
            <div className="cabinet-demo">
              <div className="cabinet-body">
                <div className="cabinet-panel"></div>
                <div className="cabinet-panel"></div>
                <div className="cabinet-panel"></div>
              </div>
              <div className="cabinet-doors">
                <div className="door left-door"></div>
                <div className="door right-door"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;