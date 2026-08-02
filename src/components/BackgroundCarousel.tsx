import React, { useState, useEffect } from 'react';

const BACKGROUND_IMAGES = [
  '/ff-bg.jpg',
  '/ff-bg2.png',
  '/ff-bg3.png',
  '/ff-bg4.png'
];

export const BackgroundCarousel: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 3000); // Dissolve change every 3 seconds

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-slideshow-container">
      {BACKGROUND_IMAGES.map((imgUrl, index) => (
        <div
          key={imgUrl}
          className={`bg-slide ${index === currentIdx ? 'active' : ''}`}
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(12, 15, 23, 0.15), rgba(15, 23, 42, 0.45)), url('${imgUrl}')`
          }}
        />
      ))}
    </div>
  );
};
