'use client';
import { useState } from 'react';
import Camera from '../components/Camera';
import Gallery from '../components/Gallery';
import './page.css';

export default function Home() {
  const [view, setView] = useState<'camera' | 'gallery'>('camera');
  // Hoist lastPhoto state so it persists when switching views
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);

  return (
    <div className="app-layout">
      {view === 'camera' ? (
        <Camera 
          onViewGallery={() => setView('gallery')} 
          lastPhoto={lastPhoto} 
          setLastPhoto={setLastPhoto} 
        />
      ) : (
        <Gallery onClose={() => setView('camera')} />
      )}
    </div>
  );
}
