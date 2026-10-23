import { NextRequest, NextResponse } from 'next/server';
import { hubsService } from '@/services/hubs/hubs.service';

export async function GET(req: NextRequest) {
  try {
    const outlets = await hubsService.getOutlets();
    const zones = await hubsService.getZones();

    return NextResponse.json({
      success: true,
      outlets,
      zones,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch hubs' },
      { status: 500 }
    );
  }
}
