import React, { useState, useEffect } from 'react';
import './styles.css';

// Components
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import Features from './components/Features';
import WorkflowDemo from './components/WorkflowDemo';
import Testimonials from './components/Testimonials';
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
      <Navigation />
      <Hero />
      <Features />
      <WorkflowDemo />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
};

export default App;