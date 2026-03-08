// MTS Angola - Schedules API
// CRUD operations for vessel schedules

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List schedules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const port = searchParams.get('port');
    const status = searchParams.get('status');
    const upcoming = searchParams.get('upcoming') === 'true';

    const skip = (page - 1) * limit;

    const where: any = {};
    if (port) where.port = port;
    if (status) where.status = status;
    if (upcoming) {
      where.eta = { gte: new Date() };
      where.status = 'scheduled';
    }

    const [schedules, total] = await Promise.all([
      db.vesselSchedule.findMany({
        where,
        include: { vessel: true },
        skip,
        take: limit,
        orderBy: { eta: 'asc' },
      }),
      db.vesselSchedule.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: schedules,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Schedules API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST - Create a new schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vesselId, port, eta, etd, cargoType, notes, source } = body;

    if (!vesselId || !port || !eta) {
      return NextResponse.json({
        success: false,
        error: 'Vessel ID, port, and ETA are required',
      }, { status: 400 });
    }

    const schedule = await db.vesselSchedule.create({
      data: {
        vesselId,
        port,
        eta: new Date(eta),
        etd: etd ? new Date(etd) : null,
        cargoType,
        notes,
        source: source || 'manual',
        status: 'scheduled',
      },
      include: { vessel: true },
    });

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Schedules API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// PUT - Update a schedule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Schedule ID is required',
      }, { status: 400 });
    }

    const updateData: any = { ...data };
    if (data.eta) updateData.eta = new Date(data.eta);
    if (data.etd) updateData.etd = new Date(data.etd);

    const schedule = await db.vesselSchedule.update({
      where: { id },
      data: updateData,
      include: { vessel: true },
    });

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Schedules API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// DELETE - Delete a schedule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Schedule ID is required',
      }, { status: 400 });
    }

    await db.vesselSchedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Schedules API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
