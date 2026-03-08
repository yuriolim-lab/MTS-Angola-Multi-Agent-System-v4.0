// MTS Angola - Automation Executors
// Individual task executors for scheduled jobs

import { db } from '@/lib/db';
import { trackVessels, getUpcomingArrivals, checkClientVesselArrival } from '@/lib/services/vessel-tracking-service';
import { 
  sendEmail, 
  sendDailyReportToManager, 
  sendVesselReport, 
  sendPortfolioEmail,
  EMAIL_ACCOUNTS 
} from '@/lib/services/email-service';
import { sendWeeklyReport } from '@/lib/services/whatsapp-service';
import { generateReengagementEmail } from '@/lib/services/ai-service';
import { logScheduleExecution, updateLastRun } from '@/lib/services/scheduler-service';

// Execute daily vessel tracking (Pedro's job)
export async function runDailyTracking(): Promise<{
  success: boolean;
  vesselsTracked?: number;
  reportSent?: boolean;
  error?: string;
}> {
  try {
    // Track vessels
    const result = await trackVessels({ count: 5 });

    // Get all upcoming arrivals for report
    const arrivals = await getUpcomingArrivals(30);

    // Send report to Mariana
    let reportSent = false;
    if (arrivals.length > 0) {
      await sendVesselReport(arrivals.slice(0, 10).map(a => ({
        name: a.vesselName,
        imo: a.imo,
        port: a.port,
        eta: a.eta,
        owner: a.owner,
      })));
      reportSent = true;
    }

    // Update last run
    await updateLastRun('dailyTracking');
    await logScheduleExecution('dailyTracking', 'success', JSON.stringify({
      vesselsTracked: result.tracked,
      reportSent,
    }));

    return {
      success: true,
      vesselsTracked: result.tracked,
      reportSent,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logScheduleExecution('dailyTracking', 'failed', undefined, errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Execute daily report to manager (Claudia's job)
export async function runDailyReport(): Promise<{
  success: boolean;
  stats?: {
    vesselsTracked: number;
    newContacts: number;
    reengagements: number;
    leadsTransferred: number;
    quotationsSent: number;
    estimatedValue: number;
  };
  error?: string;
}> {
  try {
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
    await updateLastRun('dailyReport');
    await logScheduleExecution('dailyReport', 'success', JSON.stringify({
      vesselsTracked,
      newContacts,
      reengagements,
      leadsTransferred,
      quotationsSent,
    }));

    return {
      success: true,
      stats: {
        vesselsTracked,
        newContacts,
        reengagements,
        leadsTransferred,
        quotationsSent,
        estimatedValue: quotationsSent * 5000,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logScheduleExecution('dailyReport', 'failed', undefined, errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Execute weekly WhatsApp report (Claudia's job - Friday only)
export async function runWeeklyReport(): Promise<{
  success: boolean;
  messageSid?: string;
  error?: string;
}> {
  try {
    const dayOfWeek = new Date().getDay();

    // Only send on Friday (5)
    if (dayOfWeek !== 5) {
      return {
        success: false,
        error: 'Weekly report should only be sent on Fridays',
      };
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
    await updateLastRun('weeklyReport');
    await logScheduleExecution('weeklyReport', result.success ? 'success' : 'failed', JSON.stringify({
      messageSid: result.messageSid,
    }));

    return {
      success: result.success,
      messageSid: result.messageSid,
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logScheduleExecution('weeklyReport', 'failed', undefined, errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Execute re-engagement of inactive clients (Mariana's job)
export async function runReengagement(): Promise<{
  success: boolean;
  inactiveFound?: number;
  reengaged?: number;
  error?: string;
}> {
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

    // Update last run
    await updateLastRun('reengagement');
    await logScheduleExecution('reengagement', 'success', JSON.stringify({
      inactiveFound: inactiveClients.length,
      reengaged,
    }));

    return {
      success: true,
      inactiveFound: inactiveClients.length,
      reengaged,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logScheduleExecution('reengagement', 'failed', undefined, errorMessage);
    return { success: false, error: errorMessage };
  }
}
