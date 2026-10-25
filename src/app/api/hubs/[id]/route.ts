import { NextRequest, NextResponse } from 'next/server';
import { hubsService } from '@/services/hubs/hubs.service';
import { verifyRequestAuth } from '@/lib/authTokens';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Hub Manager credentials required.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const { action, zoneId } = body;

    if (action === 'toggleStore') {
      const updated = await hubsService.toggleStoreOpen(id);
      return NextResponse.json({ success: true, outlet: updated });
    }

    if (action === 'toggleRush') {
      const updated = await hubsService.toggleRushPaused(id);
      return NextResponse.json({ success: true, outlet: updated });
    }

    if (action === 'toggleZone') {
      if (!zoneId) {
        return NextResponse.json(
          { success: false, error: 'zoneId is required to toggle zone' },
          { status: 400 }
        );
      }
      const updated = await hubsService.toggleZoneActive(id, zoneId);
      return NextResponse.json({ success: true, zone: updated });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Supported: toggleStore, toggleRush, toggleZone' },
      { status: 400 }
    );
  } catch (error: any) {
    const isNotFound = error?.message?.includes('not found');
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update hub' },
      { status: isNotFound ? 404 : 400 }
    );
  }
}
