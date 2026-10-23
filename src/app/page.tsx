'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UtensilsCrossed, Sparkles } from 'lucide-react';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { ZoneSelectorSheet } from '@/components/customer/ZoneSelectorSheet';
import { MenuSection } from '@/components/customer/MenuSection';
import { CartFloatingBanner } from '@/components/customer/CartFloatingBanner';
import { CheckoutDrawer } from '@/components/customer/CheckoutDrawer';
import { LiveOrderTracker } from '@/components/customer/LiveOrderTracker';
import { ProfileDrawer } from '@/components/customer/ProfileDrawer';
import { FloatingFoodWelcome } from '@/components/customer/FloatingFoodWelcome';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';

export default function CustomerHomePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [customerSubTab, setCustomerSubTab] = useState<'menu' | 'track'>('menu');
  const [isZoneDrawerOpen, setIsZoneDrawerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const { cart, activeOrder, getCartItemCount, isCustomerAuthenticated } =
    useNiteOwlStore();
  const itemCount = getCartItemCount();

  // Route Protection & 2-Second Welcome Hero check on login/first arrival
  useEffect(() => {
    setIsMounted(true);
    if (!isCustomerAuthenticated) {
      router.replace('/login');
      return;
    }

    try {
      const justLoggedIn = sessionStorage.getItem('niteowl_show_welcome') === 'true';
      const welcomeSeen = sessionStorage.getItem('niteowl_welcome_seen') === 'true';
      const urlParams =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : null;
      const forceWelcome = urlParams?.get('welcome') === 'true';

      if (justLoggedIn || !welcomeSeen || forceWelcome) {
        setShowWelcome(true);
        sessionStorage.removeItem('niteowl_show_welcome');
        sessionStorage.setItem('niteowl_welcome_seen', 'true');
      }
    } catch (e) {
      // ignore
    }
  }, [isCustomerAuthenticated, router]);

  const handleExploreScroll = () => {
    const el = document.getElementById('menu-items-feed');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  if (!isMounted || !isCustomerAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-2xl animate-pulse">
            🦉
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-[#239a4e] rounded-full animate-spin" />
            <span>Verifying session...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#111827] flex flex-col font-sans selection:bg-[#75cf5e] selection:text-[#0c0e0d]">
      {/* Mobile-First Centered Container */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col bg-[#f8faf9] border-x border-gray-200/80 shadow-md relative min-h-screen pb-24">
        {/* Customer Top Sticky Header with Location Selector and Profile */}
        <CustomerHeader
          onOpenZoneDrawer={() => setIsZoneDrawerOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />

        {/* Main Feed */}
        <main className="flex-1 flex flex-col relative overflow-y-auto">
          {customerSubTab === 'menu' && (
            <div id="menu-items-feed">
              <MenuSection />
            </div>
          )}

          {customerSubTab === 'track' && (
            <div>
              <LiveOrderTracker onBackToMenu={() => setCustomerSubTab('menu')} />
            </div>
          )}
        </main>

        {/* ONLY ONE FLOATING BUTTON AT THE BOTTOM:
            1. If cart has items -> Floating Cart / Checkout Banner
            2. If cart is empty -> Single Floating "Explore Menu" Pill Button */}
        {customerSubTab === 'menu' && (
          <>
            {itemCount > 0 ? (
              <CartFloatingBanner onOpenCheckout={() => setIsCheckoutOpen(true)} />
            ) : (
              <div className="fixed bottom-6 left-0 right-0 z-40 px-4 pointer-events-none flex justify-center">
                <button
                  onClick={handleExploreScroll}
                  className="pointer-events-auto px-6 py-3 rounded-full bg-[#239a4e] hover:bg-[#1d8242] text-white font-bold text-xs shadow-xl shadow-[#239a4e]/25 flex items-center gap-2 active:scale-95 transition-all cursor-pointer ring-2 ring-[#75cf5e]/40"
                  aria-label="Explore Menu"
                >
                  <UtensilsCrossed className="w-4 h-4 stroke-[2.5]" />
                  <span>Explore Menu</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Location Selector Drawer */}
        <ZoneSelectorSheet
          isOpen={isZoneDrawerOpen}
          onClose={() => setIsZoneDrawerOpen(false)}
        />

        {/* Checkout Drawer */}
        <CheckoutDrawer
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onOrderPlaced={() => setCustomerSubTab('track')}
        />

        {/* Customer Profile Drawer */}
        <ProfileDrawer
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onTrackOrder={() => setCustomerSubTab('track')}
        />
      </div>

      {/* Animated Floating Food Welcome Hero - Stays until Skip is clicked so design can be fixed */}
      {showWelcome && (
        <FloatingFoodWelcome
          onFinish={() => setShowWelcome(false)}
          autoDismiss={false}
        />
      )}
    </div>
  );
}
