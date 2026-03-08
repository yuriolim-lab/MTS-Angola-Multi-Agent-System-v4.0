// MTS Angola - Cron Scheduler Service
// Handles automated task scheduling

import { db } from '@/lib/db';

// Schedule name type
export type ScheduleName = 'dailyTracking' | 'dailyReport' | 'weeklyReport' | 'reengagement' | 'cleanup';

// Scheduler configuration
export const SCHEDULE_CONFIG: Record<ScheduleName, {
  name: string;
  cron: string;
  timezone: string;
  agent: string;
  enabled: boolean;
  description: string;
}> = {
  dailyTracking: {
    name: 'Rastreamento Diario de Navios',
    cron: '0 6 * * *', // Every day at 6:00 AM
    timezone: 'Africa/Luanda',
    agent: 'pedro',
    enabled: true,
    description: 'Rastreia navios com ETA nos proximos 30 dias',
  },
  dailyReport: {
    name: 'Relatorio Diario ao Gestor',
    cron: '0 18 * * 1-5', // Mon-Fri at 6:00 PM
    timezone: 'Africa/Luanda',
    agent: 'claudia',
    enabled: true,
    description: 'Envia relatorio diario de operacoes por email',
  },
  weeklyReport: {
    name: 'Relatorio Semanal WhatsApp',
    cron: '0 17 * * 5', // Friday at 5:00 PM
    timezone: 'Africa/Luanda',
    agent: 'claudia',
    enabled: true,
    description: 'Envia resumo semanal via WhatsApp ao Gestor',
  },
  reengagement: {
    name: 'Re-engajamento de Clientes Inativos',
    cron: '0 9 * * *', // Every day at 9:00 AM
    timezone: 'Africa/Luanda',
    agent: 'mariana',
    enabled: true,
    description: 'Verifica clientes inativos > 30 dias e re-engaja',
  },
  cleanup: {
    name: 'Limpeza de Dados Antigos',
    cron: '0 2 * * 0', // Sunday at 2:00 AM
    timezone: 'Africa/Luanda',
    agent: 'system',
    enabled: true,
    description: 'Remove dados antigos e otimiza banco',
  },
};

// Get next execution time from cron expression
export function getNextExecutionTime(cronExpression: string, timezone: string = 'Africa/Luanda'): Date {
  const now = new Date();
  const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(' ');
  
  // For daily tasks at specific hour
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const next = new Date(now);
    next.setHours(parseInt(hour), parseInt(minute), 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }
  
  // For weekday tasks (e.g., 1-5 = Mon-Fri)
  if (dayOfWeek && dayOfWeek.includes('-') && dayOfMonth === '*' && month === '*') {
    const [start, end] = dayOfWeek.split('-').map(Number);
    const currentDay = now.getDay();
    const next = new Date(now);
    next.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    if (currentDay >= start && currentDay <= end && next > now) {
      return next;
    }
    
    // Find next valid day
    let daysToAdd = 1;
    while (daysToAdd < 7) {
      const testDay = (currentDay + daysToAdd) % 7;
      if (testDay >= start && testDay <= end) break;
      daysToAdd++;
    }
    next.setDate(next.getDate() + daysToAdd);
    return next;
  }
  
  // For specific day of week (e.g., Friday = 5)
  if (dayOfWeek && dayOfWeek !== '*' && !dayOfWeek.includes('-')) {
    const targetDay = parseInt(dayOfWeek);
    const currentDay = now.getDay();
    const next = new Date(now);
    next.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    let daysUntilTarget = (targetDay - currentDay + 7) % 7;
    if (daysUntilTarget === 0 && next <= now) {
      daysUntilTarget = 7;
    }
    
    next.setDate(next.getDate() + daysUntilTarget);
    return next;
  }
  
  // Default: tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(parseInt(hour), parseInt(minute), 0, 0);
  return tomorrow;
}

// Get all schedules with status
export async function getSchedulesStatus(): Promise<Array<{
  name: ScheduleName;
  config: typeof SCHEDULE_CONFIG[ScheduleName];
  nextRun: Date;
  lastRun: Date | null;
  enabled: boolean;
  lastStatus: string | null;
}>> {
  const schedules: Array<{
    name: ScheduleName;
    config: typeof SCHEDULE_CONFIG[ScheduleName];
    nextRun: Date;
    lastRun: Date | null;
    enabled: boolean;
    lastStatus: string | null;
  }> = [];

  for (const [name, config] of Object.entries(SCHEDULE_CONFIG)) {
    // Get last execution from activity log
    const lastActivity = await db.activityLog.findFirst({
      where: {
        agent: config.agent,
        action: `scheduled_${name}`,
      },
      orderBy: { createdAt: 'desc' },
    });

    schedules.push({
      name: name as ScheduleName,
      config,
      nextRun: getNextExecutionTime(config.cron, config.timezone),
      lastRun: lastActivity?.createdAt || null,
      enabled: config.enabled,
      lastStatus: lastActivity?.status || null,
    });
  }

  return schedules;
}

// Log schedule execution
export async function logScheduleExecution(
  schedule: ScheduleName,
  status: 'success' | 'error',
  result?: string,
  error?: string
): Promise<void> {
  await db.activityLog.create({
    data: {
      agent: SCHEDULE_CONFIG[schedule].agent,
      action: `scheduled_${schedule}`,
      entityType: 'schedule',
      details: JSON.stringify({ result, error }),
      status,
    },
  });
}

// Update system config for last run
export async function updateLastRun(schedule: ScheduleName): Promise<void> {
  await db.systemConfig.upsert({
    where: { key: `last_run_${schedule}` },
    update: { value: new Date().toISOString() },
    create: { key: `last_run_${schedule}`, value: new Date().toISOString() },
  });
}

// Get last run time
export async function getLastRun(schedule: ScheduleName): Promise<Date | null> {
  const config = await db.systemConfig.findUnique({
    where: { key: `last_run_${schedule}` },
  });
  
  return config ? new Date(config.value) : null;
}

// Get schedule statistics
export async function getScheduleStats(days: number = 30): Promise<{
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  bySchedule: Record<string, { total: number; success: number; failed: number }>;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await db.activityLog.findMany({
    where: {
      action: { startsWith: 'scheduled_' },
      createdAt: { gte: since },
    },
  });

  const stats = {
    totalRuns: logs.length,
    successfulRuns: logs.filter(l => l.status === 'success').length,
    failedRuns: logs.filter(l => l.status === 'error').length,
    bySchedule: {} as Record<string, { total: number; success: number; failed: number }>,
  };

  for (const log of logs) {
    const scheduleName = log.action.replace('scheduled_', '');
    if (!stats.bySchedule[scheduleName]) {
      stats.bySchedule[scheduleName] = { total: 0, success: 0, failed: 0 };
    }
    stats.bySchedule[scheduleName].total++;
    if (log.status === 'success') {
      stats.bySchedule[scheduleName].success++;
    } else {
      stats.bySchedule[scheduleName].failed++;
    }
  }

  return stats;
}
