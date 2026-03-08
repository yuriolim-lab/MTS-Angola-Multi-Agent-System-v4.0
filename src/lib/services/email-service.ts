// MTS Angola - Email Service (SMTP)
// Handles all email communication for the multi-agent system

import nodemailer from 'nodemailer';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { 
  getDocumentPath, 
  canAgentSendDocument,
  type AgentName 
} from './document-service';

// Email account configurations
export const EMAIL_ACCOUNTS = {
  mariana: 'info@mts-angola.com',
  claudia: 'accounts@mts-angola.com',
  pedro: 'supply.chain@mts-angola.com',
  manager: 'ops.manager@mts-angola.com',
} as const;

// SMTP Configuration
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

// Create transporter (lazy initialization)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: SMTP_CONFIG.auth,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

// Email interfaces
interface SendEmailParams {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
  attachmentPath?: string;
  agent: 'pedro' | 'mariana' | 'claudia';
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Check if PDF file exists
export function checkPdfExists(filename: string): boolean {
  const filePath = path.join(process.cwd(), 'public', 'documents', filename);
  return fs.existsSync(filePath);
}

// Get PDF file path
export function getPdfPath(filename: string): string | null {
  const filePath = path.join(process.cwd(), 'public', 'documents', filename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}

// List available PDFs
export function listAvailablePdfs(): string[] {
  const docsPath = path.join(process.cwd(), 'public', 'documents');
  if (!fs.existsSync(docsPath)) {
    return [];
  }
  return fs.readdirSync(docsPath).filter(f => f.endsWith('.pdf'));
}

// Send email with optional attachment
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  const { from, to, cc, subject, body, attachmentPath, agent } = params;

  // Create email log entry
  const emailLog = await db.emailLog.create({
    data: {
      from,
      to,
      cc,
      subject,
      body,
      attachment: attachmentPath ? path.basename(attachmentPath) : null,
      status: 'pending',
      agent,
    },
  });

  try {
    // Check if attachment exists if specified
    const attachments: { path: string }[] = [];
    if (attachmentPath) {
      if (!fs.existsSync(attachmentPath)) {
        throw new Error(`Attachment file not found: ${attachmentPath}`);
      }
      attachments.push({
        path: attachmentPath,
      });
    }

    const transport = getTransporter();
    
    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to,
      cc,
      subject,
      html: body,
      attachments,
    };

    // In development/test mode, simulate sending if no SMTP credentials
    if (!process.env.SMTP_PASS) {
      console.log('[EMAIL SIMULATION] Would send email:', {
        from,
        to,
        cc,
        subject,
        hasAttachment: !!attachmentPath,
      });
      
      await db.emailLog.update({
        where: { id: emailLog.id },
        data: { status: 'sent' },
      });
      
      return { success: true, messageId: `simulated-${emailLog.id}` };
    }

    const result = await transport.sendMail(mailOptions);

    // Update email log
    await db.emailLog.update({
      where: { id: emailLog.id },
      data: { status: 'sent' },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        agent,
        action: 'send_email',
        entityType: 'email',
        entityId: emailLog.id,
        details: JSON.stringify({ to, subject }),
        status: 'success',
      },
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update email log with error
    await db.emailLog.update({
      where: { id: emailLog.id },
      data: { status: 'failed', errorMessage },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        agent,
        action: 'send_email',
        entityType: 'email',
        entityId: emailLog.id,
        details: JSON.stringify({ to, subject, error: errorMessage }),
        status: 'error',
      },
    });

    return { success: false, error: errorMessage };
  }
}

