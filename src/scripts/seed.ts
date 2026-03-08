// MTS Angola - Database Seed Script
// Run with: bun run src/scripts/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample vessel data
const sampleVessels = [
  { name: 'MSC Maria', imo: '9876543', type: 'Container Ship', owner: 'MSC', flag: 'Panama' },
  { name: 'Maersk Angola', imo: '9876544', type: 'Container Ship', owner: 'Maersk', flag: 'Denmark' },
  { name: 'CMA CGM Luanda', imo: '9876545', type: 'Container Ship', owner: 'CMA CGM', flag: 'France' },
  { name: 'COSCO Star', imo: '9876546', type: 'Bulk Carrier', owner: 'COSCO', flag: 'China' },
  { name: 'Hapag Lobito', imo: '9876547', type: 'Container Ship', owner: 'Hapag-Lloyd', flag: 'Germany' },
  { name: 'Evergreen Namibe', imo: '9876548', type: 'Container Ship', owner: 'Evergreen', flag: 'Taiwan' },
  { name: 'ONE Cabinda', imo: '9876549', type: 'Container Ship', owner: 'ONE', flag: 'Japan' },
  { name: 'ZIM Soyo', imo: '9876550', type: 'Container Ship', owner: 'ZIM', flag: 'Israel' },
];

// Sample client data
const sampleClients = [
  { name: 'Joao Silva', email: 'joao.silva@shipping.co.ao', company: 'Angola Shipping LDA', language: 'PT', status: 'cold' },
  { name: 'Maria Santos', email: 'maria@atlanticlogistics.com', company: 'Atlantic Logistics', language: 'PT', status: 'warm' },
  { name: 'John Smith', email: 'john.smith@globalmaritime.com', company: 'Global Maritime Inc', language: 'EN', status: 'hot' },
  { name: 'Carlos Rodriguez', email: 'carlos@naviera.es', company: 'Naviera Iberica', language: 'ES', status: 'qualified' },
  { name: 'Peter Mueller', email: 'p.mueller@deutsch-shipping.de', company: 'Deutsch Shipping GmbH', language: 'EN', status: 'cold' },
  { name: 'Antonio Fernandes', email: 'antonio@portolog.pt', company: 'Porto Logistica', language: 'PT', status: 'warm' },
  { name: 'James Wilson', email: 'j.wilson@seafreight.com', company: 'Sea Freight Ltd', language: 'EN', status: 'qualified' },
  { name: 'Francois Dupont', email: 'f.dupont@france-maritime.fr', company: 'France Maritime', language: 'EN', status: 'cold' },
];

// Angola ports
const ports = ['Luanda', 'Lobito', 'Namibe', 'Cabinda', 'Soyo'];

async function main() {
  console.log('Starting seed...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.vesselSchedule.deleteMany();
  await prisma.vessel.deleteMany();
  await prisma.cRMInteraction.deleteMany();
  await prisma.client.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.whatsAppAlert.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.activityLog.deleteMany();

  // Create vessels
  console.log('Creating vessels...');
  const vessels = await Promise.all(
    sampleVessels.map(v => prisma.vessel.create({ data: v }))
  );
  console.log(`Created ${vessels.length} vessels`);

  // Create vessel schedules
  console.log('Creating vessel schedules...');
  const now = new Date();
  for (const vessel of vessels) {
    const daysAhead = Math.floor(Math.random() * 30) + 1;
    const eta = new Date(now);
    eta.setDate(eta.getDate() + daysAhead);

    await prisma.vesselSchedule.create({
      data: {
        vesselId: vessel.id,
        port: ports[Math.floor(Math.random() * ports.length)],
        eta,
        status: 'scheduled',
        cargoType: Math.random() > 0.5 ? 'Container' : 'General Cargo',
        source: 'simulation',
      },
    });
  }
  console.log('Created vessel schedules');

  // Create clients
  console.log('Creating clients...');
  const clients = await Promise.all(
    sampleClients.map(c => prisma.client.create({
      data: {
        ...c,
        lastContactAt: c.status !== 'cold' ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000) : null,
        nextFollowUp: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    }))
  );
  console.log(`Created ${clients.length} clients`);

  // Create some CRM interactions
  console.log('Creating CRM interactions...');
  for (const client of clients) {
    if (client.status !== 'cold') {
      await prisma.cRMInteraction.create({
        data: {
          clientId: client.id,
          type: 'email_sent',
          subject: 'Marketing Outreach',
          handledBy: 'mariana',
          status: client.status,
        },
      });
    }
  }
  console.log('Created CRM interactions');

  // Create system config
  console.log('Creating system config...');
  await prisma.systemConfig.upsert({
    where: { key: 'system_initialized' },
    update: { value: new Date().toISOString() },
    create: { key: 'system_initialized', value: new Date().toISOString() },
  });

  // Create initial activity log
  await prisma.activityLog.create({
    data: {
      agent: 'system',
      action: 'database_seed',
      details: 'Initial database seeded with sample data',
      status: 'success',
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
