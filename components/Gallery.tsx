'use client';
import { useEffect, useState } from 'react';
import { ChevronLeft, Info, X, Share, Trash2, Camera as CameraIcon } from 'lucide-react';
import './Gallery.css';

interface Photo {
  id: string;
  url: string;
  filter: string;
  createdAt: string;
}

export default function Gallery({ onClose }: { onClose: () => void }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPhotoIds, setMyPhotoIds] = useState<string[]>([]);
  
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setMyPhotoIds(JSON.parse(localStorage.getItem('myPhotoIds') || '[]'));
    
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
    const interval = setInterval(fetchPhotos, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    try {
      await fetch('/api/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      setPhotos(prev => prev.filter(p => p.id !== id));
      setSelectedPhoto(null);
    } catch (err) {
      console.error(err);
    }
  };

  const sharePolaroid = async (photo: Photo) => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photo.url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      const padding = 40;
      const bottomMargin = 160;
      const canvas = document.createElement('canvas');
      canvas.width = img.width + (padding * 2);
      canvas.height = img.height + padding + bottomMargin;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add a slight drop shadow inside the polaroid frame for realism
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 10;
      ctx.drawImage(img, padding, padding, img.width, img.height);
      ctx.shadowColor = 'transparent';
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 60px "Marker Felt", "Comic Sans MS", cursive';
      ctx.textAlign = 'center';
      ctx.fillText('Andrew & Kenisha', canvas.width / 2, canvas.height - 60);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `polaroid-${photo.id}.jpg`, { type: 'image/jpeg' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Guest Cam Polaroid',
          });
        } else {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `polaroid-${photo.id}.jpg`;
          link.click();
        }
        setIsGenerating(false);
      }, 'image/jpeg', 0.9);
      
    } catch (err) {
      console.error('Failed to generate polaroid', err);
      alert('Failed to generate polaroid. Make sure CORS is configured for image downloads.');
      setIsGenerating(false);
    }
  };

  const shareNative = async (photo: Photo) => {
    try {
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const file = new File([blob], `photo-${photo.id}.jpg`, { type: 'image/jpeg' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `photo-${photo.id}.jpg`;
        link.click();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <button className="back-btn" onClick={onClose}>
          <ChevronLeft size={28} />
          <span>Camera</span>
        </button>
        <h2>Album</h2>
        <div style={{ width: '80px' }} />
      </div>

      {loading ? (
        <div className="gallery-loading">Loading photos...</div>
      ) : photos.length === 0 ? (
        <div className="gallery-empty">No photos yet. Be the first!</div>
      ) : (
        <div className="gallery-grid">
          {photos.map(photo => (
            <button key={photo.id} className="photo-card" onClick={() => setSelectedPhoto(photo)}>
              <img src={photo.url} alt="Guest cam photo" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX */}
      {selectedPhoto && (
        <div className="lightbox">
          <div className="lightbox-header">
            <button className="icon-btn" onClick={() => { setSelectedPhoto(null); setShowInfo(false); }}>
              <X size={28} />
            </button>
            <button className="icon-btn" onClick={() => setShowInfo(!showInfo)}>
              <Info size={24} color={showInfo ? '#FFCC00' : '#FFF'} />
            </button>
          </div>
          
          <div className="lightbox-content">
            <img src={selectedPhoto.url} alt="Full view" className="lightbox-img" />
            
            {showInfo && (
              <div className="metadata-overlay">
                <div className="metadata-row">
                  <span>Time</span>
                  <strong>{new Date(selectedPhoto.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                </div>
                <div className="metadata-row">
                  <span>Filter</span>
                  <strong>{selectedPhoto.filter || 'Normal'}</strong>
                </div>
              </div>
            )}
          </div>
          
          <div className="lightbox-footer">
            {myPhotoIds.includes(selectedPhoto.id) ? (
              <button className="icon-btn danger" onClick={() => handleDelete(selectedPhoto.id)}>
                <Trash2 size={24} />
              </button>
            ) : (
              <div style={{ width: 44 }} />
            )}
            
            <button className="polaroid-btn" onClick={() => sharePolaroid(selectedPhoto)} disabled={isGenerating}>
              <CameraIcon size={20} />
              <span>{isGenerating ? 'Making...' : 'Polaroid'}</span>
            </button>
            
            <button className="icon-btn" onClick={() => shareNative(selectedPhoto)}>
              <Share size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
