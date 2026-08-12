'use client';
import { useState } from 'react';
import Camera from '../components/Camera';
import Gallery from '../components/Gallery';
import { Camera as CameraIcon, Image as ImageIcon } from 'lucide-react';
import './page.css';

export default function Home() {
  const [view, setView] = useState<'camera' | 'gallery'>('camera');

  return (
    <main className="container">
      <header className="header animate-fade-in">
        <h1>Guest Cam</h1>
        <p>Capture the moment.</p>
      </header>

      {view === 'camera' ? (
        <Camera onPhotoTaken={() => setView('gallery')} />
      ) : (
        <Gallery />
      )}

      <nav className="bottom-nav glass animate-fade-in">
        <button 
          className={`nav-btn ${view === 'camera' ? 'active' : ''}`}
          onClick={() => setView('camera')}
        >
          <CameraIcon size={24} />
          <span>Camera</span>
        </button>
        <button 
          className={`nav-btn ${view === 'gallery' ? 'active' : ''}`}
          onClick={() => setView('gallery')}
        >
          <ImageIcon size={24} />
          <span>Album</span>
        </button>
      </nav>
    </main>
  );
}
