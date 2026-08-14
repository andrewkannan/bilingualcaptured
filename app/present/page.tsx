'use client';

import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './page.css';

interface Photo {
  id: string;
  url: string;
  filter: string;
  createdAt: string;
}

export default function PresentationPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [spotlightPhoto, setSpotlightPhoto] = useState<Photo | null>(null);
  const [origin, setOrigin] = useState('https://bilingualcaptured.vercel.app'); 
  const lastPhotoId = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    
    const fetchPhotos = async () => {
      try {
        const res = await fetch('/api/photos');
        if (!res.ok) return;
        const data: Photo[] = await res.json();
        
        if (data.length > 0) {
          // Check for new photo to spotlight
          const latestPhoto = data[0];
          // Only trigger spotlight if we already had a lastPhotoId (meaning this isn't the initial load)
          if (lastPhotoId.current && lastPhotoId.current !== latestPhoto.id) {
            setSpotlightPhoto(latestPhoto);
            setTimeout(() => {
              setSpotlightPhoto(null);
            }, 6000); // Hide after animation finishes
          }
          lastPhotoId.current = latestPhoto.id;
        }
        
        setPhotos(data);
      } catch (err) {
        console.error('Error fetching photos:', err);
      }
    };

    fetchPhotos();
    const interval = setInterval(fetchPhotos, 3000); // Poll every 3 seconds for faster updates
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="present-container">
      {/* Left Sidebar */}
      <div className="present-sidebar">
        <div className="brand-section">
          <h1>CCC JB Bilingual</h1>
          <p>Scan the QR code to capture and share your moments live on the big screen!</p>
        </div>

        <div className="qr-section">
          <div className="qr-wrapper">
            <QRCodeSVG value={origin} size={200} level="H" />
          </div>
          <div className="qr-text">Scan to Take a Photo!</div>
        </div>

        <div className="stats-section">
          <div className="photo-count">{photos.length}</div>
          <div className="photo-count-label">Photos Captured</div>
        </div>
      </div>

      {/* Right Gallery Area - Photo Collage */}
      <div className="present-gallery-wrapper">
        <div className="gallery-scroller">
          {photos.map(photo => (
            <div key={photo.id} className="present-photo-card">
              <img src={photo.url} alt="Guest memory" />
              <div className="present-photo-caption">CCC JB Bilingual</div>
            </div>
          ))}
          {/* Render a few more times for a dense collage look if there are very few photos */}
          {photos.length > 0 && photos.length < 15 && photos.map(photo => (
            <div key={`${photo.id}-dup1`} className="present-photo-card">
              <img src={photo.url} alt="Guest memory" />
              <div className="present-photo-caption">CCC JB Bilingual</div>
            </div>
          ))}
          {photos.length > 0 && photos.length < 8 && photos.map(photo => (
            <div key={`${photo.id}-dup2`} className="present-photo-card">
              <img src={photo.url} alt="Guest memory" />
              <div className="present-photo-caption">CCC JB Bilingual</div>
            </div>
          ))}
        </div>
      </div>

      {/* Spotlight Widget (Small pinned corner widget) */}
      {spotlightPhoto && (
        <div className="spotlight-widget">
          <div className="new-badge">NEW!</div>
          <img src={spotlightPhoto.url} alt="New memory" />
          <div className="caption">Just Captured!</div>
        </div>
      )}
    </div>
  );
}
