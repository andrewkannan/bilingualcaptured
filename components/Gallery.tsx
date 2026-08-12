'use client';
import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import './Gallery.css';

interface Photo {
  id: string;
  url: string;
  createdAt: string;
}

export default function Gallery({ onClose }: { onClose: () => void }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch('/api/photos');
        const data = await res.json();
        setPhotos(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPhotos();
    // Refresh every 10 seconds to see new photos from other guests
    const interval = setInterval(fetchPhotos, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <button className="back-btn" onClick={onClose}>
          <ChevronLeft size={28} />
          <span>Camera</span>
        </button>
        <h2>Album</h2>
        <div style={{ width: '80px' }} /> {/* Spacer for centering */}
      </div>

      {loading ? (
        <div className="gallery-loading">Loading photos...</div>
      ) : photos.length === 0 ? (
        <div className="gallery-empty">No photos yet. Be the first!</div>
      ) : (
        <div className="gallery-grid">
          {photos.map(photo => (
            <div key={photo.id} className="photo-card">
              <img src={photo.url} alt="Guest cam photo" loading="lazy" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
