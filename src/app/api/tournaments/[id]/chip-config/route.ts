import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';

type Params = Promise<{ id: string }>;

// GET /api/tournaments/[id]/chip-config - Récupérer la config de jetons
export async function GET(request: NextRequest, segmentData: { params: Params }) {
  try {
    const params = await segmentData.params;

    const config = await prisma.tournamentChipConfig.findUnique({
      where: { tournamentId: params.id },
    });

    if (!config) {
      return NextResponse.json({ config: null });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching chip config:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la configuration' },
      { status: 500 }
    );
  }
}

// POST /api/tournaments/[id]/chip-config - Sauvegarder la config de jetons
export async function POST(request: NextRequest, segmentData: { params: Params }) {
  try {
    const params = await segmentData.params;
    const body = await request.json();
    console.log('Received chip config request for tournament:', params.id);
    console.log('Request body:', JSON.stringify(body, null, 2));

    const { chipSetsUsed, distribution, playersCount, stackSize, rebuysExpected } =
      body;

    console.log('Parsed values:', { chipSetsUsed, distribution, playersCount, stackSize, rebuysExpected });

    // Vérifier que le tournoi existe
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    });

    if (!tournament) {
      console.error('Tournament not found:', params.id);
      return NextResponse.json(
        { error: 'Tournoi non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier les permissions (ADMIN ou TD du tournoi)
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'edit');
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    // Créer ou mettre à jour la configuration
    const config = await prisma.tournamentChipConfig.upsert({
      where: { tournamentId: params.id },
      update: {
        chipSetsUsed,
        distribution,
        playersCount,
        stackSize,
        rebuysExpected: rebuysExpected || 0,
      },
      create: {
        tournamentId: params.id,
        chipSetsUsed,
        distribution,
        playersCount,
        stackSize,
        rebuysExpected: rebuysExpected || 0,
      },
    });

    console.log('Chip config saved successfully:', config.id);
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error saving chip config:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde de la configuration' },
      { status: 500 }
    );
  }
}

// DELETE /api/tournaments/[id]/chip-config - Supprimer la config
export async function DELETE(request: NextRequest, segmentData: { params: Params }) {
  try {
    const params = await segmentData.params;

    // Vérifier que le tournoi existe pour récupérer le créateur
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournoi non trouvé' }, { status: 404 });
    }

    // Vérifier les permissions (ADMIN ou TD du tournoi)
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'edit');
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    await prisma.tournamentChipConfig.delete({
      where: { tournamentId: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chip config:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la configuration' },
      { status: 500 }
    );
  }
}
