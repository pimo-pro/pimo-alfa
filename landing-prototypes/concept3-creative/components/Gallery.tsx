import React, { useState, useEffect } from 'react';

const Gallery: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const galleryItems = [
    {
      id: 1,
      title: "Modern Living Room",
      description: "Clean lines and smart storage solutions",
      color: "#3b82f6"
    },
    {
      id: 2,
      title: "Cozy Bedroom",
      description: "Warm tones and functional design",
      color: "#f59e0b"
    },
    {
      id: 3,
      title: "Contemporary Kitchen",
      description: "Sleek cabinets and efficient layout",
      color: "#10b981"
    },
    {
      id: 4,
      title: "Minimalist Office",
      description: "Productive space with elegant simplicity",
      color: "#8b5cf6"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % galleryItems.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [galleryItems.length]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % galleryItems.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
  };

  return (
    <section id="gallery" className="gallery">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Creative Gallery</h2>
          <p className="section-subtitle">
            Explore inspiring designs created with pimo-criativo.
          </p>
        </div>
        
        <div className="gallery-container">
          <div className="gallery-slider">
            {galleryItems.map((item, index) => (
              <div
                key={item.id}
                className={`gallery-slide ${index === currentIndex ? 'active' : ''}`}
                style={{ backgroundColor: item.color }}
              >
                <div className="slide-content">
                  <h3 className="slide-title">{item.title}</h3>
                  <p className="slide-description">{item.description}</p>
                  <div className="slide-preview">
                    <div className="preview-item"></div>
                    <div className="preview-item"></div>
                    <div className="preview-item"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="gallery-controls">
            <button className="control-btn" onClick={prevSlide} aria-label="Previous slide">
              ‹
            </button>
            <div className="slide-indicators">
              {galleryItems.map((_, index) => (
                <button
                  key={index}
                  className={`indicator ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                ></button>
              ))}
            </div>
            <button className="control-btn" onClick={nextSlide} aria-label="Next slide">
              ›
            </button>
          </div>
        </div>
        
        <div className="gallery-stats">
          <div className="stat-item">
            <span className="stat-number">1000+</span>
            <span className="stat-label">Designs Created</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">50+</span>
            <span className="stat-label">Material Options</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">24/7</span>
            <span className="stat-label">Creative Support</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Gallery;