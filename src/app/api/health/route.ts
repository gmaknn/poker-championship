import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Health check endpoint for monitoring and load balancer probes
 * Returns 200 if the application and database are healthy
 * Returns 503 if there are issues
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connectivity with a simple query
    await prisma.$queryRaw`SELECT 1`;

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      db: true,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      environment: process.env.NODE_ENV || 'development',
    }, { status: 200 });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('[HEALTH] Database check failed:', errorMessage);

    return NextResponse.json({
      ok: false,
      db: false,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: 'Database connection failed',
    }, { status: 503 });
  }
}
