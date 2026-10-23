'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Moon,
  Building,
  Lock,
  ArrowRight,
  CreditCard,
  QrCode,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useNiteOwlStore } from '@/store/useNiteOwlStore';
import { loadRazorpayScript } from '@/lib/razorpay';

interface CheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: () => void;
}

export function CheckoutDrawer({
  isOpen,
  onClose,
  onOrderPlaced,
}: CheckoutDrawerProps) {
  const {
    cart,
    currentZone,
    currentOutlet,
    selectedLandmark,
    getCartSubtotal,
    getDeliveryFee,
    getTotal,
    packagingFee,
    placeOrder,
    customerUser,
  } = useNiteOwlStore();

  const [customerName, setCustomerName] = useState(
    customerUser?.displayName || 'Priya Sharma'
  );
  const [customerPhone, setCustomerPhone] = useState(
    customerUser?.phoneNumber || '+91 98260 11234'
  );
  const [roomNo, setRoomNo] = useState('Flat 302, 3rd Floor / Wing A');
  const [leaveAtGate, setLeaveAtGate] = useState(true);
  const [silentDelivery, setSilentDelivery] = useState(true);
  const [maskedCall, setMaskedCall] = useState(true);
  const [riderNotes, setRiderNotes] = useState('Leave with night security or doorstep.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Simulation test modal for sandbox testing
  const [showSimModal, setShowSimModal] = useState(false);
  const [simOrderId, setSimOrderId] = useState<string>('');

  if (!isOpen) return null;

  const subtotal = getCartSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();

  const finalizeOrder = (razorpayOrderId?: string, razorpayPaymentId?: string) => {
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#75cf5e', '#239a4e', '#ffffff'],
      });
    } catch (e) {
      // ignore
    }

    placeOrder({
      customerName,
      customerPhone,
      hostelPgOrFlat: selectedLandmark,
      roomNo,
      landmark: `${selectedLandmark}, ${currentZone?.name}`,
      leaveAtGate,
      silentDelivery,
      maskedCall,
      riderNotes,
      paymentMethod: 'RAZORPAY',
      paymentStatus: 'PAID',
      razorpayOrderId,
      razorpayPaymentId,
    });

    setIsSubmitting(false);
    setShowSimModal(false);
    onClose();
    onOrderPlaced();
  };

  const handlePayAndOrder = async () => {
    setIsSubmitting(true);
    setPaymentError(null);

    try {
      // 1. Create Order on Backend API
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          receipt: `rcpt_${Date.now()}`,
          notes: {
            customerName,
            customerPhone,
            outlet: currentOutlet.name,
            zone: currentZone?.name,
          },
        }),
      });

      const orderData = await res.json();

      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize payment gateway');
      }

      const { orderId, amount, currency, keyId, isSimulation } = orderData;

      // 2. If running with real credentials or Razorpay checkout script loaded
      const isScriptLoaded = await loadRazorpayScript();

      if (isScriptLoaded && !isSimulation && (window as any).Razorpay) {
        const options = {
          key: keyId,
          amount,
          currency: currency || 'INR',
          name: 'NiteOwl Late-Night Food',
          description: `Express Midnight Meal (${cart.length} items)`,
          image: '/favicon.ico',
          order_id: orderId,
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            // 3. Cryptographic Signature Verification
            try {
              const verifyRes = await fetch('/api/razorpay/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                finalizeOrder(response.razorpay_order_id, response.razorpay_payment_id);
              } else {
                setPaymentError('Payment verification failed. Please try again.');
                setIsSubmitting(false);
              }
            } catch (err: any) {
              setPaymentError('Verification network error: ' + err.message);
              setIsSubmitting(false);
            }
          },
          prefill: {
            name: customerName,
            contact: customerPhone.replace(/\D/g, '').slice(-10),
          },
          theme: {
            color: '#239a4e',
          },
          modal: {
            ondismiss: () => {
              setIsSubmitting(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Fallback: Test Mode Sandbox Simulation Dialog
        // Allows testing UPI / Card success states locally without requiring registered KYC credentials
        setSimOrderId(orderId);
        setShowSimModal(true);
      }
    } catch (error: any) {
      console.error('Payment Error:', error);
      setPaymentError(error?.message || 'Payment initiation failed. Please retry.');
      setIsSubmitting(false);
    }
  };

  const handleSimulatedSuccess = async (method: string) => {
    setIsSubmitting(true);
    const mockPaymentId = `pay_test_${method}_${Date.now()}`;

    try {
      const verifyRes = await fetch('/api/razorpay/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: simOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: 'test_sandbox_signature',
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        finalizeOrder(simOrderId, mockPaymentId);
      } else {
        setPaymentError('Payment verification failed.');
        setIsSubmitting(false);
      }
    } catch (err) {
      finalizeOrder(simOrderId, mockPaymentId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white border-t border-gray-200 rounded-t-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Drawer Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[#239a4e] text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#239a4e] animate-pulse" />
              Order Review &amp; Express Dispatch
            </div>
            <h3 className="font-bold text-gray-900 text-sm">
              Confirm Midnight Order
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-[#f8faf9]">
          {/* Delivery Address Card */}
          <div className="p-3.5 bg-white border border-gray-200 rounded-2xl space-y-2 shadow-xs">
            <div className="flex items-start justify-between">
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#239a4e] flex items-center justify-center shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs leading-snug">
                    {selectedLandmark}
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Indore • Estimated arrival in ~{currentZone?.estimatedDeliveryMins || 15} mins
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#239a4e] border border-emerald-200 text-[10px] font-bold">
                Fast Track
              </span>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <label className="text-[10px] font-semibold text-gray-500 block mb-1">
                House / Flat / Tower / Building Details:
              </label>
              <input
                type="text"
                value={roomNo}
                onChange={(e) => setRoomNo(e.target.value)}
                placeholder="e.g. Flat 302, Floor 3, Tower B"
                className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:border-[#239a4e] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Customer Late-Night Delivery Preferences */}
          <div className="p-3.5 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-[#239a4e]" />
                Late-Night Delivery Preferences
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <span className="text-gray-700">Leave at Main Gate / Security Guard</span>
                <input
                  type="checkbox"
                  checked={leaveAtGate}
                  onChange={(e) => setLeaveAtGate(e.target.checked)}
                  className="rounded text-[#239a4e] focus:ring-[#239a4e] w-4 h-4 cursor-pointer accent-[#239a4e]"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <span className="text-gray-700">Silent Delivery (No Honking / No Doorbell)</span>
                <input
                  type="checkbox"
                  checked={silentDelivery}
                  onChange={(e) => setSilentDelivery(e.target.checked)}
                  className="rounded text-[#239a4e] focus:ring-[#239a4e] w-4 h-4 cursor-pointer accent-[#239a4e]"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <span className="text-gray-700">Mask Contact Number to Pilot</span>
                <input
                  type="checkbox"
                  checked={maskedCall}
                  onChange={(e) => setMaskedCall(e.target.checked)}
                  className="rounded text-[#239a4e] focus:ring-[#239a4e] w-4 h-4 cursor-pointer accent-[#239a4e]"
                />
              </label>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <input
                type="text"
                value={riderNotes}
                onChange={(e) => setRiderNotes(e.target.value)}
                placeholder="Special delivery notes (e.g. Call once outside)"
                className="w-full text-[11px] px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 focus:outline-none focus:border-[#239a4e]"
              />
            </div>
          </div>

          {/* Payment Gateway Card */}
          <div className="p-3.5 bg-white border border-[#239a4e]/30 rounded-2xl space-y-2 shadow-xs bg-gradient-to-br from-emerald-50/40 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#239a4e] text-white flex items-center justify-center font-black text-xs shadow-xs">
                  ₹
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">
                    Razorpay Online Payment
                  </h4>
                  <p className="text-[10px] text-gray-500">
                    UPI, GPay, PhonePe, Paytm, Cards, NetBanking
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                Test Mode
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-600">
              <ShieldCheck className="w-3.5 h-3.5 text-[#239a4e] shrink-0" />
              <span>Instant refund protection &amp; 100% encrypted checkout</span>
            </div>
          </div>

          {/* Payment Error Alert */}
          {paymentError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* Order Items Preview */}
          <div className="p-3.5 bg-white border border-gray-200 rounded-2xl space-y-2 text-xs shadow-xs">
            <h4 className="font-bold text-gray-900 pb-1 border-b border-gray-100 flex items-center justify-between">
              <span>Items in Midnight Cart</span>
              <span className="text-gray-500 font-normal">{cart.length} item(s)</span>
            </h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {cart.map((item) => (
                <div
                  key={item.menuItemId}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#239a4e]">
                      {item.quantity}x
                    </span>
                    <span className="text-gray-900 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bill Breakdown */}
          <div className="p-3.5 bg-white border border-gray-200 rounded-2xl space-y-2 text-xs shadow-xs">
            <h4 className="font-bold text-gray-900 pb-1 border-b border-gray-100">
              Bill Details
            </h4>
            <div className="flex justify-between text-gray-500">
              <span>Item Total</span>
              <span className="text-gray-900 font-semibold">₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>
                Delivery Fee ({deliveryFee === 0 ? 'Free Delivery' : 'Standard'})
              </span>
              <span className="font-semibold text-[#239a4e]">
                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Midnight Spill-Proof Packaging</span>
              <span className="text-gray-900 font-semibold">₹{packagingFee}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Govt. Taxes</span>
              <span className="text-[#239a4e] font-semibold">₹0</span>
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-between items-baseline font-bold text-sm text-gray-900">
              <span>To Pay</span>
              <span className="text-base font-black text-[#239a4e]">
                ₹{total}
              </span>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between gap-3 shadow-lg">
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
              Total Amount
            </div>
            <div className="text-base font-black text-[#239a4e]">₹{total}</div>
          </div>

          <button
            onClick={handlePayAndOrder}
            disabled={isSubmitting}
            className="flex-1 max-w-[240px] py-3 rounded-xl bg-[#239a4e] hover:bg-[#1d8242] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-[#239a4e]/20 active:scale-95 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connecting Razorpay...
              </span>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Pay via Razorpay • ₹{total}</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Razorpay Test Mode Sandbox Dialog */}
      {showSimModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                  R
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">
                    Razorpay Sandbox
                  </h4>
                  <p className="text-[10px] text-amber-600 font-bold">
                    Test Mode Active • No real money charged
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSimModal(false);
                  setIsSubmitting(false);
                }}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 font-semibold block uppercase">
                  Order Payable
                </span>
                <span className="text-lg font-black text-gray-900">₹{total}</span>
              </div>
              <span className="text-[10px] font-mono text-gray-400">
                {simOrderId.slice(0, 16)}...
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-medium">
                Select test payment action:
              </p>

              {/* UPI Success simulation */}
              <button
                type="button"
                onClick={() => handleSimulatedSuccess('UPI_SUCCESS')}
                className="w-full py-2.5 px-3 rounded-xl bg-[#239a4e] hover:bg-[#1d8242] text-white font-bold text-xs flex items-center justify-between transition-colors cursor-pointer shadow-sm shadow-[#239a4e]/20"
              >
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  <span>Simulate UPI Payment (Success)</span>
                </div>
                <Zap className="w-3.5 h-3.5 text-amber-300" />
              </button>

              {/* Card Success simulation */}
              <button
                type="button"
                onClick={() => handleSimulatedSuccess('CARD_SUCCESS')}
                className="w-full py-2.5 px-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Simulate Card / NetBanking (Success)</span>
                </div>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </button>

              {/* Cancel */}
              <button
                type="button"
                onClick={() => {
                  setShowSimModal(false);
                  setIsSubmitting(false);
                  setPaymentError('Payment was cancelled by user.');
                }}
                className="w-full py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel Transaction
              </button>
            </div>

            <div className="text-[10px] text-center text-gray-400 pt-1">
              Supports real Razorpay checkout popup once valid Key ID is added to .env.local
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
