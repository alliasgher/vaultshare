'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Keep worker and API versions matched
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const [docError, setDocError] = useState<string | null>(null);

  // reset ready flag when page changes
  useEffect(() => { setPageReady(false); }, [pageNumber]);

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

  return (
    <div id="pdf-fullscreen-container" className="flex flex-col h-full bg-gray-900">
      {/* Controls */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1 || numPages === 0}
            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 text-sm"
          >←</button>
          <span className="text-white text-sm">
            {numPages ? `Page ${pageNumber} of ${numPages}` : 'Loading…'}
          </span>
          <button
            onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
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
              onLoadSuccess={({ numPages }) => { setNumPages(numPages); setDocError(null); }}
              onLoadError={(err) => { console.error('PDF load error', err); setDocError(err.message); }}
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
                    onRenderSuccess={() => setPageReady(true)}
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
