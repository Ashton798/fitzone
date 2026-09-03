import type { ReactNode } from 'react';
import MobileHeader from '@/components/MobileHeader';
import MobileTabBar from '@/components/MobileTabBar';

export default function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mobile-app-shell min-h-[100dvh] flex flex-col bg-dark-100" data-layout="mobile">
      <MobileHeader />
      <main className="flex-1 min-w-0 pb-[calc(60px+env(safe-area-inset-bottom))]">{children}</main>
      <MobileTabBar />
    </div>
  );
}
