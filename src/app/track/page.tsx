'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LiveOrderTracker } from '@/components/customer/LiveOrderTracker';

export default function TrackOrderPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#111827] flex flex-col font-sans">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col bg-[#f8faf9] border-x border-gray-200/80 shadow-md relative min-h-screen">
        <LiveOrderTracker onBackToMenu={() => router.push('/')} />
      </div>
    </div>
  );
}
