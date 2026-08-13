'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { RefreshCcw, Zap, ZapOff, Timer, Copy, Camera as CameraIcon, Sun, Moon } from 'lucide-react';
import './Camera.css';

const FILTERS = [
  { name: 'Provia (Std)', css: 'contrast(105%) saturate(110%)' },
  { name: 'Velvia (Vivid)', css: 'contrast(120%) saturate(150%) brightness(105%)' },
  { name: 'Astia (Soft)', css: 'contrast(90%) saturate(110%) sepia(10%)' },
  { name: 'Classic Chrome', css: 'contrast(110%) saturate(80%) sepia(20%) hue-rotate(-10deg)' },
  { name: 'Acros (B&W)', css: 'grayscale(100%) contrast(120%)' }
];

const TIMERS = [0, 3, 10];

interface CameraProps {
  onViewGallery: () => void;
  lastPhoto: string | null;
  setLastPhoto: (url: string | null) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function Camera({ onViewGallery, lastPhoto, setLastPhoto, theme, toggleTheme }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string>('');
  
  const [isFlashing, setIsFlashing] = useState(false);
  const [softwareFlash, setSoftwareFlash] = useState(false);
  const [hasHardwareFlash, setHasHardwareFlash] = useState(false);
  
  const [filterIndex, setFilterIndex] = useState(0);
  const [timerIndex, setTimerIndex] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  
  const [countdown, setCountdown] = useState<number>(0);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = useCallback(async () => {
    if (stream) stream.getTracks().forEach(track => track.stop());

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      
      // Re-apply torch if flash is currently on and we switch cameras
      if (flashOn) {
        try {
          const track = newStream.getVideoTracks()[0];
          await track.applyConstraints({ advanced: [{ torch: true } as any] });
          setHasHardwareFlash(true);
        } catch (e) {
          setHasHardwareFlash(false);
        }
      }
      
      setError('');
    } catch (err: any) {
      setError('Camera access denied or unavailable.');
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

  const toggleCamera = () => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  const toggleFilter = () => setFilterIndex(prev => (prev + 1) % FILTERS.length);
  const toggleTimer = () => setTimerIndex(prev => (prev + 1) % TIMERS.length);
  
  const toggleFlash = async () => {
    const nextState = !flashOn;
    setFlashOn(nextState);
    
    if (stream) {
      const track = stream.getVideoTracks()[0];
      try {
        await track.applyConstraints({ advanced: [{ torch: nextState } as any] });
        setHasHardwareFlash(true);
      } catch (err) {
        setHasHardwareFlash(false);
      }
    }
  };

  const uploadPhotoInBackground = async (blob: Blob, filterName: string) => {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: blob.type }),
      });
      if (!res.ok) throw new Error(`API Error`);
      const { presignedUrl, publicUrl } = await res.json();
      
