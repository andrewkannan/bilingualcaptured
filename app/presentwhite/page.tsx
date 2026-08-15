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
  const [activeUsers, setActiveUsers] = useState(0);
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
        if (res.ok) {
          const data: Photo[] = await res.json();
          if (data.length > 0) {
            const latestPhoto = data[0];
            if (lastPhotoId.current && lastPhotoId.current !== latestPhoto.id) {
              setFlash(true);
              setTimeout(() => setFlash(false), 1000); 
            }
            lastPhotoId.current = latestPhoto.id;
          }
          setPhotos(data);
        }

        const resUsers = await fetch('/api/heartbeat');
        if (resUsers.ok) {
          const userData = await resUsers.json();
          setActiveUsers(userData.count);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchPhotos();
    const interval = setInterval(fetchPhotos, 3000); // Poll every 3 seconds for faster updates
    return () => clearInterval(interval);
  }, []);

  // Split photos for two tracks
  const topPhotos = photos.filter((_, i) => i % 2 === 0);
  const bottomPhotos = photos.filter((_, i) => i % 2 !== 0);
  // Helper to generate markings
  const getMarkings = (index: number) => {
    return `KODAK 400   ${(index % 12) + 1} A   ${new Date().toISOString().split('T')[0]}   CCC JB BILINGUAL`;
  };

  // Calculate columns dynamically to auto-shrink photos based on count
  const numPhotos = photos.length || 1;
  // Dynamic formula to fit photos perfectly on a 16:9 screen
  const columns = Math.ceil(Math.sqrt(numPhotos * 1.3));

  return (
    <div className="present-container">
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

        <div className="stats-section" style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <div className="photo-count">{photos.length}</div>
            <div className="photo-count-label">
              <span className="live-indicator"></span>
              Photos Captured
            </div>
          </div>
          <div>
            <div className="photo-count">{activeUsers}</div>
            <div className="photo-count-label">
              <span className="live-indicator" style={{ background: '#00cc66', boxShadow: '0 0 8px #00cc66' }}></span>
              Active Cameras
            </div>
          </div>
        </div>
      </div>

      {/* Right Gallery Area - Pin Board */}
      <div className="present-gallery-wrapper">
        <div className="pin-board-grid" style={{ '--cols': columns } as React.CSSProperties}>
          {photos.map(photo => (
            <div key={photo.id} className="pin-photo animate-fade-in-up">
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
