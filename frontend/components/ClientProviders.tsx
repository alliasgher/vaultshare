'use client';

import dynamic from 'next/dynamic';

// Dynamically import PDFWorkerInit with SSR disabled
const PDFWorkerInit = dynamic(() => import('@/components/PDFWorkerInit'), {
  ssr: false,
});

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PDFWorkerInit />
      {children}
    </>
  );
}
