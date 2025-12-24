'use client';

import Link from 'next/link';
import { CloudArrowUpIcon, LinkIcon } from '@heroicons/react/24/outline';

export default function AccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <Link href="/" className="flex items-center space-x-2">
          <CloudArrowUpIcon className="w-8 h-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">VaultShare</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <LinkIcon className="w-16 h-16 mx-auto text-gray-400 mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Access Link Required
            </h1>
            <p className="text-gray-600 mb-6">
              To access a shared file, you need a valid access link from the file owner.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Access links look like:<br />
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                vaultshare.app/access/abc123xyz
              </code>
            </p>
            <div className="space-y-3">
              <Link
                href="/"
                className="block w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
              >
                Go to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
