'use client';
import { useRef, useState, useEffect } from 'react';
import './Camera.css';

export default function Camera({ onPhotoTaken }: { onPhotoTaken: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Camera access denied or unavailable.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsUploading(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsUploading(false);
        return;
      }
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentType: blob.type }),
        });
        const { presignedUrl, publicUrl } = await res.json();
        
        await fetch(presignedUrl, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': blob.type },
        });

        await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: publicUrl }),
        });
        
        onPhotoTaken();
      } catch (err) {
        console.error(err);
        setError('Failed to upload photo.');
      } finally {
        setIsUploading(false);
      }
    }, 'image/jpeg', 0.8);
  };

  return (
    <div className="camera-container">
      {error && <div className="error-toast">{error}</div>}
      <div className="viewfinder glass">
        <video ref={videoRef} autoPlay playsInline muted className="video-feed" />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      
      <div className="controls">
        <button 
          className="shutter-btn" 
          onClick={takePhoto} 
          disabled={isUploading || !stream}
        >
          {isUploading ? <div className="spinner" /> : <div className="shutter-inner" />}
        </button>
      </div>
    </div>
  );
}
