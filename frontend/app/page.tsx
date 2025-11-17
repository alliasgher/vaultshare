import Link from 'next/link';
import { ArrowRightIcon, ShieldCheckIcon, ClockIcon, EyeSlashIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudArrowUpIcon className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">VaultShare</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Secure File Sharing, <span className="text-blue-600">Simplified</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Share files securely with password protection, expiration dates, and view limits.
              No registration required for recipients.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Start Sharing
                <ArrowRightIcon className="ml-2 w-4 h-4" />
              </Link>
              <Link
                href="/access"
                className="inline-flex items-center px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Access File
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-gray-50 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-12">
              Powerful Features
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <FeatureCard
                icon={<ShieldCheckIcon className="w-10 h-10 text-blue-600" />}
                title="Password Protected"
                description="Add optional password protection for extra security"
              />
              <FeatureCard
                icon={<ClockIcon className="w-10 h-10 text-blue-600" />}
                title="Auto-Expiration"
                description="Files auto-delete after expiration time or view limit"
              />
              <FeatureCard
                icon={<EyeSlashIcon className="w-10 h-10 text-blue-600" />}
                title="View Limits"
                description="Control how many times files can be accessed"
              />
              <FeatureCard
                icon={<CloudArrowUpIcon className="w-10 h-10 text-blue-600" />}
                title="Large Files"
                description="Upload files up to 2GB with reliable storage"
              />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              number="1"
              title="Upload File"
              description="Drag and drop or select a file. Set password, expiry time, and view limits."
            />
            <StepCard
              number="2"
              title="Share Link"
              description="Copy the unique access link and share it via email, chat, or social media."
            />
            <StepCard
              number="3"
              title="Track Access"
              description="Monitor when your file is accessed, from where, and how many views remain."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto bg-blue-600 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to share securely?
            </h2>
            <p className="text-blue-100 mb-6">
              Join thousands of users who trust VaultShare for secure file sharing.
              Get started in less than a minute.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center px-6 py-3 text-base font-medium text-blue-600 bg-white rounded-lg hover:bg-gray-100"
            >
              Create Free Account
              <ArrowRightIcon className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 VaultShare. Built with Django & Next.js.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white text-lg font-bold mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

