import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Check if DATABASE_URL is set
    const hasDatabaseUrl = !!process.env.DATABASE_URL
    
    if (!hasDatabaseUrl) {
      return NextResponse.json({
        status: 'unhealthy',
        database: 'not_configured',
        error: 'DATABASE_URL environment variable is not set',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      }, { status: 500 })
    }

    // Test database connection with timeout
    await Promise.race([
      prisma.$queryRaw`SELECT 1 as test`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000)
      )
    ])

    // Test a simple query to verify schema
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      LIMIT 5
    `
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      connectionTest: 'passed',
      tablesFound: Array.isArray(tableCheck) ? tableCheck.length : 0,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      // Mask DATABASE_URL for security
      databaseUrlConfigured: true,
      databaseUrlFormat: process.env.DATABASE_URL?.includes('pooler') ? 'pooled' : 'direct',
    })
  } catch (error) {
    console.error('Database health check failed:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorName = error instanceof Error ? error.name : 'Unknown'
    
    // Provide helpful diagnostics
    let diagnosis = 'Unknown database error'
    if (errorMessage.includes('P1001') || errorMessage.includes("Can't reach database server")) {
      diagnosis = 'Cannot reach database server. Check DATABASE_URL and network connectivity.'
    } else if (errorMessage.includes('P1003') || errorMessage.includes('Database does not exist')) {
      diagnosis = 'Database does not exist. Verify database name in DATABASE_URL.'
    } else if (errorMessage.includes('P1017') || errorMessage.includes('Server has closed the connection')) {
      diagnosis = 'Connection closed. For Supabase, use the connection pooler URL (port 6543) instead of direct connection (port 5432).'
    } else if (errorMessage.includes('timeout')) {
      diagnosis = 'Connection timeout. Database may be unreachable or overloaded.'
    } else if (errorMessage.includes('authentication') || errorMessage.includes('password')) {
      diagnosis = 'Authentication failed. Check username and password in DATABASE_URL.'
    }
    
    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: errorMessage,
      errorName,
      diagnosis,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      databaseUrlConfigured: !!process.env.DATABASE_URL,
      // Include more details in production for debugging
      ...(process.env.NODE_ENV === 'production' && {
        hint: 'Check Vercel environment variables and ensure DATABASE_URL uses connection pooling for Supabase.'
      })
    }, { status: 500 })
  }
}
