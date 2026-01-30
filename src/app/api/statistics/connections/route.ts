import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-helpers';

/**
 * GET /api/statistics/connections
 * Récupère les statistiques de connexion des joueurs
 * Permissions : ADMIN uniquement
 */
export async function GET(request: NextRequest) {
  // Vérifier que l'utilisateur est admin
  const authResult = await requirePermission(request, 'manage_all_players');
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    // Récupérer tous les joueurs avec leurs stats de connexion
    const players = await prisma.player.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nickname: true,
        avatar: true,
        email: true,
        phone: true,
        status: true,
        password: true, // Pour savoir si le compte est activé
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
      },
      orderBy: [
        { lastLoginAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Calculer les stats globales
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const stats = {
      totalPlayers: players.length,
      activatedAccounts: players.filter(p => p.password !== null).length,
      inactivatedAccounts: players.filter(p => p.password === null).length,
      connectionsToday: players.filter(p => p.lastLoginAt && new Date(p.lastLoginAt) >= todayStart).length,
      connectionsThisWeek: players.filter(p => p.lastLoginAt && new Date(p.lastLoginAt) >= weekStart).length,
      neverConnected: players.filter(p => p.loginCount === 0 && p.password !== null).length,
    };

    // Transformer les données pour l'API
    const playersData = players.map(p => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      nickname: p.nickname,
      avatar: p.avatar,
      email: p.email,
      phone: p.phone,
      status: p.status,
      hasAccount: p.password !== null,
      lastLoginAt: p.lastLoginAt,
      loginCount: p.loginCount,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({
      stats,
      players: playersData,
    });
  } catch (error) {
    console.error('Error fetching connection statistics:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
