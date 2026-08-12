'use client';
import { useEffect, useState } from 'react';
import './Gallery.css';

type Photo = {
  id: string;
  url: string;
  createdAt: string;
};

export default function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch('/api/photos');
        if (res.ok) {
          const data = await res.json();
          setPhotos(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPhotos();
    const interval = setInterval(fetchPhotos, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="gallery-loading">Loading memories...</div>;
  }

  if (photos.length === 0) {
    return <div className="gallery-empty glass">No photos yet. Be the first!</div>;
  }

  return (
    <div className="gallery-grid">
      {photos.map((photo, i) => (
        <div 
          key={photo.id} 
          className="photo-card animate-fade-in" 
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <img src={photo.url} alt="Guest memory" loading="lazy" />
        </div>
      ))}
    </div>
  );
}
