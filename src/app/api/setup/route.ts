import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Initialize database tables manually
export async function GET() {
  console.log('[SETUP] Starting database initialization...');
  
  try {
    // Test database connection
    await db.$connect();
    console.log('[SETUP] Database connected');
    
    // Create tables manually with raw SQL for SQLite
    console.log('[SETUP] Creating Vessel table...');
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Vessel (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        imo TEXT UNIQUE,
        type TEXT,
        owner TEXT,
        agent TEXT,
        flag TEXT,
        grossTonnage INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[SETUP] Creating VesselSchedule table...');
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS VesselSchedule (
        id TEXT PRIMARY KEY,
        vesselId TEXT NOT NULL,
        port TEXT NOT NULL,
        eta DATETIME NOT NULL,
        etd DATETIME,
        status TEXT DEFAULT 'scheduled',
        cargoType TEXT,
        notes TEXT,
        source TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vesselId) REFERENCES Vessel(id) ON DELETE CASCADE
      );
    `);

    console.log('[SETUP] Creating Client table...');
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Client (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        company TEXT,
        language TEXT DEFAULT 'PT',
        status TEXT DEFAULT 'cold',
        source TEXT,
        lastContactAt DATETIME,
        nextFollowUp DATETIME,
        notes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[SETUP] Creating CRMInteraction table...');
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS CRMInteraction (
        id TEXT PRIMARY KEY,
        clientId TEXT NOT NULL,
        type TEXT NOT NULL,
        subject TEXT,
        content TEXT,
        status TEXT DEFAULT 'cold',
        handledBy TEXT NOT NULL,
        emailFrom TEXT,
        emailTo TEXT,
        emailCc TEXT,
        attachment TEXT,
        nextFollowUp DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clientId) REFERENCES Client(id) ON DELETE CASCADE
      );
    `);

    console.log('[SETUP] Creating EmailLog table...');
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS EmailLog (
        id TEXT PRIMARY KEY,
        "from" TEXT NOT NULL,
        "to" TEXT NOT NULL,
        cc TEXT,
        subject TEXT NOT NULL,
        body TEXT,
        attachment TEXT,
        status TEXT DEFAULT 'pending',
        agent TEXT NOT NULL,
        errorMessage TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[SETUP] Creating WhatsAppAlert table...');
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS WhatsAppAlert (
        id TEXT PRIMARY KEY,
        "to" TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        errorMessage TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[SETUP] Creating DailyReport table...');
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS DailyReport (
        id TEXT PRIMARY KEY,
        date DATETIME UNIQUE,
        vesselsTracked INTEGER DEFAULT 0,
        newContacts INTEGER DEFAULT 0,
        reengagements INTEGER DEFAULT 0,
        leadsTransferred INTEGER DEFAULT 0,
        quotationsSent INTEGER DEFAULT 0,
        estimatedValue REAL DEFAULT 0,
        alerts TEXT,
        summary TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[SETUP] Creating Meeting table...');
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Meeting (
        id TEXT PRIMARY KEY,
        clientId TEXT,
        title TEXT NOT NULL,
        description TEXT,
        date DATETIME NOT NULL,
        duration INTEGER,
        status TEXT DEFAULT 'scheduled',
        location TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clientId) REFERENCES Client(id) ON DELETE SET NULL
      );
    `);

    console.log('[SETUP] Creating SystemConfig table...');
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS SystemConfig (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE,
        value TEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[SETUP] Creating User table...');
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        name TEXT,
        role TEXT DEFAULT 'manager',
        active INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[SETUP] Creating ActivityLog table...');
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ActivityLog (
        id TEXT PRIMARY KEY,
        agent TEXT NOT NULL,
        action TEXT NOT NULL,
        entityType TEXT,
        entityId TEXT,
        details TEXT,
        status TEXT DEFAULT 'success',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[SETUP] All tables created successfully!');
    
    // Verify tables exist
    const tables = await db.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
    `;

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully! All tables created.',
      tables: tables
    });

  } catch (error) {
    console.error('[SETUP] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize database',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}