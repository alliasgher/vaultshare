'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// IMPORTANT: use the "legacy" worker path and keep versions matched
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Client-only versions of Document/Page to prevent SSR remounts
const Document = dynamic(async () => (await import('react-pdf')).Document, { ssr: false });
const Page = dynamic(async () => (await import('react-pdf')).Page, { ssr: false });

function Loader({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gray-900 pointer-events-none">
      <div className="text-white text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2" />
        <p>{text}</p>
      </div>
    </div>
  );
}

interface SecurePDFViewerProps {
  url: string;
  filename: string;
}

export default function SecurePDFViewer({ url, filename }: SecurePDFViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const loadTokenRef = useRef(0);      // increments on page change to ignore stale callbacks

  // When page changes, mark not ready and bump token to invalidate old callbacks
  useEffect(() => { 
    setPageReady(false); 
    loadTokenRef.current += 1; 
  }, [pageNumber]);

  const onDocLoad = (pdf: { numPages: number }) => {
    setNumPages(pdf.numPages);
    // clamp current page in case the new PDF has fewer pages
    setPageNumber(p => Math.min(Math.max(1, p), pdf.numPages));
  };

  const onDocError = (e: any) => {
    console.error('PDF load error', e);
  };

  const toggleFullscreen = async () => {
    const container = document.getElementById('pdf-fullscreen-container');
    if (!document.fullscreenElement && container) {
      try {
        await container.requestFullscreen();
      } catch (err) {
        console.error('Fullscreen error:', err);
      }
    } else if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('Exit fullscreen error:', err);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const wasFullscreen = isFullscreen;
      const nowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(nowFullscreen);
      
      // Reset scale when exiting fullscreen to prevent zoom issues
      if (wasFullscreen && !nowFullscreen) {
        setTimeout(() => setScale(1.0), 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

  // Defensive navigation - clamp to valid page numbers
  const goToPrevPage = () => {
    if (numPages > 0) {
      setPageNumber(p => Math.max(1, p - 1));
    }
  };

  const goToNextPage = () => {
    if (numPages > 0) {
      setPageNumber(p => Math.min(numPages, p + 1));
    }
  };

  return (
    <div id="pdf-fullscreen-container" className="flex flex-col h-full bg-gray-900">
      {/* Controls */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1 || numPages === 0}
            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 text-sm"
          >←</button>
          <span className="text-white text-sm">
            {numPages ? `Page ${pageNumber} of ${numPages}` : 'Loading…'}
          </span>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages || numPages === 0}
            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 text-sm"
          >→</button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                  disabled={!numPages} className="px-3 py-1 bg-gray-700 text-white rounded text-sm">−</button>
          <span className="text-white text-sm">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2, s + 0.1))}
                  disabled={!numPages} className="px-3 py-1 bg-gray-700 text-white rounded text-sm">+</button>
          <button
            onClick={toggleFullscreen}
            className="ml-2 px-3 py-1 bg-gray-700 text-white rounded text-sm"
          >
            {isFullscreen ? '⤓ Exit' : '⤢ Fullscreen'}
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-auto bg-gray-900">
        <div className="w-full h-full flex justify-center p-4">
          <div className="relative select-none" onContextMenu={e => e.preventDefault()} style={{ userSelect: 'none' }}>
            {/* Watermark only after the page has rendered */}
            {pageReady && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center"
                   style={{ background: 'repeating-linear-gradient(45deg,transparent,transparent 100px,rgba(239,68,68,.03) 100px,rgba(239,68,68,.03) 200px)', zIndex: 10 }}>
                <div className="text-red-500 opacity-10 text-6xl font-black -rotate-45">VIEW ONLY • NO DOWNLOAD</div>
              </div>
            )}

            <Document
              file={url}
              onLoadSuccess={onDocLoad}
              onLoadError={onDocError}
              options={{
                cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                cMapPacked: true,
                // makes network behavior more predictable on slow origins
                disableStream: true,
                disableAutoFetch: true,
              }}
              loading={<Loader text="Loading PDF…" />}
              error={<Loader text="Loading PDF…" />}   // hide default red banner
              noData={<Loader text="No PDF to display" />}
            >
              {numPages > 0 && (
                <div className="relative">
                  <Page
                    key={pageNumber}                 // ensures a fresh render task
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onRenderSuccess={() => {
                      // ignore late callbacks from a previous page
                      const tokenAtStart = loadTokenRef.current;
                      requestAnimationFrame(() => {
                        if (tokenAtStart === loadTokenRef.current) setPageReady(true);
                      });
                    }}
                    onRenderError={(e) => {
                      console.error('Page render error', e);
                      setPageReady(false);
                    }}
                  />
                  {!pageReady && <Loader text="Rendering page…" />}  {/* overlay loader; don't hide Page */}
                </div>
              )}
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
}
