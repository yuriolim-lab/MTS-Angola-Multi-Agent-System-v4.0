// MTS Angola - Automation API
// Handles scheduled tasks for the multi-agent system

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trackVessels, getUpcomingArrivals, checkClientVesselArrival } from '@/lib/services/vessel-tracking-service';
import { sendEmail, sendDailyReportToManager, sendVesselReport, EMAIL_ACCOUNTS } from '@/lib/services/email-service';
import { sendWeeklyReport } from '@/lib/services/whatsapp-service';
import { generateReengagementEmail } from '@/lib/services/ai-service';

// GET - Get automation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        const lastRuns = await db.systemConfig.findMany({
          where: {
            key: { in: ['last_daily_tracking', 'last_daily_report', 'last_weekly_report'] }
          }
        });

        return NextResponse.json({
          success: true,
          data: {
            automations: {
              dailyTracking: {
                enabled: true,
                lastRun: lastRuns.find(c => c.key === 'last_daily_tracking')?.value || null,
                schedule: 'Daily at 06:00'
              },
              dailyReport: {
                enabled: true,
                lastRun: lastRuns.find(c => c.key === 'last_daily_report')?.value || null,
                schedule: 'Mon-Fri at 18:00'
              },
              weeklyReport: {
                enabled: true,
                lastRun: lastRuns.find(c => c.key === 'last_weekly_report')?.value || null,
                schedule: 'Friday at 17:00'
              },
              reengagement: {
                enabled: true,
                lastRun: null,
                schedule: 'Check inactive clients every 30 days'
              }
            }
          }
        });

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Automation API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Execute automation tasks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task } = body;

    switch (task) {
      case 'daily_tracking':
        return await runDailyTracking();

      case 'daily_report':
        return await runDailyReport();

      case 'weekly_report':
        return await runWeeklyReport();

      case 'reengage_inactive':
        return await runReengagement();

      case 'full_automation':
        // Run all daily tasks
        const trackingResult = await executeDailyTracking();
        const reportResult = await executeDailyReport();
        return NextResponse.json({
          success: true,
          data: {
            tracking: trackingResult,
            report: reportResult
          }
        });

      default:
        return NextResponse.json({ success: false, error: 'Invalid task' }, { status: 400 });
    }
  } catch (error) {
    console.error('Automation task error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Daily vessel tracking (Pedro's job)
async function runDailyTracking() {
  try {
    const data = await executeDailyTracking();
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Daily tracking error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Execute daily tracking - returns data directly
async function executeDailyTracking() {
  // Track vessels
  const result = await trackVessels({ count: 5 });

  // Get all upcoming arrivals for report
  const arrivals = await getUpcomingArrivals(30);

  // Send report to Mariana
  if (arrivals.length > 0) {
    await sendVesselReport(arrivals.slice(0, 10).map(a => ({
      name: a.vesselName,
      imo: a.imo,
      port: a.port,
      eta: a.eta,
      owner: a.owner,
    })));
  }

  // Update last run
  await db.systemConfig.upsert({
    where: { key: 'last_daily_tracking' },
    update: { value: new Date().toISOString() },
    create: { key: 'last_daily_tracking', value: new Date().toISOString() },
  });

  return {
    task: 'daily_tracking',
    vesselsTracked: result.tracked,
    reportSent: arrivals.length > 0
  };
}

// Daily report to manager (Claudia's job)
async function runDailyReport() {
  try {
    const data = await executeDailyReport();
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Daily report error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Execute daily report - returns data directly
async function executeDailyReport() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Gather stats
  const [
    vesselsTracked,
    newContacts,
    reengagements,
    leadsTransferred,
    quotationsSent,
  ] = await Promise.all([
    db.vesselSchedule.count({
      where: { createdAt: { gte: today } },
    }),
    db.client.count({
      where: { createdAt: { gte: today } },
    }),
    db.cRMInteraction.count({
      where: {
        createdAt: { gte: today },
        type: 'email_sent',
        handledBy: 'mariana',
      },
    }),
    db.cRMInteraction.count({
      where: {
        createdAt: { gte: today },
        status: 'qualified',
      },
    }),
    db.emailLog.count({
      where: {
        createdAt: { gte: today },
        agent: 'claudia',
        subject: { contains: 'Cotacao' },
        status: 'sent',
      },
    }),
  ]);

  // Send email to manager
  await sendDailyReportToManager({
    vesselsTracked,
    newContacts,
    reengagements,
    leadsTransferred,
    quotationsSent,
    estimatedValue: quotationsSent * 5000,
  });

  // Save report
  await db.dailyReport.create({
    data: {
      date: today,
      vesselsTracked,
      newContacts,
      reengagements,
      leadsTransferred,
      quotationsSent,
      estimatedValue: quotationsSent * 5000,
    },
  });

  // Update last run
  await db.systemConfig.upsert({
    where: { key: 'last_daily_report' },
    update: { value: new Date().toISOString() },
    create: { key: 'last_daily_report', value: new Date().toISOString() },
  });

  return {
    task: 'daily_report',
    vesselsTracked,
    newContacts,
    reengagements,
    leadsTransferred,
    quotationsSent
  };
}

// Weekly WhatsApp report (Claudia's job - Friday only)
async function runWeeklyReport() {
  try {
    const dayOfWeek = new Date().getDay();

    // Only send on Friday (5)
    if (dayOfWeek !== 5) {
      return NextResponse.json({
        success: false,
        error: 'Weekly report should only be sent on Fridays',
        dayOfWeek
      }, { status: 400 });
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [weeklyVessels, weeklyClients, weeklyLeads, weeklyQuotations] = await Promise.all([
      db.vesselSchedule.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      db.client.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      db.cRMInteraction.count({
        where: {
          createdAt: { gte: weekAgo },
          status: 'qualified',
        },
      }),
      db.emailLog.count({
        where: {
          createdAt: { gte: weekAgo },
          agent: 'claudia',
          subject: { contains: 'Cotacao' },
          status: 'sent',
        },
      }),
    ]);

    const result = await sendWeeklyReport({
      vesselsTracked: weeklyVessels,
      newClients: weeklyClients,
      leadsQualified: weeklyLeads,
      quotationsSent: weeklyQuotations,
      estimatedValue: weeklyQuotations * 5000,
    });

    // Update last run
    await db.systemConfig.upsert({
      where: { key: 'last_weekly_report' },
      update: { value: new Date().toISOString() },
      create: { key: 'last_weekly_report', value: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      data: {
        task: 'weekly_report',
        messageSid: result.messageSid,
        sent: result.success
      }
    });
  } catch (error) {
    console.error('Weekly report error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Re-engage inactive clients (Mariana's job)
async function runReengagement() {
  try {
    // Find clients inactive for > 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const inactiveClients = await db.client.findMany({
      where: {
        OR: [
          { lastContactAt: { lt: thirtyDaysAgo } },
          { lastContactAt: null },
        ],
        status: { notIn: ['qualified', 'hot'] },
      },
      take: 10,
    });

    let reengaged = 0;

    for (const client of inactiveClients) {
      // Check if client has vessel arriving
      const vesselCheck = await checkClientVesselArrival(client.email);

      // Generate re-engagement email
      const email = await generateReengagementEmail({
        clientName: client.name,
        language: client.language as 'PT' | 'EN' | 'ES',
        daysInactive: client.lastContactAt
          ? Math.floor((Date.now() - client.lastContactAt.getTime()) / (1000 * 60 * 60 * 24))
          : 999,
        hasVesselArriving: vesselCheck.hasArrival,
        vesselName: vesselCheck.vessels[0]?.name,
      });

      const result = await sendEmail({
        from: EMAIL_ACCOUNTS.mariana,
        to: client.email,
        subject: email.subject,
        body: email.body,
        agent: 'mariana',
      });

      if (result.success) {
        // Update client
        await db.client.update({
          where: { id: client.id },
          data: {
            lastContactAt: new Date(),
            status: 'warm',
            nextFollowUp: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        // Log interaction
        await db.cRMInteraction.create({
          data: {
            clientId: client.id,
            type: 'email_sent',
            subject: email.subject,
            handledBy: 'mariana',
            emailFrom: EMAIL_ACCOUNTS.mariana,
            emailTo: client.email,
            status: 'warm',
          },
        });

        reengaged++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        task: 'reengage_inactive',
        inactiveClientsFound: inactiveClients.length,
        reengaged
      }
    });
  } catch (error) {
    console.error('Re-engagement error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
