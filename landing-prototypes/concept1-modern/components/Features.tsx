import React from 'react';

const Features: React.FC = () => {
  const features = [
    {
      title: "AI-Assisted Design Tools",
      description: "Intelligent algorithms help you create perfect furniture designs with automatic optimization and smart suggestions.",
      icon: "🤖"
    },
    {
      title: "Room & Wall Creation",
      description: "Build complete room layouts with precise wall placement, door positioning, and spatial planning tools.",
      icon: "🏠"
    },
    {
      title: "Smart Snapping & Measurement",
      description: "Pixel-perfect alignment with intelligent snapping system and real-time measurement feedback.",
      icon: "📐"
    },
    {
      title: "Export & Layout Capabilities",
      description: "Generate detailed cutlists, technical drawings, and manufacturing-ready files in multiple formats.",
      icon: "📤"
    },
    {
      title: "WooCommerce Integration",
      description: "Seamlessly connect your designs to online stores with automated product generation and pricing.",
      icon: "🛒"
    },
    {
      title: "pimo.pt Integration",
      description: "Direct connection to manufacturing workflows with optimized material usage and production planning.",
      icon: "⚙️"
    }
  ];

  return (
    <section className="features">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Powerful Features</h2>
          <p className="section-subtitle">
            Everything you need to design, create, and manufacture furniture with precision and efficiency.
          </p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;