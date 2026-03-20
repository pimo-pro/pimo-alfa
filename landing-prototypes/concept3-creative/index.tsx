import React, { useState, useEffect } from 'react';
import './styles.css';

// Components
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import InteractiveDemo from './components/InteractiveDemo';
import Gallery from './components/Gallery';
import CTA from './components/CTA';
import Footer from './components/Footer';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Add loading animation
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  return (
    <div className={`app ${isLoaded ? 'loaded' : ''}`}>
      <Header />
      <Hero />
      <Features />
      <InteractiveDemo />
      <Gallery />
      <CTA />
      <Footer />
    </div>
  );
};

export default App;