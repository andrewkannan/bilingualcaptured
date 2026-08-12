'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { RefreshCcw, Zap, Timer, Copy, ImagePlus, Camera as CameraIcon } from 'lucide-react';
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
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Play shutter flash instantly
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 100);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // SUPER FAST THUMBNAIL (Synchronous, tiny resolution)
    // This updates the UI immediately without waiting for Blob encoding
    const thumbCanvas = document.createElement('canvas');
    const thumbSize = 120;
    thumbCanvas.width = thumbSize;
    thumbCanvas.height = thumbSize;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (thumbCtx) {
       // Crop center for square thumbnail
       const minDim = Math.min(canvas.width, canvas.height);
       const sx = (canvas.width - minDim) / 2;
       const sy = (canvas.height - minDim) / 2;
       thumbCtx.drawImage(canvas, sx, sy, minDim, minDim, 0, 0, thumbSize, thumbSize);
       setLastPhoto(thumbCanvas.toDataURL('image/jpeg', 0.5));
    }
    
    // DEFER HEAVY BLOB CREATION & UPLOAD
    // Pushing this out of the main thread makes the shutter click feel completely instantaneous
    setTimeout(() => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        uploadPhotoInBackground(blob);
      }, 'image/jpeg', 0.8);
    }, 10);
  };

  return (
    <div className="camera-container">
      {error && <div className="error-toast">{error}</div>}
      {isFlashing && <div className="shutter-flash" />}
      
      {/* Top spacer for the rounded camera feed */}
      <div className="top-spacer" />
      
      {/* Rounded Viewfinder */}
      <div className="viewfinder-wrapper">
        <div className="viewfinder">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className={`video-feed ${facingMode === 'user' ? 'mirrored' : ''}`}
          />
        </div>
      </div>

      {/* Bottom Area containing Icons and Shutter */}
      <div className="bottom-area">
        {/* Row of Action Icons */}
        <div className="action-icons-row">
          <button className="icon-btn"><ImagePlus size={24} /></button>
          <button className="icon-btn"><Copy size={24} /></button>
          <button className="icon-btn"><Timer size={24} /></button>
          <button className="icon-btn"><Zap size={24} /></button>
          <button className="icon-btn" onClick={toggleCamera}><RefreshCcw size={24} /></button>
        </div>

        {/* Shutter & Gallery Row */}
        <div className="shutter-row">
          <div className="shutter-spacer" /> {/* Empty div to center shutter */}
          
          <button className="shutter-btn" onClick={takePhoto}>
            <div className="shutter-inner" />
          </button>
          
          <div className="gallery-thumbnail-container">
            <button className="thumbnail-btn" onClick={onViewGallery}>
              {lastPhoto ? (
                <img src={lastPhoto} alt="Gallery" />
              ) : (
                <div className="empty-thumbnail">
                  <CameraIcon size={24} color="#555" />
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
