import React from 'react';

const Testimonials: React.FC = () => {
  const testimonials = [
    {
      name: "Ana Silva",
      role: "Furniture Designer",
      company: "Design Studio",
      quote: "pimo-criativo has completely transformed our design process. The precision and ease of use are unmatched in the industry.",
      rating: 5
    },
    {
      name: "João Costa",
      role: "Manufacturing Manager",
      company: "WoodWorks Ltd.",
      quote: "The integration with our production workflow has saved us hours of manual work and reduced errors significantly.",
      rating: 5
    },
    {
      name: "Marta Fernandes",
      role: "Interior Architect",
      company: "Space Design",
      quote: "Our clients love seeing their furniture come to life in real-time. It's a game-changer for client presentations.",
      rating: 5
    }
  ];

  return (
    <section id="testimonials" className="testimonials">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Trusted by Professionals</h2>
          <p className="section-subtitle">
            Join thousands of designers and manufacturers who rely on pimo-criativo.
          </p>
        </div>
        
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-content">
                <div className="testimonial-quote">
                  "{testimonial.quote}"
                </div>
                <div className="testimonial-author">
                  <div className="author-info">
                    <h4 className="author-name">{testimonial.name}</h4>
                    <p className="author-role">{testimonial.role}</p>
                    <p className="author-company">{testimonial.company}</p>
                  </div>
                  <div className="author-rating">
                    {'★'.repeat(testimonial.rating)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;