      const arrayBuffer = await blob.arrayBuffer();
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: arrayBuffer,
        headers: { 'Content-Type': blob.type },
      });
      if (!uploadRes.ok) throw new Error(`S3 Error`);

      const dbRes = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: publicUrl, filter: filterName }),
      });
      
      if (dbRes.ok) {
        const photo = await dbRes.json();
        const myIds = JSON.parse(localStorage.getItem('myPhotoIds') || '[]');
        myIds.push(photo.id);
        localStorage.setItem('myPhotoIds', JSON.stringify(myIds));
      }
    } catch (err: any) {
      console.error('Background upload failed:', err);
    }
  };

  const executeCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // 3:2 Classic Aspect Ratio Center Crop (vertical 2:3)
    const targetRatio = 2 / 3;
    const currentRatio = video.videoWidth / video.videoHeight;
    
    let sWidth = video.videoWidth;
    let sHeight = video.videoHeight;
    let sx = 0;
    let sy = 0;
    
    if (currentRatio < targetRatio) {
      sHeight = sWidth / targetRatio;
      sy = (video.videoHeight - sHeight) / 2;
    } else {
      sWidth = sHeight * targetRatio;
      sx = (video.videoWidth - sWidth) / 2;
    }
    
    canvas.width = sWidth;
    canvas.height = sHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // iOS Safari WebKit Bug Fix:
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sWidth;
    tempCanvas.height = sHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    if (facingMode === 'user') {
      tempCtx.translate(sWidth, 0);
      tempCtx.scale(-1, 1);
    }
    tempCtx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

    // Now apply the filter to our main canvas and draw the temp canvas onto it
    if (filterIndex > 0) {
      ctx.filter = FILTERS[filterIndex].css;
    }
    ctx.drawImage(tempCanvas, 0, 0);
    
    // THUMBNAIL
    const thumbCanvas = document.createElement('canvas');
    const thumbSize = 120;
    thumbCanvas.width = thumbSize;
    thumbCanvas.height = thumbSize;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (thumbCtx) {
       const minDim = Math.min(canvas.width, canvas.height);
       const sx = (canvas.width - minDim) / 2;
       const sy = (canvas.height - minDim) / 2;
       
       if (filterIndex > 0) {
         thumbCtx.filter = FILTERS[filterIndex].css;
       }
       // Draw from the unfiltered temp canvas, so the thumbCtx filter applies correctly
       thumbCtx.drawImage(tempCanvas, sx, sy, minDim, minDim, 0, 0, thumbSize, thumbSize);
       setLastPhoto(thumbCanvas.toDataURL('image/jpeg', 0.5));
    }
    
    // UPLOAD
    const currentFilterName = FILTERS[filterIndex].name;
    setTimeout(() => {
      canvas.toBlob((blob) => {
        if (blob) uploadPhotoInBackground(blob, currentFilterName);
      }, 'image/jpeg', 0.8);
    }, 10);
  };

  const triggerCaptureSequence = () => {
    if (flashOn && !hasHardwareFlash) {
      setSoftwareFlash(true);
      // Wait 400ms for screen brightness to adjust exposure on face
      setTimeout(() => {
        executeCapture();
        setTimeout(() => setSoftwareFlash(false), 200);
        setIsCapturing(false);
      }, 400);
    } else {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 100);
      executeCapture();
      setIsCapturing(false);
    }
  };

  const handleShutter = () => {
    if (isCapturing) return; // prevent spamming during countdown/flash
    setIsCapturing(true);

    const time = TIMERS[timerIndex];
    if (time > 0) {
      setCountdown(time);
      let current = time;
      const interval = setInterval(() => {
        current -= 1;
        setCountdown(current);
        if (current === 0) {
          clearInterval(interval);
          triggerCaptureSequence();
        }
      }, 1000);
    } else {
      triggerCaptureSequence();
    }
  };

  return (
    <div className="camera-container">
      {error && <div className="error-toast">{error}</div>}
      
      {/* Quick shutter flash (no flash on) */}
      {isFlashing && <div className="shutter-flash" />}
      
      {/* Software Flash (flash on) */}
      {softwareFlash && <div className="software-flash" />}
      
      <div className="top-spacer">
        <img src="/icon.png" alt="Logo" className="camera-logo" />
        <button className="icon-btn theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>
      
      <div className="viewfinder-wrapper">
        <div className="viewfinder">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className={`video-feed ${facingMode === 'user' ? 'mirrored' : ''}`}
            style={{ filter: FILTERS[filterIndex].css }}
          />
          
          {countdown > 0 && (
            <div className="countdown-display">{countdown}</div>
          )}
          
          {/* Filter indicator toast */}
          {filterIndex > 0 && (
            <div className="filter-toast">{FILTERS[filterIndex].name}</div>
          )}
        </div>
      </div>

      <div className="bottom-area">
        <div className="action-icons-row">
          <button className="icon-btn" onClick={toggleFilter}>
            <Copy size={24} />
          </button>
          <button className="icon-btn timer-btn" onClick={toggleTimer}>
            <Timer size={24} />
            {TIMERS[timerIndex] > 0 && <span className="timer-badge">{TIMERS[timerIndex]}s</span>}
          </button>
          <button className="icon-btn flash-btn" onClick={toggleFlash}>
            {flashOn ? <Zap size={24} fill="var(--cam-icon)" /> : <ZapOff size={24} />}
          </button>
          <button className="icon-btn" onClick={toggleCamera}>
            <RefreshCcw size={24} />
          </button>
        </div>

        <div className="shutter-row">
          <div className="shutter-spacer" />
          
          <button className="shutter-btn" onClick={handleShutter} disabled={isCapturing}>
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
