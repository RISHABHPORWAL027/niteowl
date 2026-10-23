'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  ArrowRight,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  KeyRound,
  Building2,
} from 'lucide-react';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';

export default function AdminLoginPage() {
  const router = useRouter();
  const { adminLogin, currentOutlet } = useNiteOwlStore();

  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!passcode.trim()) {
      setErrorMsg('Please enter your Hub Manager passcode.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const success = adminLogin(passcode);
      if (success) {
        router.push('/admin');
      } else {
        setIsLoading(false);
        setErrorMsg('Invalid Hub Manager Passcode. Try: bhawarkua or 4400');
      }
    }, 600);
  };

  const handleQuickDemoLogin = (code: string) => {
    setPasscode(code);
    setIsLoading(true);
    setTimeout(() => {
      adminLogin(code);
      router.push('/admin');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#0c0e0d] text-[#e5f4eb] flex flex-col justify-between p-4 selection:bg-[#75cf5e] selection:text-[#0c0e0d]">
      {/* Top Bar with Back to Customer Store */}
      <div className="max-w-md w-full mx-auto pt-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#88998f] hover:text-[#75cf5e] transition-colors py-1.5 px-3 rounded-xl bg-[#151917] border border-[#1c211e]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Customer App</span>
        </Link>
        <span className="text-[11px] font-mono text-[#75cf5e] bg-[#151917] border border-[#239a4e]/40 px-2.5 py-0.5 rounded-full font-bold">
          OPS PORTAL
        </span>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto p-6 md:p-8 rounded-3xl bg-[#151917] border border-[#1c211e] shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#75cf5e] text-[#0c0e0d] font-black text-2xl flex items-center justify-center shadow-lg shadow-[#75cf5e]/30 mx-auto">
            🦉
          </div>
          <div>
            <h1 className="text-xl font-black text-[#e5f4eb] tracking-tight">
              Hub Manager Console
            </h1>
            <p className="text-xs text-[#88998f] mt-1">
              Late-Night Operations &amp; Concentric Zone Control
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0c0e0d] border border-[#1c211e] text-[11px] text-[#88998f]">
            <Building2 className="w-3 h-3 text-[#75cf5e]" />
            <span>Target Hub: {currentOutlet.name} (Indore)</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#88998f] flex items-center justify-between">
              <span>Manager Passcode / PIN</span>
              <span className="text-[10px] text-[#333333]">Security Level 1</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter 4-digit PIN (e.g. 4400 or bhawarkua)"
                className="w-full bg-[#0c0e0d] border border-[#1c211e] rounded-xl px-3.5 py-2.5 text-xs text-[#e5f4eb] placeholder:text-[#88998f] focus:border-[#75cf5e] outline-none transition-colors"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-[#88998f] absolute right-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#75cf5e] hover:bg-[#68bc53] text-[#0c0e0d] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#75cf5e]/25 active:scale-[0.98] transition-all disabled:opacity-70 cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-[#0c0e0d] border-t-transparent rounded-full animate-spin" />
                <span>Authorizing Hub Access...</span>
              </span>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Enter Hub Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Box */}
        <div className="p-3.5 rounded-2xl bg-[#0c0e0d] border border-[#1c211e] space-y-2">
          <p className="text-[11px] font-bold text-[#88998f] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#75cf5e]" />
            Quick Demo Presets
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickDemoLogin('bhawarkua')}
              className="p-2 rounded-xl bg-[#151917] hover:bg-[#1c211e] border border-[#1c211e] hover:border-[#239a4e]/40 text-left transition-colors cursor-pointer group"
            >
              <span className="text-[11px] font-bold text-[#e5f4eb] group-hover:text-[#75cf5e] block">
                Bhawarkua Hub
              </span>
              <span className="text-[10px] text-[#88998f]">
                Code: <code className="text-[#75cf5e]">bhawarkua</code>
              </span>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('4400')}
              className="p-2 rounded-xl bg-[#151917] hover:bg-[#1c211e] border border-[#1c211e] hover:border-[#239a4e]/40 text-left transition-colors cursor-pointer group"
            >
              <span className="text-[11px] font-bold text-[#e5f4eb] group-hover:text-[#75cf5e] block">
                Shift Manager PIN
              </span>
              <span className="text-[10px] text-[#88998f]">
                PIN: <code className="text-[#75cf5e]">4400</code>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto pb-4 text-center text-[11px] text-[#88998f]">
        NiteOwl Dark-Kitchen Ops • Hyper-Local Concentric Dispatch Engine
      </div>
    </div>
  );
}