// Send marketing email (Mariana)
export async function sendMarketingEmail(
  to: string,
  clientName: string,
  vesselName?: string,
  port?: string
): Promise<EmailResult> {
  // Check if marketing PDF exists
  const marketingPdfPath = getPdfPath('Marketing_MTS.pdf');
  if (!marketingPdfPath) {
    // Notify manager instead of sending broken email
    await sendEmail({
      from: EMAIL_ACCOUNTS.mariana,
      to: EMAIL_ACCOUNTS.manager,
      subject: '[ALERTA] PDF Marketing nao encontrado',
      body: `
        <p>Prezado Gestor,</p>
        <p>O arquivo Marketing_MTS.pdf nao foi encontrado no sistema.</p>
        <p>Por favor, faca upload do arquivo para continuar as operacoes de marketing.</p>
        <p>Caminho esperado: /public/documents/Marketing_MTS.pdf</p>
      `,
      agent: 'mariana',
    });
    return { success: false, error: 'Marketing PDF not found - Manager notified' };
  }

  const subject = vesselName
    ? `Apresentacao de Servicos MTS Angola - ${vesselName}`
    : 'Apresentacao de Servicos MTS Angola';

  const body = `
    <p>Prezado(a) ${clientName},</p>
    <br>
    ${vesselName && port ? `<p>Identificamos a escala do vosso navio <strong>${vesselName}</strong> em <strong>${port}</strong>.</p><br>` : ''}
    <p>A MTS Angola oferece suporte 24/7 em:</p>
    <ul>
      <li>Waste Management</li>
      <li>Shipchandler</li>
      <li>Hull Cleaning</li>
      <li>Offshore Support</li>
    </ul>
    <br>
    <p>Em anexo, nosso portfolio de servicos.</p>
    <br>
    <p>Atenciosamente,</p>
    <p><strong>Mariana Silva</strong><br>Marketing & CRM<br>MTS Angola<br>Email: ${EMAIL_ACCOUNTS.mariana}</p>
  `;

  return sendEmail({
    from: EMAIL_ACCOUNTS.mariana,
    to,
    subject,
    body,
    attachmentPath: marketingPdfPath,
    agent: 'mariana',
  });
}

