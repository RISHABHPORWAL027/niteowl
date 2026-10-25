import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ordersRepository } from '@/services/orders/orders.repository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json(
        { success: false, error: 'Order ID and Payment ID are required' },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const isProduction = process.env.NODE_ENV === 'production';
    const isMockKey = !keySecret || keySecret.includes('mock_secret');

    if (isProduction && isMockKey) {
      return NextResponse.json(
        { success: false, error: 'Razorpay secret key is not configured for production.' },
        { status: 500 }
      );
    }

    // In production, NEVER accept sandbox signatures
    if (isProduction) {
      if (
        razorpay_signature === 'test_sandbox_signature' ||
        razorpay_payment_id?.startsWith('pay_test_sim_')
      ) {
        return NextResponse.json(
          { success: false, error: 'Test signatures are prohibited in production.' },
          { status: 403 }
        );
      }
    }

    if (!isMockKey) {
      if (!razorpay_signature) {
        return NextResponse.json(
          { success: false, error: 'razorpay_signature is required' },
          { status: 400 }
        );
      }

      // Check for development sandbox signature bypass
      const isDevSandbox =
        !isProduction &&
        razorpay_signature === 'test_sandbox_signature' &&
        razorpay_payment_id?.startsWith('pay_test_');

      if (!isDevSandbox) {
        const generatedSignature = crypto
          .createHmac('sha256', keySecret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');

        const genBuf = Buffer.from(generatedSignature);
        const sigBuf = Buffer.from(razorpay_signature);

        const isSignatureValid =
          genBuf.length === sigBuf.length && crypto.timingSafeEqual(genBuf, sigBuf);

        if (!isSignatureValid) {
          return NextResponse.json(
            { success: false, error: 'Cryptographic signature verification failed' },
            { status: 400 }
          );
        }
      }
    }

    // Secure Order State Transition on Backend
    try {
      const orders = await ordersRepository.findAll();
      const matchingOrder = orders.find(
        (o) => o.razorpayOrderId === razorpay_order_id || o.id === razorpay_order_id
      );
      if (matchingOrder) {
        await ordersRepository.update(matchingOrder.id, {
          paymentStatus: 'PAID',
          razorpayPaymentId: razorpay_payment_id,
        });
      }
    } catch (orderUpdateErr) {
      console.warn('Could not immediately update order state:', orderUpdateErr);
    }

    return NextResponse.json({
      success: true,
      verified: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch (error: any) {
    console.error('Error in verify-payment route:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
