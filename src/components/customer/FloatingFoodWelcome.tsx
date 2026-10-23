'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { FloatingFoodHero, FloatingImageProps } from '@/components/ui/hero-section-7';

interface FloatingFoodWelcomeProps {
  onFinish: () => void;
  autoDismiss?: boolean;
  durationMs?: number;
}

export function FloatingFoodWelcome({
  onFinish,
  autoDismiss = false,
  durationMs = 2000,
}: FloatingFoodWelcomeProps) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Responsive floating images configured for mobile-first screens and larger displays
  const niteOwlHeroImages: FloatingImageProps[] = [
    {
      src: 'https://cdn.21st.dev/assets/mirror/cc/cc7d7fbb538d93322e189b55ae4c6eed95aab7da267a9a095b39216070ef65b0.png',
      alt: 'Juicy Cheeseburger',
      className:
        'w-20 sm:w-32 md:w-44 top-2 left-0 sm:top-6 sm:-left-4 md:top-8 md:-left-8 animate-float drop-shadow-xl',
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/95/95bc0d9d69e76d3729ca42f9525bafd449fd27fa41c9393d1deccb85d79b0639.png',
      alt: 'Bamboo Steamer Dumplings',
      className:
        'w-18 sm:w-28 md:w-36 top-3 right-0 sm:top-6 sm:-right-4 md:top-8 md:-right-6 animate-float-reverse drop-shadow-xl',
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/6e/6e4600ac05444d9dc0396906da4174dcfe42a64c14082d939f0f57cb2ed8113d.png',
      alt: 'Crispy Pizza Slice',
      className:
        'w-22 sm:w-32 md:w-40 bottom-12 right-0 sm:bottom-12 sm:-right-4 md:bottom-14 md:-right-6 animate-float drop-shadow-xl',
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/8e/8ec4fbab8445c1769d3200d674cd3731a0550b21c87bb8bc6938cb3a05932e5b.png',
      alt: 'Aromatic Basil Leaf',
      className:
        'w-5 sm:w-7 top-1/3 left-4 sm:left-6 md:left-4 animate-float-slow drop-shadow-md',
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/e7/e758e9c35a8360f201c40d0bf3e3433c2b6ff3f759763eb697cbc3803af80e18.png',
      alt: 'Fresh Tomato Slice',
      className:
        'w-5 sm:w-7 top-1/4 right-6 sm:right-8 md:right-6 animate-float-reverse drop-shadow-md',
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/e7/e758e9c35a8360f201c40d0bf3e3433c2b6ff3f759763eb697cbc3803af80e18.png',
      alt: 'Fresh Tomato Slice',
      className:
        'w-5 sm:w-7 bottom-24 left-6 sm:left-8 md:left-6 animate-float drop-shadow-md',
    },
  ];

  const handleComplete = () => {
    setIsExiting(true);
    setTimeout(() => {
      onFinish();
    }, 250);
  };

  useEffect(() => {
    // Only auto-dismiss if autoDismiss is explicitly enabled
    if (!autoDismiss) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);
      if (elapsed >= durationMs) {
        clearInterval(interval);
        handleComplete();
      }
    }, 30);

    return () => clearInterval(interval);
  }, [autoDismiss, durationMs]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f8faf9] text-gray-900 transition-all duration-300 ${
        isExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Optional Top Progress Line when autoDismiss is active */}
      {autoDismiss && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200/80 z-40 overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-[#239a4e] via-[#75cf5e] to-[#239a4e] transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Top Bar with Brand and Quick Skip to Homepage */}
      <header className="absolute top-4 left-0 right-0 z-30 px-5 flex items-center justify-between max-w-md sm:max-w-xl md:max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 shadow-2xs flex items-center justify-center text-base">
            🦉
          </div>
          <div>
            <span className="font-black text-xs text-gray-900 tracking-tight block">
              NiteOwl
            </span>
            <span className="text-[10px] text-gray-400 block -mt-0.5">
              Indore Midnight Kitchen
            </span>
          </div>
        </div>

        {/* Small Skip Button at Top to go straight to Homepage */}
        <button
          onClick={handleComplete}
          className="px-3.5 py-1.5 rounded-full bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-950 border border-gray-300 shadow-xs text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer ring-1 ring-black/5"
          aria-label="Skip to homepage"
        >
          <span>Skip</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </header>

      {/* Mobile-First Centered Container for Hero Content */}
      <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl mx-auto flex-1 flex flex-col justify-center relative overflow-hidden px-4">
        <FloatingFoodHero
          title="Late-Night Cravings, Solved."
          description="Piping hot meals, Double-Cheese Maggi & Chai delivered in 15 mins right to your door."
          images={niteOwlHeroImages}
          className="py-10 md:py-14 min-h-auto"
          badge="🌙 Open 7 PM – 4 AM • Indore"
          actions={
            <div className="space-y-3 w-full max-w-xs">
              {/* Feature Pills */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap text-[11px] font-bold text-gray-600">
                <span className="px-2.5 py-1 rounded-full bg-white border border-gray-200/80 shadow-2xs flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#239a4e] fill-[#239a4e]" />
                  <span>15-Min Delivery</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white border border-gray-200/80 shadow-2xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>Midnight Specials</span>
                </span>
              </div>

              {/* Enter Main Menu Button */}
              <button
                onClick={handleComplete}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#239a4e] hover:bg-[#1d8242] text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#239a4e]/25 active:scale-98 transition-all cursor-pointer ring-2 ring-[#75cf5e]/30"
              >
                <span>Enter Midnight Menu</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          }
        />
      </div>

      {/* Bottom Footer Note */}
      <footer className="absolute bottom-4 left-0 right-0 z-30 text-center px-4">
        <p className="text-[10px] text-gray-400 font-medium">
          Entering Indore's fastest late-night food menu...
        </p>
      </footer>
    </div>
  );
}
