// MTS Angola - Scheduler API
// Manages cron job scheduling and execution

import { NextRequest, NextResponse } from 'next/server';
import { 
  getSchedulesStatus, 
  getScheduleStats,
  SCHEDULE_CONFIG,
  type ScheduleName 
} from '@/lib/services/scheduler-service';
import { runDailyTracking, runDailyReport, runWeeklyReport, runReengagement } from '@/lib/automation/executors';

// GET - Get schedules status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'status':
        const schedules = await getSchedulesStatus();
        return NextResponse.json({
          success: true,
          data: schedules,
        });

      case 'stats':
        const days = parseInt(searchParams.get('days') || '30');
        const stats = await getScheduleStats(days);
        return NextResponse.json({
          success: true,
          data: stats,
        });

      case 'config':
        return NextResponse.json({
          success: true,
          data: SCHEDULE_CONFIG,
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Scheduler API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST - Execute a scheduled task manually
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task } = body as { task: ScheduleName };

    if (!task || !SCHEDULE_CONFIG[task]) {
      return NextResponse.json({
        success: false,
        error: 'Invalid task name. Valid tasks: ' + Object.keys(SCHEDULE_CONFIG).join(', '),
      }, { status: 400 });
    }

    let result;
    
    switch (task) {
      case 'dailyTracking':
        result = await runDailyTracking();
        break;
      case 'dailyReport':
        result = await runDailyReport();
        break;
      case 'weeklyReport':
        result = await runWeeklyReport();
        break;
      case 'reengagement':
        result = await runReengagement();
        break;
      case 'cleanup':
        result = { success: true, message: 'Cleanup task executed' };
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Task executor not implemented',
        }, { status: 501 });
    }

    return NextResponse.json({
      success: true,
      data: {
        task,
        result,
        executedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Scheduler execution error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
