// MTS Angola - Dashboard API
// Provides aggregated data for the main dashboard

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getVesselStats } from '@/lib/services/vessel-tracking-service';
import { getEmailStats } from '@/lib/services/email-service';
import { getWhatsAppStats } from '@/lib/services/whatsapp-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'today';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (range) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    // Gather all statistics in parallel
    const [
      vesselStats,
      emailStats,
      whatsappStats,
      clientStats,
      recentActivity,
      upcomingArrivals,
    ] = await Promise.all([
      // Vessel statistics
      getVesselStats(),
      
      // Email statistics (7 days)
      getEmailStats(7),
      
      // WhatsApp statistics (30 days)
      getWhatsAppStats(30),
      
      // Client statistics
      Promise.all([
        db.client.count(),
        db.client.groupBy({
          by: ['status'],
          _count: true,
        }),
        db.client.count({
          where: { createdAt: { gte: startDate } },
        }),
      ]).then(([total, byStatus, newThisPeriod]) => ({
        total,
        byStatus: byStatus.reduce((acc, s) => {
          acc[s.status] = s._count;
          return acc;
        }, {} as Record<string, number>),
        newThisPeriod,
      })),
      
      // Recent activity logs
      db.activityLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
      
      // Upcoming vessel arrivals
      db.vesselSchedule.findMany({
        where: {
          eta: { gte: now },
          status: 'scheduled',
        },
        include: { vessel: true },
        orderBy: { eta: 'asc' },
        take: 10,
      }),
    ]);

    // Calculate estimated value (rough estimate based on quotations)
    const estimatedValue = emailStats.byAgent
      .filter(a => a.agent === 'claudia')
      .reduce((sum, a) => sum + a._count * 5000, 0);

    // Build dashboard data
    const dashboardData = {
      overview: {
        vesselsTracked: vesselStats.upcomingCount,
        totalClients: clientStats.total,
        newContacts: clientStats.newThisPeriod,
        emailsSent: emailStats.sent,
        estimatedValue,
      },
      vessels: {
        total: vesselStats.totalVessels,
        upcoming: vesselStats.upcomingCount,
        byPort: vesselStats.byPort,
        arrivals: upcomingArrivals.map(a => ({
          id: a.id,
          vesselName: a.vessel.name,
          imo: a.vessel.imo,
          port: a.port,
          eta: a.eta,
          owner: a.vessel.owner,
        })),
      },
      clients: {
        total: clientStats.total,
        byStatus: clientStats.byStatus,
        newThisPeriod: clientStats.newThisPeriod,
      },
      communications: {
        emails: emailStats,
        whatsapp: whatsappStats,
      },
      activity: recentActivity.map(a => ({
        id: a.id,
        agent: a.agent,
        action: a.action,
        entityType: a.entityType,
        status: a.status,
        timestamp: a.createdAt,
      })),
      agents: {
        pedro: {
          name: 'Pedro Matos',
          role: 'Operacoes & Inteligencia',
          email: 'supply.chain@mts-angola.com',
          lastActivity: recentActivity.find(a => a.agent === 'pedro')?.createdAt || null,
        },
        mariana: {
          name: 'Mariana Silva',
          role: 'Marketing & CRM',
          email: 'info@mts-angola.com',
          lastActivity: recentActivity.find(a => a.agent === 'mariana')?.createdAt || null,
        },
        claudia: {
          name: 'Claudia Santos',
          role: 'CEO Comercial & Financeiro',
          email: 'accounts@mts-angola.com',
          lastActivity: recentActivity.find(a => a.agent === 'claudia')?.createdAt || null,
        },
      },
    };

    return NextResponse.json({ 
      success: true, 
      data: dashboardData,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
