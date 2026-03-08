// MTS Angola - Clients API
// CRUD operations for clients

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all clients
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        include: {
          interactions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { interactions: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.client.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Clients API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST - Create a new client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, company, language, source, notes } = body;

    if (!name || !email) {
      return NextResponse.json({
        success: false,
        error: 'Name and email are required',
      }, { status: 400 });
    }

    // Check if email already exists
    const existing = await db.client.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'Client with this email already exists',
      }, { status: 400 });
    }

    const client = await db.client.create({
      data: {
        name,
        email,
        phone,
        company,
        language: language || 'PT',
        source,
        notes,
        status: 'cold',
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        agent: 'system',
        action: 'create_client',
        entityType: 'client',
        entityId: client.id,
        details: JSON.stringify({ name, email }),
        status: 'success',
      },
    });

    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    console.error('Clients API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// PUT - Update a client
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Client ID is required',
      }, { status: 400 });
    }

    const client = await db.client.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    console.error('Clients API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// DELETE - Delete a client
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Client ID is required',
      }, { status: 400 });
    }

    await db.client.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clients API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
