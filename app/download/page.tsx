'use client';

import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download, Loader2, CheckCircle2, Image as ImageIcon, Trash2 } from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  createdAt: string;
}

export default function DownloadPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/photos')
      .then(res => res.json())
      .then(data => {
        setPhotos(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching photos:', err);
        setLoading(false);
      });
  }, []);

  const handleDownloadAll = async () => {
    if (photos.length === 0) return;
    
    setDownloading(true);
    setSuccess(false);
    setProgress(0);
    setStatusText('Preparing to download...');

    try {
      const zip = new JSZip();
      const folder = zip.folder('Captured_Moments');

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        setStatusText(`Downloading photo ${i + 1} of ${photos.length}...`);
        setProgress(Math.round((i / photos.length) * 50)); // First 50% is fetching

        try {
          // Fetch the image as a blob
          const response = await fetch(photo.url);
          const blob = await response.blob();
          
          // Generate a filename based on the creation date or ID
          const dateStr = new Date(photo.createdAt).toISOString().replace(/[:.]/g, '-');
          const ext = blob.type === 'image/png' ? 'png' : 'jpg';
          folder?.file(`photo_${dateStr}_${photo.id}.${ext}`, blob);
        } catch (err) {
          console.error(`Failed to download photo ${photo.id}`, err);
        }
      }

      setStatusText('Zipping files... this may take a moment.');
      
      const content = await zip.generateAsync(
        { type: 'blob' },
        (metadata) => {
          // Second 50% is zipping
          setProgress(50 + Math.round(metadata.percent / 2));
        }
      );

      setStatusText('Saving file to your device...');
      saveAs(content, 'CCC_JB_Bilingual_Photos.zip');
      
      setSuccess(true);
      setStatusText('Download Complete!');
    } catch (err) {
      console.error('Error creating zip:', err);
      setStatusText('Error creating zip file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (photos.length === 0) return;
    
    if (!window.confirm('Are you absolutely sure you want to delete ALL photos from the event? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setStatusText('Deleting all photos...');
    
    try {
      const res = await fetch('/api/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true })
      });
      
      if (res.ok) {
        setPhotos([]);
        setSuccess(true);
        setStatusText('All photos have been permanently deleted.');
      } else {
        throw new Error('Failed to delete photos');
      }
    } catch (err) {
      console.error('Error deleting photos:', err);
      alert('Error deleting photos. Please try again.');
      setStatusText('');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: '#f9fafb',
      fontFamily: 'system-ui, sans-serif',
      color: '#111'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: '#fff',
        padding: '3rem',
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: '#f3f4f6',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <ImageIcon size={40} color="#4b5563" />
        </div>
        
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#111' }}>
          Event Gallery Archive
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '2.5rem' }}>
          Download all photos captured by guests during the event in a single ZIP file, or manage the gallery.
        </p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader2 className="animate-spin" size={32} color="#9ca3af" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '1rem 1.5rem', 
              backgroundColor: '#f9fafb', 
              borderRadius: '12px',
              marginBottom: '2rem',
              fontWeight: '500'
            }}>
              <span style={{ color: '#4b5563' }}>Total Photos</span>
              <span style={{ color: '#111', fontSize: '18px' }}>{photos.length}</span>
            </div>

            {success && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '0.5rem',
                color: '#059669',
                backgroundColor: '#d1fae5',
                padding: '1rem',
                borderRadius: '12px',
                marginBottom: '1.5rem'
              }}>
                <CheckCircle2 size={20} />
                <span style={{ fontWeight: '500' }}>{statusText}</span>
              </div>
            )}

            {downloading && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '14px', color: '#4b5563' }}>
                  <span>{statusText}</span>
                  <span>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    backgroundColor: '#111', 
                    width: `${progress}%`,
                    transition: 'width 0.2s ease-out'
                  }}></div>
                </div>
              </div>
            )}

            <button
              onClick={handleDownloadAll}
              disabled={downloading || deleting || photos.length === 0}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: downloading || deleting || photos.length === 0 ? '#9ca3af' : '#111',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: downloading || deleting || photos.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.2s'
              }}
            >
              {downloading ? (
                <Loader2 className="animate-spin" size={20} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Download size={20} />
              )}
              {downloading ? 'Processing...' : 'Download All as ZIP'}
            </button>
            
            <button
              onClick={handleDeleteAll}
              disabled={downloading || deleting || photos.length === 0}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: 'transparent',
                color: downloading || deleting || photos.length === 0 ? '#fca5a5' : '#ef4444',
                border: `1px solid ${downloading || deleting || photos.length === 0 ? '#fca5a5' : '#ef4444'}`,
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: downloading || deleting || photos.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '1rem',
                transition: 'all 0.2s'
              }}
            >
              {deleting ? (
                <Loader2 className="animate-spin" size={20} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Trash2 size={20} />
              )}
              {deleting ? 'Deleting...' : 'Delete All Photos'}
            </button>
            
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </>
        )}
      </div>
    </div>
  );
}
