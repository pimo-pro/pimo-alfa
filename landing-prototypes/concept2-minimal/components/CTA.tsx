import React from 'react';

const CTA: React.FC = () => {
  return (
    <section id="pricing" className="cta">
      <div className="container">
        <div className="cta-content">
          <div className="cta-text">
            <h2 className="cta-title">Ready to Start Designing?</h2>
            <p className="cta-subtitle">
              Join the future of furniture design. Simple pricing, powerful results.
            </p>
          </div>
          <div className="cta-actions">
            <button className="btn-primary btn-large">Start Free Trial</button>
            <button className="btn-secondary btn-large">View Plans</button>
          </div>
        </div>
        
        <div className="cta-stats">
          <div className="stat-item">
            <span className="stat-number">14 days</span>
            <span className="stat-label">Free trial</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">No credit card</span>
            <span className="stat-label">Required</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">Cancel anytime</span>
            <span className="stat-label">No commitment</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;