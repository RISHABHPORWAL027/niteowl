import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { menuRepository } from '@/services/menu/menu.repository';
import { hubsRepository } from '@/services/hubs/hubs.repository';

const MINIMUM_ORDER_SUBTOTAL = 89;
const DEFAULT_PACKAGING_FEE = 10;
const DEFAULT_DELIVERY_FEE = 15;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, outletId, zoneId, amount: clientAmount, receipt, notes } = body;

    let finalAmount = 0;

    // 1. Price Verification & Anti-Tampering Engine
    if (items && Array.isArray(items) && items.length > 0) {
      let subtotal = 0;

      for (const item of items) {
        if (!item.menuItemId || !item.quantity || item.quantity <= 0) {
          continue;
        }
        const dbItem = await menuRepository.findById(item.menuItemId);
        const unitPrice = dbItem ? dbItem.basePrice : Number(item.price || 0);
        subtotal += unitPrice * Number(item.quantity);
      }

      if (subtotal < MINIMUM_ORDER_SUBTOTAL) {
        return NextResponse.json(
          {
            success: false,
            error: `Minimum order amount is ₹${MINIMUM_ORDER_SUBTOTAL}. Current subtotal is ₹${subtotal}.`,
          },
          { status: 400 }
        );
      }

      // Zone delivery fee calculation
      let deliveryFee = DEFAULT_DELIVERY_FEE;
      if (zoneId) {
        try {
          const zonesMap = await hubsRepository.findZones(outletId || 'outlet-bhawarkua');
          const allZones: any[] = Object.values(zonesMap).flat();
          const targetZone = allZones.find((z: any) => z.id === zoneId);
          if (targetZone && typeof targetZone.deliveryFee === 'number') {
            deliveryFee = targetZone.deliveryFee;
          }
        } catch (e) {
          deliveryFee = DEFAULT_DELIVERY_FEE;
        }
      }

      const calculatedTotal = subtotal + deliveryFee + DEFAULT_PACKAGING_FEE;

      // Reject if client attempted to underpay
      if (typeof clientAmount === 'number' && clientAmount > 0) {
        if (clientAmount < calculatedTotal - 1) {
          return NextResponse.json(
            {
              success: false,
              error: 'Security alert: Cart amount does not match verified menu item prices.',
            },
            { status: 400 }
          );
        }
      }

      finalAmount = calculatedTotal;
    } else if (typeof clientAmount === 'number' && clientAmount >= MINIMUM_ORDER_SUBTOTAL) {
      finalAmount = clientAmount;
    } else {
      return NextResponse.json(
        { success: false, error: `Minimum order amount is ₹${MINIMUM_ORDER_SUBTOTAL}` },
        { status: 400 }
      );
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    const isProduction = process.env.NODE_ENV === 'production';
    const isMockKey =
      !keyId ||
      keyId.includes('MockDemo') ||
      !keySecret ||
      keySecret.includes('mock_secret');

    // In production, prevent startup with fake or empty keys
    if (isProduction && isMockKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Razorpay production credentials (KEY_ID / KEY_SECRET) are missing or invalid.',
        },
        { status: 500 }
      );
    }

    // Amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(finalAmount * 100);

    if (!isMockKey) {
      try {
        const razorpay = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });

        const order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: receipt || `rcpt_${Date.now()}`,
          notes: {
            ...notes,
            serverCalculatedAmount: String(finalAmount),
            outletId: outletId || 'outlet-bhawarkua',
          },
        });

        return NextResponse.json({
          success: true,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId,
          isSimulation: false,
        });
      } catch (sdkError: any) {
        console.error('Razorpay SDK order creation error:', sdkError?.message);
        if (isProduction) {
          return NextResponse.json(
            { success: false, error: 'Razorpay order creation failed: ' + sdkError?.message },
            { status: 502 }
          );
        }
      }
    }

    // Local sandbox simulation for development only
    const mockOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return NextResponse.json({
      success: true,
      orderId: mockOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: keyId || 'rzp_test_placeholder',
      isSimulation: true,
      message: 'Razorpay order created in Sandbox Development mode.',
    });
  } catch (error: any) {
    console.error('Error in create-order route:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
