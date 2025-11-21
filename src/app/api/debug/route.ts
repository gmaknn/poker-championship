import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL?.substring(0, 30) + '...',
      nextauthUrl: process.env.NEXTAUTH_URL,
      nextauthSecretConfigured: !!process.env.NEXTAUTH_SECRET,
    };

    // Test database connection
    try {
      const userCount = await prisma.user.count();
      diagnostics.database = {
        status: 'connected',
        userCount,
      };

      // Get admin user
      const admin = await prisma.user.findUnique({
        where: { email: 'admin@poker.com' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          password: true,
        },
      });

      if (admin) {
        diagnostics.admin = {
          found: true,
          email: admin.email,
          role: admin.role,
          passwordHash: admin.password?.substring(0, 10) + '...',
        };

        // Test password verification
        const testPassword = 'admin123';
        const isValid = await bcrypt.compare(testPassword, admin.password);
        diagnostics.admin.passwordTest = {
          tested: testPassword,
          valid: isValid,
        };
      } else {
        diagnostics.admin = { found: false };
      }
    } catch (dbError: any) {
      diagnostics.database = {
        status: 'error',
        error: dbError.message,
      };
    }

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Diagnostic failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
