'use client';
import { useState } from 'react';
import Camera from '../components/Camera';
import Gallery from '../components/Gallery';
import './page.css';

export default function Home() {
  const [view, setView] = useState<'camera' | 'gallery'>('camera');
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 18) {
      setTheme('light');
    }
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <div className={`app-layout theme-${theme}`}>
      {view === 'camera' ? (
        <Camera 
          onViewGallery={() => setView('gallery')} 
          lastPhoto={lastPhoto} 
          setLastPhoto={setLastPhoto}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      ) : (
        <Gallery 
          onClose={() => setView('camera')} 
          theme={theme}
        />
      )}
    </div>
  );
}
