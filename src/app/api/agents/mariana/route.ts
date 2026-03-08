// MTS Angola - Mariana Agent API (CRM & Marketing)
// Handles lead prospecting, qualification, and re-engagement

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  sendMarketingEmail, 
  sendEmail,
  EMAIL_ACCOUNTS 
} from '@/lib/services/email-service';
import { checkClientVesselArrival } from '@/lib/services/vessel-tracking-service';
import { 
  generateMarketingEmail, 
  generateReengagementEmail,
  analyzeLeadQuality 
} from '@/lib/services/ai-service';

// GET - Get CRM data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';

    switch (action) {
      case 'stats':
        const [totalClients, byStatus, recentInteractions] = await Promise.all([
          db.client.count(),
          db.client.groupBy({
            by: ['status'],
            _count: true,
          }),
          db.cRMInteraction.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { client: true },
          }),
        ]);
        return NextResponse.json({ 
          success: true, 
          data: { totalClients, byStatus, recentInteractions } 
        });

      case 'inactive':
        // Get clients inactive for > 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const inactiveClients = await db.client.findMany({
          where: {
            OR: [
              { lastContactAt: { lt: thirtyDaysAgo } },
              { lastContactAt: null },
            ],
            status: { not: 'qualified' },
          },
          take: 20,
        });
        return NextResponse.json({ success: true, data: inactiveClients });

      case 'cold_leads':
        const coldLeads = await db.client.findMany({
          where: { status: 'cold' },
          take: 20,
        });
        return NextResponse.json({ success: true, data: coldLeads });

      case 'interactions':
        const interactions = await db.cRMInteraction.findMany({
          include: { client: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        return NextResponse.json({ success: true, data: interactions });

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Mariana API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST - Execute Mariana actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'prospect':
        // Send marketing email to a prospect
        const { clientId, useAI = false } = body;
        
        const client = await db.client.findUnique({
          where: { id: clientId },
        });

        if (!client) {
          return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
        }

        let emailResult;
        if (useAI) {
          // Generate AI-powered email
          const aiEmail = await generateMarketingEmail({
            clientName: client.name,
            language: client.language as 'PT' | 'EN' | 'ES',
          });
          emailResult = await sendEmail({
            from: EMAIL_ACCOUNTS.mariana,
            to: client.email,
            subject: aiEmail.subject,
            body: aiEmail.body,
            agent: 'mariana',
          });
        } else {
          // Use template
          emailResult = await sendMarketingEmail(
            client.email,
            client.name
          );
        }

        if (emailResult.success) {
          // Log interaction
          await db.cRMInteraction.create({
            data: {
              clientId: client.id,
              type: 'email_sent',
              subject: 'Marketing Outreach',
              handledBy: 'mariana',
              emailFrom: EMAIL_ACCOUNTS.mariana,
              emailTo: client.email,
              status: 'cold',
            },
          });

          // Update client last contact
          await db.client.update({
            where: { id: client.id },
            data: { 
              lastContactAt: new Date(),
              nextFollowUp: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
          });

          // Update status to warm if was cold
          if (client.status === 'cold') {
            await db.client.update({
              where: { id: client.id },
              data: { status: 'warm' },
            });
          }
        }

        return NextResponse.json({ 
          success: emailResult.success, 
          data: { 
            emailSent: emailResult.success,
            messageId: emailResult.messageId,
            error: emailResult.error 
          } 
        });

      case 'qualify':
        // Qualify a lead and transfer to Claudia
        const { clientId: qualifyClientId, reason } = body;
        
        const clientToQualify = await db.client.findUnique({
          where: { id: qualifyClientId },
        });

        if (!clientToQualify) {
          return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
        }

        // Update client status to qualified
        await db.client.update({
          where: { id: qualifyClientId },
          data: { status: 'qualified' },
        });

        // Create handover interaction
        await db.cRMInteraction.create({
          data: {
            clientId: qualifyClientId,
            type: 'email_sent',
            subject: `Lead Qualificado - ${clientToQualify.name}`,
            content: reason || 'Cliente solicitou cotacao',
            handledBy: 'mariana',
            status: 'qualified',
          },
        });

        // Send internal email to Claudia (handover)
        await sendEmail({
          from: EMAIL_ACCOUNTS.mariana,
          to: EMAIL_ACCOUNTS.claudia,
          subject: `Lead Qualificado - ${clientToQualify.name}`,
          body: `
            <p>Claudia,</p>
            <br>
            <p>O seguinte cliente solicitou cotacao:</p>
            <ul>
              <li><strong>Nome:</strong> ${clientToQualify.name}</li>
              <li><strong>Email:</strong> ${clientToQualify.email}</li>
              <li><strong>Empresa:</strong> ${clientToQualify.company || 'Nao informado'}</li>
              <li><strong>Telefone:</strong> ${clientToQualify.phone || 'Nao informado'}</li>
            </ul>
            <br>
            <p>Por favor, entre em contato e envie a cotacao.</p>
            <br>
            <p>Atenciosamente,<br>Mariana Silva</p>
          `,
          agent: 'mariana',
        });

        return NextResponse.json({ 
          success: true, 
          data: { 
            clientName: clientToQualify.name,
            status: 'qualified',
            transferredTo: 'claudia',
          } 
        });

      case 'reengage':
        // Re-engage an inactive client
        const { clientId: reengageClientId } = body;
        
        const inactiveClient = await db.client.findUnique({
          where: { id: reengageClientId },
        });

        if (!inactiveClient) {
          return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
        }

        // Check if client has vessel arriving
        const vesselCheck = await checkClientVesselArrival(inactiveClient.email);

        // Generate re-engagement email
        const reengageEmail = await generateReengagementEmail({
          clientName: inactiveClient.name,
          language: inactiveClient.language as 'PT' | 'EN' | 'ES',
          daysInactive: inactiveClient.lastContactAt 
            ? Math.floor((Date.now() - inactiveClient.lastContactAt.getTime()) / (1000 * 60 * 60 * 24))
            : 999,
          hasVesselArriving: vesselCheck.hasArrival,
          vesselName: vesselCheck.vessels[0]?.name,
        });

        const reengageResult = await sendEmail({
          from: EMAIL_ACCOUNTS.mariana,
          to: inactiveClient.email,
          subject: reengageEmail.subject,
          body: reengageEmail.body,
          agent: 'mariana',
        });

        if (reengageResult.success) {
          // Update client
          await db.client.update({
            where: { id: reengageClientId },
            data: {
              lastContactAt: new Date(),
              status: 'warm',
              nextFollowUp: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });

          // Log interaction
          await db.cRMInteraction.create({
            data: {
              clientId: reengageClientId,
              type: 'email_sent',
              subject: reengageEmail.subject,
              handledBy: 'mariana',
              emailFrom: EMAIL_ACCOUNTS.mariana,
              emailTo: inactiveClient.email,
              status: 'warm',
            },
          });
        }

        return NextResponse.json({ 
          success: reengageResult.success, 
          data: { 
            emailSent: reengageResult.success,
            hasVesselArriving: vesselCheck.hasArrival,
          } 
        });

      case 'analyze_response':
        // Analyze a client response using AI
        const { clientName, emailContent } = body;
        
        const analysis = await analyzeLeadQuality({
          clientName,
          emailContent,
        });

        return NextResponse.json({ success: true, data: analysis });

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Mariana API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
