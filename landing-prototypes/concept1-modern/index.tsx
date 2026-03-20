import React, { useState, useEffect } from 'react';
import './styles.css';

// Components
import Hero from './components/Hero';
import Features from './components/Features';
import VisualDemo from './components/VisualDemo';
import CTASection from './components/CTASection';
import Footer from './components/Footer';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Add loading animation
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  return (
    <div className={`app ${isLoaded ? 'loaded' : ''}`}>
      <Hero />
      <Features />
      <VisualDemo />
      <CTASection />
      <Footer />
    </div>
  );
};

export default App;