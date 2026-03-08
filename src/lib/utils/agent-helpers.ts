// Agent helper utilities for MTS Angola Multi-Agent System

// Agent definitions
export const AGENTS = {
  pedro: {
    name: 'Pedro',
    role: 'Operacoes/Inteligencia',
    email: 'supply.chain@mts-angola.com',
    description: 'Rastreamento de navios, analise de mercado maritimo'
  },
  mariana: {
    name: 'Mariana',
    role: 'Marketing/CRM',
    email: 'info@mts-angola.com',
    description: 'Prospeccao de clientes, re-engajamento, qualificacao de leads'
  },
  claudia: {
    name: 'Claudia',
    role: 'Comercial/Financeiro',
    email: 'accounts@mts-angola.com',
    description: 'Cotacoes, faturacao, follow-up comercial'
  },
  manager: {
    name: 'Gestor',
    role: 'Gestor Humano',
    email: 'ops.manager@mts-angola.com',
    description: 'Supervisao, relatorios, alertas criticos'
  }
} as const;

// Email templates
export const EMAIL_TEMPLATES = {
  prospection: {
    subject_pt: 'MTS Angola - Servicos Maritimos de Excelencia',
    subject_en: 'MTS Angola - Excellence in Maritime Services',
    subject_es: 'MTS Angola - Excelencia en Servicios Maritimos'
  },
  quotation: {
    subject_pt: 'MTS Angola - Cotacao Solicitada',
    subject_en: 'MTS Angola - Quotation Requested',
    subject_es: 'MTS Angola - Cotizacion Solicitada'
  },
  follow_up: {
    subject_pt: 'MTS Angola - Seguimento',
    subject_en: 'MTS Angola - Follow Up',
    subject_es: 'MTS Angola - Seguimiento'
  },
  handover: {
    subject_pt: 'MTS Angola - Lead Qualificado para Comercial',
    subject_en: 'MTS Angola - Qualified Lead for Commercial',
    subject_es: 'MTS Angola - Lead Calificado para Comercial'
  },
  vessel_report: {
    subject_pt: 'MTS Angola - Relatorio de Escalas',
    subject_en: 'MTS Angola - Schedule Report',
    subject_es: 'MTS Angola - Reporte de Escalas'
  }
};

// Get email subject by template and language
export function getEmailSubject(template: keyof typeof EMAIL_TEMPLATES, language: string): string {
  const lang = language.toUpperCase();
  const key = `subject_${lang.toLowerCase()}` as keyof typeof EMAIL_TEMPLATES[typeof template];
  return EMAIL_TEMPLATES[template][key] || EMAIL_TEMPLATES[template].subject_pt;
}

// Format currency
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// Format date
export function formatDate(date: Date | string, language: string = 'PT'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = language.toUpperCase() === 'EN' ? 'en-US' : 
                 language.toUpperCase() === 'ES' ? 'es-ES' : 'pt-AO';
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Format date time
export function formatDateTime(date: Date | string, language: string = 'PT'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = language.toUpperCase() === 'EN' ? 'en-US' : 
                 language.toUpperCase() === 'ES' ? 'es-ES' : 'pt-AO';
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Calculate days since date
export function daysSince(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Check if client is inactive (30+ days)
export function isClientInactive(lastContactDate: Date | string | null): boolean {
  if (!lastContactDate) return true;
  return daysSince(lastContactDate) >= 30;
}

// Lead status colors
export const STATUS_COLORS: Record<string, string> = {
  cold: '#6B7280',      // Gray
  warm: '#F59E0B',      // Amber
  hot: '#EF4444',       // Red
  qualified: '#10B981', // Green
  scheduled: '#3B82F6', // Blue
  arrived: '#8B5CF6',   // Purple
  departed: '#6B7280',  // Gray
  pending: '#F59E0B',   // Amber
  sent: '#10B981',      // Green
  failed: '#EF4444'     // Red
};

// Get status badge class
export function getStatusBadgeClass(status: string): string {
  const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
  const colorMap: Record<string, string> = {
    cold: 'bg-gray-100 text-gray-800',
    warm: 'bg-amber-100 text-amber-800',
    hot: 'bg-red-100 text-red-800',
    qualified: 'bg-green-100 text-green-800',
    scheduled: 'bg-blue-100 text-blue-800',
    arrived: 'bg-purple-100 text-purple-800',
    departed: 'bg-gray-100 text-gray-800',
    pending: 'bg-amber-100 text-amber-800',
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  };
  
  return `${baseClasses} ${colorMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800'}`;
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone format (Angolan)
export function isValidAngolanPhone(phone: string): boolean {
  // Angola phone format: +244 9XX XXX XXX or 9XX XXX XXX
  const phoneRegex = /^(\+244|0)?9[0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Sanitize input
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')  // Remove potential HTML
    .trim();
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Agent permissions
export const AGENT_PERMISSIONS = {
  pedro: {
    canSendQuotation: false,
    canAccessFinance: false,
    canManageClients: true,
    canTrackVessels: true,
    canSendWhatsApp: false
  },
  mariana: {
    canSendQuotation: false,
    canAccessFinance: false,
    canManageClients: true,
    canTrackVessels: false,
    canSendWhatsApp: false
  },
  claudia: {
    canSendQuotation: true,
    canAccessFinance: true,
    canManageClients: true,
    canTrackVessels: false,
    canSendWhatsApp: true
  }
} as const;

// Check agent permission
export function hasPermission(
  agent: keyof typeof AGENT_PERMISSIONS,
  permission: keyof typeof AGENT_PERMISSIONS.pedro
): boolean {
  return AGENT_PERMISSIONS[agent]?.[permission] ?? false;
}
