// MTS Angola - Send Document API
// API for sending documents via email to clients

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendPortfolioEmail, sendHullCleaningQuotation, sendShipchandlerWasteQuotation, EMAIL_ACCOUNTS } from '@/lib/services/email-service';
import { canAgentSendDocument, type AgentName } from '@/lib/services/document-service';

// POST - Send document to client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      agent, 
      documentType, 
      clientId,
      to,
      clientName,
      vesselName,
      port,
      language,
      cc
    } = body;

    // Validate agent
    if (!['mariana', 'claudia'].includes(agent)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid agent. Only mariana or claudia can send documents.',
      }, { status: 400 });
    }

    // Validate document access
    if (!canAgentSendDocument(agent as AgentName, documentType)) {
      return NextResponse.json({
        success: false,
        error: `Agent ${agent} is not authorized to send document type: ${documentType}`,
      }, { status: 403 });
    }

    // Get client info if clientId provided
    let recipientEmail = to;
    let recipientName = clientName;

    if (clientId) {
      const client = await db.client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        return NextResponse.json({
          success: false,
          error: 'Client not found',
        }, { status: 404 });
      }

      recipientEmail = client.email;
      recipientName = client.name;
    }

    if (!recipientEmail || !recipientName) {
      return NextResponse.json({
        success: false,
        error: 'Recipient email and name are required',
      }, { status: 400 });
    }

    // Send document based on type
    let result;

    switch (documentType) {
      case 'portfolio':
        // Only Mariana can send portfolio
        result = await sendPortfolioEmail({
          to: recipientEmail,
          clientName: recipientName,
          vesselName,
          port,
          language: language || 'PT',
        });
        break;

      case 'hull_cleaning':
        // Only Claudia can send hull cleaning quotation
        result = await sendHullCleaningQuotation({
          to: recipientEmail,
          clientName: recipientName,
          vesselName,
          port,
          language: language || 'PT',
          cc: cc || EMAIL_ACCOUNTS.mariana,
        });
        break;

      case 'shipchandler_waste':
        // Only Claudia can send shipchandler/waste quotation
        result = await sendShipchandlerWasteQuotation({
          to: recipientEmail,
          clientName: recipientName,
          vesselName,
          port,
          language: language || 'PT',
          cc: cc || EMAIL_ACCOUNTS.mariana,
        });
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid document type',
        }, { status: 400 });
    }

    // Log interaction if client exists
    if (clientId && result.success) {
      await db.cRMInteraction.create({
        data: {
          clientId,
          type: 'email_sent',
          subject: `Document sent: ${documentType}`,
          content: `Sent ${documentType} document${vesselName ? ` for vessel ${vesselName}` : ''}`,
          handledBy: agent,
          emailFrom: EMAIL_ACCOUNTS[agent as keyof typeof EMAIL_ACCOUNTS],
          emailTo: recipientEmail,
          status: agent === 'claudia' ? 'hot' : 'warm',
        },
      });

      // Update client last contact
      await db.client.update({
        where: { id: clientId },
        data: {
          lastContactAt: new Date(),
          status: agent === 'claudia' ? 'hot' : 'warm',
        },
      });
    }

    return NextResponse.json({
      success: result.success,
      data: {
        documentType,
        sentTo: recipientEmail,
        messageId: result.messageId,
        error: result.error,
      },
    });

  } catch (error) {
    console.error('Send document error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
