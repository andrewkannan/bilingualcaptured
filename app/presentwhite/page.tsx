'use client';

import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './page.css'; // this imports the local page.css for presentwhite

interface Photo {
  id: string;
  url: string;
  filter: string;
  createdAt: string;
}

export default function PresentationWhitePage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [flash, setFlash] = useState(false);
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
          // Check for new photo to trigger flash
          const latestPhoto = data[0];
          if (lastPhotoId.current && lastPhotoId.current !== latestPhoto.id) {
            setFlash(true);
            setTimeout(() => setFlash(false), 1000); // Reset flash state after animation
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
            <QRCodeSVG value={origin} size={300} level="H" />
          </div>
          <div className="qr-text">Scan to Take a Photo!</div>
        </div>

        <div className="stats-section">
          <div className="photo-count">{photos.length}</div>
          <div className="photo-count-label">
            <span className="live-indicator"></span>
            Photos Captured
          </div>
        </div>
      </div>

      {/* Right Gallery Area - Cinematic Film Strip */}
      <div className="present-gallery-wrapper">
        <div className="film-strip-track">
          {photos.map(photo => (
            <div key={photo.id} className="film-frame">
              <img src={photo.url} alt="Guest memory" />
            </div>
          ))}
          {/* Render extra duplicates to make the film strip long enough to loop */}
          {photos.length > 0 && photos.length < 20 && photos.map(photo => (
            <div key={`${photo.id}-dup1`} className="film-frame">
              <img src={photo.url} alt="Guest memory" />
            </div>
          ))}
          {photos.length > 0 && photos.length < 20 && photos.map(photo => (
            <div key={`${photo.id}-dup2`} className="film-frame">
              <img src={photo.url} alt="Guest memory" />
            </div>
          ))}
          {photos.length > 0 && photos.length < 20 && photos.map(photo => (
            <div key={`${photo.id}-dup3`} className="film-frame">
              <img src={photo.url} alt="Guest memory" />
            </div>
          ))}
        </div>
      </div>

      {/* Camera Flash Effect */}
      <div className={`flash-overlay ${flash ? 'flash-active' : ''}`}></div>
    </div>
  );
}
