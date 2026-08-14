'use client';
import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, Info, X, Share, Trash2, Camera as CameraIcon } from 'lucide-react';
import './Gallery.css';

interface Photo {
  id: string;
  url: string;
  filter: string;
  createdAt: string;
}

export default function Gallery({ onClose, theme }: { onClose: () => void, theme: 'light' | 'dark' }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPhotoIds, setMyPhotoIds] = useState<string[]>([]);
  
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleTitleTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    
    if (newCount >= 5) {
      setIsAdmin(true);
      alert('Admin Mode Activated! You can now delete any photo.');
      setTapCount(0);
    }
    
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => {
      setTapCount(0);
    }, 2000);
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
      
      // Draw a vintage, slightly aged paper background
      ctx.fillStyle = '#F4EFE6'; // Cream/aged paper color
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add a subtle vignette (darkened edges) around the whole polaroid for a retro feel
      const outerGrad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width * 0.4,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.8
      );
      outerGrad.addColorStop(0, 'rgba(0,0,0,0)');
      outerGrad.addColorStop(1, 'rgba(0,0,0,0.06)');
      ctx.fillStyle = outerGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add a subtle border around the whole polaroid for realism
      ctx.strokeStyle = '#D9D0C1'; // Slightly darker cream for the edge
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

      // Add a thin dark border immediately around the photo area
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(padding - 1, padding - 1, img.width + 2, img.height + 2);

      // Add a realistic drop shadow to the photo itself
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 2;
      
      // Apply a vintage filter to the photo (sepia, slightly faded contrast)
      ctx.filter = 'sepia(30%) contrast(1.1) brightness(0.9) saturate(0.85)';
      ctx.drawImage(img, padding, padding, img.width, img.height);
      
      // Reset shadow and filter for text
      ctx.shadowColor = 'transparent';
      ctx.filter = 'none';
      
      // Instagramable handwritten text with faded ink color
      ctx.fillStyle = '#3a312a'; // Faded brown/black ink
      ctx.font = '600 70px "Caveat", "Dancing Script", "Brush Script MT", "Bradley Hand", cursive';
      ctx.textAlign = 'center';
      
      // Add slight rotation to text for an organic, handwritten feel
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height - 65);
      ctx.rotate(-0.03);
      ctx.fillText('This is CCC JB Bilingual', 0, 0);
      ctx.restore();
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Failed to create blob');
      
      const file = new File([blob], `polaroid-${photo.id}.jpg`, { type: 'image/jpeg' });
      
      try {
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
      } catch (shareErr: any) {
        if (shareErr.name !== 'AbortError') {
          console.error(shareErr);
        }
      }
      
      setIsGenerating(false);
      
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
          <CameraIcon size={24} style={{ marginLeft: 4 }} />
        </button>
        <h2 onClick={handleTitleTap} style={{ cursor: 'pointer', userSelect: 'none' }}>Album</h2>
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
              <X size={28} color="#FFF" />
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
            {(isAdmin || myPhotoIds.includes(selectedPhoto.id)) ? (
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
              <Share size={24} color="#FFF" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
