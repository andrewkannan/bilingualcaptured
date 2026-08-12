'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { SwitchCamera, Zap, Moon, Clock, ChevronUp } from 'lucide-react';
import './Camera.css';

export default function Camera({ onViewGallery }: { onViewGallery: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string>('');
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  const startCamera = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError('');
    } catch (err: any) {
      setError('Camera access denied or unavailable.');
      console.error(err);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const uploadPhotoInBackground = async (blob: Blob) => {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: blob.type }),
      });
      
      if (!res.ok) throw new Error(`API Error: ${await res.text()}`);
      
      const { presignedUrl, publicUrl } = await res.json();
      const arrayBuffer = await blob.arrayBuffer();
      
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: arrayBuffer,
        headers: { 'Content-Type': blob.type },
      });
      
      if (!uploadRes.ok) throw new Error(`S3 Error ${uploadRes.status}`);

      const dbRes = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: publicUrl }),
      });
      
      if (!dbRes.ok) throw new Error(`DB Error ${dbRes.status}`);
      
    } catch (err: any) {
      console.error('Background upload failed:', err);
      // We don't block the UI, but we could show a subtle toast
      setError('An upload failed in the background');
      setTimeout(() => setError(''), 3000);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Play shutter flash animation
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // We want to capture the 4:3 cropped area, but for simplicity we draw the whole feed
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      // Instantly show the photo in the thumbnail
      const objectUrl = URL.createObjectURL(blob);
      setLastPhoto(objectUrl);
      
      // Upload seamlessly in background
      uploadPhotoInBackground(blob);
      
    }, 'image/jpeg', 0.8);
  };

  return (
    <div className="camera-container">
      {error && <div className="error-toast">{error}</div>}
      {isFlashing && <div className="shutter-flash" />}
      
      {/* Top Controls Bar */}
      <div className="top-controls">
        <button className="icon-btn"><Zap size={22} fill="currentColor" /></button>
        <button className="icon-btn"><ChevronUp size={24} /></button>
        <button className="icon-btn"><Clock size={22} /></button>
      </div>
      
      {/* Viewfinder with 4:3 aspect and grid */}
      <div className="viewfinder-wrapper">
        <div className="viewfinder">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className={`video-feed ${facingMode === 'user' ? 'mirrored' : ''}`}
          />
          {/* Rule of thirds grid */}
          <div className="grid-overlay">
            <div className="grid-line vertical" style={{ left: '33.33%' }} />
            <div className="grid-line vertical" style={{ left: '66.66%' }} />
            <div className="grid-line horizontal" style={{ top: '33.33%' }} />
            <div className="grid-line horizontal" style={{ top: '66.66%' }} />
          </div>
        </div>
      </div>
      
      {/* Mode Selector */}
      <div className="mode-selector">
        <span className="mode-text active">PHOTO</span>
      </div>

      {/* Bottom Controls Bar */}
      <div className="bottom-controls">
        {/* Left: Gallery Thumbnail */}
        <button className="thumbnail-btn" onClick={onViewGallery}>
          {lastPhoto ? (
            <img src={lastPhoto} alt="Gallery" />
          ) : (
            <div className="empty-thumbnail" />
          )}
        </button>
        
        {/* Center: Shutter Button */}
        <button className="shutter-btn" onClick={takePhoto}>
          <div className="shutter-inner" />
        </button>
        
        {/* Right: Camera Flip */}
        <button className="flip-btn" onClick={toggleCamera}>
          <SwitchCamera size={28} />
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
