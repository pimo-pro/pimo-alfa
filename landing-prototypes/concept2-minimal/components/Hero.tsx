import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Design with <span className="highlight">precision</span>
            </h1>
            <p className="hero-subtitle">
              Simple, powerful furniture design tools that let you focus on creativity 
              while we handle the technical details.
            </p>
            <div className="hero-actions">
              <button className="btn-primary">Start Designing</button>
              <button className="btn-secondary">View Demo</button>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="minimal-demo">
              <div className="demo-shape shape-1"></div>
              <div className="demo-shape shape-2"></div>
              <div className="demo-shape shape-3"></div>
              <div className="demo-shape shape-4"></div>
              <div className="demo-shape shape-5"></div>
              <div className="demo-shape shape-6"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;