// MTS Angola - Vessel Tracking Service
// Simulates vessel tracking from vesselfinder.com, marinetraffic.com

import { db } from '@/lib/db';

// Angola ports
export const ANGOLA_PORTS = ['Luanda', 'Lobito', 'Namibe', 'Cabinda', 'Soyo'] as const;

// Major shipping companies
export const SHIPPING_COMPANIES = [
  'MSC',
  'Maersk',
  'CMA CGM',
  'COSCO',
  'Hapag-Lloyd',
  'Evergreen',
  'ONE',
  'Yang Ming',
  'HMM',
  'ZIM',
] as const;

// Vessel types
export const VESSEL_TYPES = [
  'Container Ship',
  'Bulk Carrier',
  'Tanker',
  'General Cargo',
  'RoRo',
  'Offshore Support',
  'Supply Vessel',
] as const;

// Interface for vessel data
interface VesselData {
  name: string;
  imo: string;
  type?: string;
  owner?: string;
  agent?: string;
  port: string;
  eta: Date;
  cargoType?: string;
}

// Generate random IMO number
function generateIMO(): string {
  const prefix = '9';
  const digits = Math.floor(Math.random() * 9000000) + 1000000;
  return `${prefix}${digits}`;
}

// Generate simulated vessel data for demo
export async function generateSimulatedVessels(count: number = 10): Promise<VesselData[]> {
  const vessels: VesselData[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysAhead = Math.floor(Math.random() * 30) + 1;
    const eta = new Date(now);
    eta.setDate(eta.getDate() + daysAhead);

    vessels.push({
      name: `${SHIPPING_COMPANIES[Math.floor(Math.random() * SHIPPING_COMPANIES.length)]} ${Math.floor(Math.random() * 900) + 100}`,
      imo: generateIMO(),
      type: VESSEL_TYPES[Math.floor(Math.random() * VESSEL_TYPES.length)],
      owner: SHIPPING_COMPANIES[Math.floor(Math.random() * SHIPPING_COMPANIES.length)],
      port: ANGOLA_PORTS[Math.floor(Math.random() * ANGOLA_PORTS.length)],
      eta,
      cargoType: Math.random() > 0.5 ? 'General' : 'Container',
    });
  }

  return vessels;
}

// Save vessel to database
export async function saveVessel(data: VesselData): Promise<{ vessel: any; schedule: any }> {
  // Check if vessel exists by IMO
  let vessel = await db.vessel.findUnique({
    where: { imo: data.imo },
  });

  if (!vessel) {
    vessel = await db.vessel.create({
      data: {
        name: data.name,
        imo: data.imo,
        type: data.type,
        owner: data.owner,
        agent: data.agent,
      },
    });
  }

  // Create schedule
  const schedule = await db.vesselSchedule.create({
    data: {
      vesselId: vessel.id,
      port: data.port,
      eta: data.eta,
      cargoType: data.cargoType,
      status: 'scheduled',
      source: 'simulation',
    },
  });

  return { vessel, schedule };
}

// Track vessels (main Pedro function)
export async function trackVessels(options?: {
  ports?: string[];
  days?: number;
  count?: number;
}): Promise<{
  tracked: number;
  vessels: Array<{
    id: string;
    name: string;
    imo: string;
    port: string;
    eta: Date;
    owner?: string;
    type?: string;
  }>;
}> {
  const count = options?.count || 10;
  
  // Generate simulated data
  const vesselData = await generateSimulatedVessels(count);
  
  // Save to database
  const savedVessels: Array<{
    id: string;
    name: string;
    imo: string;
    port: string;
    eta: Date;
    owner?: string;
    type?: string;
  }> = [];
  for (const data of vesselData) {
    const result = await saveVessel(data);
    savedVessels.push({
      id: result.vessel.id,
      name: result.vessel.name,
      imo: result.vessel.imo,
      port: data.port,
      eta: data.eta,
      owner: data.owner,
      type: data.type,
    });
  }

  // Log activity
  await db.activityLog.create({
    data: {
      agent: 'pedro',
      action: 'track_vessels',
      entityType: 'vessel',
      details: JSON.stringify({ count: savedVessels.length, ports: options?.ports }),
      status: 'success',
    },
  });

  return {
    tracked: savedVessels.length,
    vessels: savedVessels,
  };
}

// Get upcoming arrivals
export async function getUpcomingArrivals(days: number = 30): Promise<any[]> {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + days);

  const schedules = await db.vesselSchedule.findMany({
    where: {
      eta: {
        gte: now,
        lte: endDate,
      },
      status: 'scheduled',
    },
    include: {
      vessel: true,
    },
    orderBy: {
      eta: 'asc',
    },
  });

  return schedules.map(s => ({
    id: s.id,
    vesselName: s.vessel.name,
    imo: s.vessel.imo,
    port: s.port,
    eta: s.eta,
    owner: s.vessel.owner,
    type: s.vessel.type,
    status: s.status,
  }));
}

// Get vessel by IMO
export async function getVesselByIMO(imo: string) {
  return db.vessel.findUnique({
    where: { imo },
    include: {
      schedules: {
        orderBy: { eta: 'desc' },
        take: 10,
      },
    },
  });
}

// Get statistics
export async function getVesselStats() {
  const [totalVessels, totalSchedules, upcomingCount, byPort] = await Promise.all([
    db.vessel.count(),
    db.vesselSchedule.count(),
    db.vesselSchedule.count({
      where: {
        eta: { gte: new Date() },
        status: 'scheduled',
      },
    }),
    db.vesselSchedule.groupBy({
      by: ['port'],
      where: {
        eta: { gte: new Date() },
        status: 'scheduled',
      },
      _count: true,
    }),
  ]);

  return {
    totalVessels,
    totalSchedules,
    upcomingCount,
    byPort: byPort.map(p => ({ port: p.port, count: p._count })),
  };
}

// Check if client has vessel arriving soon
export async function checkClientVesselArrival(clientEmail: string, days: number = 30): Promise<{
  hasArrival: boolean;
  vessels: any[];
}> {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + days);

  // Get client to find associated vessels/agents
  const client = await db.client.findUnique({
    where: { email: clientEmail },
  });

  if (!client) {
    return { hasArrival: false, vessels: [] };
  }

  // For demo, return random upcoming vessels
  const schedules = await db.vesselSchedule.findMany({
    where: {
      eta: {
        gte: now,
        lte: endDate,
      },
      status: 'scheduled',
    },
    include: {
      vessel: true,
    },
    take: 3,
  });

  return {
    hasArrival: schedules.length > 0,
    vessels: schedules.map(s => ({
      name: s.vessel.name,
      imo: s.vessel.imo,
      port: s.port,
      eta: s.eta,
    })),
  };
}
