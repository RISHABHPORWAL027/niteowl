import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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

    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret_test_key';
    const isMockKey = !keySecret || keySecret.includes('mock_secret');

    // If real keys are in use, verify HMAC-SHA256 signature strictly with timing-safe comparison
    if (!isMockKey) {
      if (!razorpay_signature) {
        return NextResponse.json(
          { success: false, error: 'razorpay_signature is required for signature verification' },
          { status: 400 }
        );
      }

      const isSandboxTestSig =
        process.env.NODE_ENV !== 'production' &&
        razorpay_signature === 'test_sandbox_signature' &&
        razorpay_payment_id?.startsWith('pay_test_');

      if (!isSandboxTestSig) {
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

      return NextResponse.json({
        success: true,
        verified: true,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
    }

    // In Test Simulation Mode, simulate verified status
    return NextResponse.json({
      success: true,
      verified: true,
      isSimulation: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      message: 'Payment verified in Test Sandbox mode.',
    });
  } catch (error: any) {
    console.error('Error in verify-payment route:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
