import React from 'react';

const Features: React.FC = () => {
  const features = [
    {
      title: "Creative AI Tools",
      description: "Intuitive AI-powered design assistants that spark creativity and simplify complex tasks.",
      icon: "🎨"
    },
    {
      title: "Playful Room Builder",
      description: "Build complete rooms with drag-and-drop simplicity and instant visual feedback.",
      icon: "🏠"
    },
    {
      title: "Smart Design Helpers",
      description: "Intelligent snapping and measurement tools that work seamlessly with your creative flow.",
      icon: "🎯"
    },
    {
      title: "Export & Share",
      description: "Generate beautiful presentations and share your creations with clients and collaborators.",
      icon: "📤"
    },
    {
      title: "Material Playground",
      description: "Experiment with colors, textures, and finishes in a fun, interactive environment.",
      icon: "🌈"
    },
    {
      title: "Integration Magic",
      description: "Connect your designs to WooCommerce and pimo.pt with seamless, automated workflows.",
      icon: "✨"
    }
  ];

  return (
    <section id="features" className="features">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Designed for Creativity</h2>
          <p className="section-subtitle">
            Everything you need to bring your furniture design visions to life.
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