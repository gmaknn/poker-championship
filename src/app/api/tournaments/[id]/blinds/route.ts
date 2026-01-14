import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireTournamentPermission } from '@/lib/auth-helpers';

const blindLevelSchema = z.object({
  level: z.number().int().positive(),
  smallBlind: z.number().int().min(0),
  bigBlind: z.number().int().min(0),
  ante: z.number().int().min(0).default(0),
  duration: z.number().int().positive().default(12),
  isBreak: z.boolean().optional().default(false),
  rebalanceTables: z.boolean().optional().default(false),
  isRebuyEnd: z.boolean().optional().default(false),
});

const blindStructureSchema = z.object({
  levels: z.array(blindLevelSchema).min(1),
});

// GET - Récupérer la structure de blinds d'un tournoi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const blindLevels = await prisma.blindLevel.findMany({
      where: { tournamentId: id },
      orderBy: { level: 'asc' },
    });

    return NextResponse.json(blindLevels);
  } catch (error) {
    console.error('Error fetching blind levels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blind levels' },
      { status: 500 }
    );
  }
}

// POST - Créer ou remplacer la structure de blinds complète
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[Blinds API] Saving blinds for tournament:', id);

    // Vérifier que le tournoi existe
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      console.log('[Blinds API] Tournament not found:', id);
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Vérifier les permissions (ADMIN ou TD du tournoi)
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'edit');
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    // Block mutations on finished tournaments
    if (tournament.status === 'FINISHED') {
      return NextResponse.json(
        { error: 'Tournament is finished' },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log('[Blinds API] Received data:', JSON.stringify(body, null, 2));

    const validatedData = blindStructureSchema.parse(body);
    console.log('[Blinds API] Validation successful, levels count:', validatedData.levels.length);

    console.log('[Blinds API] Tournament found, starting transaction');

    // Supprimer les niveaux existants et créer les nouveaux
    await prisma.$transaction(async (tx) => {
      // Supprimer les niveaux existants
      await tx.blindLevel.deleteMany({
        where: { tournamentId: id },
      });

      // Créer les nouveaux niveaux
      await tx.blindLevel.createMany({
        data: validatedData.levels.map((level) => ({
          tournamentId: id,
          level: level.level,
          smallBlind: level.smallBlind,
          bigBlind: level.bigBlind,
          ante: level.ante,
          duration: level.duration,
          isBreak: level.isBreak ?? false,
          rebalanceTables: level.rebalanceTables ?? false,
          isRebuyEnd: level.isRebuyEnd ?? false,
        })),
      });
    });

    console.log('[Blinds API] Transaction completed successfully');

    // Récupérer les niveaux créés
    const blindLevels = await prisma.blindLevel.findMany({
      where: { tournamentId: id },
      orderBy: { level: 'asc' },
    });

    console.log('[Blinds API] Returning', blindLevels.length, 'blind levels');
    return NextResponse.json(blindLevels, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Blinds API] Validation error:', JSON.stringify(error.issues, null, 2));
      return NextResponse.json(
        { error: 'Erreur de validation', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[Blinds API] Error creating blind structure:', error);
    return NextResponse.json(
      { error: 'Échec de la création de la structure de blinds', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer toute la structure de blinds
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Vérifier que le tournoi existe pour récupérer le créateur
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Vérifier les permissions
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'edit');
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    // Block mutations on finished tournaments
    if (tournament.status === 'FINISHED') {
      return NextResponse.json(
        { error: 'Tournament is finished' },
        { status: 400 }
      );
    }

    await prisma.blindLevel.deleteMany({
      where: { tournamentId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blind levels:', error);
    return NextResponse.json(
      { error: 'Failed to delete blind levels' },
      { status: 500 }
    );
  }
}
