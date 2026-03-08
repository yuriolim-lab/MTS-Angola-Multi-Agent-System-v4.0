// MTS Angola - Pedro Agent API (Market Intelligence)
// Handles vessel tracking and reporting

import { NextRequest, NextResponse } from 'next/server';
import { 
  trackVessels, 
  getUpcomingArrivals, 
  getVesselStats,
  checkClientVesselArrival
} from '@/lib/services/vessel-tracking-service';
import { sendVesselReport } from '@/lib/services/email-service';
import { db } from '@/lib/db';

// GET - Get vessel tracking data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';
    const days = parseInt(searchParams.get('days') || '30');

    switch (action) {
      case 'stats':
        const stats = await getVesselStats();
        return NextResponse.json({ success: true, data: stats });

      case 'upcoming':
        const upcoming = await getUpcomingArrivals(days);
        return NextResponse.json({ success: true, data: upcoming });

      case 'schedules':
        const schedules = await db.vesselSchedule.findMany({
          include: { vessel: true },
          orderBy: { eta: 'asc' },
          take: 50,
        });
        return NextResponse.json({ success: true, data: schedules });

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Pedro API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST - Execute vessel tracking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, count = 10, sendReport = false } = body;

    switch (action) {
      case 'track':
        // Execute vessel tracking
        const result = await trackVessels({ count });

        // Send report to Mariana if requested
        if (sendReport && result.vessels.length > 0) {
          await sendVesselReport(result.vessels.map(v => ({
            name: v.name,
            imo: v.imo,
            port: v.port,
            eta: v.eta,
            owner: v.owner,
          })));
        }

        return NextResponse.json({ 
          success: true, 
          data: {
            tracked: result.tracked,
            vessels: result.vessels,
            reportSent: sendReport,
          }
        });

      case 'check_client_vessel':
        // Check if a client has a vessel arriving
        const { clientEmail } = body;
        const clientVessel = await checkClientVesselArrival(clientEmail);
        return NextResponse.json({ success: true, data: clientVessel });

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Pedro API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