// Send vessel tracking report (Pedro -> Mariana)
export async function sendVesselReport(
  vessels: Array<{
    name: string;
    imo: string;
    port: string;
    eta: Date;
    owner?: string;
    cargoType?: string;
  }>
): Promise<EmailResult> {
  const subject = `[RELATORIO DE RASTREAMENTO] - ${new Date().toLocaleDateString('pt-AO')}`;

  const vesselRows = vessels
    .map(
      v => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${v.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${v.imo}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${v.port}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${v.eta.toLocaleDateString('pt-AO')}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${v.owner || '-'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${v.cargoType || '-'}</td>
        </tr>
      `
    )
    .join('');

  const body = `
    <p>Prezada Mariana,</p>
    <br>
    <p>Segue o relatorio de escalas previstas para os proximos 30 dias:</p>
    <br>
    <table style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr style="background-color: #003366; color: white;">
          <th style="padding: 8px; border: 1px solid #ddd;">Navio</th>
          <th style="padding: 8px; border: 1px solid #ddd;">IMO</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Porto</th>
          <th style="padding: 8px; border: 1px solid #ddd;">ETA</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Armador</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Carga</th>
        </tr>
      </thead>
      <tbody>
        ${vesselRows}
      </tbody>
    </table>
    <br>
    <p>Total de navios: ${vessels.length}</p>
    <br>
    <p>Atenciosamente,</p>
    <p><strong>Pedro Matos</strong><br>Operacoes & Inteligencia<br>MTS Angola<br>Email: ${EMAIL_ACCOUNTS.pedro}</p>
  `;

  return sendEmail({
    from: EMAIL_ACCOUNTS.pedro,
    to: EMAIL_ACCOUNTS.mariana,
    subject,
    body,
    agent: 'pedro',
  });
}

// Send daily report to Manager (Claudia)
export async function sendDailyReportToManager(report: {
  vesselsTracked: number;
  newContacts: number;
  reengagements: number;
  leadsTransferred: number;
  quotationsSent: number;
  estimatedValue: number;
  alerts?: string[];
}): Promise<EmailResult> {
  const today = new Date().toLocaleDateString('pt-AO');
  const subject = `[RELATORIO DIARIO MTS] - ${today}`;

  const alertsSection = report.alerts && report.alerts.length > 0
    ? `<p><strong>Alertas:</strong></p><ul>${report.alerts.map(a => `<li>${a}</li>`).join('')}</ul>`
    : '<p><strong>Alertas:</strong> Nenhum</p>';

  const body = `
    <p>Prezado Gestor,</p>
    <br>
    <p>Segue o relatorio diario de operacoes:</p>
    <br>
    <h3>Inteligencia (Pedro):</h3>
    <ul>
      <li>Navios rastreados: ${report.vesselsTracked}</li>
    </ul>
    <br>
    <h3>CRM (Mariana):</h3>
    <ul>
      <li>Novos contatos: ${report.newContacts}</li>
      <li>Re-engajamentos: ${report.reengagements}</li>
      <li>Leads transferidos: ${report.leadsTransferred}</li>
    </ul>
    <br>
    <h3>Comercial (Claudia):</h3>
    <ul>
      <li>Cotacoes enviadas: ${report.quotationsSent}</li>
      <li>Valor estimado: USD ${report.estimatedValue.toLocaleString()}</li>
    </ul>
    <br>
    ${alertsSection}
    <br>
    <p>Atenciosamente,</p>
    <p><strong>Claudia Santos</strong><br>CEO Comercial & Financeiro<br>MTS Angola</p>
  `;

  return sendEmail({
    from: EMAIL_ACCOUNTS.claudia,
    to: EMAIL_ACCOUNTS.manager,
    subject,
    body,
    agent: 'claudia',
  });
}

// Get email statistics
export async function getEmailStats(days: number = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [sent, failed, byAgent] = await Promise.all([
    db.emailLog.count({
      where: { createdAt: { gte: since }, status: 'sent' },
    }),
    db.emailLog.count({
      where: { createdAt: { gte: since }, status: 'failed' },
    }),
    db.emailLog.groupBy({
      by: ['agent'],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
  ]);

  return { sent, failed, byAgent };
}

// ========================================
// AGENT-SPECIFIC DOCUMENT SENDING FUNCTIONS
// ========================================

// Mariana sends Portfolio (Marketing Document) - RULE: ONLY Mariana can send this
export async function sendPortfolioEmail(params: {
  to: string;
  clientName: string;
  vesselName?: string;
  port?: string;
  language?: 'PT' | 'EN' | 'ES';
}): Promise<EmailResult> {
  const { to, clientName, vesselName, port, language = 'PT' } = params;

  // Verify Mariana can send portfolio
  if (!canAgentSendDocument('mariana', 'portfolio')) {
    return { success: false, error: 'Mariana cannot send portfolio document' };
  }

  // Get portfolio document path
  const portfolioPath = getDocumentPath('mariana', 'portfolio');
  if (!portfolioPath) {
    // Notify manager about missing document
    await sendEmail({
      from: EMAIL_ACCOUNTS.mariana,
      to: EMAIL_ACCOUNTS.manager,
      subject: '[ALERTA] Documento Portfolio nao encontrado',
      body: `
        <p>Prezado Gestor,</p>
        <p>O arquivo MARSHIPPING_PORTFOLIO.pdf nao foi encontrado.</p>
        <p>Caminho esperado: /public/documents/mariana/MARSHIPPING_PORTFOLIO.pdf</p>
      `,
      agent: 'mariana',
    });
    return { success: false, error: 'Portfolio document not found - Manager notified' };
  }

  // Language-specific content
  const content = {
    PT: {
      subject: vesselName 
        ? `Apresentacao MTS Angola - ${vesselName}` 
        : 'Apresentacao de Servicos MTS Angola',
      greeting: `Prezado(a) ${clientName}`,
      intro: vesselName && port 
        ? `Identificamos a escala do vosso navio <strong>${vesselName}</strong> em <strong>${port}</strong>.` 
        : '',
      services: 'A MTS Angola oferece suporte 24/7 em:',
      attachment: 'Em anexo, nosso portfolio de servicos.',
      signature: 'Atenciosamente',
    },
    EN: {
      subject: vesselName 
        ? `MTS Angola Presentation - ${vesselName}` 
        : 'MTS Angola Services Presentation',
      greeting: `Dear ${clientName}`,
      intro: vesselName && port 
        ? `We identified your vessel <strong>${vesselName}</strong> calling at <strong>${port}</strong>.` 
        : '',
      services: 'MTS Angola provides 24/7 support for:',
      attachment: 'Please find attached our services portfolio.',
      signature: 'Best regards',
    },
    ES: {
      subject: vesselName 
        ? `Presentacion MTS Angola - ${vesselName}` 
        : 'Presentacion de Servicios MTS Angola',
      greeting: `Estimado/a ${clientName}`,
      intro: vesselName && port 
        ? `Identificamos la escala de su buque <strong>${vesselName}</strong> en <strong>${port}</strong>.` 
        : '',
      services: 'MTS Angola ofrece soporte 24/7 en:',
      attachment: 'Adjunto encontrara nuestro portafolio de servicios.',
      signature: 'Atentamente',
    },
  };

  const c = content[language];

  const body = `
    <p>${c.greeting},</p>
    <br>
    ${c.intro ? `<p>${c.intro}</p><br>` : ''}
    <p>${c.services}</p>
    <ul>
      <li>Waste Management</li>
      <li>Shipchandler</li>
      <li>Hull Cleaning</li>
      <li>Offshore Support</li>
    </ul>
    <br>
    <p>${c.attachment}</p>
    <br>
    <p>${c.signature},</p>
    <p><strong>Mariana Silva</strong><br>Marketing & CRM<br>MTS Angola<br>Email: ${EMAIL_ACCOUNTS.mariana}</p>
  `;

  return sendEmail({
    from: EMAIL_ACCOUNTS.mariana,
    to,
    subject: c.subject,
    body,
    attachmentPath: portfolioPath,
    agent: 'mariana',
  });
}

// Claudia sends Hull Cleaning Quotation - RULE: ONLY Claudia can send quotations
export async function sendHullCleaningQuotation(params: {
  to: string;
  clientName: string;
  vesselName?: string;
  port?: string;
  language?: 'PT' | 'EN' | 'ES';
  cc?: string;
}): Promise<EmailResult> {
  const { to, clientName, vesselName, port, language = 'PT', cc } = params;

  // Verify Claudia can send hull_cleaning
  if (!canAgentSendDocument('claudia', 'hull_cleaning')) {
    return { success: false, error: 'Claudia cannot send hull cleaning quotation' };
  }

  // Get hull cleaning document path
  const quotationPath = getDocumentPath('claudia', 'hull_cleaning');
  if (!quotationPath) {
    await sendEmail({
      from: EMAIL_ACCOUNTS.claudia,
      to: EMAIL_ACCOUNTS.manager,
      subject: '[ALERTA] Cotacao Hull Cleaning nao encontrada',
      body: `
        <p>Prezado Gestor,</p>
        <p>O arquivo Hull_Cleaning_Quotation.pdf nao foi encontrado.</p>
        <p>Caminho esperado: /public/documents/claudia/Hull_Cleaning_Quotation.pdf</p>
      `,
      agent: 'claudia',
    });
    return { success: false, error: 'Hull Cleaning quotation not found - Manager notified' };
  }

  const content = {
    PT: {
      subject: 'Cotacao Hull Cleaning - MTS Angola',
      greeting: `Prezado(a) ${clientName}`,
      intro: vesselName && port 
        ? `Referente ao navio <strong>${vesselName}</strong> em <strong>${port}</strong>.` 
        : '',
      text: 'Agradecemos o seu interesse no servico de limpeza de casco da MTS Angola.',
      note: 'Nossa tabela esta em vigor, sujeita a alteracao cambial.',
    },
    EN: {
      subject: 'Hull Cleaning Quotation - MTS Angola',
      greeting: `Dear ${clientName}`,
      intro: vesselName && port 
        ? `Regarding vessel <strong>${vesselName}</strong> at <strong>${port}</strong>.` 
        : '',
      text: 'Thank you for your interest in MTS Angola hull cleaning services.',
      note: 'Our rates are current and subject to exchange rate fluctuations.',
    },
    ES: {
      subject: 'Cotizacion Hull Cleaning - MTS Angola',
      greeting: `Estimado/a ${clientName}`,
      intro: vesselName && port 
        ? `Referente al buque <strong>${vesselName}</strong> en <strong>${port}</strong>.` 
        : '',
      text: 'Gracias por su interes en los servicios de limpieza de casco de MTS Angola.',
      note: 'Nuestra tabla esta vigente, sujeta a cambios cambiarios.',
    },
  };

  const c = content[language];

  const body = `
    <p>${c.greeting},</p>
    <br>
    ${c.intro ? `<p>${c.intro}</p><br>` : ''}
    <p>${c.text}</p>
    <p>Segue em anexo nossa cotacao de servicos de Hull Cleaning.</p>
    <br>
    <p><em>${c.note}</em></p>
    <br>
    <p>Estamos a disposicao para esclarecimentos.</p>
    <br>
    <p>Atenciosamente,</p>
    <p><strong>Claudia Santos</strong><br>CEO Comercial & Financeiro<br>MTS Angola<br>Email: ${EMAIL_ACCOUNTS.claudia}</p>
  `;

  return sendEmail({
    from: EMAIL_ACCOUNTS.claudia,
    to,
    cc,
    subject: c.subject,
    body,
    attachmentPath: quotationPath,
    agent: 'claudia',
  });
}

// Claudia sends Shipchandler + Waste Management Quotation - RULE: ONLY Claudia can send quotations
export async function sendShipchandlerWasteQuotation(params: {
  to: string;
  clientName: string;
  vesselName?: string;
  port?: string;
  language?: 'PT' | 'EN' | 'ES';
  cc?: string;
}): Promise<EmailResult> {
  const { to, clientName, vesselName, port, language = 'PT', cc } = params;

  // Verify Claudia can send shipchandler_waste
  if (!canAgentSendDocument('claudia', 'shipchandler_waste')) {
    return { success: false, error: 'Claudia cannot send shipchandler/waste quotation' };
  }

  // Get shipchandler/waste document path
  const quotationPath = getDocumentPath('claudia', 'shipchandler_waste');
  if (!quotationPath) {
    await sendEmail({
      from: EMAIL_ACCOUNTS.claudia,
      to: EMAIL_ACCOUNTS.manager,
      subject: '[ALERTA] Cotacao Shipchandler/Waste nao encontrada',
      body: `
        <p>Prezado Gestor,</p>
        <p>O arquivo Shipchandler_Waste_Quotation.pdf nao foi encontrado.</p>
        <p>Caminho esperado: /public/documents/claudia/Shipchandler_Waste_Quotation.pdf</p>
      `,
      agent: 'claudia',
    });
    return { success: false, error: 'Shipchandler/Waste quotation not found - Manager notified' };
  }

  const content = {
    PT: {
      subject: 'Cotacao Shipchandler + Waste Management - MTS Angola',
      greeting: `Prezado(a) ${clientName}`,
      intro: vesselName && port 
        ? `Referente ao navio <strong>${vesselName}</strong> em <strong>${port}</strong>.` 
        : '',
      text: 'Agradecemos o seu interesse nos servicos de Shipchandler e Gestao de Residuos da MTS Angola.',
      note: 'Nossa tabela esta em vigor, sujeita a alteracao cambial.',
    },
    EN: {
      subject: 'Shipchandler + Waste Management Quotation - MTS Angola',
      greeting: `Dear ${clientName}`,
      intro: vesselName && port 
        ? `Regarding vessel <strong>${vesselName}</strong> at <strong>${port}</strong>.` 
        : '',
      text: 'Thank you for your interest in MTS Angola shipchandler and waste management services.',
      note: 'Our rates are current and subject to exchange rate fluctuations.',
    },
    ES: {
      subject: 'Cotizacion Shipchandler + Gestion de Residuos - MTS Angola',
      greeting: `Estimado/a ${clientName}`,
      intro: vesselName && port 
        ? `Referente al buque <strong>${vesselName}</strong> en <strong>${port}</strong>.` 
        : '',
      text: 'Gracias por su interes en los servicios de Shipchandler y Gestion de Residuos de MTS Angola.',
      note: 'Nuestra tabla esta vigente, sujeta a cambios cambiarios.',
    },
  };

  const c = content[language];

  const body = `
    <p>${c.greeting},</p>
    <br>
    ${c.intro ? `<p>${c.intro}</p><br>` : ''}
    <p>${c.text}</p>
    <p>Seguem em anexo nossas cotacoes de servicos de Shipchandler e Waste Management.</p>
    <br>
    <p><em>${c.note}</em></p>
    <br>
    <p>Estamos a disposicao para esclarecimentos.</p>
    <br>
    <p>Atenciosamente,</p>
    <p><strong>Claudia Santos</strong><br>CEO Comercial & Financeiro<br>MTS Angola<br>Email: ${EMAIL_ACCOUNTS.claudia}</p>
  `;

  return sendEmail({
    from: EMAIL_ACCOUNTS.claudia,
    to,
    cc,
    subject: c.subject,
    body,
    attachmentPath: quotationPath,
    agent: 'claudia',
  });
}

// Send quotation email (Claudia ONLY - Price Hierarchy Rule)
// This is the unified function that chooses the right quotation based on service type
export async function sendQuotationEmail(
  to: string,
  clientName: string,
  cc?: string,
  serviceType: 'hull_cleaning' | 'shipchandler_waste' | 'general' = 'general'
): Promise<EmailResult> {
  // For backward compatibility, use shipchandler_waste as default
  if (serviceType === 'general' || serviceType === 'shipchandler_waste') {
    return sendShipchandlerWasteQuotation({ to, clientName, cc });
  } else {
    return sendHullCleaningQuotation({ to, clientName, cc });
  }
}
