import React from 'react';

const Features: React.FC = () => {
  const features = [
    {
      title: "AI Design Assistant",
      description: "Smart suggestions and automatic optimization for perfect furniture designs.",
      icon: "✨"
    },
    {
      title: "Room Planning",
      description: "Create complete room layouts with precise measurements and spatial planning.",
      icon: "🏠"
    },
    {
      title: "Smart Measurements",
      description: "Automatic dimensioning with real-time updates as you design.",
      icon: "📏"
    },
    {
      title: "Export Ready",
      description: "Generate manufacturing files, cutlists, and technical documentation.",
      icon: "📤"
    },
    {
      title: "Material Library",
      description: "Access curated materials optimized for production and aesthetics.",
      icon: "🎨"
    },
    {
      title: "Integration Ready",
      description: "Connect with WooCommerce and pimo.pt for seamless workflows.",
      icon: "🔗"
    }
  ];

  return (
    <section id="features" className="features">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Simple. Powerful. Effective.</h2>
          <p className="section-subtitle">
            Everything you need to design beautiful furniture without complexity.
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