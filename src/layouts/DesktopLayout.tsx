import type { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function DesktopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-dark-100" data-layout="desktop">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
