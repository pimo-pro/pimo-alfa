import React from 'react';

const CTASection: React.FC = () => {
  return (
    <section className="cta-section">
      <div className="container">
        <div className="cta-content">
          <div className="cta-text">
            <h2 className="cta-title">Ready to Transform Your Design Workflow?</h2>
            <p className="cta-subtitle">
              Join thousands of furniture designers and manufacturers who trust 
              pimo-criativo for their design and production needs.
            </p>
          </div>
          <div className="cta-actions">
            <button className="btn-primary btn-large">Start Free Trial</button>
            <button className="btn-secondary btn-large">Schedule Demo</button>
            <button className="btn-ghost btn-large">View Pricing</button>
          </div>
        </div>
        
        <div className="cta-stats">
          <div className="stat-item">
            <span className="stat-number">5000+</span>
            <span className="stat-label">Happy Customers</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">98%</span>
            <span className="stat-label">Design Accuracy</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">24/7</span>
            <span className="stat-label">Support Available</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;