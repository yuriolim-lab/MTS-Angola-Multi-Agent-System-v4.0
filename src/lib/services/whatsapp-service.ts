// MTS Angola - WhatsApp Service (Twilio)
// Handles critical alerts to manager only

import { Twilio } from 'twilio';
import { db } from '@/lib/db';

// Twilio Configuration
const TWILIO_CONFIG = {
  accountSid: process.env.TWILIO_SID || '',
  authToken: process.env.TWILIO_TOKEN || '',
  fromNumber: process.env.TWILIO_PHONE || '',
  toNumber: process.env.MANAGER_PHONE || '',
};

// WhatsApp interfaces
interface SendWhatsAppParams {
  to?: string; // Optional, defaults to manager
  message: string;
  type: 'weekly_report' | 'urgent' | 'immediate' | 'daily';
}

interface WhatsAppResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

// Create Twilio client (lazy initialization)
let twilioClient: Twilio | null = null;

function getTwilioClient(): Twilio | null {
  if (!TWILIO_CONFIG.accountSid || !TWILIO_CONFIG.authToken) {
    return null; // No credentials configured
  }
  if (!twilioClient) {
    twilioClient = new Twilio(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);
  }
  return twilioClient;
}

// Send WhatsApp message
export async function sendWhatsApp(params: SendWhatsAppParams): Promise<WhatsAppResult> {
  const { to = TWILIO_CONFIG.toNumber, message, type } = params;

  // Create WhatsApp alert log
  const alertLog = await db.whatsAppAlert.create({
    data: {
      to,
      message,
      type,
      status: 'pending',
    },
  });

  try {
    const client = getTwilioClient();
    
    // In development/test mode or without credentials, simulate sending
    if (!client || process.env.NODE_ENV !== 'production') {
      console.log('[WHATSAPP SIMULATION] Would send:', {
        to,
        type,
        message: message.substring(0, 100) + '...',
      });
      
      await db.whatsAppAlert.update({
        where: { id: alertLog.id },
        data: { status: 'sent' },
      });
      
      return { success: true, messageSid: `simulated-${alertLog.id}` };
    }

    const result = await client.messages.create({
      from: `whatsapp:${TWILIO_CONFIG.fromNumber}`,
      to: `whatsapp:${to}`,
      body: message,
    });

    // Update alert log
    await db.whatsAppAlert.update({
      where: { id: alertLog.id },
      data: { status: 'sent' },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        agent: 'claudia',
        action: 'send_whatsapp',
        entityType: 'whatsapp_alert',
        entityId: alertLog.id,
        details: JSON.stringify({ to, type }),
        status: 'success',
      },
    });

    return { success: true, messageSid: result.sid };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update alert log with error
    await db.whatsAppAlert.update({
      where: { id: alertLog.id },
      data: { status: 'failed', errorMessage },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        agent: 'claudia',
        action: 'send_whatsapp',
        entityType: 'whatsapp_alert',
        entityId: alertLog.id,
        details: JSON.stringify({ to, type, error: errorMessage }),
        status: 'error',
      },
    });

    return { success: false, error: errorMessage };
  }
}

// Send weekly report (Friday only per rules)
export async function sendWeeklyReport(report: {
  vesselsTracked: number;
  newClients: number;
  leadsQualified: number;
  quotationsSent: number;
  estimatedValue: number;
}): Promise<WhatsAppResult> {
  const message = `📊 *RELATORIO SEMANAL MTS ANGOLA*

🚢 *Inteligencia (Pedro):*
• Navios rastreados: ${report.vesselsTracked}

📧 *CRM (Mariana):*
• Novos clientes: ${report.newClients}
• Leads qualificados: ${report.leadsQualified}

💰 *Comercial (Claudia):*
• Cotacoes enviadas: ${report.quotationsSent}
• Valor estimado: USD ${report.estimatedValue.toLocaleString()}

_Mensagem automatica do Sistema MTS Angola_`;

  return sendWhatsApp({
    message,
    type: 'weekly_report',
  });
}

// Send urgent contact request alert
export async function sendUrgentAlert(params: {
  clientName: string;
  clientPhone?: string;
  request: string;
}): Promise<WhatsAppResult> {
  const message = `🚨 *ALERTA MTS: Cliente Solicita Contato Urgente*

👤 Cliente: ${params.clientName}
📱 Telefone: ${params.clientPhone || 'Nao informado'}
📝 Solicitacao: ${params.request}

_Acao necessaria! Entre em contato imediatamente._`;

  return sendWhatsApp({
    message,
    type: 'urgent',
  });
}

// Send immediate operational alert
export async function sendImmediateAlert(alert: string): Promise<WhatsAppResult> {
  const message = `⚠️ *ALERTA OPERACIONAL MTS*

${alert}

_Sistema MTS Angola_`;

  return sendWhatsApp({
    message,
    type: 'immediate',
  });
}

// Get WhatsApp statistics
export async function getWhatsAppStats(days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [sent, failed, byType] = await Promise.all([
    db.whatsAppAlert.count({
      where: { createdAt: { gte: since }, status: 'sent' },
    }),
    db.whatsAppAlert.count({
      where: { createdAt: { gte: since }, status: 'failed' },
    }),
    db.whatsAppAlert.groupBy({
      by: ['type'],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
  ]);

  return { sent, failed, byType };
}
