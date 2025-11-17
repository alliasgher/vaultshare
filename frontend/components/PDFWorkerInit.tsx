'use client';

import { useEffect } from 'react';
import { pdfjs } from 'react-pdf';

// Configure PDF.js worker - using local worker file from public directory
// Version: 5.4.296 (matches react-pdf's pdfjs-dist dependency)
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Component to initialize PDF.js worker early in the app lifecycle.
 * This ensures the worker is loaded and ready before any PDF viewers render.
 */
export default function PDFWorkerInit() {
  useEffect(() => {
    // Preload the worker file
    const preloadWorker = async () => {
      try {
        const response = await fetch('/pdf.worker.min.mjs');
        if (response.ok) {
          // Worker file is cached by browser now
          console.log('PDF.js worker preloaded and cached');
        }
      } catch (err) {
        console.error('Failed to preload PDF worker:', err);
      }
    };

    preloadWorker();
  }, []);

  return null; // This component doesn't render anything
}
