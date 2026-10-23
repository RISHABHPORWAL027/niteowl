'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * @typedef FloatingImageProps
 * @property {string} src - The source URL for the image.
 * @property {string} alt - The alt text for the image for accessibility.
 * @property {string} className - Tailwind CSS classes for positioning, sizing, and animation.
 */
export interface FloatingImageProps {
  src: string;
  alt: string;
  className: string;
}

/**
 * @typedef FloatingFoodHeroProps
 * @property {string} title - The main heading text.
 * @property {string} description - The paragraph text below the heading.
 * @property {FloatingImageProps[]} images - An array of image objects to be displayed.
 * @property {string} [className] - Optional additional classes for the section container.
 * @property {string} [badge] - Optional pill badge above heading.
 * @property {React.ReactNode} [actions] - Optional action buttons or indicators.
 */
export interface FloatingFoodHeroProps {
  title: string;
  description: string;
  images: FloatingImageProps[];
  className?: string;
  badge?: string;
  actions?: React.ReactNode;
}

/**
 * A decorative SVG component for the background swirl lines.
 */
export const Swirls = () => (
  <>
    <svg
      className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 text-emerald-100/70 pointer-events-none"
      width="600"
      height="600"
      viewBox="0 0 600 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M515.266 181.33C377.943 51.564 128.537 136.256 50.8123 293.565C-26.9127 450.874 125.728 600 125.728 600"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
    <svg
      className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 text-emerald-100/70 pointer-events-none"
      width="700"
      height="700"
      viewBox="0 0 700 700"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M26.8838 528.274C193.934 689.816 480.051 637.218 594.397 451.983C708.742 266.748 543.953 2.22235 543.953 2.22235"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  </>
);

/**
 * A responsive and animated hero section component.
 * Optimized for mobile-first viewports with scalable sizing on larger screens.
 */
export function FloatingFoodHero({
  title,
  description,
  images,
  className,
  badge,
  actions,
}: FloatingFoodHeroProps) {
  return (
    <section
      className={cn(
        'relative w-full min-h-[60vh] lg:min-h-[80vh] flex items-center justify-center overflow-hidden bg-background py-16 md:py-28 select-none',
        className
      )}
    >
      {/* Background Swirls & Radial Ambient Glow */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-100/50 rounded-full blur-3xl -z-10" />
        <Swirls />
      </div>

      {/* Render floating images with staggered animation delays */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        {images.map((image, index) => (
          <img
            key={index}
            src={image.src}
            alt={image.alt}
            className={cn('absolute object-contain drop-shadow-lg will-change-transform', image.className)}
            style={{ animationDelay: `${index * 250}ms` }}
          />
        ))}
      </div>

      {/* Text Content */}
      <div className="relative z-20 container mx-auto px-4 text-center max-w-xl">
        {badge && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[#239a4e] text-xs font-black tracking-wide uppercase mb-4 shadow-2xs">
            {badge}
          </div>
        )}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-gray-900 leading-[1.18] sm:leading-[1.15]">
          {title}
        </h1>
        <p className="mt-3 text-xs sm:text-sm md:text-base leading-relaxed text-gray-600 max-w-md mx-auto font-medium">
          {description}
        </p>

        {actions && <div className="mt-6 flex justify-center">{actions}</div>}
      </div>
    </section>
  );
}

// --- Default Demo ---
export default function FloatingFoodHeroDemo() {
  const heroImages: FloatingImageProps[] = [
    {
      src: 'https://cdn.21st.dev/assets/mirror/cc/cc7d7fbb538d93322e189b55ae4c6eed95aab7da267a9a095b39216070ef65b0.png',
      alt: 'A delicious cheeseburger',
      className: 'w-28 sm:w-44 md:w-56 -top-2 -left-2 sm:top-8 sm:left-8 md:top-14 md:left-14 animate-float',
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/95/95bc0d9d69e76d3729ca42f9525bafd449fd27fa41c9393d1deccb85d79b0639.png',
      alt: 'A bamboo steamer with dumplings',
      className: 'w-24 sm:w-36 md:w-44 top-2 -right-2 sm:top-10 sm:right-8 md:top-14 md:right-14 animate-float-reverse',
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/6e/6e4600ac05444d9dc0396906da4174dcfe42a64c14082d939f0f57cb2ed8113d.png',
      alt: 'A slice of pizza',
      className: 'w-28 sm:w-36 md:w-48 bottom-4 -right-3 sm:bottom-8 sm:right-8 md:bottom-12 md:right-16 animate-float',
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/8e/8ec4fbab8445c1769d3200d674cd3731a0550b21c87bb8bc6938cb3a05932e5b.png',
      alt: 'A basil leaf',
      className: 'w-7 sm:w-10 top-1/3 left-4 sm:left-1/4 animate-float-slow',
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/e7/e758e9c35a8360f201c40d0bf3e3433c2b6ff3f759763eb697cbc3803af80e18.png',
      alt: 'A slice of tomato',
      className: 'w-7 sm:w-9 top-1/4 right-6 sm:right-1/4 animate-float-reverse',
    },
    {
      src: 'https://cdn.21st.dev/assets/mirror/e7/e758e9c35a8360f201c40d0bf3e3433c2b6ff3f759763eb697cbc3803af80e18.png',
      alt: 'A slice of tomato',
      className: 'w-7 sm:w-9 bottom-16 left-6 sm:left-1/4 animate-float',
    },
  ];

  return (
    <div className="w-full">
      <FloatingFoodHero
        title="Better food for more people"
        description="For over a decade, we've enabled our customers to discover new tastes, delivered right to their doorstep."
        images={heroImages}
      />
    </div>
  );
}
