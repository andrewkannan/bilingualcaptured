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

  // Split photos for two tracks
  const topPhotos = photos.filter((_, i) => i % 2 === 0);
  const bottomPhotos = photos.filter((_, i) => i % 2 !== 0);

  // Helper to generate markings
  const getMarkings = (index: number) => {
    return `KODAK 400   ${(index % 12) + 1} A   ${new Date().toISOString().split('T')[0]}   CCC JB BILINGUAL`;
  };

  // Helper to render track contents (we render it twice per track for a seamless loop)
  const renderTrackContent = (trackPhotos: Photo[], startIndexOffset: number) => {
    // If not enough photos, we still duplicate them to fill the screen width so the loop doesn't break
    const renderList = [];
    renderList.push(
      trackPhotos.map((photo, i) => (
        <div key={photo.id + '-1'} className="film-frame">
          <img src={photo.url} alt="Guest memory" />
          <div className="film-markings">{getMarkings(i + startIndexOffset)}</div>
        </div>
      ))
    );
    if (trackPhotos.length > 0 && trackPhotos.length < 15) {
      renderList.push(
        trackPhotos.map((photo, i) => (
          <div key={photo.id + '-2'} className="film-frame">
            <img src={photo.url} alt="Guest memory" />
            <div className="film-markings">{getMarkings(i + startIndexOffset + 15)}</div>
          </div>
        ))
      );
      renderList.push(
        trackPhotos.map((photo, i) => (
          <div key={photo.id + '-3'} className="film-frame">
            <img src={photo.url} alt="Guest memory" />
            <div className="film-markings">{getMarkings(i + startIndexOffset + 30)}</div>
          </div>
        ))
      );
    }
    return renderList;
  };

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

      {/* Right Gallery Area - Cinematic Film Strip (2 Rows) */}
      <div className="present-gallery-wrapper">
        <div className="film-strip-track track-top">
          <div className="marquee-content">{renderTrackContent(topPhotos, 0)}</div>
          <div className="marquee-content">{renderTrackContent(topPhotos, 0)}</div>
        </div>

        <div className="film-strip-track track-bottom">
          <div className="marquee-content">{renderTrackContent(bottomPhotos, 100)}</div>
          <div className="marquee-content">{renderTrackContent(bottomPhotos, 100)}</div>
        </div>
      </div>

      {/* Camera Flash Effect */}
      <div className={`flash-overlay ${flash ? 'flash-active' : ''}`}></div>
    </div>
  );
}
