// MTS Angola - Vessels API
// CRUD operations for vessels

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all vessels
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const owner = searchParams.get('owner');

    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { imo: { contains: search } },
      ];
    }
    if (owner) {
      where.owner = owner;
    }

    const [vessels, total] = await Promise.all([
      db.vessel.findMany({
        where,
        include: {
          schedules: {
            where: { eta: { gte: new Date() } },
            take: 1,
            orderBy: { eta: 'asc' },
          },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      db.vessel.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: vessels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Vessels API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST - Create a new vessel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, imo, type, owner, agent, flag, grossTonnage } = body;

    if (!name || !imo) {
      return NextResponse.json({
        success: false,
        error: 'Name and IMO are required',
      }, { status: 400 });
    }

    // Check if IMO already exists
    const existing = await db.vessel.findUnique({
      where: { imo },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'Vessel with this IMO already exists',
      }, { status: 400 });
    }

    const vessel = await db.vessel.create({
      data: {
        name,
        imo,
        type,
        owner,
        agent,
        flag,
        grossTonnage,
      },
    });

    return NextResponse.json({ success: true, data: vessel });
  } catch (error) {
    console.error('Vessels API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
