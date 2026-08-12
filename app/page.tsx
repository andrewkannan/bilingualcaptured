'use client';
import { useState } from 'react';
import Camera from '../components/Camera';
import Gallery from '../components/Gallery';
import './page.css';

export default function Home() {
  const [view, setView] = useState<'camera' | 'gallery'>('camera');

  return (
    <div className="app-layout">
      {view === 'camera' ? (
        <Camera onViewGallery={() => setView('gallery')} />
      ) : (
        <Gallery onClose={() => setView('camera')} />
      )}
    </div>
  );
}
