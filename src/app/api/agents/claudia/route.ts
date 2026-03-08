// MTS Angola - Claudia Agent API (Commercial & Finance)
// Handles quotations, reports, and manager communication

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  sendQuotationEmail, 
  sendEmail,
  sendDailyReportToManager,
  EMAIL_ACCOUNTS,
  getEmailStats 
} from '@/lib/services/email-service';
import { 
  sendWeeklyReport, 
  sendUrgentAlert, 
  sendImmediateAlert,
  getWhatsAppStats 
} from '@/lib/services/whatsapp-service';
import { generateDailySummary } from '@/lib/services/ai-service';

// GET - Get commercial data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';

    switch (action) {
      case 'stats':
        const [qualifiedLeads, quotationsSent, emailStats, whatsappStats] = await Promise.all([
          db.client.count({ where: { status: 'qualified' } }),
          db.emailLog.count({ 
            where: { 
              agent: 'claudia',
              subject: { contains: 'Cotacao' },
              status: 'sent',
            } 
          }),
          getEmailStats(7),
          getWhatsAppStats(30),
        ]);

        return NextResponse.json({ 
          success: true, 
          data: { 
            qualifiedLeads, 
            quotationsSent, 
            emailStats,
            whatsappStats,
          } 
        });

      case 'qualified_leads':
        const qualified = await db.client.findMany({
          where: { status: 'qualified' },
          include: {
            interactions: {
              where: { status: 'qualified' },
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
          take: 20,
        });
        return NextResponse.json({ success: true, data: qualified });

      case 'quotations':
        const quotations = await db.emailLog.findMany({
          where: { 
            agent: 'claudia',
            subject: { contains: 'Cotacao' },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });
        return NextResponse.json({ success: true, data: quotations });

      case 'reports':
        const reports = await db.dailyReport.findMany({
          orderBy: { date: 'desc' },
          take: 7,
        });
        return NextResponse.json({ success: true, data: reports });

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Claudia API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST - Execute Claudia actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'send_quotation':
        // Send quotation to a qualified lead
        const { clientId, cc } = body;
        
        const client = await db.client.findUnique({
          where: { id: clientId },
        });

        if (!client) {
          return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
        }

        if (client.status !== 'qualified') {
          return NextResponse.json({ 
            success: false, 
            error: 'Client is not qualified. Only qualified leads can receive quotations.' 
          }, { status: 400 });
        }

        // Send quotation email (Claudia ONLY can do this - Price Hierarchy Rule)
        const quotationResult = await sendQuotationEmail(
          client.email,
          client.name,
          cc || EMAIL_ACCOUNTS.mariana // CC Mariana to keep her in the loop
        );

        if (quotationResult.success) {
          // Log interaction
          await db.cRMInteraction.create({
            data: {
              clientId: client.id,
              type: 'email_sent',
              subject: 'Cotacao de Servicos',
              handledBy: 'claudia',
              emailFrom: EMAIL_ACCOUNTS.claudia,
              emailTo: client.email,
              emailCc: cc || EMAIL_ACCOUNTS.mariana,
              attachment: 'Quotation_MTS.pdf',
              status: 'hot',
            },
          });

          // Update client status
          await db.client.update({
            where: { id: client.id },
            data: {
              lastContactAt: new Date(),
              status: 'hot',
            },
          });
        }

        return NextResponse.json({ 
          success: quotationResult.success, 
          data: { 
            emailSent: quotationResult.success,
            messageId: quotationResult.messageId,
            error: quotationResult.error,
          } 
        });

      case 'daily_report':
        // Generate and send daily report to manager
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

        // Generate AI summary
        const summary = await generateDailySummary({
          vesselsTracked,
          newContacts,
          reengagements,
          leadsTransferred,
          quotationsSent,
          estimatedValue: quotationsSent * 5000, // Rough estimate
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
            summary,
          },
        });

        // Send email to manager
        const reportResult = await sendDailyReportToManager({
          vesselsTracked,
          newContacts,
          reengagements,
          leadsTransferred,
          quotationsSent,
          estimatedValue: quotationsSent * 5000,
        });

        return NextResponse.json({ 
          success: reportResult.success, 
          data: {
            report: {
              vesselsTracked,
              newContacts,
              reengagements,
              leadsTransferred,
              quotationsSent,
              estimatedValue: quotationsSent * 5000,
              summary,
            },
            emailSent: reportResult.success,
          } 
        });

      case 'weekly_report_whatsapp':
        // Send weekly WhatsApp report (Friday only per rules)
        const dayOfWeek = new Date().getDay();
        if (dayOfWeek !== 5) {
          return NextResponse.json({ 
            success: false, 
            error: 'Weekly report should only be sent on Fridays' 
          }, { status: 400 });
        }

        // Gather weekly stats
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

        const whatsappResult = await sendWeeklyReport({
          vesselsTracked: weeklyVessels,
          newClients: weeklyClients,
          leadsQualified: weeklyLeads,
          quotationsSent: weeklyQuotations,
          estimatedValue: weeklyQuotations * 5000,
        });

        return NextResponse.json({ 
          success: whatsappResult.success, 
          data: { messageSid: whatsappResult.messageSid } 
        });

      case 'urgent_alert':
        // Send urgent WhatsApp alert to manager
        const { clientName, clientPhone, request: clientRequest } = body;
        
        const alertResult = await sendUrgentAlert({
          clientName,
          clientPhone,
          request: clientRequest,
        });

        return NextResponse.json({ 
          success: alertResult.success, 
          data: { messageSid: alertResult.messageSid } 
        });

      case 'immediate_alert':
        // Send immediate operational alert
        const { alert } = body;
        
        const immediateResult = await sendImmediateAlert(alert);

        return NextResponse.json({ 
          success: immediateResult.success, 
          data: { messageSid: immediateResult.messageSid } 
        });

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Claudia API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
