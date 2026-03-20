import React from 'react';

const CTA: React.FC = () => {
  return (
    <section id="pricing" className="cta">
      <div className="container">
        <div className="cta-content">
          <div className="cta-text">
            <h2 className="cta-title">Ready to Unleash Your Creativity?</h2>
            <p className="cta-subtitle">
              Join thousands of creative minds who've transformed their design process.
            </p>
          </div>
          <div className="cta-actions">
            <button className="btn-primary btn-large">Start Free Trial</button>
            <button className="btn-secondary btn-large">View Plans</button>
          </div>
        </div>
        
        <div className="cta-benefits">
          <div className="benefit-item">
            <span className="benefit-icon">🎨</span>
            <div className="benefit-content">
              <h4>Unlimited Creativity</h4>
              <p>Design without limits</p>
            </div>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">⚡</span>
            <div className="benefit-content">
              <h4>Lightning Fast</h4>
              <p>Instant results</p>
            </div>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">🤝</span>
            <div className="benefit-content">
              <h4>Community</h4>
              <p>Share & inspire</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;