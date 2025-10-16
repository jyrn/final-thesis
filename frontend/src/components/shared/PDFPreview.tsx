import React, { useState } from 'react';
import styles from './PDFPreview.module.css';

interface PDFPreviewProps {
  resumeUrl: string;
  className?: string;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ resumeUrl, className }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fullUrl = `https://skillsync-backend-gwwo.onrender.com${resumeUrl}`;

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Failed to load PDF preview');
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = 'resume.pdf';
    link.click();
  };

  return (
    <div className={`${styles.pdfPreview} ${className || ''}`}>
      <div className={styles.header}>
        <h3>Resume Preview</h3>
        <div className={styles.actions}>
          <button 
            onClick={handleDownload}
            className={styles.downloadBtn}
            title="Download PDF"
          >
            📥 Download
          </button>
          <a 
            href={fullUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.openBtn}
            title="Open in new tab"
          >
            🔗 Open
          </a>
        </div>
      </div>

      <div className={styles.previewContainer}>
        {isLoading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading PDF preview...</p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={() => window.open(fullUrl, '_blank')}>
              Open PDF in new tab
            </button>
          </div>
        )}

        <iframe
          src={`${fullUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=page-width`}
          className={styles.pdfFrame}
          onLoad={handleLoad}
          onError={handleError}
          title="Resume Preview"
          scrolling="no"
        />
      </div>
    </div>
  );
};

export default PDFPreview;
